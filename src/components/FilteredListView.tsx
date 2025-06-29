import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';
import type { Post } from '../types';

interface FilteredListViewProps {
    posts: Post[];
    filterCategory: string;
    onBack: () => void;
    onPostClick: (post: Post) => void;
}

export const FilteredListView: React.FC<FilteredListViewProps> = ({ posts, filterCategory, onBack, onPostClick }) => {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg max-w-4xl mx-auto">
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
            <ul className="space-y-3">
                {posts.length > 0 ? (
                    posts.map(post => (
                        <li key={post.id}>
                            <button 
                                onClick={() => onPostClick(post)} 
                                className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div className='min-w-0 pr-4'>
                                        <p className="font-bold text-gray-800 dark:text-gray-200 truncate" title={post.libro}>{post.libro}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 my-1 truncate" title={post.tipoContenuto}>{post.tipoContenuto}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500">{post.descrizione}</p>
                                    </div>
                                    {post.data && (
                                        <p className="text-xs font-semibold text-red-500 mt-1 flex-shrink-0">
                                            {format(post.data.toDate(), 'dd MMM yy', { locale: it })}
                                        </p>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nessun contenuto da creare per questa categoria. Ottimo lavoro!</p>
                )}
            </ul>
        </div>
    );
};