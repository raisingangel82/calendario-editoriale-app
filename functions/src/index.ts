/**
 * File: functions/src/index.ts
 * Funzioni Backend per AuthorFlow - Versione Finale
 *
 * Funzionalità:
 * 1. createStripeCheckout: Crea una sessione di pagamento Stripe con reindirizzamento dinamico.
 * 2. generateContentReport: Usa l'API di Gemini per generare analisi AI.
 * 3. sendScheduledNotifications: Invia notifiche push programmate per i post.
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import Stripe from "stripe";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inizializza il Firebase Admin SDK
initializeApp();

// --- CONFIGURAZIONE CHIAVI SEGRETE (Metodo Gen2) ---
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const geminiApiKey = defineString("GEMINI_API_KEY");

// --- INIZIALIZZAZIONE DEI SERVIZI FIREBASE ---
const db = getFirestore();
const messaging = getMessaging();

// L'inizializzazione di Stripe e Gemini è spostata DENTRO ogni funzione per il lazy loading.

// =======================================================================================
// === 1. FUNZIONE PAGAMENTI STRIPE                                                    ===
// =======================================================================================
export const createStripeCheckout = onCall({ region: "europe-west1" }, async (request) => {
  // Inizializzazione LAZY: avviene solo quando la funzione è chiamata.
  const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2025-06-30.basil" });

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "È necessario essere autenticati per effettuare un acquisto.");
  }

  // Riceviamo sia priceId che l'URL di origine dal frontend
  const { priceId, origin } = request.data;
  
  if (!priceId || !origin) {
    throw new HttpsError("invalid-argument", "L'ID del prezzo e l'URL di origine sono obbligatori.");
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: request.auth?.uid, // Collega la sessione all'ID utente di Firebase
      // Usiamo l'origine dinamica per costruire gli URL di reindirizzamento
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade`,
    });

    if (!session.url) {
      throw new HttpsError("internal", "Impossibile creare la sessione di pagamento Stripe.");
    }
    
    return { url: session.url };
  } catch (error) {
    logger.error("Errore durante la creazione della sessione Stripe:", error);
    throw new HttpsError(
      "internal",
      "Si è verificato un errore interno. Riprova più tardi."
    );
  }
});


// =======================================================================================
// === 2. FUNZIONE GENERAZIONE REPORT AI (Mantenuta e aggiornata a Gen2)             ===
// =======================================================================================
export const generateContentReport = onCall({ region: "europe-west1" }, async (request) => {
  // Inizializzazione LAZY
  const genAI = new GoogleGenerativeAI(geminiApiKey.value());

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
  }

  const postsWithPerformance = request.data.posts;
  if (!postsWithPerformance || !Array.isArray(postsWithPerformance) || postsWithPerformance.length === 0) {
    throw new HttpsError("invalid-argument", "La funzione richiede un elenco di post.");
  }
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  const prompt = `
    Sei un social media strategist esperto, specializzato nell'analizzare dati per autori e creatori di contenuti. Il tuo tono è incoraggiante, professionale e orientato all'azione.
    Analizza il seguente elenco di post e le loro performance (in formato JSON) per identificare pattern e generare un report sintetico per l'utente.
    DATI DEI POST:
    ${JSON.stringify(postsWithPerformance, null, 2)}
    RICHIESTA:
    Basandoti sui dati forniti, genera una risposta in formato JSON con le seguenti chiavi:
    1. "puntiDiForza": (stringa) Un paragrafo che descrive 2-3 punti di forza evidenti emersi dall'analisi.
    2. "areeDiMiglioramento": (stringa) Un paragrafo che descrive 1-2 aree di miglioramento o opportunità non sfruttate.
    3. "consigliPratici": (array di stringhe) Una lista di 3 consigli concreti e attuabili che l'utente può applicare subito.
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
    logger.error("Errore durante la chiamata a Gemini:", error);
    throw new HttpsError("internal", "Impossibile generare il report AI in questo momento.");
  }
});


// =======================================================================================
// === 3. FUNZIONE NOTIFICHE PROGRAMMATE (Mantenuta)                                   ===
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
    const tokensQuery = await db.collection("subscriptions").where("userId", "==", userId).get();
    
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
