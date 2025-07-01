import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Post, Progetto } from '../types';
import { ContenutoCard } from './ContenutoCard';

interface FilteredListViewProps {
    posts: Post[];
    progetti: Progetto[];
    filterCategory: string;
    onBack: () => void;
    onPostClick: (post: Post) => void;
    onStatusChange: (postId: string, field: 'statoProdotto' | 'statoPubblicato', value: boolean) => void;
}

export const FilteredListView: React.FC<FilteredListViewProps> = ({ posts, progetti, filterCategory, onBack, onPostClick, onStatusChange }) => {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 gap-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    Da Creare: <span className="text-red-600">{filterCategory}</span>
                </h2>
                <button 
                    onClick={onBack}
                    className="flex items-center justify-center sm:justify-start gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <ArrowLeft size={18} />
                    Torna al Calendario
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.length > 0 ? (
                    posts.map(post => {
                        const progettoDelPost = progetti.find(p => p.id === post.projectId);
                        const cardColor = progettoDelPost?.color;
                        const nomeProgetto = progettoDelPost?.nome;

                        return (
                            <ContenutoCard 
                                key={post.id}
                                post={post}
                                nomeProgetto={nomeProgetto}
                                projectColor={cardColor}
                                onCardClick={onPostClick}
                                onStatusChange={onStatusChange}
                                isDraggable={false}
                                showDate={true} // <-- PROP PER MOSTRARE LA DATA
                            />
                        );
                    })
                ) : (
                    <div className="lg:col-span-3">
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nessun contenuto da creare per questa categoria. Ottimo lavoro!</p>
                    </div>
                )}
            </div>
        </div>
    );
};