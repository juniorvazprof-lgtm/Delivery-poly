// Mundo procedural: ruído, biomas, relevo, lago, lagoas e riacho.
// (módulo 3/20 da Capivara Explora)
import * as THREE from 'three';
import { HALF, LIM, lerp, smooth, srand } from '../core/config.js';
import { scene } from '../engine/scene.js';

// ---------------------------------------------------------------------
// MUNDO PROCEDURAL: relevo e umidade vêm de ruído com a semente do mundo.
// Biomas: campo (aberto), mata (úmida), brejo (perto da água), pedregal (alto e seco).
// ---------------------------------------------------------------------
let GROUND, GROUND_BASE;
const TSIZE = HALF * 2 + 8, TSEG = 104;
const PERM = new Uint8Array(512);
{ const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const k = Math.floor(srand(0, i + 1)); [p[i], p[k]] = [p[k], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const h = (i, j) => PERM[(PERM[i & 255] + (j & 255)) & 511] / 255;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
const fbm = (x, z) => (vnoise(x, z) * 0.5 + vnoise(x * 2.1, z * 2.1) * 0.27 + vnoise(x * 4.3, z * 4.3) * 0.15 + vnoise(x * 8.7, z * 8.7) * 0.08) / 1.0;
const elev = (x, z) => fbm(x * 0.022 + 3.1, z * 0.022 + 7.7);
const moist = (x, z) => fbm(x * 0.03 + 101.3, z * 0.03 + 57.9);

// lago principal (com o jacaré), entre 16 e 28 m do ponto de partida, com espaço para o riacho correr até a borda leste
const LAKE = { x: 18, z: -8, r: 7 };
for (let i = 0; i < 60; i++) {
  const a = srand(0, 6.28), d = srand(16, 28), x = Math.cos(a) * d, z = Math.sin(a) * d;
  if (x + LAKE.r + 14 < HALF && Math.abs(z) < HALF - 14) { LAKE.x = x; LAKE.z = z; break; }
}
const WATER_Y = -0.45;
const STREAM_Y = -0.62;
const streamZ = x => LAKE.z + Math.sin((x - LAKE.x) * 0.18) * 3;
const nearStream = (x, z) => x > LAKE.x + LAKE.r - 2 ? Math.abs(z - streamZ(x)) : 99;
// lagoas pequenas nas áreas úmidas
const PONDS = [];
for (let i = 0; i < 400 && PONDS.length < 4; i++) {
  const x = srand(-LIM + 6, LIM - 6), z = srand(-LIM + 6, LIM - 6), r = srand(2.6, 3.8);
  if (moist(x, z) < 0.5 || Math.hypot(x, z) < 16 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + r + 12 || nearStream(x, z) < 9) continue;
  if (PONDS.some(p => Math.hypot(p.x - x, p.z - z) < p.r + r + 14)) continue;
  PONDS.push({ x, z, r });
}
const WATERS = [LAKE, ...PONDS];
const waterDist = (x, z) => Math.min(...WATERS.map(w => Math.hypot(x - w.x, z - w.z) - w.r));
function biomeAt(x, z) {
  if (Math.hypot(x, z) < 11) return 'campo';               // clareira de partida
  const e = elev(x, z), m = moist(x, z);
  if ((waterDist(x, z) < 7 || nearStream(x, z) < 4) && m > 0.4) return 'brejo';
  if (e > 0.6) return 'pedregal';
  if (m > 0.53) return 'mata';
  return 'campo';
}
function heightAt(x, z) {
  let h = (elev(x, z) - 0.47) * 7 + 0.25 * Math.sin(x * 0.37 + z * 0.21);
  h = lerp(h, 0.2, smooth(13, 6, Math.hypot(x, z)));        // clareira de partida plana
  for (const w of WATERS) {
    const d = Math.hypot(x - w.x, z - w.z);
    h = lerp(h, 0.1, smooth(w.r + 10, w.r + 3, d));
    h = lerp(h, -1.4, smooth(w.r + 3, w.r - 1, d));
  }
  const ds = nearStream(x, z);
  if (ds < 8) { h = lerp(h, 0.1, smooth(7, 2.5, ds)); h = lerp(h, -0.9, smooth(2.2, 0.6, ds)); }
  return h;
}
const BIOME_COL = { campo: [0.26, 0.5, 0.44], mata: [0.31, 0.45, 0.31], brejo: [0.19, 0.32, 0.36], pedregal: [0.1, 0.16, 0.52] };
{
  const g = new THREE.PlaneGeometry(TSIZE, TSIZE, TSEG, TSEG);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = heightAt(x, z);
    p.setY(i, h);
    if (h < -0.35) c.set(0xe8d29a);                         // areia na beira da água
    else { const [hh, ss, ll] = BIOME_COL[biomeAt(x, z)]; c.setHSL(hh + Math.sin(x * 0.7 + z) * 0.015, ss, ll + srand(-0.03, 0.03)); }
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  ground.receiveShadow = true;
  scene.add(ground);
  GROUND = ground; GROUND_BASE = Float32Array.from(colors);
}
const waterMat = new THREE.MeshLambertMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.85 });
const waterMeshes = WATERS.map(w => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(w.r + 1.2, 28), waterMat);
  m.rotation.x = -Math.PI / 2; m.position.set(w.x, WATER_Y, w.z); scene.add(m); return m;
});
const lakeMesh = waterMeshes[0];
{ // riacho: fita de geometria acompanhando a curva, do lago até a borda leste
  const v = [], idx = [];
  let n = 0;
  for (let x = LAKE.x + LAKE.r - 1; x <= HALF + 4; x += 1) {
    const z = streamZ(x);
    v.push(x, STREAM_Y, z - 1.1, x, STREAM_Y, z + 1.1);
    if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })));
}

export { GROUND, GROUND_BASE, LAKE, PONDS, STREAM_Y, TSEG, TSIZE, WATERS, WATER_Y, biomeAt, heightAt, nearStream, streamZ, waterDist, waterMeshes };
