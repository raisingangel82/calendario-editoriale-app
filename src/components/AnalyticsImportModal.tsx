import React, { useState } from 'react';
import { BarChart2 as BarIcon, UploadCloud, CheckCircle } from 'lucide-react';
import type { PlatformData } from '../types';
import Papa from 'papaparse';
import { BaseModal } from './BaseModal';
import { StatCard } from './StatCard';
// [MODIFICA] Importa la funzione centralizzata
import { getPlatformIcon } from '../utils/iconUtils';

interface AnalyticsImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    platforms: PlatformData[];
    onAnalyticsImport: (parsedData: any[], platformName: string) => Promise<number | void>;
}

export const AnalyticsImportModal: React.FC<AnalyticsImportModalProps> = ({ isOpen, onClose, platforms, onAnalyticsImport }) => {
    const [uploading, setUploading] = useState(false);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

    // ... (la logica interna di handleFileChange rimane invariata) ...
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
                                throw new Error(`Errore di parsing nel file ${file.name}`);
                            }
                            const updatedCount = await onAnalyticsImport(results.data, platformKey);
                            resolve({ fileName: file.name, count: updatedCount });
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
            const totalUpdated = results.reduce((sum, result: any) => sum + (result.count || 0), 0);
            setFeedback({ type: 'success', message: `${results.length} file processati. ${totalUpdated} post aggiornati.` });
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
                <StatCard title="1. Scarica i Dati dalle Piattaforme" icon={BarIcon}>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Visita le tue piattaforme e scarica i file .csv.</p>
                    <div className="flex flex-wrap gap-2">
                        {(platforms || []).filter(p => p.analyticsUrl).map(p => {
                            // [MODIFICA] Utilizza la funzione centralizzata
                            const Icon = getPlatformIcon(p);
                            return (
                                <a key={p.id} href={p.analyticsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 pr-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    <Icon size={16} className="text-gray-600 dark:text-gray-300" />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{p.name}</span>
                                    {/* Rimosso CheckCircle per coerenza con gli altri componenti */}
                                </a>
                            );
                        })}
                    </div>
                </StatCard>
                <StatCard title="2. Carica i File" icon={UploadCloud}>
                   {/* ... resto del componente invariato ... */}
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