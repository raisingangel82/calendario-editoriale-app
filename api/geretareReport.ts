import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Leggiamo la chiave API dalle Variabili d'Ambiente di Vercel
const geminiApiKey = process.env.GEMINI_API_KEY;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // NUOVO LOG: Registra l'avvio della funzione non appena viene chiamata.
  console.log('[LOG] Inizio esecuzione della funzione generateReport.');

  try {
    if (!geminiApiKey) {
      console.error('[ERRORE] La chiave API di Gemini non è stata trovata nelle variabili d'ambiente.');
      throw new Error("La configurazione del server è incompleta: manca la chiave API.");
    }

    if (request.method !== 'POST') {
      console.warn(`[WARN] Metodo non consentito: ${request.method}`);
      return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { posts } = request.body;

    if (!posts || posts.length === 0) {
      console.warn('[WARN] Chiamata ricevuta senza dati dei post.');
      return response.status(400).json({ error: 'La funzione richiede un elenco di post con dati di performance.' });
    }
    
    // NUOVO LOG: Conferma che i dati sono stati ricevuti correttamente.
    console.log(`[LOG] Dati ricevuti per ${posts.length} post. Inizializzazione AI...`);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
      Sei un social media strategist esperto... // (Il tuo prompt completo va qui)
    `;

    // NUOVO LOG: Conferma che il prompt è stato creato e la chiamata all'AI sta per partire.
    console.log('[LOG] Prompt creato. Inizio chiamata all\'API di Gemini...');
    const startTime = Date.now();

    const result = await model.generateContent(prompt);
    const responseFromAI = result.response;
    
    const endTime = Date.now();
    // NUOVO LOG: La chiamata all'AI è terminata. Registra quanto tempo ha impiegato.
    console.log(`[LOG] Chiamata all'API di Gemini completata in ${endTime - startTime} ms.`);

    const responseText = responseFromAI.text();
    console.log("[LOG] Risposta grezza dall'AI:", responseText);
    
    const parsedResponse = JSON.parse(responseText);
    
    console.log('[LOG] Risposta JSON analizzata con successo. Invio al client.');
    response.status(200).json(parsedResponse);

  } catch (error: any) {
    // NUOVO LOG: Cattura e registra qualsiasi errore si verifichi nel blocco try.
    console.error("[ERRORE DETTAGLIATO DURANTE L'ESECUZIONE]", error);
    response.status(500).json({ error: `Errore interno del server: ${error.message}` });
  }
}