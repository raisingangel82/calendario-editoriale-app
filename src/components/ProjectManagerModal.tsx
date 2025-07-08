import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Edit, Ban, Save } from 'lucide-react';
import type { Progetto } from '../types';
import { projectColorPalette } from '../data/colorPalette';
import { BaseModal } from './BaseModal';
import { useTheme } from '../contexts/ThemeContext';

interface ProjectManagerModalProps {
  progetti: Progetto[];
  onClose: () => void;
  onAddProject: (newProjectData: { nome: string; color: string; }) => void;
  onUpdateProject: (projectId: string, updatedData: { nome: string; color: string; }) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({ progetti, onClose, onAddProject, onUpdateProject, onDeleteProject }) => {
  const [nome, setNome] = useState('');
  const [color, setColor] = useState(projectColorPalette[0].base);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { getActiveColor } = useTheme();

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

  const resetForm = () => { setNome(''); setColor(projectColorPalette[0].base); setEditingId(null); };
  const handleSave = () => {
    if (nome.trim() === '') return;
    const projectData = { nome: nome.trim(), color: color };
    if (editingId) {
      onUpdateProject(editingId, projectData);
    } else {
      onAddProject(projectData);
    }
    resetForm();
  };
  const handleStartEdit = (proj: Progetto) => setEditingId(proj.id);
  const handleDelete = (projectId: string) => {
    // Qui si potrebbe inserire un modale di conferma
    onDeleteProject(projectId);
  };

  const inputStyle = "w-full p-3 bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base text-gray-900 dark:text-gray-100";
  const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  // --- INIZIO SEZIONE MODIFICATA ---
  const footerContent = (
    // Su mobile (default), i pulsanti sono in riga e si dividono lo spazio grazie a `flex-1`.
    // Su schermi più grandi (`sm:`), l'allineamento torna a destra e la larghezza dei pulsanti è automatica.
    <div className="flex w-full justify-end gap-3">
        {editingId ? (
             <button
                onClick={resetForm}
                className="flex-1 sm:flex-initial justify-center px-6 py-3 text-base font-medium rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
             >
                <Ban size={16} /> Annulla
             </button>
        ) : (
            <button
                onClick={onClose}
                className="flex-1 sm:flex-initial justify-center px-6 py-3 text-base font-medium rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            >
                Chiudi
            </button>
        )}
        <button
            onClick={handleSave}
            className={`flex-1 sm:flex-initial justify-center px-6 py-3 text-base font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${getActiveColor('bg')} hover:opacity-90`}
        >
            {editingId ? <><Save size={16}/> Salva</> : <><Plus size={16}/> Aggiungi</>}
        </button>
    </div>
  );
  // --- FINE SEZIONE MODIFICATA ---

  return (
    <BaseModal isOpen={true} onClose={onClose} title="Gestisci Progetti" footer={footerContent}>
      <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{editingId ? `Modifica: ${nome}` : 'Aggiungi Nuovo Progetto'}</h3>
            <div className="space-y-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
              <div><label htmlFor="projectName" className={labelStyle}>Nome Progetto</label><input id="projectName" type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Riflessi di Desiderio" className={inputStyle} /></div>
              <div>
                  <label className={labelStyle}>Colore</label>
                  <div className="grid grid-cols-8 sm:grid-cols-11 gap-2 pt-2">{projectColorPalette.map(c => (<button key={c.base} type="button" title={c.name} onClick={() => setColor(c.base)} style={{ backgroundColor: c.shades?.['700']?.hex || '#94a3b8' }} className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${color === c.base ? `ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-slate-800/50 ${getActiveColor('ring')}` : ''}`} />))}</div>
              </div>
            </div>
          </div>
          <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Progetti Esistenti</h3>
              {progetti.length > 0 ? (
                // *** CORREZIONE CHIAVE: Contenitore scrollabile per la lista ***
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