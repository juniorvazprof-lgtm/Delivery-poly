// Guardião da Fenda Verde: Arborion Ancião. Duas fases, sem marcação no chão:
// como os outros inimigos, ele avisa só pelo corpo (pose de preparação + brilho branco).
import * as T from '../lib/three.js';
import { buildModel, blobShadow } from '../engine/voxel.js';
import { animateIdle } from '../engine/idle.js';
import { MODELS } from '../data/models.js';
import { CFG } from './config.js';
import { mergeModel, setFlash } from './merge.js';
import { COL } from './fx.js';
import { Enemy, Projectile } from './enemies.js';

const faceOf = (x, z) => Math.atan2(x, z);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const WIND = { slamWind: 'slam', chargeWind: 'charge', leapWind: 'leap' };

export class Guardian {
  constructor(pos, g) {
    const c = this.cfg = CFG.guardian; this.g = g; this.kind = 'guardian'; this.boss = true;
    this.pos = pos.clone(); this.radius = c.radius; this.hp = c.hp; this.guard = c.guard;
    this.state = 'spawn'; this.t = 0; this.phase2 = false; this.pause = 1.0; this.queue = []; this.summonT = 0;
    this.face = 0; this.knock = new T.Vector3(); this.flash = 0; this.burnT = 0; this.burnTick = 0;
    this.root = new T.Group();
    this.body = buildModel(MODELS[c.model]); this.body.scale.multiplyScalar(c.scale); this.base = this.body.scale.x;
    this.flashMeshes = mergeModel(this.body);
    this.root.add(this.body, blobShadow(c.radius));
    g.scene.add(this.root);
    g.onBoss?.(this);
  }
  get targetable() { return this.state !== 'spawn' && this.state !== 'dying' && this.state !== 'leap'; }
  get alive() { return this.state !== 'gone'; }
  get P() { return this.phase2 ? this.cfg.p2 : this.cfg.p1; }
  setState(s) { this.state = s; this.t = 0; }
  cancelAttack() {}
  entangle(dur) { if (this.state === 'move') this.pause = Math.max(this.pause, dur * 0.4); }   // controle só atrasa o Guardião
  rollWindup() {}
  burn(dur) { this.burnT = Math.max(this.burnT, dur); }

  // sequências: fase 1 alterna golpes; fase 2 encadeia 2–3 golpes já aprendidos
  plan() {
    const k = this.g.kay, d = Math.hypot(k.pos.x - this.pos.x, k.pos.z - this.pos.z), r = Math.random();
    if (!this.phase2) this.queue = d < 3 ? ['slam'] : r < 0.5 ? ['charge'] : ['leap'];
    else this.queue = r < 0.35 ? ['leap', 'leap', 'slam'] : r < 0.7 ? ['charge', 'charge'] : d < 3 ? ['slam', 'leap'] : ['charge', 'leap'];
  }

  update(dt) {
    const g = this.g, c = this.cfg, k = g.kay, P = this.P;
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.burnT > 0) { this.burnT -= dt; this.burnTick -= dt; if (this.burnTick <= 0) { this.burnTick = 0.5; this.takeHit({ dmg: 0.5, guard: 0, quiet: true, spark: '#ff9b3d' }, this.pos, g); } }
    this.pos.addScaledVector(this.knock, dt); this.knock.multiplyScalar(Math.pow(0.002, dt));
    const dx = k.pos.x - this.pos.x, dz = k.pos.z - this.pos.z, dist = Math.hypot(dx, dz), toK = faceOf(dx, dz);
    // fase 2: chama reforços quando há poucos
    if (this.phase2 && this.targetable) {
      this.summonT -= dt;
      if (this.summonT <= 0 && g.enemies.filter(e => !e.boss && e.alive).length < c.minions) {
        this.summonT = c.summonEvery;
        for (let i = 0; i < c.minions; i++) g.enemies.push(new Enemy(i % 2 ? 'charger' : 'chaser', g.arena.spawnPoint(k.pos, [], 3.5), g));
      }
    }
    switch (this.state) {
      case 'spawn': if (this.t >= 1.0) this.setState('move'); break;
      case 'move':
        this.face += Math.max(-4 * dt, Math.min(4 * dt, angDiff(toK, this.face)));
        if (dist > 2.2) { this.pos.x += dx / dist * c.speed * dt; this.pos.z += dz / dist * c.speed * dt; }
        this.pause -= dt;
        if (this.pause <= 0 && k.state !== 'dead') { if (!this.queue.length) this.plan(); this.next(); }
        break;
      case 'slamWind':
        this.face += Math.max(-4 * dt, Math.min(4 * dt, angDiff(toK, this.face)));
        if (this.t >= P.slamWind) { this.impact(this.pos, c.slamRadius, c.slamDmg); this.recover(P.recover); }
        break;
      case 'chargeWind':
        if (this.t < P.chargeWind * 0.7) this.aim = this.face = faceOf(dx, dz);   // trava a direção um pouco antes
        if (this.t >= P.chargeWind) { this.setState('charge'); this.dashed = 0; this.hitDone = false; }
        break;
      case 'charge': {
        const step = c.dashSpeed * dt, nx = this.pos.x + Math.sin(this.aim) * step, nz = this.pos.z + Math.cos(this.aim) * step;
        const wall = g.arena.blocked({ x: nx, z: nz }, this.radius);
        if (!wall) { this.pos.x = nx; this.pos.z = nz; this.dashed += step; }
        if (!this.hitDone && Math.hypot(k.pos.x - this.pos.x, k.pos.z - this.pos.z) < this.radius + CFG.kay.radius && k.hurt(c.dmg, this.pos, g)) { this.hitDone = true; g.onKayHurt(); }
        if (wall || this.dashed >= c.dashDist) {
          if (wall) { g.fx.burst(this.pos, '#c9b28a', 12, 4, 0.4); g.hitstop = 0.06; }
          this.recover(wall ? c.wallStun : P.recover);
        }
        break;
      }
      case 'leapWind':
        this.face += Math.max(-5 * dt, Math.min(5 * dt, angDiff(toK, this.face)));
        if (this.t >= P.leapWind) { this.from = this.pos.clone(); this.to = k.pos.clone(); this.setState('leap'); }
        break;
      case 'leap': {   // salto até onde Kay estava; a sombra no chão mostra o pouso
        const p = Math.min(1, this.t / c.leapTime);
        this.pos.lerpVectors(this.from, this.to, p);
        if (p >= 1) { this.impact(this.pos, c.leapRadius, c.dmg); this.recover(P.recover * 0.6); }
        break;
      }
      case 'recover': if (this.t >= this.recoverFor) { this.setState('move'); this.pause = this.queue.length ? P.chain : P.between; } break;
      case 'stunned': if (this.t >= c.stun) { this.guard = c.guard; this.setState('move'); this.pause = 0.3; } break;
      case 'dying': if (this.t >= 1.2) { this.destroy(); this.state = 'gone'; } break;
    }
    if (this.state !== 'gone') { if (this.state !== 'leap') g.arena.resolve(this.pos, this.radius); this.animate(); }
  }

  next() {
    const kind = this.queue.shift();
    if (kind === 'charge') this.aim = this.face;
    this.setState(kind + 'Wind');
  }
  recover(t) { this.setState('recover'); this.recoverFor = t; }
  impact(pos, r, dmg) {
    const g = this.g, k = g.kay;
    g.fx.burst(pos, '#8fd06a', 14, 4.5, 0.2); g.fx.burst(pos, '#c9b28a', 8, 3, 0.1); g.hitstop = Math.max(g.hitstop, 0.05);
    if (Math.hypot(k.pos.x - pos.x, k.pos.z - pos.z) < r + CFG.kay.radius && k.hurt(dmg, pos, g)) g.onKayHurt();
    if (this.phase2) this.burstRing(pos);
  }
  // fase 2: impactos soltam um anel de esporos lentos
  burstRing(pos) {
    const c = this.cfg, n = c.ringShots, off = Math.random();
    for (let i = 0; i < n; i++) {
      const a = (i + off) / n * Math.PI * 2, dir = new T.Vector3(Math.sin(a), 0, Math.cos(a));
      this.g.projectiles.push(new Projectile(pos.clone().addScaledVector(dir, this.radius + 0.2), dir.multiplyScalar(c.ringSpeed), { projRadius: 0.22, dmg: 1, projRange: 8, projSpeed: c.ringSpeed }, this.g));
    }
  }

  takeHit(atk, from, g) {
    if (!this.targetable) return;
    const stunned = this.state === 'stunned', c = this.cfg;
    this.hp -= atk.dmg * (stunned ? 1.5 : 1); this.flash = Math.max(this.flash, 0.06);
    g.fx.burst(this.pos, atk.spark || '#e8fbff', 4, 3, 1);
    if (!atk.quiet) g.onEnemyHit(false);
    if (!stunned && (this.state === 'move' || this.state === 'recover')) {
      this.guard = Math.max(0, this.guard - atk.guard);
      if (this.guard === 0) { this.setState('stunned'); g.fx.burst(this.pos, COL.guard, 12, 3.5, 1.2); g.onGuardBreak(); }
    }
    if (!this.phase2 && this.hp <= c.hp * 0.5) {   // fase 2
      this.phase2 = true; this.queue = []; this.pause = 0.6; this.summonT = 0;
      g.fx.burst(this.pos, COL.rift, 20, 5, 1.2); g.ui?.toast('O Guardião desperta a Fenda', COL.rift);
    }
    if (this.hp <= 0) {
      this.setState('dying');
      g.fx.burst(this.pos, COL.rift, 30, 5, 1); g.onEnemyKilled?.(this);
    }
    g.onBossHp?.(this);
  }

  animate() {
    const b = this.body, s = this.base, P = this.P, c = this.cfg;
    this.root.position.set(this.pos.x, 0, this.pos.z); this.root.rotation.y = this.face;
    b.rotation.set(0, 0, 0); b.scale.setScalar(s); b.position.set(0, 0, 0);
    animateIdle(b, this.g.time, 0);
    const wind = WIND[this.state] ? P[this.state] : 0, tell = wind && this.t > wind - CFG.tell;   // brilho branco no fim da preparação
    setFlash(this.flashMeshes, this.flash > 0 || tell);
    switch (this.state) {
      case 'spawn': b.scale.setScalar(s * Math.min(1, this.t / 1.0)); break;
      case 'slamWind': { const p = Math.min(1, this.t / P.slamWind); b.position.y = 0.6 * p; b.rotation.x = -0.35 * p; break; }   // ergue o corpo
      case 'chargeWind': { const p = Math.min(1, this.t / P.chargeWind); b.rotation.x = -0.3 * p; b.position.z = -0.35 * p; b.position.x = Math.sin(this.t * 40) * 0.04 * p; break; }   // recua e raspa
      case 'charge': b.rotation.x = 0.35; b.position.y = Math.abs(Math.sin(this.t * 30)) * 0.06; break;
      case 'leapWind': { const p = Math.min(1, this.t / P.leapWind); b.scale.y = s * (1 - 0.25 * p); b.scale.x = b.scale.z = s * (1 + 0.1 * p); break; }   // agacha
      case 'leap': { const p = Math.min(1, this.t / c.leapTime); b.position.y = Math.sin(p * Math.PI) * 2.2; b.rotation.x = 0.3 - p * 0.6; break; }
      case 'recover': b.rotation.x = 0.15; b.scale.y = s * 0.94; break;
      case 'stunned': b.rotation.z = Math.sin(this.t * 7) * 0.15; b.scale.y = s * 0.88; break;
      case 'dying': { const q = Math.max(0.01, 1 - this.t / 1.2); b.scale.setScalar(s * q); b.position.y = -0.4 * (1 - q); break; }
    }
  }
  destroy() { this.g.scene.remove(this.root); }
}
