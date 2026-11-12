/* Buscar versículo: por referência (João 3:16, sl 23, 1 co 13 4-7) ou por palavra. */
import type { Verse } from "../../types";
import { html, setHTML, type SafeHtml } from "../../utils/html";
import { byId, qa } from "../../utils/dom";
import { BOOKS, loadBook } from "../../services/bible";
import { V } from "../../data/verses";
import { openReader } from "../bible/reader";
import { searchesLeft, useSearch, FREE_SEARCHES_PER_DAY } from "../share/limit";
import { store } from "../../core/state";

export const searchEl = byId("search");
const page = byId("fPage"), input = byId("fq") as HTMLInputElement;

/** minúsculas, sem acento e com espaços simples */
export const norm = (s: string): string => s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const NAMES = [...new Set(Object.keys(BOOKS).filter(n => !["Lamentações de Jeremias", "Cantares", "Oséias", "Miquéias"].includes(n)))];
/** nome/abreviação → nome do livro. Com acento primeiro (Jó ≠ Jo de João). */
const EXACT = new Map<string, string>(), PLAIN = new Map<string, string>();
for (const [name, ab] of Object.entries(BOOKS)) {
  const canon = NAMES.find(n => BOOKS[n] === ab) || name;
  for (const k of [name, ab]) {
    const low = k.toLocaleLowerCase("pt-BR").replace(/\s+/g, "");
    if (!EXACT.has(low)) EXACT.set(low, canon);
    const pl = norm(k).replace(/\s/g, "");
    if (!PLAIN.has(pl) || ab === "Jo") PLAIN.set(pl, canon);
  }
}
/** Encontra o livro pelo que a pessoa digitou ("joao", "1co", "salm"). */
export function findBook(t: string): string | null {
  const low = t.toLocaleLowerCase("pt-BR").replace(/[\s.]+/g, "");
  if (!low) return null;
  const hit = EXACT.get(low) || PLAIN.get(norm(low));
  if (hit) return hit;
  const pre = NAMES.filter(n => norm(n).replace(/\s/g, "").startsWith(norm(low)));
  return pre.length >= 1 && norm(low).length >= 3 ? pre[0] : null;
}

export interface RefQuery { book: string; ch: number; a?: number; b?: number }
/** "joão 3:16", "jo 3 16", "sl 23", "1 co 13:4-7" → referência; null se não for uma. */
export function parseQuery(q: string): RefQuery | null {
  const m = q.trim().match(/^((?:[1-3]\s*)?[\p{L}.\s]+?)\s*(\d{1,3})(?:\s*[:.,\s]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/u);
  if (!m) return null;
  const book = findBook(m[1]);
  if (!book) return null;
  const ch = +m[2], a = m[3] ? +m[3] : undefined, b = m[4] ? +m[4] : a;
  if (ch < 1 || (a !== undefined && (a < 1 || (b ?? a) < a || (b ?? a) - a > 40))) return null;
  return { book, ch, a, b };
}

interface Hit { r: string; x: string; book: string; ch: number; n: number }
const asVerse = (h: { r: string; x: string }): Verse => ({ ...V[0], r: h.r, x: h.x });

/* ---------- tela ---------- */
export function openSearch(): void {
  searchEl.classList.add("open"); document.body.classList.remove("focus");
  renderHome(); setTimeout(() => input.focus(), 350);
}
export function closeSearch(): void { searchEl.classList.remove("open"); input.blur(); }

const SUGG = ["João 3:16", "Salmos 23", "Filipenses 4:13", "Romanos 8:28", "paz", "ansiedade", "força"];
function leftNote(): SafeHtml {
  if (store.premium) return html``;
  const n = searchesLeft();
  return html`<p class="fleft">${n > 0 ? `${n} de ${FREE_SEARCHES_PER_DAY} buscas grátis hoje` : "Buscas grátis de hoje acabaram"} · <button class="link" id="fPrem">Ilimitado no Premium</button></p>`;
}
function bindCommon(): void {
  qa(page, "[data-q]").forEach(b => b.onclick = () => { input.value = b.dataset.q || ""; submit(); });
  qa(page, "[data-r]").forEach(b => b.onclick = () => { const h = hits.find(x => x.r === b.dataset.r); if (h) openReader(asVerse(h)); });
  const p = document.getElementById("fPrem"); if (p) p.onclick = () => { closeSearch(); import("../../app/navigation").then(m => m.goTab("premium")); };
}
function renderHome(): void {
  const t = input.value.trim(), books = t && !/\d/.test(t) ? NAMES.filter(n => norm(n).startsWith(norm(t))).slice(0, 6) : [];
  setHTML(page, html`<div class="sw fsearch">
    ${books.length ? html`<div class="label">Livros</div><div class="fchips">${books.map(n => html`<button class="fchip" data-book="${n}">${n}</button>`)}</div>` : ""}
    ${t ? html`<p class="fhint">Toque em <b>buscar</b> no teclado para procurar “${t}”.</p>` : html`<div class="label">Experimente</div><div class="fchips">${SUGG.map(s => html`<button class="fchip" data-q="${s}">${s}</button>`)}</div>
    <p class="fhint">Digite uma referência, como <b>João 3:16</b> ou <b>sl 23</b>, ou uma palavra, como <b>esperança</b>.</p>`}
    ${leftNote()}</div>`);
  qa(page, "[data-book]").forEach(b => b.onclick = () => { input.value = (b.dataset.book || "") + " "; input.focus(); renderHome(); });
  bindCommon();
}

let hits: Hit[] = [], token = 0;
function renderResults(title: string, more: SafeHtml | "" = ""): void {
  setHTML(page, html`<div class="sw fsearch"><div class="label">${title}</div>
    ${hits.map(h => html`<button class="fres" data-r="${h.r}"><q>${mark(h.x)}</q><small>${h.r} · <span>Ler capítulo ›</span></small></button>`)}
    ${more}${leftNote()}</div>`);
  bindCommon();
}
let words: string[] = [];
function mark(x: string): SafeHtml {
  if (!words.length) return html`${x}`;
  const parts: SafeHtml[] = []; let rest = x;
  while (rest) {
    const n = norm(rest); let best = -1, len = 0;
    for (const w of words) { const i = n.indexOf(w); if (i >= 0 && (best < 0 || i < best)) { best = i; len = w.length; } }
    if (best < 0) { parts.push(html`${rest}`); break; }
    parts.push(html`${rest.slice(0, best)}<mark>${rest.slice(best, best + len)}</mark>`); rest = rest.slice(best + len);
  }
  return html`${parts}`;
}

async function submit(): Promise<void> {
  const q = input.value.trim().slice(0, 60);
  if (!q) return;
  if (!useSearch()) { renderHome(); return; }
  input.blur();
  const my = ++token, ref = parseQuery(q);
  hits = []; words = [];
  setHTML(page, html`<div class="sw fsearch"><div class="skel"></div><div class="skel"></div></div>`);
  if (ref) {
    try {
      const book = await loadBook(BOOKS[ref.book]), c = book.capitulos[ref.ch - 1];
      if (my !== token) return;
      if (!c) { empty(`${ref.book} não tem o capítulo ${ref.ch}.`); return; }
      const a = ref.a ?? 1, b = ref.a ? Math.min(ref.b ?? a, c.length) : c.length;
      if (a > c.length) { empty(`${ref.book} ${ref.ch} tem ${c.length} versículos.`); return; }
      for (let n = a; n <= b; n++) hits.push({ r: `${ref.book} ${ref.ch}:${n}`, x: c[n - 1], book: ref.book, ch: ref.ch, n });
      renderResults(ref.a ? `${ref.book} ${ref.ch}:${a}${b > a ? "-" + b : ""}` : `${ref.book} ${ref.ch}`);
    } catch { empty("Não foi possível abrir este livro agora. Confira a internet."); }
    return;
  }
  words = norm(q).split(" ").filter(w => w.length >= 2);
  if (!words.length) { empty("Digite pelo menos 2 letras."); return; }
  const match = (x: string) => { const n = norm(x); return words.every(w => n.includes(w)); };
  // 1) versículos do feed (na hora)  2) a Bíblia inteira, livro a livro
  const seen = new Set<string>();
  for (const v of V) if (match(v.x) && !seen.has(v.r)) { seen.add(v.r); hits.push({ r: v.r, x: v.x, book: "", ch: 0, n: 0 }); }
  if (hits.length) renderResults("Procurando na Bíblia…");
  const MAX = 60;
  for (const name of NAMES) {
    if (hits.length >= MAX) break;
    let bk; try { bk = await loadBook(BOOKS[name]); } catch { continue; }
    if (my !== token) return;
    bk.capitulos.forEach((c, ci) => c.forEach((x, vi) => {
      const r = `${name} ${ci + 1}:${vi + 1}`;
      if (hits.length < MAX && !seen.has(r) && match(x)) { seen.add(r); hits.push({ r, x, book: name, ch: ci + 1, n: vi + 1 }); }
    }));
  }
  if (my !== token) return;
  if (!hits.length) { empty(`Nenhum versículo com “${q}”.`); return; }
  renderResults(hits.length >= MAX ? `Primeiros ${MAX} versículos com “${q}”` : `${hits.length} ${hits.length === 1 ? "versículo" : "versículos"} com “${q}”`);
}
function empty(msg: string): void {
  setHTML(page, html`<div class="sw fsearch"><div class="empty">${msg}</div>${leftNote()}</div>`); bindCommon();
}

byId("fForm").addEventListener("submit", e => { e.preventDefault(); submit(); });
input.addEventListener("input", () => { token++; renderHome(); });
byId("fClear").onclick = () => { input.value = ""; token++; renderHome(); input.focus(); };
byId("fClose").onclick = closeSearch;
byId("findBtn").onclick = openSearch;
document.addEventListener("keydown", e => { if (e.key === "Escape" && searchEl.classList.contains("open") && !byId("reader").classList.contains("open")) closeSearch(); });
