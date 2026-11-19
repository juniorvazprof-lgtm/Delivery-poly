// Funções de simulação em lote, compartilhadas pelo relatório e pelos workers.
import { HEROIS } from '../data/herois.js';
import { simular } from '../core/combate.js';
export const CLASSES = Object.keys(HEROIS);
export const LIMIAR = 0.9;
export const MAXN = 16;
export let N = 24;
export const setN = (n) => { N = n; };
const total = (c) => CLASSES.reduce((s, k) => s + (c[k] || 0), 0);
export function loteBruto(herois, inimigos, reliquias, chaves, n, base) {
  let v = 0, t = 0, vivos = 0, area = 0, areaN = 0; const mortos = {};
  for (let s = 0; s < n; s++) {
    const r = simular({ herois, inimigos, reliquias, chaves, semente: base + s });
    if (r.vitoria) { v++; vivos += total(r.sobreviventes); }
    t += r.tempo;
    if (r.mediaAcertosArea) { area += r.mediaAcertosArea; areaN++; }
    for (const [k, q] of Object.entries(r.mortos)) mortos[k] = (mortos[k] || 0) + q / n;
  }
  return { taxa: v / n, tempo: t / n, vivos: v ? vivos / v : 0, area: areaN ? area / areaN : 0, mortos };
}
// Com Chama Concentrada o jogador escolhe ligar ou não: vale a melhor das duas.
export function lote(herois, inimigos, reliquias = [], n = N, base = 1000) {
  const sem = loteBruto(herois, inimigos, reliquias, {}, n, base);
  if (!reliquias.includes('chamaConcentrada') || !herois.piromante) return { ...sem, chave: false };
  const com = loteBruto(herois, inimigos, reliquias, { chamaConcentrada: true }, n, base);
  return com.taxa > sem.taxa || (com.taxa === sem.taxa && com.vivos > sem.vivos) ? { ...com, chave: true } : { ...sem, chave: false };
}

export function* composicoes(n, classes = CLASSES) {
  if (classes.length === 1) { yield { [classes[0]]: n }; return; }
  const [c, ...resto] = classes;
  for (let i = n; i >= 0; i--) for (const r of composicoes(n - i, resto)) yield { [c]: i, ...r };
}
export function ideal(inimigos, reliquias = [], classes = CLASSES, inicio = 1, fim = MAXN) {
  for (let n = inicio; n <= fim; n++) {
    let melhor = null;
    for (const c of composicoes(n, classes)) {
      if (lote(c, inimigos, reliquias, 6).taxa < 0.5) continue;
      const r = lote(c, inimigos, reliquias);
      if (r.taxa >= LIMIAR && (!melhor || r.taxa > melhor.r.taxa || (r.taxa === melhor.r.taxa && r.vivos > melhor.r.vivos))) melhor = { c, r };
    }
    if (melhor) return { n, ...melhor };
  }
  return { n: Infinity, c: {}, r: null };
}
