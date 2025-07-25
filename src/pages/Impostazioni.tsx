import React from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Palette, Upload, Download, Settings, Briefcase, Star, Play, Pause } from 'lucide-react';
import { PlatformManager } from '../components/PlatformManager';
import { getMessaging, getToken } from "firebase/messaging";
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { projectColorPalette, type ColorShade } from '../data/colorPalette';
import type { PlatformData } from '../types';

interface CardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}

const SettingsCard: React.FC<CardProps> = ({ title, icon: Icon, children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <h4 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4"><Icon size={18}/> {title}</h4>
        {children}
    </div>
);

interface ImpostazioniProps {
    onImportClick: () => void;
    onExportClick: () => void;
    onProjectsClick: () => void;
    platforms: PlatformData[];
    onAddPlatform: (data: Omit<PlatformData, 'id' | 'icon' | 'proFeature' | 'iconName'>) => void;
    onUpdatePlatform: (id: string, data: Omit<PlatformData, 'id' | 'icon' | 'proFeature' | 'iconName'>) => void;
    onDeletePlatform: (id: string) => void;
    autoScrollEnabled: boolean;
    onAutoScrollChange: (enabled: boolean) => void;
}

export const Impostazioni: React.FC<ImpostazioniProps> = ({ 
    onImportClick, 
    onExportClick, 
    onProjectsClick, 
    platforms,
    onAddPlatform,
    onUpdatePlatform,
    onDeletePlatform,
    autoScrollEnabled,
    onAutoScrollChange
}) => {
  const { user } = useAuth();
  const { baseColor, setBaseColor, colorShade, setColorShade, getActiveColor } = useTheme();
  const [isSubscribing, setIsSubscribing] = React.useState(false);
  const [notificationStatus, setNotificationStatus] = React.useState<string | null>(null);

  const handleEnableNotifications = async () => {
    if (!user) return;
    setIsSubscribing(true);
    setNotificationStatus(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = getMessaging();
        const fcmToken = await getToken(messaging, { vapidKey: 'BCvTK43mY8OjbcH1aE-ampackLk0vsQIYgYTDXj2K0obzOGZbQL8a7GivgqDIShYbufcW1b-TwCIn-n53q531T0' });
        
        if (fcmToken) {
          // @ts-ignore
          const tokenRef = doc(db, 'fcmTokens', user.uid);
          // @ts-ignore
          await setDoc(tokenRef, { token: fcmToken, userId: user.uid }, { merge: true });
          setNotificationStatus('Notifiche abilitate con successo!');
        } else {
          setNotificationStatus('Impossibile ottenere il token. Controlla la configurazione.');
        }
      } else {
        setNotificationStatus('Permesso per le notifiche non concesso.');
      }
    } catch (error) {
      console.error('Errore durante l\'abilitazione delle notifiche:', error);
      setNotificationStatus('Errore durante l\'abilitazione.');
    } finally {
      setIsSubscribing(false);
    }
  };
  
  return (
    <div className="p-4 sm:p-6 pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Utility e Impostazioni</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <SettingsCard title="Tema e Opzioni" icon={Palette}>
              <div className="flex flex-col gap-4">
                  <div>
                    <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">Colore Principale</h5>
                    <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                        {projectColorPalette.map(c => (<button key={c.base} type="button" title={c.name} onClick={() => setBaseColor(c.base)} style={{ backgroundColor: c.shades['700'].hex }} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${baseColor === c.base ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-indigo-500` : ''}`} /> ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">Intensità Colori</h5>
                    <div className="flex justify-around bg-gray-100 dark:bg-gray-900/50 p-1 rounded-md">
                        {(['400', '700', '800'] as ColorShade[]).map(shade => ( <button key={shade} onClick={() => setColorShade(shade)} className={`w-full text-xs py-1 px-2 rounded-md transition-colors ${colorShade === shade ? `${getActiveColor('bg')} text-white font-semibold` : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}> {shade === '400' ? 'Chiara' : shade === '700' ? 'Media' : 'Intensa'} </button>))}
                    </div>
                  </div>
                </div>
            </SettingsCard>

            <SettingsCard title="Gestione Dati" icon={Briefcase}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button onClick={onProjectsClick} className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm">
                        <Settings size={16} /> <span className="hidden sm:inline">Progetti</span>
                    </button>
                    <button onClick={onImportClick} className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm">
                        <Upload size={16} /> <span className="hidden sm:inline">Importa Dati</span>
                    </button>
                    
                    {/* @ts-ignore */}
                    {user?.plan !== 'pro' ? (
                        <Link to="/upgrade">
                            <span title="Funzionalità disponibile per gli account Pro" className="w-full flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm transition-colors opacity-60 cursor-pointer">
                                <Download size={16} /> <span className="hidden sm:inline">Esporta Dati</span>
                                <span className="ml-1.5 flex items-center gap-1 text-xs font-bold bg-yellow-400 dark:bg-yellow-500 text-yellow-900 px-1.5 py-0.5 rounded-full"><Star size={12}/> PRO</span>
                            </span>
                        </Link>
                    ) : (
                        <button onClick={onExportClick} title="Esporta l'intero database" className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm transition-colors">
                            <Download size={16} /> <span className="hidden sm:inline">Esporta Dati</span>
                        </button>
                    )}
                    
                    <button onClick={() => onAutoScrollChange(!autoScrollEnabled)} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-sm transition-colors ${autoScrollEnabled ? 'bg-amber-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-700'}`}>
                        {autoScrollEnabled ? <Pause size={16} /> : <Play size={16} />} <span className="hidden sm:inline">AutoScroll</span>
                    </button>
                </div>
            </SettingsCard>
             <SettingsCard title="Notifiche" icon={BellRing}>
                <div>
                    <button onClick={handleEnableNotifications} disabled={isSubscribing} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50">
                        <BellRing size={18} /> {isSubscribing ? 'Abilitazione...' : 'Abilita Notifiche Browser'}
                    </button>
                    {notificationStatus && <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">{notificationStatus}</p>}
                </div>
             </SettingsCard>
          </div>
          
          <div className="space-y-6">
            <PlatformManager 
                platforms={platforms}
                onAddPlatform={onAddPlatform}
                onUpdatePlatform={onUpdatePlatform}
                onDeletePlatform={onDeletePlatform}
            />
          </div>
      </div>
    </div>
  );
};