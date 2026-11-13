// Meta-progressão: ouro guardado entre partidas, Arsenal (feitiços, melhorias, heróis), Missões e Estatísticas.
// Tudo fica salvo no aparelho (localStorage).
import { CFG } from './config.js';

const KEY = 'fendas_meta_v1';
const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------- dados ----------
// feitiços liberados de início; os outros são comprados com ouro
export const STARTER = ['fogo', 'agua', 'vento', 'arcano', 'raio', 'terra'];
export const SPELL_COST = { luz: 150, orbes: 150, gelo: 200, runa: 220, anel: 300, meteoro: 350, buraco: 400, trovoada: 400 };

// melhorias permanentes: custo = base × mult^nível
export const UPGRADES = {
  nucleo: { name: 'Núcleo de mana', glyph: '✦', color: '#ff7ad9', desc: '+4% de dano em todos os feitiços', max: 10, base: 40, mult: 1.35, per: 0.04 },
  vitalidade: { name: 'Vitalidade', glyph: '♥', color: '#ff5a6a', desc: '+10 de vida máxima', max: 8, base: 35, mult: 1.35, per: 10 },
  fluxo: { name: 'Fluxo arcano', glyph: '⏱', color: '#9be7f2', desc: 'Feitiços recarregam 3% mais rápido', max: 6, base: 60, mult: 1.45, per: 0.03 },
  atracao: { name: 'Atração', glyph: '⊂', color: '#ffc96b', desc: '+12% de alcance para atrair cristais', max: 5, base: 30, mult: 1.4, per: 0.12 },
  agilidade: { name: 'Agilidade', glyph: '»', color: '#c9a6ff', desc: '+4% de velocidade', max: 5, base: 40, mult: 1.4, per: 0.04 },
  cobica: { name: 'Cobiça', glyph: '◉', color: '#ffd34d', desc: '+10% de ouro ganho por partida', max: 5, base: 50, mult: 1.5, per: 0.1 },
  rerolar: { name: 'Rerolagem', glyph: '↻', color: '#5ff2ff', desc: '+1 rerolagem por partida', max: 3, base: 120, mult: 1.8, per: 1 },
  banir: { name: 'Banimento', glyph: '⊘', color: '#ff4f8b', desc: '+1 banimento por partida', max: 3, base: 120, mult: 1.8, per: 1 },
  reviver: { name: 'Segunda chance', glyph: '✚', color: '#5dff9a', desc: 'Revive uma vez com metade da vida', max: 1, base: 800, mult: 1, per: 1 },
};

export const HEROES = {
  mago: { name: 'Mago da Fenda', glyph: '✹', color: '#c58bff', desc: 'Equilibrado. Começa com Bola de fogo.', start: 'fogo' },
  necro: { name: 'Necromante', glyph: '☠', color: '#5dff9a', desc: 'Invoca servos e corrompe inimigos.', soon: true },
};

// missões: check recebe as estatísticas acumuladas
export const MISSIONS = [
  { id: 'k500', name: 'Primeira limpeza', desc: 'Derrote 500 inimigos no total', reward: 60, goal: 500, val: s => s.kills },
  { id: 't3', name: 'Resistente', desc: 'Sobreviva 3 minutos numa partida', reward: 50, goal: 180, val: s => s.bestTime, time: true },
  { id: 'lv15', name: 'Aprendiz', desc: 'Chegue ao nível 15 numa partida', reward: 60, goal: 15, val: s => s.bestLevel },
  { id: 'evo1', name: 'Evolução', desc: 'Evolua um feitiço', reward: 100, goal: 1, val: s => s.evolutions },
  { id: 'buy1', name: 'Colecionador', desc: 'Compre um feitiço no Arsenal', reward: 50, goal: 1, val: s => s.bought },
  { id: 't5', name: 'Veterano', desc: 'Sobreviva 5 minutos numa partida', reward: 100, goal: 300, val: s => s.bestTime, time: true },
  { id: 'k2000', name: 'Exterminador', desc: 'Derrote 2.000 inimigos no total', reward: 120, goal: 2000, val: s => s.kills },
  { id: 'chest3', name: 'Caça-níquel', desc: 'Abra 3 baús', reward: 80, goal: 3, val: s => s.chests },
  { id: 'combo', name: 'Alquimista', desc: 'Descubra 3 combos elementais', reward: 120, goal: 3, val: s => (s.combos || []).length },
  { id: 'lv30', name: 'Arquimago', desc: 'Chegue ao nível 30 numa partida', reward: 150, goal: 30, val: s => s.bestLevel },
  { id: 'win', name: 'Estabilizador', desc: 'Derrote o Guardião', reward: 300, goal: 1, val: s => s.wins },
  { id: 'k10000', name: 'Lenda da Fenda', desc: 'Derrote 10.000 inimigos no total', reward: 400, goal: 10000, val: s => s.kills },
];

// ---------- estado salvo ----------
const fresh = () => ({ gold: 0, spells: [...STARTER], up: {}, hero: 'mago', claimed: [],
  stats: { runs: 0, kills: 0, bestTime: 0, bestLevel: 0, wins: 0, goldTotal: 0, evolutions: 0, bought: 0, chests: 0, combos: [], picks: {} } });
export const M = fresh();
try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) { Object.assign(M, s); M.stats = { ...fresh().stats, ...s.stats }; } } catch { /* sem storage */ }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch { /* sem storage */ } }

export const lvlOf = k => M.up[k] || 0;
export const costOf = k => Math.round(UPGRADES[k].base * Math.pow(UPGRADES[k].mult, lvlOf(k)));
// bônus permanentes aplicados no começo de cada partida
export function metaMods() {
  const v = k => lvlOf(k) * UPGRADES[k].per;
  return { dmg: 1 + v('nucleo'), hp: v('vitalidade'), cd: 1 - v('fluxo'), magnet: 1 + v('atracao'), speed: 1 + v('agilidade'),
    gold: 1 + v('cobica'), rerolls: v('rerolar'), bans: v('banir'), revive: v('reviver') };
}

// fim de partida: calcula o ouro e atualiza estatísticas
export function endRun(r) {
  // saque × multiplicador da Fenda; o pagamento do contrato vem à parte; morrer perde uma fração do saque
  let gold = Math.round((r.coins * 5 + Math.floor(r.kills / 20) + Math.floor(r.time / 10) + (r.won ? 150 : 0)) * metaMods().gold * (r.mult || 1));
  if (r.lost) gold = Math.round(gold * (1 - r.lost));
  gold += r.pay || 0;
  const s = M.stats;
  M.gold += gold; s.goldTotal += gold; s.runs++; s.kills += r.kills; s.wins += r.won ? 1 : 0;
  s.bestTime = Math.max(s.bestTime, r.time); s.bestLevel = Math.max(s.bestLevel, r.level);
  s.evolutions += r.evolutions; s.chests += r.chests;
  s.combos = [...new Set([...(s.combos || []), ...r.combos])];
  for (const k of r.spells) s.picks[k] = (s.picks[k] || 0) + 1;
  save();
  return gold;
}
// próximo objetivo: a compra mais barata que falta
export function nextGoal() {
  const opts = [];
  for (const [k, c] of Object.entries(SPELL_COST)) if (!M.spells.includes(k)) opts.push({ c, name: CFG.spells[k].name });
  for (const [k, u] of Object.entries(UPGRADES)) if (lvlOf(k) < u.max) opts.push({ c: costOf(k), name: u.name });
  opts.sort((a, b) => a.c - b.c);
  const g = opts[0]; if (!g) return '';
  return M.gold >= g.c ? `Você já pode comprar ${g.name} no Arsenal!` : `Faltam ${g.c - M.gold} de ouro para ${g.name}`;
}
export const missionsReady = () => MISSIONS.filter(m => !M.claimed.includes(m.id) && m.val(M.stats) >= m.goal).length;

// ---------- interface ----------
let tab = 'feiticos';
export function showMenu() {
  for (const id of ['arsenal', 'missions', 'stats', 'result', 'riftmap', 'gear']) $(id).hidden = true;
  $('startscreen').hidden = false;
  $('menu-gold').textContent = M.gold.toLocaleString('pt-BR');
  const n = missionsReady(); $('btn-missions').querySelector('em').textContent = n ? n : ''; $('btn-missions').querySelector('em').hidden = !n;
}
const goldTags = () => document.querySelectorAll('.gold-now').forEach(e => { e.textContent = M.gold.toLocaleString('pt-BR'); });

function card({ glyph, color, name, desc, right, cls = '', btn }) {
  return `<div class="mcard ${cls}" style="--c:${color}"><span class="ico">${glyph}</span><span class="txt"><b>${esc(name)}</b><span class="d">${esc(desc)}</span>${right ? `<span class="lv">${right}</span>` : ''}</span>${btn || ''}</div>`;
}
function renderArsenal() {
  goldTags();
  document.querySelectorAll('#arsenal .tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const box = $('ars-list'); let h = '';
  if (tab === 'feiticos') {
    for (const [k, s] of Object.entries(CFG.spells)) {
      const own = M.spells.includes(k), c = SPELL_COST[k], ev = CFG.evolutions[k];
      const desc = s.desc[0] + (ev ? ` Evolui com ${CFG.passives[ev.need].name} → ${ev.name}.` : '');
      h += card({ glyph: s.glyph, color: s.color, name: s.name, desc, cls: own ? '' : 'locked',
        btn: own ? '<span class="tag">LIBERADO</span>' : `<button class="buy" data-buy="${k}" ${M.gold < c ? 'disabled' : ''}><i></i>${c}</button>` });
    }
  } else if (tab === 'melhorias') {
    for (const [k, u] of Object.entries(UPGRADES)) {
      const l = lvlOf(k), max = l >= u.max, c = costOf(k);
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('');
      h += card({ glyph: u.glyph, color: u.color, name: u.name, desc: u.desc, right: `<span class="pips">${pips}</span>`,
        btn: max ? '<span class="tag">MÁX</span>' : `<button class="buy" data-up="${k}" ${M.gold < c ? 'disabled' : ''}><i></i>${c}</button>` });
    }
  } else {
    for (const [k, hd] of Object.entries(HEROES)) h += card({ glyph: hd.glyph, color: hd.color, name: hd.name, desc: hd.desc, cls: hd.soon ? 'locked' : '',
      btn: hd.soon ? '<span class="tag">EM BREVE</span>' : `<span class="tag">${M.hero === k ? 'ESCOLHIDO' : ''}</span>` });
  }
  box.innerHTML = h;
  box.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const k = b.dataset.buy, c = SPELL_COST[k]; if (M.gold < c) return;
    M.gold -= c; M.spells.push(k); M.stats.bought++; save(); flash(b); renderArsenal(); });
  box.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const k = b.dataset.up, c = costOf(k); if (M.gold < c || lvlOf(k) >= UPGRADES[k].max) return;
    M.gold -= c; M.up[k] = lvlOf(k) + 1; save(); renderArsenal(); });
}
function flash() { try { navigator.vibrate?.(25); } catch { /* ignorar */ } }
function renderMissions() {
  goldTags();
  const s = M.stats;
  const list = [...MISSIONS].sort((a, b) => (M.claimed.includes(a.id) - M.claimed.includes(b.id)) || ((b.val(s) >= b.goal) - (a.val(s) >= a.goal)));
  $('mis-list').innerHTML = list.map(m => {
    const v = Math.min(m.goal, m.val(s)), done = v >= m.goal, got = M.claimed.includes(m.id);
    const prog = m.time ? `${fmtTime(v)} / ${fmtTime(m.goal)}` : `${v.toLocaleString('pt-BR')} / ${m.goal.toLocaleString('pt-BR')}`;
    return `<div class="mis ${got ? 'got' : done ? 'done' : ''}"><div class="t"><b>${esc(m.name)}</b><span>${esc(m.desc)}</span>
      <div class="bar"><i style="width:${v / m.goal * 100}%"></i></div><small>${prog}</small></div>
      ${got ? '<span class="tag">FEITO</span>' : `<button class="buy" data-claim="${m.id}" ${done ? '' : 'disabled'}><i></i>${m.reward}</button>`}</div>`;
  }).join('');
  $('mis-list').querySelectorAll('[data-claim]').forEach(b => b.onclick = () => { const m = MISSIONS.find(x => x.id === b.dataset.claim);
    if (M.claimed.includes(m.id) || m.val(M.stats) < m.goal) return; M.claimed.push(m.id); M.gold += m.reward; save(); flash(); renderMissions(); });
}
function renderStats() {
  const s = M.stats, fav = Object.entries(s.picks).sort((a, b) => b[1] - a[1])[0];
  const rows = [['Partidas', s.runs], ['Vitórias', s.wins], ['Melhor tempo', fmtTime(s.bestTime)], ['Maior nível', s.bestLevel],
    ['Inimigos derrotados', s.kills.toLocaleString('pt-BR')], ['Ouro ganho', s.goldTotal.toLocaleString('pt-BR')], ['Evoluções', s.evolutions], ['Baús abertos', s.chests],
    ['Combos descobertos', `${(s.combos || []).length} / ${Object.keys(CFG.combos).length}`], ['Feitiço favorito', fav ? CFG.spells[fav[0]]?.name || fav[0] : '—'],
    ['Feitiços liberados', `${M.spells.length} / ${Object.keys(CFG.spells).length}`]];
  $('st-list').innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
}

export function initMenu(onPlay) {
  $('btn-start').onclick = onPlay;
  $('btn-arsenal').onclick = () => { $('startscreen').hidden = true; $('arsenal').hidden = false; renderArsenal(); };
  $('btn-missions').onclick = () => { $('startscreen').hidden = true; $('missions').hidden = false; renderMissions(); };
  $('btn-stats').onclick = () => { $('startscreen').hidden = true; $('stats').hidden = false; renderStats(); };
  document.querySelectorAll('.btn-back').forEach(b => b.onclick = showMenu);
  document.querySelectorAll('#arsenal .tabs button').forEach(b => b.onclick = () => { tab = b.dataset.tab; renderArsenal(); });
  showMenu();
}
