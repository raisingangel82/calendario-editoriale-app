import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { CheckCircle2, Circle, GripVertical, Clock } from 'lucide-react';

interface Post { 
  id: string; 
  libro: string; 
  piattaforma: string; 
  tipoContenuto: string; 
  statoProdotto: boolean; 
  statoPubblicato: boolean; 
  data?: { toDate: () => Date };
  [key: string]: any; 
}

interface ContenutoCardProps { 
  post: Post; 
  onCardClick: (post: Post) => void; 
}

export const ContenutoCard: React.FC<ContenutoCardProps> = ({ post, onCardClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
    id: post.id, 
    data: { postObject: post } 
  });

  const style = { 
    transform: CSS.Translate.toString(transform), 
    opacity: isDragging ? 0.5 : 1, 
    zIndex: isDragging ? 100 : 10, 
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-stretch shadow-sm h-full">
        {/* Maniglia per il Drag-and-Drop (solo su desktop) */}
        <div 
          {...listeners} 
          {...attributes} 
          className="hidden md:flex p-1 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-600 self-stretch items-center bg-gray-50 dark:bg-gray-800/80 rounded-l-lg border-r border-gray-200 dark:border-gray-700"
        >
          <GripVertical size={18} />
        </div>
        
        {/* Contenuto principale della card, ora con layout verticale forzato */}
        <div onClick={() => onCardClick(post)} className="flex-grow p-2.5 cursor-pointer min-w-0 flex flex-col justify-between">
          
          {/* Sezione Superiore: Piattaforma e Status */}
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-red-600 dark:text-red-500 uppercase tracking-wider truncate">{post.piattaforma}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div title="Prodotto">{post.statoProdotto ? <CheckCircle2 size={15} className="text-yellow-500" /> : <Circle size={15} className="text-gray-300 dark:text-gray-600" />}</div>
                <div title="Pubblicato">{post.statoPubblicato ? <CheckCircle2 size={15} className="text-green-600" /> : <Circle size={15} className="text-gray-300 dark:text-gray-600" />}</div>
              </div>
            </div>
            
            {/* Sezione Testo: ora con 'truncate' per evitare overflow */}
            <div className="space-y-1">
              <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate" title={post.libro}>{post.libro}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={post.tipoContenuto}>{post.tipoContenuto}</p>
            </div>
          </div>

          {/* Sezione Orario (solo per mobile) */}
          {post.data && (
            <div className="md:hidden flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 mt-2">
              <Clock size={12} />
              <span>{format(post.data.toDate(), 'HH:mm')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};