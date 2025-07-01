import React from 'react';
import {
  SiInstagram, SiTiktok, SiFacebook, SiYoutube, SiLinkedin, SiThreads, 
  SiX // <-- 1. NOME CORRETTO DELL'ICONA IMPORTATA
} from 'react-icons/si';
import { HelpCircle } from 'lucide-react'; // Un'icona di default

interface PlatformIconProps {
  platform: string;
  className?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, className = "w-5 h-5" }) => {
  const platformLower = platform?.toLowerCase() || '';

  // Usiamo un'istruzione switch per restituire l'icona corretta
  switch (platformLower) {
    case 'instagram':
      return <SiInstagram className={className} />;
    case 'tiktok':
      return <SiTiktok className={className} />;
    case 'facebook':
      return <SiFacebook className={className} />;
    case 'youtube':
      return <SiYoutube className={className} />;
    case 'linkedin':
      return <SiLinkedin className={className} />;
    case 'threads':
      return <SiThreads className={className} />;
    case 'x (twitter)':
    case 'x':
      return <SiX className={className} />; // <-- 2. USIAMO IL COMPONENTE CORRETTO
    default:
      // Se non troviamo una corrispondenza, mostriamo un'icona generica
      return <HelpCircle className={className} />;
  }
};