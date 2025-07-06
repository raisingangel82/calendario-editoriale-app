// src/context/AuthContext.tsx (Corretto e Completo)

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  plan: 'free' | 'pro';
  photoURL?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Tentiamo di leggere il documento dell'utente da Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            // Se il documento esiste, creiamo il nostro oggetto utente personalizzato
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              plan: userDoc.data().plan || 'free',
            });
          } else {
            // Se il documento non esiste (es. nuovo utente la cui scrittura non è completa),
            // consideralo come utente non ancora profilato.
            console.warn("Utente autenticato ma documento non trovato in Firestore:", firebaseUser.uid);
            setUser(null); 
          }
        } else {
          // Nessun utente loggato
          setUser(null);
        }
      } catch (error) {
        // Se c'è un errore (es. regole di sicurezza), lo logghiamo e resettiamo l'utente
        console.error("Errore durante il recupero del profilo utente:", error);
        setUser(null);
      } finally {
        // ▼▼▼ LA CORREZIONE FONDAMENTALE ▼▼▼
        // Questa riga viene eseguita SEMPRE, sia dopo il try che dopo il catch.
        // Garantisce che l'app smetta di caricare in ogni caso.
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = { user, loading };

  return (
    <AuthContext.Provider value={value}>
      {/* Mostra i figli solo quando il caricamento iniziale è terminato */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
  }
  return context;
};