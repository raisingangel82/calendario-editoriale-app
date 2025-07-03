import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();

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
    // ▼▼▼ MODIFICA: Cambiato da 'return null' a 'return' ▼▼▼
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
    const tokensQuery = await db.collection("subscriptions")
      .where("userId", "==", userId)
      .get();

    if (tokensQuery.empty) {
      logger.warn(`Nessun token per l'utente ${userId}`);
      continue;
    }

    const tokens = tokensQuery.docs.map((doc) => doc.data().token);
    
    const title = "Promemoria Pubblicazione! ✍️";
    const body = userPosts.length === 1 ?
      `È ora di pubblicare: "${userPosts[0].tipoContenuto}"` :
      `Hai ${userPosts.length} post da pubblicare nella prossima ora.`;

    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    logger.info(`Invio notifica a ${userId} per ${userPosts.length} post.`);
    await admin.messaging().sendMulticast(message);
  }

  // ▼▼▼ MODIFICA: Cambiato da 'return null' a 'return' ▼▼▼
  return;
});