import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Edit, Ban, Save, Star } from 'lucide-react';
import type { Progetto } from '../types';
import { projectColorPalette } from '../data/colorPalette';
import { BaseModal } from './BaseModal';
import { useTheme } from '../contexts/ThemeContext';
import { type User } from 'firebase/auth'; // Importa il tipo User per le props

interface ProjectManagerModalProps {
  progetti: Progetto[];
  user: User | null; // Prop per ricevere i dati dell'utente, incluso il piano
  onClose: () => void;
  onAddProject: (newProjectData: { nome: string; color: string; }) => void;
  onUpdateProject: (projectId: string, updatedData: { nome: string; color: string; }) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({ 
  progetti, 
  user,
  onClose, 
  onAddProject, 
  onUpdateProject, 
  onDeleteProject 
}) => {
  const [nome, setNome] = useState('');
  const [color, setColor] = useState(projectColorPalette[0].base);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { getActiveColor } = useTheme();

  // FIX: La logica ora controlla correttamente il piano dell'utente
  // @ts-ignore - 'plan' è una proprietà custom che aggiungiamo all'oggetto user
  const isFreeTierLimitReached = user?.plan !== 'pro' && progetti.length >= 1;
  
  const isFormDisabled = !editingId && isFreeTierLimitReached;

  useEffect(() => {
    if (editingId) {
      const projectToEdit = progetti.find(p => p.id === editingId);
      if (projectToEdit) {
        setNome(projectToEdit.nome);
        setColor(projectToEdit.color || projectColorPalette[0].base);
      }
    } else {
      resetForm();
    }
  }, [editingId, progetti]);

  const resetForm = () => {
    setNome('');
    setColor(projectColorPalette[0].base);
    setEditingId(null);
  };

  const handleSave = () => {
    if (isFormDisabled || nome.trim() === '') return;
    
    const projectData = { nome: nome.trim(), color };
    if (editingId) {
      onUpdateProject(editingId, projectData);
    } else {
      onAddProject(projectData);
    }
    resetForm();
  };

  const handleStartEdit = (proj: Progetto) => {
    setEditingId(proj.id);
  };

  const handleDelete = (projectId: string) => {
    onDeleteProject(projectId);
    if (editingId === projectId) {
      resetForm();
    }
  };

  const inputStyle = "w-full p-3 bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed";
  const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  const footerContent = (
    <div className="flex w-full justify-end gap-3">
      {editingId ? (
           <button onClick={resetForm} className="flex-1 sm:flex-initial justify-center px-6 py-3 text-base font-medium rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
              <Ban size={16} /> Annulla
           </button>
      ) : (
          <button onClick={onClose} className="flex-1 sm:flex-initial justify-center px-6 py-3 text-base font-medium rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
              Chiudi
          </button>
      )}
      <button onClick={handleSave} disabled={isFormDisabled && !editingId} className={`flex-1 sm:flex-initial justify-center px-6 py-3 text-base font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${getActiveColor('bg')} hover:opacity-90 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed`}>
          {editingId ? <><Save size={16}/> Salva</> : <><Plus size={16}/> Aggiungi</>}
      </button>
    </div>
  );

  return (
    <BaseModal isOpen={true} onClose={onClose} title="Gestisci Progetti" footer={footerContent}>
      <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{editingId ? `Modifica: ${nome}` : 'Aggiungi Nuovo Progetto'}</h3>
            <div className={`space-y-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-opacity ${isFormDisabled ? 'opacity-50' : ''}`}>
              <div>
                <label htmlFor="projectName" className={labelStyle}>Nome Progetto</label>
                <input id="projectName" type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Riflessi di Desiderio" className={inputStyle} disabled={isFormDisabled} />
              </div>
              <div>
                  <label className={labelStyle}>Colore</label>
                  <div className="grid grid-cols-8 sm:grid-cols-11 gap-2 pt-2">
                    {projectColorPalette.map(c => (
                        <button key={c.base} type="button" title={c.name} onClick={() => setColor(c.base)} disabled={isFormDisabled} className={`w-8 h-8 rounded-full transition-all hover:scale-110 disabled:cursor-not-allowed ${color === c.base ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800/50 ${getActiveColor('ring')}` : ''}`} style={{ backgroundColor: c.shades?.['700']?.hex || '#94a3b8' }} />
                    ))}
                  </div>
              </div>
            </div>
            {isFormDisabled && (
                <div className="mt-4 p-3 text-center bg-yellow-100 dark:bg-yellow-900/40 rounded-lg border border-dashed border-yellow-300 dark:border-yellow-800">
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 flex items-center justify-center gap-2">
                        <Star size={16}/> Il piano Free include 1 solo progetto.
                    </p>
                    <button className="font-bold text-sm text-yellow-900 dark:text-yellow-100 underline hover:opacity-80">Passa a Pro per progetti illimitati!</button>
                </div>
            )}
          </div>
          <div className="pt-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Progetti Esistenti</h3>
              {progetti.length > 0 ? (
                <div className="max-h-64 overflow-y-auto pr-2">
                  <ul className="space-y-2">
                    {progetti.map(proj => {
                      const colorObject = projectColorPalette.find(c => c.base === proj.color) || projectColorPalette[0];
                      const bgColor = colorObject?.shades?.['700']?.hex || '#94a3b8';
                      return (
                        <li key={proj.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: bgColor }}></div>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">{proj.nome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleStartEdit(proj)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full" title="Modifica"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(proj.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full" title="Elimina"><Trash2 size={16}/></button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">Nessun progetto creato.</p>
              )}
          </div>
      </div>
    </BaseModal>
  );
};