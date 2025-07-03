import React, { createContext, useState, useEffect, useContext } from 'react';
import { type ColorShade, getColor } from '../data/colorPalette';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorShade: ColorShade;
  setColorShade: (shade: ColorShade) => void;
  // ▼▼▼ MODIFICA: Aggiunta una funzione helper per ottenere la classe del colore attivo ▼▼▼
  getActiveColor: (type: 'text' | 'bg' | 'border' | 'ring') => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    return savedTheme || 'light';
  });

  const [colorShade, setColorShade] = useState<ColorShade>(() => {
      const savedShade = localStorage.getItem('colorShade') as ColorShade | null;
      return savedShade || '700';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
      localStorage.setItem('colorShade', colorShade);
  }, [colorShade]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // ▼▼▼ MODIFICA: Implementazione della nuova funzione ▼▼▼
  const getActiveColor = (type: 'text' | 'bg' | 'border' | 'ring'): string => {
    const color = getColor('red', colorShade); // Usiamo 'red' come colore base del tema
    switch (type) {
      case 'text': return color.textClass;
      case 'bg': return color.bgClass;
      case 'border': return color.borderClass;
      case 'ring': return color.ringClass;
      default: return '';
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorShade, setColorShade, getActiveColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve essere usato all\'interno di un ThemeProvider');
  }
  return context;
};