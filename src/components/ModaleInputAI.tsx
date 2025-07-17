import React, { useState } from 'react';
import { BaseModal } from './BaseModal';

interface ModaleInputAIProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (obiettivo: string, audience: string) => void;
}

export const ModaleInputAI: React.FC<ModaleInputAIProps> = ({ isOpen, onClose, onSubmit }) => {
  const [obiettivo, setObiettivo] = useState('');
  const [audience, setAudience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Stato per il messaggio di errore
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obiettivo || !audience) {
        // Imposta il messaggio di errore invece di usare alert()
        setErrorMessage("Per favore, compila entrambi i campi per un'analisi accurata.");
        return;
    }
    // Resetta il messaggio di errore se i campi sono validi
    setErrorMessage(null);
    setIsSubmitting(true);
    onSubmit(obiettivo, audience);
  };
  
  const labelStyle = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2";
  const textareaBaseStyle = "w-full bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";

  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="px-6 py-2 text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-600 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
      >
        Annulla
      </button>
      <button
        type="submit"
        form="ai-input-form"
        disabled={isSubmitting || !obiettivo || !audience}
        className="px-6 py-2 text-base font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Analizzando...' : 'Avvia Analisi'}
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Fornisci Contesto all'AI"
      footer={footerContent}
    >
      <form id="ai-input-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Mostra il messaggio di errore se presente */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
        <div>
          <label htmlFor="obiettivo" className={labelStyle}>
            Qual è il tuo obiettivo principale?
          </label>
          <textarea
            id="obiettivo"
            value={obiettivo}
            onChange={(e) => { setObiettivo(e.target.value); setErrorMessage(null); }} // Resetta errore alla digitazione
            rows={4}
            className={`${textareaBaseStyle} resize-y`}
            placeholder="Es. 'Voglio aumentare le vendite del mio nuovo libro del 20% nei prossimi 3 mesi' oppure 'Voglio far crescere il mio profilo per diventare un punto di riferimento per la scrittura fantasy'."
          />
        </div>
        <div>
          <label htmlFor="audience" className={labelStyle}>
            A chi ti rivolgi? Descrivi il tuo pubblico.
          </label>
          <textarea
            id="audience"
            value={audience}
            onChange={(e) => { setAudience(e.target.value); setErrorMessage(null); }} // Resetta errore alla digitazione
            rows={4}
            className={`${textareaBaseStyle} resize-y`}
            placeholder="Es. 'Scrittori emergenti tra i 20 e i 35 anni che cercano consigli pratici su come pubblicare' oppure 'Appassionati di romanzi storici che amano scoprire i retroscena della creazione di un libro'."
          />
        </div>
      </form>
    </BaseModal>
  );
};
