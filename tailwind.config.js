/** @type {import('tailwindcss').Config} */

// Importiamo la palette di colori per generare la safelist dinamicamente
import { projectColorPalette } from './src/data/colorPalette';

// Estraiamo tutte le classi di sfondo (es. 'bg-red-700') dalla palette
const backgroundColors = projectColorPalette.flatMap(color => Object.values(color.shades));

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ▼▼▼ MODIFICA: Aggiunto il blocco "safelist" completo ▼▼▼
  safelist: [
    ...backgroundColors, // Includiamo tutti i colori dei progetti
    // Aggiungiamo anche le altre varianti usate per il tema
    'bg-red-400', 'bg-red-700', 'bg-red-800',
    'text-red-400', 'text-red-700', 'text-red-800',
    'ring-red-400', 'ring-red-700', 'ring-red-800',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}