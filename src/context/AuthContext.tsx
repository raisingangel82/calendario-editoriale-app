// src/context/AuthContext.tsx (Versione Definitiva per la tua struttura)

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore'; // onSnapshot è meglio per la reattività
import { auth, db } from '../firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  plan: 'free' | 'pro'; // Puoi aggiungere altri piani se necessario
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
    // Listener per l'autenticazione di Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Se l'utente è loggato, ascoltiamo le modifiche al suo documento in Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            // Se il documento esiste, creiamo il nostro oggetto utente personalizzato
            const userData = docSnap.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              plan: userData.plan || 'free', // Se 'plan' non esiste, l'utente è 'free'
            });
          } else {
            // Se il documento non esiste, consideralo 'free' per evitare errori
             console.warn("Documento utente non trovato, impostato come 'free'.");
             setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL,
                plan: 'free',
            });
          }
          setLoading(false);
        });

        // Ritorna la funzione per pulire il listener di onSnapshot quando l'utente fa logout
        return () => unsubscribeSnapshot();

      } else {
        // Nessun utente loggato
        setUser(null);
        setLoading(false);
      }
    });

    // Pulisce il listener di autenticazione quando il componente viene smontato
    return () => unsubscribeAuth();
  }, []);

  const value = { user, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
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