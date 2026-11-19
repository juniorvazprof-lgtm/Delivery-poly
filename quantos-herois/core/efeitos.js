// Junta as relíquias escolhidas em modificadores por classe de herói.
import { RELIQUIAS } from '../data/reliquias.js';

export function modsPorClasse(listaReliquias = []) {
  const mods = {};
  for (const id of listaReliquias) {
    const r = RELIQUIAS[id];
    if (!r) continue;
    const m = (mods[r.classe] ||= {});
    for (const [k, v] of Object.entries(r.mod)) {
      if (k.endsWith('Mult')) m[k] = (m[k] ?? 1) * v;      // multiplicadores se acumulam
      else if (typeof v === 'number') m[k] = (m[k] ?? 0) + v; // somas
      else m[k] = v;                                         // chaves booleanas
    }
  }
  return mods;
}
