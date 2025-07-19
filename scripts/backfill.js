// Salva questo codice in un file chiamato backfill.js
const admin = require('firebase-admin');

// --- CONFIGURAZIONE ---
// Assicurati che il file della chiave sia nella stessa cartella
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Inserisci qui il tuo User ID, lo stesso dei log precedenti
const TARGET_USER_ID = 'VgnpUxriDSPxGb4MF1OU4qGTUKm2';

const db = admin.firestore();

async function backfillPerformanceMetrics() {
  console.log('🚀 Avvio script di aggiornamento per "performanceMetrics"...');
  const metricsCollectionRef = db.collection('performanceMetrics');
  
  try {
    const snapshot = await metricsCollectionRef.get();
    if (snapshot.empty) {
      console.log('✅ La collezione è vuota. Nessuna azione richiesta.');
      return;
    }

    let batch = db.batch();
    let operationsCount = 0;
    let docsToUpdate = 0;

    console.log(`Trovati ${snapshot.size} documenti. Inizio la verifica...`);

    snapshot.forEach(doc => {
      // Controlla se il campo 'userId' MANCA
      if (!doc.data().userId) {
        console.log(`-> Aggiornamento necessario per il documento: ${doc.id}`);
        batch.update(doc.ref, { userId: TARGET_USER_ID });
        operationsCount++;
        docsToUpdate++;

        // Esegue il commit del batch ogni 400 operazioni per sicurezza
        if (operationsCount >= 400) {
          batch.commit();
          batch = db.batch();
          operationsCount = 0;
        }
      }
    });

    if (operationsCount > 0) {
      console.log(`\nInvio di un batch finale con ${operationsCount} aggiornamenti...`);
      await batch.commit();
    }

    console.log(`\n✨ Processo completato!`);
    if (docsToUpdate > 0) {
      console.log(`✅ ${docsToUpdate} documenti sono stati aggiornati con il userId mancante.`);
    } else {
      console.log('✅ Tutti i documenti avevano già il campo userId.');
    }

  } catch (error) {
    console.error('❌ Si è verificato un errore:', error);
  }
}

// Esegui la funzione
backfillPerformanceMetrics();