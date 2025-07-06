import React, { useState } from 'react';
import { UploadCloud, FileJson, AlertTriangle } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { useTheme } from '../contexts/ThemeContext';

type ImportMode = 'add' | 'overwrite';

interface ImportModalProps {
  onClose: () => void;
  onImport: (posts: any[], mode: ImportMode) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('add');
  const [error, setError] = useState<string>('');
  const { getActiveColor } = useTheme();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file && file.type === "application/json") { setSelectedFile(file); setError(''); } else { setSelectedFile(null); setError('Per favore, seleziona un file .json valido.'); } };
  const handleImportClick = () => { if (!selectedFile) { setError('Nessun file selezionato.'); return; } const reader = new FileReader(); reader.onload = (event) => { try { const content = event.target?.result; if (!content) throw new Error('Il contenuto del file è vuoto.'); const parsedData = JSON.parse(content as string); if (!Array.isArray(parsedData.posts)) throw new Error('Il file JSON deve contenere un array "posts".'); onImport(parsedData.posts, importMode); } catch (e: any) { setError(`Errore nel formato del file: ${e.message}`); } }; reader.onerror = () => setError('Impossibile leggere il file.'); reader.readAsText(selectedFile); };

  const footerContent = (
    <div className="flex w-full justify-end gap-3">
       <button onClick={onClose} className="px-6 py-3 text-base font-medium rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">Annulla</button>
       <button onClick={handleImportClick} disabled={!selectedFile} className={`px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:${getActiveColor('bg', '600')} disabled:opacity-50`}>Carica e Importa</button>
    </div>
  );

  return (
    <BaseModal isOpen={true} onClose={onClose} title="Importa Database" footer={footerContent}>
      <div className="space-y-6">
        <label htmlFor="file-upload" className="cursor-pointer bg-gray-50 dark:bg-slate-700/50 p-8 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
            <UploadCloud className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2" />
            <span className={`font-semibold ${getActiveColor('text')}`}>Seleziona un file .json</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Trascina qui o clicca per caricare</span>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".json" onChange={handleFileChange} />
        </label>
        {selectedFile && <div className="text-center text-sm bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 p-3 rounded-lg flex items-center justify-center gap-2"><FileJson size={18} /><span>{selectedFile.name}</span></div>}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <div className="space-y-3 pt-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Modalità di importazione</h3>
            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"><input type="radio" name="import-mode" value="add" checked={importMode === 'add'} onChange={() => setImportMode('add')} className={`h-4 w-4 ${getActiveColor('text')} focus:ring-blue-500`} /><div><span className="font-semibold text-gray-800 dark:text-gray-200">Aggiungi</span><p className="text-xs text-gray-500 dark:text-gray-400">Aggiunge i nuovi post. Raccomandato.</p></div></label>
            <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"><input type="radio" name="import-mode" value="overwrite" checked={importMode === 'overwrite'} onChange={() => setImportMode('overwrite')} className={`h-4 w-4 mt-1 ${getActiveColor('text')} focus:ring-blue-500`} /><div><span className="font-semibold text-gray-800 dark:text-gray-200">Sovrascrivi</span><p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" /><span>Cancella TUTTI i post e progetti attuali.</span></p></div></label>
        </div>
      </div>
    </BaseModal>
  );
};
