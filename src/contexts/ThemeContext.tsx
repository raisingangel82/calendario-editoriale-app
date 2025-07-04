import React, { createContext, useState, useEffect, useContext } from 'react';
import { type ColorShade, type ProjectColor, getColor, projectColorPalette } from '../data/colorPalette';

type Theme = 'light' | 'dark';

// Definiamo il tipo per il colore di base, che sarà una delle stringhe della nostra palette
type BaseColor = ProjectColor['base'];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorShade: ColorShade;
  setColorShade: (shade: ColorShade) => void;
  // ▼▼▼ MODIFICA: Aggiunti il colore di base e la funzione per cambiarlo ▼▼▼
  baseColor: BaseColor;
  setBaseColor: (color: BaseColor) => void;
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

  // ▼▼▼ MODIFICA: Nuovo stato per il colore di base del tema ▼▼▼
  const [baseColor, setBaseColor] = useState<BaseColor>(() => {
    const savedColor = localStorage.getItem('baseColor') as BaseColor | null;
    // Ci assicuriamo che il colore salvato sia valido, altrimenti usiamo 'red' di default
    return savedColor && projectColorPalette.some(p => p.base === savedColor) ? savedColor : 'red';
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

  // ▼▼▼ MODIFICA: Salviamo il colore di base nel localStorage ▼▼▼
  useEffect(() => {
    localStorage.setItem('baseColor', baseColor);
  }, [baseColor]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // ▼▼▼ MODIFICA: La funzione ora usa lo stato 'baseColor' dinamico ▼▼▼
  const getActiveColor = (type: 'text' | 'bg' | 'border' | 'ring'): string => {
    const color = getColor(baseColor, colorShade); // Usa il colore di base corrente
    switch (type) {
      case 'text': return color.textClass;
      case 'bg': return color.bgClass;
      case 'border': return color.borderClass;
      case 'ring': return color.ringClass;
      default: return '';
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorShade, setColorShade, baseColor, setBaseColor, getActiveColor }}>
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