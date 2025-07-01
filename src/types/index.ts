// File: src/types/index.ts

export type Categoria = 'Video' | 'Immagine' | 'Testo';

export interface Progetto {
  id: string;
  nome: string;
  color?: string; // <-- AGGIUNGI QUESTA RIGA
  sintesi?: string;      // <-- AGGIUNGI QUESTA RIGA
  immagineUrl?: string; // <-- AGGIUNGI QUESTA RIGA
}

export interface Post {
  id: string;
  projectId: string; // <-- MODIFICATO: da 'libro' a 'projectId'
  piattaforma: string;
  tipoContenuto: string;
  descrizione: string;
  primoCommento?: string; // <-- CAMPO AGGIUNTO QUI
  urlMedia: string;
  statoProdotto: boolean;
  statoPubblicato: boolean;
  data: { toDate: () => Date };
  [key: string]: any;
}