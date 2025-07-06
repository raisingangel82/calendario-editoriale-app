import React, { useMemo } from 'react';
// Rimosse le importazioni di Swiper
// import { Swiper, SwiperSlide } from 'swiper/react';
// import { Pagination } from 'swiper/modules';
// import 'swiper/css';
// import 'swiper/css/pagination';

import { CheckCircle, Clock, BookOpen, BarChart2 as BarIcon } from 'lucide-react';
import type { Post, Progetto, Categoria } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { getColor } from '../data/colorPalette';

const getCategoriaGenerica = (tipoContenuto: string): Categoria => {
    const tipo = (tipoContenuto || "").toLowerCase();
    if (tipo.includes('testo')) return 'Testo';
    if (['reel', 'video'].some(term => tipo.includes(term))) return 'Video';
    if (['immagine', 'carousel'].some(term => tipo.includes(term))) return 'Immagine';
    return 'Testo';
};

export const Stats: React.FC<{ posts: Post[], progetti: Progetto[] }> = ({ posts, progetti }) => {
    const { colorShade, baseColor } = useTheme();
    const isDesktop = useBreakpoint();

    const stats = useMemo(() => {
        const totaliPerCategoria: Record<Categoria, number> = { Video: 0, Immagine: 0, Testo: 0 };
        const creatiPerCategoria: Record<Categoria, number> = { Video: 0, Immagine: 0, Testo: 0 };
        const totaliPerProgetto: Record<string, { totali: number; creati: number }> = {};
        
        progetti.forEach(p => { totaliPerProgetto[p.id] = { totali: 0, creati: 0 }; });

        posts.forEach(post => {
            if (post.projectId && totaliPerProgetto[post.projectId]) {
                totaliPerProgetto[post.projectId].totali++;
                if (post.statoProdotto) totaliPerProgetto[post.projectId].creati++;
            }
            const categoria = getCategoriaGenerica(post.tipoContenuto);
            if (totaliPerCategoria.hasOwnProperty(categoria)) {
                totaliPerCategoria[categoria]++;
                if (post.statoProdotto) creatiPerCategoria[categoria]++;
            }
        });
        const totalProdotti = posts.filter(p => p.statoProdotto).length;
        return { totaliPerCategoria, creatiPerCategoria, totaliPerProgetto, totaliCreati: totalProdotti, totalPost: posts.length };
    }, [posts, progetti]);

    const activeColor = getColor(baseColor, colorShade).bgClass;

    const ProduzioneProgetto = () => (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4"><BookOpen size={18}/> Produzione per Progetto</h3>
            <div className="space-y-3">{progetti.map(proj => { const data = stats.totaliPerProgetto[proj.id] || { totali: 0, creati: 0 }; const p = data.totali > 0 ? (data.creati / data.totali) * 100 : 0; const barColor = getColor(proj.color, colorShade).bgClass; return ( <div key={proj.id}><div className="flex justify-between text-sm mb-1"><span className="font-semibold text-gray-700 dark:text-gray-300">{proj.nome}</span><span className="text-gray-500 dark:text-gray-400">{data.creati}/{data.totali}</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className={`h-2 rounded-full ${barColor}`} style={{ width: `${p}%` }}></div></div></div> ); })}</div>
        </div>
    );
    const ProduzioneCategoria = () => (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
             <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4"><BarIcon size={18}/> Produzione per Categoria</h3>
             <div className="space-y-3">{(['Testo', 'Immagine', 'Video'] as Categoria[]).map(cat => { const tot = stats.totaliPerCategoria[cat]; const cre = stats.creatiPerCategoria[cat]; const p = tot > 0 ? (cre / tot) * 100 : 0; return ( <div key={cat}><div className="flex justify-between text-sm mb-1"><span className="font-semibold text-gray-700 dark:text-gray-300">{cat}</span><span className="text-gray-500 dark:text-gray-400">{cre}/{tot}</span></div><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"><div className={`h-2 rounded-full ${activeColor}`} style={{ width: `${p}%` }}></div></div></div> ); })}</div>
        </div>
    );
    const Riepilogo = () => (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Riepilogo Generale</h3>
            <div className="space-y-4"><div className="flex justify-between items-center text-lg"><span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"><CheckCircle size={18} className="text-green-500" /> Creati</span><span className="font-bold text-gray-900 dark:text-gray-100">{stats.totaliCreati}</span></div><div className="flex justify-between items-center text-lg"><span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Clock size={18} className="text-amber-500"/> Da Creare</span><span className="font-bold text-gray-900 dark:text-gray-100">{stats.totalPost - stats.totaliCreati}</span></div><div className="flex justify-between items-center text-lg pt-4 border-t border-gray-200 dark:border-gray-700"><span className="font-semibold text-gray-700 dark:text-gray-300">Totale Post</span><span className="font-bold text-gray-900 dark:text-gray-100">{stats.totalPost}</span></div></div>
        </div>
    );

    if (isDesktop) {
        return (
            <div className="p-4 sm:p-6"><h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Statistiche</h1><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><ProduzioneProgetto /><ProduzioneCategoria /><Riepilogo /></div></div>
        );
    }
    
    // ▼▼▼ MODIFICA: Layout mobile riscritto senza Swiper ▼▼▼
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Statistiche</h1>
            <div className="space-y-4">
                <ProduzioneProgetto />
                <ProduzioneCategoria />
                <Riepilogo />
            </div>
        </div>
    );
};
