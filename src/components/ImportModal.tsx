import React, { useState } from 'react';
import { X, UploadCloud, FileJson, AlertTriangle } from 'lucide-react';

// Tipi di dati che il componente gestisce
type ImportMode = 'add' | 'overwrite';

// Props che il componente riceve e comunica
interface ImportModalProps {
  onClose: () => void;
  onImport: (posts: any[], mode: ImportMode) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('add'); // Default: Aggiungi
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/json") {
      setSelectedFile(file);
      setError('');
    } else {
      setSelectedFile(null);
      setError('Per favore, seleziona un file .json valido.');
    }
  };

  const handleImportClick = () => {
    if (!selectedFile) {
      setError('Nessun file selezionato.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (!content) {
          throw new Error('Il contenuto del file è vuoto.');
        }
        const parsedData = JSON.parse(content as string);
        if (!Array.isArray(parsedData)) {
          throw new Error('Il file JSON deve contenere un array (una lista) di post.');
        }
        onImport(parsedData, importMode);
      } catch (e: any) {
        setError(`Errore nel formato del file: ${e.message}`);
      }
    };
    reader.onerror = () => {
      setError('Impossibile leggere il file.');
    };
    reader.readAsText(selectedFile);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white p-8 rounded-lg w-full max-w-3xl shadow-2xl border border-gray-200 dark:bg-gray-800" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-light tracking-widest text-gray-600 dark:text-gray-300 uppercase">Importa Contenuti</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Colonna Istruzioni */}
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
            <h3 className="font-semibold text-base text-gray-800 dark:text-gray-100">1. Prepara il file di importazione</h3>
            <p>Carica un file in formato `.json` contenente una lista (array) di post. Il modo più semplice è usare un file generato dalla funzione <strong className="text-red-500">Esporta</strong> come modello.</p>
            <p>Campi obbligatori per ogni post:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 font-mono text-xs bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
              <li>"libro": "Nome del Libro"</li>
              <li>"piattaforma": "X", "Instagram", etc.</li>
              <li>"data": "AAAA-MM-GGTHH:mm:ss"</li>
              <li>"tipoContenuto": "Reel", "Vlog", etc.</li>
              <li>"descrizione": "Testo del post..."</li>
            </ul>
          </div>

          {/* Colonna Upload e Scelta Modalità */}
          <div className="space-y-6">
             <h3 className="font-semibold text-base text-gray-800 dark:text-gray-100">2. Seleziona il file</h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
              <UploadCloud className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
              <label htmlFor="file-upload" className="cursor-pointer font-semibold text-red-600 hover:text-red-700">
                Seleziona un file .json
                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".json" onChange={handleFileChange} />
              </label>
              {selectedFile && <div className="mt-4 text-center text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 p-2 rounded-md flex items-center gap-2"><FileJson size={16} /><span>{selectedFile.name}</span></div>}
              {error && <p className="mt-4 text-xs text-red-500">{error}</p>}
            </div>

            <h3 className="font-semibold text-base text-gray-800 dark:text-gray-100">3. Scegli la modalità di importazione</h3>
            <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-red-500">
                    <input type="radio" name="import-mode" value="add" checked={importMode === 'add'} onChange={() => setImportMode('add')} className="h-4 w-4 text-red-600 focus:ring-red-500" />
                    <div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">Aggiungi</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Aggiunge i nuovi post a quelli già esistenti. Sicuro e raccomandato.</p>
                    </div>
                </label>
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-red-500">
                    <input type="radio" name="import-mode" value="overwrite" checked={importMode === 'overwrite'} onChange={() => setImportMode('overwrite')} className="h-4 w-4 mt-1 text-red-600 focus:ring-red-500" />
                    <div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">Sovrascrivi</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />
                            <span><strong>Attenzione:</strong> Cancella TUTTI i post attuali prima di importare.</span>
                        </p>
                    </div>
                </label>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-gray-200 dark:border-gray-700 flex justify-end">
           <button 
              onClick={handleImportClick}
              disabled={!selectedFile}
              className="font-semibold text-white bg-gray-800 dark:bg-gray-50 dark:text-gray-900 py-2 px-4 rounded-lg hover:bg-black dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Carica e Importa
            </button>
        </div>
      </div>
    </div>
  );
};