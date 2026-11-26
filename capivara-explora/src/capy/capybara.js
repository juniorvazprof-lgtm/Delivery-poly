// A capivara: modelo, animações, movimento, pegadas e trilhas.
// (módulo 9/20 da Capivara Explora)
import * as THREE from 'three';
import { G } from '../core/runtime.js';
import { state } from '../core/config.js';
import { scene } from '../engine/scene.js';
import { GROUND, GROUND_BASE, TSEG, TSIZE, WATER_Y, heightAt } from '../world/terrain.js';
import { M, MODELS, mesh } from '../world/models.js';

// ---------------------------------------------------------------------
// 3b. A CAPIVARA: modelo low poly com primitivas
// ---------------------------------------------------------------------
const capy = { root: new THREE.Group(), model: new THREE.Group(), pos: new THREE.Vector3(0, 0, 0), yaw: 0,
  anim: 'idle', animT: 0, path: [], speed: 2.2, swim: false, onArrive: null };
if (MODELS.capivara) {
  // Modelo do Blender: usa os nós nomeados (body, head_pivot, eye_l/r, leg_fl/fr/bl/br) como pivôs de animação
  const g = MODELS.capivara.clone(true);
  const byName = n => g.getObjectByName(n);
  const body = byName('body'), head = byName('head_pivot');
  capy.model.add(g);
  capy.parts = { body, head, eyes: ['eye_l', 'eye_r'].map(byName).filter(Boolean),
    legs: ['leg_fl', 'leg_fr', 'leg_bl', 'leg_br'].map(byName) };
  capy.root.add(capy.model); scene.add(capy.root);
} else {
  const FUR = M(0xb07a4f), DARK = M(0x7a4f33), BLACK = M(0x1a1410);
  const body = mesh(new THREE.IcosahedronGeometry(0.55, 1), FUR, 0, 0.68, 0); body.scale.set(1, 0.85, 1.45);
  const head = new THREE.Group(); head.position.set(0, 0.98, 0.72);
  head.add(mesh(new THREE.BoxGeometry(0.56, 0.5, 0.58), FUR, 0, 0, 0.05));
  head.add(mesh(new THREE.BoxGeometry(0.48, 0.38, 0.32), DARK, 0, -0.07, 0.45));
  head.add(mesh(new THREE.BoxGeometry(0.22, 0.08, 0.04), BLACK, 0, 0.03, 0.62, false));
  const eyeG = new THREE.SphereGeometry(0.065, 6, 5);
  const eyes = [-1, 1].map(s => { const e = mesh(eyeG, BLACK, s * 0.22, 0.1, 0.24, false);
    e.add(mesh(new THREE.SphereGeometry(0.02, 4, 3), 0xffffff, 0.015, 0.025, 0.05, false)); head.add(e); return e; });
  [-1, 1].forEach(s => head.add(mesh(new THREE.BoxGeometry(0.13, 0.14, 0.08), DARK, s * 0.22, 0.3, -0.15)));
  const legs = [[-0.3, 0.45], [0.3, 0.45], [-0.3, -0.5], [0.3, -0.5]].map(([x, z]) => {
    const lg = new THREE.Group(); lg.position.set(x, 0.42, z);
    lg.add(mesh(new THREE.BoxGeometry(0.17, 0.42, 0.19), DARK, 0, -0.21, 0)); return lg; });
  capy.model.add(body, head, ...legs);
  capy.parts = { body, head, eyes, legs };
  capy.root.add(capy.model); scene.add(capy.root);
}
const groundY = v => capy.swim ? WATER_Y - 0.45 : heightAt(v.x, v.z);

// Animações procedurais (sem arquivos externos)
function animateCapy(dt) {
  const { body, head, eyes, legs } = capy.parts, t = (capy.animT += dt), a = capy.anim;
  // pose neutra
  let my = 0, mrx = 0, mrz = 0, hx = 0, hz = 0, ox = 0, legSwing = 0, legFold = 0, eyeS = 1;
  const breath = Math.sin(t * 2) * 0.015;
  switch (a) {
    case 'andar': legSwing = Math.sin(t * 11) * 0.55; my = Math.abs(Math.sin(t * 11)) * 0.05; break;
    case 'correr': legSwing = Math.sin(t * 18) * 0.8; my = Math.abs(Math.sin(t * 18)) * 0.1; mrx = 0.08; break;
    case 'comer': hx = 0.65 + Math.sin(t * 9) * 0.12; mrx = 0.1; break;
    case 'beber': hx = 0.8 + Math.sin(t * 12) * 0.06; mrx = 0.15; break;
    case 'nadar': legSwing = Math.sin(t * 14) * 0.7; my = Math.sin(t * 2.5) * 0.05; hx = -0.2; break;
    case 'dormir': legFold = 1.4; my = -0.32; hx = 0.25; eyeS = 0.12; mrz = Math.sin(t * 1.2) * 0.02; break;
    case 'pular': my = Math.abs(Math.sin(t * 7)) * 0.7; legSwing = Math.sin(t * 14) * 0.4; hx = -0.2; break;
    case 'tremer': ox = Math.sin(t * 70) * 0.05; hx = 0.25; eyeS = 1.4; break;
    case 'curiosa': hz = Math.sin(Math.min(t, 1) * 1.5) * 0.45; hx = -0.1; break;
    case 'cheirar': hx = 0.45 + Math.sin(t * 22) * 0.04; break;
    case 'espirrar': hx = t < 0.7 ? -0.45 * (t / 0.7) : (t < 0.9 ? 0.6 : 0.1); mrx = t > 0.7 && t < 0.9 ? 0.15 : 0; break;
    case 'sentar': mrx = -0.35; my = -0.12; hx = -0.15; legFold = 0.6; break;
    case 'digitar': mrx = -0.3; my = -0.12; legFold = 0.6; hx = 0.25 + Math.sin(t * 18) * 0.05; break;
    case 'agachar': mrx = -0.28; my = -0.18 + Math.sin(t * 2) * 0.02; hx = 0.1; legFold = 0.5; break;
  }
  if (G.gameTime < G.sickUntil) { mrz += Math.sin(t * 3) * 0.12; hz += Math.sin(t * 2.3) * 0.2; }
  capy.model.position.set(ox, my + breath, 0);
  capy.model.rotation.set(mrx, 0, mrz);
  head.rotation.set(hx, 0, hz);
  legs.forEach((l, i) => { l.rotation.x = (i % 3 === 0 ? 1 : -1) * legSwing + legFold * (i < 2 ? -1 : 1); });
  eyes.forEach(e => { e.userData.sy ??= e.scale.y; e.scale.y = e.userData.sy * eyeS; });
  body.userData.sy ??= body.scale.y; body.scale.y = body.userData.sy * (1 + breath);
}

// Movimento ao longo do caminho
// Pegadas (anel de 160 instâncias) e trilhas (o chão escurece onde ela passa muito)
const PRINTS = 160;
const prints = new THREE.InstancedMesh(new THREE.CircleGeometry(0.07, 6).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x3b2a1a, transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), PRINTS);
prints.count = 0; scene.add(prints);
let printIdx = 0, stepDist = 0, stepSide = 1, lastCellKey = '';
const DIRT = new THREE.Color(0xa88a5e);
function dropPrint() {
  const side = new THREE.Vector3(-Math.cos(capy.yaw), 0, Math.sin(capy.yaw)).multiplyScalar(0.14 * (stepSide = -stepSide));
  const p = capy.pos.clone().add(side); p.y = heightAt(p.x, p.z) + 0.03;
  prints.setMatrixAt(printIdx, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z));
  printIdx = (printIdx + 1) % PRINTS; prints.count = Math.min(PRINTS, prints.count + 1); prints.instanceMatrix.needsUpdate = true;
}
function wearGround(x, z, times = 1) {
  const ix = Math.round((x + TSIZE / 2) / TSIZE * TSEG), iz = Math.round((z + TSIZE / 2) / TSIZE * TSEG);
  if (ix < 0 || iz < 0 || ix > TSEG || iz > TSEG) return;
  const key = ix + ',' + iz;
  const w = state.trilhas[key] = (state.trilhas[key] || 0) + times;
  const i = iz * (TSEG + 1) + ix, col = GROUND.geometry.attributes.color, t = Math.min(1, w / 14) * 0.75;
  const c = new THREE.Color(GROUND_BASE[i * 3], GROUND_BASE[i * 3 + 1], GROUND_BASE[i * 3 + 2]).lerp(DIRT, t);
  col.setXYZ(i, c.r, c.g, c.b); col.needsUpdate = true;
}
for (const k in state.trilhas) { const [ix, iz] = k.split(',').map(Number); const v = state.trilhas[k]; state.trilhas[k] = 0; wearGround(ix / TSEG * TSIZE - TSIZE / 2, iz / TSEG * TSIZE - TSIZE / 2, v); }

function moveCapy(dt) {
  if (!capy.path.length) return;
  const tgt = capy.path[0];
  const d = new THREE.Vector3(tgt.x - capy.pos.x, 0, tgt.z - capy.pos.z);
  const dist = d.length();
  if (dist < 0.25) {
    capy.path.shift();
    if (!capy.path.length && capy.onArrive) { const f = capy.onArrive; capy.onArrive = null; f(); }
    return;
  }
  d.normalize();
  const wantYaw = Math.atan2(d.x, d.z);
  let dy = wantYaw - capy.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  capy.yaw += dy * Math.min(1, dt * 8);
  const sp = capy.speed * (G.gameTime < G.sickUntil ? 0.6 : 1);
  const step = Math.min(dist, sp * dt);
  capy.pos.addScaledVector(d, step);
  if (!capy.swim && (stepDist += step) > 0.45) { stepDist = 0; dropPrint(); }
  const ck = Math.round((capy.pos.x + TSIZE / 2) / TSIZE * TSEG) + ',' + Math.round((capy.pos.z + TSIZE / 2) / TSIZE * TSEG);
  if (!capy.swim && ck !== lastCellKey) { lastCellKey = ck; wearGround(capy.pos.x, capy.pos.z); }
}

export { animateCapy, capy, groundY, moveCapy };
