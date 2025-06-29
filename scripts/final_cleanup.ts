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

// ▼▼▼ QUESTA COSTANTE ORA È NEL POSTO GIUSTO ▼▼▼
const typeMapping: { [key: string]: string } = {
    "Testo Breve con Immagine": "Testo breve con Immagine", "Domanda Aperta": "Testo breve con Immagine", "Riflessione Personale": "Testo breve con Immagine", "Aneddoto/Dietro le Quinte": "Testo breve con Immagine", "Citazione d'Impatto": "Testo breve con Immagine", "Frase Chiave/Hook": "Testo breve con Immagine", "Riflessione Autore": "Testo breve con Immagine", "Aneddoto Creativo": "Testo breve con Immagine", "Riflessione Personale Autore": "Testo breve con Immagine", "Dilemma Relazionale": "Testo breve con Immagine", "Domanda per il Pubblico": "Testo breve con Immagine", "Sintesi e Realizzazione": "Testo breve con Immagine", "Domanda per il Futuro": "Testo breve con Immagine", "Riflessione sul Concetto di Famiglia": "Testo breve con Immagine", "L'Eredità": "Testo breve con Immagine", "Accettazione Sociale": "Testo breve con Immagine",
    "Immagine/Carosello": "Immagine/Carosello", "Post Statico/Carousel": "Immagine/Carosello", "Post Visivo - Contrasto": "Immagine/Carosello", "Post Visivo/Carosello - Metafore Visive": "Immagine/Carosello", "Post Visivo/Carosello - Eredità": "Immagine/Carosello",
    "Reel": "Reel", "Reel - Hook visivo forte": "Reel", "Reel - Gancio Emotivo": "Reel", "Reel - Evoluzione Relazionale - Hook": "Reel", "Trend/Hook Veloce": "Reel", "Il 'Ballo della Vita' - Hook": "Reel", "Trend/Sound Emozionale": "Reel", "Celebrazione/Montaggio Ritmico": "Reel",
    "Booktrailer": "Booktrailer", "Booktrailer Drammatico": "Booktrailer",
    "Podcast": "Podcast",
    "Vlog": "Vlog", "Video Tutorial/Vlog": "Vlog", "Analisi di Caratteri - Vlog": "Vlog", "Vlog Emozionale - La Nascita di Matteo": "Vlog",
};

async function finalCleanup() {
  console.log(`Avvio pulizia finale per l'utente: ${USER_ID}...`);

  const progettiRef = collection(db, "progetti");
  const qProgetti = query(progettiRef, where("userId", "==", USER_ID));
  const progettiSnapshot = await getDocs(qProgetti);
  const officialProjectNames = progettiSnapshot.docs.map(doc => doc.data().nome);
  console.log("Nomi dei progetti ufficiali trovati:", officialProjectNames);

  const contenutiRef = collection(db, "contenuti");
  const qContenuti = query(contenutiRef, where("userId", "==", USER_ID));
  const contenutiSnapshot = await getDocs(qContenuti);

  if (contenutiSnapshot.empty) {
    console.log("Nessun post da pulire.");
    return;
  }

  const batch = writeBatch(db);
  let updatedCount = 0;

  contenutiSnapshot.forEach((doc) => {
    const post = doc.data();
    let needsUpdate = false;
    let updatedData: { [key: string]: any } = {};

    if (post.libro && !officialProjectNames.includes(post.libro)) {
      const bestMatch = officialProjectNames.find(name => name.toLowerCase().includes(post.libro.toLowerCase()) || post.libro.toLowerCase().includes(name.toLowerCase()));
      if (bestMatch && post.libro !== bestMatch) {
        updatedData.libro = bestMatch;
        needsUpdate = true;
      }
    }

    if (post.piattaforma && typeof post.piattaforma === 'string' && post.piattaforma.toLowerCase().includes("instagram")) {
        if (post.piattaforma !== "Instagram") {
            updatedData.piattaforma = "Instagram";
            needsUpdate = true;
        }
    }

    const mappedType = typeMapping[post.tipoContenuto];
    if (mappedType && post.tipoContenuto !== mappedType) {
      updatedData.tipoContenuto = mappedType;
      needsUpdate = true;
    }

    if (needsUpdate) {
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

finalCleanup().catch(console.error);