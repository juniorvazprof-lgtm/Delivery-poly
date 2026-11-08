// Sala da Fenda no estilo clareira: centro livre para lutar, decoração e obstáculos só nas bordas,
// objetos quebráveis perto das bordas, entrada embaixo e saídas em cima, à esquerda ou à direita.
import * as T from '../lib/three.js';
import { StaticBatch, hash, mat, geo, buildModel } from '../engine/voxel.js';
import { PROPS } from '../data/models.js';
import { mergeModel } from './merge.js';
import { CFG } from './config.js';
import { buildFloor, buildFloorDetail, buildBorders, buildBackdrop, buildForeground, Spores, clump, rock } from './scenery.js';


export class Arena {
  constructor(scene, layout, seed = 0, reduceFx = false) {
    const { w, d } = layout;
    this.scene = scene; this.w = w; this.d = d; this.doors = []; this.colliders = []; this.breakables = [];
    this.group = new T.Group(); scene.add(this.group);
    let n = seed * 1000;
    const rnd = () => hash(n++, seed * 7 + 3);

    // chão de palco, detalhes baixos e bordas em camadas
    buildFloor(this.group, w, d, seed);
    const batch = new StaticBatch('iluminura');
    const gap = (x, z) => (Math.abs(x) < 1.6 && (z < -d / 2 + 1.6 || z > d / 2 - 1.6)) || (Math.abs(z) < 1.6 && Math.abs(x) > w / 2 - 1.6);
    buildFloorDetail(batch, w - 1, d - 1, rnd);
    buildBorders(batch, w, d, rnd, gap);
    // avanços para dentro da borda (contorno orgânico) com colisão; nunca no centro
    const inner = Math.round(7 + rnd() * 4);
    for (let k = 0; k < inner; k++) {
      const p = this.edgePoint(rnd, 0.3, 0.9);
      if (!p || gap(p.x, p.z)) continue;
      const r = rnd();
      const def = r < 0.65 ? clump(rnd, 8 + rnd() * 4, 1) : r < 0.85 ? rock(rnd, 5 + rnd() * 3) : { ...PROPS.crystal, scale: 0.85 };
      batch.add({ ...def, scale: def.scale || 1 }, p.x, p.z, rnd() * 6);
      this.colliders.push([p.x, p.z, 0.45]);
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {   // cantos mais fechados
      const x = sx * (w / 2 - 0.4), z = sz * (d / 2 - 0.4);
      batch.add({ ...clump(rnd, 13, sz < 0 ? 2 : 3), scale: 1 }, x, z, rnd() * 6); this.colliders.push([x, z, 0.75]);
    }
    batch.build(this.group);

    // camadas de parallax: fundo mais lento, primeiro plano mais rápido que a sala
    this.back = buildBackdrop(w, d, rnd); scene.add(this.back);
    this.front = buildForeground(w, d, rnd); scene.add(this.front);
    this.spores = new Spores(this.group, w - 1, d - 1, reduceFx ? 14 : 34);

    // quebráveis: caixas de sucata e arbustos perto das bordas; soltam Liga de Fenda
    const nb = layout.breakables ?? Math.round(4 + rnd() * 3);
    for (let k = 0; k < nb; k++) {
      const p = this.edgePoint(rnd, 1.0, 2.0);
      if (!p || gap(p.x, p.z) || this.blocked(p, 0.6)) continue;
      const kind = rnd() > 0.5 ? 'crate' : 'bush', body = buildModel({ ...PROPS[kind], scale: kind === 'crate' ? 0.75 : 0.6 });
      mergeModel(body); body.position.set(p.x, 0, p.z); body.rotation.y = rnd() * 6; this.group.add(body);
      this.breakables.push({ x: p.x, z: p.z, r: 0.35, body, kind, alive: true });
    }

  }

  // chamado a cada quadro com o centro da câmera
  update(dt, t, camAt) {
    this.back.position.set(camAt.x * 0.35, 0, camAt.z * 0.35);     // fica para trás: parece mais distante
    this.front.position.set(-camAt.x * 0.5, 0, camAt.z);            // passa na frente: parece mais perto
    this.spores.update(dt, t);
    shakeBreakables(this.breakables, dt);
  }

  addBreakable(x, z, kind) {
    const body = buildModel({ ...PROPS[kind], scale: kind === 'chest' ? 1.3 : 0.75 }); mergeModel(body);
    body.position.set(x, 0, z); this.group.add(body);
    this.breakables.push({ x, z, r: kind === 'chest' ? 0.5 : 0.35, body, kind, alive: true });
  }
  addProp(kind, x, z, scale, r) {
    const body = buildModel({ ...PROPS[kind], scale }); mergeModel(body);
    body.position.set(x, 0, z); this.group.add(body); this.colliders.push([x, z, r]);
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

  // golpe de Kay: atinge objetos no arco; os que têm vida levam vários golpes
  breakIn(pos, face, range, half) { return hitBreakables(this, pos, face, range, half); }

  // veio de minério: rocha com cristais na cor do material
  addVein(x, z, type) {
    const v = CFG.veins[type], c = v.crystal;
    const def = { scale: 1, parts: [[-3.6, 0, -3, 7.2, 2.6, 6, 'concreteD'], [-2.6, 2.6, -2, 5, 1.4, 4, 'concrete'],
      [-2.2, 2.2, 1.2, 1.4, 3.4, 1.4, c], [0.6, 2.8, -0.6, 1.6, 4.4, 1.6, c], [-0.8, 3.6, -1.8, 1.2, 2.6, 1.2, c], [2.2, 1.6, 1, 1, 2.2, 1, c]] };
    const body = buildModel(def); mergeModel(body); body.position.set(x, 0, z); body.rotation.y = Math.random() * 6;
    this.group.add(body);
    this.breakables.push({ x, z, r: 0.5, body, kind: 'vein', vein: type, hp: v.hp, alive: true });
  }

  dispose() {
    this.scene.remove(this.group, this.back, this.front);
    [this.group, this.back, this.front].forEach(r => r.traverse(o => { if (o.geometry && o.geometry !== geo) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); }));
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

// compartilhado com o subúrbio: devolve [{ b, broke }]
export function hitBreakables(owner, pos, face, range, half) {
  const out = [];
  for (const b of owner.breakables) {
    if (!b.alive) continue;
    const dx = b.x - pos.x, dz = b.z - pos.z, dd = Math.hypot(dx, dz);
    if (dd > range + b.r) continue;
    const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - face), Math.cos(Math.atan2(dx, dz) - face));
    if (dd > b.r + 0.3 && Math.abs(da) > half) continue;
    b.hp = (b.hp ?? 1) - 1;
    if (b.hp <= 0) { b.alive = false; owner.group.remove(b.body); out.push({ b, broke: true }); }
    else { b.body.userData.shake = 0.18; out.push({ b, broke: false }); }
  }
  return out;
}
// tremida de objetos atingidos (chamada no update da cena)
export function shakeBreakables(list, dt) {
  for (const b of list) {
    const s = b.body.userData.shake; if (!s || !b.alive) continue;
    b.body.userData.shake = Math.max(0, s - dt);
    b.body.position.x = b.x + Math.sin(s * 90) * 0.06 * (s / 0.18);
  }
}
