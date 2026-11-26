// Tempo de jogo, dia/noite, clima, metabolismo, pássaro e surpresas.
// (módulo 10/20 da Capivara Explora)
import * as THREE from 'three';
import { G, H } from '../core/runtime.js';
import { DAY_LEN, clamp, isNight, pendingNotes, rand, smooth, state } from '../core/config.js';
import { camera, hemi, scene, sun } from '../engine/scene.js';
import { WATER_Y, heightAt, waterMeshes } from './terrain.js';
import { FLY_N, RAIN_N, flies, rain, rainGeo, stars } from './sky.js';
import { abrigo, bird, cave, objects } from './objects.js';
import { isFree } from './pathfinding.js';
import { capy } from '../capy/capybara.js';

// ---------------------------------------------------------------------
// TEMPO DE JOGO, dia/noite e clima
// ---------------------------------------------------------------------
G.gameTime = 0; G.timeScale = 1; G.paused = false; G.sickUntil = -1;
G.lastOutcome = null;
let raining = false, rainUntil = 0, nextWeatherCheck = 20;
const waiters = []; // promessas esperando gameTime
const gameWait = s => new Promise(r => waiters.push({ at: G.gameTime + s, r }));
const nearXZ = (p, r) => Math.hypot(capy.pos.x - p.x, capy.pos.z - p.z) < r;
const inCave = () => nearXZ(cave.entrance, 3) || nearXZ(abrigo.entrance, 2.2);   // caverna ou abrigo: protegida da chuva
const SKY_DAY = new THREE.Color(0x9fd8ff), SKY_NIGHT = new THREE.Color(0x1a2246), SKY_SET = new THREE.Color(0xffa877), SKY_RAIN = new THREE.Color(0x8a96a8);
const skyCol = new THREE.Color();
function updateWorld(dt) {
  // relógio
  state.clock += dt / DAY_LEN;
  if (state.clock >= 1) { state.clock -= 1; state.day++; }
  const ang = (state.clock - 0.25) * Math.PI * 2, sh = Math.sin(ang);
  const light = clamp(sh * 1.6 + 0.25, 0, 1);
  const sunset = clamp(1 - Math.abs(sh) * 3, 0, 1) * (sh > -0.2 ? 1 : 0);
  skyCol.copy(SKY_NIGHT).lerp(SKY_DAY, light).lerp(SKY_SET, sunset * 0.6);
  if (raining) skyCol.lerp(SKY_RAIN, 0.55);
  scene.background = skyCol; scene.fog.color.copy(skyCol);
  // de dia o sol; à noite a mesma luz vira lua (azulada e fraca), economizando uma luz
  const moon = light < 0.2;
  sun.intensity = moon ? 0.35 : light * (raining ? 0.5 : 1.4);
  if (moon) sun.color.set(0x9fb6ff); else sun.color.setHSL(0.09, 0.8, 0.6 + light * 0.25);
  const night = 1 - smooth(0.05, 0.35, light);
  stars.material.opacity = raining ? 0 : night * 0.9; stars.position.copy(camera.position);
  flies.material.opacity = raining ? 0 : night * (0.6 + Math.sin(G.gameTime * 3) * 0.3);
  if (night > 0.05) {
    flies.position.set(capy.pos.x, heightAt(capy.pos.x, capy.pos.z), capy.pos.z);
    const fp = flies.geometry.attributes.position;
    for (let i = 0; i < FLY_N; i++) { fp.setX(i, fp.getX(i) + Math.sin(G.gameTime * 0.9 + i) * dt * 0.5); fp.setY(i, 0.4 + Math.abs(Math.sin(G.gameTime * 0.5 + i * 1.3)) * 1.8); }
    fp.needsUpdate = true;
  }
  hemi.intensity = 0.35 + light * 0.6;
  sun.position.set(capy.pos.x + Math.cos(moon ? ang + Math.PI : ang) * 25, Math.max(6, Math.abs(sh) * 30), capy.pos.z + 12);
  sun.target.position.copy(capy.pos);
  // chuva ocasional
  if (G.gameTime > nextWeatherCheck) {
    nextWeatherCheck = G.gameTime + 15;
    if (!raining && Math.random() < 0.08) { raining = true; rainUntil = G.gameTime + rand(25, 55); }
  }
  if (raining && G.gameTime > rainUntil) raining = false;
  rain.visible = raining;
  if (raining) {
    const p = rainGeo.attributes.position;
    for (let i = 0; i < RAIN_N; i++) { let y = p.getY(i) - 16 * dt; if (y < 0) y += 14; p.setY(i, y); }
    p.needsUpdate = true; rain.position.set(capy.pos.x, heightAt(capy.pos.x, capy.pos.z) - 1, capy.pos.z);
  }
  // status mudam com o tempo
  const s = state.stats, sleeping = capy.anim === 'dormir';
  s.fome = clamp(s.fome + dt * (sleeping ? 0.12 : 0.22));
  s.sede = clamp(s.sede + dt * (sleeping ? 0.15 : 0.3));
  if (!sleeping) s.energia = clamp(s.energia - dt * 0.14);
  if (raining && !inCave()) s.humor = clamp(s.humor - dt * 0.35);
  // temperatura: água, chuva e noite esfriam; sol aquece; abrigo protege
  const abrigada = inCave();
  let dF = 0;
  if (capy.swim) dF += 1.6;
  if (raining && !abrigada) dF += 0.9;
  if (isNight()) dF += abrigada ? 0 : 0.3;
  else if (!raining) dF -= abrigada ? 0.3 : 0.55;
  if (abrigada && sleeping) dF -= 0.8;
  s.frio = clamp(s.frio + dF * dt);
  // bem alimentada, hidratada e aquecida, o humor volta devagar para o equilíbrio
  s.bexiga = clamp(s.bexiga + dt * 0.05);
  if (s.bexiga > 90) s.humor = clamp(s.humor - dt * 0.2);              // segurar demais incomoda
  if (!sleeping) s.tedio = clamp(s.tedio + dt * 0.06);
  if (s.tedio > 70) s.humor = clamp(s.humor - dt * 0.08);
  if (s.fome < 60 && s.sede < 60 && s.frio < 50 && s.humor < 55) s.humor = clamp(s.humor + dt * 0.12);
  if (s.frio > 60) { s.humor = clamp(s.humor - dt * 0.15); s.energia = clamp(s.energia - dt * 0.08); }
  if (s.frio > 70 && G.gameTime > nextShiver && !sleeping && !capy.swim) { nextShiver = G.gameTime + rand(7, 12); flashAnim('tremer', 1); H.showEmoji('🥶'); }
  // diário ao anoitecer
  if (state.clock > 0.78 && state.clock < 0.8 && state.diaryDay !== state.day) { state.diaryDay = state.day; G.pendingDiary = true; }
  if (s.fome > 85 || s.sede > 85) s.humor = clamp(s.humor - dt * 0.1);
  // água ondulando de leve
  for (const m of waterMeshes) m.position.y = WATER_Y + Math.sin(G.gameTime * 1.3) * 0.02;
  updateBird(dt);
  H.updateJacare(dt);
  updateSurprises(dt);
}

// Pássaro: circula pelo mundo, às vezes dá rasantes perto da capivara
let nextSwoop = 25, nextShiver = 0; G.pendingDiary = false;
function updateBird(dt) {
  bird.t += dt;
  const m = bird.mesh;
  if (bird.mode === 'flee') {
    bird.pos.addScaledVector(bird.fleeDir, dt * 7); bird.pos.y = Math.min(bird.pos.y + dt * 2, 9);
    if (G.gameTime > bird.fleeUntil) bird.mode = 'circle';
  } else if (bird.mode === 'swoop') {
    const tgt = capy.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
    bird.pos.lerp(tgt, Math.min(1, dt * 2));
    if (bird.pos.distanceTo(tgt) < 1) {
      bird.mode = 'flee'; bird.fleeUntil = G.gameTime + 6; bird.fleeDir = new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize();
      if (capy.anim !== 'dormir' && !capy.swim) {
        state.stats.humor = clamp(state.stats.humor - 5);
        pendingNotes.push('Um pássaro azul deu um rasante bem na sua cabeça e te assustou!');
        flashAnim('tremer', 1.2); H.showEmoji('😱');
      }
    }
  } else {
    // circula em volta de um ponto que segue a capivara devagar
    bird.home.lerp(capy.pos, dt * 0.05);
    const a = bird.t * 0.35;
    const tgt = new THREE.Vector3(bird.home.x + Math.cos(a) * 11, 5 + Math.sin(bird.t) * 1.2, bird.home.z + Math.sin(a) * 11);
    bird.pos.lerp(tgt, Math.min(1, dt * 1.5));
    if (G.gameTime > nextSwoop) { nextSwoop = G.gameTime + rand(35, 70); if (Math.random() < 0.5) bird.mode = 'swoop'; }
  }
  bird.pos.x = clamp(bird.pos.x, -29, 29); bird.pos.z = clamp(bird.pos.z, -29, 29);
  const prev = m.position.clone();
  m.position.copy(bird.pos);
  const mv = m.position.clone().sub(prev); if (mv.lengthSq() > 1e-6) m.rotation.y = Math.atan2(mv.x, mv.z);
  const f = Math.sin(bird.t * 18) * 0.7;
  if (m.userData.wings.length === 2) { m.userData.wings[0].rotation.y = f * 0.6; m.userData.wings[1].rotation.y = -f * 0.6; }
}
G.animOverride = null;
function flashAnim(name, dur) { G.animOverride = { name, until: G.gameTime + dur, prev: capy.anim }; capy.anim = name; capy.animT = 0; }

// Surpresas (bola rola)
function updateSurprises(dt) {
  for (const o of objects) if (o.vel) {
    o.pos.addScaledVector(o.vel, dt); o.vel.multiplyScalar(1 - dt * 1.2);
    if (!isFree(o.pos)) { o.vel.multiplyScalar(-0.6); o.pos.addScaledVector(o.vel, dt * 2); }
    o.pos.y = heightAt(o.pos.x, o.pos.z); o.mesh.position.copy(o.pos); o.mesh.rotation.x += o.vel.length() * dt * 2;
    if (o.vel.length() < 0.05) o.vel = null;
  }
}

export { gameWait, inCave, raining, updateWorld, waiters };
