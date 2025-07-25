import React, { useState, useEffect, useMemo } from 'react';
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { addWeeks, format, startOfWeek, addDays, isEqual, startOfDay, setHours, getDay, differenceInWeeks } from 'date-fns';
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

const normalizeDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
};

interface CalendarioProps {
    posts: Post[];
    progetti: Progetto[];
    workingDays: number[];
    onCardClick: (post: Post) => void;
    onStatusChange: (postId: string, field: 'statoProdotto' | 'statoPubblicato', value: boolean) => void;
    autoScrollEnabled: boolean;
}

export const Calendario: React.FC<CalendarioProps> = ({ posts, progetti, workingDays, onCardClick, onStatusChange, autoScrollEnabled }) => {
    const { getActiveColor } = useTheme();
    const isDesktop = useBreakpoint();
    const [oggi] = useState(() => startOfDay(new Date()));
    const [weeks, setWeeks] = useState<Date[][]>([]);

    const dateEstremes = useMemo(() => {
        if (posts.length === 0) {
            return { first: addDays(oggi, -21), last: addWeeks(oggi, 8) };
        }
        
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        posts.forEach((post) => {
            const currentDate = normalizeDate(post.data);
            if (!currentDate) return;

            if (minDate === null || currentDate < minDate) minDate = currentDate;
            if (maxDate === null || currentDate > maxDate) maxDate = currentDate;
        });

        if (minDate === null || maxDate === null) {
            return { first: addDays(oggi, -21), last: addWeeks(oggi, 8) };
        }

        if (minDate > oggi) minDate = oggi;
        if (maxDate < oggi) maxDate = oggi;

        return { first: minDate, last: addWeeks(maxDate, 1) };
    }, [posts, oggi]);

    useEffect(() => {
        const dataInizioCalendario = startOfWeek(dateEstremes.first, { weekStartsOn: 1 });
        const dataFineCalendario = startOfWeek(dateEstremes.last, { weekStartsOn: 1 });
        const weekCount = differenceInWeeks(dataFineCalendario, dataInizioCalendario) + 1;

        const weekArray = Array.from({ length: weekCount > 0 ? weekCount : 12 }, (_, i) => {
            const settimanaInizio = addWeeks(dataInizioCalendario, i);
            return Array.from({ length: 7 }, (_, j) => addDays(settimanaInizio, j))
                .filter(day => workingDays.includes(getDay(day) === 0 ? 7 : getDay(day)));
        });
        setWeeks(weekArray.filter(week => week.length > 0));
    }, [workingDays, dateEstremes]);

    useEffect(() => {
        if (!autoScrollEnabled) return;

        const scrollTimer = setTimeout(() => {
            const scrollContainer = document.getElementById('main-scroll-container');
            if (!scrollContainer || weeks.length === 0) return;

            let targetDay = oggi;
            if (!workingDays.includes(getDay(oggi) === 0 ? 7 : getDay(oggi))) {
                let nextDay = addDays(oggi, 1);
                while (!workingDays.includes(getDay(nextDay) === 0 ? 7 : getDay(nextDay))) {
                    nextDay = addDays(nextDay, 1);
                }
                targetDay = nextDay;
            }

            const targetId = isDesktop ? `week-${format(targetDay, 'yyyy-ww')}` : `day-${format(targetDay, 'yyyy-MM-dd')}`;
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const headerOffset = document.querySelector('header')?.offsetHeight || 0;
                const topPosition = targetElement.offsetTop - headerOffset;
                scrollContainer.scrollTo({ top: Math.max(0, topPosition), behavior: 'auto' });
            }
        }, 150);
        return () => clearTimeout(scrollTimer);
    }, [isDesktop, weeks, oggi, workingDays, autoScrollEnabled]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            await updateDoc(doc(db, 'contenuti', active.id as string), { 
                data: Timestamp.fromDate(setHours(new Date(over.id as string), 9)) 
            });
        }
    };

    if (isDesktop) {
        return (
            <div className="p-6">
                <DndContext onDragEnd={handleDragEnd}>
                    <div className="space-y-8">
                        {weeks.map((settimana, index) => { 
                            if (settimana.length === 0) return null;
                            return (
                                <div key={index} id={`week-${format(settimana[0], 'yyyy-ww')}`}>
                                    <h3 className="text-lg font-medium mb-4 text-gray-600 dark:text-gray-400">{format(settimana[0], 'dd MMM', { locale: it })} - {format(settimana[settimana.length - 1], 'dd MMM', { locale: it })}</h3>
                                    <div className="border-l border-t border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                                        <div className="grid" style={{ gridTemplateColumns: `repeat(${settimana.length}, minmax(0, 1fr))` }}>
                                            {settimana.map(giorno => {
                                                const isToday = isEqual(startOfDay(giorno), oggi);
                                                const headerClass = isToday ? `${getActiveColor('bg')} text-white font-bold` : 'bg-white dark:bg-gray-800';
                                                return (
                                                    <div key={`header-${giorno.toISOString()}`} className={`p-3 text-center border-r border-b border-gray-200 dark:border-gray-700 ${headerClass}`}>
                                                        <h4 className={`font-semibold uppercase text-xs tracking-wider ${isToday ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{format(giorno, 'eeee', {locale: it})}</h4>
                                                        <p className={`text-2xl font-light ${isToday ? 'text-white' : 'text-gray-800 dark:text-gray-300'}`}>{format(giorno, 'dd')}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="grid" style={{ gridTemplateColumns: `repeat(${settimana.length}, minmax(0, 1fr))` }}>
                                            {settimana.map(giorno => {
                                                const dropZoneId = giorno.toISOString();
                                                const contenuti = posts.filter(p => p.data && isEqual(startOfDay(normalizeDate(p.data)!), startOfDay(giorno))).sort((a,b) => normalizeDate(a.data)!.getTime() - normalizeDate(b.data)!.getTime());
                                                return (
                                                    <div key={dropZoneId} className="w-full border-r border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                                        <DropZone id={dropZoneId}>
                                                            {contenuti.map(post => {
                                                                const progetto = progetti.find(p => p.id === post.projectId);
                                                                return (
                                                                    <ContenutoCard
                                                                        key={post.id} post={post} onCardClick={onCardClick}
                                                                        onStatusChange={onStatusChange} isDraggable={true}
                                                                        projectColor={progetto?.color} nomeProgetto={progetto?.nome}
                                                                    />
                                                                );
                                                            })}
                                                        </DropZone>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </DndContext>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            {weeks.flat().map(giorno => {
                const isToday = isEqual(startOfDay(giorno), oggi);
                const dayId = `day-${format(giorno, 'yyyy-MM-dd')}`;
                const headerClass = isToday ? `${getActiveColor('bg')} text-white` : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200';
                const contenuti = posts.filter(p => p.data && isEqual(startOfDay(normalizeDate(p.data)!), startOfDay(giorno))).sort((a,b) => normalizeDate(a.data)!.getTime() - normalizeDate(b.data)!.getTime());
                return (
                    <div key={giorno.toISOString()} id={dayId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <h4 className={`font-bold text-sm p-3 border-b border-gray-200 dark:border-gray-700 capitalize transition-colors ${headerClass}`}>{format(giorno, 'eeee dd MMMM', { locale: it })}</h4>
                        <div className="bg-gray-50 dark:bg-gray-800/50 min-h-[3rem]">
                            {contenuti.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 p-3">
                                    {contenuti.map(post => {
                                        const progetto = progetti.find(p => p.id === post.projectId);
                                        return (<ContenutoCard
                                            key={post.id} post={post} onCardClick={onCardClick}
                                            onStatusChange={onStatusChange} isDraggable={false}
                                            projectColor={progetto?.color} nomeProgetto={progetto?.nome}
                                            isMobileView={true}
                                        />);
                                    })}
                                </div>
                            ) : (
                                <div className="p-3">
                                     <div className="h-10 text-center text-gray-400 text-xs pt-2">Nessun post</div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};