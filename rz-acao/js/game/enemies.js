// Inimigos do MVP 0: perseguidor (setor) e disparador (linha + projétil).
// Todo ataque tem preparação legível, janela ativa e recuperação visível. Guarda quebrada atordoa.
import * as T from '../lib/three.js';
import { buildModel, blobShadow, mat } from '../engine/voxel.js';
import { animateIdle } from '../engine/idle.js';
import { MODELS } from '../data/models.js';
import { CFG } from './config.js';
import { mergeModel, setFlash } from './merge.js';
import { footMarker, COL } from './fx.js';

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const faceOf = (x, z) => Math.atan2(x, z);
const turn = (from, to, max) => from + Math.max(-max, Math.min(max, angDiff(to, from)));

// barra de vida e pips de guarda: aparecem só depois do primeiro golpe
function makeBars(cam) {
  const g = new T.Group();
  const bg = new T.Mesh(new T.PlaneGeometry(0.9, 0.12), new T.MeshBasicMaterial({ color: '#07080d' }));
  const hp = new T.Mesh(new T.PlaneGeometry(0.84, 0.07), new T.MeshBasicMaterial({ color: '#f2f4f8' }));
  hp.position.z = 0.001; g.add(bg, hp);
  const pips = new T.Group(); pips.position.y = -0.14; g.add(pips);
  g.quaternion.copy(cam.quaternion); g.visible = false;
  return { g, hp, pips };
}

export class Enemy {
  constructor(kind, pos, g) {
    this.kind = kind; this.cfg = CFG.enemies[kind]; this.g = g;
    const c = this.cfg;
    this.pos = pos.clone(); this.radius = c.radius;
    this.hp = c.hp; this.guard = c.guard; this.sinceHit = 99;
    this.state = 'spawn'; this.t = 0; this.cd = 0.6 + Math.random() * 0.6;
    this.face = faceOf(g.kay.pos.x - pos.x, g.kay.pos.z - pos.z);
    this.knock = new T.Vector3(); this.flash = 0; this.phase = Math.random() * 6;

    this.root = new T.Group();
    this.body = buildModel(MODELS[c.model]);
    this.body.scale.multiplyScalar(c.scale);
    this.base = this.body.scale.x;
    this.flashMeshes = mergeModel(this.body);
    this.root.add(this.body, blobShadow(c.radius * 0.95), footMarker(COL.threat, c.radius + 0.12, 6, 0.75));
    g.scene.add(this.root);
    this.bars = makeBars(g.cam); g.scene.add(this.bars.g);
    this.drawPips();
    g.fx.ring(pos, COL.rift, CFG.spawnTime, 1.4, 0.3, 0.9);   // portal da Fenda fechando no ponto de entrada
  }
  get targetable() { return this.state !== 'spawn' && this.state !== 'dying'; }
  get alive() { return this.state !== 'gone'; }

  drawPips() {
    const p = this.bars.pips; p.clear();
    const n = this.cfg.guard, w = 0.84 / n;
    for (let i = 0; i < n; i++) {
      const on = i < this.guard;
      const m = new T.Mesh(new T.PlaneGeometry(w - 0.04, 0.06), new T.MeshBasicMaterial({ color: on ? COL.guard : '#3a3a44' }));
      m.position.x = -0.42 + w * i + w / 2; p.add(m);
    }
  }

  update(dt) {
    const g = this.g, c = this.cfg, k = g.kay;
    this.t += dt; this.sinceHit += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.sinceHit > CFG.guardRegen && this.guard < c.guard && this.state !== 'stunned') { this.guard = c.guard; this.drawPips(); }
    const dx = k.pos.x - this.pos.x, dz = k.pos.z - this.pos.z, dist = Math.hypot(dx, dz), toK = faceOf(dx, dz);
    this.pos.addScaledVector(this.knock, dt); this.knock.multiplyScalar(Math.pow(0.002, dt));

    switch (this.state) {
      case 'spawn':
        if (this.t >= CFG.spawnTime) this.setState('move');
        break;
      case 'move':
        this.cd -= dt;
        this.face = turn(this.face, toK, 6 * dt);
        if (this.kind === 'chaser') {
          if (dist > c.reach) { this.step(dx / dist, dz / dist, c.speed, dt); }
          else if (this.cd <= 0 && k.state !== 'dead') this.beginChaserWindup();
        } else {
          let s = 0;
          if (dist < c.keep - 1) s = -1; else if (dist > c.keep + 2) s = 1;
          if (s) this.step(s * dx / dist, s * dz / dist, c.speed, dt);
          if (this.cd <= 0 && dist < c.projRange - 1 && k.state !== 'dead') this.beginShooterWindup();
        }
        break;
      case 'windup': {
        const p = Math.min(1, this.t / c.windup);
        if (this.kind === 'chaser') {
          this.tele.set(this.origin, this.aim, p);
          if (this.t >= c.windup) { this.tele.strike(); this.setState('active'); this.hitDone = false; }
        } else {
          const locked = this.t >= c.windup * c.track;
          if (!locked) this.aim = turn(this.aim, toK, 3 * dt);
          this.face = this.aim;
          this.tele.set(this.pos, this.aim, p, locked);
          if (this.t >= c.windup) { this.fire(); this.tele.remove(); this.tele = null; this.setState('recover'); }
        }
        break;
      }
      case 'active': {   // investida do perseguidor
        const sp = c.lunge;
        this.pos.x += Math.sin(this.aim) * sp * dt; this.pos.z += Math.cos(this.aim) * sp * dt;
        if (!this.hitDone) {
          const ox = k.pos.x - this.origin.x, oz = k.pos.z - this.origin.z, od = Math.hypot(ox, oz);
          const reach = c.range + c.lunge * c.active;
          if (od <= reach + CFG.kay.radius && (od < 0.4 || Math.abs(angDiff(faceOf(ox, oz), this.aim)) <= T.MathUtils.degToRad(c.arc) / 2)) {
            if (k.hurt(c.dmg, this.pos, g)) { this.hitDone = true; g.onKayHurt(); }
          }
        }
        if (this.t >= c.active) { this.tele.remove(); this.tele = null; this.setState('recover'); }
        break;
      }
      case 'recover':
        if (this.t >= c.recovery) { this.setState('move'); this.cd = this.kind === 'chaser' ? c.cooldown : c.cooldown; }
        break;
      case 'stunned':
        if (this.t >= c.stun) { this.guard = c.guard; this.drawPips(); this.setState('move'); this.cd = 0.3; }
        break;
      case 'dying':
        if (this.t >= 0.35) { this.destroy(); this.state = 'gone'; }
        break;
    }
    if (this.state !== 'gone') { g.arena.resolve(this.pos, this.radius); this.animate(); }
  }

  step(x, z, sp, dt) { this.pos.x += x * sp * dt; this.pos.z += z * sp * dt; }
  setState(s) { this.state = s; this.t = 0; }

  beginChaserWindup() {
    const c = this.cfg;
    this.aim = this.face = faceOf(this.g.kay.pos.x - this.pos.x, this.g.kay.pos.z - this.pos.z);   // compromete a direção
    this.origin = this.pos.clone();
    this.tele = this.g.fx.sector(c.range + c.lunge * c.active, c.arc);
    this.setState('windup');
  }
  beginShooterWindup() {
    const c = this.cfg;
    this.aim = this.face;
    this.tele = this.g.fx.line(c.projRange, c.projRadius * 2 + 0.12);
    this.setState('windup');
  }
  fire() {
    const c = this.cfg, dir = new T.Vector3(Math.sin(this.aim), 0, Math.cos(this.aim));
    this.g.projectiles.push(new Projectile(this.pos.clone().addScaledVector(dir, 0.5), dir.multiplyScalar(c.projSpeed), c, this.g));
  }

  cancelAttack() { if (this.tele) { this.tele.remove(); this.tele = null; } }

  takeHit(atk, from, g, finisher) {
    if (!this.targetable) return;
    const stunned = this.state === 'stunned';
    this.hp -= atk.dmg * (stunned ? 1.5 : 1);
    this.sinceHit = 0; this.flash = 0.07; this.bars.g.visible = true;
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, l = Math.hypot(dx, dz) || 1;
    const kb = (finisher ? 4.5 : 2) * (stunned ? 0.5 : 1);
    this.knock.set(dx / l * kb, 0, dz / l * kb);
    g.fx.burst(this.pos, '#e8fbff', finisher ? 9 : 5, 3);
    g.onEnemyHit(finisher);
    if (this.hp <= 0) {
      this.cancelAttack(); this.setState('dying'); this.bars.g.visible = false;
      g.fx.burst(this.pos, COL.rift, 14, 4); g.fx.ring(this.pos, COL.rift, 0.45, 0.3, 1.4);
      return;
    }
    if (!stunned) {
      this.guard = Math.max(0, this.guard - atk.guard);
      if (this.guard === 0) {   // guarda quebrada: interrompe a preparação e abre janela de dano
        this.cancelAttack(); this.setState('stunned');
        g.fx.ring(this.pos, COL.guard, 0.5, 0.4, 1.3); g.fx.burst(this.pos, COL.guard, 10, 3.5, 0.9);
        g.onGuardBreak();
      }
      this.drawPips();
    }
  }

  animate() {
    const b = this.body, c = this.cfg, s = this.base;
    this.root.position.copy(this.pos); this.root.rotation.y = this.face;
    b.rotation.set(0, 0, 0); b.scale.setScalar(s); b.position.set(0, 0, 0);
    animateIdle(b, this.g.time, this.phase);
    setFlash(this.flashMeshes, this.flash > 0);
    const p = Math.min(1, this.t / (c.windup || 1));
    switch (this.state) {
      case 'spawn': b.scale.setScalar(s * Math.min(1, this.t / CFG.spawnTime)); break;
      case 'move': b.position.y += this.kind === 'chaser' ? Math.abs(Math.sin(this.g.time * 8 + this.phase)) * 0.05 : 0; break;
      case 'windup':
        if (this.kind === 'chaser') { b.rotation.x = -0.35 * p; b.scale.y = s * (1 + 0.15 * p); }   // ergue o corpo
        else { b.scale.y = s * (1 - 0.22 * p); b.scale.x = b.scale.z = s * (1 + 0.1 * p); }     // comprime o foco
        break;
      case 'active': b.rotation.x = 0.35; break;
      case 'recover': b.rotation.x = this.kind === 'chaser' ? 0.2 : 0; b.scale.y = s * 0.92; break;      // recuperação visível
      case 'stunned': b.rotation.z = Math.sin(this.t * 9) * 0.18; b.scale.y = s * 0.85; break;
      case 'dying': { const q = 1 - this.t / 0.35; b.scale.setScalar(s * Math.max(0.01, q)); b.position.y = -0.2 * (1 - q); break; }
    }
    const bars = this.bars;
    bars.g.position.set(this.pos.x, 1.35 * (c.scale + 0.3), this.pos.z);
    bars.hp.scale.x = Math.max(0.001, this.hp / c.hp); bars.hp.position.x = -0.42 * (1 - bars.hp.scale.x);
  }

  destroy() { this.cancelAttack(); this.g.scene.remove(this.root, this.bars.g); }
}

const projGeo = new T.BoxGeometry(0.3, 0.3, 0.3);
export class Projectile {
  constructor(pos, vel, c, g) {
    this.pos = pos; this.vel = vel; this.r = c.projRadius; this.dmg = c.dmg; this.g = g; this.life = c.projRange / c.projSpeed;
    this.mesh = new T.Group();
    this.core = new T.Mesh(projGeo, mat('glowM'));
    this.core.position.y = 0.45;
    this.mesh.add(this.core, footMarker(COL.threatEdge, this.r + 0.06, 6, 0.9));
    g.scene.add(this.mesh);
    this.alive = true;
  }
  update(dt) {
    const g = this.g, k = g.kay;
    this.pos.addScaledVector(this.vel, dt); this.life -= dt;
    this.core.rotation.y += dt * 5; this.core.rotation.x += dt * 3;
    this.mesh.position.copy(this.pos);
    if (Math.hypot(k.pos.x - this.pos.x, k.pos.z - this.pos.z) < this.r + CFG.kay.radius) {
      if (k.hurt(this.dmg, this.pos, g)) { g.onKayHurt(); return this.kill(); }
    }
    if (this.life <= 0 || g.arena.blocked(this.pos, this.r)) this.kill();
  }
  kill() { this.alive = false; this.g.scene.remove(this.mesh); this.g.fx.burst(this.pos, COL.threatEdge, 5, 2, 0.45); }
}
