import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onCall, HttpsError, onRequest, Request } from "firebase-functions/v2/https";
import { Response } from "express";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Stripe from "stripe";
import { VertexAI } from "@google-cloud/vertexai";
import cors from 'cors';

initializeApp();

const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

const db = getFirestore();
const messaging = getMessaging();

const corsHandler = cors({ origin: true });

// Funzione helper per estrarre il gancio (prima frase) da un testo
const getHook = (text: string = ''): string => {
  if (!text) return "Nessun testo fornito";
  const sentences = text.match(/[^.!?]+[.!?]*/);
  return sentences ? sentences[0].trim() : text.substring(0, 150); // Limita a 150 caratteri se non ci sono frasi complete
};

// =======================================================================================
// === 1. FUNZIONE PER CREARE LA SESSIONE DI PAGAMENTO                                 ===
// =======================================================================================
export const createStripeCheckout = onCall({ region: "europe-west1" }, async (request) => {
  const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2025-06-30.basil" });

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "È necessario essere autenticati.");
  }

  const { priceId, origin } = request.data;
  if (!priceId || !origin) {
    throw new HttpsError("invalid-argument", "ID del prezzo e origine sono obbligatori.");
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: request.auth.uid,
      success_url: `${origin}/success`,
      cancel_url: `${origin}/upgrade`,
    });

    if (!session.url) {
      throw new HttpsError("internal", "Impossibile creare la sessione di pagamento.");
    }
    return { url: session.url };
  } catch (error) {
    logger.error("Errore creazione sessione Stripe:", error);
    throw new HttpsError("internal", "Errore interno durante la creazione del pagamento.");
  }
});

// =======================================================================================
// === 2. WEBHOOK DI STRIPE PER AGGIORNARE LO STATO UTENTE                             ===
// =======================================================================================
export const stripeWebhook = onRequest({ region: "europe-west1" }, async (request: Request, response: Response) => {
  corsHandler(request, response, async () => {
    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2025-06-30.basil" });
    const sig = request.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(request.rawBody, sig, stripeWebhookSecret.value());
    } catch (err) {
      const error = err as Error;
      logger.error(`Errore verifica Webhook:`, error.message);
      response.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (userId) {
        logger.info(`Pagamento completato per utente: ${userId}. Aggiorno il piano a 'pro'.`);
        const userRef = db.collection('users').doc(userId);
        await userRef.set({ plan: 'pro' }, { merge: true });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const usersRef = db.collection('users');
      const q = usersRef.where('stripeId', '==', customerId).limit(1);
      const userSnapshot = await q.get();

      if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          logger.info(`Abbonamento cancellato per utente: ${userDoc.id}. Aggiorno il piano a 'free'.`);
          await userDoc.ref.set({ plan: 'free' }, { merge: true });
      }
    }

    response.status(200).send();
  });
});


// =======================================================================================
// === 3. FUNZIONE GENERAZIONE REPORT AI (CON TIMEOUT, LOG E NUOVO PROMPT)             ===
// =======================================================================================
export const generateContentReport = onCall({ region: "europe-west1", timeoutSeconds: 540 }, async (request) => {
  logger.info("Inizio esecuzione di generateContentReport per utente:", request.auth?.uid);
  
  if (!request.auth) { 
    logger.warn("Tentativo di chiamata non autenticato.");
    throw new HttpsError("unauthenticated", "È necessario essere autenticati per usare questa funzione."); 
  }

  const { posts, goal, audience } = request.data;

  if (!posts || !Array.isArray(posts) || posts.length === 0) { 
    logger.warn("Chiamata con dati dei post non validi:", {uid: request.auth.uid});
    throw new HttpsError("invalid-argument", "Dati dei post mancanti o non validi."); 
  }
  if (!goal || typeof goal !== 'string' || !audience || typeof audience !== 'string') {
    logger.warn("Chiamata con goal o audience mancanti:", {uid: request.auth.uid});
    throw new HttpsError("invalid-argument", "Obiettivo e target audience sono obbligatori.");
  }

  try {
    const vertex_ai = new VertexAI({ project: 'calendario-editoriale-so-bc85b', location: 'europe-west1' });
    const model = vertex_ai.getGenerativeModel({ model: 'gemini-2.5-pro' }); 
    
    // --- INIZIO: Ottimizzazione dei dati dei post per ridurre il payload ---
    // Filtra solo i campi essenziali per l'analisi AI e calcola il punteggio ponderato
    const postsWithWeightedScore = posts.map((post: any) => {
      const views = post.performance?.views || 0;
      const likes = post.performance?.likes || 0;
      const comments = post.performance?.comments || 0;
      // Calcola il punteggio complessivo (es. views*1 + likes*2 + comments*3)
      const punteggioComplessivo = (views * 1) + (likes * 2) + (comments * 3);

      return {
        id: post.id,
        piattaforma: post.piattaforma,
        tipoContenuto: post.tipoContenuto,
        data: post.data, 
        titolo: post.titolo,
        descrizione: post.descrizione, 
        gancio: getHook(post.descrizione), // UTILIZZO DI getHook QUI
        performance: { 
          views: views,
          likes: likes,
          comments: comments,
          punteggioComplessivo: punteggioComplessivo
        }
      };
    }).filter((post: any) => post.performance.punteggioComplessivo > 0); 

    // Raggruppa i post per piattaforma
    const postsByPlatform: { [key: string]: any[] } = {};
    postsWithWeightedScore.forEach((post: any) => {
        const platform = post.piattaforma || 'Sconosciuta';
        if (!postsByPlatform[platform]) {
            postsByPlatform[platform] = [];
        }
        postsByPlatform[platform].push(post);
    });

    let postsForAnalysis: any[] = [];
    const maxPostsPerCategory = 10; 

    for (const platform in postsByPlatform) {
        if (postsByPlatform.hasOwnProperty(platform)) {
            const platformPosts = postsByPlatform[platform];

            const sortedPlatformPosts = [...platformPosts].sort((a, b) => {
                return b.performance.punteggioComplessivo - a.performance.punteggioComplessivo; 
            });

            const topN = sortedPlatformPosts.slice(0, maxPostsPerCategory);
            const worstN = sortedPlatformPosts.slice(Math.max(0, sortedPlatformPosts.length - maxPostsPerCategory));

            postsForAnalysis.push(...Array.from(new Set([...topN, ...worstN])));
        }
    }

    const uniquePostsForAnalysis = Array.from(new Map(postsForAnalysis.map(post => [post.id, post])).values());

    logger.info(`Analisi basata su ${uniquePostsForAnalysis.length} post (Top ${maxPostsPerCategory} e peggiori ${maxPostsPerCategory} per OGNI piattaforma, valutati con punteggio ponderato).`);

    const listaPiattaforme = [...new Set(uniquePostsForAnalysis.map((p: any) => p.piattaforma).filter(Boolean))];

    const prompt = `
Sei 'Stratagem', un'intelligenza artificiale esperta in data analysis e strategia per social media.
Il tuo compito è analizzare i dati dei post forniti e generare un report strategico dettagliato in formato JSON.
La valutazione delle performance dei post è basata su un punteggio complessivo che considera visualizzazioni, mi piace e commenti.
Mantieni le risposte concise e dirette, evitando prolissità, ma assicurati che ogni sezione sia ricca di insight.

**INPUT CONTESTUALE:**
- **Piattaforme Analizzate:** ${JSON.stringify(listaPiattaforme)}
- **Obiettivo Principale dell'Utente:** "${goal}"
- **Target Audience Descritto dall'Utente:** "${audience}"

**DATI DEI POST SELEZIONATI (JSON - Top ${maxPostsPerCategory} e peggiori ${maxPostsPerCategory} per OGNI piattaforma, basati su punteggio ponderato):**
${JSON.stringify(uniquePostsForAnalysis, null, 2)}

**RICHIESTA DI OUTPUT (Formato JSON Obbligatorio, racchiuso in un blocco di codice markdown):**
\`\`\`json
{
  "executiveSummary": {
    "titolo": "Report Strategico in Breve",
    "paragrafo": "Sintesi chiara e concisa (2-3 frasi) delle scoperte chiave e delle raccomandazioni generali."
  },
  "analisiQuantitativa": {
    "migliorMomentoPerPubblicare": "Giorno e ora specifici con la performance media più alta.",
    "formatoVincente": "Il tipo di contenuto (es. 'Reel', 'Carosello', 'Testo') che genera il miglior punteggio complessivo.",
    "piattaformaTop": "La piattaforma con la performance media più elevata in base al punteggio complessivo.",
    "trendPerformanceGenerali": "Un paragrafo che analizza i trend generali delle metriche chiave (views, likes, comments) su tutte le piattaforme o per tipo di contenuto, con esempi numerici se possibile."
  },
  "analisiTematica": {
    "pilastriDiContenuto": [
      {
        "tema": "Argomento identificato.",
        "performance": "Valutazione della performance con dati specifici (es. 'Il tema X ha generato un punteggio medio di Y, con picchi sul post 'Titolo Z').",
        "suggerimentiSpecifici": ["Idea 1 per espandere o replicare il successo del tema.", "Idea 2 per espandere o replicare il successo del tema."]
      }
    ]
  },
  "analisiGanci": {
    "gancioVincente": {
      "postTitolo": "Titolo del post con il gancio più efficace.",
      "gancioTesto": "Il testo esatto del gancio vincente.",
      "percheFunziona": "Spiegazione concisa del motivo per cui questo gancio è stato efficace (es. crea curiosità, risolve un problema, è controverso)."
    },
    "gancioMenoEfficace": {
      "postTitolo": "Titolo del post con il gancio meno efficace.",
      "gancioTesto": "Il testo esatto del gancio meno efficace.",
      "percheNonFunziona": "Spiegazione concisa del motivo per cui questo gancio non ha funzionato (es. troppo generico, non cattura l'attenzione)."
    },
    "consigliPerGanciEfficaci": ["Consiglio pratico 1 per creare ganci migliori.", "Consiglio pratico 2 per creare ganci migliori."]
  },
  "pianoDAzione": {
    "titolo": "Prossimi 3 Passi Strategici",
    "azioni": [
      {
        "azione": "Cosa fare (azione specifica e chiara).",
        "motivazione": "Perché farla (basata sui dati e gli insight del report).",
        "focus": "Su quale aspetto della strategia si concentra (es. Engagement, Reach, Conversione)."
      }
    ]
  }
}
\`\`\`
`;
    // --- FINE: Ottimizzazione dei dati dei post ---

    logger.info("Sto per chiamare l'API di Vertex AI...");
    const result = await model.generateContent(prompt);

    if (!result.response.candidates?.[0]?.content?.parts?.[0]?.text) {
      logger.error("Risposta AI non valida o vuota:", JSON.stringify(result.response));
      throw new HttpsError("internal", "L'AI non ha generato una risposta di testo valida.");
    }
    let responseText = result.response.candidates[0].content.parts[0].text;
    logger.info("Risposta AI RAW ricevuta (primi 500 caratteri):", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));

    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch && jsonMatch[1]) {
      responseText = jsonMatch[1];
      logger.info("JSON estratto da blocco markdown. Tentativo di parsing.");
    } else {
      logger.warn("Nessun blocco JSON markdown trovato o regex non corrispondente. Tentativo di parsing diretto del testo completo.");
      responseText = responseText.replace(/^\s*```json\s*/, '').replace(/\s*```\s*$/, '');
      logger.warn("Tentato di pulire il testo per il parsing diretto. Testo dopo pulizia (primi 500 caratteri):", responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
    }

    try {
        const jsonData = JSON.parse(responseText);
        logger.info("Parsing JSON riuscito. Invio la risposta al client.");
        return jsonData;
    } catch(parseError) {
        logger.error("Errore nel parsing della risposta JSON:", parseError, "Testo ricevuto (dopo estrazione/pulizia, potrebbe essere troncato):", responseText.substring(0, 500));
        throw new HttpsError("internal", "La risposta AI non era in un formato JSON valido.");
    }
  } catch (error) {
    logger.error("Errore durante la chiamata all'API di Vertex AI:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Impossibile generare il report AI a causa di un errore del servizio AI.");
  }
});
// =======================================================================================
// === 4. FUNZIONE NOTIFICHE PROGRAMMATE (Invariata)                                 ===
// =======================================================================================
export const sendScheduledNotifications = onSchedule({ schedule: "every 60 minutes", region: "europe-west1" }, async (event) => {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  logger.info("Esecuzione funzione notifiche:", now.toISOString());

  const postsQuery = await db.collection("contenuti")
    .where("data", ">=", now)
    .where("data", "<=", oneHourFromNow)
    .get();

  if (postsQuery.empty) {
    logger.info("Nessun post da notificare nella prossima ora.");
    return;
  }

  const userNotifications = new Map<string, any[]>();
  postsQuery.docs.forEach((doc) => {
    const post = doc.data();
    const userId = post.userId;
    if (userId) {
        if (!userNotifications.has(userId)) {
            userNotifications.set(userId, []);
        }
        userNotifications.get(userId)?.push(post);
    }
  });

  if(userNotifications.size === 0) {
    logger.info("Post trovati ma senza userId, nessuna notifica da inviare.");
    return;
  }
  
  logger.info(`Trovati post per ${userNotifications.size} utenti unici.`);

  for (const [userId, userPosts] of userNotifications.entries()) {
    const tokensQuery = await db.collection("fcmTokens").where("userId", "==", userId).get();
    
    if (tokensQuery.empty) {
      logger.warn(`Nessun token di notifica trovato per l'utente ${userId}`);
      continue;
    }

    const tokens = tokensQuery.docs.map((doc) => doc.data().token);
    const title = "Promemoria Pubblicazione! ✍️";
    const body = userPosts.length === 1 ?
      `È ora di pubblicare: "${userPosts[0].tipoContenuto}"` :
      `Hai ${userPosts.length} post da pubblicare nella prossima ora.`;
    
    const message = { notification: { title, body }, tokens: tokens };
    
    logger.info(`Invio notifica a ${userId} per ${userPosts.length} post.`);
    await messaging.sendEachForMulticast(message);
  }
});
