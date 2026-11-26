// Vlog 9:16 gravado pela própria capivara, clipes no IndexedDB.
// (módulo 16/20 da Capivara Explora)
import * as THREE from 'three';
import { $, esc, state } from '../core/config.js';
import { scene } from '../engine/scene.js';
import { capy } from '../capy/capybara.js';

// ---------------------------------------------------------------------
// VLOG: ela mesma grava, pela câmera na cabeça, em vídeo vertical 9:16.
// Um segundo renderizador (360x640) desenha o ponto de vista da GoPro; um canvas 2D
// por cima põe "REC", data e a narração; o MediaRecorder grava esse canvas.
// Os clipes ficam no IndexedDB deste aparelho (aba 🎬 Vlog).
// ---------------------------------------------------------------------
const VW = 360, VH = 640;
const vlogGL = document.createElement('canvas'); vlogGL.width = VW; vlogGL.height = VH;
const vlogComp = document.createElement('canvas'); vlogComp.width = VW; vlogComp.height = VH;
const vctx = vlogComp.getContext('2d');
const vlogCam = new THREE.PerspectiveCamera(88, VW / VH, 0.05, 150);
const qFlip = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, Math.PI, 0));
let vlogRenderer = null;
const rec = { on: false, stopping: false, recorder: null, chunks: [], narr: '', fim: '', t0: 0, until: 0, last: 0, thumb: null, meta: null };
const VLOG_MIME = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  .find(m => window.MediaRecorder?.isTypeSupported?.(m));
function startClip(narr) {
  if (rec.on || !state.temCamera || !VLOG_MIME || !vlogComp.captureStream) return false;
  try {
    vlogRenderer ||= new THREE.WebGLRenderer({ canvas: vlogGL, antialias: false, preserveDrawingBuffer: true });
    vlogRenderer.setPixelRatio(1); vlogRenderer.setSize(VW, VH, false);
    const stream = vlogComp.captureStream(24);
    rec.recorder = new MediaRecorder(stream, { mimeType: VLOG_MIME, videoBitsPerSecond: 1500000 });
  } catch (e) { console.warn('vlog indisponível', e); return false; }
  rec.chunks = []; rec.narr = narr || ''; rec.fim = ''; rec.thumb = null;
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  rec.meta = { dia: state.day, t: `Dia ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
  rec.recorder.ondataavailable = e => e.data.size && rec.chunks.push(e.data);
  rec.recorder.onstop = () => {
    const blob = new Blob(rec.chunks, { type: VLOG_MIME.split(';')[0] });
    saveClip({ id: Date.now(), ...rec.meta, narr: rec.narr, fim: rec.fim, thumb: rec.thumb, blob });
  };
  rec.recorder.start(500);
  rec.on = true; rec.stopping = false; rec.t0 = performance.now(); rec.until = rec.t0 + 20000; rec.last = 0;
  vlogCam.position.copy(capy.pos).add(new THREE.Vector3(0, 1.2, 0));
  $('hud-rec').hidden = false;
  return true;
}
// termina a gravação 2 s depois do fim da ação, mostrando o que aconteceu
function endClip(resultado) {
  if (!rec.on || rec.stopping) return;
  rec.stopping = true;
  rec.fim = (resultado || '').split(/(?<=[.!?])\s/)[0].slice(0, 110);
  setTimeout(() => { if (rec.on) { rec.recorder.stop(); rec.on = false; $('hud-rec').hidden = true; } }, 2200);
}
const tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3(), tmpE = new THREE.Euler();
function wrapText(text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (vctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function renderVlogFrame(now) {
  if (!rec.on) return;
  if (now > rec.until) endClip('');
  if (now - rec.last < 1000 / 24) return;
  rec.last = now;
  // câmera presa na cabeça: segue cada movimento (balança andando, olha pra baixo comendo)
  const head = capy.parts.head; head.updateWorldMatrix(true, false);
  head.localToWorld(tmpP.set(0, 0.42, 0.3));   // logo à frente da lente
  head.getWorldQuaternion(tmpQ).multiply(qFlip);
  tmpE.setFromQuaternion(tmpQ, 'YXZ'); tmpE.z *= 0.35; tmpQ.setFromEuler(tmpE);   // estabilização: corta 65% da inclinação lateral
  vlogCam.position.lerp(tmpP, 0.6); vlogCam.quaternion.slerp(tmpQ, 0.45);
  vlogRenderer.render(scene, vlogCam);
  vctx.drawImage(vlogGL, 0, 0);
  // sobreposição estilo vlog
  vctx.textBaseline = 'top';
  if (Math.floor((now - rec.t0) / 500) % 2 === 0) { vctx.fillStyle = '#ff3b3b'; vctx.beginPath(); vctx.arc(26, 30, 8, 0, 7); vctx.fill(); }
  vctx.font = '800 17px system-ui, sans-serif'; vctx.fillStyle = '#fff'; vctx.shadowColor = 'rgba(0,0,0,.6)'; vctx.shadowBlur = 4;
  vctx.fillText('REC', 40, 21);
  const ts = rec.meta.t.toUpperCase(); vctx.fillText(ts, VW - 16 - vctx.measureText(ts).width, 21);
  vctx.shadowBlur = 0;
  const texto = rec.stopping && rec.fim ? rec.fim : rec.narr;
  if (texto) {
    vctx.font = (rec.stopping && rec.fim ? 'italic 600 ' : '700 ') + '19px system-ui, sans-serif';
    const lines = wrapText(texto, VW - 56), lh = 25, boxH = lines.length * lh + 20, y0 = VH - 70 - boxH;
    vctx.fillStyle = 'rgba(15,17,30,.62)'; vctx.beginPath();
    if (vctx.roundRect) vctx.roundRect(16, y0, VW - 32, boxH, 14); else vctx.rect(16, y0, VW - 32, boxH);   // Safari < 16 não tem roundRect
    vctx.fill();
    vctx.fillStyle = rec.stopping && rec.fim ? '#ffe39a' : '#fff';
    lines.forEach((l, i) => vctx.fillText(l, 28, y0 + 10 + i * lh));
  }
  if (!rec.thumb && now - rec.t0 > 600) rec.thumb = vlogComp.toDataURL('image/jpeg', 0.6);
}
// ---- armazenamento dos clipes (IndexedDB) ----
const idb = (() => {
  let dbp = null;
  const open = () => dbp ||= new Promise((res, rej) => { const r = indexedDB.open('capivara_vlog', 1); r.onupgradeneeded = () => r.result.createObjectStore('clipes', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('clipes', mode), st = t.objectStore('clipes'); const out = fn(st); t.oncomplete = () => res(out?.result); t.onerror = () => rej(t.error); }); };
  return { put: c => tx('readwrite', st => st.put(c)), all: () => tx('readonly', st => st.getAll()), del: id => tx('readwrite', st => st.delete(id)), clear: () => tx('readwrite', st => st.clear()) };
})();
let clipes = [];
async function saveClip(c) {
  try {
    await idb.put(c);
    clipes = (await idb.all()).sort((a, b) => a.id - b.id);
    while (clipes.length > 24) { await idb.del(clipes[0].id); clipes.shift(); }
  } catch (e) { console.warn('não deu para salvar o clipe', e); clipes.push(c); }
  renderVlog();
}
const urls = new Map();
const clipUrl = c => urls.get(c.id) || (urls.set(c.id, URL.createObjectURL(c.blob)), urls.get(c.id));
function renderVlog() {
  const el = $('vlog-list');
  if (!clipes.length) {
    el.innerHTML = `<p class="hint">${!VLOG_MIME ? 'Este navegador não consegue gravar vídeo.' : state.temCamera ? 'Ela ainda não gravou nenhum momento. Quando achar algo que vale mostrar, ela mesma liga a câmera.' : 'Quando ela pegar a câmera, poderá gravar a própria vida para o vlog.'}</p>`;
    return;
  }
  const dias = [...new Set(clipes.map(c => c.dia))].sort((a, b) => b - a);
  el.innerHTML = dias.map(d => {
    const cs = clipes.filter(c => c.dia === d);
    return `<section class="vday"><div class="vhead"><h4>Dia ${d} · ${cs.length} ${cs.length > 1 ? 'clipes' : 'clipe'}</h4><button data-dia="${d}">Assistir o dia</button></div>
      ${cs.map(c => `<div class="clip"><img src="${c.thumb || ''}" alt="" data-id="${c.id}"><div><b>${esc(c.t)}</b><p>${esc(c.narr || '')}</p>
      <button class="dl" data-dl="${c.id}">Baixar vídeo</button></div></div>`).join('')}</section>`;
  }).join('');
}
// player: toca um clipe ou o dia inteiro em sequência
let fila = [];
function tocar(lista) {
  fila = lista.slice(); if (!fila.length) return;
  $('player').classList.remove('hidden'); proximo();
}
function proximo() {
  const c = fila.shift(); const v = $('player-video');
  if (!c) { $('player').classList.add('hidden'); v.pause(); return; }
  v.src = clipUrl(c); v.play().catch(() => {});
}
// Baixar: no claude.ai usa o recurso de download do artifact; fora dele, o download comum do navegador
let downloadsP = null;
async function baixarClipe(c, btn) {
  if (!c) return;
  const ext = c.blob.type.includes('mp4') ? 'mp4' : 'webm', filename = `capivara-dia${c.dia}-${c.id}.${ext}`;
  downloadsP ||= window.claude?.use ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
  const dl = await downloadsP;
  if (dl) {
    try { await dl.save({ filename, data: c.blob }); btn.textContent = 'Salvo'; }
    catch (e) { btn.textContent = e?.code === 'declined' ? 'Baixar vídeo' : 'Não foi possível salvar aqui'; }
    return;
  }
  const a = document.createElement('a'); a.href = clipUrl(c); a.download = filename; document.body.append(a); a.click(); a.remove();
}
function initVlogUI() {
  $('player-video').onended = proximo;
  $('player').onclick = e => { if (e.target.id === 'player') { fila = []; proximo(); } };
  $('vlog-list').onclick = e => {
    const d = e.target.dataset.dia, id = e.target.dataset.id;
    if (d) tocar(clipes.filter(c => c.dia === +d));
    if (id) tocar(clipes.filter(c => c.id === +id));
    if (e.target.dataset.dl) baixarClipe(clipes.find(c => c.id === +e.target.dataset.dl), e.target);
  };
  idb.all().then(cs => { clipes = (cs || []).sort((a, b) => a.id - b.id); renderVlog(); }).catch(() => renderVlog());
}

export { endClip, idb, initVlogUI, rec, renderVlogFrame, startClip };
