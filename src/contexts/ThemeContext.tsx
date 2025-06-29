import React, { createContext, useState, useEffect, useContext } from 'react';

// Definiamo i tipi per il nostro context
type Theme = 'light' | 'dark';
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Creiamo il Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Creiamo il Provider, il componente che gestirà la logica
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Controlla se un tema è salvato in localStorage, altrimenti usa 'light'
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    return savedTheme || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Rimuovi la classe vecchia e aggiungi quella nuova
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);

    // Salva la scelta nel localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Creiamo un custom hook per usare facilmente il context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve essere usato all\'interno di un ThemeProvider');
  }
  return context;
};