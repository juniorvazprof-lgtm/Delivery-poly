// MVP 0 — arena de ação. Simulação em passo fixo; pausa e perda de foco congelam tudo antes de processar dano.
import * as T from '../lib/three.js';
import { CFG } from './config.js';
import { createInput } from './input.js';
import { Run } from './run.js';
import { Companion } from './companion.js';
import { Kay } from './kay.js';
import { Fx, COL } from './fx.js';
import { Hub } from './hub.js';
import { spawnDrops } from './drops.js';
import { loadSave, writeSave, resetSave } from './save.js';

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
  place: 'hub', save: loadSave(), hubDrops: [],
  collect(kind, n) { if (game.place === 'run') game.run.add(kind, n); else { game.save.bank[kind] = (game.save.bank[kind] || 0) + n; ui.materials(game.save.bank); persist(); } },
  onBreak(b) { if (game.place === 'run') game.run.onBreak(b); else hubBreak(b); },
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

const tags = [];
// etiqueta presa a um ponto do mundo (portas, portal, nomes das Ressonas)
function addTag(glyph, label, color, at, cls = '') {
  const el = document.createElement('div'); el.className = 'door-label ' + cls;
  el.innerHTML = `${glyph ? `<b>${glyph}</b>` : ''}${esc(label)}`; el.style.setProperty('--c', color);
  $('labels').appendChild(el); tags.push({ el, at });
}
let toastTimer = 0;
const ui = {
  objective() { $('objective').textContent = game.place === 'hub' ? `Kanda-9 · Dia ${game.save.day} · terreno limpo ${game.hub.clearedPct}%` : game.run.status(); },
  materials(m) {
    for (const k of Object.keys(CFG.mats)) { const el = $('m-' + k); if (!el) continue; const v = m[k] || 0; if (el.querySelector('b').textContent !== String(v)) { el.querySelector('b').textContent = v; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } el.hidden = !v && k !== 'liga'; }
  },
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
  addDoor(door) { addTag(door.info.glyph, door.info.label, door.info.color, () => [door.x, 2.1, door.z]); },
  clearDoors() { tags.forEach(d => d.el.remove()); tags.length = 0; },
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
  const s = game.run.summary(), kept = bankRun(won), names = s.rescued.map(k => CFG.companions[k].name);
  const matRow = Object.entries(CFG.mats).filter(([k]) => s.mats[k]).map(([k, m]) => `<span style="--c:${m.color}"><b>${kept[k]}</b>${won ? '' : `<small>/${s.mats[k]}</small>`} ${m.short}</span>`).join('') || '<span>Nenhum material</span>';
  overlay(title, `<dl class="stats">
    <div><dt>Salas</dt><dd>${s.rooms}<small> / ${game.run.total}</small></dd></div>
    <div><dt>Tempo</dt><dd>${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, '0')}</dd></div>
    <div><dt>Ressonas</dt><dd>${names.length}</dd></div>
    <div><dt>Dia</dt><dd>${game.save.day}</dd></div>
  </dl>
  <p class="note">Levado ao refúgio:</p><div class="mats-row">${matRow}</div>
  <p class="note">${names.length ? `Sincronizadas: ${esc(names.join(', '))}. Elas vão morar no refúgio.` : 'Nenhuma Ressona sincronizada nesta incursão.'}${won ? '' : ' Na derrota, metade dos materiais se perde.'}</p>`,
  [['Voltar ao refúgio', () => goHub(true), 'primary']], eyebrow);
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
  $('map-stats').innerHTML = `<span>Sala <b>${run.node.layer + 1}</b>/${run.total}</span><span class="c-life"><b>${game.kay.hp}</b>/${game.maxHp()} vida</span><span class="c-loot"><b>${run.mats.liga}</b> Liga</span><span class="c-cube"><b>${run.mats.cristal}</b> Cristal</span><span class="c-cube"><b>${run.cubes}</b> Cubos</span>`;
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
  for (const { el, at } of tags) {
    v.set(...at()).project(cam);
    const x = T.MathUtils.clamp((v.x * 0.5 + 0.5) * innerWidth, 70, innerWidth - 70), y = T.MathUtils.clamp((-v.y * 0.5 + 0.5) * innerHeight, 100, innerHeight - 20);
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }
}

// ---------- fluxo ----------
game.run = new Run(game, ui);
game.ui = ui;
$('select-back').addEventListener('click', backToHub);
$('btn-interact').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); game.run.trySync(); });
// ---------- refúgio ----------
let saveWarned = false;
function persist() { if (!writeSave(game.save) && !saveWarned) { saveWarned = true; ui.toast('Não foi possível salvar neste navegador', COL.threat); } }
function cleanupScene() {
  game.enemies.forEach(e => e.destroy()); game.enemies = [];
  game.projectiles.forEach(p => scene.remove(p.mesh)); game.projectiles = [];
  game.effects.forEach(e => scene.remove(e.group)); game.effects = [];
  game.run.drops?.forEach(d => d.remove()); game.run.drops = [];
  game.hubDrops.forEach(d => d.remove()); game.hubDrops = [];
  game.comp?.destroy(); game.comp = null;
  fx.clear(); ui.clearDoors(); ui.interact(null); $('bossbar').hidden = true;
  game.arena?.dispose(); game.arena = null; game.hub = null;
}
function goHub(fromRun = false) {
  cleanupScene(); hideOverlay(); showScreen(null); input.clear();
  game.place = 'hub'; document.body.classList.add('in-hub');
  game.mods = {}; game.kay.reset(); renderHearts();
  game.hub = game.arena = new Hub(scene, game.save, settings.reduceFx);
  if (fromRun) { game.kay.pos.set(0, 0, game.hub.portal.z + 2.4); game.kay.face = 0; } else game.kay.pos.set(0, 0, 1.2);
  addTag('✦', 'Fenda Verde', '#b77bff', () => [game.hub.portal.x, 2.6, game.hub.portal.z]);
  for (const r of game.hub.ressonas) addTag('', r.label, CFG.companions[r.data.species]?.color || '#9be7f2', () => [r.pos.x, 1.15, r.pos.z], 'small');
  ui.materials(game.save.bank); ui.objective(); snapCamera();
  game.mode = 'play';
}
// entulho limpo: sucata e, às vezes, fibra, sementes ou cristal
function hubBreak(b) {
  const d = CFG.hub.debris[b.kind], bundle = { ...d.drop };
  if (d.seedChance && Math.random() < d.seedChance) bundle.semente = 1;
  if (d.cristalChance && Math.random() < d.cristalChance) bundle.cristal = 1;
  spawnDrops(game, game.hubDrops, new T.Vector3(b.x, 0, b.z), bundle);
  if (b.id && !game.save.cleared.includes(b.id)) { game.save.cleared.push(b.id); persist(); }
  const pct = game.hub.clearedPct;
  if (pct === 100) ui.toast('O terreno está todo limpo', COL.friend);
  else if (pct % 25 < 5 && pct >= 25 && !game.hub['m' + Math.floor(pct / 25)]) { game.hub['m' + Math.floor(pct / 25)] = 1; ui.toast(`Terreno ${pct}% limpo`, COL.friend); }
  ui.objective();
}
// portal: escolher a companheira e partir
function enterFenda() {
  game.mode = 'select'; input.clear();
  const sel = settings.companion || 'brogume';
  cards($('select-cards'), Object.entries(CFG.companions).map(([key, c]) => ({ key, ...c, tag: c.element, foot: `Recarga ${c.cooldown} s`, selected: key === sel })), startRun);
  showScreen('select');
  $('select-cards').querySelector('.selected')?.focus({ preventScroll: true });
}
function backToHub() { showScreen(null); game.mode = 'play'; game.hub.portalArmed = false; input.clear(); }
function restart() { goHub(false); }
function startRun(kind) {
  settings.companion = kind; saveSettings();
  cleanupScene(); showScreen(null); hideOverlay(); input.clear();
  game.place = 'run'; document.body.classList.remove('in-hub');
  game.mods = {}; game.kay.reset(); game.time = 0; game.hitstop = 0;
  renderHearts();
  game.comp = new Companion(kind, game);
  const c = CFG.companions[kind], b = $('btn-skill');
  b.style.setProperty('--sc', c.color); $('skill-glyph').textContent = c.glyph; $('skill-name').textContent = c.name;
  b.setAttribute('aria-label', `Habilidade de ${c.name}`);
  game.run.start(); ui.materials(game.run.mats); renderBoons(); game.comp.placeNearKay();
  game.mode = 'play';
}
// fim da incursão: guarda no refúgio o que foi trazido e avança um dia
function bankRun(won) {
  const s = game.run.summary(), sv = game.save, kept = {};
  for (const [k, v] of Object.entries(s.mats)) { kept[k] = won ? v : Math.floor(v * CFG.lossKeep); sv.bank[k] = (sv.bank[k] || 0) + kept[k]; }
  for (const sp of s.rescued) sv.ressonas.push({ id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 99), species: sp, name: CFG.companions[sp].name, day: sv.day });
  sv.day++; sv.runs++; if (won) sv.wins++;
  persist();
  return kept;
}
function pause() {
  if (game.mode !== 'play' && game.mode !== 'countdown') return;
  game.mode = 'paused'; input.clear();
  overlay('Pausa', '<p class="keys"><span>Joystick</span> mover · <span>Ataque</span> combo · <span>Esquiva</span> · <span>Habilidade</span> companheira<br>Teclado: WASD · J · K/Espaço · L · Esc</p>', [
    ['Continuar', resume, 'primary'],
    game.place === 'run'
      ? ['Abandonar incursão', () => { hideOverlay(); game.mode = 'lost'; result('Incursão abandonada', 'Retorno', false); }, 'ghost', 'Metade dos materiais se perde']
      : ['Apagar progresso', confirmReset, 'ghost', 'Recomeça o refúgio do zero'],
    ['Efeitos reduzidos', () => { settings.reduceFx = !settings.reduceFx; saveSettings(); game.mode = 'play'; pause(); }, 'toggle' + (settings.reduceFx ? ' on' : ''), settings.reduceFx ? 'Ligado' : 'Desligado'],
    ['Mostrar FPS', () => { settings.showFps = !settings.showFps; $('fps').hidden = !settings.showFps; saveSettings(); game.mode = 'play'; pause(); }, 'toggle' + (settings.showFps ? ' on' : ''), settings.showFps ? 'Ligado' : 'Desligado'],
  ], game.place === 'run' ? `Sala ${game.run.node ? game.run.node.layer + 1 : 1} de ${game.run.total}` : `Kanda-9 · Dia ${game.save.day}`);
}
function confirmReset() {
  overlay('Apagar todo o progresso?', 'Materiais, Ressonas resgatadas e o terreno limpo voltam ao início. Não dá para desfazer.', [
    ['Cancelar', () => { game.mode = 'play'; pause(); }, 'primary'],
    ['Apagar e recomeçar', () => { game.save = resetSave(); goHub(false); }, 'risk'],
  ], 'Refúgio');
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
  if (game.place === 'hub') {   // refúgio: sem inimigos
    k.update(dt, game, input);
    game.hubDrops.forEach(d => d.update(dt, false)); game.hubDrops = game.hubDrops.filter(d => d.alive);
    fx.update(dt);
    if (game.mode === 'play' && game.hub.atPortal(k.pos)) enterFenda();
    return;
  }
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
  if (game.place === 'hub') return [T.MathUtils.clamp(game.kay.pos.x, -hx, hx), T.MathUtils.clamp(game.kay.pos.z, -hz - 1.2, hz)];
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
window.__rz = { game, CFG, pause, resume, restart, goHub, startRun };
