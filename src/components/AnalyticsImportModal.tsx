import React, { useState } from 'react';
import { BarChart2 as BarIcon, UploadCloud, Download } from 'lucide-react';
import type { PlatformData } from '../types';
import Papa from 'papaparse';
import { BaseModal } from './BaseModal';
import { StatCard } from './StatCard';
import { getPlatformIcon } from '../utils/iconUtils';

type ImportStrategy = 'update_only' | 'create_new';

interface AnalyticsImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    platforms: PlatformData[];
    onAnalyticsImport: (parsedData: any[], platformName: string, strategy: ImportStrategy) => Promise<{updated: number, created: number} | void>;
}

export const AnalyticsImportModal: React.FC<AnalyticsImportModalProps> = ({ isOpen, onClose, platforms, onAnalyticsImport }) => {
    const [uploading, setUploading] = useState(false);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [strategy, setStrategy] = useState<ImportStrategy>('update_only');

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setFeedback(null);

        const filePromises = Array.from(files).map(file => {
            return new Promise((resolve, reject) => {
                const platformKey = file.name.replace(/\.[^/.]+$/, "").toLowerCase();
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: async (results) => {
                        try {
                            if (results.errors.length > 0) {
                                console.error("Errori di parsing da Papaparse:", results.errors);
                                throw new Error(`Errore di parsing in ${file.name}. Controlla la console per dettagli.`);
                            }
                            const result = await onAnalyticsImport(results.data, platformKey, strategy);
                            resolve({ fileName: file.name, ...result });
                        } catch (error) {
                            reject(error);
                        }
                    },
                    error: (error: any) => reject(new Error(`Impossibile leggere il file ${file.name}: ${error.message}`)),
                });
            });
        });

        try {
            const results = await Promise.all(filePromises);
            const totalUpdated = results.reduce((sum, result: any) => sum + (result.updated || 0), 0);
            const totalCreated = results.reduce((sum, result: any) => sum + (result.created || 0), 0);
            setFeedback({ type: 'success', message: `${results.length} file processati. ${totalUpdated} post aggiornati, ${totalCreated} post creati.` });
        } catch (error: any) {
            setFeedback({ type: 'error', message: error.message || "Si è verificato un errore." });
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Importa Dati Performance">
            <div className="space-y-6">
                <StatCard title="1. Scegli la Strategia di Importazione" icon={BarIcon}>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <button onClick={() => setStrategy('update_only')} className={`flex-1 p-3 text-left rounded-lg border-2 transition-all ${strategy === 'update_only' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-700/50 border-transparent hover:border-gray-300 dark:hover:border-gray-500'}`}>
                            <h4 className="font-bold text-gray-800 dark:text-gray-200">Match & Popola</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Aggiorna solo i contenuti già presenti nel tuo calendario.</p>
                        </button>
                        <button onClick={() => setStrategy('create_new')} className={`flex-1 p-3 text-left rounded-lg border-2 transition-all ${strategy === 'create_new' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-700/50 border-transparent hover:border-gray-300 dark:hover:border-gray-500'}`}>
                           <h4 className="font-bold text-gray-800 dark:text-gray-200">Importa & Crea</h4>
                           <p className="text-xs text-gray-500 dark:text-gray-400">Aggiorna i match e crea nuovi post per i dati non trovati.</p>
                        </button>
                    </div>
                </StatCard>
                
                <StatCard title="2. Scarica i Dati dalle Piattaforme" icon={Download}>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Usa questi link per accedere alle pagine di analytics e scaricare i file .csv.</p>
                    <div className="flex flex-wrap gap-2">
                        {(platforms || []).filter(p => p.analyticsUrl).map(p => {
                            const Icon = getPlatformIcon(p);
                            return (
                                <a key={p.id} href={p.analyticsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 pr-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    <Icon size={16} className="text-gray-600 dark:text-gray-300" />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{p.name}</span>
                                </a>
                            );
                        })}
                    </div>
                </StatCard>

                <StatCard title="3. Carica i File" icon={UploadCloud}>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Carica qui i file. Assicurati che il nome del file corrisponda alla piattaforma (es. `Instagram.csv`).</p>
                    <label htmlFor="analytics-import-modal-upload" className={`w-full flex justify-center items-center gap-3 px-6 py-4 rounded-lg transition-colors cursor-pointer ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-600 text-white font-semibold hover:bg-gray-700'}`}>
                        <UploadCloud size={20} />
                        <span>{uploading ? 'Caricamento...' : 'Seleziona file .csv'}</span>
                    </label>
                    <input 
                        id="analytics-import-modal-upload" 
                        type="file" 
                        className="hidden" 
                        accept=".csv" 
                        multiple
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    {feedback && (
                        <p className={`text-center text-sm mt-3 ${feedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                            {feedback.message}
                        </p>
                    )}
                </StatCard>
            </div>
        </BaseModal>
    );
};