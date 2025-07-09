import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Post } from '../types';
import { PlatformIcon } from './PlatformIcon';
import { GripVertical, Clock, CheckCircle, Eye, Heart, MessageSquare } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getColor } from '../data/colorPalette';

interface ContenutoCardProps {
    post: Post;
    nomeProgetto?: string;
    projectColor?: string;
    showDate?: boolean;
    isMobileView?: boolean;  
    onCardClick: (post: Post) => void;
    onStatusChange: (postId: string, field: 'statoProdotto' | 'statoPubblicato', value: boolean) => void;
    isDraggable: boolean;
}

export const ContenutoCard: React.FC<ContenutoCardProps> = ({ post, nomeProgetto, projectColor, showDate, onCardClick, onStatusChange, isDraggable }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: post.id, disabled: !isDraggable });
    
    const { colorShade } = useTheme();
    const style = { transform: CSS.Translate.toString(transform) };
    const finalColor = getColor(projectColor || 'stone', colorShade);  
    const borderStyle = { 
        borderLeft: `5px solid ${finalColor.hex}`,
        borderRight: `5px solid ${finalColor.hex}` 
    };

    const handleStatusClick = (e: React.MouseEvent, field: 'statoProdotto' | 'statoPubblicato', currentValue: boolean) => {
        e.stopPropagation();
        onStatusChange(post.id, field, !currentValue);
    };

    const prodottoClass = post.statoProdotto ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600';
    const pubblicatoClass = post.statoPubblicato ? 'text-green-500' : 'text-gray-300 dark:text-gray-600';

    return (
        <div 
            ref={setNodeRef} 
            style={{ ...style, ...borderStyle }}
            className="flex w-full h-24 items-stretch bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group"
        >
            {/* COLONNA SINISTRA: Maniglia e Azioni */}
            <div 
                {...attributes} 
                {...listeners} 
                className={`flex flex-col items-center justify-between p-2 space-y-1 bg-gray-100 dark:bg-gray-900/40 rounded-l-lg rounded-r-none ${isDraggable ? 'cursor-grab' : ''} group-hover:bg-gray-200 dark:group-hover:bg-gray-700/80 transition-colors`}
            >
                <div onClick={() => onCardClick(post)} className="cursor-pointer">
                    <PlatformIcon platform={post.piattaforma} className="w-5 h-5 text-gray-700 dark:text-gray-300"/>
                </div>
                <GripVertical size={16} className="text-gray-400 dark:text-gray-500" />
                <div className="flex flex-col gap-1">
                    <button onClick={(e) => handleStatusClick(e, 'statoProdotto', post.statoProdotto)} title="Prodotto" className={`transition-colors hover:text-amber-500 ${prodottoClass}`}>
                        <Clock size={14} />
                    </button>
                    <button onClick={(e) => handleStatusClick(e, 'statoPubblicato', post.statoPubblicato)} title="Pubblicato" className={`transition-colors hover:text-green-500 ${pubblicatoClass}`}>
                        <CheckCircle size={14} />
                    </button>
                </div>
            </div>

            {/* COLONNA CENTRALE: Contenuto Principale */}
            <div className="flex-grow p-2 flex flex-col min-w-0" onClick={() => onCardClick(post)}>
                {/* [MODIFICA] Riga superiore con titolo a sx e data a dx */}
                <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100 break-words truncate">
                        {nomeProgetto || 'Progetto non assegnato'}
                    </p>
                    {showDate && post.data && (
                        <p className="text-xs font-semibold text-red-500 flex-shrink-0">
                           {format(post.data.toDate(), 'dd MMM yy', { locale: it })}
                        </p>
                    )}
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{post.tipoContenuto}</p>
                
                {post.descrizione && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-words overflow-hidden line-clamp-2">
                       {post.descrizione}
                    </p>
                )}
            </div>

            {/* COLONNA DESTRA: Barra delle Metriche */}
            <div className="flex flex-col items-center justify-around w-14 p-2 bg-gray-100 dark:bg-gray-900/40 rounded-r-lg rounded-l-none group-hover:bg-gray-200 dark:group-hover:bg-gray-700/80 transition-colors text-xs text-gray-500 dark:text-gray-400">
                {post.performance && (
                    <>
                        {post.performance.views > 0 && (
                            <div className="flex flex-col items-center">
                                <Eye size={14} />
                                <span className="text-[10px]">{post.performance.views}</span>
                            </div>
                        )}
                        {post.performance.likes > 0 && (
                            <div className="flex flex-col items-center">
                                <Heart size={14} />
                                <span className="text-[10px]">{post.performance.likes}</span>
                            </div>
                        )}
                        {post.performance.comments > 0 && (
                            <div className="flex flex-col items-center">
                                <MessageSquare size={14} />
                                <span className="text-[10px]">{post.performance.comments}</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};