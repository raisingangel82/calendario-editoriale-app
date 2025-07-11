import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// La chiave API viene letta dalle Variabili d'Ambiente di Vercel
const geminiApiKey = process.env.GEMINI_API_KEY;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Log per registrare l'avvio della funzione non appena viene chiamata.
  console.log('[LOG] Esecuzione della funzione generateReport avviata.');

  try {
    if (!geminiApiKey) {
      console.error('[ERRORE] La chiave API di Gemini non è stata trovata nelle variabili d\'ambiente.');
      throw new Error("Configurazione del server incompleta: manca la chiave API.");
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
    
    // Log per confermare che i dati sono stati ricevuti correttamente.
    console.log(`[LOG] Dati ricevuti per ${posts.length} post. Inizializzazione AI...`);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
      Sei un social media strategist esperto, specializzato nell'analizzare dati per autori e creatori di contenuti. Il tuo tono è incoraggiante, professionale e orientato all'azione.

      Analizza il seguente elenco di post e le loro performance (in formato JSON) per identificare pattern e generare un report sintetico per l'utente.

      DATI DEI POST:
      ${JSON.stringify(posts, null, 2)}

      RICHIESTA:
      Basandoti sui dati forniti, genera una risposta in formato JSON con le seguenti chiavi:
      1.  "puntiDiForza": (stringa) Un paragrafo che descrive 2-3 punti di forza evidenti emersi dall'analisi. Esempio: "I tuoi reel ottengono mediamente il 50% di visualizzazioni in più rispetto alle immagini, specialmente quando pubblichi di martedì."
      2.  "areeDiMiglioramento": (stringa) Un paragrafo che descrive 1-2 aree di miglioramento o opportunità non sfruttate. Esempio: "I post testuali su LinkedIn mostrano un alto tasso di commenti, ma sono poco frequenti. Potrebbe esserci un'opportunità di approfondire questo formato."
      3.  "consigliPratici": (array di stringhe) Una lista di 3 consigli concreti e attuabili che l'utente può applicare subito. Esempi: ["Pianifica almeno un reel a settimana incentrato sul 'dietro le quinte' della scrittura.", "Crea più caroselli su Instagram per spiegare i concetti dei tuoi libri, dato l'alto numero di 'salvataggi' che generano.", "Aggiungi una domanda diretta alla fine di ogni post su LinkedIn per capitalizzare sull'alto tasso di commenti."]
    `;

    // Log per confermare che il prompt è stato creato e la chiamata all'AI sta per partire.
    console.log('[LOG] Prompt creato. Inizio chiamata all\'API di Gemini...');
    const startTime = Date.now();

    const result = await model.generateContent(prompt);
    const responseFromAI = result.response;
    
    const endTime = Date.now();
    // Log per registrare quanto tempo ha impiegato la chiamata all'AI.
    console.log(`[LOG] Chiamata all'API di Gemini completata in ${endTime - startTime} ms.`);

    const responseText = responseFromAI.text();
    console.log("[LOG] Risposta grezza dall'AI:", responseText);
    
    // Tentativo di pulire la risposta nel caso l'AI aggiunga testo extra
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    const cleanJsonString = jsonMatch ? jsonMatch[1] : responseText;

    const parsedResponse = JSON.parse(cleanJsonString);
    
    console.log('[LOG] Risposta JSON analizzata con successo. Invio al client.');
    return response.status(200).json(parsedResponse);
    
  } catch (error: any) {
    // Log per catturare e registrare qualsiasi errore si verifichi.
    console.error("[ERRORE DETTAGLIATO DURANTE L'ESECUZIONE]", error);
    return response.status(500).json({ error: `Errore interno del server: ${error.message}` });
  }
}