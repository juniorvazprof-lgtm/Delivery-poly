// Guardião da Fenda Verde: Arborion Ancião. Duas fases, poucos padrões e pausas claras entre sequências.
// Só os golpes grandes do Guardião marcam o chão (inimigos comuns avisam apenas pelo corpo).
import * as T from '../lib/three.js';
import { buildModel, blobShadow } from '../engine/voxel.js';
import { animateIdle } from '../engine/idle.js';
import { MODELS } from '../data/models.js';
import { CFG } from './config.js';
import { mergeModel, setFlash } from './merge.js';
import { COL } from './fx.js';
import { Projectile } from './enemies.js';

const faceOf = (x, z) => Math.atan2(x, z);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export class Guardian {
  constructor(pos, g) {
    const c = this.cfg = CFG.guardian; this.g = g; this.kind = 'guardian'; this.boss = true;
    this.pos = pos.clone(); this.radius = c.radius; this.hp = c.hp; this.guard = c.guard;
    this.state = 'spawn'; this.t = 0; this.phase2 = false; this.pause = 1.2; this.queue = []; this.tele = [];
    this.face = 0; this.knock = new T.Vector3(); this.flash = 0; this.sinceHit = 99;
    this.root = new T.Group();
    this.body = buildModel(MODELS[c.model]); this.body.scale.multiplyScalar(c.scale); this.base = this.body.scale.x;
    this.flashMeshes = mergeModel(this.body);
    this.root.add(this.body, blobShadow(c.radius));
    g.scene.add(this.root);
    g.fx.ring(pos, COL.rift, 1.2, 3, 0.4, 0.9);
    g.onBoss?.(this);
  }
  get targetable() { return this.state !== 'spawn' && this.state !== 'dying'; }
  get alive() { return this.state !== 'gone'; }
  setState(s) { this.state = s; this.t = 0; }
  cancelAttack() { this.tele.forEach(t => t.remove()); this.tele = []; }
  entangle(dur) { if (this.state === 'idle' || this.state === 'move') this.pause = Math.max(this.pause, dur * 0.5); }   // raízes só atrasam o Guardião
  rollWindup() {}

  // escolhe a próxima sequência; na fase 2 encadeia golpes já aprendidos
  plan() {
    const k = this.g.kay, d = Math.hypot(k.pos.x - this.pos.x, k.pos.z - this.pos.z);
    if (!this.phase2) this.queue = d < 3.5 ? ['slam'] : ['charge'];
    else this.queue = d < 3.5 ? ['slam', 'charge'] : ['charge', 'triple'];
  }

  update(dt) {
    const g = this.g, c = this.cfg, k = g.kay, P = this.phase2 ? c.p2 : c.p1;
    this.t += dt; this.flash = Math.max(0, this.flash - dt); this.sinceHit += dt;
    this.pos.addScaledVector(this.knock, dt); this.knock.multiplyScalar(Math.pow(0.002, dt));
    const dx = k.pos.x - this.pos.x, dz = k.pos.z - this.pos.z, dist = Math.hypot(dx, dz), toK = faceOf(dx, dz);
    switch (this.state) {
      case 'spawn': if (this.t >= 1.2) this.setState('move'); break;
      case 'move': {   // aproxima devagar e respira entre sequências
        this.face += Math.max(-3 * dt, Math.min(3 * dt, angDiff(toK, this.face)));
        if (dist > 2.6) { this.pos.x += dx / dist * c.speed * dt; this.pos.z += dz / dist * c.speed * dt; }
        this.pause -= dt;
        if (this.pause <= 0 && k.state !== 'dead') { if (!this.queue.length) this.plan(); this.next(); }
        break;
      }
      case 'slamWind': {
        const p = Math.min(1, this.t / P.slamWind);
        this.tele[0].set(this.pos, 0, p);
        if (this.t >= P.slamWind) { this.tele[0].strike(); this.hitCircle(this.pos, c.slamRadius); this.burstRing(); this.setState('recover'); this.recoverFor = P.recover; }
        break;
      }
      case 'chargeWind': {
        const p = Math.min(1, this.t / P.chargeWind);
        if (this.t < P.chargeWind * 0.6) this.aim = this.face = faceOf(dx, dz);
        this.tele[0].set(this.pos, this.aim, p, this.t >= P.chargeWind * 0.6);
        if (this.t >= P.chargeWind) { this.setState('charge'); this.dashed = 0; this.hitDone = false; }
        break;
      }
      case 'charge': {
        const step = c.dashSpeed * dt, nx = this.pos.x + Math.sin(this.aim) * step, nz = this.pos.z + Math.cos(this.aim) * step;
        const wall = g.arena.blocked({ x: nx, z: nz }, this.radius);
        if (!wall) { this.pos.x = nx; this.pos.z = nz; this.dashed += step; }
        if (!this.hitDone && Math.hypot(k.pos.x - this.pos.x, k.pos.z - this.pos.z) < this.radius + CFG.kay.radius) {
          if (k.hurt(c.dmg, this.pos, g)) { this.hitDone = true; g.onKayHurt(); }
        }
        if (wall || this.dashed >= c.dashDist) {
          this.cancelAttack(); this.setState('recover');
          this.recoverFor = wall ? c.wallStun : P.recover;
          if (wall) { g.fx.ring(this.pos, COL.guard, 0.5, 0.5, 1.8); g.hitstop = 0.06; }
        }
        break;
      }
      case 'triple': {   // três impactos em sequência onde Kay estava
        const each = P.tripleEach;
        for (let i = 0; i < this.spots.length; i++) {
          const s = this.spots[i], t0 = i * each * 0.55, p = (this.t - t0) / each;
          if (p >= 0 && !s.tele) { s.tele = g.fx.sector(c.tripleRadius, 359.9); this.tele.push(s.tele); }
          if (s.tele && !s.done) s.tele.set(s.pos, 0, Math.min(1, p));
          if (p >= 1 && !s.done) { s.done = true; s.tele.strike(); this.hitCircle(s.pos, c.tripleRadius); g.fx.burst(s.pos, '#8fd06a', 8, 3, 0.2); setTimeout(() => s.tele.remove(), 120); }
        }
        if (this.spots.every(s => s.done)) { this.tele = []; this.setState('recover'); this.recoverFor = P.recover; }
        break;
      }
      case 'recover': if (this.t >= this.recoverFor) { this.setState('move'); this.pause = this.queue.length ? P.chain : P.between; } break;
      case 'stunned': if (this.t >= c.stun) { this.guard = c.guard; this.setState('move'); this.pause = 0.5; } break;
      case 'dying': if (this.t >= 1.2) { this.destroy(); this.state = 'gone'; } break;
    }
    if (this.state !== 'gone') { g.arena.resolve(this.pos, this.radius); this.animate(); }
  }

  next() {
    const g = this.g, c = this.cfg, k = g.kay, kind = this.queue.shift();
    this.cancelAttack();
    if (kind === 'slam') { this.tele = [g.fx.sector(c.slamRadius, 359.9)]; this.setState('slamWind'); }
    if (kind === 'charge') { this.aim = this.face; this.tele = [g.fx.line(c.dashDist + this.radius, this.radius * 2)]; this.setState('chargeWind'); }
    if (kind === 'triple') {
      this.spots = [0, 1, 2].map(i => ({ pos: k.pos.clone().add(new T.Vector3((Math.random() - 0.5) * 1.6 * i, 0, (Math.random() - 0.5) * 1.6 * i)), done: false }));
      this.setState('triple');
    }
  }
  hitCircle(pos, r) {
    const k = this.g.kay;
    this.g.fx.ring(pos, '#c9a6ff', 0.45, 0.3, r * 1.1);
    if (Math.hypot(k.pos.x - pos.x, k.pos.z - pos.z) < r + CFG.kay.radius && k.hurt(this.cfg.dmg, pos, this.g)) this.g.onKayHurt();
  }
  // fase 2: o pisão solta um anel de esporos lentos
  burstRing() {
    if (!this.phase2) return;
    const c = this.cfg, n = c.ringShots;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.random() * 0.3, dir = new T.Vector3(Math.sin(a), 0, Math.cos(a));
      this.g.projectiles.push(new Projectile(this.pos.clone().addScaledVector(dir, this.radius + 0.2), dir.multiplyScalar(c.ringSpeed), { projRadius: 0.22, dmg: 1, projRange: 9, projSpeed: c.ringSpeed }, this.g));
    }
  }

  takeHit(atk, from, g) {
    if (!this.targetable) return;
    const stunned = this.state === 'stunned', c = this.cfg;
    this.hp -= atk.dmg * (stunned ? 1.5 : 1); this.flash = 0.06; this.sinceHit = 0;
    g.fx.burst(this.pos, atk.spark || '#e8fbff', 4, 3, 1);
    if (!atk.quiet) g.onEnemyHit(false);
    if (!stunned && (this.state === 'move' || this.state === 'recover')) {
      this.guard = Math.max(0, this.guard - atk.guard);
      if (this.guard === 0) { this.cancelAttack(); this.setState('stunned'); g.fx.ring(this.pos, COL.guard, 0.6, 0.6, 2); g.onGuardBreak(); }
    }
    if (!this.phase2 && this.hp <= c.hp * 0.5) {   // fase 2
      this.phase2 = true; this.queue = []; this.pause = 0.8;
      g.fx.ring(this.pos, COL.rift, 0.8, 0.5, 3.5); g.ui?.toast('O Guardião desperta a Fenda', COL.rift);
    }
    if (this.hp <= 0) {
      this.cancelAttack(); this.setState('dying');
      g.fx.burst(this.pos, COL.rift, 30, 5, 1); g.fx.ring(this.pos, COL.rift, 1, 0.5, 4); g.onEnemyKilled?.(this);
    }
    g.onBossHp?.(this);
  }

  animate() {
    const b = this.body, s = this.base, P = this.phase2 ? this.cfg.p2 : this.cfg.p1;
    this.root.position.copy(this.pos); this.root.rotation.y = this.face;
    b.rotation.set(0, 0, 0); b.scale.setScalar(s); b.position.set(0, 0, 0);
    animateIdle(b, this.g.time, 0);
    setFlash(this.flashMeshes, this.flash > 0);
    switch (this.state) {
      case 'spawn': b.scale.setScalar(s * Math.min(1, this.t / 1.2)); break;
      case 'slamWind': { const p = Math.min(1, this.t / P.slamWind); b.position.y = 0.5 * p; b.rotation.x = -0.3 * p; break; }   // ergue o corpo
      case 'chargeWind': { const p = Math.min(1, this.t / P.chargeWind); b.rotation.x = -0.25 * p; b.position.z = -0.3 * p; b.position.x = Math.sin(this.t * 40) * 0.03 * p; break; }
      case 'charge': b.rotation.x = 0.3; break;
      case 'triple': b.position.y = Math.abs(Math.sin(this.t * 10)) * 0.25; break;
      case 'recover': b.rotation.x = 0.15; b.scale.y = s * 0.94; break;
      case 'stunned': b.rotation.z = Math.sin(this.t * 7) * 0.15; b.scale.y = s * 0.88; break;
      case 'dying': { const q = Math.max(0.01, 1 - this.t / 1.2); b.scale.setScalar(s * q); b.position.y = -0.4 * (1 - q); break; }
    }
  }
  destroy() { this.cancelAttack(); this.g.scene.remove(this.root); }
}
