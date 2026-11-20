// Junta as relíquias escolhidas em modificadores por classe de herói.
import { RELIQUIAS } from '../data/reliquias.js';
import { HEROIS } from '../data/herois.js';

// Relíquias com `chave: true` (ex.: Chama Concentrada) só valem na batalha em que o jogador liga a chave.
export function modsPorClasse(listaReliquias = [], chaves = {}) {
  const mods = {};
  for (const id of listaReliquias) {
    const r = RELIQUIAS[id];
    if (!r || (r.chave && !chaves[id])) continue;
    // relíquia de classe vale para a classe; relíquia de família vale para todas as classes da família
    const classes = r.familia ? Object.keys(HEROIS).filter((c) => HEROIS[c].familia === r.familia) : [r.classe];
    for (const c of classes) {
      const m = (mods[c] ||= {});
      for (const [k, v] of Object.entries(r.mod)) {
        if (k.endsWith('Mult')) m[k] = (m[k] ?? 1) * v;      // multiplicadores se acumulam
        else if (typeof v === 'number') m[k] = (m[k] ?? 0) + v; // somas
        else m[k] = v;                                         // chaves booleanas
      }
    }
  }
  return mods;
}
