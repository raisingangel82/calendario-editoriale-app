import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

// Funzione helper per estrarre il gancio (prima frase) da un testo
const getHook = (text: string = ''): string => {
  if (!text) return "Nessun testo fornito";
  const sentences = text.match(/[^.!?]+[.!?]*/);
  return sentences ? sentences[0].trim() : text.substring(0, 120);
};

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
    
    // Raggruppa i post per piattaforma
    const postsByPlatform: { [key: string]: any[] } = {};
    posts.filter((p: any) => p.performance).forEach((post: any) => {
        const platform = post.piattaforma || 'Sconosciuta';
        if (!postsByPlatform[platform]) {
            postsByPlatform[platform] = [];
        }
        postsByPlatform[platform].push(post);
    });
    
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    
    // MODIFICA CHIAVE: Prompt per analisi per singola piattaforma
    const prompt = `
      Sei un social media strategist di alto livello e un copywriter esperto. La tua specialità è analizzare dati di performance per autori e fornire strategie editoriali estremamente specifiche e attuabili.

      Analizza i seguenti dati, che sono raggruppati per piattaforma social. Per ogni piattaforma, esegui un'analisi dettagliata e fornisci consigli mirati.

      DATI DEI POST:
      ${JSON.stringify(postsByPlatform, null, 2)}

      RICHIESTA:
      Genera una risposta in formato JSON. La risposta deve essere un oggetto dove ogni chiave è il nome di una piattaforma (es. "Instagram", "YouTube").
      Per ogni piattaforma, il valore deve essere un oggetto con le seguenti tre chiavi:
      
      1.  "analisiPerformance": (stringa) Un paragrafo conciso che identifica il tipo di contenuto (es. Reel, Carosello, Foto) che ha performato meglio e peggio su QUESTA specifica piattaforma, menzionando metriche chiave (es. "Su Instagram, i Reel mostrano una copertura media superiore del 200% rispetto alle foto singole, ma i Caroselli generano il 50% in più di salvataggi.").

      2.  "analisiGanci": (stringa) Un'analisi specifica dei "ganci" (prima frase del testo) per QUESTA piattaforma. Identifica lo stile dei ganci che ha funzionato meglio (es. "Su Facebook, i ganci che iniziano con una domanda diretta all'utente generano più commenti") e cita un esempio di gancio efficace dai dati forniti per quella piattaforma.

      3.  "consigliAzionabili": (array di stringhe) Una lista di 2-3 consigli pratici e specifici per migliorare le performance su QUESTA piattaforma, basati sulle analisi precedenti. Esempi: ["Per YouTube, crea titoli più brevi e incisivi come '...', che ha ottenuto un alto click-through rate.", "Per Instagram, riutilizza i tuoi post testuali di successo trasformandoli in Caroselli informativi di 3-5 slide."].

      Fornisci una risposta solo per le piattaforme presenti nei dati. La risposta finale deve essere un oggetto JSON valido.
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