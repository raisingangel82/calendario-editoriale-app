import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);