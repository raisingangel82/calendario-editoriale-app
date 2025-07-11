import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

// Funzione per estrarre il gancio (prima frase)
const getHook = (text: string = ''): string => {
  if (!text) return "Nessun testo";
  const sentences = text.match(/[^.!?]+[.!?]*/); // Trova la prima frase
  return sentences ? sentences[0].trim() : text.substring(0, 100);
};

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
        const score = (p.views || 0) + (p.likes || 0) * 5 + (p.comments || 0) * 10 + (p.shares || 0) * 15;
        return { ...post, score };
      });

    postsConScore.sort((a: any, b: any) => b.score - a.score);

    // MODIFICA: Aumentiamo il campione a 10 migliori e 10 peggiori
    const topPosts = postsConScore.slice(0, 10);
    const bottomPosts = postsConScore.slice(-10);
    
    // Aggiungiamo il gancio a ogni post del campione
    const samplePosts = [...new Set([...topPosts, ...bottomPosts])].map(p => ({
      titolo: p.titolo,
      tipoContenuto: p.tipoContenuto,
      gancio: getHook(p.testo), // Estraiamo il gancio
      performance: p.performance,
      score: p.score
    }));

    console.log(`[LOG] Inviando un campione di ${samplePosts.length} post all'AI.`);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    // MODIFICA: Prompt molto più dettagliato
    const prompt = `
      Sei un social media strategist e copywriter di élite, specializzato in content marketing per autori. Il tuo tono è analitico, preciso e orientato a fornire consigli pratici basati su dati concreti.

      Analizza il seguente campione di post (i migliori e i peggiori, ordinati per uno 'score' di performance) per identificare pattern specifici e generare un report di alto valore. Per ogni post, ti fornisco titolo, tipo, performance e il "gancio" (la prima frase del testo).

      DATI DEL CAMPIONE DI POST:
      ${JSON.stringify(samplePosts, null, 2)}

      RICHIESTA:
      Basandoti su questi dati, genera una risposta in formato JSON con le seguenti chiavi:
      1.  "analisiPerformance": (stringa) Un paragrafo che analizza la performance generale, confrontando esplicitamente i tipi di contenuto (es. "I Reel hanno generato in media il 150% di visualizzazioni in più delle immagini statiche, ma i Caroselli hanno un engagement (like+commenti) superiore del 30%").
      2.  "analisiGanci": (stringa) Un paragrafo focalizzato sull'efficacia dei ganci. Identifica lo stile dei ganci dei post migliori (es. "I ganci che funzionano meglio iniziano con una domanda diretta o una statistica scioccante") e confrontali con quelli dei post peggiori (es. "I ganci dei post con performance basse sono spesso troppo generici o descrittivi"). Cita un esempio di gancio efficace dai dati.
      3.  "consigliAzionabili": (array di stringhe) Una lista di 3-4 consigli estremamente specifici e immediatamente applicabili. Ogni consiglio deve essere legato a un'osservazione fatta nelle analisi precedenti. Esempi: ["Per il prossimo Reel, usa un gancio che ponga una domanda diretta nei primi 3 secondi, simile a '...', perché questo stile ha dimostrato di aumentare i commenti.", "Trasforma il tuo prossimo post testuale in un Carosello di 3-5 slide su Instagram per aumentare i 'salvataggi' e i 'mi piace'."]
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error("La risposta dell'AI non conteneva un oggetto JSON valido.");
    
    const jsonString = responseText.substring(startIndex, endIndex + 1);
    const parsedResponse = JSON.parse(jsonString);
    
    return response.status(200).json(parsedResponse);
    
  } catch (error: any) {
    console.error("[ERRORE DETTAGLIATO]", error);
    return response.status(500).json({ error: `Errore interno del server: ${error.message}` });
  }
}