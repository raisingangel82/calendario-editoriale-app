import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' // <-- LA CORREZIONE È QUI

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})