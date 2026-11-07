// Cenário da Fenda Verde: chão de palco, bordas em camadas de folhagem, ruínas ao fundo,
// silhuetas em primeiro plano (parallax) e esporos flutuando.
import * as T from '../lib/three.js';
import { StaticBatch, hash, mat } from '../engine/voxel.js';
import { PROPS } from '../data/models.js';

// folhagem do mais claro (perto da sala) ao quase preto (longe)
const LEAF = ['#6fae55', '#4f8a45', '#356b3a', '#264d2b', '#183320', '#0f2016'];
const BARK = '#3a2c22', ROCK = '#4f554c', ROCKD = '#353a33', MOSS = '#5d8a48';

// moita voxel: base larga + blocos menores por cima, escurecendo para fora (unidade = voxel)
export function clump(rnd, size, tone) {
  const parts = [], s = size, c0 = LEAF[Math.min(5, tone)], c1 = LEAF[Math.min(5, tone + 1)], cl = LEAF[Math.max(0, tone - 1)];
  parts.push([-s / 2, 0, -s / 2, s, s * 0.45, s, c1]);
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const w = s * (0.35 + rnd() * 0.35), x = (rnd() - 0.5) * (s - w), z = (rnd() - 0.5) * (s - w);
    parts.push([x - w / 2, s * 0.35, z - w / 2, w, s * (0.3 + rnd() * 0.45), w, rnd() > 0.5 ? c0 : c1]);
  }
  const tw = s * 0.4;
  parts.push([-tw / 2 + (rnd() - 0.5) * s * 0.2, s * 0.6, -tw / 2, tw, s * 0.25, tw, cl]);   // topo mais claro
  return { parts };
}
export function rock(rnd, s) {
  return { parts: [[-s / 2, 0, -s / 2, s, s * 0.5, s * 0.8, ROCK], [-s * 0.3, s * 0.5, -s * 0.3, s * 0.6, s * 0.25, s * 0.5, ROCKD], [-s * 0.45, s * 0.5, -s * 0.35, s * 0.5, 0.6, s * 0.6, MOSS]] };
}
function trunk(rnd, h) {
  const t = 2.4 + rnd() * 1.2;
  return { parts: [[-t / 2, 0, -t / 2, t, h, t, BARK], [-t * 1.6, h, -t * 1.6, t * 3.2, h * 0.25, t * 3.2, LEAF[3]], [-t * 1.1, h * 1.2, -t * 1.1, t * 2.2, h * 0.2, t * 2.2, LEAF[2]]] };
}
// restos da cidade: poste caído, caixa de cabos, placa apagada
const DEBRIS = [
  () => ({ parts: [[-0.6, 0, -5, 1.2, 1.2, 10, '#3a4252'], [-1, 1.2, 3.6, 2, 0.8, 1.2, '#22242b'], [-0.3, 1.25, 4.6, 0.6, 0.4, 0.3, 'glowC']] }),
  () => ({ parts: [[-2.2, 0, -1.6, 4.4, 3.2, 3.2, '#3a4252'], [-2.3, 3.2, -1.7, 4.6, 0.4, 3.4, '#22242b'], [-1.6, 1.2, 1.62, 1.2, 0.5, 0.1, 'glowA'], [0.4, 1.2, 1.62, 1.2, 0.5, 0.1, '#2a2e36']] }),
  () => ({ parts: [[-0.3, 0, -0.3, 0.6, 7, 0.6, '#3a4252'], [-3, 5, -0.25, 6, 3, 0.5, '#22242b'], [-2.6, 5.4, 0.27, 5.2, 2.2, 0.1, '#3a2f4a'], [-2.2, 6.2, 0.38, 1.6, 0.5, 0.05, 'glowM']] }),
];

export function buildFloor(group, w, d, seed) {
  const cols = Math.ceil(w) + 4, rows = Math.ceil(d) + 4;
  const tiles = new T.InstancedMesh(new T.BoxGeometry(1, 0.2, 1), new T.MeshToonMaterial({ color: '#ffffff' }), cols * rows);
  const m = new T.Matrix4(), c = new T.Color();
  const moss = new T.Color('#46603f'), grass = new T.Color('#53703f'), dirt = new T.Color('#57513f'), dark = new T.Color('#1d2a1f');
  let i = 0;
  for (let x = 0; x < cols; x++) for (let z = 0; z < rows; z++) {
    const px = -w / 2 - 2 + x + 0.5, pz = -d / 2 - 2 + z + 0.5;
    m.makeTranslation(px, -0.1, pz); tiles.setMatrixAt(i, m);
    const lf = (Math.sin(px * 0.55 + seed) + Math.cos(pz * 0.7 - seed * 2) + Math.sin((px + pz) * 0.3)) / 3;
    c.copy(moss).lerp(lf > 0.25 ? dirt : grass, Math.min(1, Math.abs(lf) * 1.4)).lerp(moss, hash(x, z) * 0.3);
    // palco: centro claro, bordas escurecendo
    const ex = Math.abs(px) / (w / 2), ez = Math.abs(pz) / (d / 2), e = Math.max(ex, ez);
    c.lerp(dark, T.MathUtils.smoothstep(e, 0.62, 1.15) * 0.75);
    tiles.setColorAt(i++, c);
  }
  group.add(tiles);
  const outer = new T.Mesh(new T.PlaneGeometry(w + 60, d + 60), new T.MeshBasicMaterial({ color: '#0d150f' }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.21; group.add(outer);
}

// detalhes baixos no chão: tufos, flores, pedrinhas e fissuras violeta da Fenda (sem colisão)
export function buildFloorDetail(batch, w, d, rnd) {
  const tuft = { parts: [[-0.6, 0, -0.2, 0.3, 1.4, 0.3, MOSS], [0, 0, 0.1, 0.3, 1.8, 0.3, '#7fb85e'], [0.4, 0, -0.3, 0.3, 1.1, 0.3, MOSS]] };
  const flower = c => ({ parts: [[-0.1, 0, -0.1, 0.2, 1.2, 0.2, MOSS], [-0.35, 1.2, -0.35, 0.7, 0.4, 0.7, c]] });
  const pebble = { parts: [[-0.5, 0, -0.4, 1, 0.4, 0.8, ROCK], [0.6, 0, 0.3, 0.6, 0.3, 0.5, ROCKD]] };
  const crack = { parts: [[-2.5, 0, -0.12, 2.6, 0.06, 0.24, 'glowV'], [0, 0, -0.1, 1.8, 0.06, 0.2, 'glowV'], [1.6, 0, 0.05, 1.2, 0.06, 0.18, 'glowV']] };
  for (let k = 0; k < Math.round(w * d * 0.16); k++) {
    const x = (rnd() - 0.5) * w, z = (rnd() - 0.5) * d, r = rnd();
    const def = r < 0.55 ? tuft : r < 0.72 ? flower(rnd() > 0.5 ? '#e8d27a' : '#c9a6e8') : r < 0.92 ? pebble : crack;
    batch.add({ ...def, scale: def === pebble || def === crack ? 1 : 1.9 }, x, z, rnd() * 6);
  }
}

// bordas: 3 anéis de folhagem (claro → escuro), rochas e restos da cidade; deixa vãos para portas e entrada
export function buildBorders(batch, w, d, rnd, gap) {
  const ring = (inset, tone, size, step, extra) => {
    const along = (len, fn) => { for (let t = -len / 2 - inset; t <= len / 2 + inset; t += step * (0.75 + rnd() * 0.5)) fn(t); };
    along(w, x => { const z = -d / 2 - inset - rnd() * 0.4; if (!gap(x, z)) batch.add(pickTop(x, z), x, z, rnd() * 6); });
    along(d, z => {
      for (const sx of [-1, 1]) { const x = sx * (w / 2 + inset + rnd() * 0.4); if (!gap(x, z)) batch.add(pickTop(x, z), x, z, rnd() * 6); }
    });
    function pickTop() {
      const r = rnd();
      if (extra && r < 0.12) return { ...DEBRIS[Math.floor(rnd() * DEBRIS.length)](), scale: 1 };
      if (extra && r < 0.24) return { ...rock(rnd, 5 + rnd() * 4), scale: 1 };
      return { ...clump(rnd, size * (0.8 + rnd() * 0.5), tone), scale: 1 };
    }
  };
  ring(0.55, 1, 11, 1.0, true);     // perto da sala: verde médio, com rochas e destroços
  ring(1.6, 2, 15, 1.3, false);
  ring(2.9, 4, 20, 1.6, false);
  ring(4.4, 5, 26, 2.0, false);     // quase preto: mata fechada
  // borda de baixo: baixa e escura, não cobre a sala
  for (let x = -w / 2 - 2; x <= w / 2 + 2; x += 0.9 + rnd() * 0.5) {
    const z = d / 2 + 0.7 + rnd() * 0.3;
    if (!gap(x, z)) batch.add({ ...clump(rnd, 7 + rnd() * 3, 3), scale: 1 }, x, z, rnd() * 6);
  }
}

// fundo além da parede de cima: troncos altos e ruínas de Kanda-9 tomadas pela mata, brilho da Fenda
export function buildBackdrop(w, d, rnd) {
  const g = new T.Group(), batch = new StaticBatch('iluminura');
  for (let x = -w / 2 - 8; x <= w / 2 + 8; x += 1.6 + rnd() * 1.6) {
    const z = -d / 2 - 6.5 - rnd() * 3;
    if (rnd() < 0.35) {   // prédio em ruína: bloco escuro, janelas apagadas e algumas acesas, trepadeiras
      const bw = 18 + rnd() * 16, bh = 30 + rnd() * 40, parts = [[-bw / 2, 0, -6, bw, bh, 12, '#1c2422']];
      for (let k = 0; k < 6; k++) parts.push([-bw / 2 + 2 + rnd() * (bw - 6), 6 + rnd() * (bh - 12), 6.05, 3, 2, 0.1, rnd() < 0.25 ? (rnd() < 0.5 ? 'glowC' : 'glowM') : '#141a19']);
      parts.push([-bw / 2 - 0.5, bh - 4, -6.5, bw + 1, 6, 13, LEAF[4]], [-bw / 2 - 0.5, 0, 5.9, 4, bh * 0.7, 0.6, LEAF[3]]);
      batch.add({ parts, scale: 1 }, x, z, (rnd() - 0.5) * 0.3);
    } else batch.add({ ...trunk(rnd, 35 + rnd() * 30), scale: 1 }, x, z, rnd() * 6);
  }
  batch.build(g);
  // brilho violeta da Fenda no horizonte
  const glow = new T.Mesh(new T.PlaneGeometry(w + 40, 9), new T.MeshBasicMaterial({ color: '#b77bff', transparent: true, opacity: 0.16, depthWrite: false }));
  glow.position.set(0, 4, -d / 2 - 11); g.add(glow);
  return g;
}

// primeiro plano: silhuetas escuras de folhas presas à faixa de baixo da tela.
// O grupo acompanha a câmera em z (fica sempre embaixo) e se desloca mais que a sala em x (parallax).
export const FRONT_Z = 5.4;   // distância à frente do centro da câmera que cai na borda de baixo da tela
export function buildForeground(w, d, rnd) {
  const g = new T.Group(), m = new T.MeshBasicMaterial({ color: '#06100a', transparent: true, opacity: 0.92 });
  const box = new T.BoxGeometry(1, 1, 1);
  for (let x = -w / 2 - 10; x <= w / 2 + 10; x += 1.6 + rnd() * 2.6) {
    if (rnd() < 0.3) continue;
    const q = new T.Group(), s = 1.2 + rnd() * 1.6;
    for (let k = 0; k < 3 + Math.floor(rnd() * 3); k++) {
      const b = new T.Mesh(box, m), l = s * (0.6 + rnd() * 0.7);
      b.scale.set(l * 0.32, 0.06, l); b.position.set((rnd() - 0.5) * s * 0.8, k * 0.03, 0);
      b.rotation.set(0, (rnd() - 0.5) * 1.4 + Math.PI / 2 * (rnd() > 0.5 ? 1 : 0), 0); q.add(b);
    }
    q.position.set(x, 1.0, FRONT_Z + rnd() * 0.5); q.rotation.x = -0.5;
    g.add(q);
  }
  return g;
}

// esporos e faíscas flutuando devagar sobre a sala
export class Spores {
  constructor(group, w, d, count) {
    this.n = count; this.w = w; this.d = d;
    this.mesh = new T.InstancedMesh(new T.BoxGeometry(0.05, 0.05, 0.05), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), count);
    this.p = []; const c = new T.Color();
    for (let i = 0; i < count; i++) {
      this.p.push({ x: (Math.random() - 0.5) * w, y: 0.3 + Math.random() * 2.4, z: (Math.random() - 0.5) * d, ph: Math.random() * 6, sp: 0.15 + Math.random() * 0.2 });
      this.mesh.setColorAt(i, c.set(Math.random() < 0.3 ? '#c9a6ff' : '#d8f0a8'));
    }
    this.m = new T.Matrix4(); group.add(this.mesh);
  }
  update(dt, t) {
    for (let i = 0; i < this.n; i++) {
      const p = this.p[i];
      p.y += p.sp * dt; if (p.y > 3) p.y = 0.2;
      this.m.makeTranslation(p.x + Math.sin(t * 0.6 + p.ph) * 0.4, p.y, p.z + Math.cos(t * 0.5 + p.ph) * 0.3);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
