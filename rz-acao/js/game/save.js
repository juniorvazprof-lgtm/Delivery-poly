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
  };
}

export function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === VERSION) return { ...fresh(), ...d, bank: { ...fresh().bank, ...d.bank } };
  } catch { /* sem storage ou save inválido */ }
  return fresh();
}

// devolve false se não conseguiu gravar (o jogo avisa sem dizer que salvou)
export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

export function resetSave() { try { localStorage.removeItem(KEY); } catch { /* ignorar */ } return fresh(); }
