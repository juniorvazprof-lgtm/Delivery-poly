// Save do refúgio, separado do RPG (rz_save_v1). Gravado a cada ação estrutural e ao voltar da Fenda.
const KEY = 'rz_refugio_save_v1';
export const VERSION = 1;

function fresh() {
  return {
    v: VERSION, day: 1, seed: Math.floor(Math.random() * 1e6),
    bank: { liga: 0, cristal: 0, fibra: 0, semente: 0 },
    ressonas: [],        // { id, species, name, day }
    cleared: [],         // ids de entulho já limpos no subúrbio
    runs: 0, wins: 0,
    bench: {},           // nível de cada melhoria da Bancada (só uma versão por linha fica ativa)
    benchSide: {},       // versão escolhida em cada linha: 'a' ou 'b'
    unlocked: ['brogume'],
    maxInstab: 0,        // maior nível de Instabilidade liberado
    bestInstab: -1,      // maior nível vencido
  };
}

export function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === VERSION) { const f = fresh(), out = { ...f, ...d, bank: { ...f.bank, ...d.bank } };
      for (const r of out.ressonas) if (!out.unlocked.includes(r.species)) out.unlocked.push(r.species);   // saves antigos: resgatadas liberam a espécie
      return out; }
  } catch { /* sem storage ou save inválido */ }
  return fresh();
}

// devolve false se não conseguiu gravar (o jogo avisa sem dizer que salvou)
export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

export function resetSave() { try { localStorage.removeItem(KEY); } catch { /* ignorar */ } return fresh(); }
