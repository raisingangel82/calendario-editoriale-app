// Importa le funzioni che ci servono dagli SDK di Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // <-- Import per il database
import { getAuth } from "firebase/auth";       // <-- Import per l'autenticazione

// La TUA configurazione personale (corretta)
const firebaseConfig = {
  apiKey: "AIzaSyA3EiyPqxAJRo6A8xnva0iB3R2XGZnKPWI",
  authDomain: "calendario-editoriale-so-bc85b.firebaseapp.com",
  projectId: "calendario-editoriale-so-bc85b",
  storageBucket: "calendario-editoriale-so-bc85b.firebasestorage.app",
  messagingSenderId: "163208289900",
  appId: "1:163208289900:web:ac529fa7abd47cb64b4249",
  measurementId: "G-386XG3W2CE"
};

// Inizializza l'app Firebase
const app = initializeApp(firebaseConfig);

// Inizializza i servizi e ESPORTALI per renderli disponibili
export const db = getFirestore(app);
export const auth = getAuth(app);

// Nota: Ho rimosso la parte su 'getAnalytics' perché non ci serve per ora
// e semplifica il codice.