// Sala da Fenda: chão com pouco contraste, obstáculos baixos, borda de vegetação e portas na parede de cima.
// Cada sala é um grupo próprio, descartado ao trocar de sala.
import * as T from '../lib/three.js';
import { StaticBatch, hash, mat, geo } from '../engine/voxel.js';
import { PROPS } from '../data/models.js';

export class Arena {
  constructor(scene, layout, seed = 0) {
    const { w, d, pillars } = layout;
    this.scene = scene; this.w = w; this.d = d; this.pillars = pillars; this.doors = [];
    this.group = new T.Group(); scene.add(this.group);
    const H = (x, z) => hash(x + seed * 31, z + seed * 17);

    // chão: um InstancedMesh com dois tons suaves (uma chamada de desenho)
    const cols = Math.ceil(w), rows = Math.ceil(d);
    const tiles = new T.InstancedMesh(new T.BoxGeometry(1, 0.2, 1), new T.MeshToonMaterial({ color: '#ffffff' }), cols * rows);
    const m = new T.Matrix4(), c = new T.Color(), a = new T.Color('#3b4f3e'), b = new T.Color('#435a45');
    let i = 0;
    for (let x = 0; x < cols; x++) for (let z = 0; z < rows; z++) {
      m.makeTranslation(-w / 2 + x + 0.5, -0.1, -d / 2 + z + 0.5);
      tiles.setMatrixAt(i, m);
      tiles.setColorAt(i++, c.copy(a).lerp(b, H(x, z)));
    }
    this.group.add(tiles);

    const batch = new StaticBatch('iluminura');
    for (const [x, z, r] of pillars) batch.add({ ...PROPS.bush, scale: r * 2.4 }, x, z, H(x * 7, z * 3) * 6);
    const edge = (x, z, tall) => batch.add({ ...(tall ? PROPS.tree : PROPS.bush), scale: tall ? 1.3 : 1.1 }, x, z, H(x, z) * 6);
    for (let x = -w / 2 - 0.6; x <= w / 2 + 0.6; x += 1.1) {
      if (Math.abs(x + w / 4) > 1.4 && Math.abs(x - w / 4) > 1.4 && Math.abs(x) > 1.4) edge(x, -d / 2 - 0.9, true);   // vãos das portas
      edge(x, d / 2 + 0.7, false);                                                                                // lado de baixo baixo
    }
    for (let z = -d / 2; z <= d / 2; z += 1.1) { edge(-w / 2 - 0.9, z, true); edge(w / 2 + 0.9, z, true); }
    batch.build(this.group);

    const outer = new T.Mesh(new T.PlaneGeometry(w + 40, d + 40), new T.MeshBasicMaterial({ color: '#1a231c' }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.21; this.group.add(outer);
  }

  // portal: dois postes, verga e um véu brilhante na cor do tipo de sala
  addDoor(x, info) {
    const z = -this.d / 2 - 0.15, g = new T.Group();
    const post = (px) => { const p = new T.Mesh(new T.BoxGeometry(0.3, 1.5, 0.3), mat('steelD')); p.position.set(px, 0.75, 0); return p; };
    const top = new T.Mesh(new T.BoxGeometry(1.9, 0.28, 0.34), mat('steelD')); top.position.y = 1.55;
    const veil = new T.Mesh(new T.PlaneGeometry(1.3, 1.4), new T.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.55, side: T.DoubleSide }));
    veil.position.set(0, 0.72, 0);
    const pad = new T.Mesh(new T.PlaneGeometry(1.6, 1.1), new T.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.22 }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.02, 0.7);
    g.add(post(-0.8), post(0.8), top, veil, pad);
    g.position.set(x, 0, z); this.group.add(g);
    const door = { x, z: -this.d / 2, info, group: g, veil };
    this.doors.push(door);
    return door;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(o => { if (o.geometry && o.geometry !== geo) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
  }

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
  spawnPoint(avoid, taken, minDist = 4) {
    for (let k = 0; k < 80; k++) {
      const p = new T.Vector3((Math.random() - 0.5) * (this.w - 2), 0, (Math.random() - 0.5) * (this.d - 2));
      if (this.blocked(p, 0.8) || p.distanceTo(avoid) < minDist || taken.some(q => q.distanceTo(p) < 1.6)) continue;
      return p;
    }
    return new T.Vector3(0, 0, -this.d / 2 + 1.5);
  }
}
