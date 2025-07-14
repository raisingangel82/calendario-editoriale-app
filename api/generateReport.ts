import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

// Funzione helper per estrarre il gancio (prima frase) da un testo
const getHook = (text: string = ''): string => {
  if (!text) return "Nessun testo fornito";
  const sentences = text.match(/[^.!?]+[.!?]*/);
  return sentences ? sentences[0].trim() : text.substring(0, 150);
};

// Funzione helper per formattare i numeri
const formatNumber = (num: number = 0) => new Intl.NumberFormat('it-IT').format(num);

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
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

    // --- NUOVA LOGICA DI PRE-ANALISI DEI DATI ---

    const postsByPlatform: { [key: string]: any[] } = {};
    posts.filter((p: any) => p.performance).forEach((post: any) => {
        const platform = post.piattaforma || 'Sconosciuta';
        if (!postsByPlatform[platform]) postsByPlatform[platform] = [];
        
        // Semplifichiamo l'oggetto post per l'AI
        postsByPlatform[platform].push({
            titolo: post.titolo,
            tipoContenuto: post.tipoContenuto,
            gancio: getHook(post.descrizione), // Usiamo la funzione getHook!
            views: post.performance.views || 0,
            likes: post.performance.likes || 0,
            comments: post.performance.comments || 0,
            shares: post.performance.shares || 0
        });
    });

    // --- NUOVO PROMPT IPER-STRUTTURATO ---

    const prompt = `
      Sei un data analyst e social media strategist di fama mondiale. Il tuo compito è trasformare dati grezzi in insight strategici.
      Analizza i dati che ti fornisco, raggruppati per piattaforma. Per ogni piattaforma, segui ESATTAMENTE la struttura richiesta.
      Sii specifico, numerico e cita sempre i titoli dei post quando richiesto.

      DATI DA ANALIZZARE:
      ${JSON.stringify(postsByPlatform, null, 2)}

      RICHIESTA DI OUTPUT:
      Genera una risposta in formato JSON. L'oggetto principale deve avere come chiavi i nomi delle piattaforme.
      Per ogni piattaforma, il valore deve essere un oggetto con tre chiavi obbligatorie:

      1. "analisiPerformance": (stringa) Un paragrafo di analisi. Inizia identificando il post con il maggior numero di visualizzazioni in assoluto su questa piattaforma, CITANDO IL SUO TITOLO e il NUMERO ESATTO di views. Poi, confronta la performance media dei diversi formati (es. "Reel", "Carosello").
      
      2. "analisiGanci": (stringa) Analizza il gancio del post più performante in termini di views. CITA IL GANCIO ESATTO e spiega perché, secondo te, ha funzionato. Confrontalo con il gancio di un post con basse performance.

      3. "consigliAzionabili": (array di stringhe) Una lista di 2-3 consigli ULTRA-SPECIFICI basati sui dati. Non dare consigli generici come "usa buoni hashtag". Esempio: "Dato che il post '[Titolo del post con più views]' ha ottenuto ${formatNumber(1796)} views, crea un secondo video che approfondisce lo stesso argomento." o "Il formato 'Carosello' riceve in media il 40% di like in più rispetto ai Reel; trasforma il tuo prossimo post testuale in un carosello informativo."

      La risposta DEVE essere un oggetto JSON valido e completo.
    `;

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Uso gemini-pro per analisi più accurate

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Pulizia robusta della risposta per estrarre solo il JSON
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
      console.error("Risposta AI non valida:", responseText);
      throw new Error("La risposta dell'AI non conteneva un oggetto JSON valido.");
    }
    
    const jsonString = responseText.substring(startIndex, endIndex + 1);
    const parsedResponse = JSON.parse(jsonString);
    
    return response.status(200).json(parsedResponse);
    
  } catch (error: any) {
    console.error("[ERRORE DETTAGLIATO]", error);
    return response.status(500).json({ error: `Errore interno del server: ${error.message}` });
  }
}