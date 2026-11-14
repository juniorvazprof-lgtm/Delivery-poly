/* Símbolos cristãos em traço dourado (desenho próprio, SVG). Usados nos cartões do feed e nas imagens de compartilhar. */
import { html, raw, type SafeHtml } from "../utils/html";

export type Simbolo = "cruz" | "palma" | "maria" | "asas" | "lirio" | "chaves" | "pomba" | "calice" | "livro" | "vela" | "coracao" | "estrela" | "terco" | "luz";

const P: Record<Simbolo, string> = {
  cruz: '<path d="M24 6v36M14 16h20"/><circle cx="24" cy="16" r="2.4" class="f"/>',
  palma: '<path d="M24 44V12"/><path d="M24 14c-4-5-10-6-14-4M24 20c-5-4-12-4-15-1M24 26c-5-3-11-2-14 1M24 32c-4-2-9-1-11 2M24 14c4-5 10-6 14-4M24 20c5-4 12-4 15-1M24 26c5-3 11-2 14 1M24 32c4-2 9-1 11 2"/>',
  maria: '<path d="M10 38V14l8 14 6-12 6 12 8-14v24"/><path d="M17 38h14M24 10l-3-4h6z" /><circle cx="24" cy="6" r="1.6" class="f"/>',
  asas: '<path d="M24 18c-6-8-16-10-20-6 4 1 6 4 6 7-3 0-5 2-5 4 5 0 9 2 12 6 2-4 5-8 7-11zM24 18c6-8 16-10 20-6-4 1-6 4-6 7 3 0 5 2 5 4-5 0-9 2-12 6-2-4-5-8-7-11z"/><circle cx="24" cy="12" r="3"/>',
  lirio: '<path d="M24 44V22"/><path d="M24 22c-2-6-1-12 0-16 1 4 2 10 0 16zM24 22c-5-2-10-1-13 3 4 0 8 0 13-3zM24 22c5-2 10-1 13 3-4 0-8 0-13-3z"/><path d="M24 34c-3-2-7-2-9 0M24 30c3-2 7-2 9 0"/>',
  chaves: '<circle cx="15" cy="13" r="5"/><path d="M18.5 16.5 36 34M30 28l3-3M33 31l3-3"/><circle cx="33" cy="13" r="5"/><path d="M29.5 16.5 12 34M18 28l-3-3M15 31l-3-3"/>',
  pomba: '<path d="M8 22c6-1 10 1 14 5 3-6 9-10 17-10-3 2-5 5-5 8 3 0 5-1 7-3-1 7-7 12-15 12-6 0-12-4-18-12z"/><circle cx="34" cy="21" r="1.2" class="f"/><path d="M14 36c3 3 7 4 11 3"/>',
  calice: '<path d="M14 8h20c0 9-4 15-10 15S14 17 14 8zM24 23v13M16 40h16M19 36h10"/><circle cx="24" cy="4" r="1.8" class="f"/>',
  livro: '<path d="M6 12c6-3 12-3 18 1 6-4 12-4 18-1v26c-6-3-12-3-18 1-6-4-12-4-18-1z"/><path d="M24 13v26"/><path d="M15 19h-4M15 24h-4M37 19h-4M37 24h-4"/>',
  vela: '<path d="M18 22h12v20H18z"/><path class="f" d="M24 6c3 3.5 4.4 6 4.4 8.4a4.4 4.4 0 0 1-8.8 0c0-2.4 1.4-4.9 4.4-8.4z"/><path d="M24 18v4"/>',
  coracao: '<path d="M24 40S9 31 9 20a7.5 7.5 0 0 1 15-3 7.5 7.5 0 0 1 15 3c0 11-15 20-15 20z"/><path d="M24 10V4M21 7h6"/>',
  estrela: '<path d="M24 4l4 13h13l-10.5 8 4 13L24 30l-10.5 8 4-13L7 17h13z"/>',
  terco: '<circle cx="24" cy="8" r="2"/><circle cx="16" cy="11" r="2"/><circle cx="32" cy="11" r="2"/><circle cx="11" cy="18" r="2"/><circle cx="37" cy="18" r="2"/><circle cx="13" cy="26" r="2"/><circle cx="35" cy="26" r="2"/><circle cx="19" cy="31" r="2"/><circle cx="29" cy="31" r="2"/><circle cx="24" cy="33" r="2.4" class="f"/><path d="M24 36v9M20.5 40h7"/>',
  luz: '<circle cx="24" cy="24" r="7"/><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"/>',
};
/** Markup SVG do símbolo (para o DOM). */
export const simbolo = (s: Simbolo, cls = ""): SafeHtml => html`<svg class="simb ${cls}" viewBox="0 0 48 48" aria-hidden="true">${raw(P[s])}</svg>`;
/** SVG completo como data URL, na cor pedida (para desenhar no canvas da imagem compartilhada). */
export const simboloURL = (s: Simbolo, cor: string): string =>
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="240" height="240" fill="none" stroke="${cor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><style>.f{fill:${cor};stroke:none}</style>${P[s]}</svg>`);

/** Símbolo que combina com um santo ou festa, pelo nome e pela cor litúrgica. */
export function simboloDoSanto(nome: string, cor?: string): Simbolo {
  const n = nome.toLowerCase();
  if (/arcanjo|anjos|anjo/.test(n)) return "asas";
  if (/nossa senhora|virgem maria|maria, mãe|imaculada|assunção|natividade de nossa|visitação|apresentação de nossa|rosário|aparecida|guadalupe|fátima|lourdes|carmo|dores/.test(n)) return "maria";
  if (/são josé|josé operário/.test(n)) return "lirio";
  if (/pedro|cátedra|latrão/.test(n)) return "chaves";
  if (/espírito santo|pentecostes/.test(n)) return "pomba";
  if (/eucaristia|corpo e sangue|santíssimo/.test(n)) return "calice";
  if (/natal|epifania/.test(n)) return "estrela";
  if (/sagrado coração|coração/.test(n)) return "coracao";
  if (cor === "vermelho") return "palma";
  if (/evangelista|marcos|lucas|mateus|doutor|jerônimo|agostinho|tomás de aquino/.test(n)) return "livro";
  if (/clara|teresinha|inês|santa/.test(n)) return "lirio";
  return "luz";
}
