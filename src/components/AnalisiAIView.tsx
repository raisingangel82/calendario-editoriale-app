import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Wand, CheckCircle, AlertTriangle, List, BrainCircuit } from 'lucide-react';
import { StatCard } from './StatCard';
import type { Post } from '../types';

interface AnalisiAIViewProps {
  posts: Post[];
}

interface AIReport {
  analisiPerformance: string;
  analisiGanci: string;
  consigliAzionabili: string[];
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
      const postsWithPerformance = posts.filter(p => p.performance);
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
    <div className="space-y-6">
      <StatCard title="Analisi Strategica con AI" icon={BrainCircuit}>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          L'intelligenza artificiale analizzerà le performance dei tuoi contenuti per fornirti un report strategico con consigli pratici per ottimizzare il tuo piano editoriale.
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
        <div className="space-y-6 animate-fade-in">
          <StatCard title="Analisi Performance" icon={CheckCircle}>
            <ReactMarkdown className="prose dark:prose-invert max-w-none">{report.analisiPerformance}</ReactMarkdown>
          </StatCard>
          <StatCard title="Analisi dei Ganci" icon={AlertTriangle}>
            <ReactMarkdown className="prose dark:prose-invert max-w-none">{report.analisiGanci}</ReactMarkdown>
          </StatCard>
          <StatCard title="Consigli Pratici" icon={List}>
            <ul className="space-y-2 list-disc pl-5">
              {/* --- MODIFICA CHIAVE: Controllo di sicurezza prima di usare .map --- */}
              {Array.isArray(report.consigliAzionabili) && report.consigliAzionabili.map((consiglio, index) => (
                <li key={index} className="text-gray-700 dark:text-gray-300">{consiglio}</li>
              ))}
            </ul>
          </StatCard>
        </div>
      )}
    </div>
  );
};