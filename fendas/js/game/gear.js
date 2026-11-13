// Equipamento estilo extração: 4 espaços, raridades, desgaste por raid, cofre, conserto e venda.
// Morrer perde o que estava equipado e o saque da raid; extrair leva tudo e gasta 1 de durabilidade.
import { ITEM_BASES, AFFIXES } from '../data/items.js';
import { M, save } from './meta.js';

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rnd = (a, b) => a + Math.random() * (b - a);

export const SLOTS = { cajado: { name: 'Cajado', glyph: '⚚' }, manto: { name: 'Manto', glyph: '⛉' }, amuleto: { name: 'Amuleto', glyph: '◈' }, anel: { name: 'Anel', glyph: '◯' } };
// afixos extras, durabilidade (raids), peso no sorteio, multiplicador do atributo e custo de conserto por ponto
export const RARITIES = {
  comum: { name: 'Comum', color: '#c9c4dc', affixes: 0, dur: [3, 4], w: 60, mult: 1, fix: 12 },
  raro: { name: 'Raro', color: '#3fb8ff', affixes: 1, dur: [4, 5], w: 28, mult: 1.25, fix: 22 },
  epico: { name: 'Épico', color: '#c58bff', affixes: 2, dur: [5, 6], w: 10, mult: 1.5, fix: 40 },
  lendario: { name: 'Lendário', color: '#ffb020', affixes: 3, dur: [6, 8], w: 2, mult: 1.9, fix: 70 },
};
const STAT = { dmg: ['dano', true], hp: ['vida', false], cd: ['recarga', true], area: ['área', true], speed: ['velocidade', true], magnet: ['ímã', true], crit: ['crítico', true], regen: ['regeneração/s', false], gold: ['ouro', true] };
export const STASH_MAX = 16;

// ---------- estado salvo ----------
if (!M.stash) M.stash = [];
if (!M.equip) M.equip = { cajado: null, manto: null, amuleto: null, anel: null };
if (!M.gearGift) { M.gearGift = true; M.stash.push(rollItem(0, 'cajado', 'comum', true), rollItem(0, 'manto', 'comum', true)); save(); }   // kit inicial

// tier 0 elite · 1 campeão · 2 minichefe/campeão forte · 3 Guardião: tiers altos puxam raridades melhores
export function rollItem(tier = 0, slot, rarity, weakest = false) {
  if (!rarity) { const w = Object.entries(RARITIES).map(([k, r], i) => [k, r.w * Math.pow(1 + tier * 0.9, i)]), tot = w.reduce((s, x) => s + x[1], 0);
    let r = Math.random() * tot; rarity = w.find(x => (r -= x[1]) <= 0)?.[0] || 'comum'; }
  const pool = ITEM_BASES.filter(b => !slot || b.slot === slot), R = RARITIES[rarity];
  // bases mais fortes aparecem mais em tiers altos
  const bi = weakest ? 0 : Math.min(pool.length - 1, Math.floor(Math.pow(Math.random(), 1 / (1 + tier * 0.6)) * pool.length)), base = pool[bi];
  const affixes = [...AFFIXES].sort(() => Math.random() - 0.5).slice(0, R.affixes).map(a => ({ id: a.id, v: a.stat === 'hp' ? Math.round(rnd(...a.value)) : rnd(...a.value) }));
  const max = Math.round(rnd(R.dur[0], R.dur[1] + 0.99) - 0.49);
  return { uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), base: base.id, rarity, v: base.stat === 'hp' ? Math.round(rnd(...base.value)) : rnd(...base.value), affixes, dur: max, max };
}
const B = it => ITEM_BASES.find(b => b.id === it.base);
const A = id => AFFIXES.find(a => a.id === id);
export const itemName = it => B(it).name + (it.affixes[0] ? ' ' + A(it.affixes[0].id).name : '');
export function itemStats(it) {
  const R = RARITIES[it.rarity], s = { [B(it).stat]: it.v * R.mult };
  for (const a of it.affixes) { const st = A(a.id).stat; s[st] = (s[st] || 0) + a.v; }
  return s;
}
const fmt = (k, v) => `+${STAT[k][1] ? Math.round(v * 100) + '%' : (Math.round(v * 10) / 10).toLocaleString('pt-BR')} ${STAT[k][0]}`;
export const statLine = it => Object.entries(itemStats(it)).map(([k, v]) => fmt(k, v)).join(' · ');
export function gearMods() {
  const m = {}; for (const it of Object.values(M.equip)) if (it) for (const [k, v] of Object.entries(itemStats(it))) m[k] = (m[k] || 0) + v;
  return m;
}
export const repairCost = it => (it.max - it.dur) * RARITIES[it.rarity].fix;
export const sellPrice = it => Math.round(RARITIES[it.rarity].fix * 1.5 * (0.4 + 0.6 * it.dur / it.max) * (1 + it.affixes.length * 0.3));

// fim da raid: devolve um resumo para a tela de resultado
export function settleRaid(safe, loot) {
  const out = { lost: [], broken: [], kept: [], sold: 0 };
  for (const [slot, it] of Object.entries(M.equip)) { if (!it) continue;
    if (!safe) { out.lost.push(it); M.equip[slot] = null; continue; }
    it.dur -= 1; if (it.dur <= 0) { out.broken.push(it); M.equip[slot] = null; } }
  if (safe) for (const it of loot) { if (M.stash.length < STASH_MAX) { M.stash.push(it); out.kept.push(it); } else { const p = sellPrice(it); M.gold += p; out.sold += p; } }
  save(); return out;
}

// ---------- tela de equipamento ----------
let selId = null;
const find = uid => { for (const [s, it] of Object.entries(M.equip)) if (it?.uid === uid) return { it, slot: s }; const i = M.stash.findIndex(x => x.uid === uid); return i >= 0 ? { it: M.stash[i], i } : null; };
function itemCard(it, extra = '') {
  const R = RARITIES[it.rarity];
  return `<button class="gitem ${selId === it.uid ? 'on' : ''} ${it.dur <= 1 ? 'worn' : ''}" data-uid="${it.uid}" style="--c:${R.color}"><span class="ico">${B(it).glyph}</span>
    <span class="txt"><b>${esc(itemName(it))}</b><span class="d">${esc(statLine(it))}</span>
    <span class="durbar"><i style="width:${it.dur / it.max * 100}%"></i></span><em>${R.name} · ${it.dur}/${it.max} raids${extra}</em></span></button>`;
}
export function renderGear() {
  document.querySelectorAll('#gear .gold-now').forEach(e => { e.textContent = M.gold.toLocaleString('pt-BR'); });
  $('gear-slots').innerHTML = Object.entries(SLOTS).map(([k, s]) => M.equip[k] ? itemCard(M.equip[k]) :
    `<div class="gitem empty"><span class="ico">${s.glyph}</span><span class="txt"><b>${s.name}</b><span class="d">Vazio</span></span></div>`).join('');
  $('gear-count').textContent = `${M.stash.length}/${STASH_MAX}`;
  $('gear-stash').innerHTML = M.stash.length ? M.stash.map(it => itemCard(it)).join('') : '<p class="sub">Cofre vazio. Extraia de uma Fenda com o saque para encher.</p>';
  const tot = gearMods(); $('gear-total').textContent = Object.keys(tot).length ? Object.entries(tot).map(([k, v]) => fmt(k, v)).join(' · ') : 'Nenhum bônus equipado';
  const f = selId && find(selId), act = $('gear-actions');
  if (!f) { act.innerHTML = '<p class="sub">Toque num item para equipar, consertar ou vender. Morrer numa Fenda perde o que está equipado.</p>'; }
  else { const it = f.it, eq = f.slot !== undefined, rc = repairCost(it);
    act.innerHTML = `<button class="btn" data-a="equip">${eq ? 'DESEQUIPAR' : 'EQUIPAR'}</button>
      <button class="btn" data-a="fix" ${!rc || M.gold < rc ? 'disabled' : ''}>CONSERTAR ${rc ? '· ' + rc : ''}</button>
      <button class="btn ghost" data-a="sell">VENDER · ${sellPrice(it)}</button>`;
    act.querySelector('[data-a="equip"]').onclick = () => {
      if (eq) { if (M.stash.length >= STASH_MAX) return; M.equip[f.slot] = null; M.stash.push(it); }
      else { const sl = B(it).slot, old = M.equip[sl]; M.stash.splice(f.i, 1); if (old) M.stash.push(old); M.equip[sl] = it; }
      save(); renderGear(); };
    act.querySelector('[data-a="fix"]').onclick = () => { if (M.gold < rc) return; M.gold -= rc; it.dur = it.max; save(); renderGear(); };
    act.querySelector('[data-a="sell"]').onclick = () => { M.gold += sellPrice(it); if (eq) M.equip[f.slot] = null; else M.stash.splice(f.i, 1); selId = null; save(); renderGear(); }; }
  document.querySelectorAll('#gear [data-uid]').forEach(b => b.onclick = () => { selId = selId === b.dataset.uid ? null : b.dataset.uid; renderGear(); });
}
export function openGear() { selId = null; $('startscreen').hidden = true; $('gear').hidden = false; renderGear(); }
