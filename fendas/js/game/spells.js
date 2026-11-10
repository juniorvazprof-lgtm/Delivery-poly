// Feitiços do Mago. Cada um decide sozinho quando lançar (o jogador só se move).
// g.mods: dmg (multiplicador), cd (multiplicador da recarga), area (multiplicador de raio).
import { CFG } from './config.js';

const S = CFG.spells, F = CFG.fusions, E = CFG.evolutions;
const lv = (arr, l) => Array.isArray(arr) ? arr[Math.min(l, arr.length) - 1] : arr;

export class Spell {
  constructor(key, g) { this.key = key; this.g = g; this.level = 1; this.t = 0.3; this.fusion = !!F[key]; this.cfg = F[key] || S[key]; this.state = {}; }
  v(name) {
    const ev = this.evo && E[this.key];
    let x = this.fusion ? this.cfg[name] : ev && ev[name] !== undefined ? ev[name] : lv(this.cfg[name], this.level);
    if (name === 'count' && typeof x === 'number') x += this.g.mods.count || 0;
    if ((name === 'dur' || name === 'life') && typeof x === 'number') x *= this.g.mods.dur || 1;
    return x;
  }
  get meta() { return this.evo ? E[this.key] : this.cfg; }
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
    const g = this.g, m = g.mage, targets = g.nearest(m.x, m.z, this.v('count'), g.reach());
    if (!targets.length) { this.t = 0.2; return; }
    targets.forEach(e => {
      const dx = e.x - m.x, dz = e.z - m.z, l = Math.hypot(dx, dz) || 1, sp = this.cfg.speed;
      g.projectiles.push({ kind: 'fogo', x: m.x, z: m.z, vx: dx / l * sp, vz: dz / l * sp, life: g.reach(1.15) / sp, r: 0.22, pierce: 0, hit: new Set(),
        onHit: (p) => { const R = this.area(this.v('radius')); g.fx.ring(p.x, p.z, R, '#ff8a3d', 0.25); g.fx.burst(p.x, p.z, '#ffb15a', 8);
          for (const o of g.query(p.x, p.z, R)) g.damage(o, this.dmg(), { burn: this.v('burn'), from: p, color: '#ffb15a' }); } });
      if (this.evo) g.projectiles[g.projectiles.length - 1].big = true;
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
      g.projectiles.push({ kind: 'vento', x: m.x, z: m.z, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, life: g.reach(1.1) / this.cfg.speed, r: 0.3, pierce: this.v('pierce'), hit: new Set(),
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
        this.state.hits.set(e, this.cfg.hitEvery); g.damage(e, this.dmg(), { from: { x: m.x, z: m.z }, push: 2.5, color: '#e0b8ff', corrupt: 3 });
      }
    }
  }
  r_arcano(fx, t) { for (const [x, z] of this.orbs || []) { fx.glow(x, 0.55, z, 1.1, '#9a4dff', 0.9); fx.glow(x, 0.55, z, 0.45, '#f4e8ff', 1); fx.cube(x, 0.55, z, 0.16, 0.16, 0.16, '#ffffff', t * 3, t * 4, 0); } }
  u_raio(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    const g = this.g, m = g.mage, pool = g.query(m.x, m.z, g.reach());
    if (!pool.length) { this.t = 0.2; return; }
    for (let s = 0; s < this.v('strikes'); s++) {
      let cur = pool[Math.floor(Math.random() * pool.length)], hit = new Set(), fromX = m.x, fromZ = m.z;
      for (let c = 0; c <= this.v('chains') && cur; c++) {
        hit.add(cur); g.fx.bolt(fromX, fromZ, cur.x, cur.z, '#fff27a');
        g.damage(cur, this.dmg(), { from: { x: fromX, z: fromZ }, color: '#fff27a', stun: 0.15, shock: 3 });
        fromX = cur.x; fromZ = cur.z;
        cur = g.query(cur.x, cur.z, 2.6).find(o => !hit.has(o));
      }
    }
  }
  u_terra(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    const g = this.g, m = g.mage, R = this.area(this.v('radius'));
    const near = g.nearest(m.x, m.z, this.v('count'), g.reach(0.9));
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
    for (const e of g.nearest(m.x, m.z, this.cfg.count, g.reach(1.3))) {
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
    if (this.state.tick <= 0) { this.state.tick = c.tick; for (const e of g.query(m.x, m.z, R)) g.damage(e, this.dmg(c.dmg), { color: '#dff4ff', quiet: true, chill: 1 }); }
    if (this.state.fz <= 0) { this.state.fz = c.freezeEvery; g.fx.ring(m.x, m.z, R, '#bfe9ff', 0.5, true); for (const e of g.query(m.x, m.z, R)) g.damage(e, 0, { freeze: c.freeze, quiet: true }); }
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
      for (const [x, z] of this.orbs) { const e = g.nearest(x, z, 1, 4)[0]; if (e) { g.fx.bolt(x, z, e.x, e.z, '#e0b8ff'); g.damage(e, this.dmg(c.zapDmg), { color: '#fff27a', stun: 0.15, shock: 3 }); } }
    }
  }
  r_tormenta(fx, t) { for (const [x, z] of this.orbs || []) { fx.glow(x, 0.55, z, 1.3, '#c58bff', 0.8); fx.glow(x, 0.55, z, 0.6, '#fff27a', 1); fx.cube(x, 0.55, z, 0.18, 0.18, 0.18, '#ffffff', t * 5, t * 3, 0); } }

  // ---------- poderes absurdos ----------
  // Anel de fogo: cresce com o nível do feitiço; queima quem estiver na faixa do anel (o Mago fica visível no meio)
  u_anel(dt) {
    const g = this.g, m = g.mage, c = this.cfg, st = this.state, R = this.area(this.v('radius'));
    st.tick = (st.tick || 0) - dt;
    if (st.tick <= 0) { st.tick = this.v('tick'); let n = 0; for (const e of g.query(m.x, m.z, R + c.band)) if (Math.hypot(e.x - m.x, e.z - m.z) > R - c.band - e.r) { n++; g.damage(e, this.dmg(), { burn: 1.5, quiet: true, color: '#ff8a3d' }); }
      if (this.evo && n) m.hp = Math.min(m.maxHp, m.hp + Math.min(n, 8) * this.v('heal')); }
    if (this.level >= 5 && (st.wave = (st.wave ?? this.v('waveEvery')) - dt) <= 0) {
      st.wave = this.v('waveEvery');
      for (const e of g.query(m.x, m.z, R + 2.5)) g.damage(e, this.dmg(this.v('wave')), { push: 6, from: m, color: '#ffe066', burn: 2 });
      g.fx.ring(m.x, m.z, R + 2.5, '#ff8a3d', 0.5, true); g.shake(0.2);
    }
  }
  r_anel(fx, t) {
    const m = this.g.mage, r = this.area(this.v('radius')), n = Math.round(14 + r * 10);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + t * 1.6, fl = 0.75 + 0.25 * Math.sin(t * 17 + i * 2.3);
      fx.glow(m.x + Math.sin(a) * r, 0.25, m.z + Math.cos(a) * r, 0.6 * fl, this.evo ? '#ffb020' : '#ff6a1a', 0.85);
      if (i % 2 === 0) fx.glow(m.x + Math.sin(a) * r, 0.45 + 0.2 * fl, m.z + Math.cos(a) * r, 0.28 * fl, '#ffe066', 0.85);
    }
  }
  // grupo mais denso de inimigos (amostra), para meteoros e buraco negro
  densest(n, maxR = this.g.reach(1.4)) {
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
    if ((st.tick -= dt) <= 0) { st.tick = c.tick; for (const e of g.query(h.x, h.z, 1.4)) g.damage(e, this.dmg(), { quiet: true, color: '#e0b8ff', corrupt: 3 }); }
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
    const pool = g.query(m.x, m.z, g.reach(1.4));
    while (st.acc >= 1) {
      st.acc -= 1;
      const e = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null, x = e ? e.x : m.x + (Math.random() - 0.5) * 8, z = e ? e.z : m.z + (Math.random() - 0.5) * 12;
      g.fx.sky(x, z);
      for (const o of g.query(x, z, this.cfg.radius)) g.damage(o, this.dmg(), { stun: 0.2, color: '#fff27a', shock: 3 });
    }
    if (!st.on) { st.on = 0; this.t = this.cd(); }
  }
  // ---------- novos feitiços ----------
  // Feixe da Aurora: feixes de luz giram em volta do Mago e expõem os inimigos
  u_luz(dt) {
    const g = this.g, m = g.mage, st = this.state, n = this.v('count'), L = this.area(this.v('length')), w = this.v('width');
    st.a = (st.a || 0) + this.v('spin') * dt; st.tick = (st.tick || 0) - dt;
    this.beams = [];
    for (let i = 0; i < n; i++) { const a = st.a + i / n * Math.PI * 2; this.beams.push([Math.sin(a), Math.cos(a), L]); }
    if (st.tick > 0) return; st.tick = this.cfg.tick;
    for (const [dx, dz] of this.beams) for (const e of g.query(m.x + dx * L / 2, m.z + dz * L / 2, L / 2 + 0.6)) {
      const ex = e.x - m.x, ez = e.z - m.z, along = ex * dx + ez * dz, perp = Math.abs(ex * dz - ez * dx);
      if (along > 0 && along < L + e.r && perp < w + e.r) g.damage(e, this.dmg(), { expose: 2.5, quiet: true, color: '#fff3b0' });
    }
  }
  r_luz(fx, t) {
    const m = this.g.mage, big = this.evo;
    fx.glow(m.x, 0.6, m.z, big ? 2.2 : 1.4, '#fff3b0', 0.5);
    for (const [dx, dz, L] of this.beams || []) {
      const k = Math.ceil(L / 0.3);
      for (let i = 1; i <= k; i++) { const q = i / k, x = m.x + dx * L * q, z = m.z + dz * L * q, fl = 0.85 + 0.15 * Math.sin(t * 30 + i);
        fx.glow(x, 0.55, z, (big ? 1.0 : 0.75) * fl, '#ffd84a', 0.55); fx.glow(x, 0.55, z, (big ? 0.42 : 0.3) * fl, '#ffffff', 0.9); }
      fx.glow(m.x + dx * L, 0.55, m.z + dz * L, big ? 1.6 : 1.1, '#fff3b0', 0.8);
    }
  }
  // Fagulhas caçadoras: orbes pequenos que perseguem e corrompem
  u_orbes(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    const g = this.g, m = g.mage, n = this.v('count');
    if (!g.query(m.x, m.z, g.reach()).length) { this.t = 0.3; return; }
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.random(); this.orb(m.x, m.z, Math.sin(a), Math.cos(a), false); }
  }
  orb(x, z, dx, dz, child) {
    const g = this.g, sp = this.cfg.speed;
    g.projectiles.push({ kind: 'orbe', home: true, x, z, vx: dx * sp, vz: dz * sp, sp, life: child ? 1.2 : this.v('life') * g.mods.area, r: child ? 0.16 : 0.2, pierce: 0, hit: new Set(), child, retarget: 0,
      onHit: (p, e) => {
        g.damage(e, this.dmg() * (child ? 0.5 : 1), { corrupt: 3, color: '#e8b8ff', quiet: child });
        if (this.evo && !child) for (let k = 0; k < this.v('split'); k++) { const a = Math.random() * 6.28; this.orb(p.x, p.z, Math.sin(a), Math.cos(a), true); }
      } });
  }
  // Lâmina rúnica: ricocheteia nas bordas da tela
  u_runa(dt) {
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    const g = this.g, m = g.mage, n = this.v('count'), sp = this.v('speed');
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      g.projectiles.push({ kind: 'runa', bounce: true, x: m.x, z: m.z, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, life: this.v('life'), r: 0.42, rehit: this.cfg.rehit, hit: new Map(), big: this.evo,
        onHit: (p, e) => g.damage(e, this.dmg(), { corrupt: 2, push: 1.2, from: p, color: '#bff8ff' }) });
    }
  }
  // Pulso glacial: esfria e congela
  u_gelo(dt) {
    const st = this.state;
    if (st.second != null && (st.second -= dt) <= 0) { st.second = null; this.pulse(1.25); }
    if ((this.t -= dt) > 0) return; this.t = this.cd();
    this.pulse(1); if (this.v('second')) st.second = 0.4;
  }
  pulse(k) {
    const g = this.g, m = g.mage, R = this.area(this.v('radius')) * k, ch = this.v('freeze');
    g.fx.ring(m.x, m.z, R, '#bfe9ff', 0.45, true); g.fx.burst(m.x, m.z, '#e8f8ff', 10, 4);
    for (const e of g.query(m.x, m.z, R)) g.damage(e, this.dmg(), { chill: this.cfg.chill, freeze: Math.random() < ch ? this.v('freezeDur') : 0, color: '#dff4ff' });
  }
}

// texto curto do que o próximo nível faz
export function nextDesc(key, level) {
  if (F[key]) return F[key].desc;
  return S[key].desc[Math.min(level, S[key].desc.length - 1)];
}
