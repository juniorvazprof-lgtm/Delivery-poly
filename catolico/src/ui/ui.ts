/* Peças de interface compartilhadas: aviso rápido, folha que sobe de baixo, luz de fundo e progresso salvo. */
import { abaixar } from "./musica";
import { html, raw, setHTML, type SafeHtml } from "../utils/html";
import { byId, qMaybe } from "../utils/dom";
import { S } from "../services/storage";

let tt = 0;
export function toast(h: string | SafeHtml): void {
  const t = byId("toast"); setHTML(t, html`<span>${h}</span>`); t.classList.add("show");
  clearTimeout(tt); tt = window.setTimeout(() => t.classList.remove("show"), 2300);
}
export function vibrate(ms: number): void { try { navigator.vibrate?.(ms); } catch { /* sem vibração */ } }

const veil = () => byId("veil"), sheet = () => byId("sheet");
export function openSheet(content: SafeHtml, label: string): void {
  setHTML(sheet(), html`${raw('<div class="grab" aria-hidden="true"></div>')}${content}`);
  sheet().setAttribute("aria-label", label); sheet().scrollTop = 0;
  veil().classList.add("open"); sheet().classList.add("open"); abaixar(.35);
  setTimeout(() => qMaybe(sheet(), "button")?.focus({ preventScroll: true }), 300);
}
export function closeSheet(): void {
  if (sheet().classList.contains("open")) abaixar(document.body.classList.contains("rezando") ? .55 : 1);
  veil().classList.remove("open"); sheet().classList.remove("open");
}

/** Cores da luz difusa do fundo (seguem a cor litúrgica do dia). */
export function setLight(h: [string, string]): void {
  const r = document.documentElement.style; r.setProperty("--glow-a", h[0]); r.setProperty("--glow-b", h[1]);
}

/** Chave do dia (hora local). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
/** Registro de terços rezados e dias seguidos, guardado só no aparelho. */
export interface Progresso { tercos: number; seguidos: number; ultimo: string | null; oracoes: number }
export function progresso(): Progresso {
  const p = S.get<Partial<Progresso>>("cat.prog", {}), n = (v: unknown) => (typeof v === "number" && v >= 0 && v < 1e6 ? Math.floor(v) : 0);
  return { tercos: n(p.tercos), seguidos: n(p.seguidos), ultimo: typeof p.ultimo === "string" ? p.ultimo.slice(0, 12) : null, oracoes: n(p.oracoes) };
}
export function registrarTerco(): Progresso {
  const p = progresso(), hoje = dayKey(new Date()), ontem = dayKey(new Date(Date.now() - 864e5));
  if (p.ultimo !== hoje) p.seguidos = p.ultimo === ontem ? p.seguidos + 1 : 1;
  p.tercos++; p.ultimo = hoje; S.set("cat.prog", p); return p;
}
export function registrarOracao(): void { const p = progresso(); p.oracoes++; S.set("cat.prog", p); }
