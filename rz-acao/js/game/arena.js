// Arena cinza-esverdeada da Fenda (protótipo): chão com pouco contraste, obstáculos baixos e borda de vegetação.
import * as T from '../lib/three.js';
import { StaticBatch, hash } from '../engine/voxel.js';
import { PROPS } from '../data/models.js';
import { CFG } from './config.js';

export class Arena {
  constructor(scene) {
    const { w, d, pillars } = CFG.arena;
    this.w = w; this.d = d; this.pillars = pillars;

    // chão: um InstancedMesh com dois tons suaves (uma chamada de desenho)
    const cols = Math.ceil(w), rows = Math.ceil(d);
    const tiles = new T.InstancedMesh(new T.BoxGeometry(1, 0.2, 1), new T.MeshToonMaterial({ color: '#ffffff' }), cols * rows);
    const m = new T.Matrix4(), c = new T.Color(), a = new T.Color('#3b4f3e'), b = new T.Color('#435a45');
    let i = 0;
    for (let x = 0; x < cols; x++) for (let z = 0; z < rows; z++) {
      m.makeTranslation(-w / 2 + x + 0.5, -0.1, -d / 2 + z + 0.5);
      tiles.setMatrixAt(i, m);
      tiles.setColorAt(i++, c.copy(a).lerp(b, hash(x, z)));
    }
    scene.add(tiles);

    // borda e obstáculos
    const batch = new StaticBatch('iluminura');
    for (const [x, z, r] of pillars) batch.add({ ...PROPS.bush, scale: r * 2.4 }, x, z, hash(x * 7, z * 3) * 6);
    const edge = (x, z, tall) => batch.add({ ...(tall ? PROPS.tree : PROPS.bush), scale: tall ? 1.3 : 1.1 }, x, z, hash(x, z) * 6);
    for (let x = -w / 2 - 0.6; x <= w / 2 + 0.6; x += 1.1) { edge(x, -d / 2 - 0.9, true); edge(x, d / 2 + 0.7, false); }   // lado de baixo baixo: não cobre a arena
    for (let z = -d / 2; z <= d / 2; z += 1.1) { edge(-w / 2 - 0.9, z, true); edge(w / 2 + 0.9, z, true); }
    batch.build(scene);

    // chão externo escuro
    const outer = new T.Mesh(new T.PlaneGeometry(w + 30, d + 30), new T.MeshBasicMaterial({ color: '#1a231c' }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.21; scene.add(outer);
  }

  // empurra um círculo para fora de obstáculos e para dentro dos limites
  resolve(p, r) {
    const hw = this.w / 2 - r, hd = this.d / 2 - r;
    p.x = Math.max(-hw, Math.min(hw, p.x)); p.z = Math.max(-hd, Math.min(hd, p.z));
    for (const [x, z, pr] of this.pillars) {
      const dx = p.x - x, dz = p.z - z, dist = Math.hypot(dx, dz), min = pr + r;
      if (dist < min && dist > 1e-4) { p.x = x + dx / dist * min; p.z = z + dz / dist * min; }
    }
  }
  blocked(p, r) {
    if (Math.abs(p.x) > this.w / 2 - r || Math.abs(p.z) > this.d / 2 - r) return true;
    return this.pillars.some(([x, z, pr]) => Math.hypot(p.x - x, p.z - z) < pr + r);
  }
  // ponto livre, longe de Kay e dos outros pontos já escolhidos
  spawnPoint(avoid, taken, minDist = 4) {
    for (let k = 0; k < 60; k++) {
      const p = new T.Vector3((Math.random() - 0.5) * (this.w - 2), 0, (Math.random() - 0.5) * (this.d - 2));
      if (this.blocked(p, 0.8) || p.distanceTo(avoid) < minDist || taken.some(q => q.distanceTo(p) < 1.6)) continue;
      return p;
    }
    return new T.Vector3(this.w / 2 - 1.5, 0, 0);
  }
}
