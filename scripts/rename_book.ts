import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, writeBatch } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const USER_ID = "VgnpUxriDSPxGb4MF1OU4qGTUKm2"; // Il tuo ID permanente

async function renameBook() {
  console.log("Ricerca dei post con 'Libro 3'...");
  const q = query(collection(db, "contenuti"), where("userId", "==", USER_ID), where("libro", "==", "Libro 3"));
  const snapshot = await getDocs(q);
  if (snapshot.empty) { console.log("Nessun post da aggiornare."); return; }
  const batch = writeBatch(db);
  snapshot.forEach(doc => { batch.update(doc.ref, { libro: "Un tango a tre" }); });
  await batch.commit();
  console.log(`Aggiornati ${snapshot.size} post in "Un tango a tre".`);
}
renameBook().catch(console.error);