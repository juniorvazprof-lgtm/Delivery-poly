/* Pregação guiada: a pregação passa sozinha, um trecho por tela, com animação calma.
   Tocar pausa ou continua; deslizar para o lado avança ou volta. */
import type { Sermon } from "../../types";
import { html, raw, setHTML } from "../../utils/html";
import { byId } from "../../utils/dom";
import { store } from "../../core/state";
import { softCase } from "../../utils/text";
import { setLight, vibrate } from "../../ui/effects";
import { IP } from "../../ui/icons";
import { EXAMPLE } from "../pulpit/example";

/** Um trecho mostrado numa tela. */
export interface Slide { kind: "title" | "text" | "passage" | "end"; part: number; text: string; ref?: string; ms: number }

const CUE = /\(([^()]{1,60})\)/g;
/** Tempo de leitura calmo: ~140 palavras por minuto, mais respiro no fim; "(pausa)" e afins somam 1,5 s cada. */
export const readMs = (text: string, extra = 0) => {
  const words = text.replace(CUE, "").split(/\s+/).filter(Boolean).length, cues = (text.match(CUE) || []).length;
  return Math.max(4500, words * 430 + 2600 + cues * 1500 + extra);
};

/** Divide a pregação em trechos curtos. [LEITURA] vira a tela da passagem; indicações entre parênteses viram só pausa. */
export function slidesOf(s: Sermon): Slide[] {
  const out: Slide[] = [];
  s.partes.forEach((p, part) => {
    out.push({ kind: "title", part, text: p.nome, ms: 3600 });
    const pass = p.ref ? s.passagens.find(x => x.ref === p.ref) : undefined;
    for (const para of String(p.fala).split(/\n+/).map(t => t.trim()).filter(Boolean)) {
      if (/\[LEITURA\]/i.test(para)) {
        const [before, after] = para.split(/\[LEITURA\]/i).map(x => x.trim());
        if (before) out.push({ kind: "text", part, text: before.replace(CUE, "").trim(), ms: readMs(before) });
        if (pass) out.push({ kind: "passage", part, text: pass.texto, ref: pass.ref, ms: readMs(pass.texto, 2500) });
        if (after) out.push({ kind: "text", part, text: after.replace(CUE, "").trim(), ms: readMs(after) });
        continue;
      }
      const clean = para.replace(CUE, "").replace(/\s+/g, " ").trim();
      if (clean) out.push({ kind: "text", part, text: clean, ms: readMs(para) });
    }
  });
  out.push({ kind: "end", part: s.partes.length - 1, text: "Amém", ms: 0 });
  return out;
}

const GLOWS: [string, string][] = [["#F2C879", "#C9B6E8"], ["#9EC5E8", "#A9D3C7"], ["#E8C9A9", "#F2B8C6"], ["#C9B6E8", "#9EC5E8"], ["#A9D3C7", "#F7D9A0"], ["#F2B8C6", "#D6C3E8"]];
const el = () => byId("guide");
const G = { s: null as Sermon | null, sl: [] as Slide[], i: 0, run: true, left: 0, t0: 0, raf: 0, timer: 0, wake: null as WakeLockSentinel | null };

export function openGuided(s: Sermon = store.sermon || EXAMPLE): void {
  G.s = s; G.sl = slidesOf(s); G.i = 0; G.run = true;
  el().classList.add("open"); document.body.classList.add("guiding");
  try { navigator.wakeLock?.request("screen").then(w => { G.wake = w; }).catch(() => {}); } catch { /* sem wake lock */ }
  show(0);
}
export function closeGuided(): void {
  clearTimeout(G.timer); cancelAnimationFrame(G.raf); el().classList.remove("open"); document.body.classList.remove("guiding");
  try { G.wake?.release(); } catch { /* ignorar */ } G.wake = null;
  import("../../app/navigation").then(m => m.setTab("feed"));
}

function show(i: number): void {
  clearTimeout(G.timer); cancelAnimationFrame(G.raf);
  G.i = Math.max(0, Math.min(i, G.sl.length - 1));
  const s = G.s!, sl = G.sl[G.i], parts = s.partes.length;
  setLight({ h: GLOWS[sl.part % GLOWS.length] });
  const words = (t: string) => softCase(t).split(" ").map((w, k) => html`<span class="w" data-style="--i:${k}">${w}</span> `);
  const body = sl.kind === "title" ? html`<div class="gtitle"><small>Parte ${sl.part + 1} de ${parts}</small><h2>${sl.text}</h2></div>`
    : sl.kind === "passage" ? html`<div class="gpass"><small>Palavra</small><blockquote>“${words(sl.text)}”</blockquote><cite>${sl.ref}</cite></div>`
    : sl.kind === "end" ? html`<div class="gend"><div class="gok">${raw(`<svg viewBox="0 0 24 24">${IP.check}</svg>`)}</div><h2>Amém</h2>
        <p>${s.ideia_central}</p><button class="primary" id="gAgain">Ouvir de novo</button><button class="ghost" id="gOut">Voltar ao feed</button></div>`
    : html`<p class="gtext">${words(sl.text)}</p>`;
  setHTML(el(), html`<div class="gtop"><div class="gsegs">${s.partes.map((_, k) => html`<i class="${k < sl.part ? "done" : ""}"><b id="${k === sl.part ? "gFill" : ""}"></b></i>`)}</div>
     <div class="ghead"><span><small>Pregação guiada</small><b>${s.titulo}</b></span><button class="x" id="gX" aria-label="Fechar">${raw(`<svg viewBox="0 0 24 24">${IP.close}</svg>`)}</button></div></div>
   <div class="gstage" id="gStage"><div class="gslide ${sl.kind}">${body}</div></div>
   ${sl.kind === "end" ? "" : html`<div class="gfoot"><button id="gPrev" aria-label="Trecho anterior">${raw(`<svg viewBox="0 0 24 24">${IP.back}</svg>`)}</button>
     <button id="gPlay" class="gplay" aria-label="${G.run ? "Pausar" : "Continuar"}">${raw(G.run ? '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>')}</button>
     <button id="gNext" aria-label="Próximo trecho">${raw(`<svg viewBox="0 0 24 24">${IP.chev}</svg>`)}</button></div>`}`);
  byId("gX").onclick = closeGuided;
  if (sl.kind === "end") { byId("gAgain").onclick = () => { G.run = true; show(0); }; byId("gOut").onclick = closeGuided; fill(1); return; }
  byId("gPrev").onclick = () => go(-1); byId("gNext").onclick = () => go(1); byId("gPlay").onclick = toggle;
  bindGestures();
  G.left = sl.ms; schedule();
}
/** Quanto da parte atual já passou (0..1), contando os trechos anteriores da mesma parte. */
function fill(frac: number): void {
  const sl = G.sl[G.i], same = G.sl.filter(x => x.part === sl.part && x.kind !== "end"), tot = same.reduce((a, x) => a + x.ms, 0) || 1;
  const before = same.slice(0, same.indexOf(sl)).reduce((a, x) => a + x.ms, 0), f = document.getElementById("gFill");
  if (f) f.style.width = Math.min(100, (before + sl.ms * frac) / tot * 100) + "%";
}
function schedule(): void {
  if (!G.run) { fill(1 - G.left / G.sl[G.i].ms); return; }
  G.t0 = performance.now();
  const tick = () => { const left = G.left - (performance.now() - G.t0); fill(1 - Math.max(0, left) / G.sl[G.i].ms); if (left > 0) G.raf = requestAnimationFrame(tick); };
  G.raf = requestAnimationFrame(tick);
  G.timer = window.setTimeout(() => go(1, true), G.left);
}
function toggle(): void {
  if (G.run) { G.left -= performance.now() - G.t0; clearTimeout(G.timer); cancelAnimationFrame(G.raf); }
  G.run = !G.run; vibrate(5);
  const b = document.getElementById("gPlay");
  if (b) { b.setAttribute("aria-label", G.run ? "Pausar" : "Continuar"); setHTML(b, raw(G.run ? '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>')); }
  el().classList.toggle("paused", !G.run); schedule();
}
function go(d: number, auto = false): void {
  const j = G.i + d; if (j < 0 || j >= G.sl.length) return;
  if (!auto) vibrate(5);
  const st = document.getElementById("gStage"); st?.classList.add(d > 0 ? "out" : "back");
  setTimeout(() => show(j), auto ? 700 : 260);
}
function bindGestures(): void {
  const st = byId("gStage"); let x0: number | null = null, y0 = 0;
  st.onpointerdown = e => { x0 = e.clientX; y0 = e.clientY; };
  st.onpointerup = e => { if (x0 === null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 60) go(dx < 0 ? 1 : -1); else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) toggle(); };
}
document.addEventListener("keydown", e => {
  if (!el().classList.contains("open")) return;
  if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); else if (e.key === " ") { e.preventDefault(); toggle(); } else if (e.key === "Escape") closeGuided();
});
