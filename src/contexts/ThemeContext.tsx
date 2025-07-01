import React, { createContext, useState, useEffect, useContext } from 'react';
import type { ColorShade } from '../data/colorPalette'; // Importiamo il nostro nuovo tipo

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorShade: ColorShade; // <-- NUOVO STATO
  setColorShade: (shade: ColorShade) => void; // <-- NUOVA FUNZIONE
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    return savedTheme || 'light';
  });

  // NUOVO STATO PER LA TONALITÀ
  const [colorShade, setColorShade] = useState<ColorShade>(() => {
      const savedShade = localStorage.getItem('colorShade') as ColorShade | null;
      return savedShade || '700'; // Default alla tonalità media
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // NUOVO EFFETTO PER SALVARE LA TONALITÀ
  useEffect(() => {
      localStorage.setItem('colorShade', colorShade);
  }, [colorShade]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorShade, setColorShade }}>
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