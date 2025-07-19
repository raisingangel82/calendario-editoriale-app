// Salva questo codice come 'fix-metrics-ids.js'
const admin = require('firebase-admin');

// --- CONFIGURAZIONE ---
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Il tuo User ID corretto
const CORRECT_USER_ID = 'VgnpUxriDSPxGb4MF1OU4qGTUKm2';

const db = admin.firestore();

async function fixMetricsUserIds() {
  console.log('🚀 Avvio script di CORREZIONE userId per "performanceMetrics"...');
  const collectionRef = db.collection('performanceMetrics'); 
  
  try {
    const snapshot = await collectionRef.get();
    if (snapshot.empty) {
      console.log('✅ La collezione è vuota.');
      return;
    }

    let batch = db.batch();
    let operationsCount = 0;
    let docsToFix = 0;

    console.log(`Trovati ${snapshot.size} documenti. Inizio la verifica e correzione...`);

    snapshot.forEach(doc => {
      const currentUserId = doc.data().userId;

      if (currentUserId !== CORRECT_USER_ID) {
        console.log(`-> Correzione necessaria per doc: ${doc.id}. Trovato userId: ${currentUserId || 'mancante'}`);
        batch.update(doc.ref, { userId: CORRECT_USER_ID });
        operationsCount++;
        docsToFix++;

        if (operationsCount >= 400) {
          batch.commit();
          batch = db.batch();
          operationsCount = 0;
        }
      }
    });

    if (operationsCount > 0) {
      console.log(`\nInvio di un batch finale con ${operationsCount} correzioni...`);
      await batch.commit();
    }

    console.log(`\n✨ Processo completato!`);
    if (docsToFix > 0) {
      console.log(`✅ ${docsToFix} documenti in 'performanceMetrics' sono stati corretti.`);
    } else {
      console.log('✅ Tutti i documenti in \'performanceMetrics\' avevano già lo userId corretto.');
    }

  } catch (error) {
    console.error('❌ Si è verificato un errore:', error);
  }
}

// Esegui la funzione
fixMetricsUserIds();