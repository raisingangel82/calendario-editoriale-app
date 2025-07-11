//
import React, { useMemo, useState } from 'react';
import { BarChart2 as BarIcon, PieChart, CheckCircle, Clock, Award, Eye, Heart, MessageSquare } from 'lucide-react';
import type { Post, Progetto, Categoria } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { getColor, projectColorPalette } from '../data/colorPalette';
import { ContenutoCard } from './ContenutoCard';
import { PlatformIcon } from './PlatformIcon';
import { AnalisiAIView } from './AnalisiAIView';

interface StatsPageProps {
    posts: Post[];
    progetti: Progetto[];
    activeView: 'produzione' | 'performance' | 'analisiAI';
    onCardClick: (post: Post) => void;
    onStatusChange: (postId: string, field: 'statoProdotto' | 'statoPubblicato', value: boolean) => void;
}

type SortKey = 'views' | 'likes' | 'comments';

const getCategoriaGenerica = (tipoContenuto: string): Categoria => {
    const tipo = (tipoContenuto || "").toLowerCase();
    if (['reel', 'video', 'vlog'].some(term => tipo.includes(term))) return 'Video';
    if (['immagine', 'carousel', 'grafica'].some(term => tipo.includes(term))) return 'Immagine';
    return 'Testo';
};

const FilterPill: React.FC<{ label: string | React.ReactNode; isActive: boolean; onClick: () => void; colorClass?: string; }> = ({ label, isActive, onClick, colorClass }) => {
    const { getActiveColor } = useTheme();
    const activeClasses = colorClass ? `${colorClass} text-white font-bold` : `${getActiveColor('bg')} text-white font-bold`;
    const inactiveClasses = 'bg-white dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600';
    return <button onClick={onClick} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm border border-gray-200 dark:border-gray-700 whitespace-nowrap ${isActive ? activeClasses : inactiveClasses}`}>{label}</button>;
};

const StatCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, children, className }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-fade-in ${className}`}>
        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-3 mb-4"><Icon size={20}/> {title}</h3>
        {children}
    </div>
);

const ProduzioneView: React.FC<{ posts: Post[], progetti: Progetto[] }> = ({ posts, progetti }) => {
    const [activeProjectId, setActiveProjectId] = useState<string>('all');
    const { baseColor, colorShade, getActiveColor } = useTheme();

    const statsGenerali = useMemo(() => {
        const creati = posts.filter(p => p.statoProdotto).length;
        return { creati, daCreare: posts.length - creati };
    }, [posts]);

    const statsProgettoSelezionato = useMemo(() => {
        if (activeProjectId === 'all') return null;
        const progetto = progetti.find(p => p.id === activeProjectId);
        if (!progetto) return null;

        const tuttiIPostDelProgetto = posts.filter(p => p.projectId === activeProjectId);
        
        const perCategoria: Record<Categoria, { prodotti: number, totali: number }> = {
            Testo: { prodotti: 0, totali: 0 },
            Immagine: { prodotti: 0, totali: 0 },
            Video: { prodotti: 0, totali: 0 },
        };

        tuttiIPostDelProgetto.forEach(p => {
            const categoria = getCategoriaGenerica(p.tipoContenuto);
            if (perCategoria[categoria]) {
                perCategoria[categoria].totali++;
                if (p.statoProdotto) {
                    perCategoria[categoria].prodotti++;
                }
            }
        });

        return { nome: progetto.nome, perCategoria, color: progetto.color };
    }, [activeProjectId, posts, progetti]);

    const statsTuttiIProgetti = useMemo(() => {
        const perCategoria: Record<Categoria, { prodotti: number, totali: number }> = {
            Testo: { prodotti: 0, totali: 0 },
            Immagine: { prodotti: 0, totali: 0 },
            Video: { prodotti: 0, totali: 0 },
        };

        posts.forEach(p => {
            const categoria = getCategoriaGenerica(p.tipoContenuto);
            if (perCategoria[categoria]) {
                perCategoria[categoria].totali++;
                if (p.statoProdotto) {
                    perCategoria[categoria].prodotti++;
                }
            }
        });
        
        return { perCategoria }; 
    }, [posts]);

    const statsDaVisualizzare = activeProjectId === 'all' 
        ? statsTuttiIProgetti 
        : statsProgettoSelezionato;

    const titoloCardAnalisi = activeProjectId === 'all'
        ? "Analisi Complessiva"
        : "Analisi per Progetto";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatCard title="Riepilogo Generale" icon={PieChart}>
                <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Contenuti Creati</span><span className="text-xl font-bold text-gray-900 dark:text-gray-100">{statsGenerali.creati}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2"><Clock size={16} className="text-amber-500"/> Da Creare</span><span className="text-xl font-bold text-gray-900 dark:text-gray-100">{statsGenerali.daCreare}</span></div>
                </div>
            </StatCard>
            <StatCard title={titoloCardAnalisi} icon={BarIcon}>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {activeProjectId === 'all'
                        ? "Visualizza l'avanzamento totale o seleziona un progetto."
                        : "Seleziona un progetto per visualizzare i dettagli della produzione."
                    }
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <FilterPill label="Nessun filtro" isActive={activeProjectId === 'all'} onClick={() => setActiveProjectId('all')} />
                    {progetti.map(proj => {
                        const colorInfo = projectColorPalette.find(p => p.base === proj.color);
                        const bgColor = colorInfo?.shades['700'].bgClass || 'bg-gray-500';
                        return <FilterPill key={proj.id} label={proj.nome} isActive={activeProjectId === proj.id} onClick={() => setActiveProjectId(proj.id)} colorClass={bgColor} />
                    })}
                </div>
                
                {statsDaVisualizzare ? (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <div className="space-y-3">
                            {(['Testo', 'Immagine', 'Video'] as Categoria[]).map(cat => {
                                const statsCategoria = statsDaVisualizzare.perCategoria[cat];
                                if (statsCategoria.totali === 0) return null;

                                const percentage = statsCategoria.totali > 0 ? (statsCategoria.prodotti / statsCategoria.totali) * 100 : 0;
                                
                                const barColor = activeProjectId !== 'all' && statsProgettoSelezionato?.color
                                    ? getColor(statsProgettoSelezionato.color, colorShade).bgClass
                                    : getActiveColor('bg');

                                return (
                                    <div key={cat}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{cat}</span>
                                            <span className="text-gray-500 dark:text-gray-400">{statsCategoria.prodotti} / {statsCategoria.totali}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                            <div className={`h-2.5 rounded-full ${barColor}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    activeProjectId !== 'all' && <p className="text-sm text-center text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">Caricamento dati progetto...</p>
                )}
            </StatCard>
        </div>
    );
};

const PerformanceView: React.FC<{ posts: Post[], progetti: Progetto[], onCardClick: (post:Post) => void, onStatusChange: (id: string, field: 'statoProdotto' | 'statoPubblicato', value: boolean) => void }> = ({ posts, progetti, onCardClick, onStatusChange }) => {
    const [sortBy, setSortBy] = useState<SortKey>('views');
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

    const availablePlatforms = useMemo(() => {
        const platformsWithPerformance = posts
            .filter(p => p.performance) 
            .map(p => p.piattaforma); 
        return [...new Set(platformsWithPerformance.filter(Boolean))];
    }, [posts]);

    const postsConPerformance = useMemo(() => {
        const platformFiltered = selectedPlatform 
            ? posts.filter(p => p.piattaforma === selectedPlatform)
            : posts;

        return platformFiltered
            .filter(p => p.performance)
            .sort((a, b) => (b.performance?.[sortBy] || 0) - (a.performance?.[sortBy] || 0));
            
    }, [posts, sortBy, selectedPlatform]);

    const sortOptions: { key: SortKey; label: string; icon: React.ElementType }[] = [
        { key: 'views', label: 'Visualizzazioni', icon: Eye },
        { key: 'likes', label: 'Mi Piace', icon: Heart },
        { key: 'comments', label: 'Commenti', icon: MessageSquare },
    ];

    return (
        <div className="space-y-6">
            <StatCard title="Classifica Performance" icon={Award}>
                {posts.some(p => p.performance) ? (
                    <div className="space-y-4">
                        <div className="flex items-center flex-wrap gap-2">
                            <span className="text-sm font-semibold text-gray-500">Piattaforma:</span>
                            <FilterPill label="Tutte" isActive={selectedPlatform === null} onClick={() => setSelectedPlatform(null)} />
                            {availablePlatforms.map(platform => (
                                <FilterPill 
                                    key={platform}
                                    label={<PlatformIcon platform={platform} className="w-5 h-5"/>} 
                                    isActive={selectedPlatform === platform} 
                                    onClick={() => setSelectedPlatform(platform)}
                                />
                            ))}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 border-y border-gray-200 dark:border-gray-700 py-3 my-3">
                            <span className="w-full sm:w-auto text-sm font-semibold text-gray-500 mb-2 sm:mb-0 sm:mr-2">Ordina per:</span>
                            {sortOptions.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setSortBy(opt.key)}
                                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${sortBy === opt.key ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                >
                                    <opt.icon size={14} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex flex-col gap-4">
                           {postsConPerformance.slice(0, 10).map((post, index) => {
                                const progettoDelPost = progetti.find(p => p.id === post.projectId);
                                return (
                                    // --- MODIFICA: Da 'flex' a 'grid' per un allineamento più robusto ---
                                    <div key={post.id} className="grid grid-cols-[auto_1fr] items-center gap-4 animate-fade-in">
                                        <span className="text-xl font-bold text-gray-400 dark:text-gray-500 w-10 text-center">{index + 1}</span>
                                        <div>
                                            <ContenutoCard
                                                post={post}
                                                nomeProgetto={progettoDelPost?.nome}
                                                projectColor={progettoDelPost?.color}
                                                onCardClick={onCardClick}
                                                onStatusChange={onStatusChange}
                                                isDraggable={false}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                        Nessun dato di performance trovato. <br />
                        Vai su Impostazioni per importare un file .csv e iniziare.
                    </p>
                )}
            </StatCard>
        </div>
    );
};


export const Stats: React.FC<StatsPageProps> = ({ posts, progetti, activeView, onCardClick, onStatusChange }) => {
    
    const getPageTitle = () => {
        switch(activeView) {
            case 'produzione': return 'Statistiche di Produzione';
            case 'performance': return 'Statistiche di Performance';
            case 'analisiAI': return 'Analisi Strategica AI';
            default: return 'Statistiche';
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {getPageTitle()}
                </h1>
            </div>
            
            <div className="flex-grow overflow-y-auto">
                <div className="p-4 sm:p-6">
                    {activeView === 'produzione' && <ProduzioneView posts={posts} progetti={progetti} />}
                    {activeView === 'performance' && (
                        <PerformanceView 
                            posts={posts}
                            progetti={progetti}
                            onCardClick={onCardClick}
                            onStatusChange={onStatusChange}
                        />
                    )}
                    {activeView === 'analisiAI' && <AnalisiAIView posts={posts} />}
                </div>
            </div>
        </div>
    );
};