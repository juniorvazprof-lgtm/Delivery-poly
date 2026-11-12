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

/* ---------- Estado do app ---------- */

/** Card do feed: o elemento guarda o versículo (ou as cores, se for anúncio). */
export type FeedCard = HTMLElement & { _v?: Verse; _h?: [string, string] };

/** Uma "voz" do motor de áudio (uma faixa tocando). */
export interface Voice { bus: GainNode; timer: number; }

export interface PlayerState {
  tr: Track | null; mode: "feed" | "player" | null; voice: Voice | null;
  start: number; offset: number; playing: boolean; gated: boolean;
}

export interface Queue { ids: string[]; i: number; shuffle: boolean; repeat: "off" | "all" | "one"; src: string; }

export interface LibraryView {
  tab: "home" | "rank" | "lib";
  det: { type: "album" | "liked" | "mood" | "pl"; id?: string } | null;
  range: "week" | "all";
}

export interface Playlist { id: string; name: string; c: [string, string]; ids: string[]; }

export interface PrayerStep { k: string; title: string; v: Verse; prompt: string; }

export interface PreachState { s: Sermon; i: number; el: number[]; last: number; run: boolean; fs: number; iv?: number; }

/** Função "pedir ao Claude" disponível só na prévia publicada. */
export interface SampleFn { json(input: string, options: { signal: AbortSignal; cache: boolean }): Promise<unknown>; }

export interface Store {
  taste: Record<string, number>; liked: Set<string>; saved: string[]; announced: Set<string>; filterTag: string | null;
  tt: number | undefined; onClose: (() => void) | null;
  streak: { n: number; last: string | null }; remind: string | null;
  AC: AudioContext | null; master: GainNode | null; dly: DelayNode | null;
  premium: boolean; musicPreview: boolean; soundOn: boolean; rewardUntil: number; rw: { day: string | null; n: number }; warned: boolean;
  songLikes: string[]; pls: Playlist[]; plays: Record<string, number>; recentS: string[];
  playerOpen: boolean; LV: LibraryView; npOpen: boolean; ctx: Record<string, { ids: string[]; src: string }>;
  plan: string; adI: number; prayAt: string | null; pStep: number; pSteps: PrayerStep[];
  SAMPLE: SampleFn | null; sermon: Sermon | null; smCtl: AbortController | null; PR: PreachState | null; wake: WakeLockSentinel | null;
  active: FeedCard | null; since: number; made: number; sinceAd: number; adsShown: number;
}
