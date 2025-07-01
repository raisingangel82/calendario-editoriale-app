import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Assicurati che il percorso a firebase.ts sia corretto

// 1. AGGIUNTA LA PROPRIETÀ photoURL
export interface AppUser {
  uid: string;
  email: string | null;
  plan: 'free' | 'pro';
  photoURL?: string | null; // Aggiunto campo opzionale per la foto
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          // 2. SALVIAMO ANCHE IL photoURL
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL, // Aggiunto photoURL
            plan: userDoc.data().plan || 'free',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
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