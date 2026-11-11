// Cenário da Fenda: chão infinito (ladrilhos reciclados em volta da câmera) e decoração em blocos de 12×12
// gerados de forma estável pela posição. Ruas afundadas, neon apagado, cristais de mana e entulho.
import * as T from '../lib/three.js';
import { StaticBatch, hash } from '../engine/voxel.js';
import { CubePool } from './instanced.js';

// Mago: capuz, manto com circuitos, cajado com cristal
export const MAGE = { parts: [
  [-2.6, 0, -2.2, 5.2, 1.6, 4.4, '#241a3c'], [-2.2, 1.6, -1.8, 4.4, 3.6, 3.6, '#3a2a5a'],
  [-2.25, 3.0, -1.85, 4.5, 0.45, 3.7, 'glowV'], [-0.2, 0.4, 1.82, 0.4, 2.6, 0.1, 'glowC'],
  [-3.4, 2.8, -1, 1.2, 2.4, 2, '#3a2a5a'], [2.2, 2.8, -1, 1.2, 2.4, 2, '#3a2a5a'],
  [-2.1, 5.2, -2.1, 4.2, 3.6, 4.2, '#241a3c'], [-1.4, 5.8, 2.05, 2.8, 2.2, 0.1, '#07060c'],
  [-1.0, 6.8, 2.12, 0.7, 0.5, 0.1, 'glowC'], [0.3, 6.8, 2.12, 0.7, 0.5, 0.1, 'glowC'],
  [-1.3, 8.8, -1.7, 2.6, 1.2, 2.6, '#241a3c'], [-0.6, 10, -1.2, 1.2, 1.1, 1.2, '#241a3c'],
  [3.5, 0, 0.6, 0.6, 9.4, 0.6, '#4a3a2a'], [3.2, 9.4, 0.3, 1.2, 1.7, 1.2, 'glowC'],
] };

// ---------- cenário de fantasia das Fendas ----------
// zonas: bosque encantado, ruínas antigas, campo de cristal, clareira. Cada uma tem chão e objetos próprios.
const tree = (rnd, leaf, leaf2) => { const h = 4 + rnd() * 3; return { parts: [[-0.9, 0, -0.9, 1.8, h, 1.8, '#3a2a22'], [0.8, h * 0.55, -0.4, 2.2, 0.7, 0.8, '#3a2a22'],
  [-3.6, h, -3.6, 7.2, 3.2, 7.2, leaf], [-2.4, h + 3.2, -2.4, 4.8, 1.8, 4.8, leaf2], [1.6, h + 1, 3.62, 0.8, 0.8, 0.1, 'glowP'], [-2.8, h + 1.8, 3.62, 0.6, 0.6, 0.1, 'glowC']] }; };
const ZONES = {
  bosque: { floor: ['#1f2a24', '#26332b'], props: [
    rnd => tree(rnd, '#3b2a5a', '#5a3d8a'), rnd => tree(rnd, '#21443a', '#2f6a55'), rnd => tree(rnd, '#3b2a5a', '#7a4fb0'),
    rnd => ({ parts: [[-0.4, 0, -0.4, 0.8, 1.8, 0.8, '#d8cfe0'], [-1.6, 1.8, -1.6, 3.2, 1, 3.2, 'glowV'], [1.6, 0, 1, 0.5, 1, 0.5, '#d8cfe0'], [1.1, 1, 0.5, 1.5, 0.6, 1.5, 'glowP']] }),   // cogumelos brilhantes
    rnd => ({ parts: [[-2.4, 0, -2.4, 4.8, 1.6, 4.8, '#21443a'], [-1.6, 1.6, -1.6, 3.2, 1, 3.2, '#2f6a55'], [0.6, 1.2, 2.42, 0.6, 0.6, 0.1, 'glowAcid']] }),   // arbusto
  ], density: [5, 8] },
  ruinas: { floor: ['#2a2733', '#33303e'], props: [
    rnd => { const h = 4 + rnd() * 5; return { parts: [[-1.6, 0, -1.6, 3.2, 1, 3.2, '#5a5668'], [-1.2, 1, -1.2, 2.4, h, 2.4, '#7a7590'], [-1.6, h + 1, -1.6, 3.2, 0.8, 3.2, '#5a5668']] }; },   // coluna
    rnd => ({ parts: [[-4, 0, -0.8, 1.6, 7, 1.6, '#7a7590'], [2.4, 0, -0.8, 1.6, 7, 1.6, '#7a7590'], [-4, 7, -0.8, 8, 1.4, 1.6, '#5a5668'], [-0.5, 7.2, 0.82, 1, 1, 0.1, 'glowC']] }),   // arco
    rnd => ({ parts: [[-1.4, 0, -0.6, 2.8, 5, 1.2, '#4a4658'], [-0.5, 1.4, 0.62, 1, 2.4, 0.1, 'glowV'], [-0.9, 3.2, 0.62, 1.8, 0.4, 0.1, 'glowV']] }),   // pedra rúnica
    rnd => ({ parts: [[-3, 0, -2, 3, 1.4, 2.4, '#5a5668'], [0.4, 0, -0.4, 2.2, 0.9, 2, '#4a4658'], [-1.2, 0, 1.4, 1.6, 0.7, 1.4, '#7a7590']] }),   // escombros de pedra
  ], density: [3, 5] },
  cristal: { floor: ['#251d38', '#2e2445'], props: [
    rnd => ({ parts: [[-2, 0, -2, 4, 1.4, 4, '#2a1f45'], [-1.2, 1.4, -1.2, 2.4, 4 + rnd() * 3, 2.4, 'glowV'], [1, 1, 0, 1.4, 2.6, 1.4, 'glowC'], [-2.4, 1, 0.6, 1.2, 2, 1.2, 'glowV']] }),
    rnd => ({ parts: [[-1, 0, -1, 2, 6, 2, 'glowOreQz'], [1.2, 0, 0.4, 1.2, 3, 1.2, 'glowOreQz'], [-2.2, 0, 0.6, 1.2, 2.2, 1.2, 'glowC']] }),
    rnd => ({ parts: [[-2.6, 0, -2, 5.2, 1.2, 4, '#3a2f55'], [-1.6, 1.2, -1.2, 3.2, 1, 2.4, '#4a3d6a']] }),
  ], density: [3, 5] },
  clareira: { floor: ['#23281f', '#2b3226'], props: [
    rnd => ({ parts: [[-0.3, 0, -0.3, 0.6, 1.4, 0.6, '#3f6b38'], [-1.4, 0, 0.6, 0.5, 1, 0.5, '#3f6b38'], [-0.6, 1.4, -0.6, 1.2, 0.6, 1.2, 'glowP'], [-1.7, 1, 0.3, 1.1, 0.5, 1.1, 'glowY']] }),   // flores
    rnd => ({ parts: [[-1.8, 0, -1.4, 3.6, 1.2, 2.8, '#5a5668'], [-1, 1.2, -0.8, 2, 0.8, 1.6, '#6a6678']] }),   // pedra
    rnd => ({ parts: [[-0.4, 0, -0.4, 0.8, 1.6, 0.8, '#3f6b38'], [0.8, 0, 0.2, 0.6, 1.2, 0.6, '#2f5a2a'], [-1.2, 0, 0.6, 0.6, 1.0, 0.6, '#4a7a3a']] }),   // capim alto
  ], density: [2, 4] },
};
const ZKEYS = Object.keys(ZONES);
// zona estável pela posição (ruído de baixa frequência)
export function zoneAt(x, z) {
  const v = Math.sin(x * 0.045 + 1.3) + Math.cos(z * 0.038 - 0.7) + Math.sin((x + z) * 0.027) * 0.8;
  const w = Math.sin(x * 0.031 - z * 0.022 + 2.1);
  return v > 0.9 ? 'bosque' : v < -0.9 ? 'cristal' : w > 0.25 ? 'ruinas' : 'clareira';
}
const CHUNK = 12;

export class World {
  constructor(scene, onChunk) {
    this.scene = scene; this.onChunk = onChunk;
    this.tiles = new CubePool(scene, 900, { basic: false, size: [1, 0.2, 1] });
    this.chunks = new Map();
    this.c = new T.Color(); this.cols = {};
    for (const [k, z] of Object.entries(ZONES)) this.cols[k] = z.floor.map(c => new T.Color(c));
    this.crack = new T.Color('#3d2c55');
  }
  update(cx, cz, viewW, viewH) {
    // chão: ladrilhos em volta da câmera, cor estável pela posição
    const t = this.tiles; t.begin();
    const x0 = Math.floor(cx - viewW / 2 - 2), x1 = Math.ceil(cx + viewW / 2 + 2), z0 = Math.floor(cz - viewH * 0.75 - 3), z1 = Math.ceil(cz + viewH * 0.75 + 3);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const h = hash(x, z) * 0.6 + (Math.sin(x * 0.35) + Math.cos(z * 0.3)) * 0.2 + 0.2, crack = hash(x * 3 + 7, z * 5 - 2) > 0.985;
      const zc = this.cols[zoneAt(x, z)]; this.c.copy(zc[0]).lerp(zc[1], h);
      if (crack) this.c.copy(this.crack);
      t.add(x + 0.5, -0.1, z + 0.5, 1.001, 1, 1.001, this.c);
    }
    t.end();
    // decoração: blocos perto da câmera existem, os longe são descartados
    const ci = Math.floor(cx / CHUNK), cj = Math.floor(cz / CHUNK), keep = new Set();
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 2; j <= cj + 2; j++) {
      const key = i + ',' + j; keep.add(key);
      if (!this.chunks.has(key)) { this.chunks.set(key, this.buildChunk(i, j)); }
    }
    for (const [key, g] of this.chunks) if (!keep.has(key)) { this.onChunk?.(key, null); this.scene.remove(g); g.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); this.chunks.delete(key); }
  }
  reset() { for (const [key, g] of this.chunks) { this.onChunk?.(key, null); this.scene.remove(g); g.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); } this.chunks.clear(); }
  buildChunk(i, j) {
    let n = (i * 73856093) ^ (j * 19349663);
    const rnd = () => hash(n++, 11), g = new T.Group(), batch = new StaticBatch('iluminura');
    const cx = i * CHUNK + CHUNK / 2, cz = j * CHUNK + CHUNK / 2, Z = ZONES[zoneAt(cx, cz)];
    const k = Z.density[0] + Math.floor(rnd() * (Z.density[1] - Z.density[0] + 1));
    // objetos agrupados em volta de 1 ou 2 centros (bosques e ruínas em manchas, não espalhados)
    const hubs = [[i * CHUNK + 2 + rnd() * 8, j * CHUNK + 2 + rnd() * 8], [i * CHUNK + 2 + rnd() * 8, j * CHUNK + 2 + rnd() * 8]];
    for (let q = 0; q < k; q++) {
      const hb = hubs[q % 2], a = rnd() * 6.28, r = rnd() * 3.5, x = hb[0] + Math.cos(a) * r, z = hb[1] + Math.sin(a) * r;
      if (Math.abs(x) < 2.5 && Math.abs(z) < 2.5) continue;   // nada em cima do Mago no início
      const props = ZONES[zoneAt(x, z)].props, def = props[Math.floor(rnd() * props.length)](rnd);
      batch.add({ ...def, scale: 0.11 * (0.85 + rnd() * 0.4) / 0.1 }, x, z, rnd() * 6);
    }
    batch.build(g); this.scene.add(g);
    this.onChunk?.(i + ',' + j, { i, j, rnd, x0: i * CHUNK, z0: j * CHUNK, size: CHUNK, zone: zoneAt(cx, cz) });
    return g;
  }
}
