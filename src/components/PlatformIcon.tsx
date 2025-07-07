import React from 'react';
import { 
  Instagram, 
  Video, // Sostituisce TikTok
  Facebook, 
  Youtube, 
  Linkedin, 
  AtSign, // Sostituisce Threads
  Twitter, // Sostituisce X
  HelpCircle 
} from 'lucide-react';

interface PlatformIconProps {
  platform: string;
  className?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, className = "w-5 h-5" }) => {
  const platformName = platform.toLowerCase();

  switch (platformName) {
    case 'instagram':
      return <Instagram className={className} />;
    case 'tiktok':
      return <Video className={className} />; // Icona sostituita
    case 'facebook':
      return <Facebook className={className} />;
    case 'youtube':
      return <Youtube className={className} />;
    case 'linkedin':
      return <Linkedin className={className} />;
    case 'threads':
      return <AtSign className={className} />; // Icona sostituita
    case 'x':
    case 'twitter':
      return <Twitter className={className} />; // Icona sostituita
    default:
      return <HelpCircle className={className} />;
  }
};
