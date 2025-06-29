// File: src/types/index.ts

export type Categoria = 'Video' | 'Immagine' | 'Testo';

export interface Progetto {
  id: string;
  nome: string;
}

export interface Post {
  id: string;
  libro: string;
  piattaforma: string;
  tipoContenuto: string;
  descrizione: string;
  urlMedia: string;
  statoProdotto: boolean;
  statoPubblicato: boolean;
  data: { toDate: () => Date };
  [key: string]: any;
}