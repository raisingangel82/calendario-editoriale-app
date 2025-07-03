// Questo file si chiamerà public/firebase-messaging-sw.js

// Importiamo gli script di Firebase necessari per il funzionamento in background
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA3EiyPqxAJRo6A8xnva0iB3R2XGZnKPWI",
  authDomain: "calendario-editoriale-so-bc85b.firebaseapp.com",
  projectId: "calendario-editoriale-so-bc85b",
  storageBucket: "calendario-editoriale-so-bc85b.firebasestorage.app",
  messagingSenderId: "163208289900",
  appId: "1:163208289900:web:ac529fa7abd47cb64b4249",
  measurementId: "G-386XG3W2CE"
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