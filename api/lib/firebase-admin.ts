// api/lib/firebase-admin.ts
// IMPORTANTE: Utilizziamo 'require' per firebase-admin come ultima risorsa
// per aggirare potenziali problemi di importazione/risoluzione dei moduli.
const admin = require('firebase-admin');
// Non è necessario importare ServiceAccount se non si usano i tipi espliciti
// const { ServiceAccount } = require('firebase-admin/app');

// Inizializza l'SDK di Firebase Admin una sola volta quando il modulo viene caricato.
if (!admin.apps.length) { // Questa è la riga 7.
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error("ERRORE: Variabili d'ambiente Firebase Admin non impostate correttamente o mancanti.");
    throw new Error('Firebase Admin environment variables (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY) sono richieste per inizializzare l\'SDK.');
  }

  try {
    const serviceAccount = { // Senza annotazione di tipo ServiceAccount con pure JS/require
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK inizializzato con successo.");
  } catch (error: any) {
    console.error("Errore di inizializzazione Firebase Admin SDK:", error);
    throw new Error(`Impossibile inizializzare Firebase Admin SDK: ${error.message || error}`);
  }
}

// Esporta l'istanza di Firestore direttamente dall'app inizializzata
export const db = admin.firestore();

// Se avessi bisogno anche dell'oggetto Auth dall'Admin SDK:
// export const adminAuth = admin.auth();