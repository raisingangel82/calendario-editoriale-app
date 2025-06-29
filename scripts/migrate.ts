import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA3EiyPqxAJRo6A8xnva0iB3R2XGZnKPWI",
  authDomain: "calendario-editoriale-so-bc85b.firebaseapp.com",
  projectId: "calendario-editoriale-so-bc85b",
  storageBucket: "calendario-editoriale-so-bc85b.firebasestorage.app",
  messagingSenderId: "163208289900",
  appId: "1:163208289900:web:ac529fa7abd47cb64b4249",
  measurementId: "G-386XG3W2CE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- ID Utente ---
const VECCHIO_ID_ANONIMO = "ZwXJx9FrNmTkuM662paxRrpbIpg2";
// ▼▼▼ ID NUOVO INSERITO CORRETTAMENTE ▼▼▼
const NUOVO_ID_PERMANENTE = "VgnpUxriDSPxGb4MF1OU4qGTUKm2";

async function migraDati() {
  if (!NUOVO_ID_PERMANENTE || NUOVO_ID_PERMANENTE === "INCOLLA_QUI_IL_TUO_NUOVO_ID") {
    console.error("ERRORE: L'ID Utente nuovo non è stato inserito correttamente.");
    return;
  }

  console.log(`Sto cercando i post del vecchio utente: ${VECCHIO_ID_ANONIMO}`);

  const contenutiRef = collection(db, "contenuti");
  const q = query(contenutiRef, where("userId", "==", VECCHIO_ID_ANONIMO));

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log("Nessun post trovato per il vecchio ID. Nessuna migrazione necessaria.");
    return;
  }

  console.log(`Trovati ${querySnapshot.size} post da migrare...`);

  const batch = writeBatch(db);
  querySnapshot.forEach((doc) => {
    batch.update(doc.ref, { userId: NUOVO_ID_PERMANENTE });
  });

  await batch.commit();

  console.log("\nMigrazione completata con successo!");
  console.log(`Tutti i ${querySnapshot.size} post sono stati assegnati al nuovo utente: ${NUOVO_ID_PERMANENTE}`);
}

migraDati().catch(console.error);