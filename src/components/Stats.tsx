import React, { useState, useMemo } from 'react';
import { BarChart2, CheckCircle, Clock, BookOpen } from 'lucide-react';
import type { Post, Progetto, Categoria } from '../types';
// ▼▼▼ IMPORTIAMO I NOSTRI NUOVI HELPER ▼▼▼
import { useTheme } from '../contexts/ThemeContext';
import { getColor } from '../data/colorPalette';

interface StatsProps {
    posts: Post[];
    progetti: Progetto[];
    onFilterClick: (categoria: Categoria) => void;
}

const getCategoriaGenerica = (tipoContenuto: string): Categoria => {
    const tipo = tipoContenuto || "";
    switch (tipo) {
        case 'Immagine/Carosello':
            return 'Immagine';
        case 'Reel':
        case 'Booktrailer':
        case 'Podcast':
        case 'Vlog':
            return 'Video';
        default:
            return 'Testo';
    }
};

export const Stats: React.FC<StatsProps> = ({ posts, progetti, onFilterClick }) => {
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    // ▼▼▼ 1. OTTENIAMO LA TONALITÀ GLOBALE DAL CONTESTO ▼▼▼
    const { colorShade } = useTheme();

    const stats = useMemo(() => {
        const filteredPosts = selectedProjectId === 'all' ? posts : posts.filter(p => p.projectId === selectedProjectId);
        const totaliPerCategoria: Record<Categoria, number> = { Video: 0, Immagine: 0, Testo: 0 };
        const creatiPerCategoria: Record<Categoria, number> = { Video: 0, Immagine: 0, Testo: 0 };
        const totaliPerProgetto: Record<string, number> = {};
        const creatiPerProgetto: Record<string, number> = {};
        
        progetti.forEach(p => {
            totaliPerProgetto[p.id] = 0;
            creatiPerProgetto[p.id] = 0;
        });
        
        posts.forEach(post => {
            if (post.projectId && totaliPerProgetto.hasOwnProperty(post.projectId)) {
                totaliPerProgetto[post.projectId]++;
                if (post.statoProdotto) creatiPerProgetto[post.projectId]++;
            }
        });

        filteredPosts.forEach(post => {
            const categoria = getCategoriaGenerica(post.tipoContenuto);
            if (totaliPerCategoria.hasOwnProperty(categoria)) {
                totaliPerCategoria[categoria]++;
                if (post.statoProdotto) creatiPerCategoria[categoria]++;
            }
        });

        const totalProdotti = filteredPosts.filter(p => p.statoProdotto).length;
        const totalPostFiltrati = filteredPosts.length;

        return { totaliPerCategoria, creatiPerCategoria, totaliProgetto: totaliPerProgetto, creatiProgetto: creatiPerProgetto, totaliCreati: totalProdotti, totalPostFiltrati };
    }, [posts, progetti, selectedProjectId]);

    const totalDaCreare = stats.totalPostFiltrati - stats.totaliCreati;

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg h-full">
            <div className="mb-4">
                <label htmlFor="project-filter" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Filtra Statistiche</label>
                <select id="project-filter" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none">
                    <option value="all">Tutti i Progetti</option>
                    {progetti.map(proj => (<option key={proj.id} value={proj.id}>{proj.nome}</option>))}
                </select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="lg:col-span-1">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><BookOpen size={16} /> Produzione per Progetto</h3>
                    <div className="space-y-2">
                        {progetti.map(proj => {
                            const creati = stats.creatiProgetto[proj.id] || 0;
                            const totali = stats.totaliProgetto[proj.id] || 0;
                            const percentuale = totali > 0 ? (creati / totali) * 100 : 0;
                            // ▼▼▼ 2. OTTENIAMO IL COLORE DINAMICO PER OGNI PROGETTO ▼▼▼
                            const projectBarColor = getColor(proj.color || 'stone', colorShade);

                            return (
                                <div key={proj.id} className="text-xs">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-gray-600 dark:text-gray-400 truncate pr-2" title={proj.nome}>{proj.nome}</span>
                                        <span className="text-gray-500 dark:text-gray-500 flex-shrink-0">{creati}/{totali}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                        <div className={`${projectBarColor.bgClass} h-1.5 rounded-full`} style={{ width: `${percentuale}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="lg:col-span-2 lg:border-l lg:pl-6 border-gray-200 dark:border-gray-700 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><BarChart2 size={16} /> Produzione per Categoria</h3>
                            <div className="space-y-3">
                                {(['Testo', 'Immagine', 'Video'] as const).map(cat => {
                                    const creati = stats.creatiPerCategoria[cat];
                                    const totali = stats.totaliPerCategoria[cat];
                                    const percentuale = totali > 0 ? (creati / totali) * 100 : 0;
                                    // ▼▼▼ 3. USIAMO UN COLORE FISSO (ROSSO) MA CON TONALITÀ DINAMICA ▼▼▼
                                    const categoryBarColor = getColor('red', colorShade);
                                    return (
                                        <div key={cat} className="text-xs">
                                            <button onClick={() => onFilterClick(cat)} className="w-full text-left group" disabled={totali === 0}>
                                                <div className="flex justify-between items-center mb-1"><span className="font-bold text-gray-600 dark:text-gray-400 group-hover:underline transition-colors">{cat}</span><span className="text-gray-500 dark:text-gray-500">{creati}/{totali}</span></div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"><div className={`${categoryBarColor.bgClass} h-1.5 rounded-full`} style={{ width: `${percentuale}%` }}></div></div>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                             <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Riepilogo Totale</h3>
                             <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm"><span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> Creati</span><span className="font-bold text-lg text-gray-800 dark:text-gray-100">{stats.totaliCreati}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Clock size={14} className="text-amber-500"/> Da Creare</span><span className="font-bold text-lg text-gray-800 dark:text-gray-100">{totalDaCreare}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};