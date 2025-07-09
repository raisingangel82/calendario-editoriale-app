import React from 'react';
import { Facebook, Instagram, Youtube, Sparkles } from 'lucide-react'; 
import { SiTiktok, SiThreads, SiX } from '@icons-pack/react-simple-icons'; 

interface PlatformIconProps {
  platform?: string;
  className?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, className = "w-6 h-6" }) => {
    if (!platform) {
        return <Sparkles size={20} className={className} />;
    }

    const platformName = platform.toLowerCase();
    const commonProps = { size: 20, className };

    switch (platformName) {
        case 'facebook':
            return <Facebook {...commonProps} />;
        // [CORREZIONE] Associata l'icona corretta a Instagram
        case 'instagram':
            return <Instagram {...commonProps} />;
        case 'youtube':
            return <Youtube {...commonProps} />;
        case 'tiktok':
            return <SiTiktok {...commonProps} />;
        // [CORREZIONE] Associata l'icona corretta a Twitter/X
        case 'x':
        case 'twitter':
            return <SiX {...commonProps} />;
        case 'threads':
            return <SiThreads {...commonProps} />;
        default:
            return <Sparkles {...commonProps} />;
    }
};