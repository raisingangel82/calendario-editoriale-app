import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
// --- CORREZIONE: Unica riga di import per le funzioni HTTP ---
import { onCall, HttpsError, onRequest, Request } from "firebase-functions/v2/https";
import { Response } from "express"; // Import per il tipo della risposta
// ---
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Stripe from "stripe";
import { GoogleGenerativeAI } from "@google/generative-ai";

initializeApp();

// --- CORREZIONE: Definizione di tutti i segreti necessari ---
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const geminiApiKey = defineString("GEMINI_API_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

const db = getFirestore();
const messaging = getMessaging();

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

  // Aggiungiamo la gestione della cancellazione dell'abbonamento
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    // Troviamo l'utente tramite il suo customer ID di Stripe
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


// =======================================================================================
// === 3. FUNZIONE GENERAZIONE REPORT AI (CON PROMPT COMPLETO)                         ===
// =======================================================================================
export const generateContentReport = onCall({ region: "europe-west1" }, async (request) => {
  const genAI = new GoogleGenerativeAI(geminiApiKey.value());
  if (!request.auth) { throw new HttpsError("unauthenticated", "Funzione non autorizzata."); }
  
  const postsWithPerformance = request.data.posts;
  if (!postsWithPerformance || !Array.isArray(postsWithPerformance) || postsWithPerformance.length === 0) { 
    throw new HttpsError("invalid-argument", "Dati dei post mancanti."); 
  }
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
  
  const prompt = `
    Sei un social media strategist esperto, specializzato nell'analizzare dati per autori e creatori di contenuti. Il tuo tono è incoraggiante, professionale e orientato all'azione.
    Analizza il seguente elenco di post e le loro performance (in formato JSON) per identificare pattern e generare un report sintetico per l'utente.

    DATI DEI POST:
    ${JSON.stringify(postsWithPerformance, null, 2)}

    RICHIESTA:
    Basandoti sui dati forniti, genera una risposta in formato JSON con le seguenti chiavi:
    1. "puntiDiForza": (stringa) Un paragrafo che descrive 2-3 punti di forza evidenti emersi dall'analisi (es. "I tuoi reel sulla scrittura creativa ottengono un engagement eccezionale, specialmente quando pubblichi di martedì. Questo indica che il formato video è il tuo cavallo di battaglia.").
    2. "areeDiMiglioramento": (stringa) Un paragrafo che descrive 1-2 aree di miglioramento o opportunità non sfruttate (es. "I post testuali, pur essendo ben scritti, ricevono meno interazioni. Potresti provare a trasformare alcuni di questi concetti in caroselli visivi per aumentarne l'impatto.").
    3. "consigliPratici": (array di stringhe) Una lista di 3 consigli concreti e attuabili che l'utente può applicare subito (es. ["Crea un reel a settimana focalizzato su un consiglio di scrittura.", "Sperimenta con i caroselli per i tuoi post più lunghi.", "Interagisci con i commenti entro la prima ora dalla pubblicazione per stimolare l'algoritmo."]).
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    try {
        return JSON.parse(responseText);
    } catch(parseError) {
        logger.error("Errore nel parsing della risposta JSON da Gemini:", parseError, "Testo ricevuto:", responseText);
        throw new HttpsError("internal", "La risposta AI non era in un formato JSON valido.");
    }
  } catch (error) {
    logger.error("Errore chiamata Gemini:", error);
    throw new HttpsError("internal", "Impossibile generare il report AI.");
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
