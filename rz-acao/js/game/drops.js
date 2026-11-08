// Materiais que caem no chão e são atraídos até Kay (Fenda e refúgio).
import * as T from '../lib/three.js';
import { mat } from '../engine/voxel.js';
import { CFG } from './config.js';

const geo = new T.BoxGeometry(0.16, 0.16, 0.16);

export class Drop {
  constructor(pos, g, kind = 'liga') {
    this.g = g; this.kind = kind; this.t = 0; this.alive = true;
    this.pos = pos.clone(); this.pos.y = 0.4;
    const a = Math.random() * Math.PI * 2;
    this.vel = new T.Vector3(Math.cos(a) * 2.2, 3.5, Math.sin(a) * 2.2);
    this.mesh = new T.Mesh(geo, mat(CFG.mats[kind].glow)); g.scene.add(this.mesh);
  }
  update(dt, magnet) {
    const k = this.g.kay;
    this.t += dt;
    if (this.t < CFG.drops.magnetDelay && !magnet) {
      this.vel.y -= 14 * dt; this.pos.addScaledVector(this.vel, dt);
      if (this.pos.y < 0.15) { this.pos.y = 0.15; this.vel.set(0, 0, 0); }
    } else {
      const to = new T.Vector3(k.pos.x - this.pos.x, 0.5 - this.pos.y, k.pos.z - this.pos.z), d = to.length();
      const sp = CFG.drops.magnetSpeed * (this.g.mods?.extraDrop ? 1.6 : 1) * Math.min(1, 0.3 + this.t);
      if (d < 0.35) return this.collect();
      this.pos.addScaledVector(to.normalize(), Math.min(d, sp * dt));
    }
    this.mesh.position.copy(this.pos); this.mesh.rotation.y += dt * 6;
  }
  collect() { this.alive = false; this.g.scene.remove(this.mesh); this.g.collect(this.kind, 1); }
  remove() { this.alive = false; this.g.scene.remove(this.mesh); }
}

// solta n gotas de cada tipo: { liga: 3, cristal: 1 }
export function spawnDrops(g, list, pos, bundle) {
  for (const [kind, n] of Object.entries(bundle)) for (let i = 0; i < n; i++) list.push(new Drop(pos, g, kind));
}
