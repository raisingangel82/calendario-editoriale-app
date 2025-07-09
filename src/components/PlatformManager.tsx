import React, { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Sparkles, Facebook, Instagram, Youtube } from 'lucide-react';
import { SiTiktok, SiThreads, SiX } from '@icons-pack/react-simple-icons';
import type { PlatformData } from '../types';
import { PlatformFormModal } from './PlatformFormModal';
import { useTheme } from '../contexts/ThemeContext';

interface PlatformManagerProps {
    platforms: PlatformData[];
    onAddPlatform: (data: Omit<PlatformData, 'id' | 'icon' | 'proFeature' | 'iconName'>) => void;
    onUpdatePlatform: (id: string, data: Omit<PlatformData, 'id' | 'icon' | 'proFeature' | 'iconName'>) => void;
    onDeletePlatform: (id: string) => void;
}

// Funzione corretta per ottenere l'icona
const getPlatformIcon = (platform: PlatformData): React.ElementType => {
    if (!platform?.name) return Sparkles;
    const platformName = platform.name.toLowerCase();
    switch (platformName) {
        case 'facebook': return Facebook;
        // [CORREZIONE] Associata l'icona corretta a Instagram
        case 'instagram': return Instagram;
        case 'youtube': return Youtube;
        case 'tiktok': return SiTiktok;
        // [CORREZIONE] Associata l'icona corretta a Twitter/X
        case 'x':
        case 'twitter': return SiX;
        case 'threads': return SiThreads;
        default: return Sparkles;
    }
};

export const PlatformManager: React.FC<PlatformManagerProps> = ({ platforms, onAddPlatform, onUpdatePlatform, onDeletePlatform }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlatform, setEditingPlatform] = useState<PlatformData | null>(null);
    const { getActiveColor } = useTheme();

    const handleOpenModal = (platform: PlatformData | null = null) => {
        setEditingPlatform(platform);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPlatform(null);
    };

    const handleSave = (data: Omit<PlatformData, 'id' | 'icon' | 'proFeature' | 'iconName'>) => {
        if (editingPlatform) {
            onUpdatePlatform(editingPlatform.id, data);
        } else {
            onAddPlatform(data);
        }
        handleCloseModal();
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-800 dark:text-gray-100">Le tue Piattaforme</h4>
                <button onClick={() => handleOpenModal()} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:opacity-90`}>
                    <Plus size={16} /> Aggiungi
                </button>
            </div>

            <div className="space-y-3">
                {(platforms || []).map(platform => {
                    const Icon = getPlatformIcon(platform);
                    return (
                        <div key={platform.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Icon size={20} className="text-gray-600 dark:text-gray-300 flex-shrink-0"/>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{platform.name}</span>
                                    <div className="flex items-center gap-3 mt-1">
                                        {platform.publishUrl && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                <CheckCircle size={14} className="text-green-500" />
                                                <span>Pubblicazione</span>
                                            </div>
                                        )}
                                        {platform.analyticsUrl && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                <CheckCircle size={14} className="text-blue-500" />
                                                <span>Analytics</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleOpenModal(platform)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full" title="Modifica">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => onDeletePlatform(platform.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full" title="Elimina">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <PlatformFormModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    platformToEdit={editingPlatform}
                />
            )}
        </div>
    );
};