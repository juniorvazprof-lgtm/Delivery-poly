// Cenário da Fenda: chão infinito (ladrilhos reciclados em volta da câmera) e decoração em blocos de 12×12
// gerados de forma estável pela posição. Ruas afundadas, neon apagado, cristais de mana e entulho.
import * as T from '../lib/three.js';
import { StaticBatch, hash } from '../engine/voxel.js';
import { CubePool } from './instanced.js';

// Mago: capuz, manto com circuitos, cajado com cristal
export const MAGE = { parts: [
  [-2.6, 0, -2.2, 5.2, 1.6, 4.4, '#c9a24a'], [-2.2, 1.6, -1.8, 4.4, 3.6, 3.6, '#f2ead6'],
  [-2.25, 3.0, -1.85, 4.5, 0.45, 3.7, 'glowC'], [-0.2, 0.4, 1.82, 0.4, 2.6, 0.1, 'glowC'],
  [-3.4, 2.8, -1, 1.2, 2.4, 2, '#f2ead6'], [2.2, 2.8, -1, 1.2, 2.4, 2, '#f2ead6'],
  [-2.1, 5.2, -2.1, 4.2, 3.6, 4.2, '#c9a24a'], [-1.4, 5.8, 2.05, 2.8, 2.2, 0.1, '#07060c'],
  [-1.0, 6.8, 2.12, 0.7, 0.5, 0.1, 'glowC'], [0.3, 6.8, 2.12, 0.7, 0.5, 0.1, 'glowC'],
  [-1.3, 8.8, -1.7, 2.6, 1.2, 2.6, '#c9a24a'], [-0.6, 10, -1.2, 1.2, 1.1, 1.2, '#c9a24a'],
  [3.5, 0, 0.6, 0.6, 9.4, 0.6, '#4a3a2a'], [3.2, 9.4, 0.3, 1.2, 1.7, 1.2, 'glowC'],
] };

// zonas do cenário: cada arquivo em data/zones/ exporta { floor, crack, props, density }
import cidade from '../data/zones/cidade.js';
import cristal from '../data/zones/cristal.js';
import cinzas from '../data/zones/cinzas.js';
import abismo from '../data/zones/abismo.js';
export const ZONES = { cidade, cristal, cinzas, abismo };
const ZK = ['cristal', 'cinzas', 'abismo'];
// zonas em manchas grandes (~50 u) por ruído suave; o começo é sempre a cidade
export function zoneAt(x, z) {
  const d = Math.hypot(x, z);
  if (d < 18) return 'cidade';
  const a = Math.sin(x * 0.045 + Math.cos(z * 0.031) * 1.7) + Math.cos(z * 0.052 - x * 0.013) + Math.sin((x + z) * 0.021) * 0.6;
  const b = Math.cos(x * 0.038 - 1.3) * Math.sin(z * 0.041 + 0.7) + Math.sin((x - z) * 0.027) * 0.8;
  if (a > 0.9) return 'cidade';
  return ZK[(a < -0.6 ? 2 : b > 0.1 ? 0 : 1)];
}
const CHUNK = 12;

export class World {
  constructor(scene, onChunk) {
    this.scene = scene; this.onChunk = onChunk;
    this.tiles = new CubePool(scene, 2400, { basic: false, size: [1, 0.2, 1] })   // 900 não cobria telas altas (faltava a coluna da direita);
    this.chunks = new Map();
    this.c = new T.Color(); this.cols = {};
    for (const [k, z] of Object.entries(ZONES)) this.cols[k] = z.floor.map(c => new T.Color(c));
    this.cracks = {}; for (const [k, z] of Object.entries(ZONES)) this.cracks[k] = new T.Color(z.crack);
  }
  update(cx, cz, viewW, viewH) {
    // chão: ladrilhos em volta da câmera, cor estável pela posição
    const t = this.tiles; t.begin();
    const x0 = Math.floor(cx - viewW / 2 - 2), x1 = Math.ceil(cx + viewW / 2 + 2), z0 = Math.floor(cz - viewH * 0.75 - 3), z1 = Math.ceil(cz + viewH * 0.75 + 3);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const h = hash(x, z) * 0.6 + (Math.sin(x * 0.35) + Math.cos(z * 0.3)) * 0.2 + 0.2, crack = hash(x * 3 + 7, z * 5 - 2) > 0.985;
      const zk = zoneAt(x, z), zc = this.cols[zk]; this.c.copy(zc[0]).lerp(zc[1], h);
      if (crack) this.c.lerp(this.cracks[zk], 0.5);   // rachadura discreta, misturada ao chão
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
