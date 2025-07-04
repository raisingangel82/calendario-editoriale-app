import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  // Estrae il "pathname" (es. "/", "/impostazioni") dall'URL corrente
  const { pathname } = useLocation();

  // Questo "effetto" si attiva ogni volta che il pathname cambia
  useEffect(() => {
    // Riporta la finestra del browser in cima (posizione 0, 0)
    window.scrollTo(0, 0);
  }, [pathname]); // La dipendenza [pathname] assicura che venga eseguito al cambio di rotta

  // Questo componente non renderizza nulla di visibile
  return null;
};