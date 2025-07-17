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
// Importa il modulo 'cors' con un'importazione predefinita
import cors from 'cors'; // MODIFICA QUI: da 'import * as cors' a 'import cors'

initializeApp();

const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

const db = getFirestore();
const messaging = getMessaging();

// Inizializza il middleware CORS
// Permetti tutte le origini per semplicità in fase di sviluppo.
// In produzione, considera di specificare la tua origine esatta:
// const corsHandler = cors({ origin: 'https://calendario-editoriale-app.vercel.app' });
const corsHandler = cors({ origin: true });

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
  // Applica il middleware CORS alla richiesta webhook
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
export const generateContentReport = onCall({ region: "europe-west1", timeoutSeconds: 300 }, async (request) => {
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
    // Inizializzazione corretta con VertexAI per l'ambiente server
    const vertex_ai = new VertexAI({ project: 'calendario-editoriale-so-bc85b', location: 'europe-west1' });
    // Usiamo un modello stabile e potente
    const model = vertex_ai.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    const listaPiattaforme = [...new Set(posts.map((p: any) => p.piattaforma).filter(Boolean))];

    const prompt = `
Sei 'Stratagem', un'intelligenza artificiale esperta in data analysis e strategia per social media.
Analizza i dati forniti per generare un report JSON strutturato con un executive summary, analisi quantitative, analisi tematiche e un piano d'azione.

**INPUT CONTESTUALE:**
- **Piattaforme Analizzate:** ${JSON.stringify(listaPiattaforme)}
- **Obiettivo Principale dell'Utente:** "${goal}"
- **Target Audience Descritto dall'Utente:** "${audience}"

**DATI DEI POST (JSON):**
${JSON.stringify(posts, null, 2)}

**RICHIESTA DI OUTPUT (Formato JSON Obbligatorio):**
{
  "executiveSummary": { "titolo": "Report Strategico in Breve", "paragrafo": "Sintesi di 1-2 frasi." },
  "analisiQuantitativa": { "migliorMomentoPerPubblicare": "Giorno e ora.", "formatoVincente": "Tipo di post.", "piattaformaTop": "Piattaforma." },
  "analisiTematica": { "pilastriDiContenuto": [ { "tema": "Argomento.", "performance": "Valutazione e dato." } ] },
  "pianoDAzione": { "titolo": "Prossimi 3 Passi Strategici", "azioni": [ { "azione": "Consiglio specifico.", "motivazione": "Ragione basata sui dati.", "focus": "Obiettivo dell'azione." } ] }
}
`;

    logger.info("Sto per chiamare l'API di Vertex AI...");
    const result = await model.generateContent(prompt);

    // Estrazione sicura della risposta
    if (!result.response.candidates?.[0]?.content?.parts?.[0]?.text) {
      logger.error("Risposta AI non valida o vuota:", JSON.stringify(result.response));
      throw new HttpsError("internal", "L'AI non ha generato una risposta di testo valida.");
    }
    const responseText = result.response.candidates[0].content.parts[0].text;
    logger.info("Risposta ricevuta. Provo a fare il parsing del JSON.");

    try {
        const jsonData = JSON.parse(responseText);
        logger.info("Parsing JSON riuscito. Invio la risposta al client.");
        return jsonData;
    } catch(parseError) {
        logger.error("Errore nel parsing della risposta JSON:", parseError, "Testo ricevuto:", responseText);
        throw new HttpsError("internal", "La risposta AI non era in un formato JSON valido.");
    }
  } catch (error) {
    logger.error("Errore durante la chiamata all'API di Vertex AI:", error);
    // Cattura e rilancia HttpsError se già presente, altrimenti crea un nuovo HttpsError
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
