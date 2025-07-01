

import { useState, useEffect, useRef } from 'react'; // Aggiunti useRef e tipi
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Calendario } from './components/Calendario';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { Auth } from './components/Auth';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { LogOut, Settings } from 'lucide-react';
import { AccountIcon } from './components/AccountIcon';
import { ThemeProvider, useTheme } from './contexts/ThemeContext'; // Importiamo anche useTheme
import { AuthProvider, useAuth } from './context/AuthContext';
import { Impostazioni } from './pages/Impostazioni';
import type { ColorShade } from './data/colorPalette';
// 

function MainLayout() {
  const { user } = useAuth();
  const { colorShade, setColorShade } = useTheme(); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => { await signOut(auth); };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);
  
  return (
    <>
      <header className="py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8">
        <div className="w-10"></div> {/* Spacer */}
        <h1 className="text-xl font-normal tracking-widest text-center text-gray-500 dark:text-gray-400 uppercase">
          Calendario Editoriale
        </h1>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          
          {/* ▼▼▼ NUOVO MENU ACCOUNT ▼▼▼ */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="block focus:outline-none rounded-full focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
              <AccountIcon />
            </button>

            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 px-2 pt-1 pb-2 truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 mb-2">Intensità Colori</p>
                  <div className="flex justify-around bg-gray-100 dark:bg-gray-900/50 p-1 rounded-md">
                    {(['400', '700', '800'] as ColorShade[]).map(shade => (
                      <button key={shade} onClick={() => { setColorShade(shade); setIsMenuOpen(false); }} className={`w-full text-xs py-1 px-2 rounded-md transition-colors ${colorShade === shade ? 'bg-red-600 text-white font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        {shade === '400' ? 'Chiara' : shade === '700' ? 'Media' : 'Intensa'}
                      </button>
                    ))}
                  </div>
                </div>
                {user?.plan === 'pro' && (
                    <Link to="/impostazioni" onClick={() => setIsMenuOpen(false)} className="border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><Settings size={16}/> Impostazioni</Link>
                )}
                <button onClick={handleLogout} className="border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><LogOut size={16}/> Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="p-4 md:p-8">
        <div className="max-w-screen-2xl mx-auto">
          <Routes>
            <Route path="/" element={<Calendario />} />
            <Route path="/impostazioni" element={user?.plan === 'pro' ? <Impostazioni /> : <Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </>
  );
}

// AppContent ora gestisce solo il routing di primo livello
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center"><p>Caricamento...</p></div>;
  }

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen font-sans">
      <Routes>
        {/* Se l'utente è loggato, mostra il layout principale. Altrimenti, reindirizza al login. */}
        <Route path="/*" element={user ? <MainLayout /> : <Navigate to="/login" />} />
        
        {/* Se l'utente non è loggato, mostra la pagina di Auth. Altrimenti, reindirizza alla home. */}
        <Route path="/login" element={!user ? <Auth /> : <Navigate to="/" />} />
      </Routes>
    </div>
  );
}


// Il componente App ora fornisce il BrowserRouter e i contesti
function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;