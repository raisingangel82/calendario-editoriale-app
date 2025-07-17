import React, { useState } from 'react';
import { Wand, BrainCircuit, AlertTriangle } from 'lucide-react';

// Importa le funzioni necessarie dall'SDK di Firebase
import { getFunctions, httpsCallable } from "firebase/functions";

import type { Post } from '../types';
import { StatCard } from './StatCard';
import { ModaleInputAI } from './ModaleInputAI';
import { ReportDisplay } from './ReportDisplay';
import { Loader } from './Loader';

interface AnalisiAIViewProps {
  posts: Post[];
}

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

  const handleStartFlow = () => {
    const postsWithPerformance = posts.filter(p => p.performance && p.piattaforma);
    if (postsWithPerformance.length < 3) {
      setError("Dati insufficienti. Sono necessari almeno 3 post con metriche di performance per un'analisi significativa.");
      setStatoAnalisi('error');
      return;
    }
    setError(null);
    setStatoAnalisi('input');
  };

  const handleAvviaAnalisi = async (obiettivo: string, audience: string) => {
    setStatoAnalisi('loading');
    setReport(null);
    setError(null);

    try {
      // 1. Ottieni un riferimento al servizio Firebase Functions
      const functions = getFunctions();
      // 2. Crea un riferimento alla tua funzione specifica per nome
      const generateContentReportCallable = httpsCallable(functions, 'generateContentReport');
      
      const postsWithPerformance = posts.filter(p => p.performance && p.piattaforma);
      
      // 3. Chiama la funzione con i dati necessari
      const result = await generateContentReportCallable({ 
        posts: postsWithPerformance,
        goal: obiettivo,
        audience: audience
      });
      
      // 4. Il risultato è contenuto nella proprietà 'data' dell'oggetto di risposta
      const data = result.data as AIReport;
      
      setReport(data);
      setStatoAnalisi('success');

    } catch (err: any) {
      console.error("Errore durante la chiamata alla funzione Firebase:", err);
      // L'oggetto di errore dell'SDK Firebase ha una proprietà 'message'
      // o 'details' per gli HttpsError.
      let errorMessage = "Si è verificato un errore sconosciuto durante la generazione del report.";
      if (err.message) {
        errorMessage = err.message;
      } else if (err.details && typeof err.details === 'string') {
        errorMessage = err.details;
      }
      setError(errorMessage);
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
      <ModaleInputAI
        isOpen={statoAnalisi === 'input'}
        onClose={() => setStatoAnalisi('idle')}
        onSubmit={handleAvviaAnalisi}
      />
      {renderContent()}
    </div>
  );
};

// Il componente Loader rimane invariato
const Loader: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">{text}</p>
    </div>
  );
