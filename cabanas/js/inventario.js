// Inventário: lógica pura, sem DOM. Um inventário é { espacos, slots }.
// slot: null | { id, qtd } (item) | { ref } (2º slot de um item de 2 espaços; ref = índice do slot base)

import { ITENS, RECEITAS } from './itens.js';

const ESPACOS_PADRAO = 8;
const ESPACOS_MAX = 999;

// ---------- utilidades internas ----------

function itemDe(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(ITENS, id) ? ITENS[id] : null;
}

function pilhaMax(id) {
  const it = itemDe(id);
  return it && it.pilha > 0 ? it.pilha : 1;
}

function espacosDe(id) {
  const it = itemDe(id);
  return it && it.espacos > 1 ? 2 : 1;
}

function inteiro(valor) {
  const n = Math.floor(Number(valor));
  return Number.isFinite(n) ? n : 0;
}

// slot de referência (2º slot de um item de 2 espaços)?
function ehRef(slot) {
  return !!slot && typeof slot === 'object' && slot.ref !== undefined;
}

// índice do slot base de um item (resolve { ref }); -1 se vazio/inválido
function resolver(inv, i) {
  if (!inv || !Array.isArray(inv.slots)) return -1;
  if (i < 0 || i >= inv.espacos) return -1;
  const slot = inv.slots[i];
  if (!slot) return -1;
  if (ehRef(slot)) {
    const base = inteiro(slot.ref);
    return base >= 0 && base < inv.espacos && inv.slots[base] ? base : -1;
  }
  return slot.id ? i : -1;
}

// remove o item do slot base i e limpa o slot vizinho de referência (e vice-versa)
function liberar(inv, i) {
  if (i < 0 || i >= inv.espacos) return;
  const slot = inv.slots[i];
  if (!slot) return;
  inv.slots[i] = null;
  if (ehRef(slot)) {
    const base = inteiro(slot.ref);
    if (base >= 0 && base < inv.espacos && inv.slots[base] && !ehRef(inv.slots[base])) inv.slots[base] = null;
    return;
  }
  const j = i + 1;
  if (j < inv.espacos && ehRef(inv.slots[j]) && inteiro(inv.slots[j].ref) === i) inv.slots[j] = null;
}

function copiarSlots(inv) {
  return inv.slots.map((s) => (s ? { ...s } : null));
}

function restaurarSlots(inv, copia) {
  for (let i = 0; i < inv.espacos; i++) inv.slots[i] = copia[i] ? { ...copia[i] } : null;
}

// ---------- API ----------

export function criarInventario(espacos = ESPACOS_PADRAO) {
  let n = inteiro(espacos);
  if (n <= 0) n = ESPACOS_PADRAO;
  if (n > ESPACOS_MAX) n = ESPACOS_MAX;
  return { espacos: n, slots: new Array(n).fill(null) };
}

// Adiciona: completa pilhas do mesmo id, depois usa espaços livres.
// Item de 2 espaços precisa de dois slots livres seguidos. Devolve quanto sobrou.
export function adicionar(inv, id, qtd) {
  if (!inv || !Array.isArray(inv.slots)) return Math.max(0, inteiro(qtd));
  let resta = inteiro(qtd);
  if (resta <= 0) return 0;
  if (!itemDe(id)) return resta;

  const max = pilhaMax(id);
  const dois = espacosDe(id) > 1;

  // 1) completa pilhas existentes do mesmo item
  for (let i = 0; i < inv.espacos && resta > 0; i++) {
    const slot = inv.slots[i];
    if (!slot || ehRef(slot) || slot.id !== id) continue;
    const cabe = max - inteiro(slot.qtd);
    if (cabe <= 0) continue;
    const poe = Math.min(cabe, resta);
    slot.qtd = inteiro(slot.qtd) + poe;
    resta -= poe;
  }

  // 2) usa espaços livres
  for (let i = 0; i < inv.espacos && resta > 0; i++) {
    if (inv.slots[i] !== null && inv.slots[i] !== undefined) continue;
    if (dois) {
      const vizinho = i + 1;
      if (vizinho >= inv.espacos) continue;
      if (inv.slots[vizinho] !== null && inv.slots[vizinho] !== undefined) continue;
      if (resta < 1) break;
      const poe = Math.min(max, resta);
      inv.slots[i] = { id, qtd: poe };
      inv.slots[vizinho] = { ref: i };
      resta -= poe;
    } else {
      const poe = Math.min(max, resta);
      inv.slots[i] = { id, qtd: poe };
      resta -= poe;
    }
  }

  return resta;
}

// Remove de qualquer slot, começando pelas pilhas menores. Devolve quanto removeu.
export function remover(inv, id, qtd) {
  if (!inv || !Array.isArray(inv.slots) || !itemDe(id)) return 0;
  let restante = inteiro(qtd);
  if (restante <= 0) return 0;

  const indices = [];
  for (let i = 0; i < inv.espacos; i++) {
    const slot = inv.slots[i];
    if (slot && !ehRef(slot) && slot.id === id) indices.push(i);
  }
  indices.sort((a, b) => inteiro(inv.slots[a].qtd) - inteiro(inv.slots[b].qtd));

  let removido = 0;
  for (const i of indices) {
    if (restante <= 0) break;
    const slot = inv.slots[i];
    if (!slot) continue;
    const tira = Math.min(inteiro(slot.qtd), restante);
    if (tira <= 0) continue;
    slot.qtd = inteiro(slot.qtd) - tira;
    restante -= tira;
    removido += tira;
    if (slot.qtd <= 0) liberar(inv, i);
  }
  return removido;
}

export function contar(inv, id) {
  if (!inv || !Array.isArray(inv.slots) || !itemDe(id)) return 0;
  let total = 0;
  for (let i = 0; i < inv.espacos; i++) {
    const slot = inv.slots[i];
    if (slot && !ehRef(slot) && slot.id === id) total += inteiro(slot.qtd);
  }
  return total;
}

// Move o slot i inteiro de um inventário para outro (baú = inventário de 24).
// Remove da origem só o que coube; devolve true se moveu tudo.
export function mover(origem, i, destino) {
  if (!origem || !destino || !Array.isArray(origem.slots) || !Array.isArray(destino.slots)) return false;
  const base = resolver(origem, i);
  if (base < 0) return false;
  const slot = origem.slots[base];
  if (!slot || !itemDe(slot.id)) return false;

  const id = slot.id;
  const qtd = inteiro(slot.qtd);
  if (qtd <= 0) return false;

  const sobra = adicionar(destino, id, qtd);
  const moveu = qtd - sobra;
  if (moveu > 0) {
    const alvo = origem.slots[base];
    if (alvo) {
      alvo.qtd = inteiro(alvo.qtd) - moveu;
      if (alvo.qtd <= 0) liberar(origem, base);
    }
  }
  return sobra === 0;
}

// Combina os itens dos slots i e j conforme RECEITAS. Devolve o id do resultado ou null.
export function combinar(inv, i, j) {
  if (!inv || !Array.isArray(inv.slots)) return null;
  const a = resolver(inv, i);
  const b = resolver(inv, j);
  if (a < 0 || b < 0 || a === b) return null;

  const slotA = inv.slots[a];
  const slotB = inv.slots[b];
  if (!slotA || !slotB || !slotA.id || !slotB.id) return null;

  const receita = RECEITAS.find(
    (r) => (r.a === slotA.id && r.b === slotB.id) || (r.a === slotB.id && r.b === slotA.id),
  );
  if (!receita) return null;

  const antes = copiarSlots(inv);
  // consome 1 de cada (do slot específico)
  tirarDoSlot(inv, a, 1);
  const baseB = inv.slots[b] && !ehRef(inv.slots[b]) ? b : resolver(inv, b);
  if (baseB < 0) {
    restaurarSlots(inv, antes);
    return null;
  }
  tirarDoSlot(inv, baseB, 1);

  const sobra = adicionar(inv, receita.resultado, inteiro(receita.qtd) || 1);
  if (sobra > 0) {
    restaurarSlots(inv, antes); // não coube: desfaz
    return null;
  }
  return receita.resultado;
}

function tirarDoSlot(inv, i, qtd) {
  const slot = inv.slots[i];
  if (!slot || ehRef(slot)) return 0;
  const tira = Math.min(inteiro(slot.qtd), inteiro(qtd));
  if (tira <= 0) return 0;
  slot.qtd -= tira;
  if (slot.qtd <= 0) liberar(inv, i);
  return tira;
}

// Serializa só o essencial; refs são recriados na desserialização.
export function serializar(inv) {
  const n = inv && inteiro(inv.espacos) > 0 ? Math.min(inteiro(inv.espacos), ESPACOS_MAX) : ESPACOS_PADRAO;
  const slots = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const slot = inv && Array.isArray(inv.slots) ? inv.slots[i] : null;
    if (!slot || ehRef(slot)) continue;
    const id = slot.id;
    const qtd = inteiro(slot.qtd);
    if (!itemDe(id) || qtd < 1) continue;
    slots[i] = { id, qtd: Math.min(qtd, pilhaMax(id)) };
  }
  return { espacos: n, slots };
}

// Aceita qualquer coisa (null, string, objeto estranho) e devolve um inventário válido.
export function desserializar(obj, espacos) {
  let n = inteiro(espacos);
  if (n <= 0 && obj && typeof obj === 'object') n = inteiro(obj.espacos);
  if (n <= 0) n = ESPACOS_PADRAO;
  if (n > ESPACOS_MAX) n = ESPACOS_MAX;

  const inv = criarInventario(n);
  const lista = obj && typeof obj === 'object' && Array.isArray(obj.slots) ? obj.slots : [];

  // 1º passo: valida id e quantidade de cada slot
  const validos = new Array(n).fill(null);
  for (let i = 0; i < n && i < lista.length; i++) {
    const bruto = lista[i];
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) continue;
    const id = bruto.id;
    const it = itemDe(id);
    if (!it) continue;
    const qtd = bruto.qtd;
    if (typeof qtd !== 'number' || !Number.isInteger(qtd)) continue;
    if (qtd < 1 || qtd > pilhaMax(id)) continue;
    validos[i] = { id, qtd };
  }

  // 2º passo: coloca; item de 2 espaços só se o slot seguinte também estiver livre
  for (let i = 0; i < n; i++) {
    const val = validos[i];
    if (!val) continue;
    if (espacosDe(val.id) > 1) {
      const vizinho = i + 1;
      if (vizinho >= n || validos[vizinho] !== null) continue;
      if (inv.slots[i] !== null || inv.slots[vizinho] !== null) continue;
      inv.slots[i] = { id: val.id, qtd: val.qtd };
      inv.slots[vizinho] = { ref: i };
      validos[vizinho] = null;
    } else if (inv.slots[i] === null) {
      inv.slots[i] = { id: val.id, qtd: val.qtd };
    }
  }

  return inv;
}
