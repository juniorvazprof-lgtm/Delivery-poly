// Companheira: segue Kay sem bloquear a passagem, dá um apoio automático discreto
// e usa a habilidade elemental quando o jogador toca o botão (com recarga visível).
import * as T from '../lib/three.js';
import { buildModel, blobShadow, mat } from '../engine/voxel.js';
import { animateIdle } from '../engine/idle.js';
import { MODELS } from '../data/models.js';
import { CFG } from './config.js';
import { mergeModel } from './merge.js';
import { footMarker, COL } from './fx.js';

const faceOf = (x, z) => Math.atan2(x, z);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const cube = new T.BoxGeometry(1, 1, 1);
const soft = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: T.DoubleSide });

export class Companion {
  constructor(kind, g) {
    this.kind = kind; this.cfg = CFG.companions[kind]; this.g = g;
    this.root = new T.Group();
    this.body = buildModel(MODELS[kind]); this.body.scale.multiplyScalar(this.cfg.scale); this.base = this.body.scale.x;
    mergeModel(this.body);
    this.root.add(this.body, blobShadow(0.28), footMarker(COL.friend, 0.32, 32, 0.35));
    g.scene.add(this.root);
    this.pos = g.kay.pos.clone().add(new T.Vector3(0.8, 0, 0.6));
    this.vel = new T.Vector3(); this.side = 1; this.flipT = 0;
    this.face = Math.PI; this.cd = 0; this.cast = 0; this.poke = CFG.companionPoke.every; this.phase = Math.random() * 6;
  }
  destroy() { this.g.scene.remove(this.root); }
  placeNearKay() { this.pos.copy(this.g.kay.pos).add(new T.Vector3(-(this.side || 1) * 1.0, 0, 0.35)); this.vel?.set(0, 0, 0); }
  get ready() { return this.cd <= 0; }
  get cdFrac() { return Math.max(0, this.cd / this.cfg.cooldown); }

  // alvo assistido: inimigo mais próximo no cone frontal de Kay; senão o mais próximo; senão à frente de Kay
  target(maxRange = 9) {
    const k = this.g.kay; let best = null, bd = 1e9, front = null, fd = 1e9;
    for (const e of this.g.enemies) {
      if (!e.targetable) continue;
      const dx = e.pos.x - k.pos.x, dz = e.pos.z - k.pos.z, d = Math.hypot(dx, dz);
      if (d > maxRange) continue;
      if (d < bd) { best = e; bd = d; }
      if (Math.abs(angDiff(faceOf(dx, dz), k.face)) < 0.8 && d < fd) { front = e; fd = d; }
    }
    return front || best;
  }

  update(dt, input) {
    const g = this.g, k = g.kay, c = this.cfg;
    this.cd = Math.max(0, this.cd - dt); this.cast = Math.max(0, this.cast - dt);
    // seguir sem tontura: ponto fixo ao lado de Kay (não gira com ele), zona morta e aceleração suave.
    // O lado só troca quando Kay anda um tempo na direção oposta.
    const mv = k.state === 'free' ? input.move() : { x: 0, z: 0 };
    if (Math.abs(mv.x) > 0.5 && Math.sign(mv.x) === this.side) { this.flipT += dt; if (this.flipT > 0.7) { this.side *= -1; this.flipT = 0; } } else this.flipT = 0;
    const tx = k.pos.x - this.side * 1.0, tz = k.pos.z + 0.35;
    const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
    if (d > 8) { this.placeNearKay(); this.vel.set(0, 0, 0); }
    const want = this.cast > 0 || d < 0.9 ? 0 : Math.min(CFG.kay.speed * 1.05, (d - 0.6) * 4);
    const wx = d > 1e-3 ? dx / d * want : 0, wz = d > 1e-3 ? dz / d * want : 0, f = 1 - Math.exp(-6 * dt);
    this.vel.x += (wx - this.vel.x) * f; this.vel.z += (wz - this.vel.z) * f;
    this.pos.addScaledVector(this.vel, dt);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const faceTo = sp > 0.4 ? faceOf(this.vel.x, this.vel.z) : k.face;
    if (this.cast <= 0) this.face += Math.max(-7 * dt, Math.min(7 * dt, angDiff(faceTo, this.face)));
    this.walk = (this.walk || 0) + dt * sp * 2.2;
    g.arena.resolve(this.pos, 0.25);

    // habilidade
    if (input.skill(CFG.kay.inputBuffer) && k.state !== 'dead') {
      input.consumeSkill();
      if (this.ready) this.useSkill(); else g.onSkillNotReady?.();
    }
    // apoio automático discreto
    this.poke -= dt;
    if (this.poke <= 0) {
      const e = this.target(CFG.companionPoke.range + 1);
      if (e && Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) < CFG.companionPoke.range) {
        e.takeHit({ dmg: CFG.companionPoke.dmg, guard: 0, quiet: true, knock: 0.6, spark: c.color }, this.pos, g, false);
        this.face = faceOf(e.pos.x - this.pos.x, e.pos.z - this.pos.z); this.cast = 0.15;
      }
      this.poke = CFG.companionPoke.every;
    }
    this.animate();
  }

  useSkill() {
    const g = this.g, k = g.kay, c = this.cfg, e = this.target();
    const aim = e ? faceOf(e.pos.x - k.pos.x, e.pos.z - k.pos.z) : k.face;
    this.cd = c.cooldown; this.cast = 0.35; this.face = aim;
    if (this.kind === 'brasque') g.effects.push(new FireStrip(g, this.pos.clone(), e ? faceOf(e.pos.x - this.pos.x, e.pos.z - this.pos.z) : aim, c.fire));
    if (this.kind === 'marolho') g.effects.push(new Wave(g, k.pos.clone(), aim, c.wave));
    if (this.kind === 'brogume') {
      const r = c.roots, at = e && Math.hypot(e.pos.x - k.pos.x, e.pos.z - k.pos.z) < r.reach ? e.pos.clone() : k.pos.clone().add(new T.Vector3(Math.sin(aim) * 2.4, 0, Math.cos(aim) * 2.4));
      g.effects.push(new Roots(g, at, r));
    }
    g.onSkill?.(this);
  }

  animate() {
    const b = this.body, s = this.base;
    this.root.position.copy(this.pos); this.root.rotation.y = this.face;
    b.rotation.set(0, 0, 0); b.scale.setScalar(s);
    animateIdle(b, this.g.time, this.phase);
    if (this.cast > 0) {   // pose da habilidade
      const p = this.cast / 0.35;
      if (this.kind === 'brasque') { b.scale.y = s * (0.8 + 0.2 * (1 - p)); b.rotation.x = 0.25 * p; }   // abaixa o corpo e projeta
      if (this.kind === 'marolho') { b.scale.x = b.scale.z = s * (1 + 0.15 * p); b.rotation.x = -0.2 * p; }   // abre e recua
      if (this.kind === 'brogume') { b.position.y = Math.abs(Math.sin(p * 9)) * 0.06; }   // finca as patas
    } else b.position.y += Math.abs(Math.sin(this.walk || 0)) * 0.03;
  }
}

// Brasque: faixa de fogo no chão que queima quem estiver nela
class FireStrip {
  constructor(g, origin, dir, f) {
    this.g = g; this.f = f; this.t = 0; this.tick = 0; this.origin = origin; this.dir = dir;
    this.group = new T.Group(); this.group.position.copy(origin); this.group.rotation.y = dir;
    const floor = new T.Mesh(new T.PlaneGeometry(f.width, f.len), soft('#ff9b3d', 0.22));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.03, f.len / 2); this.group.add(floor); this.floor = floor;
    this.flames = [];
    for (let i = 0; i < 14; i++) {
      const fl = new T.Mesh(cube, mat(i % 3 ? 'flame' : 'flame2'));
      const z = 0.4 + (i / 13) * (f.len - 0.5), x = (Math.random() - 0.5) * f.width * 0.7, s = 0.14 + Math.random() * 0.12;
      fl.position.set(x, s / 2, z); fl.scale.set(s, s * 2, s); fl.userData.s = s; fl.userData.ph = Math.random() * 6; fl.userData.z = z;
      this.group.add(fl); this.flames.push(fl);
    }
    g.scene.add(this.group);
  }
  update(dt) {
    const f = this.f, g = this.g; this.t += dt; this.tick -= dt;
    const grow = Math.min(1, this.t / 0.2), fade = Math.max(0, 1 - Math.max(0, this.t - f.dur + 0.4) / 0.4);
    for (const fl of this.flames) {
      const on = fl.userData.z <= grow * f.len ? 1 : 0, h = fl.userData.s * (1.6 + Math.sin(this.t * 14 + fl.userData.ph) * 0.6) * fade * on;
      fl.scale.y = Math.max(0.001, h); fl.position.y = h / 2;
    }
    this.floor.material.opacity = 0.22 * fade;
    if (this.tick <= 0 && this.t < f.dur) {
      this.tick = f.tick;
      const sx = Math.sin(this.dir), sz = Math.cos(this.dir);
      for (const e of g.enemies) {
        if (!e.targetable) continue;
        const rx = e.pos.x - this.origin.x, rz = e.pos.z - this.origin.z, along = rx * sx + rz * sz, perp = Math.abs(rx * sz - rz * sx);
        if (along > -e.radius && along < f.len * grow + e.radius && perp < f.width / 2 + e.radius)
          e.takeHit({ dmg: f.dmg, guard: f.guard, quiet: true, knock: 0.4, spark: '#ff9b3d' }, this.origin, g, false);
      }
    }
    if (this.t >= f.dur) { g.scene.remove(this.group); return false; }
    return true;
  }
}

// Marolho: onda em arco que avança, empurra, interrompe e apaga projéteis
class Wave {
  constructor(g, origin, dir, w) {
    this.g = g; this.w = w; this.t = 0; this.origin = origin; this.dir = dir; this.hit = new Set();
    const a = T.MathUtils.degToRad(w.arc);
    this.mesh = new T.Mesh(new T.RingGeometry(0.82, 1, 32, 1, -Math.PI / 2 - a / 2, a), soft('#7fd8ff', 0.55));
    this.inner = new T.Mesh(new T.RingGeometry(0.6, 0.82, 32, 1, -Math.PI / 2 - a / 2, a), soft('#36B6D5', 0.3));
    this.group = new T.Group(); const rot = new T.Group(); rot.rotation.x = -Math.PI / 2; rot.position.y = 0.05; rot.add(this.mesh, this.inner);
    this.group.add(rot); this.group.position.copy(origin); this.group.rotation.y = dir;
    g.scene.add(this.group);
  }
  update(dt) {
    const w = this.w, g = this.g; this.t += dt;
    const p = Math.min(1, this.t / w.time), r = 0.5 + p * w.range, half = T.MathUtils.degToRad(w.arc) / 2;
    this.mesh.scale.set(r, r, 1); this.inner.scale.set(r, r, 1);
    this.mesh.material.opacity = 0.55 * (1 - p * 0.6); this.inner.material.opacity = 0.3 * (1 - p);
    const inside = pos => { const dx = pos.x - this.origin.x, dz = pos.z - this.origin.z, d = Math.hypot(dx, dz); return d <= r + 0.4 && (d < 0.6 || Math.abs(angDiff(faceOf(dx, dz), this.dir)) <= half); };
    for (const e of g.enemies) {
      if (!e.targetable || this.hit.has(e) || !inside(e.pos)) continue;
      this.hit.add(e);
      e.takeHit({ dmg: w.dmg, guard: w.guard, quiet: true, knock: w.knock, spark: '#9be7f2' }, this.origin, g, false);
      if (e.state === 'windup' || e.state === 'move') { e.cancelAttack(); e.setState('flinch'); }
    }
    for (const pr of g.projectiles) if (pr.alive && inside(pr.pos)) pr.kill();
    if (this.t >= w.time + 0.15) { g.scene.remove(this.group); return false; }
    return true;
  }
}

// Brogume: área marcada, depois raízes sobem e prendem quem estiver dentro
class Roots {
  constructor(g, at, r) {
    this.g = g; this.r = r; this.t = 0; this.at = at; this.fired = false;
    this.group = new T.Group(); this.group.position.set(at.x, 0, at.z);
    this.ring = new T.Mesh(new T.RingGeometry(r.radius * 0.9, r.radius, 40), soft('#8fd06a', 0.7));
    this.disc = new T.Mesh(new T.CircleGeometry(r.radius, 40), soft('#76B868', 0.15));
    for (const m of [this.ring, this.disc]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.04; this.group.add(m); }
    this.spikes = [];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r.radius * 0.9;
      const sp = new T.Mesh(cube, mat(i % 3 === 0 ? 'leaf' : i % 3 === 1 ? 'bark' : 'beet'));
      const h = 0.35 + Math.random() * 0.4; sp.userData.h = h;
      sp.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); sp.scale.set(0.12, 0.001, 0.12); sp.rotation.set((Math.random() - 0.5) * 0.6, a, (Math.random() - 0.5) * 0.6);
      this.group.add(sp); this.spikes.push(sp);
    }
    g.scene.add(this.group);
  }
  update(dt) {
    const r = this.r, g = this.g; this.t += dt;
    const grow = T.MathUtils.clamp((this.t - r.delay) / 0.12, 0, 1), end = r.delay + r.hold, sink = T.MathUtils.clamp((this.t - end) / 0.3, 0, 1);
    for (const sp of this.spikes) { const h = sp.userData.h * grow * (1 - sink); sp.scale.y = Math.max(0.001, h); sp.position.y = h / 2; }
    this.ring.material.opacity = 0.7 * (1 - sink); this.disc.material.opacity = (this.t < r.delay ? 0.25 : 0.12) * (1 - sink);
    if (!this.fired && this.t >= r.delay) {
      this.fired = true;
      for (const e of g.enemies) {
        if (!e.targetable || Math.hypot(e.pos.x - this.at.x, e.pos.z - this.at.z) > r.radius + e.radius * 0.5) continue;
        e.takeHit({ dmg: r.dmg, guard: r.guard, quiet: true, knock: 0, spark: '#8fd06a' }, this.at, g, false);
        e.entangle(r.hold);
      }
      g.fx.burst(this.at, '#8fd06a', 10, 2.5, 0.2);
    }
    if (sink >= 1) { g.scene.remove(this.group); return false; }
    return true;
  }
}
