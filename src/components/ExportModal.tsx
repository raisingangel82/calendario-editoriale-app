import React, { useState, useEffect } from 'react';
import { Download, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { Categoria } from '../types';
import { BaseModal } from './BaseModal';

const FormPage = ({ children }: { children: React.ReactNode }) => (
    <div className="h-full flex flex-col justify-center animate-fade-in">
        {children}
    </div>
);

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (count: number, filter: Categoria | 'all') => void;
    maxCount: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, maxCount }) => {
    const { getActiveColor, getActiveColorHex } = useTheme();
    
    const [currentPage, setCurrentPage] = useState(0);
    // FIX 1: Lo stato ora può essere un numero o una stringa per permettere l'input vuoto.
    const [count, setCount] = useState<number | string>(10);
    const [filter, setFilter] = useState<Categoria | 'all'>('all');

    useEffect(() => {
        if (isOpen) {
            setCurrentPage(0);
            setCount(10);
            setFilter('all');
        }
    }, [isOpen]);

    const handleExportClick = () => {
        // FIX 3: La validazione avviene qui. Se l'input è vuoto o non valido, viene impostato 1.
        const numericCount = parseInt(String(count), 10) || 0;
        const finalCount = Math.max(1, numericCount);

        onExport(Math.min(finalCount, maxCount), filter);
        onClose();
    };

    const baseInputStyle = "w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-600 rounded-lg p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none";
    const labelStyle = "block text-base font-semibold text-gray-800 dark:text-gray-200 mb-2";
    
    const footerContent = (
        <div className="flex w-full flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2">
                {[0, 1].map(pageIndex => (
                    <button key={pageIndex} onClick={() => setCurrentPage(pageIndex)} className={`h-2 rounded-full transition-all ${currentPage === pageIndex ? 'w-6' : 'w-2'}`} style={{ backgroundColor: currentPage === pageIndex ? getActiveColorHex() : '#9ca3af' }} />
                ))}
            </div>
            <div className="flex w-full items-center gap-3">
                <div className="flex-1">
                    {currentPage > 0 && (
                        <button onClick={() => setCurrentPage(0)} className="w-full sm:w-auto px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-600 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors flex items-center justify-center gap-2">
                            <ArrowLeft size={18} /> Indietro
                        </button>
                    )}
                </div>
                <div className="flex-1 flex justify-end">
                    {currentPage === 0 ? (
                        <button onClick={() => setCurrentPage(1)} className={`w-full sm:w-auto px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:opacity-90 flex items-center justify-center gap-2`}>
                            Avanti <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button onClick={handleExportClick} className={`w-full sm:w-auto px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:opacity-90 flex items-center justify-center gap-2`}>
                            <Download size={20} /> Esporta Ora
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Esporta Contenuti da Creare" footer={footerContent}>
            <div className="min-h-[150px]">
                {currentPage === 0 && (
                    <FormPage>
                        <label htmlFor="category-filter" className={labelStyle}>Filtra per Categoria</label>
                        <select id="category-filter" value={filter} onChange={(e) => setFilter(e.target.value as Categoria | 'all')} className={baseInputStyle}>
                            <option value="all">Tutte le Categorie</option>
                            <option value="Testo">Testo</option>
                            <option value="Immagine">Immagine</option>
                            <option value="Video">Video</option>
                        </select>
                    </FormPage>
                )}
                {currentPage === 1 && (
                    <FormPage>
                        <label htmlFor="content-count" className={labelStyle}>Numero di Contenuti</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quanti post vuoi esportare? (Max: {maxCount})</p>
                        {/* FIX 2: onChange ora è più semplice e permette di svuotare il campo. */}
                        <input id="content-count" type="number" value={count} onChange={(e) => setCount(e.target.value)} min="1" max={maxCount} className={baseInputStyle} />
                    </FormPage>
                )}
            </div>
        </BaseModal>
    );
};