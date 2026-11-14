/* Estado salvo só no aparelho: curtidos, salvos, gosto por tema, favoritas e intenções de oração.
   Tudo o que é lido do armazenamento é validado (tipos, tamanhos e limites), como no Lumen. */
import { S } from "../services/storage";

export interface Salvo { id: string; tipo: string; titulo: string; texto: string; de: string }
export interface Intencao { id: string; texto: string; quando: number; alcancada: boolean }

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "");
const lista = <T>(v: unknown, max: number, f: (x: unknown) => T | null): T[] => (Array.isArray(v) ? v.slice(0, max).map(f).filter((x): x is T => x !== null) : []);

export const curtidos = new Set(lista(S.get("cat.curtidos", []), 600, x => str(x, 60) || null));
export let salvos: Salvo[] = lista(S.get("cat.salvos", []), 300, x => {
  const o = x as Record<string, unknown>; if (!o || typeof o !== "object") return null;
  const s = { id: str(o.id, 60), tipo: str(o.tipo, 20), titulo: str(o.titulo, 80), texto: str(o.texto, 900), de: str(o.de, 120) };
  return s.id && s.texto ? s : null;
});
export const favoritas = new Set(lista(S.get("cat.favoritas", []), 50, x => str(x, 30) || null));
export const gosto: Record<string, number> = (() => {
  const g = S.get<Record<string, unknown>>("cat.gosto", {}), out: Record<string, number> = {};
  for (const [k, v] of Object.entries(g || {})) if (/^[a-z]{2,16}$/.test(k) && typeof v === "number" && Number.isFinite(v)) out[k] = Math.max(-5, Math.min(40, v));
  return out;
})();
export let intencoes: Intencao[] = lista(S.get("cat.intencoes", []), 100, x => {
  const o = x as Record<string, unknown>; if (!o || typeof o !== "object") return null;
  const i = { id: str(o.id, 30), texto: str(o.texto, 160), quando: typeof o.quando === "number" ? o.quando : 0, alcancada: o.alcancada === true };
  return i.id && i.texto ? i : null;
});

export const salvar = () => {
  S.set("cat.curtidos", [...curtidos]); S.set("cat.salvos", salvos); S.set("cat.favoritas", [...favoritas]);
  S.set("cat.gosto", gosto); S.set("cat.intencoes", intencoes);
};
/** Ajusta o gosto pelo tema do cartão (curtir +3, salvar +4, enviar +5, pular rápido −1). */
export function marcarGosto(tema: string, peso: number): void { gosto[tema] = Math.max(-5, Math.min(40, (gosto[tema] || 0) + peso)); salvar(); }
export function alternarSalvo(s: Salvo): boolean {
  const ja = salvos.some(x => x.id === s.id);
  salvos = ja ? salvos.filter(x => x.id !== s.id) : [s, ...salvos].slice(0, 300); salvar(); return !ja;
}
export function novaIntencao(texto: string): void {
  const t = str(texto, 160); if (!t) return;
  intencoes = [{ id: Date.now().toString(36), texto: t, quando: Date.now(), alcancada: false }, ...intencoes].slice(0, 100); salvar();
}
export function alternarAlcancada(id: string): void { intencoes = intencoes.map(i => i.id === id ? { ...i, alcancada: !i.alcancada } : i); salvar(); }
export function removerIntencao(id: string): void { intencoes = intencoes.filter(i => i.id !== id); salvar(); }
