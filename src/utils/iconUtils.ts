import React from 'react';
import { Facebook, Instagram, Youtube, Sparkles } from 'lucide-react';
import { SiTiktok, SiThreads, SiX } from '@icons-pack/react-simple-icons';
import type { PlatformData } from '../types';

// Questa funzione sarà l'unica fonte di verità per le icone delle piattaforme
export const getPlatformIcon = (platform: { name?: string }): React.ElementType => {
    if (!platform?.name) return Sparkles; // Icona di fallback

    const platformName = platform.name.toLowerCase();

    switch (platformName) {
        case 'facebook': return Facebook;
        case 'instagram': return Instagram;
        case 'youtube': return Youtube;
        case 'tiktok': return SiTiktok;
        case 'x': // Gestisce sia 'x' che 'twitter'
        case 'twitter': return SiX;
        case 'threads': return SiThreads;
        default: return Sparkles;
    }
};