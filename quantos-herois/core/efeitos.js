// Junta as relíquias escolhidas em modificadores por classe de herói.
import { RELIQUIAS } from '../data/reliquias.js';
import { HEROIS as HEROIS_BASE } from '../data/herois.js';
import { HEROIS_EVOLUIDOS } from '../data/evolucoes.js';
const HEROIS = { ...HEROIS_BASE, ...HEROIS_EVOLUIDOS };
// classes atingidas por um alvo: 'todas', uma classe (e suas evoluções) ou uma família
export function classesDoAlvo(alvo) {
  if (alvo === 'todas') return Object.keys(HEROIS);
  if (HEROIS[alvo]) return [alvo, ...Object.keys(HEROIS).filter((c) => HEROIS[c].evolucaoDe === alvo)];
  return Object.keys(HEROIS).filter((c) => HEROIS[c].familia === alvo);
}
function somar(m, mod) {
  for (const [k, v] of Object.entries(mod)) {
    if (k.endsWith('Mult')) m[k] = (m[k] ?? 1) * v;      // multiplicadores se acumulam
    else if (typeof v === 'number') m[k] = (m[k] ?? 0) + v; // somas
    else m[k] = v;                                         // chaves booleanas
  }
}

// Relíquias com `chave: true` (ex.: Chama Concentrada) só valem na batalha em que o jogador liga a chave.
export function modsPorClasse(listaReliquias = [], chaves = {}, bonus = []) {
  const mods = {};
  for (const id of listaReliquias) {
    const r = RELIQUIAS[id];
    if (!r || (r.chave && !chaves[id])) continue;
    // relíquia de classe vale para a classe; relíquia de família vale para todas as classes da família
    for (const c of classesDoAlvo(r.familia || r.classe)) somar((mods[c] ||= {}), r.mod);
  }
  // passivas e melhorias de batalha: [{ alvo, mod }]
  for (const bn of bonus) for (const c of classesDoAlvo(bn.alvo)) somar((mods[c] ||= {}), bn.mod);
  return mods;
}
