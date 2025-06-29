import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import type { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, Timestamp, writeBatch, getDocs } from 'firebase/firestore';
import { addWeeks, format, startOfWeek, addDays, isEqual, startOfDay, getHours, setHours } from 'date-fns';
import { it } from 'date-fns/locale';
import { DndContext, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

import { ContenutoCard } from './ContenutoCard.tsx';
import { ContenutoModal } from './ContenutoModal.tsx';
import { Plus, Download, Upload } from 'lucide-react';
import { Stats } from './Stats.tsx';
import { useBreakpoint } from '../hooks/useBreakpoint.ts';
import { FilteredListView } from './FilteredListView.tsx';
import { ImportModal } from './ImportModal.tsx';
import type { Post, Progetto, Categoria } from '../types';

interface CalendarioProps {
    user: User;
}

const fasceOrarie = [ { label: '08-12', startHour: 8, endHour: 12 }, { label: '12-16', startHour: 12, endHour: 16 }, { label: '16-20', startHour: 16, endHour: 20 }];
    
const DropZone: React.FC<{ id: string; children: React.ReactNode; }> = ({ id, children }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const bgColor = isOver ? 'bg-red-50 dark:bg-red-900/40' : '';
    return (<div ref={setNodeRef} className={`p-2 h-full w-full transition-colors rounded-lg ${bgColor}`}><div className="space-y-2">{children}</div></div>);
}
const getCategoriaGenerica = (tipoContenuto: string): Categoria => {
    const tipoLower = tipoContenuto.toLowerCase();
    if (['reel', 'video', 'booktrailer', 'vlog', 'montaggio', 'documentario'].some(term => tipoLower.includes(term))) return 'Video';
    if (['immagine', 'post statico', 'carousel'].some(term => tipoLower.includes(term))) return 'Immagine';
    return 'Testo';
};

export const Calendario: React.FC<CalendarioProps> = ({ user }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [progetti, setProgetti] = useState<Progetto[]>([]);
    const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
    const [allWeeks, setAllWeeks] = useState<Date[][]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [filterCategory, setFilterCategory] = useState<Categoria | null>(null);
    const [visibleWeeksCount, setVisibleWeeksCount] = useState(4);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const isDesktop = useBreakpoint();
    const dataInizio = new Date('2025-06-30');
    
    const PERPETUAL_SCROLL_ENABLED = userPlan === 'pro';
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
        const userDocRef = doc(db, "users", user.uid);
        const unsubUser = onSnapshot(userDocRef, (doc) => { setUserPlan(doc.data()?.plan || 'free'); });
        const qPosts = query(collection(db, "contenuti"), where("userId", "==", user.uid));
        const unsubPosts = onSnapshot(qPosts, (snapshot) => { setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[]); });
        const qProgetti = query(collection(db, "progetti"), where("userId", "==", user.uid));
        const unsubProgetti = onSnapshot(qProgetti, (snapshot) => { setProgetti(snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome })) as Progetto[]); });
        return () => { unsubUser(); unsubPosts(); unsubProgetti(); };
    }, [user.uid]);
    
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

    const handleSavePost = async (updatedFields: any) => {
        if (!selectedPost) return;
        const docRef = doc(db, 'contenuti', selectedPost.id);
        const dataToUpdate = { ...updatedFields, data: Timestamp.fromDate(updatedFields.data as Date) };
        await updateDoc(docRef, dataToUpdate);
        setSelectedPost(null);
    };
    const handleAddPost = async (dataToSave: Omit<Post, 'id' | 'userId'>) => {
        if (userPlan === 'free' && progetti.length >= 1) {
            const isNewProject = !progetti.some(p => p.nome === dataToSave.libro);
            if (isNewProject) {
                alert("Il piano gratuito consente di gestire un solo progetto. Passa a Pro per aggiungerne altri."); 
                return;
            }
        }
        if (!user) return;
        const docData = { ...dataToSave, userId: user.uid, data: Timestamp.fromDate(dataToSave.data as Date) };
        await addDoc(collection(db, 'contenuti'), docData);
        setIsAddModalOpen(false);
    };
    const handleDeletePost = async (postId: string) => {
        const docRef = doc(db, 'contenuti', postId);
        await deleteDoc(docRef);
        setSelectedPost(null);
    };
    const handleCardClick = (post: Post) => { setSelectedPost(post); };
    const handleCloseModal = () => { setSelectedPost(null); setIsAddModalOpen(false); setIsImportModalOpen(false); };
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
        const postId = active.id as string;
        const dropZoneId = over.id as string;
        const [giornoString, fasciaLabel] = dropZoneId.split('|');
        const nuovoGiorno = new Date(giornoString);
        const fasciaCorrispondente = fasceOrarie.find(f => f.label === fasciaLabel);
        if (!fasciaCorrispondente) return;
        let nuovaData = setHours(nuovoGiorno, fasciaCorrispondente.startHour);
        const docRef = doc(db, 'contenuti', postId);
        await updateDoc(docRef, { data: Timestamp.fromDate(nuovaData) });
    };
    const handleFilterClick = (categoria: Categoria) => { setFilterCategory(categoria); setViewMode('list'); };
    const handleShowCalendar = () => { setViewMode('calendar'); setFilterCategory(null); };
    const handleExport = () => {
        if (userPlan !== 'pro') { alert("L'esportazione è una funzionalità Pro."); return; }
        const dataToExport = posts.map(({ id, userId, ...rest }) => ({...rest, data: rest.data ? rest.data.toDate().toISOString() : null }));
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `calendario_editoriale_${new Date().toISOString().slice(0,10)}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };
    const handleDuplicatePost = async (postToDuplicate: Post) => {
        if (userPlan !== 'pro') { alert("La duplicazione è una funzionalità Pro."); return; }
        if (!user) return;
        const { id, userId, ...oldData } = postToDuplicate;
        const docData = { ...oldData, statoProdotto: false, statoPubblicato: false, userId: user.uid, };
        await addDoc(collection(db, 'contenuti'), docData);
        handleCloseModal();
    };
    const handleImport = async (importedPosts: any[], mode: 'add' | 'overwrite') => {
        if (userPlan !== 'pro') { alert("L'importazione di file è una funzionalità Pro."); return; }
        if (!window.confirm(`Stai per ${mode === 'overwrite' ? 'SOVRASCRIVERE TUTTI I POST ESISTENTI' : 'importare ' + importedPosts.length + ' nuovi post'}. Sei assolutamente sicuro?`)) return;
        
        try {
            if (mode === 'overwrite') {
                const deleteBatch = writeBatch(db);
                const q = query(collection(db, "contenuti"), where("userId", "==", user.uid));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => deleteBatch.delete(doc.ref));
                await deleteBatch.commit();
            }
            const importBatch = writeBatch(db);
            let importedCount = 0;
            importedPosts.forEach(post => {
                if (post.libro && post.piattaforma && post.data && post.tipoContenuto && post.descrizione) {
                    const newPostRef = doc(collection(db, "contenuti"));
                    importBatch.set(newPostRef, { ...post, userId: user.uid, data: Timestamp.fromDate(new Date(post.data)), statoProdotto: post.statoProdotto || false, statoPubblicato: post.statoPubblicato || false, urlMedia: post.urlMedia || '' });
                    importedCount++;
                }
            });
            await importBatch.commit();
            alert(`${importedCount} post importati con successo!`);
            setIsImportModalOpen(false);
        } catch (error) {
            console.error("Errore importazione:", error);
            alert(`Errore durante l'importazione.`);
        }
    };

    const postsDaCreareFiltrati = posts
        .filter(p => !p.statoProdotto && filterCategory && getCategoriaGenerica(p.tipoContenuto) === filterCategory)
        .sort((a, b) => (a.data?.toDate().getTime() || 0) - (b.data?.toDate().getTime() || 0));

    const weeksToDisplay = allWeeks.slice(0, visibleWeeksCount);

    const DesktopView = () => (
        <div className="space-y-8">
            {weeksToDisplay.map((settimana, index) => (
                <div key={index}>
                    <h3 className="text-lg font-medium mb-4 text-gray-600 dark:text-gray-400">
                        Settimana {index + 1}
                        <span className="text-sm font-light text-gray-400 dark:text-gray-500 ml-3">({format(settimana[0], 'dd MMM', { locale: it })} - {format(settimana[4], 'dd MMM', { locale: it })})</span>
                    </h3>
                    <div className="grid grid-cols-5 gap-4">
                        {settimana.map(giorno => (
                            <div key={giorno.toISOString()} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
                                <div className="p-3 text-center border-b border-gray-200 dark:border-gray-700">
                                    <h4 className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">{format(giorno, 'eeee')}</h4>
                                    <p className="text-gray-400 dark:text-gray-500 text-2xl font-light">{format(giorno, 'dd')}</p>
                                </div>
                                <div className="flex flex-col flex-grow p-2 space-y-2">
                                    {fasceOrarie.map(fascia => {
                                        const contenutiDellaFascia = posts.filter(p => p.data && isEqual(startOfDay(p.data.toDate()), startOfDay(giorno)) && getHours(p.data.toDate()) >= fascia.startHour && getHours(p.data.toDate()) < fascia.endHour);
                                        const dropZoneId = `${giorno.toISOString()}|${fascia.label}`;
                                        return (
                                            <div key={fascia.label} className="min-h-[6rem] w-full"><DropZone id={dropZoneId}>{contenutiDellaFascia.map(post => (<ContenutoCard key={post.id} post={post} onCardClick={handleCardClick} isDraggable={true} />))}</DropZone></div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
    const MobileView = () => (
        <div className="space-y-6">
            {weeksToDisplay.map((settimana, index) => (
                <div key={index}>
                     <h3 className="text-lg font-medium mb-4 text-gray-600 dark:text-gray-400">Settimana {index + 1}</h3>
                     <div className="space-y-4">
                        {settimana.map(giorno => {
                            const contenutiDelGiorno = posts.filter(post => post.data && isEqual(startOfDay(post.data.toDate()), startOfDay(giorno))).sort((a,b) => a.data!.toDate().getTime() - b.data!.toDate().getTime());
                            return (
                                <div key={giorno.toISOString()} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <h4 className="font-bold text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-t-lg border-b border-gray-200 dark:border-gray-700 capitalize">{format(giorno, 'eeee dd MMMM', { locale: it })}</h4>
                                    <div className="space-y-3 p-3 bg-white dark:bg-gray-800/50 rounded-b-lg min-h-[3rem]">
                                        {contenutiDelGiorno.length > 0 ? contenutiDelGiorno.map(post => (<ContenutoCard key={post.id} post={post} onCardClick={handleCardClick} isDraggable={false} />)) : <div className="h-10"></div>}
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                </div>
            ))}
        </div>
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-stretch gap-6 mb-10">
                <div className="w-full md:w-3/4"><Stats posts={posts} progetti={progetti} onFilterClick={handleFilterClick} /></div>
                <div className="w-full md:w-1/4 flex flex-col sm:flex-row md:flex-col gap-2">
                    <button onClick={handleExport} disabled={userPlan !== 'pro'} className="w-full h-full justify-center font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors border text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" title={userPlan!=='pro'?'Funzionalità Pro':'Esporta i tuoi dati'}><Download size={18} /> Esporta</button>
                    <button onClick={() => setIsImportModalOpen(true)} disabled={userPlan !== 'pro'} className="w-full h-full justify-center font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors border text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" title={userPlan!=='pro'?'Funzionalità Pro':'Importa da un file'}><Upload size={18} /> Importa</button>
                    <button onClick={() => setIsAddModalOpen(true)} className="w-full h-full justify-center font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors border text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"><Plus size={18} /> Nuovo Post</button>
                </div>
            </div>
            
            <DndContext onDragEnd={handleDragEnd} disabled={!isDesktop}>
                {viewMode === 'calendar' ? ( isDesktop ? <DesktopView /> : <MobileView /> ) : ( <FilteredListView posts={postsDaCreareFiltrati} filterCategory={filterCategory!} onBack={handleShowCalendar} onPostClick={handleCardClick} /> )}
            </DndContext>

            {viewMode === 'calendar' && (PERPETUAL_SCROLL_ENABLED ? visibleWeeksCount < allWeeks.length : false) && (
                <div ref={loadMoreRef} className="h-20 flex items-center justify-center text-gray-400">
                    <p>Caricamento...</p>
                </div>
            )}
            
            {(selectedPost || isAddModalOpen) && ( <ContenutoModal post={selectedPost || undefined} onClose={handleCloseModal} onSave={isAddModalOpen ? handleAddPost : handleSavePost} onDelete={handleDeletePost} onDuplicate={handleDuplicatePost} progetti={progetti} userPlan={userPlan}/> )}
            {isImportModalOpen && (<ImportModal onClose={handleCloseModal} onImport={handleImport} />)}
        </div>
    );
};