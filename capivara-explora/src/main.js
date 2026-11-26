// =====================================================================
//  CAPIVARA EXPLORA — ponto de entrada
//  Uma capivara controlada por IA explora um mundo 3D procedural, aprende
//  com as consequências, tira fotos, pesquisa no computador e grava o próprio vlog.
//
//  Ordem de carregamento (cada módulo só importa os anteriores):
//   core/config      estado salvo, configuração, utilidades, semente
//   engine/scene     renderizador, cena, câmera, luzes
//   world/terrain    ruído, biomas, relevo, água          world/sky    chuva, estrelas, vaga-lumes
//   world/models     GLB do Blender + modelos de reserva   world/types  descrição visual + efeitos ocultos
//   world/objects    posiciona tudo no mapa                world/pathfinding  A*
//   capy/capybara    modelo, animação, movimento, pegadas  world/simulation  tempo, clima, metabolismo
//   brain/perception o que ela vê    brain/brain  IA + offline    brain/actions  executa as ações
//   features/computer · camera · vlog · audio              brain/loop  memória, diário e LOOP DE IA
//   ui/ui            interface    main  loop de render e início
//
//  Compartilhado (core/runtime.js):
//   G = variáveis que vários módulos alteram (G.paused, G.gameTime, G.timeScale...)
//   H = acesso a funções de módulos que carregam depois (H.showEmoji, H.sfx...)
// =====================================================================
import * as THREE from 'three';
import { G, H } from './core/runtime.js';
import { lerp, state } from './core/config.js';
import { camera, renderer, scene, stageEl } from './engine/scene.js';
import { heightAt } from './world/terrain.js';
import { TYPES } from './world/types.js';
import { objects } from './world/objects.js';
import { animateCapy, capy, groundY, moveCapy } from './capy/capybara.js';
import { updateWorld, waiters } from './world/simulation.js';
import { attachGoPro } from './features/camera.js';
import { initVlogUI, renderVlogFrame } from './features/vlog.js';
import { aiLoop } from './brain/loop.js';
import { updateAudio } from './features/audio.js';
import { emojiEl, emojiUntil, placeOverlay, renderBars, renderDiary, renderHUD, renderLog, renderMemory, renderPhotos, zoomUntil } from './ui/ui.js';
import './world/sky.js';
import './world/models.js';
import './world/pathfinding.js';
import './brain/perception.js';
import './brain/brain.js';
import './brain/actions.js';
import './features/computer.js';

// ---------------------------------------------------------------------
// LOOP DE RENDER
// ---------------------------------------------------------------------
function resize() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const camPos = new THREE.Vector3(0, 6, -8), camLook = new THREE.Vector3();
let camYaw = 0, last = performance.now(), uiTick = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = Math.min(0.05, (now - last) / 1000); last = now;
  const dt = G.paused ? 0 : realDt * G.timeScale;
  if (dt > 0) {
    G.gameTime += dt;
    for (let i = waiters.length - 1; i >= 0; i--) if (G.gameTime >= waiters[i].at) { waiters[i].r(); waiters.splice(i, 1); }
    if (G.animOverride && G.gameTime > G.animOverride.until) { if (capy.anim === G.animOverride.name) capy.anim = capy.path.length ? 'andar' : G.animOverride.prev; G.animOverride = null; }
    updateWorld(dt);
    moveCapy(dt);
    // objetos-surpresa caindo do céu
    for (const o of objects) if (o.drop) { o.mesh.position.y -= dt * 8; if (o.mesh.position.y <= o.pos.y) { o.mesh.position.y = o.pos.y; o.drop = false; } }
  }
  animateCapy(dt);
  capy.root.position.set(capy.pos.x, lerp(capy.root.position.y, groundY(capy.pos), Math.min(1, realDt * 6)), capy.pos.z);
  capy.root.rotation.y = capy.yaw;

  // câmera 3ª pessoa suave, zoom leve nas descobertas
  let dy = capy.yaw - camYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); camYaw += dy * Math.min(1, realDt * 1.5);
  const zoom = now < zoomUntil ? 0.6 : 1;
  const dist = 8.5 * zoom, height = 4.2 * zoom + 0.8;
  const want = new THREE.Vector3(capy.pos.x - Math.sin(camYaw) * dist, capy.root.position.y + height, capy.pos.z - Math.cos(camYaw) * dist);
  want.y = Math.max(want.y, heightAt(want.x, want.z) + 1.2);
  camPos.lerp(want, Math.min(1, realDt * 2.5));
  camLook.lerp(new THREE.Vector3(capy.pos.x, capy.root.position.y + 1, capy.pos.z), Math.min(1, realDt * 4));
  camera.position.copy(camPos); camera.lookAt(camLook);

  renderer.render(scene, camera);
  renderVlogFrame(now);

  // overlays HTML
  // acima do personagem só aparece um emoji simples
  placeOverlay(emojiEl, 2.1);
  if (G.gameTime < G.sickUntil) { emojiEl.textContent = '🤢'; emojiEl.style.opacity = 1; }
  else if (capy.anim === 'dormir') { emojiEl.textContent = '💤'; emojiEl.style.opacity = 1; }
  else emojiEl.style.opacity = now < emojiUntil ? 1 : 0;
  if ((uiTick += realDt) > 0.25) {
    uiTick = 0; renderBars(); renderHUD(); updateAudio();
    // esconde objetos longe da capivara (a neblina já os encobre)
    for (const o of objects) if (o.mesh && !TYPES[o.type]?.mobile) o.mesh.visible = (o.pos.x - capy.pos.x) ** 2 + (o.pos.z - capy.pos.z) ** 2 < 3600;
  }
}

// ---------------------------------------------------------------------
// START
// ---------------------------------------------------------------------
capy.pos.set(0, 0, -2);
if (state.temCamera) attachGoPro(null);
initVlogUI();
renderLog(false); renderMemory(); renderDiary(); renderPhotos(); renderBars(); renderHUD();
requestAnimationFrame(frame);
aiLoop();

// acesso tardio para módulos carregados antes deste
Object.defineProperties(H, {
  resize: { get: () => resize },
});
