// MVP 0 — arena de ação. Simulação em passo fixo; pausa e perda de foco congelam tudo antes de processar dano.
import * as T from '../lib/three.js';
import { CFG } from './config.js';
import { createInput } from './input.js';
import { Run } from './run.js';
import { Kay } from './kay.js';
import { Fx } from './fx.js';

const $ = id => document.getElementById(id);
const SETTINGS_KEY = 'rz_acao_settings_v1';   // separado do save do RPG (rz_save_v1)
const settings = { reduceFx: matchMedia('(prefers-reduced-motion: reduce)').matches, showFps: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch { /* sem storage */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* sem storage */ } };

// ---------- renderização ----------
const renderer = new T.WebGLRenderer({ canvas: $('view'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new T.Scene();
scene.background = new T.Color('#121815');
scene.add(new T.HemisphereLight('#fff2d6', '#3a4a3a', 1.25));
const sun = new T.DirectionalLight('#fff1cf', 2.3); sun.position.set(-6, 10, 5); scene.add(sun);
const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const camOff = new T.Vector3(...CFG.cam.offset), camAt = new T.Vector3();
cam.position.copy(camOff); cam.lookAt(0, 0, 0);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const vh = CFG.cam.viewH, vw = vh * w / h;
  Object.assign(cam, { left: -vw / 2, right: vw / 2, top: vh / 2, bottom: -vh / 2 });
  cam.updateProjectionMatrix();
  const portrait = h > w;
  document.body.classList.toggle('portrait', portrait);
  if (portrait && game.mode === 'play') pause();
}

// ---------- estado ----------
const fx = new Fx(scene, settings);
const game = {
  mode: 'play', time: 0, scene, cam, fx, settings, enemies: [], projectiles: [], hitstop: 0, arena: null,
  onKayHurt() { renderHearts(); if (!settings.reduceFx) { document.body.classList.remove('hurt'); void document.body.offsetWidth; document.body.classList.add('hurt'); } vibrate(40); },
  onEnemyHit(fin) { game.hitstop = Math.max(game.hitstop, fin ? CFG.hitstop.heavy : CFG.hitstop.light); if (fin) vibrate(15); },
  onGuardBreak() { vibrate(25); },
  onEnemyKilled(e) { game.run.onEnemyKilled(e); },
};
game.kay = new Kay(scene);

const input = createInput({ layer: $('touch'), stick: $('stick'), knob: $('stick-knob'), attackBtn: $('btn-attack'), dodgeBtn: $('btn-dodge'), onPause: () => (game.mode === 'paused' ? resume() : pause()) });
function vibrate(ms) { if (settings.vibrate !== false && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* ignorar */ } }

// ---------- HUD ----------
function renderHearts() {
  const k = game.kay, el = $('hearts');
  el.innerHTML = '';
  for (let i = 0; i < CFG.kay.hp; i++) { const s = document.createElement('i'); if (i >= k.hp) s.className = 'empty'; el.appendChild(s); }
  el.setAttribute('aria-label', `Vida ${k.hp} de ${CFG.kay.hp}`);
}
function overlay(title, text, buttons) {
  $('ov-title').textContent = title; $('ov-text').innerHTML = text;
  const box = $('ov-buttons'); box.innerHTML = '';
  for (const [label, fn, cls] of buttons) { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; box.appendChild(b); }
  $('overlay').hidden = false;
}
const hideOverlay = () => { $('overlay').hidden = true; };

const doorLabels = [];
let toastTimer = 0;
const ui = {
  objective() { $('objective').textContent = game.run.status(); },
  materials(n) { const el = $('mats'); el.querySelector('b').textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); },
  toast(text, color) {
    const el = $('toast'); el.textContent = text; el.style.borderColor = color; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  },
  addDoor(door) {
    const el = document.createElement('div'); el.className = 'door-label';
    el.innerHTML = `<b>${door.info.glyph}</b>${door.info.label}`; el.style.borderColor = door.info.color;
    $('labels').appendChild(el); doorLabels.push({ el, door });
  },
  clearDoors() { doorLabels.forEach(d => d.el.remove()); doorLabels.length = 0; },
  snapCamera,
  transition(fn) {
    if (game.mode !== 'play') return;
    game.mode = 'transition'; input.clear();
    $('fade').classList.add('on');
    setTimeout(() => { fn(); $('fade').classList.remove('on'); setTimeout(() => { if (game.mode === 'transition') game.mode = 'play'; }, 200); }, 320);
  },
  finish() {
    game.mode = 'won';
    setTimeout(() => {
      const s = game.run.summary();
      overlay('Fenda concluída', `${s.rooms} salas · ${s.time.toFixed(0)} s · golpes recebidos: ${game.kay.stats.hitsTaken}<br>Liga de Fenda: <b>${s.materials}</b> · Ressonas encontradas: <b>${s.rescued}</b><br><small>O Guardião entra na etapa 3.</small>`, [['Nova incursão', restart, 'primary']]);
    }, 1200);
  },
};
function placeLabels() {
  const v = new T.Vector3();
  for (const { el, door } of doorLabels) {
    v.set(door.x, 2.1, door.z).project(cam);
    const x = T.MathUtils.clamp((v.x * 0.5 + 0.5) * innerWidth, 80, innerWidth - 80), y = T.MathUtils.clamp((-v.y * 0.5 + 0.5) * innerHeight, 110, innerHeight - 20);
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }
}

// ---------- fluxo ----------
game.run = new Run(game, ui);
function restart() {
  game.kay.reset(); game.time = 0; game.hitstop = 0;
  hideOverlay(); input.clear(); renderHearts();
  game.run.start(); ui.materials(0);
  game.mode = 'play';
}
function pause() {
  if (game.mode !== 'play' && game.mode !== 'countdown') return;
  game.mode = 'paused'; input.clear();
  overlay('Pausa', 'Joystick à esquerda · Ataque, Esquiva à direita.<br>Teclado: WASD · J ataque · K/Espaço esquiva · Esc pausa', [
    ['Continuar', resume, 'primary'],
    ['Recomeçar incursão', restart],
    [`Efeitos reduzidos: ${settings.reduceFx ? 'sim' : 'não'}`, () => { settings.reduceFx = !settings.reduceFx; saveSettings(); game.mode = 'play'; pause(); }],
    [`Mostrar FPS: ${settings.showFps ? 'sim' : 'não'}`, () => { settings.showFps = !settings.showFps; $('fps').hidden = !settings.showFps; saveSettings(); game.mode = 'play'; pause(); }],
  ]);
}
function resume() {
  if (game.mode !== 'paused' || document.body.classList.contains('portrait')) return;
  hideOverlay(); input.clear();
  game.mode = 'countdown'; game.countT = 0.9;      // breve contagem antes de reativar perigos
}
function lose() {
  game.mode = 'lost';
  const s = game.run.summary(), kept = Math.floor(s.materials / 2);
  setTimeout(() => overlay('Kay caiu', `Sala ${s.depth} de ${game.run.total} · ${s.rooms} salas limpas<br>Liga de Fenda recuperada: <b>${kept}</b> de ${s.materials} (metade se perde na derrota)`, [['Nova incursão', restart, 'primary']]), 700);
}

$('btn-pause').addEventListener('click', () => (game.mode === 'paused' ? resume() : pause()));
addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('resize', resize);

// ---------- simulação ----------
function step(dt) {
  game.time += dt;
  const k = game.kay;
  k.update(dt, game, input);
  for (const e of game.enemies) e.update(dt);
  // separação entre corpos (esquiva atravessa inimigos)
  const bodies = game.enemies.filter(e => e.targetable);
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) push(a.pos, bodies[j].pos, a.radius + bodies[j].radius, 0.5);
    if (!k.dodging && k.state !== 'dead') push(k.pos, a.pos, a.radius + CFG.kay.radius, 0.7);
  }
  game.projectiles.forEach(p => p.update(dt));
  game.projectiles = game.projectiles.filter(p => p.alive);
  const before = game.enemies.length;
  game.enemies = game.enemies.filter(e => e.alive);
  if (game.enemies.length !== before) ui.objective();
  fx.update(dt);
  if (k.state === 'dead' && game.mode === 'play') return lose();
  game.run.update(dt);
}
function push(a, b, min, wa) {   // wa = parte do empurrão que vai para "a"
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
  if (d >= min || d < 1e-4) return;
  const o = (min - d) / d;
  a.x -= dx * o * wa; a.z -= dz * o * wa; b.x += dx * o * (1 - wa); b.z += dz * o * (1 - wa);
}

// câmera acompanha Kay sem mostrar muito além da borda da sala
function camTarget() {
  const a = game.arena, hx = Math.max(0, a.w / 2 + 1 - cam.right), hz = Math.max(0, a.d / 2 - 1.6);
  const r = game.run.room, lookDoors = r.clear && !r.final ? 3.5 : 0;   // sala limpa: puxa a câmera para as portas
  return [T.MathUtils.clamp(game.kay.pos.x, -hx, hx), T.MathUtils.clamp(game.kay.pos.z - lookDoors, -hz - 1.8, hz)];
}
function snapCamera() { const [x, z] = camTarget(); camAt.set(x, 0, z); cam.position.copy(camAt).add(camOff); cam.lookAt(camAt); }
function updateCamera(dt) {
  const [tx, tz] = camTarget(), f = 1 - Math.exp(-CFG.cam.follow * dt);
  camAt.x += (tx - camAt.x) * f; camAt.z += (tz - camAt.z) * f;
  cam.position.copy(camAt).add(camOff); cam.lookAt(camAt);
}

// ---------- laço ----------
let last = performance.now(), acc = 0, frames = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (game.mode === 'countdown') {
    game.countT -= dt;
    $('count').hidden = false; $('count').textContent = Math.ceil(game.countT / 0.3);
    if (game.countT <= 0) { game.mode = 'play'; $('count').hidden = true; input.clear(); }
  }
  if (game.mode === 'play' || game.mode === 'lost' || game.mode === 'won') {
    if (game.hitstop > 0) { game.hitstop -= dt; acc = 0; } else acc += dt;
    let n = 0;
    while (acc >= CFG.sim.dt && n++ < CFG.sim.maxSteps) { step(CFG.sim.dt); acc -= CFG.sim.dt; }
    if (n >= CFG.sim.maxSteps) acc = 0;
  } else acc = 0;
  updateCamera(dt);
  renderer.render(scene, cam);
  placeLabels();
  frames++; fpsT += dt;
  if (fpsT >= 0.5) {
    if (settings.showFps) $('fps').textContent = `${Math.round(frames / fpsT)} fps · ${renderer.info.render.calls} draws`;
    frames = 0; fpsT = 0;
  }
}

$('fps').hidden = !settings.showFps;
resize(); restart();
requestAnimationFrame(frame);

// gancho para testes automatizados
window.__rz = { game, CFG, pause, resume, restart };
