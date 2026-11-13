// Fendas · protótipo bullet heaven vertical (voxel pixelado).
// O Mago lança feitiços sozinho; o jogador só se move. Simulação em passo fixo, separada da renderização.
import * as T from '../lib/three.js';
import { buildModel, blobShadow, hash } from '../engine/voxel.js';
import { MODELS } from '../data/models.js';
import { CFG } from './config.js';
import { ModelBatch, CubePool, GlowPool } from './instanced.js';
import { World, MAGE, ZONES, zoneAt, setRift } from './world.js';
import { initRun, openRiftMap, fill } from './run.js';
import { CONTRACT_KINDS } from '../data/contracts.js';
import { refreshHub } from './hub.js';
import { onMenu } from './meta.js';
import { gearMods, rollItem, settleRaid, itemName, statLine, RARITIES, openGear } from './gear.js';
import { drawAmbient } from './ambient.js';
// rocha de minério e santuário (voxel)
const ORE = { parts: [[-3, 0, -2.6, 6, 2.6, 5.2, '#4a4658'], [-2.2, 2.6, -1.8, 4.2, 1.6, 3.6, '#5a5668'], [-1.6, 2.2, 0.8, 1.2, 3.2, 1.2, 'glowOreAm'],
  [0.8, 3, -1, 1.2, 2.6, 1.2, 'glowOreQz'], [1.6, 1.4, 1.8, 1, 1.8, 1, 'glowOreAm'], [-2.8, 1.6, -1.4, 0.9, 1.6, 0.9, 'glowOreQz']] };
const SHRINE = { parts: [[-4, 0, -4, 8, 0.8, 8, '#4a4658'], [-3, 0.8, -3, 6, 0.8, 6, '#5a5668'], [-3.2, 1.6, -3.2, 1.2, 5, 1.2, '#7a7590'], [2, 1.6, -3.2, 1.2, 5, 1.2, '#7a7590'],
  [-3.2, 1.6, 2, 1.2, 5, 1.2, '#7a7590'], [2, 1.6, 2, 1.2, 5, 1.2, '#7a7590'], [-1.2, 1.6, -1.2, 2.4, 2.4, 2.4, '#3a3648']] };
import { Spell, nextDesc } from './spells.js';
import { M, metaMods, endRun, initMenu, showMenu, nextGoal } from './meta.js';
import { sfx } from './sfx.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- renderização pixelada ----------
const canvas = $('view'), over = $('over'), ctx = over.getContext('2d');
const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
const scene = new T.Scene(); scene.background = new T.Color('#07060c');
const hemi = new T.HemisphereLight('#c9b8ff', '#1a1028', 1.5); scene.add(hemi);
const sun = new T.DirectionalLight('#ffe8d0', 2.0); sun.position.set(-5, 10, 4); scene.add(sun);
// efeitos dos poderes: segunda camada em resolução normal (sem pixelar), com brilho aditivo
const fxCanvas = $('fx'), fxRenderer = new T.WebGLRenderer({ canvas: fxCanvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
fxRenderer.setPixelRatio(Math.min(devicePixelRatio, 2)); fxRenderer.setClearColor(0x000000, 0);
const fxScene = new T.Scene();
const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100), camOff = new T.Vector3(...CFG.cam.offset), camAt = new T.Vector3();
let viewW = 8, viewH = CFG.cam.viewH, pxW = 1, pxH = 1;
function resize() {
  const w = innerWidth, h = innerHeight, k = CFG.pixel.on ? Math.max(1, Math.round(h / CFG.pixel.targetH)) : 2;
  pxW = Math.ceil(w / k); pxH = Math.ceil(h / k);
  if (CFG.pixel.on) renderer.setSize(pxW, pxH, false); else { renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); }
  over.width = pxW; over.height = pxH; fxRenderer.setSize(w, h, false);
  viewW = viewH * w / h;
  Object.assign(cam, { left: -viewW / 2, right: viewW / 2, top: viewH / 2, bottom: -viewH / 2 }); cam.updateProjectionMatrix();
  document.body.classList.toggle('landscape', w > h * 1.1);
}
addEventListener('resize', resize);

// ---------- recursos de desenho ----------
const world = new World(scene, onChunk);
const shrineBatch = new ModelBatch(scene, SHRINE, 0.22, 40);
// cada bloco novo de cenário pode trazer minério e um santuário; ao sair da tela, somem
function onChunk(key, c) {
  if (!c) { for (const e of G.enemies) if (e.chunk === key && e.cfg.ore) e.dead = true; G.shrines = (G.shrines || []).filter(s => s.chunk !== key); return; }
  const O = CFG.ore, S = CFG.shrines, far = (x, z) => Math.hypot(x, z) > 4;
  if (c.rnd() < O.chance) { const n = 1 + Math.floor(c.rnd() * (O.perZone[c.zone] || 1));
    for (let q = 0; q < n; q++) { const id = key + 'o' + q, x = c.x0 + 1 + c.rnd() * (c.size - 2), z = c.z0 + 1 + c.rnd() * (c.size - 2);
      if (!G.broken?.has(id) && far(x, z) && G.enemies) { const e = spawn('minerio', x, z); e.chunk = key; e.oid = id; e.face = c.rnd() * 6; } } }
  if (c.rnd() < S.chance && !G.run?.risk.noShrines) { const id = key + 's', x = c.x0 + 2 + c.rnd() * (c.size - 4), z = c.z0 + 2 + c.rnd() * (c.size - 4);
    const keys = Object.keys(S.buffs), tot = keys.reduce((a, k) => a + S.buffs[k].w, 0); let r = c.rnd() * tot, type = keys[0];
    for (const k of keys) if ((r -= S.buffs[k].w) <= 0) { type = k; break; }
    if (far(x, z) && G.shrines) G.shrines.push({ id, chunk: key, x, z, type, prog: 0, used: G.usedShrines?.has(id) }); }
}
const batches = {};
for (const [k, e] of Object.entries(CFG.enemies)) batches[k] = new ModelBatch(scene, MODELS[e.model] || ORE, e.scale, e.boss ? 2 : 420, e.tint);
const gemsPool = new CubePool(scene, 520), fxCubes = new CubePool(fxScene, 400), glow = new GlowPool(fxScene, 2600);
const fxApi2 = { glow: (...a) => glow.add(...a), cube: (...a) => fxCubes.add(...a) };
// sombras redondas sob inimigos (ajudam a ler a posição de cada um)
const shadowMesh = new T.InstancedMesh(new T.CircleGeometry(0.5, 14).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.55, depthWrite: false }), 450);
shadowMesh.frustumCulled = false; shadowMesh.count = 0; shadowMesh.renderOrder = 1; scene.add(shadowMesh);
const _sm = new T.Matrix4();
const debrisPool = new CubePool(scene, 700, { basic: false });   // pedaços voxel de inimigos mortos
// cor principal de cada inimigo para os pedaços
const DEBRIS = { rastejante: ['#5fcf2e', '#2f8a1e', '#c4ff5a'], espectro: ['#d8dde8', '#8a90a8'], investida: ['#3e4a6a', '#262d44', '#ffe066'], brutamonte: ['#6b6f78', '#3d4048', '#9a5a3a'],
  cuspidor: ['#6b5a7a', '#3f3450', '#fff6dc'], minichefe: ['#3a2a2a', '#b0803a', '#ffc04d'], guardiao: ['#5a4030', '#3f7a36', '#6b6f66'], minerio: ['#4a4658', '#9dff4a', '#7fd8ff'] };
const splatPool = new CubePool(scene, 320, { opacity: 0.32, depthWrite: false, size: [1, 0.02, 1] });
const mageRoot = new T.Group(), mageBody = buildModel({ ...MAGE, scale: 1.3 });
mageRoot.add(mageBody, blobShadow(0.5)); scene.add(mageRoot);

// ---------- estado ----------
const G = {
  mode: 'start', t: 0, enemies: [], projectiles: [], gems: [], fx: [], particles: [], debris: [], splats: [], numbers: [],
  spells: [], passives: {}, mods: {}, shrines: [], buffs: {}, xp: 0, level: 1, kills: 0, coins: 0, combo: 0, comboT: 0, bestCombo: 0,
  spawnAcc: 0, nextEvent: 0, event: null, eventT: 0, boss: null, miniDone: false, bossDone: false, queue: 0,
};
const mage = G.mage = { x: 0, z: 0, face: Math.PI, hp: 100, maxHp: 100, inv: 0, mx: 0, mz: 0 };
if (/[?&]debug/.test(location.search)) window.__G = G;   // inspeção em testes (?debug)

function recalc() {
  const p = k => G.passives[k] || 0, P = CFG.passives, mm = G.meta || metaMods();
  G.mods = { dmg: (1 + P.poder.per * p('poder')) * mm.dmg, cd: Math.max(0.45, (1 - P.pressa.per * p('pressa')) * mm.cd), area: 1 + P.alcance.per * p('alcance'),
    magnet: CFG.mage.magnet * (1 + P.ima.per * p('ima')) * mm.magnet * (G.run?.risk.magnet || 1), regen: P.vigor.regen * p('vigor'), speed: CFG.mage.speed * (1 + P.passo.per * p('passo')) * mm.speed,
    count: Math.floor((p('quantidade') + 1) / 2), dur: 1 + P.duracao.per * p('duracao'), crit: CFG.drops.critBase + P.sorte.crit * p('sorte'), luck: 1 + P.sorte.drop * p('sorte') };
  const g = G.gear || {};   // equipamento
  G.mods.dmg *= 1 + (g.dmg || 0); G.mods.cd *= 1 - (g.cd || 0); G.mods.area += g.area || 0; G.mods.speed *= 1 + (g.speed || 0);
  G.mods.magnet *= 1 + (g.magnet || 0); G.mods.crit += g.crit || 0; G.mods.regen += g.regen || 0;
  const B = CFG.shrines.buffs, on = k => (G.buffs?.[k] || 0) > 0;
  if (on('furia')) G.mods.dmg *= B.furia.dmg; if (on('vento')) G.mods.speed *= B.vento.speed; if (on('fluxo')) G.mods.cd *= B.fluxo.cd;
  const old = mage.maxHp; mage.maxHp = CFG.mage.hp + mm.hp + P.vigor.hp * p('vigor') + (G.gear?.hp || 0); mage.hp += Math.max(0, mage.maxHp - old);
}

// ---------- grade espacial (vizinhos, alvos) ----------
const CELL = 2, grid = new Map();
const key = (i, j) => i * 100003 + j;
function rebuildGrid() {
  grid.clear();
  for (const e of G.enemies) { if (e.dead) continue; const k = key(Math.floor(e.x / CELL), Math.floor(e.z / CELL)); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e); }
}
G.reach = (k = 1) => CFG.reach * G.mods.area * k;
G.query = (x, z, r) => {
  const out = [], i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = grid.get(key(i, j)); if (!a) continue;
    for (const e of a) if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.r) out.push(e); }
  return out;
};
G.foes = (x, z, r) => G.query(x, z, r).filter(e => !e.cfg.ore);
// alvos: inimigos primeiro; sem inimigos por perto, os feitiços miram o minério
G.nearest = (x, z, n, maxR) => { const f = G.foes(x, z, maxR); return (f.length ? f : G.query(x, z, maxR)).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z)).slice(0, n); };

// ---------- efeitos ----------
G.fx = [];
const fxApi = {
  ring: (x, z, r, color, dur, fill) => G.fx.push({ k: 'ring', x, z, r, color, dur, t: 0, fill }),
  bolt: (x1, z1, x2, z2, color) => sfx.zap() || G.fx.push({ k: 'bolt', x1, z1, x2, z2, color, dur: 0.14, t: 0, seed: Math.random() * 99 }),
  spikes: (x, z, r) => G.fx.push({ k: 'spikes', x, z, r, dur: 0.5, t: 0, seed: Math.random() * 99 }),
  cloud: (x, z, r) => G.fx.push({ k: 'cloud', x, z, r, dur: 0.45, t: 0, seed: Math.random() * 99 }),
  sky: (x, z) => G.fx.push({ k: 'sky', x, z, dur: 0.22, t: 0, seed: Math.random() * 99 }),
  burst: (x, z, color, n = 8, sp = 3) => { for (let i = 0; i < n && G.particles.length < 800; i++) { const a = Math.random() * 6.3, s = sp * rand(0.4, 1); G.particles.push({ x, y: 0.4, z, vx: Math.cos(a) * s, vy: rand(1.5, 4), vz: Math.sin(a) * s, t: 0, dur: rand(0.3, 0.55), color, size: rand(0.07, 0.13) }); } },
};
G.shake = k => { G.shakeT = Math.max(G.shakeT || 0, k); if (k >= 0.25) sfx.boom(); };
G.scorch = (x, z, r) => { G.splats.push({ x, z, s: r * 1.6, ry: Math.random() * 6, t: 0, c: '#120a08' }); };
Object.assign(G.fx, fxApi); G.fx.ring = fxApi.ring; G.fx.bolt = fxApi.bolt; G.fx.spikes = fxApi.spikes; G.fx.cloud = fxApi.cloud; G.fx.burst = fxApi.burst;

// ---------- dano ----------
const ST = CFG.status;
function combo(k, e) {
  const c = CFG.combos[k];
  if (e && G.numbers.length < 34 && Math.random() < 0.5) G.numbers.push({ x: e.x, z: e.z, v: c.name, t: 0, label: c.color });
  if (!G.found.has(k)) { G.found.add(k); banner(c.name, c.sub, c.color); }
}
function discharge(e) {
  const o = G.query(e.x, e.z, ST.shockRange).find(q => q !== e && !q.dead); if (!o) return;
  fxApi.bolt(e.x, e.z, o.x, o.z, '#fff27a'); combo('sobrecarga', e);
  G.damage(o, ST.shockDmg * G.mods.dmg, { noProc: true, quiet: true, color: '#fff27a', stun: 0.1 });
}
G.damage = (e, dmg, o = {}) => {
  if (e.dead) return;
  if (dmg > 0) {
    if (e.exposeT > 0) dmg *= ST.exposeMul;
    if (o.burn && e.freezeT > 0) { dmg = dmg * ST.thermal + ST.thermalBonus * G.mods.dmg; e.freezeT = 0; e.stunT = 0; combo('termico', e); }
    if (o.shock && e.soakT > 0) { dmg *= ST.soakShockMul; if (Math.random() < 0.3) combo('condutor', e); }
    let crit = false; if (!o.noProc && Math.random() < G.mods.crit) { dmg *= 2; crit = true; }
    e.hp -= dmg; e.flash = 0.07; G.dmgBy[G.src || 'outros'] = (G.dmgBy[G.src || 'outros'] || 0) + Math.min(dmg, Math.max(0, e.hp + dmg)); if (!o.quiet) sfx.hit();
    if (!o.shock && !o.noProc && e.shockT > 0) { e.shockT = 0; discharge(e); }
    // números de dano: só alguns, para não virar uma nuvem ilegível (golpes fortes sempre aparecem)
    const big = dmg >= 30 || crit, crowd = G.numbers.length;
    if (!o.silent && (big || (!o.quiet && crowd < 12 && Math.random() < 0.45) || (crowd < 5 && Math.random() < 0.2))) G.numbers.push({ x: e.x + rand(-0.15, 0.15), z: e.z, v: Math.round(dmg), t: 0, big, crit });
  }
  if (o.chill) e.slowT = Math.max(e.slowT, o.chill);
  if (o.freeze) { let d = o.freeze; if (e.soakT > 0) { d *= 2; combo('congela', e); } if (e.cfg.boss) e.slowT = Math.max(e.slowT, d); else { e.freezeT = Math.max(e.freezeT, d); e.stunT = Math.max(e.stunT, d); } }
  if (o.shock) e.shockT = Math.max(e.shockT, o.shock);
  if (o.corrupt) e.corruptT = Math.max(e.corruptT, o.corrupt);
  if (o.expose) e.exposeT = Math.max(e.exposeT, o.expose);
  if (o.push && !e.cfg.boss) { const f = o.from || mage, dx = e.x - f.x, dz = e.z - f.z, l = Math.hypot(dx, dz) || 1, p = o.push * (e.cfg.heavy ? 0.35 : 1); e.kx += dx / l * p; e.kz += dz / l * p; }
  if (o.soak) e.soakT = Math.max(e.soakT, o.soak);
  if (o.burn) e.burnT = Math.max(e.burnT, o.burn);
  if (o.stun && !e.cfg.boss) e.stunT = Math.max(e.stunT, o.stun);
  if (e.hp <= 0) kill(e);
};
function kill(e) {
  if (e.cfg.ore) {   // minério quebrado: cristais e às vezes ouro
    e.dead = true; G.broken.add(e.oid); const O = CFG.ore;
    for (let i = 0; i < O.gems; i++) dropGem(e.x + rand(-0.4, 0.4), e.z + rand(-0.4, 0.4), O.gemValue);
    if (Math.random() < O.coin * G.mods.luck) G.gems.push({ x: e.x, z: e.z + 0.3, v: 0, coin: true, t: 0 });
    fxApi.burst(e.x, e.z, '#9dff4a', 14, 3); fxApi.burst(e.x, e.z, '#7fd8ff', 10, 3); shatter(e); G.shake(0.08); return;
  }
  e.dead = true; G.kills++; sfx.kill(); shatter(e);
  if (G.contract) { const k = G.contract.kind; if (k === 'contencao' || (k === 'cacada' && (e.elite || e.cfg.boss))) progress(1); }
  if (e.corruptT > 0 && G.blasts.length < 60) G.blasts.push({ x: e.x, z: e.z, dmg: Math.min(50, ST.corruptDmg * G.mods.dmg + e.maxHp * ST.corruptHp) });
  if (!G.run?.risk.noHearts && Math.random() < (e.elite ? CFG.drops.heartElite : CFG.drops.heart) * G.mods.luck) G.gems.push({ x: e.x - 0.2, z: e.z, v: 0, heart: true, t: 0 });
  if (e.reels) G.gems.push({ x: e.x, z: e.z + 0.3, v: 0, chest: e.reels, t: 0 });
  G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = CFG.combo.window; G.bestCombo = Math.max(G.bestCombo, G.combo);
  const v = (e.elite ? e.elite.xp : e.cfg.xp) * (G.event?.kind === 'surto' ? 2 : 1);
  if (v) dropGem(e.x, e.z, v);
  if (Math.random() < 0.025 * G.mods.luck || e.elite) G.gems.push({ x: e.x + 0.2, z: e.z, v: 0, coin: true, t: 0 });
  fxApi.burst(e.x, e.z, e.elite ? '#ffd34d' : '#b24dff', e.cfg.boss ? 30 : 5, 2.4);
  if (G.splats.length > 300) G.splats.shift();
  G.splats.push({ x: e.x, z: e.z, s: e.r * rand(1.2, 1.8) * (e.elite ? 1.4 : 1), ry: Math.random() * 6, t: 0, c: Math.random() < 0.5 ? '#3a1630' : '#24163a' });
  if (e.cfg.boss === 'mini') G.gems.push({ x: e.x, z: e.z, v: 0, chest: 3, t: 0, pull: true });
  if (e.elite && !e.reels && Math.random() < 0.05) dropGear(0);
  if (e.cfg.boss === 'final') { dropGear(3); dropGear(3); G.bossDone = true; setTimeout(() => finish(true), 1200); }
  if (e === G.boss) { G.boss = null; $('bossbar').hidden = true; }
}
// o inimigo se desfaz em cubos que voam, quicam e encolhem
function shatter(e) {
  const cols = DEBRIS[e.type] || DEBRIS.rastejante, big = e.cfg.boss ? 3 : e.elite ? 1.8 : 1, n = Math.round((e.cfg.boss ? 40 : 7) * Math.min(big, 1.5));
  for (let i = 0; i < n && G.debris.length < 650; i++) { const a = Math.random() * 6.283, sp = rand(1.2, 3.4) * Math.sqrt(big);
    G.debris.push({ x: e.x + rand(-0.2, 0.2), y: rand(0.2, 0.6) * big, z: e.z + rand(-0.2, 0.2), vx: Math.cos(a) * sp, vy: rand(2.5, 5.5), vz: Math.sin(a) * sp,
      s: rand(0.13, 0.24) * Math.sqrt(big), c: cols[i % cols.length], rx: Math.random() * 6, ry: Math.random() * 6, t: 0, dur: rand(0.9, 1.4) }); }
}
// ---------- contrato e portal de extração ----------
function progress(n, abs) {
  const c = G.contract; if (!c || c.done) return;
  c.prog = abs ? n : c.prog + n;
  if (c.prog >= c.goal) { c.prog = c.goal; c.done = true; banner('CONTRATO CUMPRIDO', `${c.name} · pagamento garantido ao sair`, '#ffd34d'); sfx.bless(); }
}
// equipamento cai na mochila da raid; só é seu se você sair vivo
function dropGear(tier) {
  const it = rollItem(tier); G.loot.push(it); const R = RARITIES[it.rarity];
  banner(R.name.toUpperCase() + ': ' + itemName(it), statLine(it), R.color); sfx.evo();
}
function openPortal() {
  const a = Math.random() * 6.283, X = CFG.extract;
  G.portal = { x: mage.x + Math.sin(a) * X.dist, z: mage.z + Math.cos(a) * X.dist, prog: 0 };
  banner('PORTAL DE EXTRAÇÃO', 'Saia com o saque ou arrisque ficar', '#5ff2ff'); sfx.warn();
}
function bless(type, s) {
  sfx.bless();
  const b = CFG.shrines.buffs[type];
  banner(b.name, b.sub, b.color); G.shake(0.2); fxApi.ring(s.x, s.z, CFG.shrines.radius * 1.6, b.glow, 0.5, true); fxApi.burst(mage.x, mage.z, b.glow, 20, 4);
  if (b.dur) { G.buffs[type] = b.dur; recalc(); }
  if (b.heal) mage.hp = Math.min(mage.maxHp, mage.hp + b.heal);
  if (type === 'chamado') for (const g of G.gems) g.pull = true;
}
function dropGem(x, z, v) {
  if (G.gems.length > 480) { const g = G.gems[Math.floor(Math.random() * G.gems.length)]; if (!g.coin) { g.v += v; return; } }
  G.gems.push({ x: x + rand(-0.15, 0.15), z: z + rand(-0.15, 0.15), v, t: 0 });
}

// ---------- inimigos e diretor ----------
function spawn(type, x, z, opts = {}) {
  const c = CFG.enemies[type], el = opts.elite, rk = G.run?.risk, hp = c.hp * (c.boss ? 1 : CFG.hpScale(G.t)) * (el ? (el.hpFlat ? el.hpFlat / c.hp : el.hp) : 1) * (c.ore ? 1 : (G.run?.R.hp || 1) * (rk?.hp || 1));
  const e = { type, cfg: c, x, z, hp, maxHp: hp, r: c.radius * (el ? el.r : 1), speed: c.speed * rand(0.9, 1.1) * (el ? el.speed : 1) * (rk?.speed || 1), elite: el,
    kx: 0, kz: 0, flash: 0, freezeT: 0, shockT: 0, corruptT: 0, exposeT: 0, soakT: 0, burnT: 0, burnTick: 0, stunT: 0, slowT: 0, face: 0, ph: Math.random() * 6, act: rand(0, 2), state: 'move', st: 0, dead: false };
  G.enemies.push(e); return e;
}
function spawnRing(type, n, dist) {
  const gap = Math.floor(Math.random() * n);   // brecha de fuga no cerco
  for (let i = 0; i < n; i++) { if ((i - gap + n) % n < Math.ceil(n / 7)) continue; const a = i / n * Math.PI * 2; spawn(type, mage.x + Math.sin(a) * dist, mage.z + Math.cos(a) * dist); }
}
function spawnPoint() {
  const a = Math.random() * Math.PI * 2, d = Math.hypot(viewW / 2, viewH * 0.6) + rand(0.8, 2.5);
  return [mage.x + Math.sin(a) * d, mage.z + Math.cos(a) * d];
}
function pickType() {
  let w = CFG.waves[0];
  for (const x of CFG.waves) if (G.t >= x.from) w = x;
  const entries = Object.entries(w.mix), tot = entries.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * tot; for (const [k, v] of entries) if ((r -= v) <= 0) return k;
  return entries[0][0];
}
function director(dt) {
  if (G.bossDone) return;
  const alive = G.enemies.length - G.enemies.filter(e => e.cfg.ore).length;
  let rate = (G.run?.risk.spawn || 1) * CFG.spawnRate(G.t) * (G.event?.kind === 'horda' ? 3 : 1) * (G.boss?.cfg.boss === 'final' ? 0.3 : 1);
  G.spawnAcc += rate * dt;
  while (G.spawnAcc >= 1) {
    G.spawnAcc -= 1; if (alive >= CFG.maxAlive) continue;
    const [x, z] = spawnPoint(), elite = G.t > CFG.elite.chanceFrom && Math.random() < CFG.elite.chance ? CFG.elite : null;
    spawn(pickType(), x, z, { elite });
  }
  const ce = CFG.chestElites[G.nextChamp];
  if (ce && G.t >= ce.at) { G.nextChamp++; const [x, z] = spawnPoint(); const e = spawn(Math.random() < 0.5 ? 'brutamonte' : pickType(), x, z, { elite: CFG.champion }); e.reels = ce.reels; sfx.warn(); banner('CAMPEÃO DA FENDA', `Carrega um baú de ${ce.reels} ${ce.reels > 1 ? 'rolos' : 'rolo'}`, '#ffc96b'); }
  // eventos
  const ev = CFG.events[G.nextEvent];
  if (ev && G.t >= ev.at) {
    G.nextEvent++; const info = CFG.eventInfo[ev.kind];
    G.event = { kind: ev.kind }; G.eventT = info.dur; banner(info.name, info.sub, info.color);
    if (ev.kind === 'cercado') spawnRing(G.t > 300 ? 'espectro' : 'rastejante', 26, 5.5);
  }
  if (G.event && (G.eventT -= dt) <= 0) G.event = null;
  // minichefe e Guardião
  if (!G.miniDone && G.t >= CFG.miniboss) { G.miniDone = true; const [x, z] = spawnPoint(); G.boss = spawn('minichefe', x, z); banner('MINICHEFE', 'Caldeira Viva', '#ff8a3d'); showBoss('Caldeira Viva'); }
  if (!G.bossSpawned && G.t >= CFG.runTime) { G.bossSpawned = true; const [x, z] = spawnPoint(); G.boss = spawn('guardiao', x, z); banner('GUARDIÃO', 'Arborion Ancião desperta', '#c58bff'); showBoss('Arborion Ancião'); }
}
function updateEnemy(e, dt) {
  if (e.cfg.ore) { e.flash -= dt; e.burnT = 0; return; }
  const c = e.cfg, dx = mage.x - e.x, dz = mage.z - e.z, d = Math.hypot(dx, dz) || 1;
  e.flash -= dt; e.soakT -= dt; e.stunT -= dt; e.slowT -= dt; e.freezeT -= dt; e.shockT -= dt; e.corruptT -= dt; e.exposeT -= dt;
  if (e.burnT > 0) { e.burnT -= dt; if ((e.burnTick -= dt) <= 0) { e.burnTick = 0.5; G.damage(e, ST.burnDps(G.t) * G.mods.dmg, { quiet: true, noProc: true }); if (e.dead) return; } }
  let sp = e.speed * (e.soakT > 0 || e.slowT > 0 ? 0.5 : 1) * (e.stunT > 0 ? 0 : 1), vx = dx / d, vz = dz / d;
  e.act -= dt;
  if (c.ranged) {   // mantém distância e cospe
    if (d < c.ranged.keep - 0.5) { vx = -vx; vz = -vz; } else if (d < c.ranged.keep + 1) sp = 0;
    if (e.act <= 0 && e.stunT <= 0 && d < 9) { e.act = c.ranged.every; enemyShot(e.x, e.z, dx / d, dz / d, c.ranged.speed, c.ranged.dmg); e.flash = 0.12; }
  }
  if (c.dash) {   // recua, brilha e investe em linha reta
    if (e.state === 'move' && e.act <= 0 && d < 6) { e.state = 'wind'; e.st = c.dash.windup; e.dx = dx / d; e.dz = dz / d; }
    if (e.state === 'wind') { sp = 0; if ((e.st -= dt) <= 0) { e.state = 'dash'; e.st = c.dash.time; } }
    else if (e.state === 'dash') { sp = c.dash.speed * (e.stunT > 0 ? 0 : 1); vx = e.dx; vz = e.dz; if ((e.st -= dt) <= 0) { e.state = 'move'; e.act = c.dash.every; } }
  }
  if (c.boss) bossAct(e, dt, d, dx, dz);
  e.x += (vx * sp + e.kx) * dt; e.z += (vz * sp + e.kz) * dt;
  const kd = Math.pow(0.003, dt); e.kx *= kd; e.kz *= kd;
  if (sp > 0.1) e.face = Math.atan2(vx, vz);
  // contato com o Mago
  if (d < e.r * 0.75 + CFG.mage.radius && e.stunT <= 0) hurtMage(c.dmg * (e.elite ? e.elite.dmg : 1));
  // longe demais: reaparece do outro lado (o enxame nunca some)
  if (d > Math.hypot(viewW, viewH) * 0.95 && !c.boss) { const [x, z] = spawnPoint(); e.x = x; e.z = z; }
}
function bossAct(e, dt, d, dx, dz) {
  e.st -= dt;
  if (e.st > 0) return;
  if (e.tele) { const n = e.tele; e.tele = 0; ringShots(e.x, e.z, n, e.rage ? 3.6 : 3.2, e.cfg.boss === 'mini' ? 10 : 12); e.st = e.rest; return; }
  if (e.cfg.boss === 'mini') { telegraph(e, 12, 3.0); }
  else {
    // fase 2: abaixo de metade da vida o Guardião se enfurece
    if (!e.rage && e.hp < e.maxHp * 0.5) { e.rage = true; e.speed *= 1.35; banner('GUARDIÃO ENFURECIDO', 'Ataques mais rápidos e densos', '#ff4f6a'); G.shake(0.4); sfx.warn(); }
    const r = Math.random(); e.st = e.rage ? 1.9 : 2.8;
    if (r < 0.45) { telegraph(e, e.rage ? 26 : 18, e.st - 0.7); }
    else if (r < 0.75) { e.kx += dx / d * 9; e.kz += dz / d * 9; e.flash = 0.2; }   // investida curta
    else { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; spawn('espectro', e.x + Math.sin(a) * 1.6, e.z + Math.cos(a) * 1.6); } }
  }
}
// aviso antes do anel de tiros: o chefe brilha e um círculo pulsa por 0,7 s
function telegraph(e, n, rest) { e.tele = n; e.rest = Math.max(0.6, rest); e.st = 0.7; e.flash = 0.7; fxApi.ring(e.x, e.z, e.r + 1.6, '#ff4f6a', 0.7, false); }
function enemyShot(x, z, dx, dz, sp, dmg) { G.projectiles.push({ kind: 'inimigo', enemy: true, x, z, vx: dx * sp, vz: dz * sp, life: 4, r: 0.16, dmg }); }
function ringShots(x, z, n, sp, dmg) { const o = Math.random(); for (let i = 0; i < n; i++) { const a = (i + o) / n * Math.PI * 2; enemyShot(x, z, Math.sin(a), Math.cos(a), sp, dmg); } }
function separate() {
  for (const a of grid.values()) for (let i = 0; i < a.length; i++) for (let j = i + 1; j < Math.min(a.length, i + 6); j++) {
    const p = a[i], q = a[j], dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), min = p.r + q.r;
    if (d >= min || d < 1e-4) continue;
    const o = (min - d) / d * 0.5, wp = p.cfg.ore ? 0 : p.cfg.heavy ? 0.2 : 1, wq = q.cfg.ore ? 0 : q.cfg.heavy ? 0.2 : 1;
    p.x -= dx * o * wp; p.z -= dz * o * wp; q.x += dx * o * wq; q.z += dz * o * wq;
  }
}

// ---------- Mago ----------
function hurtMage(dmg) {
  if (mage.inv > 0 || G.mode !== 'play' || G.buffs.egide > 0) return;
  mage.hp -= dmg * (G.run?.risk.dmg || 1); mage.inv = CFG.mage.iframes; sfx.hurt();
  document.body.classList.remove('hurt'); void document.body.offsetWidth; document.body.classList.add('hurt');
  try { navigator.vibrate?.(30); } catch { /* ignorar */ }
  if (mage.hp <= 0 && G.revives > 0) {
    G.revives--; mage.hp = mage.maxHp * 0.5; mage.inv = 2; banner('SEGUNDA CHANCE', 'De volta à luta', '#5dff9a'); G.shake(0.4);
    for (const e of G.query(mage.x, mage.z, 6)) G.damage(e, 0, { push: 10, from: mage, noProc: true }); return;
  }
  if (mage.hp <= 0) { mage.hp = 0; finish(false); }
}
function addXp(v) {
  G.xp += v;
  while (G.xp >= CFG.xpFor(G.level)) { G.xp -= CFG.xpFor(G.level); G.level++; G.queue++; }
}

// ---------- subir de nível: escolher 1 de 3 ----------
function options() {
  const owned = Object.fromEntries(G.spells.map(s => [s.key, s])), opts = [];
  for (const [fk, f] of Object.entries(CFG.fusions)) if (f.from.every(k => owned[k]?.level >= 5) && !owned[fk]) opts.push({ kind: 'fusion', key: fk, w: 100 });
  for (const s of G.spells) { const ev = CFG.evolutions[s.key]; if (ev && !s.evo && !s.fusion && s.level >= 5 && G.passives[ev.need]) opts.push({ kind: 'evo', key: s.key, w: 100 }); }
  for (const s of G.spells) if (!s.fusion && s.level < 5) opts.push({ kind: 'up', key: s.key, w: 3 });
  if (G.spells.length < CFG.mage.slots) for (const k of Object.keys(CFG.spells)) if (M.spells.includes(k) && !owned[k] && !G.spells.some(s => s.fusion && CFG.fusions[s.key].from.includes(k))) opts.push({ kind: 'new', key: k, w: 2 });
  const pc = Object.keys(G.passives).length;
  for (const k of Object.keys(CFG.passives)) { const l = G.passives[k] || 0; if (l && l < 5) opts.push({ kind: 'pup', key: k, w: 2 }); else if (!l && pc < CFG.mage.passiveSlots) opts.push({ kind: 'pnew', key: k, w: 1.4 }); }
  for (let i = opts.length - 1; i >= 0; i--) if (G.banned.has(opts[i].key)) opts.splice(i, 1);
  const out = [];
  while (out.length < 3 && opts.length) {
    const tot = opts.reduce((s, o) => s + o.w, 0); let r = Math.random() * tot, i = 0;
    for (; i < opts.length; i++) if ((r -= opts[i].w) <= 0) break;
    out.push(opts.splice(Math.min(i, opts.length - 1), 1)[0]);
  }
  const atk = o => o.kind === 'new' || o.kind === 'up' || o.kind === 'evo' || o.kind === 'fusion';
  if (G.spells.length < 3 && out.length && !out.some(atk)) { const a = opts.filter(atk); if (a.length) out[out.length - 1] = a[Math.floor(Math.random() * a.length)]; }
  if (!out.length) out.push({ kind: 'heal', key: 'heal' });
  return out;
}
function openLevelUp(keep) {
  G.mode = 'levelup'; input.clear(); G.banning = false;
  const box = $('choices'); box.innerHTML = ''; box.classList.remove('banning'); $('ban-hint').hidden = true; $('btn-ban').classList.remove('on');
  const chest = G.chests > 0, extra = G.queue - 1;
  $('lv-title').textContent = (chest ? 'BAÚ DA FENDA' : 'SUBIU DE NÍVEL!') + (extra > 0 ? ` (+${extra})` : '');
  $('lv-sub').textContent = `Ataques ${G.spells.length}/${CFG.mage.slots} · Passivas ${Object.keys(G.passives).length}/${CFG.mage.passiveSlots}`;
  $('n-reroll').textContent = G.rerolls; $('n-ban').textContent = G.bans;
  $('btn-reroll').disabled = G.rerolls <= 0; $('btn-ban').disabled = G.bans <= 0;
  if (!keep) sfx.levelup();
  G.offer = keep || options();
  for (const o of G.offer) {
    const s = o.kind === 'evo' ? CFG.evolutions[o.key] : o.kind === 'pnew' || o.kind === 'pup' ? CFG.passives[o.key] : CFG.spells[o.key] || CFG.fusions[o.key];
    const cur = o.kind === 'up' ? G.spells.find(x => x.key === o.key).level : o.kind === 'pup' ? G.passives[o.key] : 0;
    const tag = o.kind === 'evo' ? 'EVOLUÇÃO' : o.kind === 'fusion' ? 'FUSÃO' : o.kind === 'new' || o.kind === 'pnew' ? 'NOVO' : o.kind === 'heal' ? '' : `NV ${cur} → ${cur + 1}`;
    const name = o.kind === 'heal' ? 'Poção de mana' : s.name, color = o.kind === 'heal' ? '#ff5a6a' : s.color, glyph = o.kind === 'heal' ? '♥' : s.glyph;
    // dica de evolução: o feitiço mostra a passiva que o evolui; a passiva avisa se completa uma evolução
    const ev = CFG.evolutions[o.key], evoFor = (o.kind === 'pnew' || o.kind === 'pup') ? G.spells.find(x => !x.evo && CFG.evolutions[x.key]?.need === o.key) : null;
    let hint = (o.kind === 'new' || o.kind === 'up') && ev ? ` ✦ Evolui com ${CFG.passives[ev.need].name}${G.passives[ev.need] ? ' (você já tem)' : ''}.` : '';
    if (evoFor) hint = ` ✦ Evolui ${evoFor.meta.name}${evoFor.level >= 5 ? ' (pronto!)' : ` no nível 5`}.`;
    const desc = (o.kind === 'heal' ? 'Recupera 30 de vida.' : o.kind === 'pnew' || o.kind === 'pup' ? s.desc : o.kind === 'evo' ? `${CFG.spells[o.key].name} + ${CFG.passives[s.need].name}: ${s.desc}` : o.kind === 'fusion' ? `${CFG.spells[s.from[0]].name} + ${CFG.spells[s.from[1]].name}: ${s.desc}` : nextDesc(o.key, cur)) + hint;
    const b = document.createElement('button'); b.className = 'card' + (o.kind === 'fusion' || o.kind === 'evo' ? ' fusion' : evoFor ? ' evohint' : ''); b.style.setProperty('--c', color);
    b.innerHTML = `<span class="ico">${glyph}</span><span class="txt"><span class="row"><b>${esc(name)}</b><em>${esc(tag)}</em></span><span class="d">${esc(desc)}</span></span>`;
    b.onclick = () => { if (G.banning && o.kind !== 'heal') { G.bans--; G.banned.add(o.key); openLevelUp(G.offer.filter(x => x !== o).concat(options().filter(x => !G.offer.some(y => y.key === x.key)).slice(0, 1))); } else choose(o); }; box.appendChild(b);
  }
  $('levelup').hidden = false;
}
function choose(o) {
  sfx.pick();
  apply(o);
  G.queue--; if (G.chests > 0) G.chests--; $('levelup').hidden = true; renderLoadout();
  if (G.queue > 0) openLevelUp(); else { G.mode = 'play'; input.clear(); }
}
function apply(o) {
  if (o.kind === 'new') G.spells.push(new Spell(o.key, G));
  if (o.kind === 'up') G.spells.find(s => s.key === o.key).level++;
  if (o.kind === 'evo') { G.evolutions++; sfx.evo(); G.spells.find(s => s.key === o.key).evo = true; banner('EVOLUÇÃO', CFG.evolutions[o.key].name, CFG.evolutions[o.key].color); G.shake(0.25); }
  if (o.kind === 'fusion') { G.spells = G.spells.filter(s => !CFG.fusions[o.key].from.includes(s.key)); G.spells.push(new Spell(o.key, G)); banner('FUSÃO', CFG.fusions[o.key].name, CFG.fusions[o.key].color); }
  if (o.kind === 'pnew' || o.kind === 'pup') { G.passives[o.key] = (G.passives[o.key] || 0) + 1; recalc(); }
  if (o.kind === 'heal') mage.hp = Math.min(mage.maxHp, mage.hp + 30);
}
function cardInfo(o) {
  const s = o.kind === 'evo' ? CFG.evolutions[o.key] : o.kind === 'pnew' || o.kind === 'pup' ? CFG.passives[o.key] : o.kind === 'heal' ? { name: 'Poção de mana', color: '#ff5a6a', glyph: '♥' } : CFG.spells[o.key] || CFG.fusions[o.key];
  const cur = o.kind === 'up' ? G.spells.find(x => x.key === o.key).level : o.kind === 'pup' ? G.passives[o.key] : 0;
  const tag = o.kind === 'evo' ? 'EVOLUÇÃO' : o.kind === 'fusion' ? 'FUSÃO' : o.kind === 'new' || o.kind === 'pnew' ? 'NOVO' : o.kind === 'heal' ? '+30 VIDA' : `NV ${cur + 1}`;
  return { s, tag };
}
// ---------- baú: caça-níquel ----------
function openSlot(n) {
  G.opened++;
  G.mode = 'slot'; input.clear();
  const champ = n > 1, reels = $('reels'), res = $('slot-res'), btn = $('btn-slot');
  $('slot-title').textContent = champ ? 'BAÚ DO CAMPEÃO' : 'BAÚ DA FENDA';
  $('slot-sub').textContent = champ ? 'Três rolos, três melhorias' : 'Role o caça-níquel';
  res.innerHTML = ''; reels.innerHTML = '';
  const pool = [...Object.values(CFG.spells), ...Object.values(CFG.passives)];
  const els = Array.from({ length: n }, () => { const d = document.createElement('div'); d.className = 'reel'; d.innerHTML = '<span>?</span>'; reels.appendChild(d); return d; });
  btn.textContent = 'ROLAR'; btn.disabled = false;
  btn.onclick = () => {
    btn.disabled = true;
    // sorteia em sequência, aplicando cada uma (a próxima já considera a anterior)
    const got = []; for (let i = 0; i < n; i++) { const o = options()[0]; got.push(o); apply(o); }
    renderLoadout();
    const timers = els.map((d, i) => { d.classList.add('spin'); return setInterval(() => { sfx.spin(); const r = pool[Math.floor(Math.random() * pool.length)]; d.style.setProperty('--c', r.color); d.firstChild.textContent = r.glyph; }, 70); });
    els.forEach((d, i) => setTimeout(() => {
      clearInterval(timers[i]); sfx.stop(); const { s, tag } = cardInfo(got[i]);
      d.classList.remove('spin'); d.classList.add('stop'); d.style.setProperty('--c', s.color); d.firstChild.textContent = s.glyph;
      const c = document.createElement('div'); c.className = 'card' + (tag === 'EVOLUÇÃO' || tag === 'FUSÃO' ? ' fusion' : ''); c.style.setProperty('--c', s.color);
      c.innerHTML = `<span class="ico">${s.glyph}</span><span class="txt"><span class="row"><b>${esc(s.name)}</b><em>${esc(tag)}</em></span></span>`; res.appendChild(c);
      try { navigator.vibrate?.(20); } catch { /* ignorar */ }
      if (i === n - 1) { btn.textContent = 'CONTINUAR'; btn.disabled = false; btn.onclick = () => { $('slot').hidden = true; G.mode = 'play'; input.clear(); }; }
    }, 900 + i * 550));
  };
  $('slot').hidden = false;
}

// ---------- entrada: joystick flutuante com um dedo ----------
const input = (() => {
  const s = { id: null, ox: 0, oy: 0, x: 0, z: 0, keys: new Set() }, R = 46, stick = $('stick'), knob = $('knob');
  const layer = $('touch');
  layer.addEventListener('pointerdown', e => { if (G.mode !== 'play' || s.id !== null) return; s.id = e.pointerId; s.ox = e.clientX; s.oy = e.clientY; layer.setPointerCapture(e.pointerId); stick.style.left = s.ox + 'px'; stick.style.top = s.oy + 'px'; stick.classList.add('on'); });
  layer.addEventListener('pointermove', e => { if (e.pointerId !== s.id) return; let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; s.x = l > 6 ? dx / R : 0; s.z = l > 6 ? dy / R : 0; });
  const end = e => { if (e.pointerId !== s.id) return; s.id = null; s.x = s.z = 0; stick.classList.remove('on'); knob.style.transform = ''; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => layer.addEventListener(n, end));
  const M = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
  addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (M[k]) { s.keys.add(k); e.preventDefault(); } if ((k === 'escape' || k === 'p') && !e.repeat) togglePause(); });
  addEventListener('keyup', e => s.keys.delete(e.key.toLowerCase()));
  return {
    move() { if (window.__bh?.botMove) return window.__bh.botMove; if (s.id !== null) return [s.x, s.z]; let x = 0, z = 0; for (const k of s.keys) { x += M[k][0]; z += M[k][1]; } const l = Math.hypot(x, z); return l ? [x / l, z / l] : [0, 0]; },
    clear() { s.id = null; s.x = s.z = 0; s.keys.clear(); stick.classList.remove('on'); knob.style.transform = ''; },
  };
})();

// ---------- simulação ----------
function step(dt) {
  G.t += dt;
  // Mago
  const [mx, mz] = input.move(), ml = Math.hypot(mx, mz);
  mage.x += mx * G.mods.speed * dt; mage.z += mz * G.mods.speed * dt;
  if (ml > 0.1) mage.face = Math.atan2(mx, mz);
  mage.moving = ml > 0.1; mage.inv -= dt; mage.hp = Math.min(mage.maxHp, mage.hp + G.mods.regen * dt);
  // inimigos
  director(dt);
  rebuildGrid();
  for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt);
  separate();
  G.enemies = G.enemies.filter(e => !e.dead);
  rebuildGrid();
  // feitiços
  for (const s of G.spells) { const n0 = G.projectiles.length; G.src = s.key; s.update(dt); for (let i = n0; i < G.projectiles.length; i++) G.projectiles[i].src = s.key; }
  G.src = null;
  // projéteis
  for (const p of G.projectiles) {
    G.src = p.src;
    if (p.home && (p.retarget -= dt) <= 0) { p.retarget = 0.15; p.tg = G.nearest(p.x, p.z, 1, 7)[0]; }
    if (p.home && p.tg && !p.tg.dead) { const dx = p.tg.x - p.x, dz = p.tg.z - p.z, l = Math.hypot(dx, dz) || 1, k = Math.min(1, 7 * dt);
      p.vx += (dx / l * p.sp - p.vx) * k; p.vz += (dz / l * p.sp - p.vz) * k; }
    p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt;
    if (p.bounce && G.view) { const v = G.view; if ((p.x < v.x0 && p.vx < 0) || (p.x > v.x1 && p.vx > 0)) p.vx = -p.vx; if ((p.z < v.z0 && p.vz < 0) || (p.z > v.z1 && p.vz > 0)) p.vz = -p.vz; }
    if (p.rehit) { for (const e of G.query(p.x, p.z, p.r)) { if ((p.hit.get(e) || 0) > G.t) continue; p.hit.set(e, G.t + p.rehit); p.onHit(p, e); } continue; }
    if (p.enemy) { if (Math.hypot(p.x - mage.x, p.z - mage.z) < p.r + CFG.mage.radius) { hurtMage(p.dmg); p.life = 0; } continue; }
    for (const e of G.query(p.x, p.z, p.r)) {
      if (p.hit.has(e) || p.life <= 0) continue;
      p.hit.add(e);
      if (p.kind === 'fogo') { p.onHit(p); p.life = 0; break; }
      p.onHit(p, e); if (p.pierce-- <= 0) { p.life = 0; break; }
    }
  }
  G.src = null;
  G.projectiles = G.projectiles.filter(p => p.life > 0);
  // cristais
  const mag = G.mods.magnet;
  for (const g of G.gems) {
    g.t += dt; const dx = mage.x - g.x, dz = mage.z - g.z, d = Math.hypot(dx, dz);
    if (d < mag || g.pull) { g.pull = true; const sp = 4 + g.t * 10; g.x += dx / d * Math.min(d, sp * dt); g.z += dz / d * Math.min(d, sp * dt); }
    if (d < 0.35) { g.done = true;
      if (g.coin) { G.coins++; sfx.coin(); }
      else if (g.heart) { sfx.heart(); mage.hp = Math.min(mage.maxHp, mage.hp + CFG.drops.heal); fxApi.burst(mage.x, mage.z, '#ff5a6a', 10, 2.5); G.numbers.push({ x: mage.x, z: mage.z, v: '+' + CFG.drops.heal, t: 0, label: '#ff7a8a' }); }
      else if (g.chest) { G.slots.push(g.chest); dropGear(g.chest >= 3 ? 2 : 1); }
      else { addXp(g.v); sfx.gem(G.combo); if (G.contract?.kind === 'extracao') progress(1); } }
  }
  G.gems = G.gems.filter(g => !g.done);
  // contrato de sobrevivência e portal de extração
  if (G.contract?.kind === 'sobrevivencia') progress(Math.floor(G.t), true);
  if (!G.portal && G.t >= CFG.extract.at && !G.bossDone) openPortal();
  if (G.portal) { const X = CFG.extract, inside = Math.hypot(G.portal.x - mage.x, G.portal.z - mage.z) < X.radius;
    G.portal.prog = Math.max(0, Math.min(1, G.portal.prog + (inside ? dt / X.charge : -dt * 0.5)));
    if (G.portal.prog >= 1) { fxApi.ring(G.portal.x, G.portal.z, 3, '#5ff2ff', 0.6, true); finish('extract'); return; } }
  // santuários e bênçãos
  const SH = CFG.shrines;
  for (const s of G.shrines) { if (s.used) continue;
    const inside = Math.hypot(s.x - mage.x, s.z - mage.z) < SH.radius;
    s.prog = Math.max(0, Math.min(1, s.prog + (inside ? dt / SH.charge : -dt * SH.decay)));
    if (s.prog >= 1) { s.used = true; G.usedShrines.add(s.id); bless(s.type, s); } }
  let ended = false;
  for (const k in G.buffs) if (G.buffs[k] > 0 && (G.buffs[k] -= dt) <= 0) { G.buffs[k] = 0; ended = true; }
  if (ended) recalc();
  // explosões de corrompidos (fora da recursão do dano)
  const bl = G.blasts.splice(0, 20);
  for (const b of bl) { fxApi.ring(b.x, b.z, ST.corruptR, '#c58bff', 0.3, true); fxApi.burst(b.x, b.z, '#d78bff', 6, 3); for (const e of G.query(b.x, b.z, ST.corruptR)) G.damage(e, b.dmg, { noProc: true, silent: true, color: '#e0b8ff' }); }
  if (bl.length) combo('corrupcao');
  // combo
  if ((G.comboT -= dt) <= 0) G.combo = 0;
  // efeitos
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter(f => f.t < f.dur); Object.assign(G.fx, fxApi);
  for (const p of G.particles) { p.t += dt; p.vy -= 12 * dt; p.x += p.vx * dt; p.y = Math.max(0.03, p.y + p.vy * dt); p.z += p.vz * dt; }
  G.particles = G.particles.filter(p => p.t < p.dur);
  for (const d of G.debris) { d.t += dt; d.vy -= 14 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.rx += d.vx * dt * 3; d.ry += d.vz * dt * 3;
    if (d.y < d.s / 2) { d.y = d.s / 2; d.vy = -d.vy * 0.35; d.vx *= 0.6; d.vz *= 0.6; } }
  G.debris = G.debris.filter(d => d.t < d.dur);
  for (const n of G.numbers) n.t += dt;
  G.numbers = G.numbers.filter(n => n.t < 0.7);
  if (G.numbers.length > 18) G.numbers.splice(0, G.numbers.length - 18);
  if (G.slots.length && G.mode === 'play') openSlot(G.slots.shift());
  else if (G.queue > 0 && G.mode === 'play') openLevelUp();
}

// ---------- desenho ----------
const tmpV = new T.Vector3();
const SC = { none: [1, 1, 1], gelo: [1.1, 1.9, 3.2], fogo: [2.4, 1.0, 0.5], raio: [2.2, 2.2, 0.7], arcano: [1.7, 0.7, 2.3], luz: [2.0, 1.9, 1.4], agua: [0.8, 1.2, 1.9] };
// coração em pixel art (5×5), virado para a câmera
const HEART = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
function draw(now) {
  const t = now / 1000;
  // câmera segue o Mago
  const f = 1 - Math.exp(-CFG.cam.follow * 0.016);
  camAt.x += (mage.x - camAt.x) * f; camAt.z += (mage.z - camAt.z) * f;
  cam.position.copy(camAt).add(camOff); cam.lookAt(camAt);
  if (G.shakeT > 0) { G.shakeT = Math.max(0, G.shakeT - 0.016); const k = G.shakeT * 0.6; cam.position.x += (Math.random() - 0.5) * k; cam.position.z += (Math.random() - 0.5) * k; }
  world.update(camAt.x, camAt.z, viewW, viewH);
  // atmosfera: a luz puxa para a cor da zona e escurece aos poucos até o Guardião
  const zk = zoneAt(mage.x, mage.z), dk = Math.min(1, G.t / CFG.runTime);
  if (!G.atmo || G.atmo.k !== zk) G.atmo = { k: zk, sky: new T.Color('#ffffff').lerp(new T.Color(ZONES[zk].crack), 0.35) };
  hemi.color.lerp(G.atmo.sky, 0.02); hemi.intensity = 1.5 - 0.45 * dk; sun.intensity = 2.0 - 0.8 * dk;
  document.body.style.setProperty('--dusk', (0.35 + 0.35 * dk).toFixed(3));
  const hz = viewH / 2 / Math.sin(Math.atan2(camOff.y, camOff.z)) - 0.6;
  G.view = { x0: camAt.x - viewW / 2 + 0.4, x1: camAt.x + viewW / 2 - 0.4, z0: camAt.z - hz, z1: camAt.z + hz - 0.6 };
  // Mago
  mageRoot.position.set(mage.x, 0, mage.z); mageRoot.rotation.y = mage.face;
  mageBody.position.y = mage.moving ? Math.abs(Math.sin(t * 11)) * 0.06 : Math.sin(t * 2) * 0.02;
  mageRoot.visible = !(mage.inv > 0 && Math.floor(t * 20) % 2);
  // inimigos (por tipo, desenho em lote)
  for (const b of Object.values(batches)) b.begin();
  for (const e of G.enemies) {
    const b = batches[e.type], y = e.cfg.float ? 0.15 + Math.sin(t * 3 + e.ph) * 0.06 : Math.abs(Math.sin(t * 9 + e.ph)) * 0.04;
    const sq = e.state === 'wind' ? 0.75 : e.flash > 0 ? 0.78 : 1, c = e.freezeT > 0 ? SC.gelo : e.burnT > 0 ? SC.fogo : e.shockT > 0 ? SC.raio : e.corruptT > 0 ? SC.arcano : e.exposeT > 0 ? SC.luz : e.soakT > 0 ? SC.agua : SC.none;
    b.add(e.x, y, e.z, e.face, e.elite ? e.elite.scale : 1, e.flash > 0 || e.state === 'wind' && Math.floor(t * 16) % 2 ? 1 : 0, sq, 1, c);
  }
  for (const b of Object.values(batches)) b.end();
  let ns = 0;
  for (const e of G.enemies) { if (ns >= 450) break; const s = e.r * 2.6 * (e.elite ? e.elite.scale * 0.8 : 1); _sm.makeScale(s, 1, s * 0.8).setPosition(e.x, 0.02, e.z); shadowMesh.setMatrixAt(ns++, _sm); }
  shadowMesh.count = ns; shadowMesh.instanceMatrix.needsUpdate = true;
  // cristais e moedas
  gemsPool.begin();
  for (const g of G.gems) {
    const bob = 0.3 + Math.sin(t * 4 + g.x) * 0.05;
    if (g.heart) { const s = 0.075; HEART.forEach((row, r) => [...row].forEach((ch, i) => { if (ch !== 'X') return; const yy = bob + (2 - r) * s * 0.67, zz = g.z - (2 - r) * s * 0.74; gemsPool.add(g.x + (i - 2) * s, yy, zz, s, s, s, r === 1 && i === 1 ? '#ffd0d6' : '#ff2a4a', -0.84, 0, 0); })); continue; }
    if (g.chest) { gemsPool.add(g.x, 0.2, g.z, 0.42, 0.3, 0.3, '#8a5a2a'); gemsPool.add(g.x, 0.37, g.z, 0.44, 0.06, 0.32, '#ffc96b'); gemsPool.add(g.x, 0.3, g.z + 0.16, 0.08, 0.1, 0.02, '#fff2a8'); continue; }
    const c = g.coin ? '#ffd34d' : g.v >= 30 ? '#ffb84d' : g.v >= 10 ? '#c58bff' : g.v >= 4 ? '#ff5fd2' : g.v >= 2 ? '#5fb8ff' : '#5dff9a', s = g.coin ? 0.16 : g.v >= 30 ? 0.24 : g.v >= 10 ? 0.2 : g.v >= 4 ? 0.17 : g.v >= 2 ? 0.14 : 0.12; gemsPool.add(g.x, 0.22 + Math.sin(t * 4 + g.x) * 0.04, g.z, s, s * 1.3, s, c, 0, t * 2, 0.6); }
  gemsPool.end();
  // projéteis e efeitos (camada em resolução normal)
  glow.begin(cam); fxCubes.begin();
  glow.add(mage.x, 0.05, mage.z, 1.0, '#5ff2ff', 0.3);
  drawAmbient(glow, camAt.x, camAt.z, viewW, viewH, zk, t);   // partículas de ambiente da zona   // aura fraca: o Mago não some em zonas roxas
  for (const p of G.projectiles) {
    if (p.kind === 'fogo') { if (p.big) glow.add(p.x, 0.45, p.z, 2.0, '#ff2a10', 0.7); glow.add(p.x, 0.45, p.z, 1.2, '#ff5a10', 0.9); glow.add(p.x, 0.45, p.z, 0.5, '#fff2a8', 1); glow.add(p.x - p.vx * 0.03, 0.45, p.z - p.vz * 0.03, 0.7, '#ff8a3d', 0.5); }
    else if (p.kind === 'vento') { const a = Math.atan2(p.vx, p.vz) + Math.PI / 2; fxCubes.add(p.x, 0.4, p.z, 0.6, 0.04, 0.1, '#ffffff', 0, a, 0); glow.add(p.x, 0.4, p.z, 0.8, '#7fe8ff', 0.6); glow.add(p.x - p.vx * 0.03, 0.4, p.z - p.vz * 0.03, 0.5, '#bff4ff', 0.4); }
    else if (p.kind === 'orbe') { const s = p.child ? 0.6 : 1; glow.add(p.x, 0.5, p.z, 0.8 * s, '#b04dff', 0.85); glow.add(p.x, 0.5, p.z, 0.28 * s, '#ffffff', 1); glow.add(p.x - p.vx * 0.04, 0.5, p.z - p.vz * 0.04, 0.5 * s, '#e0a8ff', 0.45); }
    else if (p.kind === 'runa') { const s = p.big ? 1.3 : 1; fxCubes.add(p.x, 0.5, p.z, 0.5 * s, 0.08, 0.5 * s, '#e8feff', 0, t * 14, 0); glow.add(p.x, 0.5, p.z, 1.2 * s, '#2fd8ff', 0.75); glow.add(p.x - p.vx * 0.05, 0.5, p.z - p.vz * 0.05, 0.8 * s, '#7ff0ff', 0.4); }
    else { glow.add(p.x, 0.45, p.z, 0.75, '#ff2fb0', 0.9); glow.add(p.x, 0.45, p.z, 0.3, '#ffd6f2', 1); }
  }
  for (const sp of G.spells) sp.render(fxApi2, t);
  for (const fx of G.fx) {
    const p = fx.t / fx.dur, k = 1 - p;
    if (fx.k === 'ring') { const n = Math.round(24 + fx.r * 10), r = fx.r * (fx.fill ? 0.25 + 0.75 * p : 1); if (fx.fill) glow.add(fx.x, 0.1, fx.z, r * 2.2, fx.color, 0.35 * k); for (let i = 0; i < n; i++) { const a = i / n * 6.283; glow.add(fx.x + Math.sin(a) * r, 0.2, fx.z + Math.cos(a) * r, 0.55 * k + 0.15, fx.color, 0.9 * k); } }
    if (fx.k === 'bolt') { const n = 14; let px = fx.x1, pz = fx.z1; for (let i = 0; i <= n; i++) { const q = i / n, j = i && i < n ? (hash(i, fx.seed) - 0.5) * 0.5 : 0, x = fx.x1 + (fx.x2 - fx.x1) * q + j, z = fx.z1 + (fx.z2 - fx.z1) * q + j; glow.add(x, 0.55, z, 0.55, fx.color, k); glow.add(x, 0.55, z, 0.2, '#ffffff', k); px = x; pz = z; } }
    if (fx.k === 'sky') { for (let i = 0; i < 16; i++) { const y = i * 0.6, j = (hash(i, fx.seed) - 0.5) * 0.35; glow.add(fx.x + j, y, fx.z + j * 0.5, 0.6, '#fff27a', k); glow.add(fx.x + j, y, fx.z + j * 0.5, 0.22, '#ffffff', k); } glow.add(fx.x, 0.1, fx.z, 2.2, '#fff27a', 0.7 * k); }
    if (fx.k === 'spikes') for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + fx.seed, rr = fx.r * 0.55 * hash(i, fx.seed), h = Math.sin(Math.min(1, p * 2.5) * Math.PI) * 0.8; fxCubes.add(fx.x + Math.sin(a) * rr, h / 2, fx.z + Math.cos(a) * rr, 0.16, h + 0.01, 0.16, i % 2 ? '#c9a36b' : '#8a6a44', 0, a, 0); glow.add(fx.x + Math.sin(a) * rr, 0.1, fx.z + Math.cos(a) * rr, 0.5, '#ffcf8a', 0.4 * k); }
    if (fx.k === 'cloud') for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + fx.seed, rr = fx.r * p * (0.5 + 0.5 * hash(i, fx.seed)); glow.add(fx.x + Math.sin(a) * rr, 0.3 + hash(i + 3, fx.seed) * 0.6, fx.z + Math.cos(a) * rr, 1.2 * k + 0.3, '#ffe6cc', 0.7 * k); }
  }
  shrineBatch.begin();
  for (const s of G.shrines) {
    const b = CFG.shrines.buffs[s.type], R = CFG.shrines.radius;
    shrineBatch.add(s.x, 0, s.z, 0, 1, 0, 1, s.used ? 0.5 : 1);
    if (s.used) continue;
    const bob = 1.9 + Math.sin(t * 2 + s.x) * 0.1;
    fxCubes.add(s.x, bob, s.z, 0.26, 0.4, 0.26, b.color, 0, t * 1.5, 0.6);
    glow.add(s.x, bob, s.z, 1.6, b.glow, 0.8); glow.add(s.x, 0.1, s.z, R * 2.2, b.glow, 0.12 + s.prog * 0.3);
    const n = 40; for (let i = 0; i < n; i++) { const a = i / n * 6.283 - Math.PI, lit = i / n < s.prog;
      glow.add(s.x + Math.sin(a) * R, 0.12, s.z - Math.cos(a) * R, lit ? 0.55 : 0.3, lit ? b.color : b.glow, lit ? 1 : 0.35); }
  }
  shrineBatch.end();
  if (G.portal) { const P = G.portal, R = CFG.extract.radius;
    glow.add(P.x, 0.1, P.z, R * 2.6, '#2fd8ff', 0.3 + 0.1 * Math.sin(t * 3)); glow.add(P.x, 1.2, P.z, 1.4, '#e8feff', 0.7);
    for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283 + t * 1.2, lit = i / 36 < P.prog, rr = R * (0.85 + 0.15 * Math.sin(t * 4 + i));
      glow.add(P.x + Math.sin(a) * rr, 0.15 + (i % 3) * 0.35 + Math.sin(t * 2 + i) * 0.2, P.z + Math.cos(a) * rr, lit ? 0.6 : 0.35, lit ? '#ffffff' : '#5ff2ff', lit ? 1 : 0.6); }
    // seta na borda da tela apontando o portal quando ele está fora de vista
    const dx = P.x - camAt.x, dz = P.z - camAt.z;
    if (Math.abs(dx) > viewW / 2 - 0.5 || Math.abs(dz) > viewH * 0.45) { const l = Math.hypot(dx, dz), k = Math.min((viewW / 2 - 0.8) / Math.abs(dx / l || 1e-3), (viewH * 0.4) / Math.abs(dz / l || 1e-3));
      glow.add(camAt.x + dx / l * k, 0.5, camAt.z + dz / l * k, 0.9, '#5ff2ff', 0.6 + 0.4 * Math.sin(t * 8)); } }
  let sg = 0;
  if (G.boss) { const e = G.boss, R = e.r + 0.9, n = 40, col = e.cfg.boss === 'final' ? '#c58bff' : '#ff8a3d';
    glow.add(e.x, 0.1, e.z, R * 2.6, col, 0.25 + 0.08 * Math.sin(t * 4));
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + t * 0.8; glow.add(e.x + Math.sin(a) * R, 0.15, e.z + Math.cos(a) * R, 0.5, col, 0.75); }
    for (let i = 0; i < 6; i++) { const a = -t * 1.6 + i * 1.047; glow.add(e.x + Math.sin(a) * R * 0.7, 0.2, e.z + Math.cos(a) * R * 0.7, 0.4, '#ffffff', 0.6); } }
  for (const e of G.enemies) if (e.reels) { glow.add(e.x, 0.2, e.z, 3.2, '#ffb020', 0.35 + 0.1 * Math.sin(t * 5)); glow.add(e.x, 1.6, e.z, 0.6, '#fff2a8', 0.8); }
  for (const e of G.enemies) { if (sg > 160) break;
    if (e.burnT > 0) { sg++; glow.add(e.x, 0.75 + Math.sin(t * 20 + e.ph) * 0.06, e.z, 0.45, '#ff6a1a', 0.7); }
    else if (e.freezeT > 0) { sg++; glow.add(e.x, 0.4, e.z, 0.9, '#9fdcff', 0.45); }
    else if (e.shockT > 0 && Math.floor(t * 12 + e.ph) % 3 === 0) { sg++; glow.add(e.x + Math.sin(t * 40) * 0.15, 0.6, e.z, 0.35, '#fff27a', 0.9); }
    else if (e.corruptT > 0) { sg++; glow.add(e.x, 0.15, e.z, 0.7, '#8a2aff', 0.4); } }
  for (const q of G.particles) { const k = 1 - q.t / q.dur; glow.add(q.x, q.y, q.z, q.size * 3.2, q.color, k); }
  glow.end(); fxCubes.end();
  debrisPool.begin();
  for (const d of G.debris) { const k = Math.min(1, (d.dur - d.t) / 0.35), sz = d.s * k; debrisPool.add(d.x, d.y, d.z, sz, sz, sz, d.c, d.rx, d.ry, 0); }
  debrisPool.end();
  // manchas no chão
  splatPool.begin();
  for (const s of G.splats) splatPool.add(s.x, 0.012, s.z, s.s, 1, s.s * 0.8, s.c, 0, s.ry, 0);
  splatPool.end();
  renderer.render(scene, cam);
  fxRenderer.render(fxScene, cam);
  drawNumbers();
  hud();
}
// números de dano no mesmo tamanho de pixel do jogo
function drawNumbers() {
  ctx.clearRect(0, 0, pxW, pxH);
  ctx.font = '6px Silkscreen, monospace'; ctx.textAlign = 'center';
  for (const n of G.numbers) {
    tmpV.set(n.x, 0.9 + n.t * 1.2, n.z).project(cam);
    const x = Math.round((tmpV.x * 0.5 + 0.5) * pxW), y = Math.round((-tmpV.y * 0.5 + 0.5) * pxH);
    ctx.globalAlpha = 1 - Math.max(0, n.t - 0.45) / 0.25;
    ctx.font = n.big && !n.label ? '9px Silkscreen, monospace' : '6px Silkscreen, monospace';
    ctx.fillStyle = '#07060c'; ctx.fillText(n.v, x + 1, y + 1);
    ctx.fillStyle = n.label || (n.crit ? '#ff7a3d' : n.big ? '#ffe066' : '#f2f4f8'); ctx.fillText(n.v, x, y);
  }
  ctx.globalAlpha = 1;
  // vida do Mago numa barrinha acima da cabeça
  if (G.mode !== 'start') {
    tmpV.set(mage.x, 0, mage.z).project(cam);
    const x = Math.round((tmpV.x * 0.5 + 0.5) * pxW) - 11, y = Math.round((-tmpV.y * 0.5 + 0.5) * pxH) + 4, f = Math.max(0, mage.hp / mage.maxHp);
    ctx.fillStyle = '#07060c'; ctx.fillRect(x - 1, y - 1, 24, 5);
    ctx.fillStyle = '#3a1020'; ctx.fillRect(x, y, 22, 3);
    ctx.fillStyle = f > 0.5 ? '#5dff9a' : f > 0.25 ? '#ffc94d' : '#ff4a5a'; ctx.fillRect(x, y, Math.round(22 * f), 3);
  }
}

// ---------- HUD ----------
function hud() {
  $('xpfill').style.width = Math.min(100, G.xp / CFG.xpFor(G.level) * 100) + '%';
  $('lvl').textContent = 'NV ' + G.level; $('coins').textContent = G.coins;
  $('time').textContent = fmtTime(Math.min(G.t, CFG.runTime));
  $('kills').textContent = G.kills.toLocaleString('pt-BR');
  $('hpfill').style.width = Math.max(0, mage.hp / mage.maxHp * 100) + '%';
  const cb = $('combo'); cb.hidden = G.combo < 5; cb.querySelector('b').textContent = 'x' + G.combo;
  const C = G.contract, ch = $('contract-hud');
  if (C) { ch.hidden = false; ch.classList.toggle('done', !!C.done); ch.style.setProperty('--c', CONTRACT_KINDS[C.kind].color);
    ch.textContent = (G.loot.length ? `🎒${G.loot.length}  ` : '') + `${CONTRACT_KINDS[C.kind].glyph} ${C.done ? 'CUMPRIDO' : `${C.kind === 'sobrevivencia' ? fmtTime(C.prog) + ' / ' + fmtTime(C.goal) : C.prog.toLocaleString('pt-BR') + ' / ' + C.goal.toLocaleString('pt-BR')}`}`; } else ch.hidden = true;
  if (G.boss) $('bossfill').style.width = Math.max(0, G.boss.hp / G.boss.maxHp * 100) + '%';
  const bl = Object.entries(G.buffs).filter(([, v]) => v > 0);
  $('buffs').innerHTML = bl.map(([k, v]) => `<i style="--c:${CFG.shrines.buffs[k].color}">${CFG.shrines.buffs[k].name} <b>${Math.ceil(v)}s</b></i>`).join('');
  if (settings.fps) $('fps').textContent = `${fps} fps · ${G.enemies.length} inimigos · ${renderer.info.render.calls} draws`;
}
function renderLoadout() {
  $('loadout').innerHTML = G.spells.map(s => `<i style="--c:${s.meta.color}">${s.meta.glyph}<sub>${s.fusion || s.evo ? '★' : s.level}</sub></i>`).join('')
    + Object.entries(G.passives).map(([k, l]) => `<i class="p" style="--c:${CFG.passives[k].color}">${CFG.passives[k].glyph}<sub>${l}</sub></i>`).join('');
}
let bannerTimer = 0;
function banner(title, sub, color) {
  const b = $('banner'); b.querySelector('b').textContent = title; b.querySelector('small').textContent = sub; b.style.setProperty('--c', color);
  b.hidden = false; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { b.hidden = true; }, 2200);
}
function showBoss(name) { $('bossname').textContent = name; $('bossbar').hidden = false; }

// ---------- fluxo ----------
const settings = { fps: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem('fendas_settings_v1')) || {}); } catch { /* sem storage */ }
function start(run) {
  if (run && run.rift) G.run = run;
  setRift(G.run?.R.zone || null);
  G.meta = metaMods(); G.gear = gearMods();
  world.reset();
  Object.assign(G, { mode: 'play', t: 0, enemies: [], projectiles: [], gems: [], fx: Object.assign([], fxApi), particles: [], debris: [], splats: [], numbers: [],
    spells: [], passives: {}, blasts: [], found: new Set(), dmgBy: {}, shrines: [], buffs: {}, usedShrines: new Set(), broken: new Set(), slots: [], nextChamp: 0, banned: new Set(), rerolls: CFG.mage.rerolls + G.meta.rerolls, bans: CFG.mage.bans + G.meta.bans, chests: 0, revives: G.meta.revive, evolutions: 0, opened: 0, xp: 0, level: 1, kills: 0, coins: 0, combo: 0, comboT: 0, bestCombo: 0, spawnAcc: 0, nextEvent: 0, event: null, boss: null,
    miniDone: false, bossDone: false, bossSpawned: false, queue: 0, portal: null, atmo: null,
    loot: [], contract: G.run ? { ...G.run.contract, prog: 0, done: false } : null });
  Object.assign(mage, { x: 0, z: 0, face: Math.PI, inv: 0 });
  recalc(); mage.hp = mage.maxHp;
  G.spells.push(new Spell('fogo', G));   // o Mago começa com Bola de fogo
  renderLoadout();
  for (const id of ['startscreen', 'result', 'levelup', 'pause', 'slot']) $(id).hidden = true;
  $('bossbar').hidden = true; input.clear();
}
function finish(won) {
  if (G.mode === 'over') return;
  const extracted = won === 'extract'; won = won === true;
  G.mode = 'over'; input.clear();
  $('res-title').textContent = extracted ? 'EXTRAÍDO' : won ? 'FENDA ESTABILIZADA' : 'DERROTADO';
  $('res-title').className = won || extracted ? 'won' : '';
  // pagamento: só sai da Fenda com o contrato quem extrai ou vence; morrer perde parte do saque
  const C = G.contract, R = G.run, safe = won || extracted, paid = C && C.done && safe ? Math.round(C.pay * (1 + (R?.risk.bonus || 0))) : 0;
  $('res-stats').innerHTML = [['TEMPO', fmtTime(G.t)], ['NÍVEL', G.level], ['ABATES', G.kills.toLocaleString('pt-BR')], ['MAIOR COMBO', 'x' + G.bestCombo]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('res-build').innerHTML = $('loadout').innerHTML;
  const st = settleRaid(safe, G.loot);
  const gold = endRun({ won, mult: (R?.R.gold || 1) * (1 + (G.gear.gold || 0)) , pay: paid, lost: !safe && R ? CFG.extract.deathLoss : 0, time: G.t, level: G.level, kills: G.kills, coins: G.coins, evolutions: G.evolutions, chests: G.opened, combos: [...G.found], spells: G.spells.map(s => s.key) });
  if (!won) sfx.over();
  const tot = Object.values(G.dmgBy).reduce((a, b) => a + b, 0) || 1, rows = Object.entries(G.dmgBy).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $('res-dmg').innerHTML = rows.map(([k, v]) => { const m = G.spells.find(s => s.key === k)?.meta || CFG.spells[k] || CFG.fusions[k] || { glyph: '·', color: '#9a92c0', name: 'Queimadura e explosões' };
    return `<div style="--c:${m.color}"><i>${m.glyph}</i><div class="bar"><b style="width:${v / rows[0][1] * 100}%"></b></div><span>${Math.round(v / tot * 100)}%</span></div>`; }).join('');
  const rc = $('res-contract'); rc.hidden = !C;
  if (C) rc.textContent = C.done ? (safe ? `Contrato cumprido: +${paid} de ouro` : 'Contrato cumprido, mas você não saiu da Fenda: pagamento perdido e metade do saque') : `Contrato não cumprido (${fill(C, C.goal)})${safe ? '' : ' · metade do saque perdida'}`;
  const rg = $('res-gear'), grows = [...st.kept.map(it => [it, 'NO COFRE']), ...st.broken.map(it => [it, 'QUEBROU']), ...st.lost.map(it => [it, 'PERDIDO'])];
  const lostLoot = !safe && G.loot.length ? `<p class="lost">${G.loot.length} ${G.loot.length > 1 ? 'itens' : 'item'} da mochila ${G.loot.length > 1 ? 'ficaram' : 'ficou'} na Fenda</p>` : '';
  rg.hidden = !grows.length && !lostLoot;
  rg.innerHTML = lostLoot + grows.map(([it, tag]) => `<div class="gitem" style="--c:${RARITIES[it.rarity].color}"><span class="ico">${tag === 'NO COFRE' ? '✓' : '✕'}</span><span class="txt"><b>${esc(itemName(it))}</b><em>${RARITIES[it.rarity].name} · ${tag}</em></span></div>`).join('')
    + (st.sold ? `<p class="sub">Cofre cheio: itens vendidos por ${st.sold} de ouro</p>` : '');
  const ng = nextGoal(); $('res-next').hidden = !ng; $('res-next').textContent = ng;
  $('res-gold').querySelector('b').textContent = '+' + gold.toLocaleString('pt-BR') + ' de ouro';
  setTimeout(() => { $('result').hidden = false; }, won ? 400 : 700);
}
function togglePause() {
  if (G.mode === 'play') { G.mode = 'paused'; input.clear(); $('pause').hidden = false; $('fps-toggle').textContent = 'MOSTRAR FPS: ' + (settings.fps ? 'SIM' : 'NÃO'); }
  else if (G.mode === 'paused') { G.mode = 'play'; $('pause').hidden = true; }
}
$('snd-toggle').onclick = () => { $('snd-toggle').textContent = 'SOM: ' + (sfx.toggle() ? 'SIM' : 'NÃO'); };
$('snd-toggle').textContent = 'SOM: ' + (sfx.on ? 'SIM' : 'NÃO');
$('btn-reroll').onclick = () => { if (G.rerolls > 0 && G.mode === 'levelup') { G.rerolls--; openLevelUp(); } };
$('btn-ban').onclick = () => { if (G.bans <= 0) return; G.banning = !G.banning; $('choices').classList.toggle('banning', G.banning); $('ban-hint').hidden = !G.banning; $('btn-ban').classList.toggle('on', G.banning); };
onMenu(refreshHub); initMenu(openRiftMap); $('btn-gear').onclick = openGear; $('hub-rift').onclick = () => openRiftMap(M.lastRift); initRun(start); $('btn-again').onclick = () => start(); $('btn-menu').onclick = showMenu; $('btn-pause').onclick = togglePause; $('btn-resume').onclick = togglePause;
$('btn-quit').onclick = () => { $('pause').hidden = true; finish(false); };
$('fps-toggle').onclick = () => { settings.fps = !settings.fps; $('fps').hidden = !settings.fps; try { localStorage.setItem('fendas_settings_v1', JSON.stringify(settings)); } catch { /* ignorar */ } $('fps-toggle').textContent = 'MOSTRAR FPS: ' + (settings.fps ? 'SIM' : 'NÃO'); };
addEventListener('blur', () => { if (G.mode === 'play') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') togglePause(); });

// ---------- laço ----------
let last = performance.now(), acc = 0, frames = 0, fpsT = 0, fps = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (G.mode === 'play') {
    acc += dt * (window.__bh?.speed || 1); let n = 0;
    while (acc >= CFG.sim.dt && n++ < CFG.sim.maxSteps * (window.__bh?.speed || 1)) { step(CFG.sim.dt); acc -= CFG.sim.dt; if (G.mode !== 'play') break; }
    if (acc > CFG.sim.dt * 4) acc = 0;
  }
  draw(now);
  frames++; fpsT += dt; if (fpsT >= 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
}
$('fps').hidden = !settings.fps;
resize(); recalc();
requestAnimationFrame(frame);
window.__bh = { G, CFG, start, spawn, Spell, speed: 1, choose, options };
