// Salva questo codice nel file fix-contenuti-ids.js
const admin = require('firebase-admin');

// --- CONFIGURAZIONE ---
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Inserisci qui il TUO User ID, quello corretto che abbiamo visto nei log e nello screenshot
const CORRECT_USER_ID = 'VgnpUxriDSPxGb4MF1OU4qGTUKm2';

const db = admin.firestore();

async function fixContenutiUserIds() {
  console.log('🚀 Avvio script di CORREZIONE userId per la collezione "contenuti"...');
  const collectionRef = db.collection('contenuti'); // <-- MODIFICA CHIAVE: puntiamo a 'contenuti'
  
  try {
    const snapshot = await collectionRef.get();
    if (snapshot.empty) {
      console.log('✅ La collezione è vuota. Nessuna azione richiesta.');
      return;
    }

    let batch = db.batch();
    let operationsCount = 0;
    let docsToFix = 0;

    console.log(`Trovati ${snapshot.size} documenti. Inizio la verifica dei valori...`);

    snapshot.forEach(doc => {
      const currentUserId = doc.data().userId;

      // La logica chiave: controlla se lo userId è mancante o DIVERSO da quello corretto
      if (currentUserId !== CORRECT_USER_ID) {
        console.log(`-> Correzione necessaria per il doc: ${doc.id}. Trovato userId: ${currentUserId || 'mancante'}`);
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
      console.log(`✅ ${docsToFix} documenti in 'contenuti' sono stati corretti.`);
    } else {
      console.log('✅ Tutti i documenti in \'contenuti\' avevano già lo userId corretto.');
    }

  } catch (error) {
    console.error('❌ Si è verificato un errore:', error);
  }
}

// Esegui la funzione
fixContenutiUserIds();