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
  r_arcano(fx, t) { for (const [x, z] of this.orbs || []) { fx.glow(x, 0.55, z, 1.1, '#9a4dff', 0.9); fx.glow(x, 0.55, z, 0.45, '#f4e8ff', 1); fx.cube(x, 0.55, z, 0.16, 0.16, 0.16, '#ffffff', t * 3, t * 4, 0); } }
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
  r_tempestade(fx, t) {
    for (const [x, z] of this.tornados || []) { fx.glow(x, 0.3, z, 1.6, '#ff4a10', 0.6); for (let k = 0; k < 9; k++) {
      const a = t * 9 + k * 1.05, r = 0.1 + k * 0.08;
      fx.glow(x + Math.sin(a) * r, 0.1 + k * 0.2, z + Math.cos(a) * r, 0.5 - k * 0.02, k % 2 ? '#ff6a2a' : '#ffc04d', 0.9);
    } }
  }
  u_nevasca(dt) {
    const g = this.g, m = g.mage, c = this.cfg, R = this.area(c.radius);
    this.state.tick = (this.state.tick || 0) - dt; this.state.fz = (this.state.fz ?? c.freezeEvery) - dt;
    for (const e of g.query(m.x, m.z, R)) e.slowT = Math.max(e.slowT, 0.3);
    if (this.state.tick <= 0) { this.state.tick = c.tick; for (const e of g.query(m.x, m.z, R)) g.damage(e, this.dmg(c.dmg), { color: '#dff4ff', quiet: true }); }
    if (this.state.fz <= 0) { this.state.fz = c.freezeEvery; g.fx.ring(m.x, m.z, R, '#bfe9ff', 0.5, true); for (const e of g.query(m.x, m.z, R)) g.damage(e, 0, { stun: c.freeze, quiet: true }); }
  }
  r_nevasca(fx, t) {
    const m = this.g.mage, R = this.area(this.cfg.radius);
    fx.glow(m.x, 0.1, m.z, R * 2.2, '#3f8fd0', 0.25);
    for (let k = 0; k < 26; k++) { const a = t * 0.8 + k / 26 * Math.PI * 2, r = R * (0.35 + 0.65 * ((k * 37) % 10) / 10); fx.glow(m.x + Math.sin(a) * r, 0.3 + (k % 3) * 0.3, m.z + Math.cos(a) * r, 0.35, '#e8f8ff', 0.8); }
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
  r_tormenta(fx, t) { for (const [x, z] of this.orbs || []) { fx.glow(x, 0.55, z, 1.3, '#c58bff', 0.8); fx.glow(x, 0.55, z, 0.6, '#fff27a', 1); fx.cube(x, 0.55, z, 0.18, 0.18, 0.18, '#ffffff', t * 5, t * 3, 0); } }

  // ---------- poderes absurdos ----------
  // Anel de fogo: cresce sem parar; no máximo, explode e recomeça pequeno
  u_anel(dt) {
    const g = this.g, m = g.mage, c = this.cfg, st = this.state, maxR = this.area(this.v('maxR'));
    st.r = (st.r ?? c.minR) + this.v('grow') * dt * (1 / g.mods.cd); st.tick = (st.tick || 0) - dt;
    if (st.tick <= 0) { st.tick = c.tick; for (const e of g.query(m.x, m.z, st.r)) g.damage(e, this.dmg(), { burn: 1.5, quiet: true, color: '#ff8a3d' }); }
    if (st.r >= maxR) {
      for (const e of g.query(m.x, m.z, maxR + 0.5)) g.damage(e, this.dmg(this.v('blast')), { push: 7, from: m, color: '#ffe066' });
      g.fx.ring(m.x, m.z, maxR + 1, '#ff8a3d', 0.5, true); g.fx.burst(m.x, m.z, '#ffb15a', 40, 7); g.shake(0.35);
      st.r = c.minR;
    }
  }
  r_anel(fx, t) {
    const m = this.g.mage, r = this.state.r ?? this.cfg.minR, n = Math.round(18 + r * 9), max = this.area(this.v('maxR')), heat = r / max;
    fx.glow(m.x, 0.05, m.z, r * 2.3, '#ff3a00', 0.12 + heat * 0.18);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + t * 1.6, fl = 0.75 + 0.25 * Math.sin(t * 17 + i * 2.3);
      fx.glow(m.x + Math.sin(a) * r, 0.25, m.z + Math.cos(a) * r, 0.75 * fl, '#ff6a1a', 0.9);
      if (i % 2 === 0) fx.glow(m.x + Math.sin(a) * r, 0.5 + 0.25 * fl, m.z + Math.cos(a) * r, 0.35 * fl, '#ffe066', 0.9);
    }
  }
  // grupo mais denso de inimigos (amostra), para meteoros e buraco negro
  densest(n, maxR = 9) {
    const g = this.g, m = g.mage, pool = g.query(m.x, m.z, maxR);
    const cand = pool.sort(() => Math.random() - 0.5).slice(0, 14).map(e => ({ e, k: g.query(e.x, e.z, 2).length })).sort((a, b) => b.k - a.k);
    const out = [];
    for (const { e } of cand) { if (out.length >= n) break; if (out.every(o => Math.hypot(o.x - e.x, o.z - e.z) > 2.5)) out.push({ x: e.x, z: e.z }); }
    return out;
  }
  // Chuva de meteoros: sombra no chão, queda e cratera
  u_meteoro(dt) {
    const g = this.g, st = this.state; st.falls = st.falls || [];
    if ((this.t -= dt) <= 0) { this.t = this.cd(); for (const p of this.densest(this.v('count'))) st.falls.push({ ...p, t: 0 }); if (!st.falls.length) this.t = 0.5; }
    for (const f of st.falls) {
      f.t += dt;
      if (f.t >= this.cfg.fall && !f.done) {
        f.done = true; const R = this.area(this.v('radius'));
        for (const e of g.query(f.x, f.z, R)) g.damage(e, this.dmg(), { push: 6, from: f, burn: 2, color: '#ffe066' });
        g.fx.ring(f.x, f.z, R, '#ff8a3d', 0.45, true); g.fx.burst(f.x, f.z, '#ffb15a', 34, 6); g.fx.burst(f.x, f.z, '#6a4a3a', 14, 4); g.shake(0.3);
        g.scorch(f.x, f.z, R);
      }
    }
    st.falls = st.falls.filter(f => !f.done);
  }
  r_meteoro(fx, t) {
    const R = this.area(this.v('radius'));
    for (const f of this.state.falls || []) {
      const p = Math.min(1, f.t / this.cfg.fall), y = 9 * (1 - p), x = f.x + 3 * (1 - p), z = f.z - 2 * (1 - p);
      fx.glow(f.x, 0.05, f.z, R * 2 * (0.4 + 0.6 * p), '#ff2a00', 0.25 + 0.35 * p);   // sombra de aviso
      fx.glow(x, y, z, 2.2, '#ff5a10', 0.9); fx.glow(x, y, z, 1.0, '#fff2a8', 1);
      for (let k = 1; k < 6; k++) fx.glow(x + k * 0.35, y + k * 0.9, z - k * 0.25, 1.4 - k * 0.2, '#ff8a3d', 0.7 - k * 0.1);
    }
  }
  // Buraco negro: suga, fere aos poucos e explode ao fechar
  u_buraco(dt) {
    const g = this.g, c = this.cfg, st = this.state;
    if (!st.hole && (this.t -= dt) <= 0) {
      const p = this.densest(1)[0]; if (!p) { this.t = 0.5; return; }
      st.hole = { ...p, t: 0 }; st.tick = 0;
    }
    const h = st.hole; if (!h) return;
    h.t += dt; const R = this.area(this.v('radius')), pull = this.v('pull');
    for (const e of g.query(h.x, h.z, R)) {
      if (e.cfg.boss) continue;
      const dx = h.x - e.x, dz = h.z - e.z, d = Math.hypot(dx, dz) || 1, f = pull * (0.4 + 0.6 * (1 - d / R)) * (e.cfg.heavy ? 0.4 : 1);
      e.x += dx / d * Math.min(d - 0.1, f * dt); e.z += dz / d * Math.min(d - 0.1, f * dt);
    }
    if ((st.tick -= dt) <= 0) { st.tick = c.tick; for (const e of g.query(h.x, h.z, 1.4)) g.damage(e, this.dmg(), { quiet: true, color: '#e0b8ff' }); }
    if (h.t >= this.v('dur')) {
      for (const e of g.query(h.x, h.z, R * 0.7)) g.damage(e, this.dmg(this.v('collapse')), { push: 8, from: h, color: '#ffffff' });
      g.fx.ring(h.x, h.z, R * 0.8, '#c58bff', 0.5, true); g.fx.burst(h.x, h.z, '#c58bff', 40, 7); g.shake(0.3);
      st.hole = null; this.t = this.cd();
    }
  }
  r_buraco(fx, t) {
    const h = this.state.hole; if (!h) return;
    const R = this.area(this.v('radius')), p = Math.min(1, h.t / 0.3), end = Math.max(0, 1 - (this.v('dur') - h.t) / 0.4), s = p * (1 - end * 0.6);
    fx.glow(h.x, 0.3, h.z, R * 1.6 * s, '#5a1aa8', 0.5);
    for (let i = 0; i < 30; i++) {
      const a = -t * (3 + (i % 3)) + i * 0.7, rr = ((i * 0.137 + t * 0.6) % 1) * R * s;
      fx.glow(h.x + Math.sin(a) * rr, 0.35, h.z + Math.cos(a) * rr, 0.45, i % 2 ? '#c58bff' : '#ff4fd8', 0.8);
    }
    fx.cube(h.x, 0.5, h.z, 0.9 * s, 0.9 * s, 0.9 * s, '#000000', t * 2, t * 3, 0);
    fx.glow(h.x, 0.5, h.z, 1.6 * s, '#e0b8ff', 0.6);
  }
  // Trovoada: raios caem do céu sem parar por alguns segundos
  u_trovoada(dt) {
    const g = this.g, m = g.mage, st = this.state;
    if (!st.on && (this.t -= dt) <= 0) { st.on = this.v('dur'); st.acc = 0; g.shake(0.15); }
    if (!st.on) return;
    st.on = Math.max(0, st.on - dt); st.acc += this.v('rate') * dt;
    const pool = g.query(m.x, m.z, 8.5);
    while (st.acc >= 1) {
      st.acc -= 1;
      const e = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null, x = e ? e.x : m.x + (Math.random() - 0.5) * 8, z = e ? e.z : m.z + (Math.random() - 0.5) * 12;
      g.fx.sky(x, z);
      for (const o of g.query(x, z, this.cfg.radius)) g.damage(o, this.dmg() * (o.soakT > 0 ? 1.8 : 1), { stun: 0.2, color: '#fff27a' });
    }
    if (!st.on) { st.on = 0; this.t = this.cd(); }
  }
}

// texto curto do que o próximo nível faz
export function nextDesc(key, level) {
  if (F[key]) return F[key].desc;
  return S[key].desc[Math.min(level, S[key].desc.length - 1)];
}
