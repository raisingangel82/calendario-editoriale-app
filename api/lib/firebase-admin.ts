// src/firebase-admin.ts
import * as admin from 'firebase-admin';

let app: admin.app.App | undefined;

export function db() {
  if (!admin.apps.length) {
    // Tentativo di caricare le credenziali dalla variabile d'ambiente (raccomandato per produzione)
    const serviceAccountJson = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    
    if (serviceAccountJson) {
      // Se la variabile d'ambiente esiste, usa il suo contenuto JSON
      const serviceAccount = JSON.parse(serviceAccountJson);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Fallback per lo sviluppo locale: carica da un file locale
      // ASSICURATI CHE IL PERCORSO QUI SOTTO SIA CORRETTO PER LA TUA CHIAVE JSON
      // E CHE IL FILE SIA NEL .gitignore!
      try {
        // Esempio: se il tuo file JSON è nella root del progetto:
        const localServiceAccount = require('../../nome-del-tuo-file-di-cred.json'); // SOSTITUISCI CON IL NOME ESATTO DEL TUO FILE
        app = admin.initializeApp({
          credential: admin.credential.cert(localServiceAccount)
        });
      } catch (e) {
        console.error("Errore: Impossibile trovare la chiave di servizio locale. Assicurati che FIREBASE_ADMIN_PRIVATE_KEY sia impostata o che il file locale esista.");
        throw e; // Lancia l'errore per bloccare l'esecuzione se le credenziali non ci sono
      }
    }
  } else {
    app = admin.app(); // Se l'app è già stata inizializzata, la recupera.
  }
  return app.firestore();
}

// Puoi esportare anche altri servizi Admin se ti servono in futuro, es:
// export const auth = admin.auth();