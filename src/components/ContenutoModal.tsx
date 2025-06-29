import React, { useState, useEffect } from 'react';
import { format as formatDateFns } from 'date-fns';
import { X, Trash2, ExternalLink, Copy } from 'lucide-react';
import type { Post, Progetto } from '../types';

interface ContenutoModalProps {
  post?: Post;
  progetti: Progetto[];
  userPlan: 'free' | 'pro';
  onClose: () => void;
  onSave: (dataToSave: any) => void;
  onDelete: (postId: string) => void;
  onDuplicate: (post: Post) => void;
}

export const ContenutoModal: React.FC<ContenutoModalProps> = ({ post, progetti, userPlan, onClose, onSave, onDelete, onDuplicate }) => {
  const isEditMode = !!post;

  const [libro, setLibro] = useState(post?.libro || (progetti.length > 0 ? progetti[0].nome : ''));
  const [piattaforma, setPiattaforma] = useState(post?.piattaforma || 'Instagram');
  const [tipoContenuto, setTipoContenuto] = useState(post?.tipoContenuto || '');
  const [descrizione, setDescrizione] = useState(post?.descrizione || '');
  const [urlMedia, setUrlMedia] = useState(post?.urlMedia || '');
  const [data, setData] = useState(post?.data ? formatDateFns(post.data.toDate(), "yyyy-MM-dd'T'HH:mm") : "");
  const [isProdotto, setIsProdotto] = useState(post?.statoProdotto || false);
  const [isPubblicato, setIsPubblicato] = useState(post?.statoPubblicato || false);

  const handleProdottoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsProdotto(checked);
    if (!checked) setIsPubblicato(false);
  };

  const handlePubblicatoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsPubblicato(checked);
    if (checked) setIsProdotto(true);
  };

  const handleSaveChanges = () => {
    if (!data && !isEditMode) {
      alert("Per favore, inserisci una data per il nuovo post.");
      return;
    }
    const dataToSave: any = {
      libro, piattaforma, tipoContenuto, descrizione, urlMedia,
      data: new Date(data), statoProdotto: isProdotto, statoPubblicato: isPubblicato,
    };
    onSave(dataToSave);
  };

  const handleDelete = () => {
    if (isEditMode && post) { if (window.confirm(`Sei sicuro di voler eliminare il post per "${post.libro}"?`)) onDelete(post.id); }
  };

  const handleDuplicate = () => {
    if (isEditMode && post) {
      if (userPlan !== 'pro') {
        alert("La duplicazione dei post è una funzionalità Pro.");
        return;
      }
      onDuplicate(post);
    }
  };
  
  const handlePublishRedirect = () => {
    const urls: { [key: string]: string } = { 'Instagram': 'https://www.instagram.com/', 'X': 'https://x.com/compose/post', 'YouTube': 'https://studio.youtube.com/', 'TikTok': 'https://www.tiktok.com/upload', 'Threads': 'https://www.threads.net/' };
    const url = urls[piattaforma] || 'https://google.com';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const inputBaseStyle = "w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-600 focus:ring-0 focus:border-red-600 dark:focus:border-red-500 transition-colors py-2 text-gray-800 dark:text-gray-200";
  const selectStyle = `${inputBaseStyle} dark:bg-gray-800`;
  const labelStyle = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white p-6 md:p-8 rounded-lg w-full max-w-2xl shadow-2xl border border-gray-200 dark:bg-gray-800" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-light tracking-widest text-gray-600 dark:text-gray-300 uppercase">{isEditMode ? 'Dettagli Post' : 'Nuovo Post'}</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>
        
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="libro" className={labelStyle}>Libro / Progetto</label>
              <select id="libro" value={libro} onChange={e => setLibro(e.target.value)} className={selectStyle}>
                {progetti.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="piattaforma" className={labelStyle}>Piattaforma</label>
               <select id="piattaforma" value={piattaforma} onChange={e => setPiattaforma(e.target.value)} className={selectStyle}>
                <option>Instagram</option><option>X</option><option>Threads</option><option>TikTok</option><option>YouTube</option>
              </select>
            </div>
          </div>
          <div><label htmlFor="data" className={labelStyle}>Data Pubblicazione</label><input id="data" type="datetime-local" value={data} onChange={e => setData(e.target.value)} className={inputBaseStyle} /></div>
          <div>
            <label htmlFor="tipoContenuto" className={labelStyle}>Tipo Contenuto</label>
            <select id="tipoContenuto" value={tipoContenuto} onChange={e => setTipoContenuto(e.target.value)} className={selectStyle}>
                <option value="">Seleziona un tipo...</option>
                <optgroup label="Testo"><option value="Testo breve con Immagine">Testo breve con Immagine</option></optgroup>
                <optgroup label="Immagine"><option value="Immagine/Carosello">Immagine/Carosello</option></optgroup>
                <optgroup label="Video"><option value="Reel">Reel</option><option value="Booktrailer">Booktrailer</option><option value="Podcast">Podcast</option><option value="Vlog">Vlog</option></optgroup>
            </select>
          </div>
          <div><label htmlFor="descrizione" className={labelStyle}>Descrizione / Testo</label><textarea id="descrizione" value={descrizione} onChange={e => setDescrizione(e.target.value)} rows={3} className={`${inputBaseStyle} resize-none`}/></div>
          <div>
            <label htmlFor="urlMedia" className={labelStyle}>URL Media</label>
            <div className="flex items-center gap-2">
              <input id="urlMedia" type="text" value={urlMedia} onChange={e => setUrlMedia(e.target.value)} className={inputBaseStyle} placeholder="https://..."/>
              <a href={urlMedia && !urlMedia.startsWith('http') ? `https://${urlMedia}` : urlMedia} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-md ${!urlMedia ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                <ExternalLink size={18} className="text-gray-600 dark:text-gray-300" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-8 pt-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isProdotto} onChange={handleProdottoChange} className="h-4 w-4 rounded-sm border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-red-600 focus:ring-red-500" /><span className="font-medium text-gray-700 dark:text-gray-300">Prodotto</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isPubblicato} onChange={handlePubblicatoChange} className="h-4 w-4 rounded-sm border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-red-600 focus:ring-red-500" /><span className="font-medium text-gray-700 dark:text-gray-300">Pubblicato</span></label>
          </div>
        </div>
        <div className="mt-8 pt-5 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            {isEditMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={handleDelete} className="w-full justify-center font-semibold text-white bg-red-600 border border-red-600 py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                  <Trash2 size={16} /> Elimina
                </button>
                <button onClick={handleDuplicate} disabled={userPlan !== 'pro'} className="w-full justify-center font-semibold text-gray-700 bg-gray-100 border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2" title={userPlan !== 'pro' ? 'Funzionalità Pro' : 'Duplica Post'}>
                  <Copy size={16} /> Duplica
                </button>
              </div>
            )}
          </div>
          <div className={`grid gap-3 w-full sm:w-auto ${isEditMode ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
            {isEditMode && post && ( <button onClick={handlePublishRedirect} className="w-full justify-center font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"><ExternalLink size={16} /> Pubblica</button> )}
            <button onClick={handleSaveChanges} className="w-full justify-center font-semibold text-white bg-gray-800 dark:bg-gray-50 dark:text-gray-900 py-2 px-4 rounded-lg hover:bg-black dark:hover:bg-white transition-colors">
              {isEditMode ? 'Salva' : 'Crea Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};