// MVP 0 — arena de ação. Simulação em passo fixo; pausa e perda de foco congelam tudo antes de processar dano.
import * as T from '../lib/three.js';
import { CFG } from './config.js';
import { createInput } from './input.js';
import { Run } from './run.js';
import { Companion } from './companion.js';
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
scene.background = new T.Color('#0d150f');
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
  mode: 'play', time: 0, scene, cam, fx, settings, enemies: [], projectiles: [], effects: [], comp: null, hitstop: 0, arena: null, mods: {},
  maxHp: () => CFG.kay.hp + (game.mods.maxHp || 0),
  onSkillNotReady() { const b = $('btn-skill'); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); },
  onSkill() { vibrate(20); },
  onKayHurt() { renderHearts(); if (!settings.reduceFx) { document.body.classList.remove('hurt'); void document.body.offsetWidth; document.body.classList.add('hurt'); } vibrate(40); },
  onEnemyHit(fin) { game.hitstop = Math.max(game.hitstop, fin ? CFG.hitstop.heavy : CFG.hitstop.light); if (fin) vibrate(15); },
  onGuardBreak() { vibrate(25); },
  onEnemyKilled(e) { game.run.onEnemyKilled(e); if (e.boss) $('bossbar').hidden = true; },
  onBoss(b) { $('boss-name').textContent = CFG.guardian.name; $('bossbar').hidden = false; game.onBossHp(b); },
  onBossHp(b) { $('boss-fill').style.width = Math.max(0, b.hp / b.cfg.hp * 100) + '%'; $('bossbar').classList.toggle('p2', b.phase2); },
};
game.kay = new Kay(scene);

const input = createInput({ layer: $('touch'), stick: $('stick'), knob: $('stick-knob'), attackBtn: $('btn-attack'), dodgeBtn: $('btn-dodge'), skillBtn: $('btn-skill'), onPause: () => (game.mode === 'paused' ? resume() : pause()) });
function vibrate(ms) { if (settings.vibrate !== false && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* ignorar */ } }
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- HUD ----------
function renderHearts() {
  const k = game.kay, el = $('hearts'), max = game.maxHp();
  el.innerHTML = '';
  for (let i = 0; i < max; i++) { const s = document.createElement('i'); if (i >= k.hp) s.className = 'empty'; el.appendChild(s); }
  el.setAttribute('aria-label', `Vida ${k.hp} de ${max}`);
}
// painel genérico (pausa, evento, resultado). buttons: [rótulo, ação, classe, detalhe]
function overlay(title, html, buttons, eyebrow = '') {
  $('ov-eyebrow').textContent = eyebrow; $('ov-title').textContent = title; $('ov-text').innerHTML = html;
  const box = $('ov-buttons'); box.innerHTML = '';
  for (const [label, fn, cls, sub] of buttons) {
    const b = document.createElement('button'); b.className = 'opt ' + (cls || '');
    b.innerHTML = `<span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}`; b.onclick = fn; box.appendChild(b);
  }
  $('overlay').hidden = false;
  box.querySelector('button')?.focus({ preventScroll: true });
}
const hideOverlay = () => { $('overlay').hidden = true; };
const showScreen = id => { for (const s of ['select', 'boon', 'map']) $(s).hidden = s !== id; };

// cartões de escolha (companheira e bênçãos): mesmo componente
function cards(container, items, onPick) {
  container.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button'); b.className = 'pick' + (it.selected ? ' selected' : ''); b.style.setProperty('--c', it.color);
    b.innerHTML = `<span class="pick-glyph">${it.glyph}</span><span class="pick-body"><strong>${esc(it.name)}</strong>${it.tag ? `<em>${esc(it.tag)}</em>` : ''}<span class="pick-desc">${esc(it.desc)}</span>${it.foot ? `<small>${esc(it.foot)}</small>` : ''}</span>`;
    b.onclick = () => onPick(it.key); container.appendChild(b);
  }
}

const doorLabels = [];
let toastTimer = 0;
const ui = {
  objective() { $('objective').textContent = game.run.status(); },
  materials(n) { const el = $('mats'); el.querySelector('b').textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); },
  cubes(n) { $('cubes').querySelector('b').textContent = n; },
  toast(text, color) {
    const el = $('toast'); el.textContent = text; el.style.setProperty('--c', color || '#ffc96b'); el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
  },
  // botão contextual: aparece só em segurança, acima das ações
  interact(opt) {
    const b = $('btn-interact');
    if (!opt) { b.hidden = true; return; }
    b.hidden = false; b.disabled = !opt.ok; b.querySelector('span').textContent = opt.label; b.querySelector('small').textContent = opt.sub;
  },
  addDoor(door) {
    const el = document.createElement('div'); el.className = 'door-label';
    el.innerHTML = `<b>${door.info.glyph}</b>${door.info.label}`; el.style.setProperty('--c', door.info.color);
    $('labels').appendChild(el); doorLabels.push({ el, door });
  },
  clearDoors() { doorLabels.forEach(d => d.el.remove()); doorLabels.length = 0; },
  snapCamera,
  hearts: renderHearts,
  transition(fn) {
    if (game.mode !== 'play' && game.mode !== 'map') return;
    game.mode = 'transition'; input.clear();
    $('fade').classList.add('on');
    setTimeout(() => { fn(); $('fade').classList.remove('on'); setTimeout(() => { if (game.mode === 'transition') game.mode = 'play'; }, 200); }, 320);
  },
  openMap() {
    if (game.mode !== 'play') return;
    game.mode = 'map'; input.clear(); renderMap(); showScreen('map');
  },
  boon() {
    if (game.mode !== 'play') return setTimeout(() => ui.boon(), 400);
    const left = Object.keys(CFG.boons).filter(k => !game.run.boons.includes(k)).sort(() => Math.random() - 0.5).slice(0, 3);
    if (!left.length) return;
    game.mode = 'boon'; input.clear();
    cards($('boon-cards'), left.map(k => ({ key: k, ...CFG.boons[k], tag: 'Só nesta incursão' })), key => {
      applyBoon(key); showScreen(null); game.mode = 'play'; input.clear();
      ui.toast(`${CFG.boons[key].name} ativada`, CFG.boons[key].color);
    });
    showScreen('boon');
  },
  event() {
    game.mode = 'event'; input.clear();
    const k = game.kay, done = () => { hideOverlay(); game.mode = 'play'; input.clear(); ui.objective(); };
    overlay('Fissura pulsante', 'Uma fissura da Fenda vibra sobre o altar. A Liga de Fenda se acumula em volta dela.', [
      ['Tocar a fissura', () => { if (k.hp > 1) k.hp--; renderHearts(); game.run.dropAt(k.pos.clone().setZ(k.pos.z - 0.8), 8); done(); }, 'risk', '−1 de vida · +8 Liga de Fenda'],
      ['Absorver o eco', () => { k.hp = Math.min(game.maxHp(), k.hp + 1); renderHearts(); done(); }, '', '+1 de vida'],
      ['Seguir em frente', done, 'ghost'],
    ], 'Evento');
  },
  finish() {
    game.mode = 'won';
    setTimeout(() => result('Fenda estabilizada', 'Vitória', true), 1400);
  },
};
function result(title, eyebrow, won) {
  const s = game.run.summary(), kept = won ? s.materials : Math.floor(s.materials / 2);
  const names = s.rescued.map(k => CFG.companions[k].name);
  overlay(title, `<dl class="stats">
    <div><dt>Salas</dt><dd>${s.rooms}<small> / ${game.run.total}</small></dd></div>
    <div><dt>Tempo</dt><dd>${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, '0')}</dd></div>
    <div><dt>Liga de Fenda</dt><dd>${kept}${won ? '' : `<small> de ${s.materials}</small>`}</dd></div>
    <div><dt>Ressonas</dt><dd>${names.length}</dd></div>
  </dl>
  <p class="note">${names.length ? `Sincronizadas: ${esc(names.join(', '))}. Elas seguem para o refúgio.` : 'Nenhuma Ressona sincronizada nesta incursão.'}${won ? '' : ' Na derrota, metade da Liga se perde.'}</p>`,
  [['Nova incursão', restart, 'primary']], eyebrow);
}
function applyBoon(key) {
  const m = game.mods, k = game.kay; game.run.boons.push(key);
  if (key === 'lamina') { m.finArc = 50; m.finRange = 0.35; }
  if (key === 'corte') m.dmg = 0.5;
  if (key === 'recarga') m.skillCd = 0.7;
  if (key === 'pulso') m.dodgePush = true;
  if (key === 'vigor') { m.maxHp = 2; k.hp = Math.min(game.maxHp(), k.hp + 2); renderHearts(); }
  if (key === 'ima') m.extraDrop = 1;
  renderBoons();
}
function renderBoons() {
  $('boons').innerHTML = game.run.boons.map(k => `<i style="--c:${CFG.boons[k].color}" title="${esc(CFG.boons[k].name)}">${CFG.boons[k].glyph}</i>`).join('');
}

// mapa da Fenda: grafo da esquerda para a direita + barra de escolhas grande embaixo
function renderMap() {
  const run = game.run, { layers } = run.map, L = layers.length, area = $('map-area');
  area.innerHTML = '';
  const choices = run.choices, ids = new Set(choices.map(n => n.id)), pos = n => [(n.layer + 0.5) / L * 100, 8 + n.y * 84];
  const infoOf = n => n.key === 'final' ? { label: 'Câmara final', glyph: '☗', color: '#b77bff', desc: CFG.guardian.name } : CFG.roomTypes[n.key];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
  for (const layer of layers) for (const a of layer) for (const id of a.next) {
    const b = run.map.byId[id], [x1, y1] = pos(a), [x2, y2] = pos(b), l = document.createElementNS(svg.namespaceURI, 'line');
    Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v));
    const walked = run.visited.includes(a.id) && run.visited.includes(b.id), open = a.id === run.node.id && ids.has(b.id);
    l.setAttribute('class', open ? 'path open' : walked ? 'path walked' : 'path');
    svg.appendChild(l);
  }
  area.appendChild(svg);
  const pickNode = n => { showScreen(null); run.choose(n); };
  for (const layer of layers) for (const n of layer) {
    const info = infoOf(n), b = document.createElement('button'), [x, y] = pos(n);
    b.className = 'node' + (n.id === run.node.id ? ' current' : run.visited.includes(n.id) ? ' visited' : ids.has(n.id) ? ' choice' : '') + (n.key === 'final' ? ' final' : '');
    b.style.left = x + '%'; b.style.top = y + '%'; b.style.setProperty('--c', info.color);
    b.innerHTML = `<b>${info.glyph}</b>`; b.setAttribute('aria-label', info.label);
    if (ids.has(n.id)) b.onclick = () => pickNode(n); else b.tabIndex = -1;
    area.appendChild(b);
  }
  const bar = $('map-choices'); bar.innerHTML = '';
  for (const n of choices) {
    const info = infoOf(n), b = document.createElement('button'); b.className = 'route'; b.style.setProperty('--c', info.color);
    b.innerHTML = `<b>${info.glyph}</b><span><strong>${esc(info.label)}</strong><small>${esc(info.desc || '')}</small></span>`;
    b.onclick = () => pickNode(n); bar.appendChild(b);
  }
  $('map-stats').innerHTML = `<span>Sala <b>${run.node.layer + 1}</b>/${run.total}</span><span class="c-life"><b>${game.kay.hp}</b>/${game.maxHp()} vida</span><span class="c-loot"><b>${run.materials}</b> Liga</span><span class="c-cube"><b>${run.cubes}</b> Cubos</span>`;
  bar.querySelector('button')?.focus({ preventScroll: true });
}

// botão de habilidade: preenchimento progressivo da recarga + segundos restantes
function skillHud() {
  const c = game.comp, b = $('btn-skill'); if (!c) return;
  b.style.setProperty('--cd', c.cdFrac.toFixed(3));
  b.classList.toggle('ready', c.ready);
  $('skill-cd').textContent = c.ready ? 'pronta' : Math.ceil(c.cd) + ' s';
}

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
game.ui = ui;
$('btn-interact').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); game.run.trySync(); });
// início da incursão: escolher a companheira (uma por incursão)
function restart() {
  game.mode = 'select'; input.clear(); hideOverlay(); $('bossbar').hidden = true; ui.interact(null);
  const sel = settings.companion || 'brogume';
  cards($('select-cards'), Object.entries(CFG.companions).map(([key, c]) => ({ key, ...c, tag: c.element, foot: `Recarga ${c.cooldown} s`, selected: key === sel })), startRun);
  showScreen('select');
  $('select-cards').querySelector('.selected')?.focus({ preventScroll: true });
}
function startRun(kind) {
  settings.companion = kind; saveSettings();
  showScreen(null); hideOverlay(); input.clear();
  game.mods = {}; game.kay.reset(); game.time = 0; game.hitstop = 0;
  renderHearts();
  game.comp?.destroy(); game.comp = new Companion(kind, game);
  const c = CFG.companions[kind], b = $('btn-skill');
  b.style.setProperty('--sc', c.color); $('skill-glyph').textContent = c.glyph; $('skill-name').textContent = c.name;
  b.setAttribute('aria-label', `Habilidade de ${c.name}`);
  game.run.start(); ui.materials(0); renderBoons(); game.comp.placeNearKay();
  game.mode = 'play';
}
function pause() {
  if (game.mode !== 'play' && game.mode !== 'countdown') return;
  game.mode = 'paused'; input.clear();
  overlay('Pausa', '<p class="keys"><span>Joystick</span> mover · <span>Ataque</span> combo · <span>Esquiva</span> · <span>Habilidade</span> companheira<br>Teclado: WASD · J · K/Espaço · L · Esc</p>', [
    ['Continuar', resume, 'primary'],
    ['Recomeçar incursão', restart, 'ghost'],
    ['Efeitos reduzidos', () => { settings.reduceFx = !settings.reduceFx; saveSettings(); game.mode = 'play'; pause(); }, 'toggle' + (settings.reduceFx ? ' on' : ''), settings.reduceFx ? 'Ligado' : 'Desligado'],
    ['Mostrar FPS', () => { settings.showFps = !settings.showFps; $('fps').hidden = !settings.showFps; saveSettings(); game.mode = 'play'; pause(); }, 'toggle' + (settings.showFps ? ' on' : ''), settings.showFps ? 'Ligado' : 'Desligado'],
  ], `Sala ${game.run.node ? game.run.node.layer + 1 : 1} de ${game.run.total}`);
}
function resume() {
  if (game.mode !== 'paused' || document.body.classList.contains('portrait')) return;
  hideOverlay(); input.clear();
  game.mode = 'countdown'; game.countT = 0.9;      // breve contagem antes de reativar perigos
}
function lose() {
  game.mode = 'lost'; ui.interact(null);
  setTimeout(() => result('Kay caiu', 'Derrota', false), 800);
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
  game.comp?.update(dt, input);
  game.effects = game.effects.filter(e => e.update(dt));
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
  const r = game.run.room, lookDoors = r.clear && !r.final && a.doors.some(d => d.side === 'top') ? 3 : 0;   // sala limpa: puxa a câmera para as portas
  // luta com o Guardião: enquadra Kay e o chefe juntos
  const boss = game.enemies.find(e => e.boss && e.state !== 'dying');
  const fx_ = boss ? game.kay.pos.x * 0.55 + boss.pos.x * 0.45 : game.kay.pos.x, fz = boss ? game.kay.pos.z * 0.55 + boss.pos.z * 0.45 : game.kay.pos.z - lookDoors;
  return [T.MathUtils.clamp(fx_, -hx, hx), T.MathUtils.clamp(fz, -hz - 1.8, hz)];
}
function snapCamera() { const [x, z] = camTarget(); camAt.set(x, 0, z); cam.position.copy(camAt).add(camOff); cam.lookAt(camAt); }
function updateCamera(dt) {
  if (!game.arena) return;
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
  if (game.arena && game.mode !== 'paused') game.arena.update(dt, performance.now() / 1000, camAt);
  renderer.render(scene, cam);
  placeLabels();
  skillHud();
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
