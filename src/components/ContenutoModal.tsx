import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { format as formatDateFns } from 'date-fns';
import { Trash2, Copy, Check, ArrowRight, Save, Plus, ArrowLeft, ExternalLink, FolderKanban } from 'lucide-react';
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

export const ContenutoModal: React.FC<ContenutoModalProps> = ({ post, progetti, onClose, onSave, onDelete, onDuplicate }) => {
  const { user } = useAuth();
  const { getActiveColor, getActiveColorHex } = useTheme();
  const [customPlatforms, setCustomPlatforms] = useState<PlatformData[]>([]);
  const [swiper, setSwiper] = useState<any>(null);
  
  const [isDescCopied, setIsDescCopied] = useState(false);
  const [isCommentCopied, setIsCommentCopied] = useState(false);
  const userCloudServiceUrl = "https://drive.google.com/";

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
    } else {
        setProjectId(progetti.length > 0 ? progetti[0].id : '');
        setPiattaforma(availablePlatforms.length > 0 ? availablePlatforms[0].name : '');
        setTipoContenuto(''); setDescrizione(''); setPrimoCommento(''); setUrlMedia(''); setData(''); setIsProdotto(false); setIsPubblicato(false);
    }
  }, [post, progetti, availablePlatforms]);

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

  // BUG FIX: Ripristinate le funzioni per la gestione degli eventi
  const handleCopy = (textToCopy: string, type: 'desc' | 'comment') => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      if (type === 'desc') setIsDescCopied(true); else setIsCommentCopied(true);
      setTimeout(() => { setIsDescCopied(false); setIsCommentCopied(false); }, 2000);
    });
  };
  
  const handleProdottoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsProdotto(checked);
    if (!checked) {
      setIsPubblicato(false);
    }
  };

  const handlePubblicatoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsPubblicato(checked);
    if (checked) {
      setIsProdotto(true);
    }
  };

  const handleSaveChanges = () => { if (!data && !isEditMode) { alert("Per favore, inserisci una data per il nuovo post."); return; } const dataToSave: any = { projectId, piattaforma, tipoContenuto, descrizione, primoCommento, urlMedia, data: new Date(data), statoProdotto: isProdotto, statoPubblicato: isPubblicato, }; onSave(dataToSave); };
  const handleDelete = () => { if (isEditMode && post) { if (window.confirm(`Sei sicuro di voler eliminare questo post?`)) onDelete(post.id); }};
  const handleDuplicate = () => { if (isEditMode && post && user?.plan === 'pro') onDuplicate(post); };

  const slideTo = (index: number) => swiper?.slideTo(index);

  const inputBaseStyle = "w-full bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelStyle = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2";
  const FormPage = ({ children }: { children: React.ReactNode }) => <div className="space-y-6 h-full">{children}</div>;

  const footerContent = (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {isEditMode && <button onClick={handleDelete} className="p-3 bg-red-600/10 text-red-600 rounded-lg hover:bg-red-600/20 transition-colors" title="Elimina Post"><Trash2 size={20} /></button>}
        {isEditMode && <button onClick={handleDuplicate} disabled={user?.plan !== 'pro'} className="p-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50" title="Duplica Post (Pro)"><Copy size={20} /></button>}
        
        <div className="h-6 w-px bg-gray-300 dark:bg-slate-600 mx-1"></div>
        
        <button 
            onClick={() => window.open(userCloudServiceUrl, '_blank')} 
            className="p-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
            title="Apri il servizio cloud configurato"
        >
            <FolderKanban size={20} />
        </button>
        <button 
            onClick={() => urlMedia && window.open(urlMedia, '_blank')}
            disabled={!urlMedia}
            className="p-3 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Apri il link del media in una nuova scheda"
        >
            <ExternalLink size={20} />
        </button>
      </div>
      
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="swiper-pagination-container !w-auto" />
      </div>

      <div className="flex items-center gap-3">
        {swiper?.activeIndex > 0 && <button onClick={() => slideTo(swiper.activeIndex - 1)} className="px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-600 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors flex items-center gap-2"> <ArrowLeft size={18} /> Indietro</button>}
        
        {swiper?.activeIndex < 2 ? 
          <button onClick={() => slideTo(swiper.activeIndex + 1)} className={`flex-1 px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:${getActiveColor('bg', '600')}`}>Avanti <ArrowRight size={18} className="inline"/></button>
          :
          <button onClick={handleSaveChanges} className={`flex-1 px-6 py-3 text-base font-medium text-white rounded-lg transition-colors ${getActiveColor('bg')} hover:${getActiveColor('bg', '600')}`}>{isEditMode ? <Save size={18} className="inline mr-2"/> : <Plus size={18} className="inline mr-2"/>}{isEditMode ? 'Salva' : 'Crea'}</button>
        }
      </div>
    </div>
  );

  return (
    <BaseModal isOpen={true} onClose={onClose} title={isEditMode ? 'Dettagli Post' : 'Nuovo Post'} footer={footerContent}>
        <Swiper 
            modules={[Pagination]} 
            pagination={{ el: '.swiper-pagination-container', clickable: true }} 
            onSwiper={setSwiper} 
            autoHeight={false} 
            className="w-full h-full"
            style={{
                '--swiper-pagination-color': getActiveColorHex(),
                '--swiper-pagination-bullet-inactive-color': '#9ca3af',
                '--swiper-pagination-bullet-inactive-opacity': '1',
            } as React.CSSProperties}
        >
            <SwiperSlide><FormPage>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div><label htmlFor="project-select" className={labelStyle}>Progetto</label><select id="project-select" value={projectId} onChange={e => setProjectId(e.target.value)} className={inputBaseStyle}>{progetti.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                    <div><label htmlFor="piattaforma" className={labelStyle}>Piattaforma</label><select id="piattaforma" value={piattaforma} onChange={e => setPiattaforma(e.target.value)} className={inputBaseStyle}>{availablePlatforms.map(platform => (<option key={platform.id} value={platform.name}>{platform.name}</option>))}</select></div>
                </div>
                <div><label htmlFor="data" className={labelStyle}>Data Pubblicazione</label><input id="data" type="datetime-local" value={data} onChange={e => setData(e.target.value)} className={inputBaseStyle} step="1800"/></div>
                <div><label htmlFor="tipoContenuto" className={labelStyle}>Tipo Contenuto</label><select id="tipoContenuto" value={tipoContenuto} onChange={e => setTipoContenuto(e.target.value)} className={inputBaseStyle}><option value="">Seleziona un tipo...</option><optgroup label="Testo"><option value="Testo breve con Immagine">Testo breve con Immagine</option></optgroup><optgroup label="Immagine"><option value="Immagine/Carosello">Immagine/Carosello</option></optgroup><optgroup label="Video"><option value="Reel">Reel</option><option value="Booktrailer">Booktrailer</option><option value="Podcast">Podcast</option><option value="Vlog">Vlog</option></optgroup></select></div>
            </FormPage></SwiperSlide>
            <SwiperSlide><FormPage>
                <div>
                    <div className="flex justify-between items-center mb-2"><label htmlFor="descrizione" className={labelStyle}>Descrizione / Testo</label><button onClick={() => handleCopy(descrizione, 'desc')} className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-200" title="Copia descrizione">{isDescCopied ? <Check size={16} className="text-green-500"/> : <Copy size={16} />}</button></div>
                    <textarea id="descrizione" value={descrizione} onChange={e => setDescrizione(e.target.value)} rows={8} className={inputBaseStyle}/>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2"><label htmlFor="primoCommento" className={labelStyle}>Primo Commento</label><button onClick={() => handleCopy(primoCommento, 'comment')} className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-200" title="Copia commento">{isCommentCopied ? <Check size={16} className="text-green-500"/> : <Copy size={16} />}</button></div>
                    <textarea id="primoCommento" value={primoCommento} onChange={e => setPrimoCommento(e.target.value)} rows={4} className={inputBaseStyle} placeholder="Testo da inserire nel primo commento..."/>
                </div>
            </FormPage></SwiperSlide>
             <SwiperSlide><FormPage>
                <div><label htmlFor="urlMedia" className={labelStyle}>URL Media (Drive, Dropbox, etc.)</label><input id="urlMedia" type="text" value={urlMedia} onChange={e => setUrlMedia(e.target.value)} className={inputBaseStyle} placeholder="Incolla qui il link al tuo media..."/></div>
                <div className="pt-4">
                    <label className={labelStyle}>Stato</label>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-slate-700/50 rounded-lg"><input type="checkbox" checked={isProdotto} onChange={handleProdottoChange} className="h-5 w-5 rounded-sm border-gray-300 dark:border-slate-600 bg-transparent text-blue-600 focus:ring-blue-500" /><span className="font-medium text-gray-800 dark:text-gray-200">Prodotto</span></label>
                        <label className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-slate-700/50 rounded-lg"><input type="checkbox" checked={isPubblicato} onChange={handlePubblicatoChange} className="h-5 w-5 rounded-sm border-gray-300 dark:border-slate-600 bg-transparent text-blue-600 focus:ring-blue-500" /><span className="font-medium text-gray-800 dark:text-gray-200">Pubblicato</span></label>
                    </div>
                </div>
            </FormPage></SwiperSlide>
        </Swiper>
    </BaseModal>
  );
};
