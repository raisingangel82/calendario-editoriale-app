import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { db, auth, messaging } from './firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    addDoc, 
    Timestamp, 
    setDoc, 
    getDoc,
    writeBatch, // Import for atomic operations
    getDocs      // Import to get documents once
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Plus, Download, UploadCloud, BarChart3, Wand, LockKeyhole } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useBreakpoint } from './hooks/useBreakpoint';
import { processAndMatchAnalytics } from './services/AnalyticsMatcher';
import { Sidebar } from './components/Sidebar';
import { BottomBar } from './components/BottomBar';
import { Header } from './components/Header';
import { ScrollToTop } from './components/ScrollToTop';
import { Calendario } from './components/Calendario';
import { FilteredListView } from './components/FilteredListView';
import { Stats } from './components/Stats';
import { Impostazioni } from './pages/Impostazioni';
import { Auth } from './components/Auth';
import { allDefaultPlatforms } from './data/defaultPlatforms';
import { ContenutoModal } from './components/ContenutoModal';
import { ImportModal } from './components/ImportModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ExportModal } from './components/ExportModal';
import { AnalyticsImportModal } from './components/AnalyticsImportModal';
import { UpgradePage } from './components/UpgradePage';
import { SuccessPage } from './components/SuccessPage';
import type { Post, Progetto, Categoria, PlatformData } from './types';

// Helper functions
const getCategoriaGenerica = (tipoContenuto: string): Categoria => {
    const tipo = (tipoContenuto || "").toLowerCase();
    if (tipo === 'testo breve con immagine') return 'Testo';
    if (['reel', 'video', 'vlog', 'booktrailer'].some(term => tipo.includes(term))) return 'Video';
    if (['immagine', 'carousel', 'grafica'].some(term => tipo.includes(term))) return 'Immagine';
    return 'Testo';
};
const isMediaContent = (tipoContenuto: string): boolean => {
    return ["Immagine/Carosello", "Reel", "Booktrailer", "Podcast", "Vlog"].includes(tipoContenuto);
};
const normalizeDateToMillis = (date: any): number => {
    if (!date) return 0;
    if (date instanceof Timestamp) return date.toMillis();
    if (date instanceof Date) return date.getTime();
    if (typeof date === 'string' || typeof date === 'number') {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) return parsedDate.getTime();
    }
    return 0;
};

// Interface for import options, passed from the modal
interface ImportOptions {
  mode: 'add' | 'overwrite';
  replaceConfig: boolean;
  startDate?: string;
}

function MainLayout() {
  const { user } = useAuth();
  const isPro = user?.plan === 'pro' || user?.plan === 'trialing';
  
  const isDesktop = useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [progetti, setProgetti] = useState<Progetto[]>([]);
  const [platforms, setPlatforms] = useState<PlatformData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [actionConfig, setActionConfig] = useState({ icon: Plus, onClick: () => setIsAddModalOpen(true), label: 'Nuovo Post' });
  const [statsActiveView, setStatsActiveView] = useState<'produzione' | 'performance' | 'analisiAI'>('produzione');
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Effect for Firebase Cloud Messaging (Notifications)
  useEffect(() => {
    if (!user || !messaging) return;

    const requestPermissionAndSaveToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Permesso di notifica concesso.');
          const currentToken = await getToken(messaging, { 
            vapidKey: 'BCvTK43mY8OjbcH1aE-ampackLk0vsQIYgYTDXj2K0obzOGZbQL8a7GivgqDIShYbufcW1b-TwCIn-n53q531T0'
          });
          if (currentToken) {
            console.log('Token FCM ottenuto:', currentToken);
            const tokenRef = doc(db, 'fcmTokens', currentToken);
            await setDoc(tokenRef, {
              userId: user.uid,
              token: currentToken,
              createdAt: Timestamp.now()
            });
          } else {
            console.warn('Impossibile ottenere il token FCM.');
          }
        } else {
          console.warn('Permesso di notifica non concesso.');
        }
      } catch (error) {
        console.error('Errore durante la richiesta del token di notifica:', error);
      }
    };

    requestPermissionAndSaveToken();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Messaggio ricevuto con l\'app in primo piano: ', payload);
      alert(`Promemoria: ${payload.notification?.title}\n${payload.notification?.body}`);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Effect for fetching user data from Firestore
  useEffect(() => {
    if (!user) {
      setPosts([]);
      setProgetti([]);
      setPlatforms([]);
      setAutoScrollEnabled(true);
      setLoadingData(false);
      return;
    }
    
    setLoadingData(true);

    // Listener for user preferences
    const userPrefsRef = doc(db, 'userPreferences', user.uid);
    const unsubUserPrefs = onSnapshot(userPrefsRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if(data.workingDays) setWorkingDays(data.workingDays);
            if(typeof data.autoScroll === 'boolean') {
                setAutoScrollEnabled(data.autoScroll);
            } else {
                setAutoScrollEnabled(true);
            }
        }
    });

    // Listener for projects
    const qProgetti = query(collection(db, "progetti"), where("userId", "==", user.uid));
    const unsubProgetti = onSnapshot(qProgetti, (snapshot) => {
        setProgetti(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Progetto[]);
    });

    // Listener for posts (contenuti)
    const qPosts = query(collection(db, "contenuti"), where("userId", "==", user.uid));
    const unsubPosts = onSnapshot(qPosts, async (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
        const postsConPerformance = await Promise.all(
            postsData.map(async (post) => {
                const performanceDocRef = doc(db, 'performanceMetrics', post.id);
                try {
                    const performanceSnap = await getDoc(performanceDocRef);
                    if (performanceSnap.exists()) {
                        return { ...post, performance: performanceSnap.data() };
                    }
                } catch (error) {
                    console.error("Error fetching performance for post:", post.id, error);
                }
                return post;
            })
        );
        setPosts(postsConPerformance);
        setLoadingData(false);
    }, (error) => {
        console.error("Errore nel listener di 'contenuti':", error);
        setLoadingData(false);
    });
    
    // Listener for platforms
    const qPlatforms = query(collection(db, "platforms"), where("userId", "==", user.uid));
    const unsubPlatforms = onSnapshot(qPlatforms, (snapshot) => {
        const customPlatforms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PlatformData[];
        setPlatforms(customPlatforms.length > 0 ? customPlatforms : allDefaultPlatforms);
    });
    
    // Cleanup listeners on component unmount
    return () => { 
        unsubPosts(); 
        unsubProgetti(); 
        unsubPlatforms();
        unsubUserPrefs();
    };
  }, [user]);

  // Effect to configure the main floating action button based on the current route
  useEffect(() => {
    if (location.pathname.startsWith('/stats')) {
         switch (statsActiveView) {
            case 'produzione':
                setActionConfig({ icon: BarChart3, onClick: () => setStatsActiveView('performance'), label: 'Vai a Performance' });
                break;
            case 'performance':
                if (isPro) {
                  setActionConfig({ icon: Wand, onClick: () => setStatsActiveView('analisiAI'), label: 'Genera Analisi AI (Pro)' });
                } else {
                  setActionConfig({ icon: LockKeyhole, onClick: () => navigate('/upgrade'), label: 'Analisi AI (Solo Pro)' });
                }
                break;
            case 'analisiAI':
                setActionConfig({ icon: BarChart3, onClick: () => setStatsActiveView('produzione'), label: 'Torna a Produzione' });
                break;
          }
    } else {
      setStatsActiveView('produzione');
      switch (location.pathname) {
          case '/todo':
              setActionConfig({ icon: Download, onClick: () => setIsExportModalOpen(true), label: 'Esporta Contenuti' });
              break;
          case '/utility':
              setActionConfig({ icon: UploadCloud, onClick: () => setIsAnalyticsModalOpen(true), label: 'Importa Analytics' });
              break;
          case '/upgrade':
              setActionConfig({ icon: Plus, onClick: () => {}, label: 'Piano Upgrade' });
              break;
          case '/success':
              setActionConfig({ icon: Plus, onClick: () => {}, label: 'Pagamento Riuscito' });
              break;
          case '/':
          default:
              setActionConfig({ icon: Plus, onClick: () => setIsAddModalOpen(true), label: 'Nuovo Post' });
              break;
      }
    }
  }, [location.pathname, statsActiveView, isPro, navigate]);
  
  const handleSetWorkingDays = async (days: number[]) => {
      if(user) await setDoc(doc(db, 'userPreferences', user.uid), { workingDays: days }, { merge: true });
  };

  const handleSetAutoScroll = async (enabled: boolean) => {
      setAutoScrollEnabled(enabled);
      if(user) {
          await setDoc(doc(db, 'userPreferences', user.uid), { autoScroll: enabled }, { merge: true });
      }
  };

  const handleCloseModals = () => {
    setSelectedPost(null);
    setIsAddModalOpen(false);
    setIsImportModalOpen(false);
    setIsProjectModalOpen(false);
    setIsExportModalOpen(false);
    setIsAnalyticsModalOpen(false);
  };

  // CRUD operations for posts
  const handleAddPost = async (formData: any) => {
    if (user) {
        const { data, ...rest } = formData;
        let dateObject = data ? parseISO(data) : new Date();
        if (isNaN(dateObject.getTime())) {
            console.error("Invalid date format received, falling back to current date.");
            dateObject = new Date();
        }
        const dataToSave = {
            ...rest,
            data: Timestamp.fromDate(dateObject),
            userId: user.uid
        };
        await addDoc(collection(db, 'contenuti'), dataToSave);
    }
    handleCloseModals();
  };

  const handleSavePost = async (formData: any) => {
    if (selectedPost && user) {
        const { data, ...rest } = formData;
        let dateObject = data ? parseISO(data) : new Date();
        if (isNaN(dateObject.getTime())) {
            console.error("Invalid date format received, falling back to current date.");
            dateObject = new Date();
        }
        const dataToUpdate = {
            ...rest,
            data: Timestamp.fromDate(dateObject)
        };
        await updateDoc(doc(db, 'contenuti', selectedPost.id), dataToUpdate);
    }
    handleCloseModals();
  };
  
  const handleDeletePost = async (id: string) => {
    await deleteDoc(doc(db, 'contenuti', id));
    await deleteDoc(doc(db, 'performanceMetrics', id));
    handleCloseModals();
  };

  const handleStatusChange = async (id: string, field: 'statoProdotto' | 'statoMontato' | 'statoPubblicato', value: boolean) => {
    const ref = doc(db, 'contenuti', id);
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const updateData: any = {};
    switch (field) {
        case 'statoProdotto':
            updateData.statoProdotto = value;
            if (!value) { updateData.statoMontato = false; updateData.statoPubblicato = false; }
            break;
        case 'statoMontato':
            updateData.statoMontato = value;
            if (value) updateData.statoProdotto = true;
            else updateData.statoPubblicato = false;
            break;
        case 'statoPubblicato':
            updateData.statoPubblicato = value;
            if (value) {
                updateData.statoProdotto = true;
                if (isMediaContent(post.tipoContenuto)) updateData.statoMontato = true;
            }
            break;
    }
    await updateDoc(ref, updateData);
  };

  const handleDuplicatePost = async (post: Post) => {
    if (user && isPro) {
      const { id, performance, ...data } = post;
      await addDoc(collection(db, 'contenuti'), { ...data, userId: user.uid, statoProdotto: false, statoPubblicato: false });
      handleCloseModals();
    }
  };
  
  // Export functionality
  const handleExportFromTodo = (count: number, filter: Categoria | 'all') => {
    const postsToExport = posts
        .filter(post => !post.statoProdotto && (filter === 'all' || getCategoriaGenerica(post.tipoContenuto) === filter))
        .sort((a, b) => normalizeDateToMillis(a.data) - normalizeDateToMillis(b.data))
        .slice(0, count);
    let markdownContent = `# Piano Editoriale - ${filter === 'all' ? 'Tutti i Contenuti' : filter}\n\n`;
    postsToExport.forEach(post => {
        const progetto = progetti.find(p => p.id === post.projectId);
        const dataPost = post.data ? format((post.data as Timestamp).toDate(), 'PPP', { locale: it }) : 'Non definita';
        markdownContent += `--- \n\n## ${post.titolo || 'Senza Titolo'}\n- **Data:** ${dataPost}\n- **Progetto:** ${progetto?.nome || 'N/A'}\n- **Tipo:** ${post.tipoContenuto || 'N/A'}\n- **Descrizione:** ${post.descrizione || ''}\n- **Note:** ${post.note || ''}\n\n`;
    });
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `piano-editoriale-${filter}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleExportDatabase = () => {
    if(!isPro) return;
    const dataToExport = { posts, progetti, platforms };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `authorflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    link.remove();
  };

  // --- FINAL AND FLEXIBLE IMPORT LOGIC ---
  const handleImport = async (importedData: any, options: ImportOptions) => {
    if (!user) {
      alert("Errore: utente non autenticato.");
      return;
    }

    const { mode, replaceConfig, startDate } = options;
    const { posts: importedPosts, progetti: importedProgetti, platforms: importedPlatforms } = importedData;

    if (!Array.isArray(importedPosts)) {
        alert('Errore: Il file di importazione non contiene un array "posts" valido.');
        return;
    }

    const batch = writeBatch(db);

    try {
        // --- DELETION LOGIC (ONLY FOR OVERWRITE MODE) ---
        if (mode === 'overwrite') {
            if (!startDate) {
              alert("Errore: la data di inizio per la sovrascrittura non è stata fornita.");
              return;
            }
            
            // Delete posts from the selected date onwards
            const overwriteTimestamp = Timestamp.fromDate(new Date(startDate));
            const postsQuery = query(collection(db, "contenuti"), where("userId", "==", user.uid), where("data", ">=", overwriteTimestamp));
            const postsSnapshot = await getDocs(postsQuery);
            postsSnapshot.forEach(doc => batch.delete(doc.ref));

            // If the checkbox is checked, also delete existing projects and platforms
            if (replaceConfig) {
                const progettiQuery = query(collection(db, "progetti"), where("userId", "==", user.uid));
                const platformsQuery = query(collection(db, "platforms"), where("userId", "==", user.uid));
                const [progettiSnapshot, platformsSnapshot] = await Promise.all([getDocs(progettiQuery), getDocs(platformsQuery)]);
                progettiSnapshot.forEach(doc => batch.delete(doc.ref));
                platformsSnapshot.forEach(doc => batch.delete(doc.ref));
            }
        }

        // --- ADDITION LOGIC ---
        
        // Always add posts from the file
        importedPosts.forEach(post => {
          const newPostRef = doc(collection(db, 'contenuti'));
          const dataToSave = { ...post, data: post.data ? Timestamp.fromDate(new Date(post.data.seconds ? post.data.seconds * 1000 : post.data)) : Timestamp.now(), userId: user.uid };
          delete dataToSave.id;
          batch.set(newPostRef, dataToSave);
        });

        // If the checkbox is checked, also add projects and platforms
        if (replaceConfig) {
            if (Array.isArray(importedProgetti)) {
                importedProgetti.forEach(proj => {
                    const newProjRef = doc(collection(db, 'progetti'));
                    const dataToSave = { ...proj, userId: user.uid };
                    delete dataToSave.id;
                    batch.set(newProjRef, dataToSave);
                });
            }
            if (Array.isArray(importedPlatforms)) {
                importedPlatforms.forEach(plat => {
                    const newPlatRef = doc(collection(db, 'platforms'));
                    const dataToSave = { ...plat, userId: user.uid };
                    delete dataToSave.id;
                    batch.set(newPlatRef, dataToSave);
                });
            }
        }
        
        // Commit all batched operations at once
        await batch.commit();
        alert(`Importazione completata con successo!`);

    } catch (error) {
      console.error("Errore durante l'importazione:", error);
      alert(`Si è verificato un errore durante l'importazione. Controlla la console per i dettagli.`);
    }

    handleCloseModals();
  };
  
  // CRUD operations for projects and platforms
  const handleAddProject = async (data: any) => { if(user) await addDoc(collection(db, 'progetti'), { ...data, userId: user.uid }); };
  const handleUpdateProject = async (id: string, data: any) => await updateDoc(doc(db, "progetti", id), data);
  const handleDeleteProject = async (id: string) => await deleteDoc(doc(db, 'progetti', id));

  const handleAddPlatform = async (data: Omit<PlatformData, 'id' | 'icon' | 'proFeature' | 'iconName'>) => {
    if(user && isPro) await addDoc(collection(db, 'platforms'), { ...data, userId: user.uid, iconName: 'Sparkles' });
  };
  const handleUpdatePlatform = async (id: string, data: Omit<PlatformData, 'id' | 'icon' | 'proFeature' | 'iconName'>) => {
    await updateDoc(doc(db, "platforms", id), data);
  };
  const handleDeletePlatform = async (id: string) => {
    await deleteDoc(doc(db, 'platforms', id));
  };

  // Analytics import logic
  const handleAnalyticsImport = (parsedData: any[], platformName: string, strategy: 'update_only' | 'create_new') => {
    if (!user) {
        console.error("User not authenticated. Import failed.");
        return Promise.resolve();
    }
    
    processAndMatchAnalytics(parsedData, platformName, posts, user.uid, strategy)
      .then(result => {
          if (!result) return;
          const { updated, updatedPostsData } = result;
          if (updated > 0 && updatedPostsData.size > 0) {
              setPosts(currentPosts => 
                  currentPosts.map(post => {
                      if (updatedPostsData.has(post.id)) {
                          const newPerformanceData = updatedPostsData.get(post.id);
                          return { ...post, performance: { ...post.performance, ...newPerformanceData } };
                      }
                      return post;
                  })
              );
              alert(`${updated} posts updated successfully!`);
          } else {
              alert("No matching posts found to update.");
          }
      })
      .catch(error => {
          console.error("Error during import process:", error);
          alert("An error occurred during import.");
      });
  };
  
  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        console.log(`Item ${active.id} was dropped over ${over.id}. Implement save logic here.`);
    }
  };

  // Loading state
  if (loadingData) return <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900"><p className="dark:text-white">Caricamento dati...</p></div>;

  // App routes
  const routes = (
      <Routes>
          <Route path="/" element={<Calendario posts={posts} progetti={progetti} workingDays={workingDays} onCardClick={setSelectedPost} onStatusChange={handleStatusChange} autoScrollEnabled={autoScrollEnabled} />} />
          <Route path="/todo" element={<FilteredListView posts={posts} progetti={progetti} onPostClick={setSelectedPost} onStatusChange={handleStatusChange} />} />
          <Route path="/stats" element={ <Stats posts={posts} progetti={progetti} activeView={statsActiveView} onCardClick={setSelectedPost} onStatusChange={handleStatusChange} /> } />
          <Route path="/utility" element={ <Impostazioni onImportClick={() => setIsImportModalOpen(true)} onExportClick={handleExportDatabase} onProjectsClick={() => setIsProjectModalOpen(true)} platforms={platforms} onAddPlatform={handleAddPlatform} onUpdatePlatform={handleUpdatePlatform} onDeletePlatform={handleDeletePlatform} autoScrollEnabled={autoScrollEnabled} onAutoScrollChange={handleSetAutoScroll} /> } />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/success" element={<SuccessPage />} />
      </Routes>
  );

  return (
    <>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-1 overflow-hidden">
          {isDesktop && <Sidebar actionConfig={actionConfig} />}
          <div className="flex-1 flex flex-col">
            <Header onLogout={() => signOut(auth)} />
            <main id="main-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {routes}
              </DndContext>
            </main>
          </div>
        </div>
        {!isDesktop && <BottomBar actionConfig={actionConfig} />}
      </div>
      
      {/* Modals */}
      {(selectedPost || isAddModalOpen) && ( <ContenutoModal post={selectedPost || undefined} onClose={handleCloseModals} onSave={isAddModalOpen ? handleAddPost : handleSavePost} onDelete={handleDeletePost} onDuplicate={handleDuplicatePost} progetti={progetti} /> )}
      {isImportModalOpen && (<ImportModal onClose={handleCloseModals} onImport={handleImport} />)}
      {isProjectModalOpen && ( <ProjectManagerModal onClose={() => setIsProjectModalOpen(false)} progetti={progetti} user={user} onAddProject={handleAddProject} onUpdateProject={handleUpdateProject} onDeleteProject={handleDeleteProject} /> )}
      <ExportModal isOpen={isExportModalOpen} onClose={handleCloseModals} onExport={handleExportFromTodo} maxCount={posts.filter(p => !p.statoProdotto).length} />
      <AnalyticsImportModal isOpen={isAnalyticsModalOpen} onClose={handleCloseModals} platforms={platforms} onAnalyticsImport={handleAnalyticsImport} />
    </>
  );
}

// Component to handle auth state
function AppContent() {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900"><p className="dark:text-white">Inizializzazione...</p></div>;
  
  return (
    <Routes>
      <Route path="/login" element={!user ? <Auth /> : <Navigate to="/" />} />
      <Route path="/*" element={user ? <MainLayout /> : <Navigate to="/login" />} />
    </Routes>
  );
}

// Main App component with providers
function App() { 
  return ( 
    <BrowserRouter> 
      <ScrollToTop /> 
      <ThemeProvider> 
        <AuthProvider> 
          <AppContent /> 
        </AuthProvider> 
      </ThemeProvider> 
    </BrowserRouter> 
  ); 
}
export default App;
