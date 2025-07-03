/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ▼▼▼ MODIFICA: Aggiunto il blocco "safelist" ▼▼▼
  safelist: [
    'bg-stone-400', 'bg-stone-700', 'bg-stone-800',
    'bg-red-400', 'bg-red-700', 'bg-red-800',
    'bg-orange-400', 'bg-orange-700', 'bg-orange-800',
    'bg-green-400', 'bg-green-700', 'bg-green-800',
    'bg-blue-400', 'bg-blue-700', 'bg-blue-800',
    'bg-purple-400', 'bg-purple-700', 'bg-purple-800',
    'bg-rose-400', 'bg-rose-700', 'bg-rose-800',
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