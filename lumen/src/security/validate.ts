/**
 * Validação dos dados salvos no aparelho.
 *
 * O armazenamento local pode estar corrompido, ser de uma versão antiga do app ou ter sido
 * alterado à mão. Tudo o que é lido passa por aqui antes de chegar às telas: tipos conferidos,
 * tamanhos limitados, ids conferidos contra o catálogo e cores restritas a hexadecimal.
 */
import { cleanText } from "../utils/text";

const HEX = /^#[0-9a-fA-F]{6}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = /^\d{4}-\d{1,2}-\d{1,2}$/;
export const LIMITS = { playlists: 50, playlistName: 40, playlistTracks: 200, saved: 500, recent: 12 } as const;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const uniq = <T>(a: T[]) => [...new Set(a)];

/** Lista de ids, mantendo só os que existem em `known`. */
export function idList(v: unknown, known: ReadonlySet<string>, max: number): string[] {
  return Array.isArray(v) ? uniq(v.filter((x): x is string => typeof x === "string" && known.has(x))).slice(0, max) : [];
}

/** Mapa nome → número finito, com chaves de `known` e valores dentro de [min, max]. */
export function numberMap(v: unknown, known: ReadonlySet<string>, min: number, max: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, n] of Object.entries(v)) if (known.has(k) && typeof n === "number" && Number.isFinite(n)) out[k] = Math.min(max, Math.max(min, n));
  return out;
}

import type { Playlist } from "../types";
export type { Playlist };

export function playlists(v: unknown, trackIds: ReadonlySet<string>): Playlist[] {
  if (!Array.isArray(v)) return [];
  const out: Playlist[] = [];
  for (const p of v.slice(0, LIMITS.playlists)) {
    if (!isObj(p) || typeof p.id !== "string" || !/^pl\d{1,15}$/.test(p.id)) continue;
    const name = cleanText(p.name, LIMITS.playlistName);
    if (!name) continue;
    const c = Array.isArray(p.c) && p.c.length === 2 && p.c.every(x => typeof x === "string" && HEX.test(x)) ? (p.c as [string, string]) : (["#9EC5E8", "#4B4785"] as [string, string]);
    out.push({ id: p.id, name, c, ids: idList(p.ids, trackIds, LIMITS.playlistTracks) });
  }
  return out;
}

export const time = (v: unknown): string | null => (typeof v === "string" && HHMM.test(v) ? v : null);

export function streak(v: unknown): { n: number; last: string | null } {
  if (!isObj(v)) return { n: 0, last: null };
  const n = typeof v.n === "number" && Number.isInteger(v.n) && v.n >= 0 && v.n < 100000 ? v.n : 0;
  return { n, last: typeof v.last === "string" && DAY.test(v.last) ? v.last : null };
}

export function rewards(v: unknown): { day: string | null; n: number } {
  if (!isObj(v)) return { day: null, n: 0 };
  return { day: typeof v.day === "string" && DAY.test(v.day) ? v.day : null, n: typeof v.n === "number" && v.n >= 0 && v.n <= 10 ? Math.floor(v.n) : 0 };
}

/** Data/hora em milissegundos, aceita só valores plausíveis (até 1 dia no futuro). */
export const timestamp = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 && v < Date.now() + 864e5 ? v : 0);
