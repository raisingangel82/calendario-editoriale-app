// cleanupEmptyPosts.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Importa db dall'Admin SDK che hai configurato al Passo 2
import { db } from '../src/firebase-admin'; 
// Importa getDoc (singolare) per ottenere un singolo documento
import { collection, query, where, getDocs, getDoc, writeBatch } from 'firebase-admin/firestore'; 

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Questo endpoint deve essere chiamato da un utente autenticato.
  // Per semplicità qui ci fidiamo del `userId` inviato, ma in produzione
  // dovresti verificare l'autenticità dell'utente tramite un token ID Firebase.
  const { userId } = request.body;
  if (request.method !== 'POST' || !userId) {
    return response.status(400).json({ error: 'Richiesta non valida. Richiede un POST con userId.' });
  }

  try {
    const firestore = db(); // Ottieni l'istanza di Firestore dall'Admin SDK
    const batch = firestore.batch(); // Inizializza un'operazione batch per cancellazioni multiple
    let deletedCount = 0;

    // 1. Trova tutti i post di tipo 'Importato' che appartengono a questo utente.
    const q = query(
      collection(firestore, 'contenuti'),
      where('userId', '==', userId),
      where('tipoContenuto', '==', 'Importato')
    );
    const querySnapshot = await getDocs(q); // Esegue la query e ottiene i documenti

    // 2. Itera su ogni post trovato per decidere se eliminarlo.
    for (const postDoc of querySnapshot.docs) {
      const postId = postDoc.id; // L'ID del post.
      const metricsRef = doc(firestore, 'performanceMetrics', postId); // Riferimento al documento delle metriche.
      const metricsSnap = await getDoc(metricsRef); // <-- CORREZIONE CHIAVE: usa getDoc (singolare) per un documento.

      const postData = postDoc.data(); // Ottieni i dati del post.
      // Controlla se il titolo è vuoto o solo spazi.
      const isTitleEmpty = !postData.titolo || (typeof postData.titolo === 'string' && postData.titolo.trim() === '');
      // Controlla se la descrizione è vuota o solo spazi.
      const isDescriptionEmpty = !postData.descrizione || (typeof postData.descrizione === 'string' && postData.descrizione.trim() === '');

      // 3. Condizione per l'eliminazione:
      // Il post viene eliminato se:
      // a) Il suo documento in 'performanceMetrics' non esiste (metricsSnap.empty è true)
      // OPPURE
      // b) Sia il 'titolo' CHE la 'descrizione' del post sono vuoti.
      if (metricsSnap.empty || (isTitleEmpty && isDescriptionEmpty)) {
        batch.delete(postDoc.ref); // Aggiungi il post corrente al batch di eliminazione.
        
        // Se il documento delle metriche esiste, aggiungilo anche al batch per essere eliminato.
        // Se non esisteva (metricsSnap.empty era true), non cerchiamo di eliminarlo di nuovo.
        if (!metricsSnap.empty) { 
             batch.delete(metricsRef);
        }
        deletedCount++; // Incrementa il contatore dei post da eliminare.
        console.log(`[CLEANUP] Post ${postId} aggiunto al batch di eliminazione. Motivo: ${metricsSnap.empty ? 'Metriche mancanti' : 'Contenuto testuale vuoto'}.`);
      }
    }

    // 4. Esegui tutte le eliminazioni in un'unica operazione batch.
    if (deletedCount > 0) {
      await batch.commit(); // Esegue le cancellazioni.
      console.log(`[CLEANUP] Batch commit completato. Eliminati ${deletedCount} post.`);
    } else {
        console.log("[CLEANUP] Nessun post vuoto trovato da eliminare.");
    }
    
    response.status(200).json({ message: `Pulizia completata. Eliminati ${deletedCount} post vuoti.` });

  } catch (error: any) {
    console.error("[ERRORE PULIZIA]", error);
    response.status(500).json({ error: `Errore durante la pulizia: ${error.message}` });
  }
}