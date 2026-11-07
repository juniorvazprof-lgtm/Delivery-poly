// MVP 0 — arena de ação. Simulação em passo fixo; pausa e perda de foco congelam tudo antes de processar dano.
import * as T from '../lib/three.js';
import { CFG } from './config.js';
import { createInput } from './input.js';
import { Arena } from './arena.js';
import { Kay } from './kay.js';
import { Enemy } from './enemies.js';
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
  mode: 'play', time: 0, scene, cam, fx, settings, enemies: [], projectiles: [], wave: -1, waveT: 0,
  arena: new Arena(scene),
  onKayHurt() { renderHearts(); if (!settings.reduceFx) { document.body.classList.remove('hurt'); void document.body.offsetWidth; document.body.classList.add('hurt'); } vibrate(40); },
  onEnemyHit(fin) { if (fin) vibrate(15); },
  onGuardBreak() { vibrate(25); },
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
function objective() {
  const n = game.enemies.filter(e => e.state !== 'dying').length;
  $('objective').textContent = game.wave < 0 ? '' : `Onda ${game.wave + 1}/${CFG.waves.length} · ${n} ${n === 1 ? 'inimigo' : 'inimigos'}`;
}
function overlay(title, text, buttons) {
  $('ov-title').textContent = title; $('ov-text').innerHTML = text;
  const box = $('ov-buttons'); box.innerHTML = '';
  for (const [label, fn, cls] of buttons) { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; box.appendChild(b); }
  $('overlay').hidden = false;
}
const hideOverlay = () => { $('overlay').hidden = true; };

// ---------- fluxo ----------
function startWave(i) {
  game.wave = i; game.waveT = 0;
  const taken = [];
  for (const kind of CFG.waves[i]) {
    const p = game.arena.spawnPoint(game.kay.pos, taken); taken.push(p);
    game.enemies.push(new Enemy(kind, p, game));
  }
  objective();
}
function restart() {
  game.enemies.forEach(e => e.destroy()); game.enemies = [];
  game.projectiles.forEach(p => scene.remove(p.mesh)); game.projectiles = [];
  fx.clear(); game.kay.reset(); game.time = 0; game.wave = -1;
  renderHearts(); hideOverlay(); input.clear();
  game.mode = 'play'; game.waveT = CFG.waveDelay - 0.6;
  snapCamera();
}
function pause() {
  if (game.mode !== 'play' && game.mode !== 'countdown') return;
  game.mode = 'paused'; input.clear();
  overlay('Pausa', 'Joystick à esquerda · Ataque, Esquiva à direita.<br>Teclado: WASD · J ataque · K/Espaço esquiva · Esc pausa', [
    ['Continuar', resume, 'primary'],
    ['Reiniciar arena', restart],
    [`Efeitos reduzidos: ${settings.reduceFx ? 'sim' : 'não'}`, () => { settings.reduceFx = !settings.reduceFx; saveSettings(); game.mode = 'play'; pause(); }],
    [`Mostrar FPS: ${settings.showFps ? 'sim' : 'não'}`, () => { settings.showFps = !settings.showFps; $('fps').hidden = !settings.showFps; saveSettings(); game.mode = 'play'; pause(); }],
  ]);
}
function resume() {
  if (game.mode !== 'paused' || document.body.classList.contains('portrait')) return;
  hideOverlay(); input.clear();
  game.mode = 'countdown'; game.countT = 0.9;      // breve contagem antes de reativar perigos
}
function win() {
  game.mode = 'won';
  overlay('Arena limpa', `Tempo: ${game.time.toFixed(1)} s · Golpes recebidos: ${game.kay.stats.hitsTaken}`, [['Jogar de novo', restart, 'primary']]);
}
function lose() {
  game.mode = 'lost';
  setTimeout(() => overlay('Kay caiu', `Chegou à onda ${game.wave + 1} de ${CFG.waves.length}.`, [['Tentar de novo', restart, 'primary']]), 700);
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
  if (game.enemies.length !== before) objective();
  fx.update(dt);

  if (k.state === 'dead' && game.mode === 'play') return lose();
  if (game.mode === 'play' && game.enemies.length === 0) {
    game.waveT += dt;
    if (game.waveT >= CFG.waveDelay) {
      if (game.wave + 1 < CFG.waves.length) startWave(game.wave + 1);
      else win();
    }
  }
}
function push(a, b, min, wa) {   // wa = parte do empurrão que vai para "a"
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
  if (d >= min || d < 1e-4) return;
  const o = (min - d) / d;
  a.x -= dx * o * wa; a.z -= dz * o * wa; b.x += dx * o * (1 - wa); b.z += dz * o * (1 - wa);
}

function snapCamera() { camAt.set(game.kay.pos.x * 0.6, 0, game.kay.pos.z * 0.5); cam.position.copy(camAt).add(camOff); cam.lookAt(camAt); }
function updateCamera(dt) {
  // acompanha a arena com suavidade, sem solavancos a cada alvo
  const tx = T.MathUtils.clamp(game.kay.pos.x * 0.85, -4.5, 4.5), tz = T.MathUtils.clamp(game.kay.pos.z * 0.8, -2.2, 2.2);
  const f = 1 - Math.exp(-CFG.cam.follow * dt);
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
    acc += dt;
    let n = 0;
    while (acc >= CFG.sim.dt && n++ < CFG.sim.maxSteps) { step(CFG.sim.dt); acc -= CFG.sim.dt; }
    if (n >= CFG.sim.maxSteps) acc = 0;
  } else acc = 0;
  updateCamera(dt);
  renderer.render(scene, cam);
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
window.__rz = { game, CFG, pause, resume, restart, startWave };
