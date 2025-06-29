/** @type {import('tailwindcss').Config} */
export default {
  // Aggiungiamo la strategia 'class' per il dark mode
  darkMode: 'class', 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}