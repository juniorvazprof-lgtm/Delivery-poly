// Fendas · protótipo bullet heaven vertical (voxel pixelado).
// O Mago lança feitiços sozinho; o jogador só se move. Simulação em passo fixo, separada da renderização.
import * as T from '../lib/three.js';
import { buildModel, blobShadow, hash } from '../engine/voxel.js';
import { MODELS } from '../data/models.js';
import { CFG } from './config.js';
import { ModelBatch, CubePool, GlowPool } from './instanced.js';
import { World, MAGE } from './world.js';
import { Spell, nextDesc } from './spells.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- renderização pixelada ----------
const canvas = $('view'), over = $('over'), ctx = over.getContext('2d');
const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
const scene = new T.Scene(); scene.background = new T.Color('#07060c');
scene.add(new T.HemisphereLight('#c9b8ff', '#1a1028', 1.5));
const sun = new T.DirectionalLight('#ffe8d0', 2.0); sun.position.set(-5, 10, 4); scene.add(sun);
// efeitos dos poderes: segunda camada em resolução normal (sem pixelar), com brilho aditivo
const fxCanvas = $('fx'), fxRenderer = new T.WebGLRenderer({ canvas: fxCanvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
fxRenderer.setPixelRatio(Math.min(devicePixelRatio, 2)); fxRenderer.setClearColor(0x000000, 0);
const fxScene = new T.Scene();
const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100), camOff = new T.Vector3(...CFG.cam.offset), camAt = new T.Vector3();
let viewW = 8, viewH = CFG.cam.viewH, pxW = 1, pxH = 1;
function resize() {
  const w = innerWidth, h = innerHeight, k = Math.max(1, Math.round(h / CFG.pixel.targetH));
  pxW = Math.ceil(w / k); pxH = Math.ceil(h / k);
  renderer.setSize(pxW, pxH, false); over.width = pxW; over.height = pxH; fxRenderer.setSize(w, h, false);
  viewW = viewH * w / h;
  Object.assign(cam, { left: -viewW / 2, right: viewW / 2, top: viewH / 2, bottom: -viewH / 2 }); cam.updateProjectionMatrix();
  document.body.classList.toggle('landscape', w > h * 1.1);
}
addEventListener('resize', resize);

// ---------- recursos de desenho ----------
const world = new World(scene);
const batches = {};
for (const [k, e] of Object.entries(CFG.enemies)) batches[k] = new ModelBatch(scene, MODELS[e.model], e.scale, e.boss ? 2 : 420, e.tint);
const gemsPool = new CubePool(scene, 520), fxCubes = new CubePool(fxScene, 400), glow = new GlowPool(fxScene, 2600);
const fxApi2 = { glow: (...a) => glow.add(...a), cube: (...a) => fxCubes.add(...a) };
const splatPool = new CubePool(scene, 320, { opacity: 0.32, depthWrite: false, size: [1, 0.02, 1] });
const mageRoot = new T.Group(), mageBody = buildModel({ ...MAGE, scale: 1.05 });
mageRoot.add(mageBody, blobShadow(0.32)); scene.add(mageRoot);

// ---------- estado ----------
const G = {
  mode: 'start', t: 0, enemies: [], projectiles: [], gems: [], fx: [], particles: [], splats: [], numbers: [],
  spells: [], passives: {}, mods: {}, xp: 0, level: 1, kills: 0, coins: 0, combo: 0, comboT: 0, bestCombo: 0,
  spawnAcc: 0, nextEvent: 0, event: null, eventT: 0, boss: null, miniDone: false, bossDone: false, queue: 0,
};
const mage = G.mage = { x: 0, z: 0, face: Math.PI, hp: 100, maxHp: 100, inv: 0, mx: 0, mz: 0 };

function recalc() {
  const p = k => G.passives[k] || 0, P = CFG.passives;
  G.mods = { dmg: 1 + P.poder.per * p('poder'), cd: Math.max(0.5, 1 - P.pressa.per * p('pressa')), area: 1 + P.alcance.per * p('alcance'),
    magnet: CFG.mage.magnet * (1 + P.ima.per * p('ima')), regen: P.vigor.regen * p('vigor'), speed: CFG.mage.speed * (1 + P.passo.per * p('passo')) };
  const old = mage.maxHp; mage.maxHp = CFG.mage.hp + P.vigor.hp * p('vigor'); mage.hp += Math.max(0, mage.maxHp - old);
}

// ---------- grade espacial (vizinhos, alvos) ----------
const CELL = 2, grid = new Map();
const key = (i, j) => i * 100003 + j;
function rebuildGrid() {
  grid.clear();
  for (const e of G.enemies) { if (e.dead) continue; const k = key(Math.floor(e.x / CELL), Math.floor(e.z / CELL)); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e); }
}
G.query = (x, z, r) => {
  const out = [], i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = grid.get(key(i, j)); if (!a) continue;
    for (const e of a) if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.r) out.push(e); }
  return out;
};
G.nearest = (x, z, n, maxR) => G.query(x, z, maxR).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z)).slice(0, n);

// ---------- efeitos ----------
G.fx = [];
const fxApi = {
  ring: (x, z, r, color, dur, fill) => G.fx.push({ k: 'ring', x, z, r, color, dur, t: 0, fill }),
  bolt: (x1, z1, x2, z2, color) => G.fx.push({ k: 'bolt', x1, z1, x2, z2, color, dur: 0.14, t: 0, seed: Math.random() * 99 }),
  spikes: (x, z, r) => G.fx.push({ k: 'spikes', x, z, r, dur: 0.5, t: 0, seed: Math.random() * 99 }),
  cloud: (x, z, r) => G.fx.push({ k: 'cloud', x, z, r, dur: 0.45, t: 0, seed: Math.random() * 99 }),
  sky: (x, z) => G.fx.push({ k: 'sky', x, z, dur: 0.22, t: 0, seed: Math.random() * 99 }),
  burst: (x, z, color, n = 8, sp = 3) => { for (let i = 0; i < n && G.particles.length < 800; i++) { const a = Math.random() * 6.3, s = sp * rand(0.4, 1); G.particles.push({ x, y: 0.4, z, vx: Math.cos(a) * s, vy: rand(1.5, 4), vz: Math.sin(a) * s, t: 0, dur: rand(0.3, 0.55), color, size: rand(0.07, 0.13) }); } },
};
G.shake = k => { G.shakeT = Math.max(G.shakeT || 0, k); };
G.scorch = (x, z, r) => { G.splats.push({ x, z, s: r * 1.6, ry: Math.random() * 6, t: 0, c: '#120a08' }); };
Object.assign(G.fx, fxApi); G.fx.ring = fxApi.ring; G.fx.bolt = fxApi.bolt; G.fx.spikes = fxApi.spikes; G.fx.cloud = fxApi.cloud; G.fx.burst = fxApi.burst;

// ---------- dano ----------
G.damage = (e, dmg, o = {}) => {
  if (e.dead) return;
  if (dmg > 0) {
    e.hp -= dmg; e.flash = 0.07;
    // números de dano: só alguns, para não virar uma nuvem ilegível (golpes fortes sempre aparecem)
    const big = dmg >= 30, crowd = G.numbers.length;
    if (big || (!o.quiet && crowd < 18 && Math.random() < 0.6) || (crowd < 8 && Math.random() < 0.25)) G.numbers.push({ x: e.x + rand(-0.15, 0.15), z: e.z, v: Math.round(dmg), t: 0, big });
  }
  if (o.push && !e.cfg.boss) { const f = o.from || mage, dx = e.x - f.x, dz = e.z - f.z, l = Math.hypot(dx, dz) || 1, p = o.push * (e.cfg.heavy ? 0.35 : 1); e.kx += dx / l * p; e.kz += dz / l * p; }
  if (o.soak) e.soakT = Math.max(e.soakT, o.soak);
  if (o.burn) e.burnT = Math.max(e.burnT, o.burn);
  if (o.stun && !e.cfg.boss) e.stunT = Math.max(e.stunT, o.stun);
  if (e.hp <= 0) kill(e);
};
function kill(e) {
  e.dead = true; G.kills++;
  G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = CFG.combo.window; G.bestCombo = Math.max(G.bestCombo, G.combo);
  const v = (e.elite ? CFG.elite.xp : e.cfg.xp) * (G.event?.kind === 'surto' ? 2 : 1);
  if (v) dropGem(e.x, e.z, v);
  if (Math.random() < 0.025 || e.elite) G.gems.push({ x: e.x + 0.2, z: e.z, v: 0, coin: true, t: 0 });
  fxApi.burst(e.x, e.z, e.elite ? '#ffd34d' : '#b24dff', e.cfg.boss ? 30 : 5, 2.4);
  if (G.splats.length > 300) G.splats.shift();
  G.splats.push({ x: e.x, z: e.z, s: e.r * rand(1.2, 1.8) * (e.elite ? 1.4 : 1), ry: Math.random() * 6, t: 0, c: Math.random() < 0.5 ? '#3a1630' : '#24163a' });
  if (e.cfg.boss === 'mini') { G.queue += 2; banner('BAÚ DA FENDA', 'Duas melhorias grátis', '#ffc96b'); }
  if (e.cfg.boss === 'final') { G.bossDone = true; setTimeout(() => finish(true), 1200); }
  if (e === G.boss) { G.boss = null; $('bossbar').hidden = true; }
}
function dropGem(x, z, v) {
  if (G.gems.length > 480) { const g = G.gems[Math.floor(Math.random() * G.gems.length)]; if (!g.coin) { g.v += v; return; } }
  G.gems.push({ x: x + rand(-0.15, 0.15), z: z + rand(-0.15, 0.15), v, t: 0 });
}

// ---------- inimigos e diretor ----------
function spawn(type, x, z, opts = {}) {
  const c = CFG.enemies[type], el = opts.elite, hp = c.hp * (c.boss ? 1 : CFG.hpScale(G.t)) * (el ? CFG.elite.hp : 1);
  const e = { type, cfg: c, x, z, hp, maxHp: hp, r: c.radius * (el ? 1.3 : 1), speed: c.speed * rand(0.9, 1.1) * (el ? CFG.elite.speed : 1), elite: el,
    kx: 0, kz: 0, flash: 0, soakT: 0, burnT: 0, burnTick: 0, stunT: 0, slowT: 0, face: 0, ph: Math.random() * 6, act: rand(0, 2), state: 'move', st: 0, dead: false };
  G.enemies.push(e); return e;
}
function spawnRing(type, n, dist) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; spawn(type, mage.x + Math.sin(a) * dist, mage.z + Math.cos(a) * dist); }
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
  const alive = G.enemies.length;
  let rate = CFG.spawnRate(G.t) * (G.event?.kind === 'horda' ? 3 : 1) * (G.boss?.cfg.boss === 'final' ? 0.3 : 1);
  G.spawnAcc += rate * dt;
  while (G.spawnAcc >= 1) {
    G.spawnAcc -= 1; if (alive >= CFG.maxAlive) continue;
    const [x, z] = spawnPoint(), elite = G.t > CFG.elite.chanceFrom && Math.random() < CFG.elite.chance;
    spawn(pickType(), x, z, { elite });
  }
  // eventos
  const ev = CFG.events[G.nextEvent];
  if (ev && G.t >= ev.at) {
    G.nextEvent++; const info = CFG.eventInfo[ev.kind];
    G.event = { kind: ev.kind }; G.eventT = info.dur; banner(info.name, info.sub, info.color);
    if (ev.kind === 'cercado') spawnRing(G.t > 300 ? 'espectro' : 'rastejante', 34, 4.2);
  }
  if (G.event && (G.eventT -= dt) <= 0) G.event = null;
  // minichefe e Guardião
  if (!G.miniDone && G.t >= CFG.miniboss) { G.miniDone = true; const [x, z] = spawnPoint(); G.boss = spawn('minichefe', x, z); banner('MINICHEFE', 'Caldeira Viva', '#ff8a3d'); showBoss('Caldeira Viva'); }
  if (!G.bossSpawned && G.t >= CFG.runTime) { G.bossSpawned = true; const [x, z] = spawnPoint(); G.boss = spawn('guardiao', x, z); banner('GUARDIÃO', 'Arborion Ancião desperta', '#c58bff'); showBoss('Arborion Ancião'); }
}
function updateEnemy(e, dt) {
  const c = e.cfg, dx = mage.x - e.x, dz = mage.z - e.z, d = Math.hypot(dx, dz) || 1;
  e.flash -= dt; e.soakT -= dt; e.stunT -= dt; e.slowT -= dt;
  if (e.burnT > 0) { e.burnT -= dt; if ((e.burnTick -= dt) <= 0) { e.burnTick = 0.5; G.damage(e, 3 * G.mods.dmg, { quiet: true }); if (e.dead) return; } }
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
  if (d < e.r + CFG.mage.radius && e.stunT <= 0) hurtMage(c.dmg * (e.elite ? 1.5 : 1));
  // longe demais: reaparece do outro lado (o enxame nunca some)
  if (d > Math.hypot(viewW, viewH) * 0.95 && !c.boss) { const [x, z] = spawnPoint(); e.x = x; e.z = z; }
}
function bossAct(e, dt, d, dx, dz) {
  e.st -= dt;
  if (e.st > 0) return;
  if (e.cfg.boss === 'mini') { e.st = 3.6; e.flash = 0.2; ringShots(e.x, e.z, 12, 3.4, 10); }
  else {
    const r = Math.random(); e.st = 2.8;
    if (r < 0.45) { e.flash = 0.2; ringShots(e.x, e.z, 18, 3.2, 12); }
    else if (r < 0.75) { e.kx += dx / d * 9; e.kz += dz / d * 9; e.flash = 0.2; }   // investida curta
    else { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; spawn('espectro', e.x + Math.sin(a) * 1.6, e.z + Math.cos(a) * 1.6); } }
  }
}
function enemyShot(x, z, dx, dz, sp, dmg) { G.projectiles.push({ kind: 'inimigo', enemy: true, x, z, vx: dx * sp, vz: dz * sp, life: 4, r: 0.16, dmg }); }
function ringShots(x, z, n, sp, dmg) { const o = Math.random(); for (let i = 0; i < n; i++) { const a = (i + o) / n * Math.PI * 2; enemyShot(x, z, Math.sin(a), Math.cos(a), sp, dmg); } }
function separate() {
  for (const a of grid.values()) for (let i = 0; i < a.length; i++) for (let j = i + 1; j < Math.min(a.length, i + 6); j++) {
    const p = a[i], q = a[j], dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), min = p.r + q.r;
    if (d >= min || d < 1e-4) continue;
    const o = (min - d) / d * 0.5, wp = p.cfg.heavy ? 0.2 : 1, wq = q.cfg.heavy ? 0.2 : 1;
    p.x -= dx * o * wp; p.z -= dz * o * wp; q.x += dx * o * wq; q.z += dz * o * wq;
  }
}

// ---------- Mago ----------
function hurtMage(dmg) {
  if (mage.inv > 0 || G.mode !== 'play') return;
  mage.hp -= dmg; mage.inv = CFG.mage.iframes;
  document.body.classList.remove('hurt'); void document.body.offsetWidth; document.body.classList.add('hurt');
  try { navigator.vibrate?.(30); } catch { /* ignorar */ }
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
  for (const s of G.spells) if (!s.fusion && s.level < 5) opts.push({ kind: 'up', key: s.key, w: 3 });
  if (G.spells.length < CFG.mage.slots) for (const k of Object.keys(CFG.spells)) if (!owned[k] && !G.spells.some(s => s.fusion && CFG.fusions[s.key].from.includes(k))) opts.push({ kind: 'new', key: k, w: 2 });
  const pc = Object.keys(G.passives).length;
  for (const k of Object.keys(CFG.passives)) { const l = G.passives[k] || 0; if (l && l < 5) opts.push({ kind: 'pup', key: k, w: 2 }); else if (!l && pc < CFG.mage.passiveSlots) opts.push({ kind: 'pnew', key: k, w: 1.4 }); }
  const out = [];
  while (out.length < 3 && opts.length) {
    const tot = opts.reduce((s, o) => s + o.w, 0); let r = Math.random() * tot, i = 0;
    for (; i < opts.length; i++) if ((r -= opts[i].w) <= 0) break;
    out.push(opts.splice(Math.min(i, opts.length - 1), 1)[0]);
  }
  if (!out.length) out.push({ kind: 'heal', key: 'heal' });
  return out;
}
function openLevelUp() {
  G.mode = 'levelup'; input.clear();
  const box = $('choices'); box.innerHTML = '';
  $('lv-title').textContent = G.queue > 1 ? `SUBIU DE NÍVEL! (+${G.queue - 1})` : 'SUBIU DE NÍVEL!';
  for (const o of options()) {
    const s = CFG.spells[o.key] || CFG.fusions[o.key] || CFG.passives[o.key];
    const cur = o.kind === 'up' ? G.spells.find(x => x.key === o.key).level : o.kind === 'pup' ? G.passives[o.key] : 0;
    const tag = o.kind === 'fusion' ? 'FUSÃO' : o.kind === 'new' || o.kind === 'pnew' ? 'NOVO' : o.kind === 'heal' ? '' : `NV ${cur} → ${cur + 1}`;
    const name = o.kind === 'heal' ? 'Poção de mana' : s.name, color = o.kind === 'heal' ? '#ff5a6a' : s.color, glyph = o.kind === 'heal' ? '♥' : s.glyph;
    const desc = o.kind === 'heal' ? 'Recupera 30 de vida.' : o.kind === 'pnew' || o.kind === 'pup' ? s.desc : o.kind === 'fusion' ? `${CFG.spells[s.from[0]].name} + ${CFG.spells[s.from[1]].name}: ${s.desc}` : nextDesc(o.key, cur);
    const b = document.createElement('button'); b.className = 'card' + (o.kind === 'fusion' ? ' fusion' : ''); b.style.setProperty('--c', color);
    b.innerHTML = `<span class="ico">${glyph}</span><span class="txt"><span class="row"><b>${esc(name)}</b><em>${esc(tag)}</em></span><span class="d">${esc(desc)}</span></span>`;
    b.onclick = () => choose(o); box.appendChild(b);
  }
  $('levelup').hidden = false;
}
function choose(o) {
  if (o.kind === 'new') G.spells.push(new Spell(o.key, G));
  if (o.kind === 'up') G.spells.find(s => s.key === o.key).level++;
  if (o.kind === 'fusion') { G.spells = G.spells.filter(s => !CFG.fusions[o.key].from.includes(s.key)); G.spells.push(new Spell(o.key, G)); banner('FUSÃO', CFG.fusions[o.key].name, CFG.fusions[o.key].color); }
  if (o.kind === 'pnew' || o.kind === 'pup') { G.passives[o.key] = (G.passives[o.key] || 0) + 1; recalc(); }
  if (o.kind === 'heal') mage.hp = Math.min(mage.maxHp, mage.hp + 30);
  G.queue--; $('levelup').hidden = true; renderLoadout();
  if (G.queue > 0) openLevelUp(); else { G.mode = 'play'; input.clear(); }
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
    move() { if (s.id !== null) return [s.x, s.z]; let x = 0, z = 0; for (const k of s.keys) { x += M[k][0]; z += M[k][1]; } const l = Math.hypot(x, z); return l ? [x / l, z / l] : [0, 0]; },
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
  for (const s of G.spells) s.update(dt);
  // projéteis
  for (const p of G.projectiles) {
    p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt;
    if (p.enemy) { if (Math.hypot(p.x - mage.x, p.z - mage.z) < p.r + CFG.mage.radius) { hurtMage(p.dmg); p.life = 0; } continue; }
    for (const e of G.query(p.x, p.z, p.r)) {
      if (p.hit.has(e) || p.life <= 0) continue;
      p.hit.add(e);
      if (p.kind === 'fogo') { p.onHit(p); p.life = 0; break; }
      p.onHit(p, e); if (p.pierce-- <= 0) { p.life = 0; break; }
    }
  }
  G.projectiles = G.projectiles.filter(p => p.life > 0);
  // cristais
  const mag = G.mods.magnet;
  for (const g of G.gems) {
    g.t += dt; const dx = mage.x - g.x, dz = mage.z - g.z, d = Math.hypot(dx, dz);
    if (d < mag || g.pull) { g.pull = true; const sp = 4 + g.t * 10; g.x += dx / d * Math.min(d, sp * dt); g.z += dz / d * Math.min(d, sp * dt); }
    if (d < 0.35) { g.done = true; if (g.coin) G.coins++; else addXp(g.v); }
  }
  G.gems = G.gems.filter(g => !g.done);
  // combo
  if ((G.comboT -= dt) <= 0) G.combo = 0;
  // efeitos
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter(f => f.t < f.dur); Object.assign(G.fx, fxApi);
  for (const p of G.particles) { p.t += dt; p.vy -= 12 * dt; p.x += p.vx * dt; p.y = Math.max(0.03, p.y + p.vy * dt); p.z += p.vz * dt; }
  G.particles = G.particles.filter(p => p.t < p.dur);
  for (const n of G.numbers) n.t += dt;
  G.numbers = G.numbers.filter(n => n.t < 0.7);
  if (G.numbers.length > 30) G.numbers.splice(0, G.numbers.length - 30);
  if (G.queue > 0 && G.mode === 'play') openLevelUp();
}

// ---------- desenho ----------
const tmpV = new T.Vector3();
function draw(now) {
  const t = now / 1000;
  // câmera segue o Mago
  const f = 1 - Math.exp(-CFG.cam.follow * 0.016);
  camAt.x += (mage.x - camAt.x) * f; camAt.z += (mage.z - camAt.z) * f;
  cam.position.copy(camAt).add(camOff); cam.lookAt(camAt);
  if (G.shakeT > 0) { G.shakeT = Math.max(0, G.shakeT - 0.016); const k = G.shakeT * 0.6; cam.position.x += (Math.random() - 0.5) * k; cam.position.z += (Math.random() - 0.5) * k; }
  world.update(camAt.x, camAt.z, viewW, viewH);
  // Mago
  mageRoot.position.set(mage.x, 0, mage.z); mageRoot.rotation.y = mage.face;
  mageBody.position.y = mage.moving ? Math.abs(Math.sin(t * 11)) * 0.06 : Math.sin(t * 2) * 0.02;
  mageRoot.visible = !(mage.inv > 0 && Math.floor(t * 20) % 2);
  // inimigos (por tipo, desenho em lote)
  for (const b of Object.values(batches)) b.begin();
  for (const e of G.enemies) {
    const b = batches[e.type], y = e.cfg.float ? 0.15 + Math.sin(t * 3 + e.ph) * 0.06 : Math.abs(Math.sin(t * 9 + e.ph)) * 0.04;
    const sq = e.state === 'wind' ? 0.75 : 1, tm = e.soakT > 0 ? 1.3 : 1;
    b.add(e.x, y, e.z, e.face, e.elite ? CFG.elite.scale : 1, e.flash > 0 || e.state === 'wind' && Math.floor(t * 16) % 2 ? 1 : 0, sq, tm);
  }
  for (const b of Object.values(batches)) b.end();
  // cristais e moedas
  gemsPool.begin();
  for (const g of G.gems) { const c = g.coin ? '#ffd34d' : g.v >= 20 ? '#c58bff' : g.v >= 4 ? '#5fb8ff' : '#5dff9a', s = g.coin ? 0.16 : g.v >= 4 ? 0.17 : 0.12; gemsPool.add(g.x, 0.22 + Math.sin(t * 4 + g.x) * 0.04, g.z, s, s * 1.3, s, c, 0, t * 2, 0.6); }
  gemsPool.end();
  // projéteis e efeitos (camada em resolução normal)
  glow.begin(cam); fxCubes.begin();
  for (const p of G.projectiles) {
    if (p.kind === 'fogo') { glow.add(p.x, 0.45, p.z, 1.2, '#ff5a10', 0.9); glow.add(p.x, 0.45, p.z, 0.5, '#fff2a8', 1); glow.add(p.x - p.vx * 0.03, 0.45, p.z - p.vz * 0.03, 0.7, '#ff8a3d', 0.5); }
    else if (p.kind === 'vento') { const a = Math.atan2(p.vx, p.vz) + Math.PI / 2; fxCubes.add(p.x, 0.4, p.z, 0.6, 0.04, 0.1, '#ffffff', 0, a, 0); glow.add(p.x, 0.4, p.z, 0.8, '#7fe8ff', 0.6); glow.add(p.x - p.vx * 0.03, 0.4, p.z - p.vz * 0.03, 0.5, '#bff4ff', 0.4); }
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
  for (const q of G.particles) { const k = 1 - q.t / q.dur; glow.add(q.x, q.y, q.z, q.size * 3.2, q.color, k); }
  glow.end(); fxCubes.end();
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
  ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center';
  for (const n of G.numbers) {
    tmpV.set(n.x, 0.9 + n.t * 1.2, n.z).project(cam);
    const x = Math.round((tmpV.x * 0.5 + 0.5) * pxW), y = Math.round((-tmpV.y * 0.5 + 0.5) * pxH);
    ctx.globalAlpha = 1 - Math.max(0, n.t - 0.45) / 0.25;
    ctx.font = n.big ? '16px Silkscreen, monospace' : '8px Silkscreen, monospace';
    ctx.fillStyle = '#07060c'; ctx.fillText(n.v, x + 1, y + 1);
    ctx.fillStyle = n.big ? '#ffe066' : '#f2f4f8'; ctx.fillText(n.v, x, y);
  }
  ctx.globalAlpha = 1;
}

// ---------- HUD ----------
function hud() {
  $('xpfill').style.width = Math.min(100, G.xp / CFG.xpFor(G.level) * 100) + '%';
  $('lvl').textContent = 'NV ' + G.level; $('coins').textContent = G.coins;
  $('time').textContent = fmtTime(Math.min(G.t, CFG.runTime));
  $('kills').textContent = G.kills.toLocaleString('pt-BR');
  $('hpfill').style.width = Math.max(0, mage.hp / mage.maxHp * 100) + '%';
  const cb = $('combo'); cb.hidden = G.combo < 5; cb.querySelector('b').textContent = 'x' + G.combo;
  if (G.boss) $('bossfill').style.width = Math.max(0, G.boss.hp / G.boss.maxHp * 100) + '%';
  if (settings.fps) $('fps').textContent = `${fps} fps · ${G.enemies.length} inimigos · ${renderer.info.render.calls} draws`;
}
function renderLoadout() {
  $('loadout').innerHTML = G.spells.map(s => `<i style="--c:${s.cfg.color}">${s.cfg.glyph}<sub>${s.fusion ? '★' : s.level}</sub></i>`).join('')
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
function start() {
  Object.assign(G, { mode: 'play', t: 0, enemies: [], projectiles: [], gems: [], fx: Object.assign([], fxApi), particles: [], splats: [], numbers: [],
    spells: [], passives: {}, xp: 0, level: 1, kills: 0, coins: 0, combo: 0, comboT: 0, bestCombo: 0, spawnAcc: 0, nextEvent: 0, event: null, boss: null,
    miniDone: false, bossDone: false, bossSpawned: false, queue: 0 });
  Object.assign(mage, { x: 0, z: 0, face: Math.PI, inv: 0 });
  recalc(); mage.hp = mage.maxHp;
  G.spells.push(new Spell('fogo', G));   // o Mago começa com Bola de fogo
  renderLoadout();
  for (const id of ['startscreen', 'result', 'levelup', 'pause']) $(id).hidden = true;
  $('bossbar').hidden = true; input.clear();
}
function finish(won) {
  if (G.mode === 'over') return;
  G.mode = 'over'; input.clear();
  $('res-title').textContent = won ? 'FENDA ESTABILIZADA' : 'DERROTADO';
  $('res-title').className = won ? 'won' : '';
  $('res-stats').innerHTML = [['TEMPO', fmtTime(G.t)], ['NÍVEL', G.level], ['ABATES', G.kills.toLocaleString('pt-BR')], ['MAIOR COMBO', 'x' + G.bestCombo]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('res-build').innerHTML = $('loadout').innerHTML;
  setTimeout(() => { $('result').hidden = false; }, won ? 400 : 700);
}
function togglePause() {
  if (G.mode === 'play') { G.mode = 'paused'; input.clear(); $('pause').hidden = false; $('fps-toggle').textContent = 'MOSTRAR FPS: ' + (settings.fps ? 'SIM' : 'NÃO'); }
  else if (G.mode === 'paused') { G.mode = 'play'; $('pause').hidden = true; }
}
$('btn-start').onclick = start; $('btn-again').onclick = start; $('btn-pause').onclick = togglePause; $('btn-resume').onclick = togglePause;
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
window.__bh = { G, CFG, start, spawn, Spell, speed: 1 };
