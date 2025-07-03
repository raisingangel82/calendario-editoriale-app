import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { DndContext, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, Timestamp, writeBatch, getDocs } from 'firebase/firestore';
import { addWeeks, format, startOfWeek, addDays, isEqual, startOfDay, setHours, isSameWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { ContenutoCard } from './ContenutoCard';
import { ContenutoModal } from './ContenutoModal';
import { Stats } from './Stats';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { FilteredListView } from './FilteredListView';
import { ImportModal } from './ImportModal';
import { ProjectManagerModal } from './ProjectManagerModal';
import type { Post, Progetto, Categoria } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const DropZone: React.FC<{ id: string; children: React.ReactNode; }> = ({ id, children }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const bgColor = isOver ? 'bg-red-50 dark:bg-red-900/40' : '';
    return (<div ref={setNodeRef} className={`p-2 h-full w-full transition-colors rounded-lg ${bgColor} min-h-[10rem]`}><div className="space-y-2">{children}</div></div>);
}

const getCategoriaGenerica = (tipoContenuto: string): Categoria => {
    const tipoLower = (tipoContenuto || "").toLowerCase();
    if (tipoLower.includes('testo')) return 'Testo';
    if (['reel', 'video', 'booktrailer', 'vlog', 'montaggio', 'documentario', 'podcast'].some(term => tipoLower.includes(term))) { return 'Video'; }
    if (['immagine', 'post statico', 'carousel', 'carosello'].some(term => tipoLower.includes(term))) { return 'Immagine'; }
    return 'Testo';
};

export const Calendario: React.FC = () => {
    const { user, loading: userLoading } = useAuth();
    const { getActiveColor } = useTheme(); 
    const oggi = startOfDay(new Date());
    const [posts, setPosts] = useState<Post[]>([]);
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [allWeeks, setAllWeeks] = useState<Date[][]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [filterCategory, setFilterCategory] = useState<Categoria | null>(null);
    const [visibleWeeksCount, setVisibleWeeksCount] = useState(4);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const isDesktop = useBreakpoint();
    const dataInizio = new Date('2025-06-30');
    
    const initialScrollDone = useRef(false);
    const [mainHeaderHeight, setMainHeaderHeight] = useState(0);

    useEffect(() => {
        const header = document.querySelector('header');
        if (header) {
            setMainHeaderHeight(header.offsetHeight);
        }
    }, []);

    const PERPETUAL_SCROLL_ENABLED = user?.plan === 'pro';
    const totalWeeksToShow = PERPETUAL_SCROLL_ENABLED ? 100 : 8;

    useEffect(() => {
        const weekArray: Date[][] = [];
        for (let i = 0; i < totalWeeksToShow; i++) {
            const settimanaInizio = addWeeks(startOfWeek(dataInizio, { weekStartsOn: 1 }), i);
            const giorniDellaSettimana: Date[] = [];
            for (let j = 0; j < 5; j++) { giorniDellaSettimana.push(addDays(settimanaInizio, j)); }
            weekArray.push(giorniDellaSettimana);
        }
        setAllWeeks(weekArray);
    }, [PERPETUAL_SCROLL_ENABLED, totalWeeksToShow]);

    useEffect(() => {
        if (!user) return;
        const qPosts = query(collection(db, "contenuti"), where("userId", "==", user.uid));
        const unsubPosts = onSnapshot(qPosts, (snapshot) => { setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[]); });

        const qProgetti = query(collection(db, "progetti"), where("userId", "==", user.uid));
        const unsubProgetti = onSnapshot(qProgetti, (snapshot) => { setProgetti(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Progetto[]); });
        
        return () => { unsubPosts(); unsubProgetti(); };
    }, [user]);
    
    useEffect(() => {
        if (posts.length > 0 && !initialScrollDone.current && viewMode === 'calendar' && mainHeaderHeight > 0) {
            const statsHeader = document.getElementById('stats-header');
            const statsHeaderHeight = statsHeader ? statsHeader.offsetHeight : 0;
            const totalHeaderHeight = mainHeaderHeight + statsHeaderHeight;

            let targetElement: HTMLElement | null = null;
    
            if (isDesktop) {
                targetElement = document.getElementById('current-week-desktop');
            } else {
                targetElement = document.getElementById('today-mobile');
            }
    
            if (targetElement) {
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - totalHeaderHeight;
      
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
            initialScrollDone.current = true;
        }
    }, [posts, viewMode, isDesktop, mainHeaderHeight]);

    useEffect(() => {
        if (viewMode !== 'calendar' || !PERPETUAL_SCROLL_ENABLED || visibleWeeksCount >= allWeeks.length) return;
        const observer = new IntersectionObserver(
          (entries) => { if (entries[0].isIntersecting) { setVisibleWeeksCount(prevCount => Math.min(prevCount + 4, allWeeks.length)); } },
          { rootMargin: "500px", threshold: 0.1 }
        );
        const currentRef = loadMoreRef.current;
        if (currentRef) { observer.observe(currentRef); }
        return () => { if (currentRef) { observer.unobserve(currentRef); } };
    }, [viewMode, allWeeks.length, visibleWeeksCount, PERPETUAL_SCROLL_ENABLED]);
    
    const handleAddPost = async (dataToSave: Omit<Post, 'id' | 'userId'>) => { if (user?.plan === 'free' && progetti.length >= 1) { const progettoEsistente = progetti.find(p => p.id === dataToSave.projectId); if (!progettoEsistente) { alert("Il piano gratuito consente di gestire un solo progetto. Passa a Pro per aggiungerne altri."); return; } } if (!user) return; const docData = { ...dataToSave, userId: user.uid, data: Timestamp.fromDate(dataToSave.data as Date) }; await addDoc(collection(db, 'contenuti'), docData); setIsAddModalOpen(false); };
    const handleSavePost = async (updatedFields: any) => { if (!selectedPost) return; const docRef = doc(db, 'contenuti', selectedPost.id); const dataToUpdate = { ...updatedFields, data: Timestamp.fromDate(updatedFields.data as Date) }; await updateDoc(docRef, dataToUpdate); setSelectedPost(null); };
    const handleDeletePost = async (postId: string) => { const docRef = doc(db, 'contenuti', postId); await deleteDoc(docRef); setSelectedPost(null); };
    const handleDeleteProject = async (projectId: string) => { const docRef = doc(db, 'progetti', projectId); await deleteDoc(docRef); };
    const handleUpdateProject = async (projectId: string, updatedData: { nome: string; sintesi: string; immagineUrl: string; color: string; }) => { const projectRef = doc(db, "progetti", projectId); await updateDoc(projectRef, updatedData); };
    const handleStatusChange = async (postId: string, field: 'statoProdotto' | 'statoPubblicato', value: boolean) => { const postRef = doc(db, 'contenuti', postId); if (field === 'statoPubblicato' && value === true) { await updateDoc(postRef, { statoProdotto: true, statoPubblicato: true }); } else if (field === 'statoProdotto' && value === false) { await updateDoc(postRef, { statoProdotto: false, statoPubblicato: false });} else { await updateDoc(postRef, { [field]: value }); } };
    const handleExport = () => { if (user?.plan !== 'pro') { alert("L'esportazione è una funzionalità Pro."); return; } const dataToExport = posts.map(({ id, userId, ...rest }) => ({...rest, data: rest.data ? rest.data.toDate().toISOString() : null })); const dataStr = JSON.stringify(dataToExport, null, 2); const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr); const exportFileDefaultName = `calendario_editoriale_${new Date().toISOString().slice(0,10)}.json`; const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', exportFileDefaultName); linkElement.click(); };
    const handleDuplicatePost = async (postToDuplicate: Post) => { if (user?.plan !== 'pro') { alert("La duplicazione è una funzionalità Pro."); return; } if (!user) return; const { id, userId, projectId, ...oldData } = postToDuplicate; const docData = { ...oldData, projectId, statoProdotto: false, statoPubblicato: false, userId: user.uid, }; await addDoc(collection(db, 'contenuti'), docData); handleCloseModal(); };
    const handleCardClick = (post: Post) => { setSelectedPost(post); };
    const handleCloseModal = () => { setSelectedPost(null); setIsAddModalOpen(false); setIsImportModalOpen(false); setIsProjectModalOpen(false); };
    const handleDragEnd = async (event: DragEndEvent) => { const { active, over } = event; if (!over) return; const postId = active.id as string; const dropZoneId = over.id as string; const nuovoGiorno = new Date(dropZoneId); const nuovaData = setHours(nuovoGiorno, 9); const docRef = doc(db, 'contenuti', postId); await updateDoc(docRef, { data: Timestamp.fromDate(nuovaData) }); };
    const handleFilterClick = (categoria: Categoria) => { setFilterCategory(categoria); setViewMode('list'); };
    const handleShowCalendar = () => { setViewMode('calendar'); setFilterCategory(null); };
    const handleImport = async (importedPosts: any[], mode: 'add' | 'overwrite') => { if (user?.plan !== 'pro') { alert("L'importazione di file è una funzionalità Pro."); return; } if (!user) return; if (!window.confirm(`Stai per ${mode === 'overwrite' ? 'SOVRASCRIVERE TUTTI I POST ESISTENTI' : 'importare ' + importedPosts.length + ' nuovi post'}. Sei assolutamente sicuro?`)) return; try { if (mode === 'overwrite') { const deleteBatch = writeBatch(db); const q = query(collection(db, "contenuti"), where("userId", "==", user.uid)); const snapshot = await getDocs(q); snapshot.forEach(doc => deleteBatch.delete(doc.ref)); await deleteBatch.commit(); } const importBatch = writeBatch(db); let importedCount = 0; importedPosts.forEach(post => { if (post.projectId && post.piattaforma && post.data && post.tipoContenuto && post.descrizione) { const newPostRef = doc(collection(db, "contenuti")); importBatch.set(newPostRef, { ...post, userId: user.uid, data: Timestamp.fromDate(new Date(post.data)), statoProdotto: post.statoProdotto || false, statoPubblicato: post.statoPubblicato || false, urlMedia: post.urlMedia || '' }); importedCount++; } }); await importBatch.commit(); alert(`${importedCount} post importati con successo!`); setIsImportModalOpen(false); } catch (error) { console.error("Errore importazione:", error); alert(`Errore durante l'importazione.`); } };
    const handleAddProject = async (newProjectData: { nome: string; sintesi: string; immagineUrl: string; color: string; }) => { if (user?.plan === 'free' && progetti.length >= 1) { alert("Il piano gratuito consente di gestire un solo progetto. Passa a Pro per aggiungerne altri."); return; } if (!user) return; await addDoc(collection(db, 'progetti'), { ...newProjectData, userId: user.uid, }); };

    if (userLoading || !user) {
        return <div className="text-center p-10">Caricamento calendario...</div>;
    }
    
    const postsDaCreareFiltrati = posts.filter(p => !p.statoProdotto && filterCategory && getCategoriaGenerica(p.tipoContenuto) === filterCategory).sort((a, b) => (a.data?.toDate().getTime() || 0) - (b.data?.toDate().getTime() || 0));
    const weeksToDisplay = allWeeks.slice(0, visibleWeeksCount);
    
    const DesktopView = () => ( <div className="space-y-8">{weeksToDisplay.map((settimana, index) => { const isCurrentWeek = isSameWeek(oggi, settimana[0], { weekStartsOn: 1 }); return ( <div key={index} id={isCurrentWeek ? 'current-week-desktop' : `week-${index}`}><h3 className="text-lg font-medium mb-4 text-gray-600 dark:text-gray-400">Settimana {index + 1}<span className="text-sm font-light text-gray-400 dark:text-gray-500 ml-3">({format(settimana[0], 'dd MMM', { locale: it })} - {format(settimana[4], 'dd MMM', { locale: it })})</span></h3><div className="border-l border-t border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"><div className="grid grid-cols-5">{settimana.map(giorno => { const isToday = isEqual(startOfDay(giorno), oggi); const headerClass = isToday ? `${getActiveColor('bg')} text-white font-bold rounded-t-lg` : 'bg-gray-100 dark:bg-gray-800/50'; return ( <div key={`header-${giorno.toISOString()}`} className={`p-3 text-center border-r border-b border-gray-200 dark:border-gray-700 transition-colors ${headerClass}`}><h4 className={`font-semibold uppercase text-xs tracking-wider ${isToday ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{format(giorno, 'eeee')}</h4><p className={`text-2xl font-light ${isToday ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>{format(giorno, 'dd')}</p></div> );})}</div><div className="grid grid-cols-5">{settimana.map(giorno => { const dropZoneId = giorno.toISOString(); const contenutiDelGiorno = posts .filter(p => p.data && isEqual(startOfDay(p.data.toDate()), startOfDay(giorno))) .sort((a, b) => (a.data?.toDate().getTime() || 0) - (b.data?.toDate().getTime() || 0)); return ( <div key={dropZoneId} className="w-full border-r border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/20"><DropZone id={dropZoneId}>{contenutiDelGiorno.map((post) => { const progettoDelPost = progetti.find(p => p.id === post.projectId); const cardColor = progettoDelPost?.color || '#9ca3af'; return ( <ContenutoCard key={post.id} post={post} onCardClick={handleCardClick} onStatusChange={handleStatusChange} isDraggable={true} projectColor={cardColor} nomeProgetto={progettoDelPost?.nome} /> ); })}</DropZone></div> ); })}</div></div></div> ) })}</div> );
    const MobileView = () => ( <div className="space-y-6">{weeksToDisplay.map((settimana, index) => (<div key={index}><h3 className="text-lg font-medium mb-4 text-gray-600 dark:text-gray-400">Settimana {index + 1}</h3><div className="space-y-4">{settimana.map(giorno => { const isToday = isEqual(startOfDay(giorno), oggi); const headerClass = isToday ? `${getActiveColor('bg')} text-white` : 'bg-gray-100 dark:bg-gray-800'; const contenutiDelGiorno = posts.filter(post => post.data && isEqual(startOfDay(post.data.toDate()), startOfDay(giorno))).sort((a, b) => a.data!.toDate().getTime() - b.data!.toDate().getTime()); return ( <div key={giorno.toISOString()} id={isToday ? 'today-mobile' : undefined} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"><h4 className={`font-bold text-sm p-3 border-b border-gray-200 dark:border-gray-700 capitalize transition-colors ${headerClass}`}>{format(giorno, 'eeee dd MMMM', { locale: it })}</h4><div className="space-y-3 p-3 bg-white dark:bg-gray-800/50 rounded-b-lg min-h-[3rem]">{contenutiDelGiorno.length > 0 ? ( contenutiDelGiorno.map((post) => { const progettoDelPost = progetti.find(p => p.id === post.projectId); const cardColor = progettoDelPost?.color || '#9ca3af'; return ( <ContenutoCard key={post.id} post={post} onCardClick={handleCardClick} onStatusChange={handleStatusChange} isDraggable={false} projectColor={cardColor} nomeProgetto={progettoDelPost?.nome} isMobileView={true} /> ); }) ) : ( <div className="h-10"></div> )}</div></div> );})}</div></div>))}</div> );
    
    return (
        <div>
            <div 
                id="stats-header" 
                className="sticky z-20 bg-gray-100 dark:bg-gray-900 pb-4 mb-6"
                style={{ top: `${mainHeaderHeight}px` }}
            >
                <div>
                    <Stats 
                        posts={posts} 
                        progetti={progetti} 
                        onFilterClick={handleFilterClick}
                        onNewPostClick={() => setIsAddModalOpen(true)}
                        onImportClick={() => setIsImportModalOpen(true)}
                        onExportClick={handleExport}
                        onProjectsClick={() => setIsProjectModalOpen(true)}
                    />
                </div>
            </div>
            
            <DndContext onDragEnd={handleDragEnd} >
                {viewMode === 'calendar' ? ( isDesktop ? <DesktopView /> : <MobileView />) : ( <FilteredListView posts={postsDaCreareFiltrati} progetti={progetti} filterCategory={filterCategory as Categoria} onBack={handleShowCalendar} onPostClick={handleCardClick} onStatusChange={handleStatusChange}/> )}
            </DndContext>

            {viewMode === 'calendar' && (PERPETUAL_SCROLL_ENABLED ? visibleWeeksCount < allWeeks.length : false) && (<div ref={loadMoreRef} className="h-20 flex items-center justify-center text-gray-400"><p>Caricamento...</p></div>)}
            
            {(selectedPost || isAddModalOpen) && ( <ContenutoModal post={selectedPost || undefined} onClose={handleCloseModal} onSave={isAddModalOpen ? handleAddPost : handleSavePost} onDelete={handleDeletePost} onDuplicate={handleDuplicatePost} progetti={progetti} /> )}
            {isImportModalOpen && (<ImportModal onClose={handleCloseModal} onImport={handleImport} />)}
            {isProjectModalOpen && ( <ProjectManagerModal onClose={() => setIsProjectModalOpen(false)} progetti={progetti} onAddProject={handleAddProject} onUpdateProject={handleUpdateProject} onDeleteProject={handleDeleteProject} /> )}
        </div>
    );
};