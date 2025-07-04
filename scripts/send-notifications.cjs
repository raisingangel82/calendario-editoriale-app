const admin = require('firebase-admin');

// Recupera la chiave dal segreto di GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function sendNotifications() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  console.log("Esecuzione script notifiche via GitHub Actions:", now.toISOString());

  const postsQuery = await db.collection("contenuti")
    .where("data", ">=", now)
    .where("data", "<=", oneHourFromNow)
    .get();

  if (postsQuery.empty) {
    console.log("Nessun post da notificare.");
    return;
  }

  const postsToNotify = postsQuery.docs.map((doc) => doc.data());
  console.log(`Trovati ${postsToNotify.length} post da notificare.`);

  const userNotifications = new Map();
  postsToNotify.forEach((post) => {
    const userId = post.userId;
    if (!userNotifications.has(userId)) {
      userNotifications.set(userId, []);
    }
    userNotifications.get(userId).push(post);
  });

  for (const [userId, userPosts] of userNotifications.entries()) {
    const tokensQuery = await db.collection("subscriptions")
      .where("userId", "==", userId)
      .get();
    
    if (tokensQuery.empty) {
      console.warn(`Nessun token per l'utente ${userId}`);
      continue;
    }

    const tokens = tokensQuery.docs.map((doc) => doc.data().token);
    const title = "Promemoria Pubblicazione! ✍️";
    const body = userPosts.length === 1 ?
      `È ora di pubblicare: "${userPosts[0].tipoContenuto}"` :
      `Hai ${userPosts.length} post da pubblicare nella prossima ora.`;

    const message = { notification: { title, body }, tokens };

    console.log(`Invio notifica a ${userId} per ${userPosts.length} post.`);
    
    // ▼▼▼ MODIFICA: Aggiungiamo il log della risposta di Firebase ▼▼▼
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log('Messaggio inviato a Firebase. Risposta ricevuta:', JSON.stringify(response, null, 2));

    if (response.failureCount > 0) {
      console.error('ATTENZIONE: Invio fallito per alcuni token.');
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`- Token [${tokens[idx]}]: ${resp.error.message}`);
        }
      });
    }
  }
}

sendNotifications().catch(console.error);