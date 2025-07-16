import React, { useState } from 'react';
import { Wand, BrainCircuit, AlertTriangle } from 'lucide-react';

import type { Post } from '../types';
import { StatCard } from './StatCard';
import { ModaleInputAI } from './ModaleInputAI';
import { ReportDisplay } from './ReportDisplay';
import { Loader } from './Loader'; // Assumendo che tu abbia un componente Loader, altrimenti puoi usare un semplice <p>

interface AnalisiAIViewProps {
  posts: Post[];
}

// Definiamo il tipo per la nuova risposta strutturata dell'AI
// Assicurati che il tuo backend API (/api/generateReport) restituisca questo formato
export interface AIReport {
  executiveSummary: {
    titolo: string;
    paragrafo: string;
  };
  analisiQuantitativa: {
    migliorMomentoPerPubblicare: string;
    formatoVincente: string;
    piattaformaTop: string;
  };
  analisiTematica: {
    pilastriDiContenuto: {
      tema: string;
      performance: string;
    }[];
  };
  pianoDAzione: {
    titolo: string;
    azioni: {
      azione: string;
      motivazione: string;
      focus: string;
    }[];
  };
}

export const AnalisiAIView: React.FC<AnalisiAIViewProps> = ({ posts }) => {
  const [statoAnalisi, setStatoAnalisi] = useState<'idle' | 'input' | 'loading' | 'success' | 'error'>('idle');
  const [report, setReport] = useState<AIReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Questa funzione avvia l'intero processo, aprendo il modale di input
  const handleStartFlow = () => {
    // La logica di controllo dei post viene mantenuta
    const postsWithPerformance = posts.filter(p => p.performance && p.piattaforma);
    if (postsWithPerformance.length < 3) {
      setError("Dati insufficienti. Sono necessari almeno 3 post con metriche di performance per un'analisi significativa.");
      setStatoAnalisi('error');
      return;
    }
    setError(null);
    setStatoAnalisi('input');
  };

  // Questa è la funzione principale che viene chiamata dal modale con i dati dell'utente
  const handleAvviaAnalisi = async (obiettivo: string, audience: string) => {
    setStatoAnalisi('loading');
    setReport(null);
    setError(null);

    try {
      const postsWithPerformance = posts.filter(p => p.performance && p.piattaforma);
      
      // La chiamata API ora include goal e audience, come da nostro nuovo prompt
      const response = await fetch('/api/generateReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          posts: postsWithPerformance,
          goal: obiettivo,
          audience: audience
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto dal server' }));
        throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      setReport(data as AIReport);
      setStatoAnalisi('success');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Si è verificato un errore sconosciuto durante la generazione del report.");
      setStatoAnalisi('error');
    }
  };

  const renderContent = () => {
    switch (statoAnalisi) {
      case 'loading':
        return <Loader text="Stratagem sta analizzando i tuoi dati..." />;
      
      case 'success':
        return report && <ReportDisplay data={report} onReset={() => setStatoAnalisi('idle')} />;

      case 'error':
        return (
          <StatCard title="Errore" icon={AlertTriangle}>
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => setStatoAnalisi('idle')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Torna indietro
            </button>
          </StatCard>
        );

      case 'idle':
      default:
        return (
          <StatCard title="Analisi Strategica con AI" icon={BrainCircuit}>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Ottieni un'analisi approfondita delle tue performance e un piano d'azione personalizzato. Per risultati ottimali, l'AI ha bisogno di conoscere il tuo obiettivo e il tuo pubblico.
            </p>
            <button
              onClick={handleStartFlow}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all"
            >
              <Wand size={20} />
              Avvia Analisi Ora
            </button>
          </StatCard>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-6">
      {/* Il modale viene renderizzato solo quando lo stato è 'input' */}
      <ModaleInputAI
        isOpen={statoAnalisi === 'input'}
        onClose={() => setStatoAnalisi('idle')}
        onSubmit={handleAvviaAnalisi}
      />
      {renderContent()}
    </div>
  );
};

// Se non hai un componente Loader, puoi usare questo semplice placeholder
const Loader: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">{text}</p>
  </div>
);