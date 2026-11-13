// Fase 2 · "O contrato": mapa das Fendas → quadro de contratos + cláusulas de risco → entrar.
// Monta a escolha da partida (G.run) e calcula os modificadores das cláusulas.
import { RIFTS } from '../data/rifts.js';
import { CONTRACTS, CONTRACT_KINDS, CLAUSES } from '../data/contracts.js';
import { M, save } from './meta.js';

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
export const fill = (c, n = c.goal) => c.desc.replace('{n}', n.toLocaleString('pt-BR'));

// modificadores somados das cláusulas aceitas
export function riskMods(clauses) {
  const m = { hp: 1, speed: 1, spawn: 1, dmg: 1, magnet: 1, noHearts: false, noShrines: false, bonus: 0 };
  for (const c of clauses) { m.bonus += c.bonus;
    for (const [k, v] of Object.entries(c.mod)) { if (typeof v === 'boolean') m[k] = m[k] || v; else m[k] *= v; } }
  return m;
}

let sel = null, onEnter = null, offer = [];
export function initRun(enter) {
  onEnter = enter;
  $('btn-enter').onclick = () => { if (sel?.contract) { M.lastRift = sel.rift; save(); $('riftmap').hidden = true; onEnter(build()); } };
  $('btn-rift-back').onclick = () => { if (sel?.rift && !$('board').hidden) showMap(); else { $('riftmap').hidden = true; $('startscreen').hidden = false; } };
}
function build() {
  const clauses = CLAUSES.filter(c => sel.clauses.has(c.id));
  return { rift: sel.rift, R: RIFTS[sel.rift], contract: sel.contract, clauses, risk: riskMods(clauses) };
}
export function openRiftMap(rift) { sel = { rift: null, contract: null, clauses: new Set() }; $('startscreen').hidden = true; $('riftmap').hidden = false; if (typeof rift === 'string') showBoard(rift); else showMap(); }

function showMap() {
  $('rift-title').textContent = 'FENDAS'; $('board').hidden = true; $('rift-list').hidden = false;
  $('rift-list').innerHTML = Object.entries(RIFTS).map(([k, r]) => `<button class="mcard rift" data-rift="${k}" style="--c:${r.color}">
    <span class="ico">${r.glyph}</span><span class="txt"><b>${esc(r.name)}</b><span class="d">${esc(r.desc)}</span>
    <span class="lv"><span class="danger">${'◆'.repeat(r.danger)}${'◇'.repeat(3 - r.danger)}</span> <em>ouro ×${r.gold}</em></span></span></button>`).join('');
  $('rift-list').querySelectorAll('[data-rift]').forEach(b => b.onclick = () => showBoard(b.dataset.rift));
}
function showBoard(rift) {
  sel.rift = rift; sel.contract = null; const R = RIFTS[rift];
  $('rift-title').textContent = R.name.toUpperCase(); $('rift-list').hidden = true; $('board').hidden = false;
  // 3 contratos de tipos diferentes; a meta cresce com o perigo da Fenda
  const kinds = pick(Object.keys(CONTRACT_KINDS), 3);
  offer = kinds.map(k => { const c = pick(CONTRACTS.filter(x => x.kind === k), 1)[0]; const f = 1 + (R.danger - 1) * 0.15;
    return { ...c, goal: Math.round(c.goal * (c.kind === 'sobrevivencia' ? 1 : f)), pay: Math.round(c.pay * R.gold) }; });
  renderBoard();
}
function renderBoard() {
  const risk = riskMods(CLAUSES.filter(c => sel.clauses.has(c.id)));
  $('contract-list').innerHTML = offer.map((c, i) => { const K = CONTRACT_KINDS[c.kind];
    return `<button class="mcard contract ${sel.contract?.id === c.id ? 'on' : ''}" data-i="${i}" style="--c:${K.color}"><span class="ico">${K.glyph}</span>
      <span class="txt"><b>${esc(c.name)}</b><span class="d">${esc(fill(c))}</span><span class="lv"><em>${K.label} · ${esc(c.client)}</em></span></span>
      <span class="buy pay"><i></i>${Math.round(c.pay * (1 + risk.bonus))}</span></button>`; }).join('');
  $('contract-list').querySelectorAll('[data-i]').forEach(b => b.onclick = () => { sel.contract = offer[+b.dataset.i]; renderBoard(); });
  $('clause-list').innerHTML = CLAUSES.map(c => `<button class="clause ${sel.clauses.has(c.id) ? 'on' : ''}" data-c="${c.id}">
    <b>${esc(c.name)}</b><span>${esc(c.desc)}</span><em>+${Math.round(c.bonus * 100)}%</em></button>`).join('');
  $('clause-list').querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const id = b.dataset.c; sel.clauses.has(id) ? sel.clauses.delete(id) : sel.clauses.add(id); renderBoard(); });
  $('btn-enter').disabled = !sel.contract;
  $('btn-enter').textContent = sel.contract ? `ENTRAR NA FENDA${risk.bonus ? ` · +${Math.round(risk.bonus * 100)}%` : ''}` : 'ESCOLHA UM CONTRATO';
}
