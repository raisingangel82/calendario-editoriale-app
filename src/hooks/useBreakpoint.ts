import { useState, useEffect } from 'react';

// Valore del breakpoint 'md' di Tailwind (768px)
const breakpoint = 768; 

export const useBreakpoint = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= breakpoint);
    };

    window.addEventListener('resize', handleResize);

    // Pulisci l'evento quando il componente non è più visibile
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
};