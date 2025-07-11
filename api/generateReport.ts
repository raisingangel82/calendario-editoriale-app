import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  console.log('[LOG] Esecuzione della funzione generateReport avviata.');

  try {
    if (!geminiApiKey) {
      console.error('[ERRORE] La chiave API di Gemini non è stata trovata.');
      throw new Error("Configurazione del server incompleta: manca la chiave API.");
    }

    if (request.method !== 'POST') {
      return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { posts } = request.body;
    if (!posts || posts.length === 0) {
      return response.status(400).json({ error: 'La funzione richiede un elenco di post.' });
    }
    
    // --- MODIFICA CHIAVE: Selezioniamo un campione intelligente di dati ---
    
    // 1. Filtra solo i post con performance e calcola uno score
    const postsConScore = posts
      .filter((post: any) => post.performance)
      .map((post: any) => {
        const p = post.performance;
        // Diamo più peso ai commenti e ai mi piace che alle visualizzazioni
        const score = (p.views || 0) + (p.likes || 0) * 5 + (p.comments || 0) * 10;
        return { ...post, score };
      });

    // 2. Ordina i post in base allo score
    postsConScore.sort((a: any, b: any) => b.score - a.score);

    // 3. Prendi i migliori 5 e i peggiori 5 (o meno se non ce ne sono abbastanza)
    const topPosts = postsConScore.slice(0, 5);
    const bottomPosts = postsConScore.slice(-5);

    // 4. Crea il campione da inviare, evitando duplicati se ci sono meno di 10 post
    const samplePosts = [...new Set([...topPosts, ...bottomPosts])];

    console.log(`[LOG] Dati originali: ${posts.length} post. Inviando un campione di ${samplePosts.length} post all'AI.`);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
      Sei un social media strategist esperto, specializzato nell'analizzare dati per autori e creatori di contenuti. Il tuo tono è incoraggiante, professionale e orientato all'azione.

      Analizza il seguente campione di post (i migliori e i peggiori) e le loro performance per identificare pattern chiari e generare un report sintetico per l'utente.

      DATI DEL CAMPIONE DI POST:
      ${JSON.stringify(samplePosts, null, 2)}

      RICHIESTA:
      Basandoti su questi dati, genera una risposta in formato JSON con le seguenti chiavi:
      1.  "puntiDiForza": (stringa) Un paragrafo che descrive 2-3 punti di forza evidenti emersi dall'analisi dei post migliori.
      2.  "areeDiMiglioramento": (stringa) Un paragrafo che descrive 1-2 aree di miglioramento evidenti analizzando i post peggiori.
      3.  "consigliPratici": (array di stringhe) Una lista di 3 consigli concreti e attuabili che l'utente può applicare subito.
    `;

    console.log('[LOG] Prompt creato con campione di dati. Inizio chiamata all\'API di Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log("[LOG] Risposta grezza dall'AI:", responseText);
    const parsedResponse = JSON.parse(responseText);
    
    console.log('[LOG] Risposta JSON valida. Invio al client.');
    return response.status(200).json(parsedResponse);
    
  } catch (error: any) {
    console.error("[ERRORE DETTAGLIATO]", error);
    return response.status(500).json({ error: `Errore interno del server: ${error.message}` });
  }
}