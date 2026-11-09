// Efeitos das bênçãos que mudam o estilo de luta: onda do 3º golpe e eco da esquiva.
import * as T from '../lib/three.js';

const soft = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: T.DoubleSide });

// Corte em onda: lâmina de energia que avança e atravessa inimigos (cada um é atingido uma vez)
export class SlashWave {
  constructor(g, pos, face, dmg) {
    this.g = g; this.face = face; this.dmg = dmg; this.t = 0; this.hit = new Set();
    this.pos = pos.clone().add(new T.Vector3(Math.sin(face) * 0.6, 0, Math.cos(face) * 0.6));
    this.group = new T.Group();
    const blade = new T.Mesh(new T.PlaneGeometry(1.5, 0.35), soft('#9be7f2', 0.85));
    blade.rotation.x = -Math.PI / 2; blade.position.y = 0.35;
    const core = new T.Mesh(new T.BoxGeometry(1.3, 0.08, 0.08), new T.MeshBasicMaterial({ color: '#e8fbff' }));
    core.position.y = 0.4;
    this.group.add(blade, core); this.blade = blade;
    this.group.position.copy(this.pos); this.group.rotation.y = face;
    g.scene.add(this.group);
  }
  update(dt) {
    const g = this.g, sp = 12, dir = new T.Vector3(Math.sin(this.face), 0, Math.cos(this.face));
    this.t += dt; this.pos.addScaledVector(dir, sp * dt); this.group.position.copy(this.pos);
    this.blade.material.opacity = 0.85 * (1 - this.t / 0.4);
    for (const e of g.enemies) {
      if (!e.targetable || this.hit.has(e) || Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) > 0.75 + e.radius) continue;
      this.hit.add(e); e.takeHit({ dmg: this.dmg, guard: 1, quiet: true, knock: 3, spark: '#9be7f2' }, this.pos.clone().addScaledVector(dir, -1), g, false);
    }
    if (this.t >= 0.4 || g.arena.blocked(this.pos, 0.2)) { g.scene.remove(this.group); return false; }
    return true;
  }
}

// Eco da esquiva: imagem de Kay que fica para trás e explode
export class DodgeEcho {
  constructor(g, pos) {
    this.g = g; this.pos = pos.clone(); this.t = 0; this.fired = false;
    this.group = new T.Group();
    this.ghost = new T.Mesh(new T.BoxGeometry(0.45, 0.9, 0.35), soft('#c9a6ff', 0.45)); this.ghost.position.y = 0.45;
    this.ring = new T.Mesh(new T.RingGeometry(1.2, 1.32, 32), soft('#c9a6ff', 0.0)); this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.04;
    this.group.add(this.ghost, this.ring); this.group.position.copy(this.pos);
    g.scene.add(this.group);
  }
  update(dt) {
    const g = this.g; this.t += dt;
    const fuse = 0.45;
    this.ghost.material.opacity = 0.45 + Math.sin(this.t * 30) * 0.15;
    this.ring.material.opacity = Math.min(0.5, this.t / fuse * 0.5);
    if (!this.fired && this.t >= fuse) {
      this.fired = true;
      g.fx.burst(this.pos, '#c9a6ff', 14, 4, 0.5); g.fx.ring(this.pos, '#c9a6ff', 0.3, 0.3, 1.5, 0.7);
      for (const e of g.enemies) if (e.targetable && Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) < 1.3 + e.radius) {
        e.takeHit({ dmg: 1.5, guard: 1, quiet: true, knock: 4, spark: '#c9a6ff' }, this.pos, g, false);
      }
    }
    if (this.fired) { g.scene.remove(this.group); return false; }
    return true;
  }
}
