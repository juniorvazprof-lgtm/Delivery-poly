// Feitiços do Mago. Cada um decide sozinho quando lançar (o jogador só se move).
// g.mods: dmg (multiplicador), cd (multiplicador da recarga), area (multiplicador de raio).
import { CFG } from './config.js';

const S = CFG.spells, F = CFG.fusions;
const lv = (arr, l) => Array.isArray(arr) ? arr[Math.min(l, arr.length) - 1] : arr;

export class Spell {
  constructor(key, g) { this.key = key; this.g = g; this.level = 1; this.t = 0.3; this.fusion = !!F[key]; this.cfg = F[key] || S[key]; this.state = {}; }
  v(name) { return this.fusion ? this.cfg[name] : lv(this.cfg[name], this.level); }
  cd() { return this.v('cd') * this.g.mods.cd; }
  dmg(base = this.v('dmg')) { return base * this.g.mods.dmg; }
  area(r) { return r * this.g.mods.area; }
  update(dt) {
    const fn = this['u_' + this.key];
    if (fn) fn.call(this, dt);
  }
  render(pool, t) { const fn = this['r_' + this.key]; if (fn) fn.call(this, pool, t); }

  // ---------- básicos ----------
  u_fogo(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    const g = this.g, m = g.mage, targets = g.nearest(m.x, m.z, this.v('count'), 9);
    if (!targets.length) { this.t = 0.2; return; }
    targets.forEach(e => {
      const dx = e.x - m.x, dz = e.z - m.z, l = Math.hypot(dx, dz) || 1, sp = this.cfg.speed;
      g.projectiles.push({ kind: 'fogo', x: m.x, z: m.z, vx: dx / l * sp, vz: dz / l * sp, life: 1.4, r: 0.22, pierce: 0, hit: new Set(),
        onHit: (p) => { const R = this.area(this.v('radius')); g.fx.ring(p.x, p.z, R, '#ff8a3d', 0.25); g.fx.burst(p.x, p.z, '#ffb15a', 8);
          for (const o of g.query(p.x, p.z, R)) g.damage(o, this.dmg(), { burn: this.cfg.burn, from: p, color: '#ffb15a' }); } });
    });
  }
  u_agua(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    const g = this.g, m = g.mage, R = this.area(this.v('radius'));
    g.fx.ring(m.x, m.z, R, '#3fb8ff', 0.4, true);
    for (const e of g.query(m.x, m.z, R)) g.damage(e, this.dmg(), { push: this.v('push'), soak: this.cfg.soak, from: m, color: '#9be7ff' });
  }
  u_vento(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    const g = this.g, m = g.mage, n = this.v('count');
    // em leque na direção em que o Mago olha, girando um pouco a cada disparo
    this.state.spin = (this.state.spin || 0) + 0.7;
    for (let i = 0; i < n; i++) {
      const a = m.face + (i - (n - 1) / 2) * (Math.PI * 2 / Math.max(n, 3)) * 0.55 + Math.sin(this.state.spin) * 0.3, sp = this.cfg.speed;
      g.projectiles.push({ kind: 'vento', x: m.x, z: m.z, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, life: this.cfg.life, r: 0.3, pierce: this.v('pierce'), hit: new Set(),
        onHit: (p, e) => g.damage(e, this.dmg(), { from: p, push: 1.5, color: '#e8fbff' }) });
    }
  }
  u_arcano(dt) {
    const g = this.g, m = g.mage, n = this.v('count'), R = this.area(this.v('radius'));
    this.state.a = (this.state.a || 0) + this.v('spin') * dt;
    this.state.hits = this.state.hits || new Map();
    for (const [e, t] of this.state.hits) if (t - dt <= 0) this.state.hits.delete(e); else this.state.hits.set(e, t - dt);
    this.orbs = [];
    for (let i = 0; i < n; i++) {
      const a = this.state.a + i / n * Math.PI * 2, x = m.x + Math.sin(a) * R, z = m.z + Math.cos(a) * R;
      this.orbs.push([x, z]);
      for (const e of g.query(x, z, 0.35 * g.mods.area)) {
        if (this.state.hits.has(e)) continue;
        this.state.hits.set(e, this.cfg.hitEvery); g.damage(e, this.dmg(), { from: { x: m.x, z: m.z }, push: 2.5, color: '#e0b8ff' });
      }
    }
  }
  r_arcano(pool, t) { for (const [x, z] of this.orbs || []) { pool.add(x, 0.55, z, 0.26, 0.26, 0.26, '#c58bff', t * 3, t * 4, 0); pool.add(x, 0.55, z, 0.12, 0.12, 0.12, '#f4e8ff'); } }
  u_raio(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    const g = this.g, m = g.mage, pool = g.query(m.x, m.z, this.cfg.range);
    if (!pool.length) { this.t = 0.2; return; }
    for (let s = 0; s < this.v('strikes'); s++) {
      let cur = pool[Math.floor(Math.random() * pool.length)], hit = new Set(), fromX = m.x, fromZ = m.z;
      for (let c = 0; c <= this.v('chains') && cur; c++) {
        hit.add(cur); g.fx.bolt(fromX, fromZ, cur.x, cur.z, '#fff27a');
        g.damage(cur, this.dmg() * (cur.soakT > 0 ? this.cfg.soakMul : 1), { from: { x: fromX, z: fromZ }, color: '#fff27a', stun: 0.15 });
        fromX = cur.x; fromZ = cur.z;
        cur = g.query(cur.x, cur.z, 2.6).find(o => !hit.has(o));
      }
    }
  }
  u_terra(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    const g = this.g, m = g.mage, R = this.area(this.v('radius'));
    const near = g.nearest(m.x, m.z, this.v('count'), 5);
    for (let i = 0; i < this.v('count'); i++) {
      const e = near[i], x = e ? e.x : m.x + (Math.random() - 0.5) * 5, z = e ? e.z : m.z + (Math.random() - 0.5) * 5;
      g.fx.spikes(x, z, R);
      for (const o of g.query(x, z, R)) g.damage(o, this.dmg(), { stun: this.cfg.root, color: '#e8c58a' });
    }
  }

  // ---------- fusões ----------
  u_vapor(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cfg.cd * this.g.mods.cd;
    const g = this.g, m = g.mage, R = this.area(this.cfg.radius);
    for (const e of g.nearest(m.x, m.z, this.cfg.count, 8)) {
      g.fx.cloud(e.x, e.z, R);
      for (const o of g.query(e.x, e.z, R)) g.damage(o, this.dmg(this.cfg.dmg), { stun: this.cfg.stun, soak: 1.5, color: '#ffe6cc' });
    }
  }
  u_tempestade(dt) {
    const g = this.g, m = g.mage, c = this.cfg;
    this.state.a = (this.state.a || 0) + dt * 1.3; this.state.tick = (this.state.tick || 0) - dt;
    this.tornados = [];
    for (let i = 0; i < c.count; i++) {
      const a = this.state.a + i / c.count * Math.PI * 2, r = this.area(c.orbit) * (0.75 + Math.sin(this.state.a * 2.3 + i) * 0.25);
      this.tornados.push([m.x + Math.sin(a) * r, m.z + Math.cos(a) * r]);
    }
    if (this.state.tick <= 0) {
      this.state.tick = c.tick;
      for (const [x, z] of this.tornados) for (const e of g.query(x, z, this.area(c.radius))) g.damage(e, this.dmg(c.dmg), { burn: 2, color: '#ffb15a', quiet: true });
    }
  }
  r_tempestade(pool, t) {
    for (const [x, z] of this.tornados || []) for (let k = 0; k < 6; k++) {
      const a = t * 9 + k * 1.05, r = 0.12 + k * 0.07;
      pool.add(x + Math.sin(a) * r, 0.15 + k * 0.22, z + Math.cos(a) * r, 0.2, 0.2, 0.2, k % 2 ? '#ff6a2a' : '#ffc04d', a, a, 0);
    }
  }
  u_nevasca(dt) {
    const g = this.g, m = g.mage, c = this.cfg, R = this.area(c.radius);
    this.state.tick = (this.state.tick || 0) - dt; this.state.fz = (this.state.fz ?? c.freezeEvery) - dt;
    for (const e of g.query(m.x, m.z, R)) e.slowT = Math.max(e.slowT, 0.3);
    if (this.state.tick <= 0) { this.state.tick = c.tick; for (const e of g.query(m.x, m.z, R)) g.damage(e, this.dmg(c.dmg), { color: '#dff4ff', quiet: true }); }
    if (this.state.fz <= 0) { this.state.fz = c.freezeEvery; g.fx.ring(m.x, m.z, R, '#bfe9ff', 0.5, true); for (const e of g.query(m.x, m.z, R)) g.damage(e, 0, { stun: c.freeze, quiet: true }); }
  }
  r_nevasca(pool, t) {
    const m = this.g.mage, R = this.area(this.cfg.radius);
    for (let k = 0; k < 14; k++) { const a = t * 0.8 + k / 14 * Math.PI * 2, r = R * (0.55 + 0.45 * ((k * 37) % 10) / 10); pool.add(m.x + Math.sin(a) * r, 0.3 + (k % 3) * 0.25, m.z + Math.cos(a) * r, 0.1, 0.1, 0.1, '#e8f8ff', a, a, 0); }
  }
  u_tormenta(dt) {
    const g = this.g, m = g.mage, c = this.cfg, R = this.area(c.radius);
    this.state.a = (this.state.a || 0) + c.spin * dt; this.state.z = (this.state.z || 0) - dt;
    this.state.hits = this.state.hits || new Map();
    for (const [e, t] of this.state.hits) if (t - dt <= 0) this.state.hits.delete(e); else this.state.hits.set(e, t - dt);
    this.orbs = [];
    for (let i = 0; i < c.count; i++) {
      const a = this.state.a + i / c.count * Math.PI * 2, x = m.x + Math.sin(a) * R, z = m.z + Math.cos(a) * R; this.orbs.push([x, z]);
      for (const e of g.query(x, z, 0.4)) { if (this.state.hits.has(e)) continue; this.state.hits.set(e, 0.4); g.damage(e, this.dmg(c.dmg), { push: 2, color: '#fff27a' }); }
    }
    if (this.state.z <= 0) {
      this.state.z = c.zapEvery;
      for (const [x, z] of this.orbs) { const e = g.nearest(x, z, 1, 4)[0]; if (e) { g.fx.bolt(x, z, e.x, e.z, '#e0b8ff'); g.damage(e, this.dmg(c.zapDmg) * (e.soakT > 0 ? 1.8 : 1), { color: '#fff27a', stun: 0.15 }); } }
    }
  }
  r_tormenta(pool, t) { for (const [x, z] of this.orbs || []) { pool.add(x, 0.55, z, 0.32, 0.32, 0.32, '#fff27a', t * 5, t * 3, 0); pool.add(x, 0.55, z, 0.18, 0.18, 0.18, '#c58bff'); } }
}

// texto curto do que o próximo nível faz
export function nextDesc(key, level) {
  if (F[key]) return F[key].desc;
  return S[key].desc[Math.min(level, S[key].desc.length - 1)];
}
