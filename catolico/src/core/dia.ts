/* Tudo sobre um dia: calendário calculado + dados do Ambo (festa, cor, preceito, Evangelho) + santos. */
import cal from "../data/calendario.json";
import santosBr from "../data/santos-brasil.json";
import { diaLiturgico, type Cor, type DiaLiturgico } from "./liturgia";
import { santoDoDia, chave, type Santo } from "../data/santos";

interface Ambo { t: string; g: string; c: Cor; p: number; ev: string; s: string; w: number | null }
const DIAS = (cal as unknown as { dias: Record<string, Ambo> }).dias;
const SANTOS = (santosBr as unknown as { santos: Record<string, { nome: string; grau: string; cor: Cor }[]> }).santos;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface InfoDia { lit: DiaLiturgico; titulo: string; grau: string; cor: Cor; preceito: boolean; evangelho: Ref | null; santos: { nome: string; grau: string }[]; sobre: Santo | null }

export function infoDoDia(d: Date): InfoDia {
  const lit = diaLiturgico(d), a = DIAS[iso(d)];
  const santos = (SANTOS[chave(d)] || []).map(s => ({ nome: s.nome, grau: s.grau }));
  return { lit, titulo: a?.t || lit.titulo, grau: a?.g || "", cor: a?.c || lit.cor, preceito: !!a?.p, evangelho: a?.ev ? parseCitacao(a.ev) : null, santos, sobre: santoDoDia(d) };
}

/* ---------- referências bíblicas do Ambo ("Luke 17:26-37", "Matt 4:12-23 or 4:12-17", "John 1:1-5, 9-14") ---------- */
export interface Trecho { c: number; a: number; b: number }   // b = 999: até o fim do capítulo
export interface Ref { livro: "mt" | "mc" | "lc" | "jo"; trechos: Trecho[]; texto: string }
const LIVRO: Record<string, Ref["livro"]> = { Matt: "mt", Matthew: "mt", Mark: "mc", Luke: "lc", John: "jo" };
export const SIGLA: Record<Ref["livro"], string> = { mt: "Mt", mc: "Mc", lc: "Lc", jo: "Jo" };
const num = (x: string) => parseInt(x.replace(/[a-d]$/, ""), 10);   // "12a" e "28b" viram 12 e 28
export function parseCitacao(c: string): Ref | null {
  const forma = c.split(/\s+or\s+/)[0].trim();                       // havendo forma longa e breve, usa a primeira (longa)
  const m = forma.match(/^(\w+)\s+(\d+):(.+)$/); if (!m || !LIVRO[m[1]]) return null;
  let cap = +m[2]; const trechos: Trecho[] = [];
  for (const parte of m[3].split(",").map(x => x.trim())) {
    const [ini, fim] = parte.split("-");
    const ci = ini.includes(":") ? ini.split(":") : null; if (ci) cap = +ci[0];
    const a = num(ci ? ci[1] : ini);
    if (fim && fim.includes(":")) { const [c2, b] = fim.split(":"); trechos.push({ c: cap, a, b: 999 }); cap = +c2; trechos.push({ c: cap, a: 1, b: num(b) }); }
    else trechos.push({ c: cap, a, b: fim ? num(fim) : a });
  }
  if (!trechos.length || trechos.some(t => !(t.a > 0 && t.b >= t.a && t.c > 0))) return null;
  const livro = LIVRO[m[1]], f = (t: Trecho) => t.b === 999 ? `${t.a}ss` : t.a === t.b ? `${t.a}` : `${t.a}-${t.b}`;
  const texto = trechos.length === 2 && trechos[0].b === 999 ? `${SIGLA[livro]} ${trechos[0].c},${trechos[0].a}–${trechos[1].c},${trechos[1].b}`
    : `${SIGLA[livro]} ${trechos[0].c},${trechos.map(f).join(".")}`;
  return { livro, trechos, texto };
}

/** Carrega o texto do Evangelho (prévia, Figueiredo ed. 1950). Versículos com lacuna aparecem como "[…]". */
const cache = new Map<string, string[][]>();
export async function textoDe(r: Ref): Promise<{ n: number; t: string }[]> {
  if (!cache.has(r.livro)) {
    const res = await fetch(`biblia/fig1950/${r.livro}.json`); if (!res.ok) throw new Error("livro indisponível");
    const j = await res.json() as { c?: unknown };
    if (!Array.isArray(j.c) || !j.c.every(c => Array.isArray(c) && c.every(v => typeof v === "string"))) throw new Error("arquivo inválido");
    cache.set(r.livro, j.c as string[][]);
  }
  const L = cache.get(r.livro)!;
  return r.trechos.flatMap(({ c, a, b }) => { const cap = L[c - 1] || [], fim = Math.min(b, cap.length);
    return Array.from({ length: Math.max(0, fim - a + 1) }, (_, i) => ({ n: a + i, t: cap[a + i - 1] || "[…]" })); });
}
