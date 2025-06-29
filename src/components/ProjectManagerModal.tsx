import React, { useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import type { Progetto } from '../types';

interface ProjectManagerModalProps {
  progetti: Progetto[];
  onClose: () => void;
  onAddProject: (newProjectData: { nome: string; sintesi: string; immagineUrl: string }) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({ progetti, onClose, onAddProject, onDeleteProject }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSintesi, setNewProjectSintesi] = useState('');
  const [newProjectImmagine, setNewProjectImmagine] = useState('');

  const handleAdd = () => {
    if (newProjectName.trim() === '') {
      alert('Il nome del progetto non può essere vuoto.');
      return;
    }
    onAddProject({
      nome: newProjectName.trim(),
      sintesi: newProjectSintesi.trim(),
      immagineUrl: newProjectImmagine.trim()
    });
    setNewProjectName('');
    setNewProjectSintesi('');
    setNewProjectImmagine('');
  };

  const handleDelete = (projectId: string, projectName: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il progetto "${projectName}"? Questa azione non eliminerà i post già associati, che però potrebbero non essere più raggruppati correttamente.`)) {
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

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-3">
            {/* Sezione Aggiungi Nuovo Progetto */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">Aggiungi Nuovo Progetto</h3>
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <div>
                  <label htmlFor="newProjectName" className={labelStyle}>Nome Progetto / Libro</label>
                  <input id="newProjectName" type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Es. Riflessi di Desiderio" className={inputStyle} />
                </div>
                <div>
                  <label htmlFor="newProjectSintesi" className={labelStyle}>Sintesi (opzionale)</label>
                  <textarea id="newProjectSintesi" value={newProjectSintesi} onChange={(e) => setNewProjectSintesi(e.target.value)} rows={2} placeholder="Breve descrizione del progetto..." className={`${inputStyle} resize-none`}/>
                </div>
                <div>
                  <label htmlFor="newProjectImmagine" className={labelStyle}>URL Immagine Copertina (opzionale)</label>
                  <input id="newProjectImmagine" type="text" value={newProjectImmagine} onChange={(e) => setNewProjectImmagine(e.target.value)} placeholder="https://..." className={inputStyle} />
                </div>
                <div className="flex justify-end pt-2">
                    <button onClick={handleAdd} className="font-semibold text-white bg-gray-800 dark:bg-gray-50 dark:text-gray-900 py-2 px-4 rounded-lg hover:bg-black dark:hover:bg-white transition-colors flex items-center gap-2">
                        <Plus size={18} /> Aggiungi Progetto
                    </button>
                </div>
              </div>
            </div>

            {/* Sezione Progetti Esistenti */}
            <div>
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">Progetti Esistenti</h3>
                {progetti.length > 0 ? (
                    <ul className="space-y-2">
                    {progetti.map(proj => (
                      <li key={proj.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                        <span className="text-gray-800 dark:text-gray-200 font-semibold">{proj.nome}</span>
                        <button onClick={() => handleDelete(proj.id, proj.nome)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">Nessun progetto creato. Inizia aggiungendone uno!</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};