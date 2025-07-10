// File: src/types/index.ts

export type Categoria = 'Video' | 'Immagine' | 'Testo';

export interface Progetto {
  id: string;
  nome: string;
  color?: string;
  sintesi?: string;
  immagineUrl?: string;
}

export interface Post {
  id: string;
  projectId: string;
  piattaforma: string;
  tipoContenuto: string;
  descrizione: string;
  primoCommento?: string;
  urlMedia: string;
  statoProdotto: boolean; // RIPRISTINATO (ex statoCreato)
  statoPubblicato: boolean;
  statoMontato?: boolean;
  data: { toDate: () => Date };
  performance?: {
    views: number;
    likes: number;
    comments: number;
  };
  [key: string]: any;
}