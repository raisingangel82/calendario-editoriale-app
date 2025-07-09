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
    Video,
    AtSign,
    Camera,
    type LucideIcon
} from 'lucide-react';

export type PlatformData = {
    id: string;
    name: string;
    icon: LucideIcon;
    iconName: string; 
    publishUrl?: string;
    analyticsUrl?: string;
    proFeature: boolean;
};

export const allDefaultPlatforms: PlatformData[] = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, iconName: 'Instagram', publishUrl: 'https://www.instagram.com/', analyticsUrl: 'https://business.facebook.com/latest/insights/content', proFeature: false },
    { id: 'facebook', name: 'Facebook', icon: Facebook, iconName: 'Facebook', publishUrl: 'https://www.facebook.com/', analyticsUrl: 'https://business.facebook.com/latest/insights/content', proFeature: false },
    { id: 'tiktok', name: 'TikTok', icon: Video, iconName: 'Video', publishUrl: 'https://www.tiktok.com/', analyticsUrl: 'https://www.tiktok.com/analytics', proFeature: false },
    { id: 'threads', name: 'Threads', icon: AtSign, iconName: 'AtSign', publishUrl: 'https://www.threads.net/', proFeature: false },
    { id: 'x', name: 'X (Twitter)', icon: Twitter, iconName: 'Twitter', publishUrl: 'https://twitter.com/compose/tweet', proFeature: false },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, iconName: 'Linkedin', publishUrl: 'https://www.linkedin.com/feed/?shareActive=true', analyticsUrl: 'https://www.linkedin.com/company/me/analytics/', proFeature: true },
    { id: 'youtube', name: 'YouTube', icon: Youtube, iconName: 'Youtube', publishUrl: 'https://www.youtube.com/upload', analyticsUrl: 'https://studio.youtube.com/', proFeature: true },
    { id: 'pinterest', name: 'Pinterest', icon: Camera, iconName: 'Camera', publishUrl: 'https://www.pinterest.com/pin-builder/', analyticsUrl: 'https://www.pinterest.com/business/hub/', proFeature: true },
    { id: 'twitch', name: 'Twitch', icon: Twitch, iconName: 'Twitch', publishUrl: 'https://dashboard.twitch.tv/stream-manager', analyticsUrl: 'https://dashboard.twitch.tv/stream-manager/analytics/channel-analytics', proFeature: true },
    { id: 'telegram', name: 'Telegram', icon: Send, iconName: 'Send', proFeature: true },
    { id: 'newsletter', name: 'Newsletter', icon: Sparkles, iconName: 'Sparkles', proFeature: true },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart, iconName: 'ShoppingCart', proFeature: true },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, iconName: 'MessageCircle', proFeature: true },
];

export const freePlatforms = allDefaultPlatforms.filter(p => !p.proFeature);