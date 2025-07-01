import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, DatabaseZap } from 'lucide-react';
import { PlatformManager } from '../components/PlatformManager';

// Importiamo tutto il necessario da Firebase
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export const Impostazioni: React.FC = () => {
  const { user } = useAuth();

  // ▼▼▼ QUESTA È LA FUNZIONE CHE FA TUTTA LA MAGIA ▼▼▼
  const handleMigratePosts = async () => {
    if (!user) {
      alert("Devi essere loggato per eseguire la migrazione.");
      return;
    }

    if (!window.confirm("Stai per aggiornare tutti i post per usare l'ID del progetto invece del nome. Questa operazione è sicura ma va eseguita UNA SOLA VOLTA. Procedere?")) {
      return;
    }

    alert("Avvio della migrazione... Potrebbero volerci alcuni secondi. Non chiudere la pagina.");

    try {
      // 1. Creiamo un "dizionario" con Nome Progetto -> ID Progetto
      const progettiRef = collection(db, "progetti");
      const qProgetti = query(progettiRef, where("userId", "==", user.uid));
      const progettiSnapshot = await getDocs(qProgetti);
      
      const projectMap = new Map<string, string>();
      progettiSnapshot.forEach(doc => {
        projectMap.set(doc.data().nome, doc.id);
      });

      console.log("Dizionario Progetti creato:", projectMap);

      // 2. Recuperiamo tutti i post dell'utente
      const contenutiRef = collection(db, "contenuti");
      const qContenuti = query(contenutiRef, where("userId", "==", user.uid));
      const contenutiSnapshot = await getDocs(qContenuti);

      if (contenutiSnapshot.empty) {
        alert("Nessun contenuto da migrare trovato.");
        return;
      }
      
      // 3. Prepariamo un'operazione di scrittura di gruppo (batch)
      const batch = writeBatch(db);
      let updatedCount = 0;

      contenutiSnapshot.forEach(doc => {
        const post = doc.data();
        // Se il post ha ancora il campo 'libro' e non ha 'projectId'
        if (post.libro && !post.projectId) {
          const projectId = projectMap.get(post.libro);
          if (projectId) {
            // Aggiungiamo l'aggiornamento al batch
            batch.update(doc.ref, { projectId: projectId });
            // Potremmo anche eliminare il vecchio campo 'libro'
            // batch.update(doc.ref, { libro: deleteField() });
            updatedCount++;
          }
        }
      });
      
      // 4. Eseguiamo tutti gli aggiornamenti in un colpo solo
      await batch.commit();

      alert(`Migrazione completata! ${updatedCount} post sono stati aggiornati con successo.`);

    } catch (error) {
      console.error("Errore durante la migrazione:", error);
      alert("Si è verificato un errore durante la migrazione. Controlla la console del browser.");
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
        <p className="text-gray-600 dark:text-gray-400">Gestisci le impostazioni del tuo account Pro.</p>
      </div>

      <PlatformManager />

      {/* ▼▼▼ SEZIONE PER LO STRUMENTO DI MIGRAZIONE TEMPORANEO ▼▼▼ */}
      <div className="mt-8 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-800">
        <h4 className="font-bold text-yellow-800 dark:text-yellow-200">Strumenti di Manutenzione</h4>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 mb-3">Usa questo pulsante per aggiornare i tuoi vecchi post alla nuova struttura dati (usando ID Progetto invece di Nome Progetto). Eseguire una sola volta.</p>
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