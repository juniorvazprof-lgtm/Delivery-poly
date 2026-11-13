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

const DECOR = [
  rnd => ({ parts: [[-4, 0, -3, 7, 2, 6, '#2c3038'], [-2, 2, -2, 4, 1.4, 3, '#383d47'], [1, 0, 1.8, 3, 1.4, 2.4, '#22252c'], [-3, 1.8, 0.5, 2, 0.5, 3.5, '#5a3428']] }),   // entulho
  rnd => ({ parts: [[-2, 0, -2, 4, 1.4, 4, '#1e1830'], [-1.2, 1.4, -1.2, 2.4, 4 + rnd() * 3, 2.4, 'glowV'], [1, 1, 0, 1.4, 2.6, 1.4, 'glowP'], [-2.4, 1, 0.6, 1.2, 2, 1.2, 'glowV']] }),   // cristais de mana
  rnd => ({ parts: [[-0.4, 0, -0.4, 0.8, 9, 0.8, '#2a2d35'], [-0.4, 9, -0.4, 3.2, 0.5, 0.8, '#2a2d35'], [2.2, 8.2, -0.3, 0.8, 0.8, 0.6, rnd() < 0.5 ? 'glowM' : '#3a3f4a']] }),   // poste de neon
  rnd => ({ parts: [[-3, 0, -0.6, 6, 0.4, 1.2, '#3a3f4a'], [-3, 0.4, -0.6, 0.6, 2.4, 1.2, '#2c3038'], [2.4, 0.4, -0.6, 0.6, 1.4, 1.2, '#2c3038'], [-1, 0.4, -0.2, 3, 0.3, 0.4, 'glowM']] }),   // barreira quebrada
  rnd => ({ parts: [[-1.6, 0, -1.6, 3.2, 0.6, 3.2, '#1b2a1e'], [-1.2, 0.6, -1.2, 2.4, 2.2, 2.4, '#2b4a2c'], [-0.8, 2.8, -0.8, 1.6, 1.4, 1.6, '#3f6b38']] }),   // mato da Fenda
];
// cenário anterior: uma só "zona", chão roxo escuro e objetos espalhados
const ZONES = { cidade: { floor: ['#2a2638', '#322d44'], props: DECOR, density: [2, 4] } };
export function zoneAt() { return 'cidade'; }
const CHUNK = 12;

export class World {
  constructor(scene, onChunk) {
    this.scene = scene; this.onChunk = onChunk;
    this.tiles = new CubePool(scene, 2400, { basic: false, size: [1, 0.2, 1] })   // 900 não cobria telas altas (faltava a coluna da direita);
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
    for (let q = 0; q < k; q++) {
      const x = i * CHUNK + rnd() * CHUNK, z = j * CHUNK + rnd() * CHUNK;
      if (Math.abs(x) < 2.5 && Math.abs(z) < 2.5) continue;   // nada em cima do Mago no início
      const props = ZONES[zoneAt(x, z)].props, def = props[Math.floor(rnd() * props.length)](rnd);
      batch.add({ ...def, scale: 0.9 + rnd() * 0.4 }, x, z, rnd() * 6);
    }
    batch.build(g); this.scene.add(g);
    this.onChunk?.(i + ',' + j, { i, j, rnd, x0: i * CHUNK, z0: j * CHUNK, size: CHUNK, zone: zoneAt(cx, cz) });
    return g;
  }
}
