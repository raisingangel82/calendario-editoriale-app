import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { db, auth } from './firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, Timestamp, setDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Plus, Download } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useBreakpoint } from './hooks/useBreakpoint';

import { Sidebar } from './components/Sidebar';
import { BottomBar } from './components/BottomBar';
import { Header } from './components/Header';
import { ScrollToTop } from './components/ScrollToTop';

import { Calendario } from './components/Calendario';
import { FilteredListView } from './components/FilteredListView';
import { Stats } from './components/Stats';
import { Impostazioni } from './pages/Impostazioni';
import { Auth } from './components/Auth';

import { ContenutoModal } from './components/ContenutoModal';
import { ImportModal } from './components/ImportModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ExportModal } from './components/ExportModal';

import type { Post, Progetto, Categoria } from './types';

const getCategoriaGenerica = (tipoContenuto: string): Categoria => {
    const tipo = (tipoContenuto || "").toLowerCase();
    if (['reel', 'video', 'vlog', 'booktrailer'].some(term => tipo.includes(term))) return 'Video';
    if (['immagine', 'carousel', 'grafica'].some(term => tipo.includes(term))) return 'Immagine';
    return 'Testo';
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

function MainLayout() {
  const { user } = useAuth();
  const isDesktop = useBreakpoint();
  const location = useLocation();

  const [posts, setPosts] = useState<Post[]>([]);
  const [progetti, setProgetti] = useState<Progetto[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  
  const [actionButton, setActionButton] = useState({ icon: Plus, onClick: () => setIsAddModalOpen(true), label: 'Nuovo Post' });

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    const userPrefsRef = doc(db, 'userPreferences', user.uid);
    getDoc(userPrefsRef).then(docSnap => {
        if (docSnap.exists() && docSnap.data().workingDays) setWorkingDays(docSnap.data().workingDays);
    });

    const qPosts = query(collection(db, "contenuti"), where("userId", "==", user.uid));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => { setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[]); setLoadingData(false); });
    const qProgetti = query(collection(db, "progetti"), where("userId", "==", user.uid));
    const unsubProgetti = onSnapshot(qProgetti, (snapshot) => setProgetti(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Progetto[]));
    return () => { unsubPosts(); unsubProgetti(); };
  }, [user]);

  useEffect(() => {
      switch (location.pathname) {
          case '/todo':
              setActionButton({ icon: Download, onClick: () => setIsExportModalOpen(true), label: 'Esporta Contenuti' });
              break;
          case '/stats':
          case '/utility':
              setActionButton({ icon: Plus, onClick: () => {}, label: 'Nessuna Azione' });
              break;
          case '/':
          default:
              setActionButton({ icon: Plus, onClick: () => setIsAddModalOpen(true), label: 'Nuovo Post' });
              break;
      }
  }, [location.pathname]);
  
  const handleSetWorkingDays = async (days: number[]) => {
      setWorkingDays(days);
      if(user) await setDoc(doc(db, 'userPreferences', user.uid), { workingDays: days }, { merge: true });
  }

  const handleCloseModals = () => { setSelectedPost(null); setIsAddModalOpen(false); setIsImportModalOpen(false); setIsProjectModalOpen(false); setIsExportModalOpen(false); };
  const handleAddPost = async (data: any) => { if (user) await addDoc(collection(db, 'contenuti'), { ...data, userId: user.uid, data: Timestamp.fromDate(data.data as Date) }); handleCloseModals(); };
  const handleSavePost = async (data: any) => { if (selectedPost) await updateDoc(doc(db, 'contenuti', selectedPost.id), { ...data, data: Timestamp.fromDate(data.data as Date) }); handleCloseModals(); };
  const handleDeletePost = async (id: string) => { await deleteDoc(doc(db, 'contenuti', id)); handleCloseModals(); };
  const handleStatusChange = async (id: string, field: 'statoProdotto'|'statoPubblicato', value: boolean) => { const ref = doc(db, 'contenuti', id); if (field === 'statoPubblicato' && value) await updateDoc(ref, { statoProdotto: true, statoPubblicato: true }); else if (field === 'statoProdotto' && !value) await updateDoc(ref, { statoProdotto: false, statoPubblicato: false }); else await updateDoc(ref, { [field]: value }); };
  const handleDuplicatePost = async (post: Post) => { if (user) { const { id, ...data } = post; await addDoc(collection(db, 'contenuti'), { ...data, userId: user.uid, statoProdotto: false, statoPubblicato: false }); handleCloseModals(); }};
  
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
    const dataToExport = { posts: posts, progetti: progetti };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `authorflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    link.remove();
  };

  const handleImport = async () => { /* ... */ };
  const handleAddProject = async (data: any) => { if(user) await addDoc(collection(db, 'progetti'), { ...data, userId: user.uid }); };
  const handleUpdateProject = async (id: string, data: any) => await updateDoc(doc(db, "progetti", id), data);
  const handleDeleteProject = async (id: string) => await deleteDoc(doc(db, 'progetti', id));
  
  if (loadingData) return <div className="h-screen w-screen flex items-center justify-center"><p>Caricamento dati...</p></div>;

  const routes = (
      <Routes>
          <Route path="/" element={<Calendario posts={posts} progetti={progetti} workingDays={workingDays} onCardClick={setSelectedPost} onStatusChange={handleStatusChange} />} />
          <Route path="/todo" element={<FilteredListView posts={posts} progetti={progetti} onPostClick={setSelectedPost} onStatusChange={handleStatusChange} />} />
          <Route path="/stats" element={<Stats posts={posts} progetti={progetti} />} />
          <Route path="/utility" element={<Impostazioni onImportClick={() => setIsImportModalOpen(true)} onExportClick={handleExportDatabase} onProjectsClick={() => setIsProjectModalOpen(true)} workingDays={workingDays} setWorkingDays={handleSetWorkingDays} />} />
      </Routes>
  );

  return (
    <>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-1 overflow-hidden">
          {isDesktop && <Sidebar actionConfig={actionButton} />}
          <div className="flex-1 flex flex-col">
            <div className="flex-shrink-0">
              <Header onLogout={() => signOut(auth)} />
            </div>
            <main id="main-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar">
              {routes}
            </main>
          </div>
        </div>
        {!isDesktop && <BottomBar actionConfig={actionButton} />}
      </div>
      {(selectedPost || isAddModalOpen) && ( <ContenutoModal post={selectedPost || undefined} onClose={handleCloseModals} onSave={isAddModalOpen ? handleAddPost : handleSavePost} onDelete={handleDeletePost} onDuplicate={handleDuplicatePost} progetti={progetti} /> )}
      {isImportModalOpen && (<ImportModal onClose={handleCloseModals} onImport={handleImport} />)}
      {isProjectModalOpen && ( <ProjectManagerModal onClose={() => setIsProjectModalOpen(false)} progetti={progetti} onAddProject={handleAddProject} onUpdateProject={handleUpdateProject} onDeleteProject={handleDeleteProject} /> )}
      <ExportModal 
          isOpen={isExportModalOpen}
          onClose={handleCloseModals}
          onExport={handleExportFromTodo}
          maxCount={posts.filter(p => !p.statoProdotto).length}
      />
    </>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center"><p>Inizializzazione...</p></div>;
  
  return (
    <Routes>
      <Route path="/*" element={user ? <MainLayout /> : <Navigate to="/login" />} />
      <Route path="/login" element={!user ? <Auth /> : <Navigate to="/" />} />
    </Routes>
  );
}

function App() { return ( <BrowserRouter> <ScrollToTop /> <ThemeProvider> <AuthProvider> <AppContent /> </AuthProvider> </ThemeProvider> </BrowserRouter> ); }
export default App;
