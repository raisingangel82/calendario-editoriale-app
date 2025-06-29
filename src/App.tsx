import { useState, useEffect } from 'react';
import { Calendario } from './components/Calendario.tsx';
import { ThemeSwitcher } from './components/ThemeSwitcher.tsx';
import { Auth } from './components/Auth.tsx';
import { auth } from './firebase.ts';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth'; // Corretto
import { LogOut } from 'lucide-react';
import { AccountIcon } from './components/AccountIcon.tsx';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <div className="bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center"><p>Caricamento...</p></div>;
  }

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen font-sans">
      {user ? (
        <>
          <header className="py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8">
            <AccountIcon user={user} />
            <h1 className="text-xl font-normal tracking-widest text-center text-gray-500 dark:text-gray-400 uppercase">Calendario Editoriale</h1>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <button onClick={handleLogout} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </header>
          <main className="p-4 md:p-8">
            <div className="max-w-screen-2xl mx-auto">
              <Calendario user={user} />
            </div>
          </main>
        </>
      ) : (
        <Auth />
      )}
    </div>
  );
}
export default App;