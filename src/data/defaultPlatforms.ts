import { Facebook, Instagram, Linkedin, Pinterest, Send, ShoppingCart, Youtube, Twitter, Sparkles, Twitch, MessageCircle } from 'lucide-react';
import { SiTiktok, SiThreads } from 'react-icons/si';

// ▼▼▼ MODIFICA: Aggiunto "publishUrl" alla definizione del tipo ▼▼▼
export interface PlatformData {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  baseUrl: string;
  publishUrl?: string; // URL per la pagina di creazione post
  isCustom?: boolean;
}

// ▼▼▼ MODIFICA: Aggiunti i "publishUrl" di default ▼▼▼
const defaultPlatforms: Omit<PlatformData, 'id'>[] = [
  { name: 'Instagram', icon: Instagram, baseUrl: 'https://instagram.com', publishUrl: 'https://www.instagram.com/create/select/' },
  { name: 'Facebook', icon: Facebook, baseUrl: 'https://facebook.com', publishUrl: 'https://www.facebook.com/business/latest/composer' },
  { name: 'TikTok', icon: SiTiktok, baseUrl: 'https://tiktok.com', publishUrl: 'https://www.tiktok.com/upload' },
  { name: 'YouTube', icon: Youtube, baseUrl: 'https://youtube.com', publishUrl: 'https://studio.youtube.com/' },
  { name: 'X (Twitter)', icon: Twitter, baseUrl: 'https://x.com', publishUrl: 'https://x.com/compose/post' },
  { name: 'LinkedIn', icon: Linkedin, baseUrl: 'https://linkedin.com', publishUrl: 'https://www.linkedin.com/feed/' },
  { name: 'Pinterest', icon: Pinterest, baseUrl: 'https://pinterest.com', publishUrl: 'https://www.pinterest.com/pin-builder/' },
  { name: 'Threads', icon: SiThreads, baseUrl: 'https://threads.net', publishUrl: 'https://www.threads.net/' },
  { name: 'Telegram', icon: Send, baseUrl: 'https://web.telegram.org', publishUrl: 'https://web.telegram.org/' },
  { name: 'Amazon', icon: ShoppingCart, baseUrl: 'https://kdp.amazon.com', publishUrl: 'https://kdp.amazon.com/it_IT/title-setup/paperback/new' },
  { name: 'Twitch', icon: Twitch, baseUrl: 'https://twitch.tv', publishUrl: 'https://dashboard.twitch.tv/stream-manager' },
  { name: 'Community', icon: Sparkles, baseUrl: '', publishUrl: '' },
  { name: 'Newsletter', icon: MessageCircle, baseUrl: '', publishUrl: '' },
];

export const allDefaultPlatforms: PlatformData[] = defaultPlatforms.map((p, index) => ({
  ...p,
  id: `default-${index}`,
  isCustom: false
}));

export const freePlatforms = allDefaultPlatforms.filter(p => ['Instagram', 'Facebook', 'TikTok'].includes(p.name));