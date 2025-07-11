import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './lib/firebase-admin.js'; // Questa importazione rimane corretta

// RIMUOVI O COMMENTA LA RIGA CHE DAVA ERRORE:
// import { collection, query, where, getDocs, getDoc, writeBatch } from 'firebase-admin/firestore';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const { userId } = request.body;
  if (request.method !== 'POST' || !userId) {
    return response.status(400).json({ error: 'Richiesta non valida.' });
  }

  try {
    const firestore = db(); // Ottieni l'istanza di Firestore
    const batch = firestore.batch(); // Accedi writeBatch direttamente dall'istanza firestore
    let deletedCount = 0;

    // 1. Trova tutti i post importati dall'utente
    // MODIFICATO: Usa firestore.collection() e firestore.query() direttamente
    const contenutiCollectionRef = firestore.collection('contenuti');
    const q = contenutiCollectionRef
      .where('userId', '==', userId)
      .where('tipoContenuto', '==', 'Importato');

    const querySnapshot = await q.get(); // Usa .get() sulla query, non getDocs() separato

    // 2. Controlla per ognuno se ha metriche di performance
    for (const postDoc of querySnapshot.docs) {
      const postId = postDoc.id;
      // MODIFICATO: Usa firestore.collection() e .doc() per i riferimenti
      const metricsRef = firestore.collection('performanceMetrics').doc(postId);
      const metricsSnap = await metricsRef.get(); // Usa .get() sul riferimento del documento

      // 3. Se non ci sono metriche o il testo è vuoto, aggiungi al batch di eliminazione
      const postData = postDoc.data();
      const isContentEmpty = postData.tipoContenuto === 'Importato' &&
                             (!postData.titolo || postData.titolo.trim() === '') &&
                             (!postData.descrizione || postData.descrizione.trim() === '');

      if (metricsSnap.empty || isContentEmpty) { // Aggiunto controllo isContentEmpty
        batch.delete(postDoc.ref);
        batch.delete(metricsRef); // Tenta di eliminare le metriche anche se non esistono
        deletedCount++;
        console.log(`[CLEANUP] Post ${postId} aggiunto al batch di eliminazione.`);
      }
    }

    // 4. Esegui l'eliminazione in un'unica operazione
    if (deletedCount > 0) {
      await batch.commit();
    }

    return response.status(200).json({
      message: `Pulizia completata. Eliminati ${deletedCount} post vuoti.`,
      deletedCount: deletedCount,
    });
  } catch (error) {
    console.error('Errore durante l\'operazione di pulizia dei post:', error);
    return response.status(500).json({ error: 'Errore interno del server durante la pulizia.', details: error.message });
  }
}