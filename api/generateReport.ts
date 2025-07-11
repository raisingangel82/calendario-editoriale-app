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
      throw new Error("Configurazione del server incompleta: manca la chiave API.");
    }

    if (request.method !== 'POST') {
      return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { posts } = request.body;
    if (!posts || posts.length === 0) {
      return response.status(400).json({ error: 'La funzione richiede un elenco di post.' });
    }
    
    const postsConScore = posts
      .filter((post: any) => post.performance)
      .map((post: any) => {
        const p = post.performance;
        const score = (p.views || 0) + (p.likes || 0) * 5 + (p.comments || 0) * 10;
        return { ...post, score };
      });

    postsConScore.sort((a: any, b: any) => b.score - a.score);

    const topPosts = postsConScore.slice(0, 5);
    const bottomPosts = postsConScore.slice(-5);
    const samplePosts = [...new Set([...topPosts, ...bottomPosts])];

    console.log(`[LOG] Dati originali: ${posts.length} post. Inviando un campione di ${samplePosts.length} post all'AI.`);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
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

    console.log('[LOG] Prompt creato. Inizio chiamata all\'API di Gemini Flash...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log("[LOG] Risposta grezza dall'AI:", responseText);

    // --- MODIFICA CHIAVE: Logica di pulizia della stringa più robusta ---
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("La risposta dell'AI non conteneva un oggetto JSON valido.");
    }
    
    const jsonString = responseText.substring(startIndex, endIndex + 1);
    const parsedResponse = JSON.parse(jsonString);
    
    console.log('[LOG] Risposta JSON pulita e analizzata con successo. Invio al client.');
    return response.status(200).json(parsedResponse);
    
  } catch (error: any) {
    console.error("[ERRORE DETTAGLIATO]", error);
    return response.status(500).json({ error: `Errore interno del server: ${error.message}` });
  }
}