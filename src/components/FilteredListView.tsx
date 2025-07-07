import React, { useState, useMemo } from 'react';
import type { Post, Progetto, Categoria } from '../types';
import { ContenutoCard } from './ContenutoCard';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { projectColorPalette } from '../data/colorPalette';

interface FilteredListViewProps {
    posts: Post[];
    progetti: Progetto[];
    onPostClick: (post: Post) => void;
    onStatusChange: (postId: string, field: 'statoProdotto' | 'statoPubblicato', value: boolean) => void;
}

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

const FilterPill: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    colorClass?: string;
}> = ({ label, isActive, onClick, colorClass = '' }) => {
    const { getActiveColor } = useTheme();
    // *** CORREZIONE: Forzato il testo a bianco per i pulsanti attivi colorati ***
    const activeClasses = colorClass ? `${colorClass} text-white font-bold` : `${getActiveColor('bg')} text-white font-bold`;
    const inactiveClasses = 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600';
    
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm border dark:border-transparent whitespace-nowrap ${isActive ? activeClasses : inactiveClasses}`}
        >
            {label}
        </button>
    );
};

export const FilteredListView: React.FC<FilteredListViewProps> = ({ posts, progetti, onPostClick, onStatusChange }) => {
    const [activeFilter, setActiveFilter] = useState<{ type: 'category' | 'project', value: string }>({ type: 'category', value: 'all' });

    const filteredAndSortedPosts = useMemo(() => {
        return posts
            .filter(post => {
                if (post.statoProdotto) return false;
                if (activeFilter.type === 'category') {
                    return activeFilter.value === 'all' || getCategoriaGenerica(post.tipoContenuto) === activeFilter.value;
                }
                if (activeFilter.type === 'project') {
                    return activeFilter.value === 'all' || post.projectId === activeFilter.value;
                }
                return true;
            })
            .slice()
            .sort((a, b) => {
                const timeA = normalizeDateToMillis(a.data);
                const timeB = normalizeDateToMillis(b.data);
                if (timeA === 0 && timeB === 0) return 0;
                if (timeA === 0) return 1;
                if (timeB === 0) return -1;
                return timeA - timeB;
            });
    }, [posts, activeFilter]);

    const categoryFilterOptions: (Categoria | 'all')[] = ['all', 'Testo', 'Immagine', 'Video'];

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Contenuti da Creare
                </h1>
                <div className="flex flex-col gap-4">
                    {/* *** CORREZIONE: Aggiunto flex-wrap per andare a capo su mobile *** */}
                    <div className="flex flex-wrap items-center gap-2">
                        {categoryFilterOptions.map(option => (
                            <FilterPill 
                                key={`cat-${option}`}
                                label={option === 'all' ? 'Tutte le Categorie' : option}
                                isActive={activeFilter.type === 'category' && activeFilter.value === option}
                                onClick={() => setActiveFilter({ type: 'category', value: option })}
                            />
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <FilterPill
                            key="proj-all"
                            label="Tutti i Progetti"
                            isActive={activeFilter.type === 'project' && activeFilter.value === 'all'}
                            onClick={() => setActiveFilter({ type: 'project', value: 'all' })}
                        />
                        {progetti.map(proj => {
                            const colorInfo = projectColorPalette.find(p => p.base === proj.color);
                            const bgColor = colorInfo?.shades['700'].bgClass || 'bg-gray-500';

                            return (
                                <FilterPill 
                                    key={`proj-${proj.id}`}
                                    label={proj.nome}
                                    isActive={activeFilter.type === 'project' && activeFilter.value === proj.id}
                                    onClick={() => setActiveFilter({ type: 'project', value: proj.id })}
                                    colorClass={bgColor}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredAndSortedPosts.length > 0 ? (
                    filteredAndSortedPosts.map(post => {
                        const progettoDelPost = progetti.find(p => p.id === post.projectId);
                        return (
                            <ContenutoCard 
                                key={post.id}
                                post={post}
                                nomeProgetto={progettoDelPost?.nome}
                                projectColor={progettoDelPost?.color}
                                onCardClick={onPostClick}
                                onStatusChange={onStatusChange}
                                isDraggable={false}
                                showDate={true}
                            />
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400">Nessun contenuto da creare per questo filtro.</p>
                        <p className="text-lg font-semibold mt-2">Ottimo lavoro! ✨</p>
                    </div>
                )}
            </div>
        </div>
    );
};
