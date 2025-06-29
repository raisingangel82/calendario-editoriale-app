import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Funzione semplificata: ora crea solo il profilo utente, senza progetti.
  const createUserProfileDocument = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      email: user.email,
      plan: 'free', // Ogni nuovo utente parte con il piano gratuito
      createdAt: Timestamp.now()
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (isLogin) {
        // Logica per il Login (invariata)
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Logica per la Registrazione
        const currentUser = auth.currentUser;

        if (currentUser && currentUser.isAnonymous) {
          const credential = EmailAuthProvider.credential(email, password);
          const userCredential = await linkWithCredential(currentUser, credential);
          // Non crea più i progetti di default
          await createUserProfileDocument(userCredential);
        } else {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
           // Non crea più i progetti di default
          await createUserProfileDocument(userCredential);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Questo indirizzo email è già stato registrato.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email o password non corretta.');
      } else {
        setError('Si è verificato un errore. Riprova.');
      }
      console.error("Errore di autenticazione:", err);
    }
  };

  const inputStyle = "w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-600 focus:ring-0 focus:border-red-600 dark:focus:border-red-500 transition-colors py-2 text-gray-800 dark:text-gray-200";
  const labelStyle = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider";

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 -m-8">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isLogin ? 'Accedi al tuo Calendario' : 'Crea un Account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className={labelStyle}>Indirizzo Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelStyle}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyle}
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-gray-800 dark:bg-gray-50 py-3 px-4 text-sm font-medium text-white dark:text-gray-900 hover:bg-black dark:hover:bg-white transition-colors"
            >
              {isLogin ? 'Accedi' : 'Registrati'}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {isLogin ? 'Non hai un account?' : 'Hai già un account?'}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="font-medium text-red-600 hover:text-red-500 ml-1">
            {isLogin ? 'Registrati' : 'Accedi'}
          </button>
        </p>
      </div>
    </div>
  );
};