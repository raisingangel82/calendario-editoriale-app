import React, { useState, useEffect } from 'react';
import { type PlatformData } from '../data/defaultPlatforms';
import { BaseModal } from './BaseModal';
import { useTheme } from '../contexts/ThemeContext';

interface PlatformFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (platformData: Omit<PlatformData, 'id' | 'icon'>) => void;
  platformToEdit: PlatformData | null;
}

export const PlatformFormModal: React.FC<PlatformFormModalProps> = ({ isOpen, onClose, onSave, platformToEdit }) => {
  const [name, setName] = useState('');
  const [publishUrl, setPublishUrl] = useState('');
  const { getActiveColor } = useTheme();

  useEffect(() => { 
    if (isOpen) {
        if (platformToEdit) { 
            setName(platformToEdit.name); 
            setPublishUrl(platformToEdit.publishUrl || ''); 
        } else { 
            setName(''); 
            setPublishUrl(''); 
        }
    }
  }, [platformToEdit, isOpen]);
  
  const handleSaveClick = () => { 
      if (!name) { 
          // Sostituito alert con console.error per non bloccare l'UI
          console.error('Il nome della piattaforma è obbligatorio.'); 
          return; 
      } 
      onSave({ name, publishUrl }); 
  };

  const inputStyle = "w-full p-3 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  const footerContent = (
    <div className="flex w-full flex-wrap sm:flex-nowrap justify-end gap-3">
      <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-3 text-base font-medium rounded-lg bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">Annulla</button>
      <button onClick={handleSaveClick} className={`flex-1 sm:flex-none px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:opacity-90`}>Salva Piattaforma</button>
    </div>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={platformToEdit ? 'Modifica Piattaforma' : 'Nuova Piattaforma'} footer={footerContent}>
      <div className="space-y-6">
        <div>
          <label htmlFor="platform-name" className={labelStyle}>Nome Piattaforma</label>
          <input id="platform-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputStyle} placeholder="Es. Blog Personale"/>
        </div>
        <div>
          <label htmlFor="platform-publish-url" className={labelStyle}>URL di Pubblicazione (Opzionale)</label>
          <input id="platform-publish-url" type="text" value={publishUrl} onChange={e => setPublishUrl(e.target.value)} className={inputStyle} placeholder="Es. https://.../new-post"/>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Link diretto per creare un nuovo post sulla piattaforma.</p>
        </div>
      </div>
    </BaseModal>
  );
};
