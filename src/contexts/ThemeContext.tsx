import React, { createContext, useState, useEffect, useContext } from 'react';
import { type ColorShade, type ProjectColor, getColor, projectColorPalette } from '../data/colorPalette';

type Theme = 'light' | 'dark';
type BaseColor = ProjectColor['base'];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorShade: ColorShade;
  setColorShade: (shade: ColorShade) => void;
  baseColor: BaseColor;
  setBaseColor: (color: BaseColor) => void;
  getActiveColor: (type: 'text' | 'bg' | 'border' | 'ring') => string;
  getActiveColorHex: () => string; // NUOVA FUNZIONE
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

  const [baseColor, setBaseColor] = useState<BaseColor>(() => {
    const savedColor = localStorage.getItem('baseColor') as BaseColor | null;
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

  useEffect(() => {
    localStorage.setItem('baseColor', baseColor);
  }, [baseColor]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const getActiveColor = (type: 'text' | 'bg' | 'border' | 'ring'): string => {
    const color = getColor(baseColor, colorShade);
    switch (type) {
      case 'text': return color.textClass;
      case 'bg': return color.bgClass;
      case 'border': return color.borderClass;
      case 'ring': return color.ringClass;
      default: return '';
    }
  };
  
  // ▼▼▼ NUOVA FUNZIONE IMPLEMENTATA ▼▼▼
  const getActiveColorHex = (): string => {
    const colorDefinition = projectColorPalette.find(p => p.base === baseColor);
    return colorDefinition?.shades[colorShade] || '#000000';
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorShade, setColorShade, baseColor, setBaseColor, getActiveColor, getActiveColorHex }}>
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