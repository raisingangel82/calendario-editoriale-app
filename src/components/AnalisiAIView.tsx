import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Wand, CheckCircle, AlertTriangle, List, BrainCircuit } from 'lucide-react';
import { StatCard } from './StatCard';
import type { Post } from '../types';
import { PlatformIcon } from './PlatformIcon';

interface AnalisiAIViewProps {
  posts: Post[];
}

interface AIReportData {
  analisiPerformance: string;
  analisiGanci: string;
  consigliAzionabili: string[];
}

interface AIReport {
    [platformName: string]: AIReportData;
}

export const AnalisiAIView: React.FC<AnalisiAIViewProps> = ({ posts }) => {
  const [report, setReport] = useState<AIReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const postsWithPerformance = posts.filter(p => p.performance && p.piattaforma);
      if (postsWithPerformance.length < 3) {
        throw new Error("Dati insufficienti. Sono necessari almeno 3 post con metriche di performance per un'analisi significativa.");
      }
      
      const response = await fetch('/api/generateReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: postsWithPerformance }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto dal server' }));
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      setReport(data as AIReport);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Si è verificato un errore sconosciuto durante la generazione del report.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-6"> 
      <StatCard title="Analisi Strategica con AI" icon={BrainCircuit}>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          L'intelligenza artificiale analizzerà le performance dei tuoi contenuti, piattaforma per piattaforma, per fornirti un report strategico con consigli pratici.
        </p>
        <button
          onClick={handleGenerateReport}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:bg-indigo-400 disabled:cursor-not-allowed"
        >
          <Wand size={20} />
          {isLoading ? 'Analisi in corso...' : 'Avvia Analisi Ora'}
        </button>
      </StatCard>

      {error && (
        <StatCard title="Errore" icon={AlertTriangle}>
            <p className="text-red-500">{error}</p>
        </StatCard>
      )}

      {report && (
        <div className="space-y-8 animate-fade-in">
          {Object.entries(report).map(([platform, data]) => (
            <div key={platform}>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-3">
                    <PlatformIcon platform={platform} className="w-6 h-6" />
                    Analisi per {platform}
                </h2>
                <div className="space-y-6 border-l-2 border-gray-200 dark:border-gray-700 pl-6 ml-3">
                    {data.analisiPerformance && (
                        <StatCard title="Performance dei Contenuti" icon={CheckCircle}>
                          {/* --- MODIFICA: Applico stili di testo diretti --- */}
                          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                            <ReactMarkdown>{data.analisiPerformance}</ReactMarkdown>
                          </div>
                        </StatCard>
                    )}
                    {data.analisiGanci && (
                        <StatCard title="Efficacia dei Ganci" icon={AlertTriangle}>
                          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                            <ReactMarkdown>{data.analisiGanci}</ReactMarkdown>
                          </div>
                        </StatCard>
                    )}
                    {Array.isArray(data.consigliAzionabili) && (
                        <StatCard title="Consigli Pratici" icon={List}>
                          <ul className="space-y-2 list-disc pl-5">
                              {data.consigliAzionabili.map((consiglio, index) => (
                                <li key={index} className="text-sm text-gray-700 dark:text-gray-300">{consiglio}</li>
                              ))}
                          </ul>
                        </StatCard>
                    )}
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};