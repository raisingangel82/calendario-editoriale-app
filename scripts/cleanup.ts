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
const USER_ID = "VgnpUxriDSPxGb4MF1OU4qGTUKm2";

// Mappatura completa dai vecchi tipi di contenuto a quelli nuovi e semplificati
const typeMapping: { [key: string]: string } = {
    "Testo Breve con Immagine": "Testo breve con Immagine",
    "Domanda Aperta": "Testo breve con Immagine",
    "Riflessione Personale": "Testo breve con Immagine",
    "Aneddoto/Dietro le Quinte": "Testo breve con Immagine",
    "Citazione d'Impatto": "Testo breve con Immagine",
    "Frase Chiave/Hook": "Testo breve con Immagine",
    "Riflessione Autore": "Testo breve con Immagine",
    "Aneddoto Creativo": "Testo breve con Immagine",
    "Riflessione Personale Autore": "Testo breve con Immagine",
    "Dilemma Relazionale": "Testo breve con Immagine",
    "Domanda per il Pubblico": "Testo breve con Immagine",
    "Sintesi e Realizzazione": "Testo breve con Immagine",

    "Post Statico/Carousel": "Immagine/Carosello",
    "Post Visivo - Contrasto": "Immagine/Carosello",
    "Post Visivo/Carosello - Metafore Visive": "Immagine/Carosello",

    "Reel - Hook visivo forte": "Reel",
    "Reel - Gancio Emotivo": "Reel",
    "Reel - Evoluzione Relazionale - Hook": "Reel",
    "Trend/Hook Veloce": "Reel",
    "Trend con Audio di Tendenza - II 'Triangolo'": "Reel",

    "Video Tutorial/Vlog": "Vlog",
    "Analisi di Caratteri - Vlog": "Vlog",
    "Vlog Emozionale - La Nascita di Matteo": "Vlog",

    "Booktrailer": "Booktrailer",
    "Booktrailer Drammatico": "Booktrailer",

    "Video Podcast": "Podcast", // Aggiunto per completezza
};

async function cleanupData() {
  console.log(`Avvio pulizia dati per l'utente: ${USER_ID}...`);
  const contenutiRef = collection(db, "contenuti");
  const q = query(contenutiRef, where("userId", "==", USER_ID));

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log("Nessun post trovato. Nessuna pulizia necessaria.");
    return;
  }

  const batch = writeBatch(db);
  let updatedCount = 0;

  querySnapshot.forEach((doc) => {
    const post = doc.data();
    let needsUpdate = false;
    let updatedData: { [key: string]: any } = {};

    // Correzione Piattaforma
    if (post.piattaforma && post.piattaforma.toLowerCase().includes("instagram")) {
        if (post.piattaforma !== "Instagram") {
            updatedData.piattaforma = "Instagram";
            needsUpdate = true;
        }
    }

    // Semplificazione Tipo Contenuto
    const mappedType = typeMapping[post.tipoContenuto];
    if (mappedType && post.tipoContenuto !== mappedType) {
      updatedData.tipoContenuto = mappedType;
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`Aggiorno il documento ${doc.id}...`);
      batch.update(doc.ref, updatedData);
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`\nPulizia completata! Aggiornati ${updatedCount} documenti.`);
  } else {
    console.log("\nTutti i documenti sono già corretti e coerenti.");
  }
}

cleanupData().catch(console.error);