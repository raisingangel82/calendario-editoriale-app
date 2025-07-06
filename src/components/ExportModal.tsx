import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { Download, ArrowRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { Categoria } from '../types';
import { BaseModal } from './BaseModal';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (count: number, filter: Categoria | 'all') => void;
    maxCount: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, maxCount }) => {
    const { getActiveColor, getActiveColorHex } = useTheme();
    const [count, setCount] = useState(10);
    const [filter, setFilter] = useState<Categoria | 'all'>('all');
    const [swiper, setSwiper] = useState<any>(null);

    const handleExportClick = () => {
        onExport(Math.min(count, maxCount), filter);
        onClose();
    };

    const slideTo = (index: number) => swiper?.slideTo(index);
    const baseInputStyle = "w-full bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-slate-600 rounded-lg p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none";
    const labelStyle = "block text-base font-semibold text-gray-800 dark:text-gray-200 mb-2";

    const footerContent = (
        <div className="flex w-full items-center justify-between gap-4">
            <div className="swiper-pagination-container flex items-center gap-2 !w-auto" />
            
            {swiper?.activeIndex === 0 ? (
                <button onClick={() => slideTo(1)} className={`flex-grow px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:opacity-90`}>
                    Avanti <ArrowRight size={18} className="inline"/>
                </button>
            ) : (
                <button onClick={handleExportClick} className={`flex-grow px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:opacity-90`}>
                    <Download size={20} className="inline-block mr-2"/> Esporta Ora
                </button>
            )}
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Esporta Contenuti da Creare" footer={footerContent}>
            <Swiper
                modules={[Pagination]}
                pagination={{ el: '.swiper-pagination-container', clickable: true }}
                className="w-full h-full"
                onSwiper={setSwiper}
                direction="horizontal"
                style={{
                    '--swiper-pagination-color': getActiveColorHex(),
                    '--swiper-pagination-bullet-inactive-color': '#9ca3af',
                    '--swiper-pagination-bullet-inactive-opacity': '1',
                } as React.CSSProperties}
            >
                <SwiperSlide className="py-2 px-1">
                    <div className="h-full flex flex-col justify-center">
                        <label className={labelStyle}>Filtra per Categoria</label>
                        <select value={filter} onChange={(e) => setFilter(e.target.value as Categoria | 'all')} className={baseInputStyle}>
                            <option value="all">Tutte le Categorie</option>
                            <option value="Testo">Testo</option>
                            <option value="Immagine">Immagine</option>
                            <option value="Video">Video</option>
                        </select>
                    </div>
                </SwiperSlide>
                <SwiperSlide className="py-2 px-1">
                    <div className="h-full flex flex-col justify-center">
                        <label className={labelStyle}>Numero di Contenuti</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quanti post vuoi esportare? (Max: {maxCount})</p>
                        <input type="number" value={count} onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))} min="1" max={maxCount} className={baseInputStyle} />
                    </div>
                </SwiperSlide>
            </Swiper>
        </BaseModal>
    );
};
