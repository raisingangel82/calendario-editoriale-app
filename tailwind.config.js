/** @type {import('tailwindcss').Config} */
export default {
  // Aggiungiamo la strategia 'class' per il dark mode
  darkMode: 'class', 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
    safelist: [
    'border-l-gray-400',
    'border-l-red-500',
    'border-l-orange-500',
    'border-l-amber-500',
    'border-l-yellow-400',
    'border-l-green-500',
    'border-l-sky-500',
    'border-l-blue-500',
    'border-l-indigo-500',
    'border-l-purple-500',
    'border-l-pink-500',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}