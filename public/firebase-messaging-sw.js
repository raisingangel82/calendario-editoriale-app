// Questo file si chiamerà public/firebase-messaging-sw.js

// Importiamo gli script di Firebase necessari per il funzionamento in background
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

// NOTA: In questa sezione dovrai inserire le credenziali del tuo progetto Firebase
// Ti guiderò io quando configureremo il backend. Per ora, puoi lasciarle come esempio.
const firebaseConfig = {
  apiKey: "LE_TUE_CREDENZIALI_QUI",
  authDomain: "LE_TUE_CREDENZIALI_QUI",
  projectId: "LE_TUE_CREDENZIALI_QUI",
  storageBucket: "LE_TUE_CREDENZIALI_QUI",
  messagingSenderId: "LE_TUE_CREDENZIALI_QUI",
  appId: "LE_TUE_CREDENZIALI_QUI"
};

// Inizializziamo l'app di Firebase nel service worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Questo gestisce le notifiche quando l'app è in background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // Assicurati di avere un'icona in public/logo192.png
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});