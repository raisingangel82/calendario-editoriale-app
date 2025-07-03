import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Edit, Ban } from 'lucide-react';
import type { Progetto } from '../types';
import { projectColorPalette } from '../data/colorPalette';

interface ProjectManagerModalProps {
  progetti: Progetto[];
  onClose: () => void;
  onAddProject: (newProjectData: { nome: string; sintesi: string; immagineUrl: string; color: string; }) => void;
  onUpdateProject: (projectId: string, updatedData: { nome: string; sintesi: string; immagineUrl: string; color: string; }) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({ progetti, onClose, onAddProject, onUpdateProject, onDeleteProject }) => {
  const [nome, setNome] = useState('');
  const [sintesi, setSintesi] = useState('');
  const [immagineUrl, setImmagineUrl] = useState('');
  const [color, setColor] = useState(projectColorPalette[0].base);

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (editingId) {
      const projectToEdit = progetti.find(p => p.id === editingId);
      if (projectToEdit) {
        setNome(projectToEdit.nome);
        setSintesi(projectToEdit.sintesi || '');
        setImmagineUrl(projectToEdit.immagineUrl || '');
        setColor(projectToEdit.color || projectColorPalette[0].base);
      }
    } else {
      resetForm();
    }
  }, [editingId, progetti]);

  const resetForm = () => {
    setNome('');
    setSintesi('');
    setImmagineUrl('');
    setColor(projectColorPalette[0].base);
    setEditingId(null);
  };

  const handleSave = () => {
    if (nome.trim() === '') {
      alert('Il nome del progetto non può essere vuoto.');
      return;
    }
    const projectData = {
      nome: nome.trim(),
      sintesi: sintesi.trim(),
      immagineUrl: immagineUrl.trim(),
      color: color,
    };

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

  const handleDelete = (projectId: string, projectName: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il progetto "${projectName}"? Questa azione non eliminerà i post già associati.`)) {
      onDeleteProject(projectId);
    }
  };

  const inputStyle = "w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-600 focus:ring-0 focus:border-red-600 dark:focus:border-red-500 transition-colors py-2 text-gray-800 dark:text-gray-200";
  const labelStyle = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white p-6 md:p-8 rounded-lg w-full max-w-2xl shadow-2xl border border-gray-200 dark:bg-gray-800" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-light tracking-widest text-gray-600 dark:text-gray-300 uppercase">Gestisci Progetti</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-3 custom-scrollbar">
            {/* ... qui dentro rimangono il form e la lista dei progetti ... */}
        </div>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-3">
            {/* Sezione per Aggiungere o Modificare un Progetto */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">{editingId ? `Modifica Progetto: ${nome}` : 'Aggiungi Nuovo Progetto'}</h3>
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <div>
                  <label htmlFor="projectName" className={labelStyle}>Nome Progetto / Libro</label>
                  <input id="projectName" type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Riflessi di Desiderio" className={inputStyle} />
                </div>
                
                <div>
                    <label className={labelStyle}>Colore Progetto</label>
                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-2 pt-2">
                        {projectColorPalette.map(c => (
                            <button
                                key={c.base}
                                type="button"
                                title={c.name}
                                onClick={() => setColor(c.base)}
                                className={`w-8 h-8 rounded-full ${c.shades['700']} transition-transform hover:scale-110 ${color === c.base ? 'ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-800/50 ring-red-500' : ''}`}
                            />
                        ))}
                    </div>
                </div>

                <div>
                  <label htmlFor="projectSintesi" className={labelStyle}>Sintesi (opzionale)</label>
                  <textarea id="projectSintesi" value={sintesi} onChange={(e) => setSintesi(e.target.value)} rows={2} placeholder="Breve descrizione del progetto..." className={`${inputStyle} resize-none`}/>
                </div>
                <div>
                  <label htmlFor="projectImmagine" className={labelStyle}>URL Immagine Copertina (opzionale)</label>
                  <input id="projectImmagine" type="text" value={immagineUrl} onChange={(e) => setImmagineUrl(e.target.value)} placeholder="https://..." className={inputStyle} />
                </div>
                <div className="flex justify-end pt-2 gap-3">
                    {editingId && (
                        <button onClick={resetForm} className="font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center gap-2">
                           <Ban size={18} /> Annulla Modifica
                        </button>
                    )}
                    <button onClick={handleSave} className="font-semibold text-white bg-gray-800 dark:bg-gray-50 dark:text-gray-900 py-2 px-4 rounded-lg hover:bg-black dark:hover:bg-white transition-colors flex items-center gap-2">
                        {editingId ? 'Salva Modifiche' : <><Plus size={18}/> Aggiungi Progetto</>}
                    </button>
                </div>
              </div>
            </div>

            {/* Sezione Lista Progetti Esistenti */}
            <div>
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">Progetti Esistenti</h3>
                {progetti.length > 0 ? (
                    <ul className="space-y-2">
                    {progetti.map(proj => {
                      const projColor = projectColorPalette.find(c => c.base === proj.color) || projectColorPalette[0];
                      return (
                      <li key={proj.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                        <div className="flex items-center gap-3">
                           <div className={`w-4 h-4 rounded-full ${projColor.shades['700']}`}></div>
                           <span className="text-gray-800 dark:text-gray-200 font-semibold">{proj.nome}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleStartEdit(proj)} className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" title="Modifica"> <Edit size={16} /> </button>
                          <button onClick={() => handleDelete(proj.id, proj.nome)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" title="Elimina"> <Trash2 size={16} /> </button>
                        </div>
                      </li>
                    )})}
                  </ul>
                ) : (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">Nessun progetto creato.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};