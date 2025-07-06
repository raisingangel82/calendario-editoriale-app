import React, { useState, useEffect, useMemo } from 'react';
import { DndContext, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { addWeeks, format, startOfWeek, addDays, isEqual, startOfDay, setHours, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { ContenutoCard } from './ContenutoCard';
import type { Post, Progetto } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const DropZone: React.FC<{ id: string; children: React.ReactNode; }> = ({ id, children }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const bgColor = isOver ? 'bg-indigo-50 dark:bg-indigo-900/40' : '';
    return (<div ref={setNodeRef} className={`p-2 h-full w-full transition-colors rounded-lg ${bgColor} min-h-[10rem]`}><div className="space-y-2">{children}</div></div>);
}

interface CalendarioProps {
    posts: Post[];
    progetti: Progetto[];
    workingDays: number[];
    onCardClick: (post: Post) => void;
    onStatusChange: (postId: string, field: 'statoProdotto' | 'statoPubblicato', value: boolean) => void;
}

export const Calendario: React.FC<CalendarioProps> = ({ posts, progetti, workingDays = [1, 2, 3, 4, 5], onCardClick, onStatusChange }) => {
    const { getActiveColor } = useTheme();
    const isDesktop = useBreakpoint();
    const oggi = useMemo(() => startOfDay(new Date()), []);
    const [weeks, setWeeks] = useState<Date[][]>([]);

    useEffect(() => {
        const dataInizioCalendario = startOfWeek(addDays(oggi, -21), { weekStartsOn: 1 });
        // ▼▼▼ MODIFICA: Rimosso il filtro che forzava la visualizzazione di 'oggi' ▼▼▼
        const weekArray = Array.from({ length: 12 }, (_, i) => {
            const settimanaInizio = addWeeks(dataInizioCalendario, i);
            return Array.from({ length: 7 }, (_, j) => addDays(settimanaInizio, j))
                .filter(day => workingDays.includes(getDay(day)));
        });
        setWeeks(weekArray.filter(week => week.length > 0));
    }, [workingDays, oggi]);

    useEffect(() => {
        const scrollTimer = setTimeout(() => {
            const scrollContainer = document.getElementById('main-scroll-container');
            if (!scrollContainer || weeks.length === 0) return;

            // ▼▼▼ NUOVA LOGICA DI SCROLL CORRETTA ▼▼▼
            let targetDay;
            const isTodayWorkingDay = workingDays.includes(getDay(oggi));

            if (isTodayWorkingDay) {
                // Se oggi è un giorno lavorativo, punta a oggi.
                targetDay = oggi;
            } else {
                // Altrimenti, calcola il prossimo giorno lavorativo.
                let nextDay = addDays(oggi, 1);
                while (!workingDays.includes(getDay(nextDay))) {
                    nextDay = addDays(nextDay, 1);
                }
                targetDay = nextDay;
            }
            // ▲▲▲ FINE NUOVA LOGICA ▲▲▲

            let targetId;
            if (isDesktop) {
                const targetWeek = weeks.find(week => 
                    week.some(day => isEqual(startOfDay(day), startOfDay(targetDay)))
                );
                if (targetWeek && targetWeek.length > 0) {
                    targetId = `week-${format(targetWeek[0], 'yyyy-ww')}`;
                } else {
                    targetId = `week-${format(targetDay, 'yyyy-ww')}`;
                }
            } else {
                targetId = `day-${format(targetDay, 'yyyy-MM-dd')}`;
            }
                
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const headerOffset = document.querySelector('header')?.offsetHeight || 0;
                const topPosition = targetElement.offsetTop - headerOffset;
                scrollContainer.scrollTo({ top: Math.max(0, topPosition), behavior: 'auto' });
            }
        }, 100);
        return () => clearTimeout(scrollTimer);
    }, [isDesktop, weeks, oggi, workingDays]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) await updateDoc(doc(db, 'contenuti', active.id as string), { data: Timestamp.fromDate(setHours(new Date(over.id as string), 9)) });
    };

    if (isDesktop) {
        return ( <div className="p-6"> <DndContext onDragEnd={handleDragEnd}> <div className="space-y-8"> {weeks.map((settimana, index) => { 
            if (settimana.length === 0) return null;
            const gridColsClass = settimana.length === 7
                ? 'grid-cols-[repeat(7,minmax(0,1fr))]'
                : `grid-cols-${settimana.length}`;

            return ( <div key={index} id={`week-${format(settimana[0], 'yyyy-ww')}`}> <h3 className="text-lg font-medium mb-4 text-gray-600 dark:text-gray-400">{format(settimana[0], 'dd MMM', { locale: it })} - {format(settimana[settimana.length - 1], 'dd MMM', { locale: it })}</h3> <div className="border-l border-t border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800"> <div className={`grid ${gridColsClass}`}>{settimana.map(giorno => {
                const isToday = isEqual(startOfDay(giorno), oggi);
                const headerClass = isToday ? `${getActiveColor('bg')} text-white font-bold` : 'bg-white dark:bg-gray-800';
                
                return ( <div key={`header-${giorno.toISOString()}`} className={`p-3 text-center border-r border-b border-gray-200 dark:border-gray-700 ${headerClass}`}>
                    <h4 className={`font-semibold uppercase text-xs tracking-wider ${isToday ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{format(giorno, 'eeee', {locale: it})}</h4>
                    <p className={`text-2xl font-light ${isToday ? 'text-white' : 'text-gray-800 dark:text-gray-300'}`}>{format(giorno, 'dd')}</p>
                </div> );
            })}</div> <div className={`grid ${gridColsClass}`}>{settimana.map(giorno => { const dropZoneId = giorno.toISOString(); const contenuti = posts.filter(p => p.data && isEqual(startOfDay((p.data as Timestamp).toDate()), startOfDay(giorno))).sort((a,b) => (a.data as Timestamp).toMillis() - (b.data as Timestamp).toMillis()); return ( <div key={dropZoneId} className="w-full border-r border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"><DropZone id={dropZoneId}>{contenuti.map(post => { const progetto = progetti.find(p => p.id === post.projectId); return ( <ContenutoCard key={post.id} post={post} onCardClick={onCardClick} onStatusChange={onStatusChange} isDraggable={true} projectColor={progetto?.color} nomeProgetto={progetto?.nome} /> ); })}</DropZone></div> ); })}</div> </div> </div> )
        })} </div> </DndContext> </div> );
    }

    return ( <div className="space-y-4 p-4"> {weeks.flat().map(giorno => { const isToday = isEqual(startOfDay(giorno), oggi); const dayId = `day-${format(giorno, 'yyyy-MM-dd')}`; const headerClass = isToday ? `${getActiveColor('bg')} text-white` : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'; const contenuti = posts.filter(p => p.data && isEqual(startOfDay((p.data as Timestamp).toDate()), startOfDay(giorno))).sort((a,b) => (a.data as Timestamp).toMillis() - (b.data as Timestamp).toMillis()); return ( <div key={giorno.toISOString()} id={dayId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"> <h4 className={`font-bold text-sm p-3 border-b border-gray-200 dark:border-gray-700 capitalize transition-colors ${headerClass}`}>{format(giorno, 'eeee dd MMMM', { locale: it })}</h4> <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 min-h-[3rem]">{contenuti.length > 0 ? (contenuti.map(post => { const progetto = progetti.find(p => p.id === post.projectId); return (<ContenutoCard key={post.id} post={post} onCardClick={onCardClick} onStatusChange={onStatusChange} isDraggable={false} projectColor={progetto?.color} nomeProgetto={progetto?.nome} isMobileView={true} />); })) : <div className="h-10 text-center text-gray-400 text-xs pt-2">Nessun post</div>}</div> </div> ); })} </div> );
};
