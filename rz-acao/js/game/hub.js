// Refúgio: subúrbio destruído de Kanda-9. Kay limpa entulho com a espada para abrir espaço
// (e ganha sucata); as Ressonas resgatadas vivem na área limpa; o portal leva à Fenda.
import * as T from '../lib/three.js';
import { StaticBatch, buildModel, blobShadow, hash, geo } from '../engine/voxel.js';
import { animateIdle } from '../engine/idle.js';
import { MODELS, PROPS } from '../data/models.js';
import { CFG } from './config.js';
import { mergeModel } from './merge.js';
import { hitBreakables, shakeBreakables } from './arena.js';
import { buildBackdrop, buildForeground, clump } from './scenery.js';

// peças de cenário do subúrbio (voxel)
const HOUSE = () => ({ parts: [
  [-14, 0, -10, 28, 16, 2, '#4a4d52'], [-14, 0, -10, 2, 14, 20, '#4a4d52'], [12, 0, -10, 2, 10, 20, '#44474b'],   // paredes que sobraram
  [-14, 16, -10, 18, 2, 12, '#5a3a32'], [-10, 13, -8, 10, 3, 2, '#5a3a32'],                                       // telhado quebrado
  [-9, 6, -8.1, 4, 4, 0.2, '#141a19'], [3, 6, -8.1, 4, 4, 0.2, 'glowA'],                                            // janelas (uma acesa)
  [-14.2, 0, -6, 0.6, 12, 6, '#356b3a'], [-14.2, 10, -6, 0.6, 5, 3, '#4f8a45'], [6, 12, -10.3, 8, 4, 0.6, '#356b3a'], // trepadeiras
  [-4, 0, -10.2, 4, 8, 0.4, '#2a2d31'],                                                                              // porta
] });
const FENCE = () => ({ parts: [[-6, 0, -0.3, 0.6, 4, 0.6, '#6b6f78'], [5.4, 0, -0.3, 0.6, 4, 0.6, '#6b6f78'], [-6, 2.6, -0.2, 12, 0.5, 0.4, '#6b6f78'], [-6, 1.2, -0.2, 12, 0.5, 0.4, '#6b6f78']] });
const DEBRIS = {
  entulho: rnd => ({ parts: [[-4, 0, -3, 7, 2.2, 6, '#5a5f66'], [-2, 2.2, -2, 4, 1.6, 3, '#6b6f78'], [1, 0, 1.8, 3, 1.6, 2.4, '#3c414c'], [-3, 2, 0.5, 2, 0.6, 3.5, 'rust'], [0.5, 1.6, -2.6, 0.5, 3, 0.5, '#8a5a3a']] }),
  carcaca: rnd => ({ parts: [[-5, 1, -3, 10, 3, 6, 'rust'], [-3, 4, -2.6, 5, 2, 5.2, '#7a4a32'], [-2.6, 4.2, -2.7, 4.2, 1.4, 0.2, '#1c2422'],
    [-4.6, 0, -3.3, 2, 2, 1, 'black'], [2.6, 0, -3.3, 2, 2, 1, 'black'], [-4.6, 0, 2.3, 2, 2, 1, 'black'], [2.6, 0, 2.3, 2, 2, 1, 'black'], [-1, 4, 1.5, 4, 0.6, 2, '#356b3a']] }),
  mato: rnd => clump(rnd, 8 + rnd() * 3, 1),
};
const NAMES = { brasque: 'Brasque', marolho: 'Marolho', brogume: 'Brogume' };

export class Hub {
  constructor(scene, save, reduceFx) {
    const H = CFG.hub, { w, d } = H;
    this.scene = scene; this.w = w; this.d = d; this.save = save; this.hub = true;
    this.doors = []; this.colliders = []; this.breakables = []; this.ressonas = [];
    this.group = new T.Group(); scene.add(this.group);
    let n = save.seed % 9973;
    const rnd = () => hash(n++, 77);

    // chão: asfalto rachado, calçada e manchas de grama; uma rua atravessa embaixo
    const cols = w + 8, rows = d + 8;
    const tiles = new T.InstancedMesh(new T.BoxGeometry(1, 0.2, 1), new T.MeshToonMaterial({ color: '#fff' }), cols * rows);
    const m = new T.Matrix4(), c = new T.Color(), asphalt = new T.Color('#3e4144'), walk = new T.Color('#5b5850'), grass = new T.Color('#4d6a44'), dark = new T.Color('#1d2420');
    let i = 0;
    for (let x = 0; x < cols; x++) for (let z = 0; z < rows; z++) {
      const px = -w / 2 - 4 + x + 0.5, pz = -d / 2 - 4 + z + 0.5;
      m.makeTranslation(px, -0.1, pz); tiles.setMatrixAt(i, m);
      const road = pz > d / 2 - 3.2 && pz < d / 2 - 0.6, side = !road && (pz > d / 2 - 4.2 || Math.abs(px) < 1.1);
      c.copy(road ? asphalt : side ? walk : walk).lerp(grass, road ? 0.05 : T.MathUtils.clamp(Math.sin(px * 0.4 + 1) * Math.cos(pz * 0.5) + hash(x, z) * 0.6, 0, 0.85));
      if (road && Math.abs(pz - (d / 2 - 1.9)) < 0.15 && Math.floor(px) % 3 === 0) c.set('#8a8064');   // faixa da rua
      const e = Math.max(Math.abs(px) / (w / 2), Math.abs(pz) / (d / 2));
      c.lerp(dark, T.MathUtils.smoothstep(e, 0.7, 1.15) * 0.7);
      tiles.setColorAt(i++, c);
    }
    this.group.add(tiles);

    // bordas: casas em ruína ao fundo, cercas e mato nas laterais, carros na rua
    const batch = new StaticBatch('iluminura');
    for (let x = -w / 2 - 2; x <= w / 2 + 2; x += 4.2 + rnd() * 1.4) batch.add({ ...HOUSE(), scale: 1 }, x, -d / 2 - 1.6 - rnd() * 0.6, (rnd() - 0.5) * 0.2);
    for (let z = -d / 2; z <= d / 2; z += 1.3) for (const sx of [-1, 1]) {
      batch.add({ ...(rnd() < 0.5 ? FENCE() : clump(rnd, 10 + rnd() * 6, 2)), scale: 1 }, sx * (w / 2 + 0.8), z, Math.PI / 2 + (rnd() - 0.5) * 0.3);
      batch.add({ ...clump(rnd, 16 + rnd() * 8, 4), scale: 1 }, sx * (w / 2 + 2.6 + rnd()), z, rnd() * 6);
    }
    for (let x = -w / 2; x <= w / 2; x += 2.2) batch.add({ ...clump(rnd, 6, 3), scale: 1 }, x, d / 2 + 0.7, rnd() * 6);
    for (const [x, z, ry] of [[-7.5, d / 2 - 1.9, 1.6], [6.8, d / 2 - 2.1, -1.4]]) { batch.add({ ...PROPS.van, scale: 1 }, x, z, ry); this.colliders.push([x, z, 0.7]); }
    for (const [x, z] of [[-4, -d / 2 + 0.7], [4, -d / 2 + 0.7], [-w / 2 + 1, 2], [w / 2 - 1, -2]]) { batch.add({ ...PROPS.lamp, scale: 1 }, x, z, 0); this.colliders.push([x, z, 0.2]); }
    batch.build(this.group);

    // portal da Fenda (norte, no meio)
    this.portal = { x: 0, z: -d / 2 + 0.9 };
    const portal = buildModel({ ...PROPS.portal, scale: 1.3 }); mergeModel(portal); portal.position.set(this.portal.x, 0, this.portal.z);
    this.group.add(portal); this.colliders.push([this.portal.x - 0.9, this.portal.z, 0.3], [this.portal.x + 0.9, this.portal.z, 0.3]);
    this.portalArmed = false;

    // Bancada do Nexo: melhorias permanentes de Kay (na área já limpa)
    this.bench = { x: 2.8, z: 0.4 };
    const bench = buildModel({ ...PROPS.nexusConsole, scale: 1.1 }); mergeModel(bench); bench.position.set(this.bench.x, 0, this.bench.z); bench.rotation.y = -0.6;
    this.group.add(bench); this.colliders.push([this.bench.x, this.bench.z, 0.55]);

    // entulho, carcaças e mato: o que já foi limpo não volta
    const kinds = ['mato', 'mato', 'entulho', 'entulho', 'entulho', 'carcaca'];
    const cleared = new Set(save.cleared), cx = 0, cz = 1.2;
    this.total = 0;
    for (let k = 0, tries = 0; k < H.piles && tries < 400; tries++) {
      const x = (rnd() - 0.5) * (w - 2.5), z = (rnd() - 0.5) * (d - 4.5) - 0.6;
      if (Math.hypot(x - cx, z - cz) < H.clearRadius || (Math.abs(x) < 1.5 && z < -1) || z > d / 2 - 4.4) continue;
      if (Math.hypot(x - 2.8, z - 0.4) < 1.8 || this.breakables.some(b => Math.hypot(b.x - x, b.z - z) < 1.5) || this.colliders.some(([a, b, r]) => Math.hypot(a - x, b - z) < r + 1)) continue;
      const id = 'd' + k++, kind = kinds[Math.floor(rnd() * kinds.length)], def = DEBRIS[kind](rnd), ry = rnd();   // consome o sorteio sempre: posições estáveis entre sessões
      this.total++;
      if (cleared.has(id)) continue;
      const body = buildModel({ ...def, scale: kind === 'mato' ? 1 : 1.1 }); mergeModel(body);
      body.position.set(x, 0, z); body.rotation.y = ry * 6; this.group.add(body);
      this.breakables.push({ id, x, z, r: kind === 'carcaca' ? 0.6 : 0.5, body, kind, hp: CFG.hub.debris[kind].hp, alive: true });
    }

    // Ressonas resgatadas passeiam na área limpa
    save.ressonas.forEach((r, j) => this.addRessona(r, j));

    this.back = buildBackdrop(w, d, rnd); scene.add(this.back);
    this.front = buildForeground(w, d, rnd); scene.add(this.front);
  }

  get clearedPct() { return this.total ? Math.round(this.save.cleared.length / this.total * 100) : 100; }

  addRessona(r, j = this.ressonas.length) {
    const body = buildModel(MODELS[r.species]); body.scale.multiplyScalar(0.5); mergeModel(body);
    const root = new T.Group(); root.add(body, blobShadow(0.28)); this.group.add(root);
    const a = j * 2.1, pos = new T.Vector3(Math.cos(a) * 2, 0, 1.2 + Math.sin(a) * 1.6);
    this.ressonas.push({ data: r, body, root, pos, target: pos.clone(), wait: Math.random() * 2, face: 0, ph: Math.random() * 6, label: NAMES[r.species] || r.species });
  }

  // golpe de Kay
  breakIn(pos, face, range, half) { return hitBreakables(this, pos, face, range, half); }

  update(dt, t, camAt) {
    this.back.position.set(camAt.x * 0.35, 0, camAt.z * 0.35);
    this.front.position.set(-camAt.x * 0.5, 0, camAt.z);
    shakeBreakables(this.breakables, dt);
    for (const r of this.ressonas) {   // passeio calmo: anda até um ponto livre, para, escolhe outro
      const dx = r.target.x - r.pos.x, dz = r.target.z - r.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.1) { r.wait -= dt; if (r.wait <= 0) { r.wait = 2 + Math.random() * 3; this.pickSpot(r); } }
      else { const sp = Math.min(0.9, d * 2); r.pos.x += dx / d * sp * dt; r.pos.z += dz / d * sp * dt; r.face += Math.max(-4 * dt, Math.min(4 * dt, Math.atan2(Math.sin(Math.atan2(dx, dz) - r.face), Math.cos(Math.atan2(dx, dz) - r.face)))); }
      this.resolve(r.pos, 0.3);
      r.root.position.copy(r.pos); r.root.rotation.y = r.face;
      r.body.rotation.set(0, 0, 0); animateIdle(r.body, t, r.ph);
      if (d >= 0.1) r.body.position.y += Math.abs(Math.sin(t * 9 + r.ph)) * 0.03;
    }
  }
  pickSpot(r) {
    for (let k = 0; k < 20; k++) {
      const p = new T.Vector3((Math.random() - 0.5) * (this.w - 3), 0, (Math.random() - 0.5) * (this.d - 5) + 0.5);
      if (Math.hypot(p.x - r.pos.x, p.z - r.pos.z) > 4 || this.blocked(p, 0.5)) continue;
      r.target.copy(p); return;
    }
  }

  // Kay entrou no portal? (só depois de ter saído dele uma vez)
  atPortal(p) {
    const inside = Math.abs(p.x - this.portal.x) < 0.8 && p.z < this.portal.z + 1.1;
    if (!inside) this.portalArmed = true;
    return inside && this.portalArmed;
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
  spawnPoint() { return new T.Vector3(0, 0, 1.2); }
  dispose() {
    this.scene.remove(this.group, this.back, this.front);
    [this.group, this.back, this.front].forEach(r => r.traverse(o => { if (o.geometry && o.geometry !== geo) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); }));
  }
}
