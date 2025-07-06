import { useState, useEffect } from 'react';

// Il valore è impostato a 1024px come da richiesta
const DESKTOP_QUERY = '(min-width: 1024px)';

export const useBreakpoint = (): boolean => {
  // Controlla il valore iniziale al primo caricamento
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(DESKTOP_QUERY).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQueryList = window.matchMedia(DESKTOP_QUERY);
    const listener = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    mediaQueryList.addEventListener('change', listener);
    
    // Pulisce il listener quando il componente viene smontato
    return () => mediaQueryList.removeEventListener('change', listener);
  }, []);

  return isDesktop;
};