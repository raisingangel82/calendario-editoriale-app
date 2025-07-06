import React, { useState, useMemo } from 'react';
import type { Post, Progetto, Categoria } from '../types';
import { ContenutoCard } from './ContenutoCard';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';

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
}> = ({ label, isActive, onClick }) => {
    const { getActiveColor } = useTheme();
    const activeClasses = `${getActiveColor('bg')} text-white font-bold`;
    const inactiveClasses = 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600';
    
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm border dark:border-transparent ${isActive ? activeClasses : inactiveClasses}`}
        >
            {label}
        </button>
    );
};

export const FilteredListView: React.FC<FilteredListViewProps> = ({ posts, progetti, onPostClick, onStatusChange }) => {
    const [filter, setFilter] = useState<Categoria | 'all'>('all');

    const filteredAndSortedPosts = useMemo(() => {
        return posts
            .filter(post => !post.statoProdotto && (filter === 'all' || getCategoriaGenerica(post.tipoContenuto) === filter))
            .slice()
            .sort((a, b) => {
                const timeA = normalizeDateToMillis(a.data);
                const timeB = normalizeDateToMillis(b.data);
                if (timeA === 0 && timeB === 0) return 0;
                if (timeA === 0) return 1;
                if (timeB === 0) return -1;
                return timeA - timeB;
            });
    }, [posts, filter]);

    const filterOptions: (Categoria | 'all')[] = ['all', 'Testo', 'Immagine', 'Video'];

    return (
        <div className="p-4 sm:p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                    Contenuti da Creare
                </h1>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 custom-scrollbar">
                    {filterOptions.map(option => (
                        <FilterPill 
                            key={option}
                            label={option === 'all' ? 'Tutti' : option}
                            isActive={filter === option}
                            onClick={() => setFilter(option)}
                        />
                    ))}
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
                        <p className="text-gray-500 dark:text-gray-400">Nessun contenuto da creare per questa categoria.</p>
                        <p className="text-lg font-semibold mt-2">Ottimo lavoro! ✨</p>
                    </div>
                )}
            </div>
        </div>
    );
};
