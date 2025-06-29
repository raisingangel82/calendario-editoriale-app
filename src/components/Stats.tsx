import React, { useMemo } from 'react';
import { BarChart2, CheckCircle, Clock, BookOpen } from 'lucide-react';

type Categoria = 'Video' | 'Immagine' | 'Testo';
interface Progetto { id: string; nome: string; }
interface Post { id: string; libro: string; tipoContenuto: string; statoProdotto: boolean; }

interface StatsProps {
    posts: Post[];
    progetti: Progetto[];
    onFilterClick: (categoria: Categoria) => void;
}

const getCategoriaGenerica = (tipoContenuto: string): Categoria => {
    const tipoLower = tipoContenuto.toLowerCase();
    if (['reel', 'video', 'booktrailer', 'vlog', 'montaggio', 'documentario'].some(term => tipoLower.includes(term))) {
        return 'Video';
    }
    if (['immagine', 'post statico', 'carousel'].some(term => tipoLower.includes(term))) {
        return 'Immagine';
    }
    return 'Testo';
};

export const Stats: React.FC<StatsProps> = ({ posts, progetti, onFilterClick }) => {
    const stats = useMemo(() => {
        const totaliPerCategoria: Record<string, number> = { Video: 0, Immagine: 0, Testo: 0 };
        const creatiPerCategoria: Record<string, number> = { Video: 0, Immagine: 0, Testo: 0 };
        
        const totaliPerProgetto: Record<string, number> = {};
        const creatiPerProgetto: Record<string, number> = {};
        
        progetti.forEach(p => {
            totaliPerProgetto[p.nome] = 0;
            creatiPerProgetto[p.nome] = 0;
        });

        posts.forEach(post => {
            const categoria = getCategoriaGenerica(post.tipoContenuto);
            if (totaliPerCategoria.hasOwnProperty(categoria)) {
                totaliPerCategoria[categoria]++;
                if (post.statoProdotto) creatiPerCategoria[categoria]++;
            }
            if (totaliPerProgetto.hasOwnProperty(post.libro)) {
                totaliPerProgetto[post.libro]++;
                if (post.statoProdotto) creatiPerProgetto[post.libro]++;
            }
        });

        const totalProdotti = posts.filter(p => p.statoProdotto).length;
        return { totaliPerCategoria, creatiPerCategoria, totaliProgetto: totaliPerProgetto, creatiProgetto: creatiPerProgetto, totaliCreati: totalProdotti };
    }, [posts, progetti]);

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg h-full">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><BookOpen size={16} /> Produzione per Progetto</h3>
                    <div className="space-y-2">
                        {/* MODIFICA: Rimuoviamo il controllo > 0 per mostrare tutti i progetti */}
                        {progetti.map(proj => (
                            <div key={proj.id} className="text-xs">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-gray-600 dark:text-gray-400 truncate pr-2">{proj.nome}</span>
                                    <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">{stats.creatiProgetto[proj.nome] || 0}/{stats.totaliProgetto[proj.nome] || 0}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${((stats.creatiProgetto[proj.nome] || 0) / (stats.totaliProgetto[proj.nome] || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="xl:border-l xl:pl-6 border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><BarChart2 size={16} /> Produzione per Categoria</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {(['Video', 'Immagine', 'Testo'] as const).map(cat => (
                            <div key={cat} className="text-xs">
                                <button onClick={() => onFilterClick(cat)} className="w-full text-left group">
                                    <div className="flex justify-between items-center mb-1"><span className="font-bold text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">{cat}</span><span className="text-gray-500 dark:text-gray-500">{stats.creatiPerCategoria[cat]}/{stats.totaliPerCategoria[cat]}</span></div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(stats.creatiPerCategoria[cat] / (stats.totaliPerCategoria[cat] || 1)) * 100}%` }}></div></div>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Riepilogo Totale</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm"><span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><CheckCircle size={14} className="text-green-600" /> Creati</span><span className="font-bold text-lg text-gray-800 dark:text-gray-100">{stats.totaliCreati}</span></div>
                            <div className="flex justify-between items-center text-sm"><span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Clock size={14} className="text-yellow-500"/> Da Creare</span><span className="font-bold text-lg text-gray-800 dark:text-gray-100">{posts.length - stats.totaliCreati}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};