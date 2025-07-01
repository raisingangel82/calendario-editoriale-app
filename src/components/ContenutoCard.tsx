import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Post } from '../types';
import { PlatformIcon } from './PlatformIcon';
import { GripVertical, Clock, CheckCircle } from 'lucide-react';
// ▼▼▼ IMPORTIAMO SIA 'useTheme' SIA LA NOSTRA NUOVA FUNZIONE 'getColor' ▼▼▼
import { useTheme } from '../contexts/ThemeContext';
import { getColor } from '../data/colorPalette';

interface ContenutoCardProps {
    post: Post;
    nomeProgetto?: string;
    projectColor?: string; // Ora questo sarà il colore base, es. "blue"
    showDate?: boolean;
    onCardClick: (post: Post) => void;
    onStatusChange: (postId: string, field: 'statoProdotto' | 'statoPubblicato', value: boolean) => void;
    isDraggable: boolean;
}

export const ContenutoCard: React.FC<ContenutoCardProps> = ({ post, nomeProgetto, projectColor, showDate, onCardClick, onStatusChange, isDraggable }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: post.id, disabled: !isDraggable });
    
    // ▼▼▼ 1. OTTENIAMO LA TONALITÀ GLOBALE DAL CONTESTO ▼▼▼
    const { colorShade } = useTheme();

    const style = { transform: CSS.Translate.toString(transform) };
    
    // ▼▼▼ 2. USIAMO LA FUNZIONE HELPER PER OTTENERE IL COLORE FINALE ▼▼▼
    // Combina il colore base del progetto (es. 'blue') con la tonalità scelta (es. '700')
    const finalColor = getColor(projectColor || 'stone', colorShade); 

    const borderStyle = {
        borderLeft: `5px solid ${finalColor.hex}` // Usiamo il codice esadecimale
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
            className="flex w-full items-stretch bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group"
        >
            <div 
                {...attributes} 
                {...listeners} 
                className={`flex flex-col items-center justify-between p-2 space-y-1 bg-gray-100 dark:bg-gray-900/40 rounded-l-none ${isDraggable ? 'cursor-grab' : ''} group-hover:bg-gray-200 dark:group-hover:bg-gray-700/80 transition-colors`}
            >
                <div onClick={() => onCardClick(post)} className="cursor-pointer pt-1">
                    <PlatformIcon platform={post.piattaforma} className="w-6 h-6 text-gray-700 dark:text-gray-300"/>
                </div>
                <GripVertical size={16} className="text-gray-400 dark:text-gray-500" />
                <div className="flex flex-col gap-1.5 pb-1">
                    <button onClick={(e) => handleStatusClick(e, 'statoProdotto', post.statoProdotto)} title="Prodotto" className={`transition-colors hover:text-amber-500 ${prodottoClass}`}>
                        <Clock size={14} />
                    </button>
                    <button onClick={(e) => handleStatusClick(e, 'statoPubblicato', post.statoPubblicato)} title="Pubblicato" className={`transition-colors hover:text-green-500 ${pubblicatoClass}`}>
                        <CheckCircle size={14} />
                    </button>
                </div>
            </div>
            <div className="flex-grow p-3 flex flex-col justify-between min-w-0" onClick={() => onCardClick(post)}>
                <div>
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100 break-words">{nomeProgetto || 'Progetto non assegnato'}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{post.tipoContenuto}</p>
                </div>
                {showDate && post.data && (
                    <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-red-500">
                           Scadenza: {format(post.data.toDate(), 'dd MMM yy', { locale: it })}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};