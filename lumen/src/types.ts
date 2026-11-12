/** Tipos centrais do Lumen. */

/** Tema de um versículo, usado para recomendar e filtrar o feed. */
export type Theme =
  | "paz" | "ansiedade" | "descanso" | "cuidado" | "coragem" | "força" | "esperança" | "propósito"
  | "amor" | "graça" | "fé" | "confiança" | "gratidão" | "alegria" | "oração";

/** Versículo como aparece no feed. */
export interface Verse {
  /** Texto já pronto para exibir sozinho (primeira letra maiúscula, ponto final). */
  x: string;
  /** Referência legível, ex.: "Salmos 23:1". */
  r: string;
  /** Temas; o primeiro é o principal. */
  t: Theme[];
  /** Duas cores para a luz de fundo. */
  h: [string, string];
}

/** Registro do arquivo dados/versiculos-feed.json. */
export interface FeedEntry {
  ref: string; abrev: string; cap: number; de: number; ate: number;
  texto: string; exibir: string; temas: Theme[]; cores: [string, string];
}

/** Referência bíblica já interpretada. */
export interface BibleRef { book: string; ab: string | undefined; ch: number; a: number; b: number; }

/** Livro da Bíblia carregado de public/biblia/blivre/<abrev>.json. */
export interface BibleBook { livro: string; abrev: string; capitulos: string[][]; }

export interface Album { id: string; name: string; colors: [string, string]; tags: Theme[]; }
export interface Track {
  id: string; t: string; al: string; key: number; bpm: number; prog: number[][]; step: number; dur: number;
  ref: string; ly: string[];
}

export interface Passage {
  ref: string; texto: string; quem: string; para_quem: string; quando: string; explicacao: string;
  palavras: { p: string; s: string }[]; lembrar: string; conferir?: boolean;
}
export interface SermonPart { nome: string; min: number; ref: string; fala: string; }
export interface Sermon {
  titulo: string; ideia_central: string; tema?: string; ocasiao?: string; minutos?: number; ia?: boolean;
  passagens: Passage[]; partes: SermonPart[];
}
