import { 
    Facebook, 
    Instagram, 
    Linkedin, 
    Send, 
    ShoppingCart, 
    Youtube, 
    Twitter, 
    Sparkles, 
    Twitch, 
    MessageCircle,
    Video,      // Per TikTok
    AtSign,     // Per Threads
    Camera      // Per Pinterest
} from 'lucide-react';

export type PlatformData = {
    id: string;
    name: string;
    icon: React.ElementType;
    publishUrl?: string;
    proFeature: boolean;
};

export const allDefaultPlatforms: PlatformData[] = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, publishUrl: 'https://www.instagram.com/', proFeature: false },
    { id: 'facebook', name: 'Facebook', icon: Facebook, publishUrl: 'https://www.facebook.com/', proFeature: false },
    // --- Icone problematiche sostituite con alternative da lucide-react ---
    { id: 'tiktok', name: 'TikTok', icon: Video, publishUrl: 'https://www.tiktok.com/', proFeature: false },
    { id: 'threads', name: 'Threads', icon: AtSign, publishUrl: 'https://www.threads.net/', proFeature: false },
    { id: 'x', name: 'X', icon: Twitter, publishUrl: 'https://twitter.com/compose/tweet', proFeature: false },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, publishUrl: 'https://www.linkedin.com/feed/?shareActive=true', proFeature: true },
    { id: 'youtube', name: 'YouTube', icon: Youtube, publishUrl: 'https://www.youtube.com/upload', proFeature: true },
    { id: 'pinterest', name: 'Pinterest', icon: Camera, publishUrl: 'https://www.pinterest.com/pin-builder/', proFeature: true },
    { id: 'twitch', name: 'Twitch', icon: Twitch, publishUrl: 'https://dashboard.twitch.tv/stream-manager', proFeature: true },
    { id: 'telegram', name: 'Telegram', icon: Send, proFeature: true },
    { id: 'newsletter', name: 'Newsletter', icon: Sparkles, proFeature: true },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart, proFeature: true },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, proFeature: true },
];

export const freePlatforms = allDefaultPlatforms.filter(p => !p.proFeature);
