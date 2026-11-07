// Kay: estados livre → ataque (preparação/ativo/recuperação) → livre; esquiva; dano; derrota.
import * as T from '../lib/three.js';
import { buildModel, blobShadow, mat, inkMat } from '../engine/voxel.js';
import { MODELS } from '../data/models.js';
import { CFG } from './config.js';
import { mergeModel, setFlash } from './merge.js';
import { footMarker, COL } from './fx.js';

const K = CFG.kay, D = CFG.dodge;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const faceOf = (x, z) => Math.atan2(x, z);

export class Kay {
  constructor(scene) {
    this.root = new T.Group();
    this.body = buildModel(MODELS.kay);
    this.flashMeshes = mergeModel(this.body);
    this.base = this.body.userData.baseScale;
    this.root.add(this.body, blobShadow(0.38));
    this.marker = footMarker(COL.friend, 0.46, 32, 0.55);
    this.root.add(this.marker);

    // lâmina de pulso: cabo escuro, guarda de aço, lâmina com fio ciano e núcleo Nexo. Pivô na mão; em repouso fica nas costas.
    this.staffPivot = new T.Group(); this.staffPivot.rotation.order = 'YXZ';
    const box = (w, h, d, c, z, y = 0, x = 0) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z);
      if (!c.startsWith('glow')) { const ink = new T.Mesh(m.geometry, inkMat); ink.scale.set(1 + 0.05 / w, 1 + 0.05 / h, 1 + 0.05 / d); m.add(ink); }
      return m;
    };
    this.staffPivot.add(
      box(0.08, 0.08, 0.26, 'black', 0.08),                 // cabo
      box(0.07, 0.07, 0.05, 'orange', -0.02),               // pomo (cor do cachecol)
      box(0.3, 0.1, 0.07, 'steelD', 0.23),                  // guarda
      box(0.07, 0.07, 0.06, 'glowC', 0.23, 0.07),           // núcleo Nexo na guarda
      box(0.13, 0.035, 0.82, 'steelL', 0.67),               // lâmina
      box(0.03, 0.045, 0.78, 'glowC', 0.67, 0, 0.075),      // fio emissivo
      box(0.09, 0.035, 0.12, 'steelL', 1.11),               // ponta
    );
    this.root.add(this.staffPivot);
    scene.add(this.root);
    this.reset();
  }
  reset() {
    this.pos = new T.Vector3(0, 0, 2); this.face = Math.PI;
    this.hp = K.hp; this.state = 'free'; this.t = 0; this.combo = -1;
    this.invuln = 0; this.dodgeCd = 0; this.flash = 0; this.walk = 0;
    this.vel = new T.Vector3(); this.dodgeDir = new T.Vector3(); this.hits = new Set();
    this.stats = { hitsTaken: 0 };
  }
  get invulnerable() { return this.invuln > 0 || (this.state === 'dodge' && this.t < D.iframes) || this.state === 'dead'; }
  get dodging() { return this.state === 'dodge'; }

  update(dt, g, input) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.flash = Math.max(0, this.flash - dt);
    const mv = input.move(), mlen = Math.hypot(mv.x, mv.z);
    const wantAtk = input.attack(K.inputBuffer), wantDodge = input.dodge(K.inputBuffer) && this.dodgeCd <= 0;
    this.t += dt;

    switch (this.state) {
      case 'free':
        if (wantDodge) { this.startDodge(mv, input); break; }
        if (wantAtk) { this.startAttack(0, g, mv, input); break; }
        if (mlen > 0) {
          this.pos.x += mv.x * K.speed * dt; this.pos.z += mv.z * K.speed * dt;
          this.face = faceOf(mv.x, mv.z); this.walk += dt * 14 * mlen;
        }
        break;
      case 'attack': {
        const a = CFG.combo[this.combo], end = a.windup + a.active, rec = this.t - end;
        if (this.t < end) {   // avanço curto do golpe
          const f = a.lunge * (1 - this.t / end);
          this.pos.x += Math.sin(this.face) * f * dt; this.pos.z += Math.cos(this.face) * f * dt;
        }
        if (this.t >= a.windup && this.t < end) this.hitTest(a, g);
        if (rec >= 0) {
          if (wantDodge && rec >= a.dodgeCancel) { this.startDodge(mv, input); break; }
          if (wantAtk && this.combo < CFG.combo.length - 1 && rec >= a.chainFrom) { this.startAttack(this.combo + 1, g, mv, input); break; }
          if (rec >= a.recovery) { this.state = 'free'; this.combo = -1; }
        }
        break;
      }
      case 'dodge': {
        const p = this.t / D.dur, sp = D.speed * (1 - p * p);
        this.pos.addScaledVector(this.dodgeDir, sp * dt);
        if (this.t >= D.dur) { this.state = 'free'; this.dodgeCd = D.cooldown; }
        break;
      }
      case 'hurt':
        this.pos.addScaledVector(this.vel, dt); this.vel.multiplyScalar(Math.pow(0.001, dt));
        if (this.t >= K.hurtStun) this.state = 'free';
        break;
    }
    g.arena.resolve(this.pos, K.radius);
    this.animate(dt);
  }

  startDodge(mv, input) {
    input.consumeDodge(); input.consumeAttack();
    const l = Math.hypot(mv.x, mv.z);
    if (l > 0.1) { this.dodgeDir.set(mv.x / l, 0, mv.z / l); this.face = faceOf(mv.x, mv.z); }
    else this.dodgeDir.set(Math.sin(this.face), 0, Math.cos(this.face));   // sem direção: última orientação
    this.state = 'dodge'; this.t = 0; this.combo = -1;
  }

  startAttack(i, g, mv, input) {
    input.consumeAttack();
    if (Math.hypot(mv.x, mv.z) > 0.1) this.face = faceOf(mv.x, mv.z);
    // ajuste suave: inimigo mais próximo no cone frontal
    let best = null, bd = 1e9;
    const cone = T.MathUtils.degToRad(K.assist.cone) / 2;
    for (const e of g.enemies) {
      if (!e.targetable) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > K.assist.range + e.radius || d >= bd) continue;
      if (Math.abs(angDiff(faceOf(dx, dz), this.face)) > cone) continue;
      best = e; bd = d;
    }
    if (best) this.face = faceOf(best.pos.x - this.pos.x, best.pos.z - this.pos.z);
    this.state = 'attack'; this.combo = i; this.t = 0; this.hits.clear(); this.slashed = false;
  }

  hitTest(a, g) {
    if (!this.slashed) { g.fx.slash(this.pos, this.face, a.range + 0.2, a.arc); this.slashed = true; }
    const half = T.MathUtils.degToRad(a.arc) / 2;
    for (const e of g.enemies) {
      if (!e.targetable || this.hits.has(e)) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > a.range + e.radius) continue;
      if (d > e.radius + 0.25 && Math.abs(angDiff(faceOf(dx, dz), this.face)) > half) continue;
      this.hits.add(e); e.takeHit(a, this.pos, g, this.combo === CFG.combo.length - 1);
    }
    for (const b of g.arena.breakIn(this.pos, this.face, a.range, half)) {   // objetos quebráveis
      g.fx.burst(b, b.kind === 'crate' ? '#a9b4c4' : '#8fd06a', 8, 3, 0.4); g.run.dropAt(new T.Vector3(b.x, 0, b.z), b.kind === 'chest' ? CFG.chestDrop : 1); g.hitstop = Math.max(g.hitstop, 0.02);
    }
  }

  hurt(dmg, from, g) {
    if (this.invulnerable) return false;
    this.hp = Math.max(0, this.hp - dmg); this.stats.hitsTaken++;
    this.invuln = K.hurtIframes; this.flash = 0.08;
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, l = Math.hypot(dx, dz) || 1;
    this.vel.set(dx / l * K.knockback, 0, dz / l * K.knockback);
    this.state = this.hp <= 0 ? 'dead' : 'hurt'; this.t = 0; this.combo = -1;
    return true;
  }

  animate(dt) {
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.face;
    const b = this.body, sp = this.staffPivot;
    b.rotation.set(0, 0, 0); b.scale.setScalar(this.base); b.position.y = 0;
    setFlash(this.flashMeshes, this.flash > 0);
    this.marker.visible = false;   // sem círculo sob os pés (pedido do autor)
    this.marker.children[0].children[0].material.opacity = this.invuln > 0 ? 0.25 + 0.35 * (Math.sin(this.invuln * 12) * 0.5 + 0.5) : 0.55;

    if (this.state === 'free') {
      b.position.y = Math.abs(Math.sin(this.walk)) * 0.06;
      sp.position.set(0.22, 0.62, -0.22); sp.rotation.set(-2.5, 0, 0.35);   // espada nas costas
    } else if (this.state === 'attack') {
      const a = CFG.combo[this.combo], half = T.MathUtils.degToRad(a.arc) / 2, dir = this.combo === 1 ? -1 : 1;
      let k;
      if (this.t < a.windup) k = -1;                                         // bastão erguido para o lado
      else if (this.t < a.windup + a.active) k = -1 + 2 * (this.t - a.windup) / a.active;
      else k = 1;
      sp.position.set(0, 0.5, 0.05);
      sp.rotation.set(this.combo === 2 && this.t < a.windup ? -0.5 : 0, -dir * k * half, 0);
      b.rotation.y = -dir * k * 0.25;
    } else if (this.state === 'dodge') {
      b.scale.y = this.base * 0.72; b.rotation.x = 0.35;
      sp.position.set(0.24, 0.3, -0.2); sp.rotation.set(-1.6, 0, 0.2);
    } else if (this.state === 'hurt') {
      b.rotation.x = -0.25;
    } else if (this.state === 'dead') {
      b.rotation.z = Math.min(1.4, this.t * 5); b.position.y = 0.05; this.marker.visible = false;
    }
  }
}
