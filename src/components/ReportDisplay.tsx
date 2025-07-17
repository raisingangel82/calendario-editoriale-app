import React from 'react';
import { Award, BarChart2, BookOpen, BrainCircuit, ListChecks, Lightbulb, TrendingUp, TrendingDown } from 'lucide-react'; // Aggiunti Lightbulb, TrendingUp, TrendingDown
import type { AIReport } from './AnalisiAIView';
import { StatCard } from './StatCard';

interface ReportDisplayProps {
  data: AIReport;
  onReset: () => void;
}

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ data, onReset }) => {
  if (!data) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Executive Summary */}
      <StatCard title={data.executiveSummary.titolo} icon={BrainCircuit}>
        <p className="text-gray-700 dark:text-gray-300">{data.executiveSummary.paragrafo}</p>
      </StatCard>
      
      {/* Analisi Quantitativa */}
      <StatCard title="Analisi Quantitativa" icon={BarChart2}>
        <ul className="space-y-3 text-gray-700 dark:text-gray-300">
          <li className="flex items-center gap-3"><strong className="w-48">Piattaforma Top:</strong> <span>{data.analisiQuantitativa.piattaformaTop}</span></li>
          <li className="flex items-center gap-3"><strong className="w-48">Formato Vincente:</strong> <span>{data.analisiQuantitativa.formatoVincente}</span></li>
          <li className="flex items-center gap-3"><strong className="w-48">Miglior Momento:</strong> <span>{data.analisiQuantitativa.migliorMomentoPerPubblicare}</span></li>
        </ul>
        {data.analisiQuantitativa.trendPerformanceGenerali && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Trend di Performance Generali:</h3>
            <p className="text-gray-700 dark:text-gray-300">{data.analisiQuantitativa.trendPerformanceGenerali}</p>
          </div>
        )}
      </StatCard>

      {/* Analisi Tematica */}
      <StatCard title="Analisi Tematica" icon={BookOpen}>
        <div className="space-y-4">
          {data.analisiTematica.pilastriDiContenuto.map((pilastro, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-bold text-gray-800 dark:text-gray-200">{pilastro.tema}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{pilastro.performance}</p>
              {pilastro.suggerimentiSpecifici && pilastro.suggerimentiSpecifici.length > 0 && (
                <div className="mt-2 text-sm">
                  <h5 className="font-semibold text-indigo-700 dark:text-indigo-300">Suggerimenti:</h5>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                    {pilastro.suggerimentiSpecifici.map((suggerimento, sIndex) => (
                      <li key={sIndex}>{suggerimento}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </StatCard>

      {/* Analisi dei Ganci (NUOVA SEZIONE) */}
      {data.analisiGanci && (
        <StatCard title="Analisi dei Ganci (Hooks)" icon={Lightbulb}>
          <div className="space-y-6">
            {data.analisiGanci.gancioVincente && (
              <div>
                <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2 mb-2">
                  <TrendingUp size={20} /> Gancio Vincente:
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong className="block text-gray-800 dark:text-gray-200">{data.analisiGanci.gancioVincente.postTitolo || 'N/A'}</strong>
                  <span className="italic">"{data.analisiGanci.gancioVincente.gancioTesto || 'Nessun testo gancio'}"</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{data.analisiGanci.gancioVincente.percheFunziona}</p>
              </div>
            )}

            {data.analisiGanci.gancioMenoEfficace && (
              <div>
                <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
                  <TrendingDown size={20} /> Gancio Meno Efficace:
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong className="block text-gray-800 dark:text-gray-200">{data.analisiGanci.gancioMenoEfficace.postTitolo || 'N/A'}</strong>
                  <span className="italic">"{data.analisiGanci.gancioMenoEfficace.gancioTesto || 'Nessun testo gancio'}"</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{data.analisiGanci.gancioMenoEfficace.percheNonFunziona}</p>
              </div>
            )}

            {data.analisiGanci.consigliPerGanciEfficaci && data.analisiGanci.consigliPerGanciEfficaci.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Consigli per Ganci Efficaci:</h3>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                  {data.analisiGanci.consigliPerGanciEfficaci.map((consiglio, cIndex) => (
                    <li key={cIndex}>{consiglio}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </StatCard>
      )}

      {/* Piano d'Azione */}
      <StatCard title={data.pianoDAzione.titolo} icon={ListChecks}>
        <div className="space-y-4">
          {data.pianoDAzione.azioni.map((item, index) => (
            <div key={index} className="border-l-4 pl-4" style={{ borderColor: '#4f46e5' /* indigo-600 */ }}>
              <p className="font-semibold text-gray-800 dark:text-gray-200">{item.azione}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.motivazione}</p>
              <span className="mt-2 inline-block px-2 py-1 text-xs font-medium text-indigo-800 bg-indigo-100 dark:text-indigo-200 dark:bg-indigo-900/50 rounded-full">{item.focus}</span>
            </div>
          ))}
        </div>
      </StatCard>

      {/* Pulsante di Reset */}
      <div className="text-center pt-4">
        <button
          onClick={onReset}
          className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
        >
          Esegui una Nuova Analisi
        </button>
      </div>
    </div>
  );
};
