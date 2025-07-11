import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();

// --- MODIFICA: La chiave ora viene letta dalla configurazione delle funzioni ---
const geminiApiKey = functions.config().gemini.key;
if (!geminiApiKey) {
  logger.error("La chiave API di Gemini non è configurata. Esegui 'firebase functions:config:set gemini.key=...'");
}
const genAI = new GoogleGenerativeAI(geminiApiKey);


// =======================================================================================
// === NUOVA FUNZIONE: Generazione Report AI                                           ===
// =======================================================================================
export const generateContentReport = functions.region("europe-west1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "La funzione deve essere chiamata da un utente autenticato.");
  }

  const postsWithPerformance = data.posts;
  if (!postsWithPerformance || postsWithPerformance.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "La funzione richiede un elenco di post con dati di performance.");
  }
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  const prompt = `
    Sei un social media strategist esperto, specializzato nell'analizzare dati per autori e creatori di contenuti. Il tuo tono è incoraggiante, professionale e orientato all'azione.
    Analizza il seguente elenco di post e le loro performance (in formato JSON) per identificare pattern e generare un report sintetico per l'utente.
    DATI DEI POST:
    ${JSON.stringify(postsWithPerformance, null, 2)}
    RICHIESTA:
    Basandoti sui dati forniti, genera una risposta in formato JSON con le seguenti chiavi:
    1.  "puntiDiForza": (stringa) Un paragrafo che descrive 2-3 punti di forza evidenti emersi dall'analisi. Esempio: "I tuoi reel ottengono mediamente il 50% di visualizzazioni in più rispetto alle immagini, specialmente quando pubblichi di martedì."
    2.  "areeDiMiglioramento": (stringa) Un paragrafo che descrive 1-2 aree di miglioramento o opportunità non sfruttate. Esempio: "I post testuali su LinkedIn mostrano un alto tasso di commenti, ma sono poco frequenti. Potrebbe esserci un'opportunità di approfondire questo formato."
    3.  "consigliPratici": (array di stringhe) Una lista di 3 consigli concreti e attuabili che l'utente può applicare subito. Esempio: ["Pianifica almeno un reel a settimana incentrato sul 'dietro le quinte' della scrittura.", "Crea più caroselli su Instagram per spiegare i concetti dei tuoi libri, dato l'alto numero di 'salvataggi' che generano.", "Aggiungi una domanda diretta alla fine di ogni post su LinkedIn per capitalizzare sull'alto tasso di commenti."]
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    logger.error("Errore durante la chiamata all'API di Gemini:", error);
    throw new functions.https.HttpsError("internal", "Impossibile generare il report AI in questo momento.");
  }
});


// =======================================================================================
// === FUNZIONE ESISTENTE: Invio Notifiche Programmate                                 ===
// =======================================================================================
export const sendScheduledNotifications = onSchedule("every 60 minutes", async (event: ScheduledEvent) => {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const db = admin.firestore();
  logger.info("Esecuzione funzione notifiche:", now.toISOString());

  const postsQuery = await db.collection("contenuti")
    .where("data", ">=", now)
    .where("data", "<=", oneHourFromNow)
    .get();

  if (postsQuery.empty) {
    logger.info("Nessun post da notificare.");
    return;
  }

  const postsToNotify = postsQuery.docs.map((doc) => doc.data());
  logger.info(`Trovati ${postsToNotify.length} post da notificare.`);
  const userNotifications = new Map<string, any[]>();
  postsToNotify.forEach((post) => {
    const userId = post.userId;
    if (!userNotifications.has(userId)) {
      userNotifications.set(userId, []);
    }
    userNotifications.get(userId)?.push(post);
  });

  for (const [userId, userPosts] of userNotifications.entries()) {
    const tokensQuery = await db.collection("subscriptions").where("userId", "==", userId).get();
    if (tokensQuery.empty) {
      logger.warn(`Nessun token per l'utente ${userId}`);
      continue;
    }
    const tokens = tokensQuery.docs.map((doc) => doc.data().token);
    const title = "Promemoria Pubblicazione! ✍️";
    const body = userPosts.length === 1 ?
      `È ora di pubblicare: "${userPosts[0].tipoContenuto}"` :
      `Hai ${userPosts.length} post da pubblicare nella prossima ora.`;
    const message = { notification: { title, body }, tokens: tokens, };
    logger.info(`Invio notifica a ${userId} per ${userPosts.length} post.`);
    await admin.messaging().sendMulticast(message);
  }
  
  return;
});