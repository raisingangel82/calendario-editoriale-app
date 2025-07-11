// api/lib/firebase-admin.ts
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin/app';

let initializedApp: admin.app.App; // Variabile per mantenere l'istanza dell'app Firebase

try {
  // Tenta di ottenere un'istanza dell'app Firebase già inizializzata.
  // Se non ce n'è una, questa chiamata lancerà un errore.
  initializedApp = admin.app();
  console.log("Firebase Admin SDK già inizializzato (riutilizzo).");
} catch (error: any) {
  // Se si verifica un errore, significa che l'app non è ancora stata inizializzata,
  // quindi procediamo con l'inizializzazione.

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Sostituisce i caratteri di escape della nuova riga con caratteri di nuova riga reali
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // Verifica che tutte le variabili d'ambiente necessarie siano presenti
  if (!projectId || !clientEmail || !privateKey) {
    console.error("ERRORE: Variabili d'ambiente Firebase Admin non impostate correttamente o mancanti.");
    throw new Error('Firebase Admin environment variables (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY) sono richieste per inizializzare l\'SDK.');
  }

  try {
    const serviceAccount: ServiceAccount = {
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    };

    initializedApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Puoi aggiungere altre opzioni qui se necessario, es. databaseURL: "https://<IL_TUO_PROGETTO>.firebaseio.com",
    });
    console.log("Firebase Admin SDK inizializzato con successo (nuova inizializzazione).");
  } catch (initError: any) {
    console.error("Errore fatale durante l'inizializzazione Firebase Admin SDK:", initError);
    // Rilancia l'errore per assicurarsi che la funzione serverless fallisca
    throw new Error(`Impossibile inizializzare Firebase Admin SDK: ${initError.message || initError}`);
  }
}

// Esporta l'istanza di Firestore direttamente dall'app inizializzata
export const db = initializedApp.firestore();

// Se avessi bisogno anche dell'oggetto Auth dall'Admin SDK:
// export const adminAuth = initializedApp.auth();