import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext.tsx'; // Importa il provider

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Avvolgiamo App con ThemeProvider */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)