import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type PlatformData } from '../data/defaultPlatforms';

interface PlatformFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (platformData: Omit<PlatformData, 'id' | 'icon'>) => void;
  platformToEdit: PlatformData | null;
}

export const PlatformFormModal: React.FC<PlatformFormModalProps> = ({ isOpen, onClose, onSave, platformToEdit }) => {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  // ▼▼▼ MODIFICA: Aggiunto lo stato per il nuovo campo ▼▼▼
  const [publishUrl, setPublishUrl] = useState('');

  useEffect(() => {
    if (platformToEdit) {
      setName(platformToEdit.name);
      setBaseUrl(platformToEdit.baseUrl);
      setPublishUrl(platformToEdit.publishUrl || '');
    } else {
      setName('');
      setBaseUrl('');
      setPublishUrl('');
    }
  }, [platformToEdit]);

  const handleSaveClick = () => {
    if (!name) {
      alert('Il nome della piattaforma è obbligatorio.');
      return;
    }
    onSave({ name, baseUrl, publishUrl });
  };

  if (!isOpen) return null;

  const inputStyle = "w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none";
  const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{platformToEdit ? 'Modifica Piattaforma' : 'Nuova Piattaforma'}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="platform-name" className={labelStyle}>Nome Piattaforma</label>
            <input id="platform-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputStyle} placeholder="Es. Blog Personale"/>
          </div>
          <div>
            <label htmlFor="platform-base-url" className={labelStyle}>URL di Base (obsoleto, non più usato)</label>
            <input id="platform-base-url" type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className={inputStyle} placeholder="Es. https://www.mioblog.com" disabled/>
          </div>
          {/* ▼▼▼ MODIFICA: Aggiunto il campo per l'URL di pubblicazione ▼▼▼ */}
          <div>
            <label htmlFor="platform-publish-url" className={labelStyle}>URL di Pubblicazione</label>
            <input id="platform-publish-url" type="text" value={publishUrl} onChange={e => setPublishUrl(e.target.value)} className={inputStyle} placeholder="Es. https://www.facebook.com/business/latest/composer"/>
            <p className="text-xs text-gray-400 mt-1">L'URL a cui verrai reindirizzato per creare un nuovo post.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Annulla</button>
          <button onClick={handleSaveClick} className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700">Salva</button>
        </div>
      </div>
    </div>
  );
};