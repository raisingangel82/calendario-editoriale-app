import React, { useState, useEffect } from 'react';
import { format as formatDateFns } from 'date-fns';
// ▼▼▼ MODIFICA: Aggiunta l'icona "Send" per il pulsante pubblica ▼▼▼
import { X, Trash2, Copy, UploadCloud, Download, Send } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { freePlatforms, allDefaultPlatforms } from '../data/defaultPlatforms';
import type { PlatformData } from '../data/defaultPlatforms';
import type { Post, Progetto } from '../types';

interface ContenutoModalProps {
  post?: Post;
  progetti: Progetto[];
  onClose: () => void;
  onSave: (dataToSave: any) => void;
  onDelete: (postId: string) => void;
  onDuplicate: (post: Post) => void;
}

export const ContenutoModal: React.FC<ContenutoModalProps> = ({ post, progetti, onClose, onSave, onDelete, onDuplicate }) => {
  const { user } = useAuth();
  const [customPlatforms, setCustomPlatforms] = useState<PlatformData[]>([]);

  useEffect(() => {
    if (user?.plan === 'pro') {
      const fetchCustomPlatforms = async () => {
        if (!user) return;
        const q = query(collection(db, "platforms"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedPlatforms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformData));
        setCustomPlatforms(fetchedPlatforms);
      };
      fetchCustomPlatforms();
    }
  }, [user]);

  const availablePlatforms = user?.plan === 'pro'
    ? [...allDefaultPlatforms, ...customPlatforms]
    : freePlatforms;

  const isEditMode = !!post;

  const [projectId, setProjectId] = useState(post?.projectId || (progetti.length > 0 ? progetti[0].id : ''));
  const [piattaforma, setPiattaforma] = useState(post?.piattaforma || (availablePlatforms.length > 0 ? availablePlatforms[0].name : ''));
  const [tipoContenuto, setTipoContenuto] = useState(post?.tipoContenuto || '');
  const [descrizione, setDescrizione] = useState(post?.descrizione || '');
  const [primoCommento, setPrimoCommento] = useState(post?.primoCommento || '');
  const [urlMedia, setUrlMedia] = useState(post?.urlMedia || '');
  const [data, setData] = useState(post?.data ? formatDateFns(post.data.toDate(), "yyyy-MM-dd'T'HH:mm") : "");
  const [isProdotto, setIsProdotto] = useState(post?.statoProdotto || false);
  const [isPubblicato, setIsPubblicato] = useState(post?.statoPubblicato || false);

  // ▼▼▼ MODIFICA: Logica per trovare l'URL di pubblicazione della piattaforma selezionata ▼▼▼
  const publishUrl = availablePlatforms.find(p => p.name === piattaforma)?.publishUrl;

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
      projectId, piattaforma, tipoContenuto, descrizione, primoCommento, urlMedia,
      data: new Date(data), statoProdotto: isProdotto, statoPubblicato: isPubblicato,
    };
    onSave(dataToSave);
  };

  const handleDelete = () => { if (isEditMode && post) { if (window.confirm(`Sei sicuro di voler eliminare questo post?`)) onDelete(post.id); }};
  const handleDuplicate = () => { if (isEditMode && post && user?.plan === 'pro') { onDuplicate(post); } else { alert("La duplicazione dei post è una funzionalità Pro."); }};

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
      <div className="bg-slate-50 p-6 md:p-8 rounded-lg w-full max-w-2xl shadow-2xl border border-gray-200 dark:bg-gray-800" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-light tracking-widest text-gray-600 dark:text-gray-300 uppercase">{isEditMode ? 'Dettagli Post' : 'Nuovo Post'}</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
        </div>
        
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label htmlFor="project-select" className={labelStyle}>Libro / Progetto</label><select id="project-select" value={projectId} onChange={e => setProjectId(e.target.value)} className={selectStyle}>{progetti.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
            <div><label htmlFor="piattaforma" className={labelStyle}>Piattaforma</label><select id="piattaforma" value={piattaforma} onChange={e => setPiattaforma(e.target.value)} className={selectStyle}>{availablePlatforms.map(platform => (<option key={platform.id} value={platform.name}>{platform.name}</option>))}</select></div>
          </div>
          <div><label htmlFor="data" className={labelStyle}>Data Pubblicazione</label><input id="data" type="datetime-local" value={data} onChange={e => setData(e.target.value)} className={inputBaseStyle} /></div>
          <div><label htmlFor="tipoContenuto" className={labelStyle}>Tipo Contenuto</label><select id="tipoContenuto" value={tipoContenuto} onChange={e => setTipoContenuto(e.target.value)} className={selectStyle}><option value="">Seleziona un tipo...</option><optgroup label="Testo"><option value="Testo breve con Immagine">Testo breve con Immagine</option></optgroup><optgroup label="Immagine"><option value="Immagine/Carosello">Immagine/Carosello</option></optgroup><optgroup label="Video"><option value="Reel">Reel</option><option value="Booktrailer">Booktrailer</option><option value="Podcast">Podcast</option><option value="Vlog">Vlog</option></optgroup></select></div>
          <div><label htmlFor="descrizione" className={labelStyle}>Descrizione / Testo</label><textarea id="descrizione" value={descrizione} onChange={e => setDescrizione(e.target.value)} rows={3} className={`${inputBaseStyle} resize-none`}/></div>
          <div><label htmlFor="primoCommento" className={labelStyle}>Primo Commento</label><textarea id="primoCommento" value={primoCommento} onChange={e => setPrimoCommento(e.target.value)} rows={2} className={`${inputBaseStyle} resize-none`} placeholder="Testo da inserire nel primo commento (es. per hashtag)..."/></div>
          <div><label htmlFor="urlMedia" className={labelStyle}>Pannello di Controllo Media</label><div className="flex items-center gap-2 mt-2"><input id="urlMedia" type="text" value={urlMedia} onChange={e => setUrlMedia(e.target.value)} className={inputBaseStyle} placeholder="Incolla qui il link al tuo media..."/><a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" title="Carica su Google Drive" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><UploadCloud size={18} className="text-gray-600 dark:text-gray-300" /></a><a href={urlMedia && !urlMedia.startsWith('http') ? `https://${urlMedia}` : urlMedia} target="_blank" rel="noopener noreferrer" title="Scarica/Visualizza Media" className={`p-2 rounded-md transition-colors ${!urlMedia ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}><Download size={18} className="text-gray-600 dark:text-gray-300" /></a></div></div>
          <div className="flex items-center gap-8 pt-4"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isProdotto} onChange={handleProdottoChange} className="h-4 w-4 rounded-sm border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-red-600 focus:ring-red-500" /><span className="font-medium text-gray-700 dark:text-gray-300">Prodotto</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isPubblicato} onChange={handlePubblicatoChange} className="h-4 w-4 rounded-sm border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-red-600 focus:ring-red-500" /><span className="font-medium text-gray-700 dark:text-gray-300">Pubblicato</span></label></div>
        </div>
        
        <div className="mt-8 pt-5 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            {isEditMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={handleDelete} className="w-full justify-center font-semibold text-white bg-red-600 border border-red-600 py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"><Trash2 size={16} /> Elimina</button>
                <button onClick={handleDuplicate} disabled={user?.plan !== 'pro'} className="w-full justify-center font-semibold text-gray-700 bg-gray-100 border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2" title={user?.plan !== 'pro' ? 'Funzionalità Pro' : 'Duplica Post'}><Copy size={16} /> Duplica</button>
              </div>
            )}
          </div>
          {/* ▼▼▼ MODIFICA: Aggiunto il pulsante Pubblica e cambiata la griglia a 3 colonne ▼▼▼ */}
          <div className={`grid w-full sm:w-auto gap-3 ${isEditMode ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <button type="button" onClick={onClose} className="w-full justify-center font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Annulla</button>
            
            {isEditMode && (
              <a 
                href={publishUrl || '#'}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => !publishUrl && e.preventDefault()}
                className={`w-full justify-center font-semibold text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors ${publishUrl ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'}`}
                title={publishUrl ? 'Vai alla pagina di creazione post' : 'URL di pubblicazione non impostato per questa piattaforma'}
              >
                <Send size={16} /> Pubblica
              </a>
            )}

            <button onClick={handleSaveChanges} className="w-full justify-center font-semibold text-white bg-gray-800 dark:bg-slate-50 dark:text-gray-900 py-2 px-4 rounded-lg hover:bg-black dark:hover:bg-white transition-colors">
              {isEditMode ? 'Salva' : 'Crea Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};