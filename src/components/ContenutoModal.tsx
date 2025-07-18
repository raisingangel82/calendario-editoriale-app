import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format as formatDateFns, parseISO } from 'date-fns';
import { Trash2, Copy, Check, ArrowRight, Save, Plus, ArrowLeft, ExternalLink, Cloud, Send } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { freePlatforms, allDefaultPlatforms, type PlatformData } from '../data/defaultPlatforms';
import type { Post, Progetto } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { BaseModal } from './BaseModal';

interface ContenutoModalProps {
  post?: Post;
  progetti: Progetto[];
  onClose: () => void;
  onSave: (dataToSave: any) => void;
  onDelete: (postId: string) => void;
  onDuplicate: (post: Post) => void;
}

const FormPage = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-6 h-full animate-fade-in">{children}</div>
);

export const ContenutoModal: React.FC<ContenutoModalProps> = ({ post, progetti, onClose, onSave, onDelete, onDuplicate }) => {
  const { user } = useAuth();
  const { getActiveColor, getActiveColorHex } = useTheme();
  
  const [currentPage, setCurrentPage] = useState(0);
  const [customPlatforms, setCustomPlatforms] = useState<PlatformData[]>([]);
  const [isDescCopied, setIsDescCopied] = useState(false);
  const [isCommentCopied, setIsCommentCopied] = useState(false);
  const userCloudServiceUrl = "https://drive.google.com/";

  // @ts-ignore
  const availablePlatforms = user?.plan === 'pro' ? [...allDefaultPlatforms, ...customPlatforms] : freePlatforms;
  const isEditMode = !!post;

  const [projectId, setProjectId] = useState('');
  const [piattaforma, setPiattaforma] = useState('');
  const [tipoContenuto, setTipoContenuto] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [primoCommento, setPrimoCommento] = useState('');
  const [urlMedia, setUrlMedia] = useState('');
  const [data, setData] = useState('');
  const [isProdotto, setIsProdotto] = useState(false);
  const [isPubblicato, setIsPubblicato] = useState(false);
  const [isMontato, setIsMontato] = useState(false);

  const selectedPlatform = useMemo(() => {
    return availablePlatforms.find(p => p.name === piattaforma);
  }, [piattaforma, availablePlatforms]);

  const showMontatoTick = useMemo(() => {
    const mediaTypes = ["Immagine/Carosello", "Reel", "Booktrailer", "Podcast", "Vlog"];
    return mediaTypes.includes(tipoContenuto);
  }, [tipoContenuto]);
  
  useEffect(() => {
    if (post) {
        setProjectId(post.projectId || (progetti.length > 0 ? progetti[0].id : ''));
        setPiattaforma(post.piattaforma || (availablePlatforms.length > 0 ? availablePlatforms[0].name : ''));
        setTipoContenuto(post.tipoContenuto || '');
        setDescrizione(post.descrizione || '');
        setPrimoCommento(post.primoCommento || '');
        setUrlMedia(post.urlMedia || '');
        setData(post.data ? formatDateFns(post.data.toDate(), "yyyy-MM-dd'T'HH:mm") : "");
        setIsProdotto(post.statoProdotto || false);
        setIsPubblicato(post.statoPubblicato || false);
        setIsMontato(post.statoMontato || false);
    } else {
        setProjectId(progetti.length > 0 ? progetti[0].id : '');
        setPiattaforma(availablePlatforms.length > 0 ? availablePlatforms[0].name : '');
        setTipoContenuto('');
        setDescrizione('');
        setPrimoCommento('');
        setUrlMedia('');
        setData(''); 
        setIsProdotto(false);
        setIsPubblicato(false);
        setIsMontato(false);
    }
    setCurrentPage(0);
  }, [post]);
  
  useEffect(() => {
    // @ts-ignore
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

  const handleCopy = (textToCopy: string, type: 'desc' | 'comment') => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      if (type === 'desc') setIsDescCopied(true); else setIsCommentCopied(true);
      setTimeout(() => { setIsDescCopied(false); setIsCommentCopied(false); }, 2000);
    });
  };
  
  const handleProdottoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsProdotto(e.target.checked);
    if (!e.target.checked) {
      setIsMontato(false);
      setIsPubblicato(false);
    }
  };
  
  const handlePubblicatoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPubblicato(e.target.checked);
    if (e.target.checked) {
      setIsProdotto(true);
      if (showMontatoTick) {
        setIsMontato(true);
      }
    }
  };

  // ▼▼▼ MODIFICA CHIAVE ▼▼▼
  // Ora questa funzione passa la data come stringa, senza convertirla.
  const handleSaveChanges = () => {
    const dataToSave: any = {
      projectId, piattaforma, tipoContenuto, descrizione, primoCommento, urlMedia,
      data, // Passiamo la stringa della data così com'è
      statoProdotto: isProdotto,
      statoPubblicato: isPubblicato,
      statoMontato: isMontato,
    };
    onSave(dataToSave);
  };

  const handleDelete = () => { if (isEditMode && post) onDelete(post.id); };
  // @ts-ignore
  const handleDuplicate = () => { if (isEditMode && post && user?.plan === 'pro') onDuplicate(post); };

  const inputBaseStyle = "w-full bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelStyle = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2";

  const footerContent = (
    <div className="flex w-full flex-wrap items-center justify-center sm:justify-between gap-4">
      <div className="flex items-center justify-around sm:justify-start w-full sm:w-auto order-2 sm:order-1 sm:gap-2">
        {isEditMode && <button onClick={handleDelete} className="p-3 bg-red-600/10 text-red-600 rounded-lg hover:bg-red-600/20 transition-colors" title="Elimina Post"><Trash2 size={20} /></button>}
        
        {isEditMode && (
            // @ts-ignore
            user?.plan === 'pro' ? (
                <button onClick={handleDuplicate} className="p-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors" title="Duplica Post (Pro)">
                    <Copy size={20} />
                </button>
            ) : (
                <Link to="/upgrade" onClick={onClose}>
                    <span className="p-3 block bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors opacity-50" title="Duplica Post (Funzionalità Pro)">
                        <Copy size={20} />
                    </span>
                </Link>
            )
        )}

        <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-slate-600"></div>
        <button onClick={() => window.open(userCloudServiceUrl, '_blank')} className="p-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors" title="Apri il servizio cloud"><Cloud size={20} /></button>
        <button onClick={() => urlMedia && window.open(urlMedia, '_blank')} disabled={!urlMedia} className="p-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Apri il link del media"><ExternalLink size={20} /></button>
        <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-slate-600"></div>
        <button onClick={() => selectedPlatform?.publishUrl && window.open(selectedPlatform.publishUrl, '_blank')} disabled={!selectedPlatform?.publishUrl} className="p-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={selectedPlatform?.publishUrl ? `Pubblica su ${selectedPlatform.name}` : 'Nessun link di pubblicazione per questa piattaforma'}><Send size={20} /></button>
      </div>
      <div className="flex items-center gap-2 order-1 sm:order-2 w-full justify-center sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2">
        {[0, 1, 2].map(pageIndex => (<button key={pageIndex} onClick={() => setCurrentPage(pageIndex)} className={`h-2 rounded-full transition-all ${currentPage === pageIndex ? 'w-6' : 'w-2'}`} style={{ backgroundColor: currentPage === pageIndex ? getActiveColorHex() : '#9ca3af' }} />))}
      </div>
      <div className="flex items-center gap-3 order-3 w-full sm:w-auto">
        {currentPage > 0 && <button onClick={() => setCurrentPage(currentPage - 1)} className="flex-1 sm:flex-none px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-600 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors flex items-center justify-center gap-2"> <ArrowLeft size={18} /> Indietro</button>}
        {currentPage < 2 ? 
          <button onClick={() => setCurrentPage(currentPage + 1)} className={`flex-1 px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:opacity-90 flex items-center gap-2 justify-center`}>Avanti <ArrowRight size={18} /></button>
          :
          <button onClick={handleSaveChanges} className={`flex-1 px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:opacity-90 flex items-center gap-2 justify-center`}>{isEditMode ? <Save size={18}/> : <Plus size={18}/>}{isEditMode ? 'Salva' : 'Crea'}</button>
        }
      </div>
    </div>
  );

  return (
    <BaseModal isOpen={true} onClose={onClose} title={isEditMode ? 'Dettagli Post' : 'Nuovo Post'} footer={footerContent}>
      <div>
        {currentPage === 0 && (
          <FormPage>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div><label htmlFor="project-select" className={labelStyle}>Progetto</label><select id="project-select" value={projectId} onChange={e => setProjectId(e.target.value)} className={inputBaseStyle}>{progetti.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
              <div><label htmlFor="piattaforma" className={labelStyle}>Piattaforma</label><select id="piattaforma" value={piattaforma} onChange={e => setPiattaforma(e.target.value)} className={inputBaseStyle}>{availablePlatforms.map(platform => (<option key={platform.id} value={platform.name}>{platform.name}</option>))}</select></div>
            </div>
            <div><label htmlFor="data" className={labelStyle}>Data Pubblicazione</label><input id="data" type="datetime-local" value={data} onChange={e => setData(e.target.value)} className={inputBaseStyle} step="1800"/></div>
            <div><label htmlFor="tipoContenuto" className={labelStyle}>Tipo Contenuto</label><select id="tipoContenuto" value={tipoContenuto} onChange={e => setTipoContenuto(e.target.value)} className={inputBaseStyle}><option value="">Seleziona un tipo...</option><optgroup label="Testo"><option value="Testo breve con Immagine">Testo breve con Immagine</option></optgroup><optgroup label="Immagine"><option value="Immagine/Carosello">Immagine/Carosello</option></optgroup><optgroup label="Video"><option value="Reel">Reel</option><option value="Booktrailer">Booktrailer</option><option value="Podcast">Podcast</option><option value="Vlog">Vlog</option></optgroup></select></div>
          </FormPage>
        )}
        {currentPage === 1 && (
          <FormPage>
            <div>
              <div className="flex justify-between items-center mb-2"><label htmlFor="descrizione" className={labelStyle}>Descrizione / Testo</label><button onClick={() => handleCopy(descrizione, 'desc')} className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-200" title="Copia descrizione">{isDescCopied ? <Check size={16} className="text-green-500"/> : <Copy size={16} />}</button></div>
              <textarea id="descrizione" value={descrizione} onChange={e => setDescrizione(e.target.value)} rows={8} className={`${inputBaseStyle} h-48 resize-y`}/>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2"><label htmlFor="primoCommento" className={labelStyle}>Primo Commento</label><button onClick={() => handleCopy(primoCommento, 'comment')} className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-200" title="Copia commento">{isCommentCopied ? <Check size={16} className="text-green-500"/> : <Copy size={16} />}</button></div>
              <textarea id="primoCommento" value={primoCommento} onChange={e => setPrimoCommento(e.target.value)} rows={4} className={`${inputBaseStyle} h-24 resize-y`} placeholder="Testo da inserire nel primo commento..."/>
            </div>
          </FormPage>
        )}
        {currentPage === 2 && (
          <FormPage>
            <div><label htmlFor="urlMedia" className={labelStyle}>URL Media (Drive, Dropbox, etc.)</label><input id="urlMedia" type="text" value={urlMedia} onChange={e => setUrlMedia(e.target.value)} className={inputBaseStyle} placeholder="Incolla qui il link al tuo media..."/></div>
            <div className="pt-4">
              <label className={labelStyle}>Stato</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-slate-700/50 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={isProdotto} onChange={handleProdottoChange} className="h-5 w-5 rounded-sm border-gray-300 dark:border-slate-600 bg-transparent text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium text-gray-800 dark:text-gray-200">Creato</span>
                </label>
                {showMontatoTick && (
                  <label className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-slate-700/50 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={isMontato} onChange={e => setIsMontato(e.target.checked)} className="h-5 w-5 rounded-sm border-gray-300 dark:border-slate-600 bg-transparent text-blue-600 focus:ring-blue-500" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">Montato</span>
                  </label>
                )}
                <label className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-slate-700/50 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={isPubblicato} onChange={handlePubblicatoChange} className="h-5 w-5 rounded-sm border-gray-300 dark:border-slate-600 bg-transparent text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium text-gray-800 dark:text-gray-200">Pubblicato</span>
                </label>
              </div>
            </div>
          </FormPage>
        )}
      </div>
    </BaseModal>
  );
};