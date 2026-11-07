// Sala da Fenda no estilo clareira: centro livre para lutar, decoração e obstáculos só nas bordas,
// objetos quebráveis perto das bordas, entrada embaixo e saídas em cima, à esquerda ou à direita.
import * as T from '../lib/three.js';
import { StaticBatch, hash, mat, geo, buildModel } from '../engine/voxel.js';
import { PROPS } from '../data/models.js';
import { mergeModel } from './merge.js';

const EDGE_TALL = ['tree', 'tree', 'deadtree', 'tree'];
const EDGE_LOW = ['bush', 'bush', 'crystal', 'barrier'];

export class Arena {
  constructor(scene, layout, seed = 0) {
    const { w, d } = layout;
    this.scene = scene; this.w = w; this.d = d; this.doors = []; this.colliders = []; this.breakables = [];
    this.group = new T.Group(); scene.add(this.group);
    let n = seed * 1000;
    const rnd = () => hash(n++, seed * 7 + 3);

    // chão: manchas suaves de musgo, grama e terra (ruído de baixa frequência, pouco contraste)
    const cols = Math.ceil(w) + 2, rows = Math.ceil(d) + 2;
    const tiles = new T.InstancedMesh(new T.BoxGeometry(1, 0.2, 1), new T.MeshToonMaterial({ color: '#ffffff' }), cols * rows);
    const m = new T.Matrix4(), c = new T.Color();
    const moss = new T.Color('#3f553f'), grass = new T.Color('#4a6446'), dirt = new T.Color('#4d4a3c');
    let i = 0;
    for (let x = 0; x < cols; x++) for (let z = 0; z < rows; z++) {
      const px = -w / 2 - 1 + x + 0.5, pz = -d / 2 - 1 + z + 0.5;
      m.makeTranslation(px, -0.1, pz); tiles.setMatrixAt(i, m);
      const lf = (Math.sin(px * 0.55 + seed) + Math.cos(pz * 0.7 - seed * 2) + Math.sin((px + pz) * 0.3)) / 3;
      c.copy(moss).lerp(lf > 0.25 ? dirt : grass, Math.min(1, Math.abs(lf) * 1.4)).lerp(moss, hash(x, z) * 0.35);
      tiles.setColorAt(i++, c);
    }
    this.group.add(tiles);

    // borda irregular: anel externo alto + props que avançam um pouco para dentro (só na faixa da borda)
    const batch = new StaticBatch('iluminura');
    const gap = (x, z) => (Math.abs(x) < 1.6 && (z < -d / 2 + 1.6 || z > d / 2 - 1.6)) || (Math.abs(z) < 1.6 && Math.abs(x) > w / 2 - 1.6);
    const place = (x, z, kind, scale, collide) => {
      if (gap(x, z)) return;
      batch.add({ ...PROPS[kind], scale }, x, z, rnd() * 6);
      if (collide) this.colliders.push([x, z, collide]);
    };
    for (let x = -w / 2 - 0.4; x <= w / 2 + 0.4; x += 1.05) {
      place(x, -d / 2 - 0.9 + rnd() * 0.4, EDGE_TALL[Math.floor(rnd() * 4)], 1.2 + rnd() * 0.3);
      place(x, d / 2 + 0.75, 'bush', 1.05);                                       // borda de baixo baixa: não cobre a sala
    }
    for (let z = -d / 2; z <= d / 2; z += 1.05) {
      place(-w / 2 - 0.9 + rnd() * 0.3, z, EDGE_TALL[Math.floor(rnd() * 4)], 1.2 + rnd() * 0.3);
      place(w / 2 + 0.9 - rnd() * 0.3, z, EDGE_TALL[Math.floor(rnd() * 4)], 1.2 + rnd() * 0.3);
    }
    // avanços para dentro da borda: deixam o contorno orgânico, nunca no centro
    const inner = Math.round(6 + rnd() * 4);
    for (let k = 0; k < inner; k++) {
      const p = this.edgePoint(rnd, 0.35, 1.1);
      if (!p || gap(p.x, p.z)) continue;
      const kind = EDGE_LOW[Math.floor(rnd() * EDGE_LOW.length)];
      place(p.x, p.z, kind, kind === 'crystal' ? 0.9 : 1.1 + rnd() * 0.4, kind === 'crystal' ? 0.3 : 0.45);
    }
    // cantos mais fechados
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) place(sx * (w / 2 - 0.5), sz * (d / 2 - 0.5), sz < 0 ? 'tree' : 'bush', 1.3, 0.6);
    batch.build(this.group);

    // quebráveis: caixas de sucata e arbustos perto das bordas; soltam Liga de Fenda
    const nb = layout.breakables ?? Math.round(4 + rnd() * 3);
    for (let k = 0; k < nb; k++) {
      const p = this.edgePoint(rnd, 1.0, 2.0);
      if (!p || gap(p.x, p.z) || this.blocked(p, 0.6)) continue;
      const kind = rnd() > 0.5 ? 'crate' : 'bush', body = buildModel({ ...PROPS[kind], scale: kind === 'crate' ? 0.75 : 0.6 });
      mergeModel(body); body.position.set(p.x, 0, p.z); body.rotation.y = rnd() * 6; this.group.add(body);
      this.breakables.push({ x: p.x, z: p.z, r: 0.35, body, kind, alive: true });
    }

    const outer = new T.Mesh(new T.PlaneGeometry(w + 40, d + 40), new T.MeshBasicMaterial({ color: '#1a231c' }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.21; this.group.add(outer);
  }

  // ponto aleatório numa faixa a [a, b] unidades da parede
  edgePoint(rnd, a, b) {
    const side = Math.floor(rnd() * 4), t = rnd(), inset = a + rnd() * (b - a);
    const { w, d } = this;
    if (side === 0) return { x: (t - 0.5) * (w - 1), z: -d / 2 + inset };
    if (side === 1) return { x: (t - 0.5) * (w - 1), z: d / 2 - inset };
    if (side === 2) return { x: -w / 2 + inset, z: (t - 0.5) * (d - 1) };
    return { x: w / 2 - inset, z: (t - 0.5) * (d - 1) };
  }

  // portal no lado indicado: postes, verga e véu na cor do tipo de sala
  addDoor(side, info) {
    const g = new T.Group(), { w, d } = this;
    const post = px => { const p = new T.Mesh(new T.BoxGeometry(0.3, 1.5, 0.3), mat('steelD')); p.position.set(px, 0.75, 0); return p; };
    const top = new T.Mesh(new T.BoxGeometry(1.9, 0.28, 0.34), mat('steelD')); top.position.y = 1.55;
    const veil = new T.Mesh(new T.PlaneGeometry(1.3, 1.4), new T.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.55, side: T.DoubleSide }));
    veil.position.y = 0.72;
    const pad = new T.Mesh(new T.PlaneGeometry(1.6, 1.1), new T.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.22 }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.02, 0.7);
    g.add(post(-0.8), post(0.8), top, veil, pad);
    const spot = { top: [0, -d / 2 - 0.15, 0], left: [-w / 2 - 0.15, 0, Math.PI / 2], right: [w / 2 + 0.15, 0, -Math.PI / 2] }[side];
    g.position.set(spot[0], 0, spot[1]); g.rotation.y = spot[2];
    this.group.add(g);
    const door = {
      side, info, group: g, veil, x: spot[0], z: spot[1],
      inside: p => side === 'top' ? Math.abs(p.x) < 0.9 && p.z < -d / 2 + 0.75
        : side === 'left' ? Math.abs(p.z) < 0.9 && p.x < -w / 2 + 0.75
          : Math.abs(p.z) < 0.9 && p.x > w / 2 - 0.75,
    };
    this.doors.push(door);
    return door;
  }

  // golpe de Kay: quebra objetos dentro do arco; devolve as posições quebradas
  breakIn(pos, face, range, half) {
    const out = [];
    for (const b of this.breakables) {
      if (!b.alive) continue;
      const dx = b.x - pos.x, dz = b.z - pos.z, dd = Math.hypot(dx, dz);
      if (dd > range + b.r) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - face), Math.cos(Math.atan2(dx, dz) - face));
      if (dd > b.r + 0.3 && Math.abs(da) > half) continue;
      b.alive = false; this.group.remove(b.body); out.push(b);
    }
    return out;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(o => { if (o.geometry && o.geometry !== geo) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
  }

  *solids() {
    for (const c of this.colliders) yield c;
    for (const b of this.breakables) if (b.alive) yield [b.x, b.z, b.r];
  }
  resolve(p, r) {
    const hw = this.w / 2 - r, hd = this.d / 2 - r;
    p.x = Math.max(-hw, Math.min(hw, p.x)); p.z = Math.max(-hd, Math.min(hd, p.z));
    for (const [x, z, pr] of this.solids()) {
      const dx = p.x - x, dz = p.z - z, dist = Math.hypot(dx, dz), min = pr + r;
      if (dist < min && dist > 1e-4) { p.x = x + dx / dist * min; p.z = z + dz / dist * min; }
    }
  }
  blocked(p, r) {
    if (Math.abs(p.x) > this.w / 2 - r || Math.abs(p.z) > this.d / 2 - r) return true;
    for (const [x, z, pr] of this.solids()) if (Math.hypot(p.x - x, p.z - z) < pr + r) return true;
    return false;
  }
  spawnPoint(avoid, taken, minDist = 4) {
    for (let k = 0; k < 80; k++) {
      const p = new T.Vector3((Math.random() - 0.5) * (this.w - 2.5), 0, (Math.random() - 0.5) * (this.d - 2.5));
      if (this.blocked(p, 0.8) || p.distanceTo(avoid) < minDist || taken.some(q => q.distanceTo(p) < 1.6)) continue;
      return p;
    }
    return new T.Vector3(0, 0, -this.d / 2 + 1.5);
  }
}
