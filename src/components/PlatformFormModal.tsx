import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { PlatformData } from '../data/defaultPlatforms';

interface PlatformFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<PlatformData, 'id'>) => void;
  platformToEdit: PlatformData | null;
}

export const PlatformFormModal: React.FC<PlatformFormModalProps> = ({ isOpen, onClose, onSave, platformToEdit }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (platformToEdit) {
      setName(platformToEdit.name);
      setIcon(platformToEdit.icon);
      setBaseUrl(platformToEdit.baseUrl);
      setIsActive(platformToEdit.isActive ?? true);
    } else {
      // Reset form per nuova piattaforma
      setName('');
      setIcon('');
      setBaseUrl('');
      setIsActive(true);
    }
  }, [platformToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, icon, baseUrl, isActive });
  };
  
  if (!isOpen) return null;

  const inputStyle = "w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors";
  const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{platformToEdit ? 'Modifica Piattaforma' : 'Aggiungi Piattaforma'}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className={labelStyle}>Nome Piattaforma</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className={inputStyle} placeholder="Es. Pinterest"/>
          </div>
          <div>
            <label htmlFor="icon" className={labelStyle}>Nome Icona</label>
            <input type="text" id="icon" value={icon} onChange={e => setIcon(e.target.value)} required className={inputStyle} placeholder="Es. pinterest (da lucide-react)"/>
          </div>
          <div>
            <label htmlFor="baseUrl" className={labelStyle}>URL di Base per la Condivisione</label>
            <input type="url" id="baseUrl" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} required className={inputStyle} placeholder="https://www.pinterest.com/pin/create/button/?url="/>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded text-red-600 focus:ring-red-500"/>
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">Attiva</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Annulla</button>
            <button type="submit" className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">{platformToEdit ? 'Salva Modifiche' : 'Aggiungi'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};