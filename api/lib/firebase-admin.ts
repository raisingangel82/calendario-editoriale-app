// api/lib/firebase-admin.ts
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin/app'; // Importa il tipo per maggiore chiarezza

// Inizializza l'SDK di Firebase Admin una sola volta quando il modulo viene caricato.
// Questo è un pattern comune per le funzioni serverless.
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Sostituisce i caratteri di escape della nuova riga con caratteri di nuova riga reali
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // Verifica che tutte le variabili d'ambiente necessarie siano presenti
  if (!projectId || !clientEmail || !privateKey) {
    console.error("ERRORE: Variabili d'ambiente Firebase Admin non impostate correttamente o mancanti.");
    // Lancia un errore esplicito se le credenziali non vengono trovate
    throw new Error('Firebase Admin environment variables (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY) sono richieste per inizializzare l\'SDK.');
  }

  try {
    const serviceAccount: ServiceAccount = {
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Puoi aggiungere altre opzioni qui se necessario, ad esempio databaseURL
      // databaseURL: "https://<IL_TUO_PROGETTO>.firebaseio.com",
    });
    console.log("Firebase Admin SDK inizializzato con successo.");
  } catch (error: any) { // Usa 'any' per gestire errori di tipo sconosciuto
    console.error("Errore di inizializzazione Firebase Admin SDK:", error);
    // Rilancia l'errore per assicurarsi che la funzione serverless fallisca
    throw new Error(`Impossibile inizializzare Firebase Admin SDK: ${error.message || error}`);
  }
}

// Esporta l'istanza di Firestore direttamente dall'app inizializzata
export const db = admin.firestore();

// Se avessi bisogno anche dell'oggetto Auth dall'Admin SDK, potresti esportarlo così:
// export const adminAuth = admin.auth();