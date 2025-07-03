import React, { useState } from 'react';
import { Link } from 'react-router-dom';
// ▼▼▼ MODIFICA: Importata icona BellRing per le notifiche ▼▼▼
import { ArrowLeft, DatabaseZap, BellRing } from 'lucide-react';
import { PlatformManager } from '../components/PlatformManager';

// ▼▼▼ MODIFICA: Importazioni necessarie per le notifiche e Firestore ▼▼▼
import { getMessaging, getToken } from "firebase/messaging";
import { collection, query, where, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export const Impostazioni: React.FC = () => {
  const { user } = useAuth();
  // ▼▼▼ MODIFICA: Stato per gestire il caricamento durante l'iscrizione alle notifiche ▼▼▼
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Funzione per lo script di migrazione (invariata)
  const handleMigratePosts = async () => {
    // ... (codice esistente dello script, non lo modifico per brevità)
    if (!user) {
      alert("Devi essere loggato per eseguire la migrazione.");
      return;
    }
    if (!window.confirm("Stai per aggiornare tutti i post... Procedere?")) {
      return;
    }
    alert("Avvio della migrazione...");
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
        alert("Nessun contenuto da migrare trovato.");
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
      alert(`Migrazione completata! ${updatedCount} post sono stati aggiornati con successo.`);
    } catch (error) {
      console.error("Errore durante la migrazione:", error);
      alert("Si è verificato un errore durante la migrazione.");
    }
  };

  // ▼▼▼ MODIFICA: Nuova funzione per abilitare le notifiche push ▼▼▼
  const handleEnableNotifications = async () => {
    if (!user) {
      alert("Devi essere loggato per abilitare le notifiche.");
      return;
    }
    
    // IMPORTANTE: Questa è la tua chiave pubblica VAPID dal progetto Firebase
    // Dovrai generarla e incollarla qui.
    const VAPID_KEY = "BCvTK43mY8OjbcH1aE-ampackLk0vsQIYgYTDXj2K0obzOGZbQL8a7GivgqDIShYbufcW1b-TwCIn-n53q531T0";

    if (VAPID_KEY === "INCOLLA_LA_TUA_VAPID_KEY_QUI") {
        alert("Errore di configurazione: la VAPID key per le notifiche non è stata impostata nel codice.");
        return;
    }

    setIsSubscribing(true);
    try {
      const messaging = getMessaging();
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        console.log("Permesso per le notifiche concesso.");
        
        // Ottieni il token del dispositivo
        const currentToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });

        if (currentToken) {
          console.log("Token del dispositivo ottenuto:", currentToken);
          
          // Salva il token in Firestore
          const tokenRef = doc(db, "subscriptions", currentToken);
          await setDoc(tokenRef, {
            userId: user.uid,
            token: currentToken,
            createdAt: new Date(),
          });

          alert("Notifiche abilitate con successo! Riceverai promemoria per i tuoi post.");
        } else {
          console.log("Impossibile ottenere il token di notifica. Assicurati che il contesto sia sicuro (HTTPS).");
          alert("Errore: Impossibile abilitare le notifiche. Controlla la console per maggiori dettagli.");
        }
      } else {
        console.log("Permesso per le notifiche negato.");
        alert("Hai negato il permesso per le notifiche. Puoi abilitar_le dalle impostazioni del browser.");
      }
    } catch (error) {
      console.error("Errore durante l'abilitazione delle notifiche:", error);
      alert("Si è verificato un errore durante l'abilitazione delle notifiche.");
    } finally {
      setIsSubscribing(false);
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
      
      {/* ▼▼▼ MODIFICA: Nuova Sezione per le Notifiche Push ▼▼▼ */}
      <div className="mt-8 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-800">
        <h4 className="font-bold text-blue-800 dark:text-blue-200">Notifiche Push</h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 mb-3">
          Abilita le notifiche per ricevere un promemoria quando è ora di pubblicare un post. Funziona anche a browser chiuso.
        </p>
        <button 
          onClick={handleEnableNotifications}
          disabled={isSubscribing}
          className="flex items-center gap-2 py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-400 disabled:cursor-wait"
        >
          <BellRing size={18} />
          {isSubscribing ? 'Abilitazione...' : 'Abilita Notifiche'}
        </button>
      </div>

      <div className="my-8">
        <PlatformManager />
      </div>

      <div className="mt-8 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-800">
        <h4 className="font-bold text-yellow-800 dark:text-yellow-200">Strumenti di Manutenzione</h4>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 mb-3">Usa questo pulsante per aggiornare i tuoi vecchi post alla nuova struttura dati. Eseguire una sola volta.</p>
        <button 
          onClick={handleMigratePosts}
          className="flex items-center gap-2 py-2 px-4 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
        >
          <DatabaseZap size={18} />
          Esegui Migrazione Dati Post
        </button>
      </div>
    </div>
  );
};