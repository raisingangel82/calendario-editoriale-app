import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, DatabaseZap, BellRing, MessageSquareQuote, Palette } from 'lucide-react';
import { PlatformManager } from '../components/PlatformManager';
import { getMessaging, getToken } from "firebase/messaging";
import { collection, query, where, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { projectColorPalette } from '../data/colorPalette';

export const Impostazioni: React.FC = () => {
  const { user } = useAuth();
  const { baseColor, setBaseColor } = useTheme();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleGenerateAmazonComments = async () => {
    if (!user) {
      alert("Devi essere loggato per eseguire lo script.");
      return;
    }
    if (!window.confirm("Stai per aggiornare tutti i post senza un 'primo commento' con il link di Amazon. Questa operazione è sicura ma va eseguita UNA SOLA VOLTA. Procedere?")) {
      return;
    }
    alert("Avvio dello script... Potrebbero volerci alcuni secondi. Riceverai un messaggio al termine.");
    try {
      const amazonLinks: { [key: string]: string } = {
        'Sotto il cielo di nessuno': 'https://amzn.eu/d/bdwIFux',
        'Riflessi di desiderio': 'https://amzn.eu/d/4Yafa86',
        'Un tango a tre': 'https://amzn.eu/d/4SMVN2a',
        "Mosaico d'amore": 'https://amzn.eu/d/eeilFGZ'
      };
      const progettiRef = collection(db, "progetti");
      const qProgetti = query(progettiRef, where("userId", "==", user.uid));
      const progettiSnapshot = await getDocs(qProgetti);
      const projectMap = new Map<string, string>();
      progettiSnapshot.forEach(doc => {
        projectMap.set(doc.id, doc.data().nome);
      });
      const contenutiRef = collection(db, "contenuti");
      const qContenuti = query(contenutiRef, where("userId", "==", user.uid));
      const contenutiSnapshot = await getDocs(qContenuti);
      const batch = writeBatch(db);
      let updatedCount = 0;
      contenutiSnapshot.forEach(doc => {
        const post = doc.data();
        if (post.projectId && !post.primoCommento) {
          const projectName = projectMap.get(post.projectId);
          if (projectName && amazonLinks[projectName]) {
            const amazonUrl = amazonLinks[projectName];
            const nuovoCommento = `Trovi il libro su Amazon ${amazonUrl}`;
            batch.update(doc.ref, { primoCommento: nuovoCommento });
            updatedCount++;
          }
        }
      });
      await batch.commit();
      alert(`Script completato! ${updatedCount} post sono stati aggiornati con successo.`);
    } catch (error) {
      console.error("Errore durante l'aggiornamento dei commenti:", error);
      alert("Si è verificato un errore durante l'aggiornamento. Controlla la console del browser.");
    }
  };

  const handleEnableNotifications = async () => {
    if (!user) {
      alert("Devi essere loggato per abilitare le notifiche.");
      return;
    }
    
    // ▼▼▼ RICORDA: Incolla qui la tua VAPID key personale presa da Firebase ▼▼▼
    const VAPID_KEY = "INCOLLA_LA_TUA_VAPID_KEY_QUI";

    if (VAPID_KEY.includes("INCOLLA")) {
        alert("Errore di configurazione: la VAPID key per le notifiche non è stata impostata nel codice.");
        return;
    }

    setIsSubscribing(true);
    try {
      const messaging = getMessaging();
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          const tokenRef = doc(db, "subscriptions", currentToken);
          await setDoc(tokenRef, { userId: user.uid, token: currentToken, createdAt: new Date() });
          alert("Notifiche abilitate con successo!");
        } else {
          alert("Errore: Impossibile ottenere il token di notifica. Assicurati che il sito sia in HTTPS.");
        }
      } else {
        alert("Hai negato il permesso per le notifiche. Puoi riabilitarle dalle impostazioni del browser.");
      }
    } catch (error) {
      console.error("Errore durante l'abilitazione delle notifiche:", error);
      alert("Si è verificato un errore durante l'abilitazione delle notifiche.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleMigratePosts = async () => {
    if (!user) {
      alert("Devi essere loggato per eseguire la migrazione.");
      return;
    }
    if (!window.confirm("Questa operazione associa i vecchi post ai nuovi progetti. Eseguire una sola volta. Procedere?")) {
      return;
    }
    alert("Avvio migrazione...");
    try {
      const progettiRef = collection(db, "progetti");
      const qProgetti = query(progettiRef, where("userId", "==", user.uid));
      const progettiSnapshot = await getDocs(qProgetti);
      const projectMap = new Map<string, string>();
      progettiSnapshot.forEach(doc => {
        projectMap.set(doc.data().nome, doc.id);
      });
      const contenutiRef = collection(db, "contenuti");
      const qContenuti = query(contenutiRef, where("userId", "==", user.uid));
      const contenutiSnapshot = await getDocs(qContenuti);
      if (contenutiSnapshot.empty) {
        alert("Nessun contenuto da migrare.");
        return;
      }
      const batch = writeBatch(db);
      let updatedCount = 0;
      contenutiSnapshot.forEach(doc => {
        const post = doc.data();
        if (post.libro && !post.projectId) {
          const projectId = projectMap.get(post.libro);
          if (projectId) {
            batch.update(doc.ref, { projectId: projectId });
            updatedCount++;
          }
        }
      });
      await batch.commit();
      alert(`Migrazione completata! ${updatedCount} post sono stati aggiornati.`);
    } catch (error) {
      console.error("Errore durante la migrazione:", error);
      alert("Si è verificato un errore durante la migrazione.");
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="mb-8">
        <Link to="/" className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors">
          <ArrowLeft size={18} />
          Torna al Calendario
        </Link>
        <h1 className="text-3xl font-bold mt-2 text-gray-800 dark:text-gray-200">
          Impostazioni
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Gestisci le impostazioni del tuo account e le funzionalità avanzate.</p>
      </div>

      <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-bold text-gray-800 dark:text-blue-200 flex items-center gap-2"><Palette size={18}/> Colore Principale del Tema</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">
          Scegli il colore principale che verrà usato per l'interfaccia.
        </p>
        <div className="grid grid-cols-6 sm:grid-cols-11 gap-2 pt-2">
            {projectColorPalette.map(c => (
                <button
                    key={c.base}
                    type="button"
                    title={c.name}
                    onClick={() => setBaseColor(c.base)}
                    style={{ backgroundColor: c.shades['700'].hex }}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${baseColor === c.base ? `ring-2 ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-800 ring-blue-500` : ''}`}
                />
            ))}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-800">
        <h4 className="font-bold text-blue-800 dark:text-blue-200">Notifiche Push</h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 mb-3">
          Abilita le notifiche per ricevere un promemoria quando è ora di pubblicare un post.
        </p>
        <button onClick={handleEnableNotifications} disabled={isSubscribing} className="flex items-center gap-2 py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-400 disabled:cursor-wait">
          <BellRing size={18} />
          {isSubscribing ? 'Abilitazione...' : 'Abilita Notifiche'}
        </button>
      </div>

      <div className="my-8">
        <PlatformManager />
      </div>

      <div className="mt-8 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-800">
        <h4 className="font-bold text-yellow-800 dark:text-yellow-200">Strumenti di Manutenzione</h4>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 mb-3">Usa questi pulsanti per operazioni una tantum sui tuoi dati.</p>
        <div className="flex flex-wrap gap-3">
            <button onClick={handleMigratePosts} className="flex items-center gap-2 py-2 px-4 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors">
                <DatabaseZap size={18} />
                Esegui Migrazione Dati Post
            </button>
            <button onClick={handleGenerateAmazonComments} className="flex items-center gap-2 py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                <MessageSquareQuote size={18} />
                Genera Commenti Amazon
            </button>
        </div>
      </div>
    </div>
  );
};