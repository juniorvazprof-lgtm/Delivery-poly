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

// inimigos comuns não marcam o chão: o aviso é só a pose de preparação e o brilho branco no corpo
const NO_TELE = { set() {}, strike() {}, remove() {} };

const MELEE = new Set(['chaser', 'shield']);

export class Enemy {
  constructor(kind, pos, g, opts = {}) {
    this.kind = kind; this.g = g;
    const c = this.cfg = { ...CFG.enemies[kind] };
    // dificuldade por camada do mapa e por Instabilidade
    const S = CFG.scaling, tier = opts.tier ?? 0, inst = g.instab || 0;
    c.hp = Math.round(c.hp * S.hp[tier] * 2) / 2; c.speed *= S.speed[tier];
    c.cooldown = (c.cooldown ?? 1) * S.cooldown[tier] * (inst >= 4 ? 0.8 : 1);
    if (c.dmg && kind !== 'shooter' && kind !== 'healer') c.dmg += S.dmg[tier];
    if (c.dmg && inst >= 2) c.dmg += 1;
    if (opts.elite) {   // elite: maior, mais vida e mais rápido
      const E = CFG.elite; this.elite = true;
      c.hp = Math.round(c.hp * E.hp); c.guard += E.guard; c.speed *= E.speed; c.windup *= E.windup; c.scale *= E.scale; c.radius *= 1.15;
    }
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
    this.root.add(this.body, blobShadow(c.radius * 0.95));
    if (this.elite) {   // coroa de cristais girando sobre a cabeça
      this.crown = new T.Group(); this.crown.position.y = 1.15 * c.scale + 0.35;
      for (let i = 0; i < 3; i++) { const q = new T.Mesh(new T.BoxGeometry(0.11, 0.2, 0.11), mat('glowY')); const a = i / 3 * Math.PI * 2; q.position.set(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28); this.crown.add(q); }
      this.root.add(this.crown);
    }
    g.scene.add(this.root);
    this.bars = makeBars(g.cam); g.scene.add(this.bars.g);
    this.drawPips();
    g.fx.ring(pos, COL.rift, CFG.spawnTime, 1.4, 0.3, 0.9);   // portal da Fenda fechando no ponto de entrada
  }
  get targetable() { return !['spawn', 'dying', 'fuse', 'leap'].includes(this.state); }
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
    if (this.burnT > 0 && this.targetable) {   // queimadura da espada acesa
      this.burnT -= dt; this.burnTick = (this.burnTick || 0) - dt;
      if (this.burnTick <= 0) { this.burnTick = 0.5; this.takeHit({ dmg: 0.5, guard: 0, quiet: true, knock: 0, spark: '#ff9b3d' }, this.pos, g, false); if (this.state === 'dying') return; }
    }
    if (this.sinceHit > CFG.guardRegen && this.guard < c.guard && this.state !== 'stunned') { this.guard = c.guard; this.drawPips(); }
    const dx = k.pos.x - this.pos.x, dz = k.pos.z - this.pos.z, dist = Math.hypot(dx, dz), toK = faceOf(dx, dz);
    this.pos.addScaledVector(this.knock, dt); this.knock.multiplyScalar(Math.pow(0.002, dt));

    switch (this.state) {
      case 'spawn':
        if (this.t >= CFG.spawnTime) this.setState('move');
        break;
      case 'move':
        this.cd -= dt;
        this.face = turn(this.face, toK, (c.turn || 6) * dt);
        if (MELEE.has(this.kind)) {
          if (dist > c.reach) { this.step(dx / dist, dz / dist, c.speed, dt); }
          else if (this.cd <= 0 && k.state !== 'dead') this.beginChaserWindup();
        } else if (this.kind === 'exploder') {   // corre direto e incha ao chegar perto
          if (dist > c.reach) this.step(dx / dist, dz / dist, c.speed, dt);
          else if (k.state !== 'dead') { this.rollWindup(); this.setState('windup'); }
        } else if (this.kind === 'leaper' || this.kind === 'healer') {
          let s = 0;
          if (dist < c.keep - 1) s = -1; else if (dist > c.keep + 1.5) s = 1;
          if (s) this.step(s * dx / dist, s * dz / dist, c.speed, dt);
          if (this.cd <= 0 && k.state !== 'dead') {
            if (this.kind === 'leaper' && dist < 7.5) { this.rollWindup(); this.setState('windup'); }
            if (this.kind === 'healer') { this.healTarget = this.pickHealTarget(); if (this.healTarget) { this.rollWindup(); this.setState('windup'); } else this.cd = 0.8; }
          }
        } else {
          let s = 0;
          if (dist < c.keep - 1) s = -1; else if (dist > c.keep + 2) s = 1;
          if (s) this.step(s * dx / dist, s * dz / dist, c.speed, dt);
          const range = this.kind === 'charger' ? c.dashDist + 0.5 : c.projRange - 1;
          if (this.cd <= 0 && dist < range && k.state !== 'dead') this.beginLineWindup();
        }
        break;
      case 'windup': {
        const p = Math.min(1, this.t / this.wu);
        if (this.kind === 'exploder') { if (this.t >= this.wu) this.explode(); break; }
        if (this.kind === 'leaper') {
          this.face = turn(this.face, toK, 6 * dt);
          if (this.t >= this.wu) { this.from = this.pos.clone(); this.to = k.pos.clone(); this.setState('leap'); }
          break;
        }
        if (this.kind === 'healer') {
          if (!this.healTarget?.targetable) { this.setState('move'); this.cd = 0.5; break; }
          this.face = faceOf(this.healTarget.pos.x - this.pos.x, this.healTarget.pos.z - this.pos.z);
          if (this.t >= this.wu) this.doHeal();
          break;
        }
        if (MELEE.has(this.kind)) {
          this.tele.set(this.origin, this.aim, p);
          if (this.t >= this.wu) { this.tele.strike(); this.setState('active'); this.hitDone = false; }
        } else {
          const locked = this.t >= this.wu * c.track;
          if (!locked) this.aim = turn(this.aim, toK, 3 * dt);
          this.face = this.aim;
          if (!locked) this.origin.copy(this.pos);
          this.tele.set(this.origin, this.aim, p, locked);
          if (this.t >= this.wu) {
            if (this.kind === 'charger') { this.setState('dash'); this.dashed = 0; this.hitDone = false; }
            else { this.fire(); this.tele.remove(); this.tele = null; this.setState('recover'); }
          }
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
      case 'dash': {   // investida em linha reta; termina na distância marcada ou ao bater
        const step = c.dashSpeed * dt, nx = this.pos.x + Math.sin(this.aim) * step, nz = this.pos.z + Math.cos(this.aim) * step;
        const hitWall = g.arena.blocked({ x: nx, z: nz }, this.radius);
        if (!hitWall) { this.pos.x = nx; this.pos.z = nz; this.dashed += step; }
        if (!this.hitDone && Math.hypot(k.pos.x - this.pos.x, k.pos.z - this.pos.z) < this.radius + CFG.kay.radius + 0.1) {
          if (k.hurt(c.dmg, this.pos, g)) { this.hitDone = true; g.onKayHurt(); }
        }
        if (hitWall || this.dashed >= c.dashDist) {
          this.tele.remove(); this.tele = null;
          if (hitWall) { g.fx.ring(this.pos, COL.guard, 0.4, 0.3, 1); this.stunT = c.wallStun; } else this.stunT = 0;
          this.setState('recover');
        }
        break;
      }
      case 'recover':
        if (this.t >= c.recovery + (this.stunT || 0)) { this.setState('move'); this.cd = c.cooldown; this.stunT = 0; }
        break;
      case 'leap': {   // salto até onde Kay estava; a sombra no chão mostra o pouso
        const p = Math.min(1, this.t / c.leapTime);
        this.pos.lerpVectors(this.from, this.to, p);
        if (p >= 1) {
          g.fx.burst(this.pos, '#c9b28a', 10, 3.5, 0.2); g.hitstop = Math.max(g.hitstop, 0.03);
          if (Math.hypot(k.pos.x - this.pos.x, k.pos.z - this.pos.z) < c.leapRadius + CFG.kay.radius && k.hurt(c.dmg, this.pos, g)) g.onKayHurt();
          this.setState('recover');
        }
        break;
      }
      case 'fuse':   // explosivo derrotado: o pavio queima e ele explode
        if (this.t >= c.deathFuse) this.explode();
        break;
      case 'flinch':
        if (this.t >= CFG.flinch) { this.setState('move'); this.cd = Math.max(this.cd, 0.25); }
        break;
      case 'rooted':   // preso pelas raízes de Brogume: não anda nem ataca
        if (this.t >= this.rootFor) { this.setState('move'); this.cd = Math.max(this.cd, 0.3); }
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
    this.tele = NO_TELE; this.rollWindup();
    this.setState('windup');
  }
  beginLineWindup() {
    const c = this.cfg;
    this.aim = this.face; this.origin = this.pos.clone();
    this.tele = NO_TELE; this.rollWindup();
    this.setState('windup');
  }
  fire() {
    const c = this.cfg, dir = new T.Vector3(Math.sin(this.aim), 0, Math.cos(this.aim));
    this.g.projectiles.push(new Projectile(this.pos.clone().addScaledVector(dir, 0.5), dir.multiplyScalar(c.projSpeed), c, this.g));
  }

  explode() {
    const g = this.g, c = this.cfg, k = g.kay;
    g.fx.burst(this.pos, '#ff9b3d', 18, 5, 0.4); g.fx.burst(this.pos, '#ffe066', 10, 4, 0.6); g.fx.ring(this.pos, '#ff9b3d', 0.35, 0.3, c.blast + 0.2, 0.7);
    g.hitstop = Math.max(g.hitstop, 0.05);
    if (Math.hypot(k.pos.x - this.pos.x, k.pos.z - this.pos.z) < c.blast + CFG.kay.radius && k.hurt(c.dmg, this.pos, g)) g.onKayHurt();
    for (const e of g.enemies) {   // a explosão também fere os outros inimigos
      if (e === this || !e.targetable || Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) > c.blast + e.radius) continue;
      e.takeHit({ dmg: c.enemyDmg, guard: 2, quiet: true, knock: 6, spark: '#ff9b3d' }, this.pos, g, false);
    }
    if (this.killed) g.onEnemyKilled?.(this);
    this.bars.g.visible = false; this.setState('dying');
  }
  pickHealTarget() {
    let best = null, worst = 0.999;
    for (const e of this.g.enemies) {
      if (e === this || e.boss || !e.targetable) continue;
      const f = e.hp / e.cfg.hp;
      if (f < worst && Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) < 9) { worst = f; best = e; }
    }
    return best;
  }
  doHeal() {
    const g = this.g, t = this.healTarget;
    t.hp = Math.min(t.cfg.hp, t.hp + this.cfg.heal); t.updateBars?.();
    const mid = this.pos.clone().lerp(t.pos, 0.5), len = this.pos.distanceTo(t.pos);
    const beam = new T.Mesh(new T.BoxGeometry(0.08, 0.08, len), new T.MeshBasicMaterial({ color: '#8fd06a', transparent: true, opacity: 0.85 }));
    beam.position.set(mid.x, 0.7, mid.z); beam.rotation.y = faceOf(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
    g.fx.add(beam, 0.3, p => { beam.material.opacity = 0.85 * (1 - p); });
    g.fx.burst(t.pos, '#8fd06a', 10, 2.5, 0.8); g.fx.ring(t.pos, '#8fd06a', 0.4, 0.3, 1.1, 0.6);
    this.setState('recover'); this.cd = this.cfg.cooldown;
  }

  // companheira: prende no lugar (interrompe a preparação)
  entangle(dur) {
    if (!this.targetable || this.state === 'stunned') return;
    this.cancelAttack(); this.rootFor = dur; this.setState('rooted');
  }

  burn(dur) { this.burnT = Math.max(this.burnT || 0, dur); }

  rollWindup() { const j = CFG.windupJitter; this.wu = this.cfg.windup * (1 - j + Math.random() * 2 * j); }

  cancelAttack() { if (this.tele) { this.tele.remove(); this.tele = null; } }

  takeHit(atk, from, g, finisher) {
    if (!this.targetable) return;
    const stunned = this.state === 'stunned', c0 = this.cfg, m = g.mods || {};
    let mul = stunned ? 1.5 : 1;
    if (this.state === 'rooted') { if (m.rootBonus) mul *= 1.5; if (m.soakFin && finisher) mul *= 2; }   // bênçãos de sinergia
    // escudeiro: o casco frontal bloqueia o dano (a guarda ainda cai)
    const fdx = from.x - this.pos.x, fdz = from.z - this.pos.z;
    const blocked = this.kind === 'shield' && !stunned && Math.hypot(fdx, fdz) > 0.05 && Math.abs(angDiff(faceOf(fdx, fdz), this.face)) < T.MathUtils.degToRad(c0.shieldArc) / 2;
    if (blocked) { mul = 0; g.fx.burst(this.pos.clone().add(new T.Vector3(Math.sin(this.face) * 0.5, 0, Math.cos(this.face) * 0.5)), '#c9d6e8', 6, 3, 0.6); }
    this.hp -= atk.dmg * mul;
    this.sinceHit = 0; this.flash = 0.07; this.bars.g.visible = true;
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, l = Math.hypot(dx, dz) || 1;
    const kb = atk.knock ?? (finisher ? 4.5 : 2) * (stunned ? 0.5 : 1);
    this.knock.set(dx / l * kb, 0, dz / l * kb);
    g.fx.burst(this.pos, atk.spark || '#e8fbff', finisher ? 9 : atk.quiet ? 3 : 5, 3);
    if (!atk.quiet) g.onEnemyHit(finisher);
    if (this.hp <= 0) {
      if (this.kind === 'exploder') { this.killed = true; this.cancelAttack(); this.setState('fuse'); return; }
      if (m.burnSpread && this.burnT > 0) {   // bênção: brasa viva
        for (const e of g.enemies) if (e !== this && e.targetable && Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) < 2.2) e.burn?.(2.5);
        g.fx.burst(this.pos, '#ff9b3d', 12, 4, 0.5);
      }
      this.cancelAttack(); this.setState('dying'); this.bars.g.visible = false; g.onEnemyKilled?.(this);
      g.fx.burst(this.pos, COL.rift, 14, 4); g.fx.ring(this.pos, COL.rift, 0.45, 0.3, 1.4);
      return;
    }
    if (!stunned && this.state !== 'dash' && this.state !== 'rooted' && !atk.quiet) {
      this.poiseHits = (this.poiseHits || 0) + 1;
      if (this.poiseHits >= (c0.poise || 1)) {   // recuo: interrompe a preparação
        this.poiseHits = 0; this.cancelAttack(); this.setState('flinch');
      }
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
    if (this.crown) { this.crown.rotation.y = this.g.time * 2; this.crown.position.y = 1.15 * c.scale + 0.35 + (this.state === 'leap' ? Math.sin(Math.min(1, this.t / c.leapTime) * Math.PI) * 1.6 : 0); }
    const tell = (this.state === 'windup' && this.t > this.wu - CFG.tell) || (this.state === 'fuse' && Math.sin(this.t * 40) > 0);
    setFlash(this.flashMeshes, this.flash > 0 || tell);
    const p = Math.min(1, this.t / (this.wu || c.windup || 1));
    switch (this.state) {
      case 'spawn': b.scale.setScalar(s * Math.min(1, this.t / CFG.spawnTime)); break;
      case 'move': b.position.y += this.kind === 'chaser' ? Math.abs(Math.sin(this.g.time * 8 + this.phase)) * 0.05 : 0; break;
      case 'windup':
        if (MELEE.has(this.kind)) { b.rotation.x = -0.35 * p; b.scale.y = s * (1 + 0.15 * p); }   // ergue o corpo
        else if (this.kind === 'exploder') { b.scale.setScalar(s * (1 + 0.45 * p)); b.position.x = Math.sin(this.t * 60) * 0.04 * p; }   // incha e treme
        else if (this.kind === 'leaper') { b.scale.y = s * (1 - 0.3 * p); b.scale.x = b.scale.z = s * (1 + 0.12 * p); }   // agacha
        else if (this.kind === 'healer') { b.position.y = 0.3 * p; b.rotation.y = this.t * 6; }   // sobe e gira
        else if (this.kind === 'charger') { b.rotation.x = -0.3 * p; b.position.z = -0.35 * p; b.scale.y = s * (1 - 0.12 * p); }   // recua o corpo
        else { b.scale.y = s * (1 - 0.22 * p); b.scale.x = b.scale.z = s * (1 + 0.1 * p); }     // comprime o foco
        break;
      case 'active': b.rotation.x = 0.35; break;
      case 'dash': b.rotation.x = 0.3; b.position.y = Math.abs(Math.sin(this.g.time * 30)) * 0.05; break;
      case 'recover': b.rotation.x = this.kind === 'shooter' ? 0 : 0.2; b.scale.y = s * 0.92; if (this.stunT) b.rotation.z = Math.sin(this.t * 9) * 0.15; break;      // recuperação visível
      case 'leap': { const q = Math.min(1, this.t / c.leapTime); b.position.y = Math.sin(q * Math.PI) * 1.6; break; }
      case 'fuse': b.scale.setScalar(s * (1 + 0.5 * this.t / c.deathFuse)); b.position.x = Math.sin(this.t * 70) * 0.05; break;
      case 'rooted': b.position.x = Math.sin(this.t * 30) * 0.02; b.scale.y = s * 0.95; break;
      case 'flinch': b.rotation.x = -0.35 * (1 - this.t / CFG.flinch); break;
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
