/* Divisão da pregação em telas (função pura, sem DOM: usada pela pregação guiada e pelos testes). */
import type { Sermon } from "../../types";

/** Um trecho mostrado numa tela. */
export interface Slide { kind: "title" | "text" | "passage" | "end"; part: number; text: string; ref?: string; ms: number }

const CUE = /\(([^()]{1,60})\)/g;
/** Tempo de leitura calmo: ~140 palavras por minuto, mais respiro no fim; "(pausa)" e afins somam 1,5 s cada. */
export const readMs = (text: string, extra = 0) => {
  const words = text.replace(CUE, "").split(/\s+/).filter(Boolean).length, cues = (text.match(CUE) || []).length;
  return Math.max(4500, words * 430 + 2600 + cues * 1500 + extra);
};

/** Quebra um parágrafo longo em telas de até ~45 palavras, sempre no fim de uma frase. */
export function emTelas(t: string, max = 45): string[] {
  const frases = t.match(/[^.!?…]+[.!?…]+["'”’)]*\s*|[^.!?…]+$/g)?.map(f => f.trim()).filter(Boolean) || [t];
  const out: string[] = []; let cur = "";
  for (const f of frases) {
    const n = (cur + " " + f).trim().split(/\s+/).length;
    if (cur && n > max) { out.push(cur); cur = f; } else cur = (cur + " " + f).trim();
  }
  if (cur) out.push(cur);
  return out;
}

/** Divide a pregação em trechos curtos. [LEITURA] vira a tela da passagem; indicações entre parênteses viram só pausa. */
export function slidesOf(s: Sermon): Slide[] {
  const out: Slide[] = [];
  s.partes.forEach((p, part) => {
    out.push({ kind: "title", part, text: p.nome, ms: 3600 });
    const pass = p.ref ? s.passagens.find(x => x.ref === p.ref) : undefined;
    for (const para of String(p.fala).split(/\n+/).map(t => t.trim()).filter(Boolean)) {
      if (/\[LEITURA\]/i.test(para)) {
        const [before, after] = para.split(/\[LEITURA\]/i).map(x => x.trim());
        if (before) emTelas(before.replace(CUE, "").trim()).forEach(t => out.push({ kind: "text", part, text: t, ms: readMs(t) }));
        if (pass) out.push({ kind: "passage", part, text: pass.texto, ref: pass.ref, ms: readMs(pass.texto, 2500) });
        if (after) emTelas(after.replace(CUE, "").trim()).forEach(t => out.push({ kind: "text", part, text: t, ms: readMs(t) }));
        continue;
      }
      const clean = para.replace(CUE, "").replace(/\s+/g, " ").trim();
      const pausas = (para.match(CUE) || []).length;
      emTelas(clean).forEach((t, k, a) => out.push({ kind: "text", part, text: t, ms: readMs(t, k === a.length - 1 ? pausas * 1500 : 0) }));
    }
  });
  out.push({ kind: "end", part: s.partes.length - 1, text: "Amém", ms: 0 });
  return out;
}
