// Interface: log, abas, barras, botões, configurações e HUD.
// (módulo 19/20 da Capivara Explora)
import * as THREE from 'three';
import { G, H } from '../core/runtime.js';
import { $, CFG_KEY, PROVIDERS, SAVE_KEY, cfg, confianca, esc, icon, isNight, pick, state } from '../core/config.js';
import { camera, stageEl } from '../engine/scene.js';
import { TYPES } from '../world/types.js';
import { MK, addObject } from '../world/objects.js';
import { cellCenter, cellOf, isFree, nearestFree } from '../world/pathfinding.js';
import { capy } from '../capy/capybara.js';
import { raining } from '../world/simulation.js';
import { callAI, cap, nomeDe } from '../brain/brain.js';
import { fotos } from '../features/camera.js';
import { idb, rec } from '../features/vlog.js';
import { apiErro, brainState, brainStatus } from '../brain/loop.js';
import { audio, startAudio } from '../features/audio.js';

// ---------------------------------------------------------------------
// 6. INTERFACE
// ---------------------------------------------------------------------
const emojiEl = $('emoji');
let emojiUntil = 0, zoomUntil = 0;

function showEmoji(e) {
  emojiEl.textContent = e; emojiEl.classList.remove('pop'); void emojiEl.offsetWidth; emojiEl.classList.add('pop');
  emojiUntil = performance.now() + 2000;
}
function showThought(dec, fonte) {
  showEmoji(dec.emoji);
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  const entry = { t: `Dia ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, ...dec, fonte };
  state.log.push(entry); state.log = state.log.slice(-40);
  renderLog(true);
}
let typingTimer = null;
function renderLog(animateLatest) {
  const log = $('log'); log.innerHTML = '';
  const items = state.log.slice(-25).reverse();
  items.forEach((e, i) => {
    const div = document.createElement('div');
    div.className = 'entry' + (i === 0 ? ' latest' : '');
    const meta = document.createElement('div'); meta.className = 'meta';
    if (e.diario) div.classList.add('diary');
    if (e.pc) div.classList.add('pc');
    meta.textContent = e.diario ? e.t : `${e.t} · ${e.acao.replace('_', ' ')}${e.alvo ? ' · ' + nomeDe(e.alvo.replace(/_\d+$/, '')) : ''}`;
    const txt = document.createElement('div'); txt.textContent = i === 0 && animateLatest ? '' : e.pensamento;
    div.append(meta, txt);
    if (e.aprendizado) { const l = document.createElement('div'); l.className = 'learn'; l.textContent = 'Aprendizado: ' + e.aprendizado; div.append(l); }
    log.append(div);
    if (i === 0 && animateLatest) {   // efeito de digitação
      clearInterval(typingTimer); let k = 0; txt.classList.add('caret');
      typingTimer = setInterval(() => { k++; txt.textContent = e.pensamento.slice(0, k); if (k >= e.pensamento.length) { clearInterval(typingTimer); txt.classList.remove('caret'); } }, 28);
    }
  });
  log.parentElement.scrollTop = 0;
}
function renderMemory() {
  $('mem-list').innerHTML = state.aprendizados.length ? state.aprendizados.map(a => `<li>${esc(a)}</li>`).join('') : '<li><i>Ainda não aprendeu nada...</i></li>';
  $('disc-list').innerHTML = state.descobertas.map(d => `<span class="chip">${icon('paw')}${esc(d.split('|')[1] || d)}</span>`).join('');
  // crenças com nível de confiança
  const cr = Object.entries(state.crencas).filter(([k]) => TYPES[k.split(':')[1]]);
  $('belief-list').innerHTML = cr.length ? cr.map(([k, c]) => {
    const [a, t] = k.split(':'), conf = confianca(c), label = conf > 0.6 ? 'bom' : conf < 0.4 ? 'ruim' : 'incerto';
    const quem = k === 'perto:jacare' ? `chegar perto de ${nomeDe('jacare')}` : k === 'necessidades:coco' ? 'fazer as necessidades' : `${a.replace('_', ' ')} ${nomeDe(t)}`;
    return `<div class="belief"><div class="lbl"><span>${esc(cap(quem))}</span><span class="tag ${label}">${label} · ${c.bom + c.ruim}x</span></div>
      <div class="track"><div class="fill" style="width:${Math.round(conf * 100)}%;background:${conf > 0.6 ? 'var(--good)' : conf < 0.4 ? 'var(--alert)' : 'var(--ochre)'}"></div></div></div>`;
  }).join('') : '<i>Ainda não tem experiências suficientes.</i>';
}
function renderPhotos() {
  $('photo-grid').innerHTML = fotos.length ? fotos.slice().reverse().map((f, i) => `<figure data-i="${fotos.length - 1 - i}"><img src="${f.url}" alt="${esc(f.legenda)}"><figcaption><b>${esc(f.t)}</b> ${esc(f.legenda)}</figcaption></figure>`).join('')
    : `<p class="hint">${state.temCamera ? 'Ela ainda não guardou nenhuma imagem.' : 'Existe uma coisinha preta com um olho de vidro perto das flores. Quando ela pegar, as fotos aparecem aqui.'}</p>`;
}
$('photo-grid').onclick = e => {
  const f = fotos[e.target.closest('figure')?.dataset.i]; if (!f) return;
  $('lb-img').src = f.url; $('lb-cap').textContent = `${f.t} · ${f.legenda}`; $('lightbox').classList.remove('hidden');
};
$('lightbox').onclick = () => $('lightbox').classList.add('hidden');
function renderDiary() {
  $('diary-list').innerHTML = state.diario.length ? state.diario.slice().reverse().map(d => `<article class="page"><h4>Dia ${d.dia}</h4><p>${esc(d.texto)}</p></article>`).join('')
    : '<i>O diário é escrito ao anoitecer de cada dia (por volta das 19h no relógio do jogo).</i>';
}

// Descobertas: registradas na aba Memória (sem aviso sobre o personagem); zoom leve na câmera
function discover(key, label) {
  if (state.descobertas.some(d => d.startsWith(key + '|'))) return;
  state.descobertas.push(key + '|' + label);
  if (!key.startsWith('ver:')) zoomUntil = performance.now() + 3500;
  renderMemory();
}

// Barras de status
const BARS = [['fome', 'Fome', true, 'berry'], ['sede', 'Sede', true, 'drop'], ['energia', 'Energia', false, 'bolt'], ['humor', 'Humor', false, 'smile'], ['frio', 'Frio', true, 'snow'], ['bexiga', 'Necessidade', true, 'bush'], ['tedio', 'Tédio', true, 'spiral']];
$('bars').innerHTML = BARS.map(([k, l, , ic]) => `<div class="bar"><div class="lbl"><span>${icon(ic)}${l}</span><span id="v-${k}"></span></div><div class="track"><div class="fill" id="f-${k}"></div></div></div>`).join('');
function renderBars() {
  for (const [k, , inverse] of BARS) {
    const v = state.stats[k], good = inverse ? 100 - v : v;
    $('v-' + k).textContent = Math.round(v);
    const f = $('f-' + k); f.style.width = v + '%';
    f.style.background = good > 60 ? 'var(--good)' : good > 30 ? 'var(--ochre)' : 'var(--alert)';
  }
  $('brain-info').textContent = `${brainStatus.replace(/^\S+\s/, '')}${G.gameTime < G.sickUntil ? ' · enjoada' : ''}${raining ? ' · chovendo' : ''}`;
}

// Abas
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + b.dataset.tab));
});
// Botões
$('btn-sound').onclick = () => {
  if (!audio.ctx) startAudio();
  audio.on = !audio.on; audio.ctx.resume();
  $('btn-sound').innerHTML = icon(audio.on ? 'sound' : 'mute'); $('btn-sound').classList.toggle('on', audio.on);
};
$('btn-pause').onclick = () => { G.paused = !G.paused;
  if (rec.on && rec.recorder?.state !== 'inactive') G.paused ? rec.recorder.pause() : rec.recorder.resume();   // a gravação pausa junto
  $('btn-pause').innerHTML = icon(G.paused ? 'play' : 'pause'); $('btn-pause').classList.toggle('on', G.paused); };
$('btn-speed').onclick = () => { G.timeScale = G.timeScale === 1 ? 2 : 1; $('btn-speed').textContent = G.timeScale + '×'; $('btn-speed').classList.toggle('on', G.timeScale === 2); };
$('btn-hide').onclick = () => { $('app').classList.add('clean'); setTimeout(H.resize, 450); };
$('btn-show').onclick = () => { $('app').classList.remove('clean'); setTimeout(H.resize, 450); };
// Reset com confirmação na própria tela (toque duas vezes em 3 s)
let resetArmed = 0;
const resetWorld = e => {
  const btn = e.currentTarget;
  if (performance.now() - resetArmed < 3000) { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem('capivara_explora_fotos'); idb.clear(); } catch {} location.reload(); return; }
  resetArmed = performance.now(); const old = btn.innerHTML;
  if (btn.id === 'btn-reset') { btn.classList.add('armed'); btn.title = 'Toque de novo para apagar tudo'; } else btn.textContent = 'Toque de novo para apagar tudo';
  setTimeout(() => { btn.innerHTML = old; btn.classList.remove('armed'); }, 3000);
};
$('cfg-reset').onclick = resetWorld;
if ($('btn-reset')) $('btn-reset').onclick = resetWorld;   // o reset fica nas configurações
$('btn-surprise').onclick = () => {
  const kind = pick(['melancia', 'bola', 'caixa']);
  const maker = MK[kind];
  const fwd = new THREE.Vector3(Math.sin(capy.yaw), 0, Math.cos(capy.yaw));
  let p = capy.pos.clone().addScaledVector(fwd, 3.5);
  if (!isFree(p)) { const [i, j] = nearestFree(...cellOf(p)); p = cellCenter(i, j); }
  const o = addObject(kind, p.x, p.z, maker);
  o.mesh.position.y += 4; o.drop = true;   // cai do céu
  showEmoji('😮');
};
// Configurações
// Ao trocar o seletor, mostra a chave/modelo do provedor escolhido
let cfgShown = cfg.mode;
function fillCfgFields() {
  const m = $('cfg-mode').value, ia = m !== 'offline';
  $('cfg-ia').style.display = ia ? 'block' : 'none';
  if (ia) { $('cfg-key').value = cfg.keys[m] || ''; $('cfg-model').value = cfg.models[m]; $('cfg-key-lbl').textContent = `Chave da API do ${PROVIDERS[m]}`; }
  cfgShown = m;
}
function readCfgFields() { if (cfgShown !== 'offline') { cfg.keys[cfgShown] = $('cfg-key').value.trim(); cfg.models[cfgShown] = $('cfg-model').value.trim() || cfg.models[cfgShown]; } }
$('cfg-test').onclick = async () => {
  readCfgFields();
  const m = $('cfg-mode').value, out = $('cfg-test-res');
  if (m === 'offline') { out.textContent = 'O modo offline não usa chave.'; return; }
  out.className = 'hint';
  if (!cfg.keys[m]) { out.className = 'hint err'; out.textContent = 'Cole uma chave primeiro.'; return; }
  out.textContent = `Testando ${PROVIDERS[m]}...`;
  const prev = cfg.mode; cfg.mode = m; const t0 = performance.now();
  try {
    const r = await callAI('Responda apenas com JSON.', 'Responda {"ok": true}');
    out.className = r ? 'hint ok' : 'hint err';
    out.textContent = r ? `Funcionando: ${PROVIDERS[m]} respondeu em ${((performance.now() - t0) / 1000).toFixed(1)} s.` : 'Resposta vazia.';
  } catch (e) { out.className = 'hint err'; out.textContent = `${PROVIDERS[m]} não respondeu: ${apiErro(e)}.`; }
  finally { cfg.mode = prev; }
};
$('cfg-mode').onchange = () => { readCfgFields(); fillCfgFields(); };
$('btn-settings').onclick = () => { $('cfg-mode').value = cfg.mode; fillCfgFields(); $('settings').classList.remove('hidden'); };
$('cfg-close').onclick = () => {
  readCfgFields(); cfg.mode = $('cfg-mode').value;
  if (cfg.mode !== 'offline' && !cfg.keys[cfg.mode]) { $('cfg-warn').textContent = 'Cole uma chave da API ou escolha Offline.'; return; }
  $('cfg-warn').textContent = '';
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch {}
  $('settings').classList.add('hidden');
};

// Projeção 3D → tela para o emoji / balão / Zzz
const tmpV = new THREE.Vector3();
function placeOverlay(el, worldY, extraPx = 0) {
  tmpV.set(capy.pos.x, capy.root.position.y + worldY, capy.pos.z).project(camera);
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  el.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h - extraPx}px) translate(-50%, -100%)`;
}

// HUD
function renderHUD() {
  $('hud-day').querySelector('b').textContent = state.day;
  const prov = PROVIDERS[cfg.mode] || '';
  const hb = $('hud-brain'); hb.className = 'tag brain ' + brainState;
  hb.querySelector('span').textContent = brainState === 'ok' ? prov : brainState === 'falha' ? `${prov} falhando` : 'Offline';
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  const ic = raining ? 'rain' : isNight() ? 'moon' : (h < 7 || h > 17) ? 'dusk' : 'sun';
  const ht = $('hud-time'); ht.className = 'tag mono ' + (raining ? 'rain' : isNight() ? 'night' : '');
  if (ht.dataset.ic !== ic) { ht.dataset.ic = ic; ht.querySelector('use').setAttribute('href', '#i-' + ic); }
  ht.querySelector('span').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// acesso tardio para módulos carregados antes deste
Object.defineProperties(H, {
  discover: { get: () => discover },
  renderDiary: { get: () => renderDiary },
  renderLog: { get: () => renderLog },
  renderMemory: { get: () => renderMemory },
  renderPhotos: { get: () => renderPhotos },
  showEmoji: { get: () => showEmoji },
  showThought: { get: () => showThought },
});
export { emojiEl, emojiUntil, placeOverlay, renderBars, renderDiary, renderHUD, renderLog, renderMemory, renderPhotos, zoomUntil };
