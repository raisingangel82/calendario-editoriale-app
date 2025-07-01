// Definiamo una struttura (interfaccia) per ogni piattaforma
export interface PlatformData {
  id: string;
  name: string;
  icon: string; // La useremo per mostrare l'icona
  baseUrl: string; // Il link base per la condivisione
}

// Lista di piattaforme per il piano FREE
export const freePlatforms: PlatformData[] = [
  { 
    id: 'instagram', 
    name: 'Instagram', 
    icon: 'instagram', 
    baseUrl: 'https://www.instagram.com/' 
  },
  { 
    id: 'facebook', 
    name: 'Facebook', 
    icon: 'facebook', 
    baseUrl: 'https://www.facebook.com/sharer/sharer.php?u=' 
  },
  { 
    id: 'x', 
    name: 'X (Twitter)', 
    icon: 'x', 
    baseUrl: 'https://twitter.com/intent/tweet?text=' 
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    icon: 'tiktok', 
    baseUrl:'https://www.tiktok.com/tiktokstudio/upload?from=webapp'
  },
];

// Lista di piattaforme AGGIUNTIVE per il piano PRO
export const proExclusivePlatforms: PlatformData[] = [
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    icon: 'linkedin', 
    baseUrl: 'https://www.linkedin.com/feed/?shareActive=true&text=' 
  },
  { 
    id: 'youtube', 
    name: 'YouTube', 
    icon: 'youtube', 
    baseUrl: 'https://www.youtube.com/' 
  },
  { 
    id: 'threads', 
    name: 'Threads', 
    icon: 'threads', 
    baseUrl: 'https://www.threads.net/' 
  },
];

// Uniamo le due liste per avere la lista completa per gli utenti PRO
export const allDefaultPlatforms: PlatformData[] = [...freePlatforms, ...proExclusivePlatforms];