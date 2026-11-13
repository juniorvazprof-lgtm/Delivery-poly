// Monta modelos voxel a partir das listas de caixas em data/models.js.
import * as T from '../lib/three.js';
import { COLORS } from '../data/models.js';

export const VOX = 0.1;
export const geo = new T.BoxGeometry(1, 1, 1);

// ---------- estilos visuais ----------
// iluminura: sombra em 3 tons + contorno de tinta (áreas abertas)
// combinado: iluminura + brilho (bloom) no fogo, na Praga e no sagrado (masmorras, castelos)
const INK = 0.035;                                   // espessura do contorno
const isGlow = c => /^(glow|flame)/.test(c);
const isHoly = c => c === 'gold' || c === 'bronze';
const hex = c => COLORS[c] || c;
const gradient = (() => {
  const t = new T.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, T.RedFormat);
  t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t;
})();
const vivid = c => { const col = new T.Color(hex(c)), h = {}; col.getHSL(h); return col.setHSL(h.h, Math.min(1, h.s * 1.3), h.l); };

const mats = {};
export function mat(c, style = 'iluminura') {
  const k = style + c;
  if (mats[k]) return mats[k];
  const lit = style === 'combinado';
  let m;
  if (isGlow(c)) m = new T.MeshBasicMaterial({ color: new T.Color(hex(c)).multiplyScalar(lit ? 1.35 : 1) });   // >1 brilha no bloom
  else if (lit && isHoly(c)) m = new T.MeshToonMaterial({ color: vivid(c), gradientMap: gradient, emissive: hex(c), emissiveIntensity: 0.45 });
  else m = new T.MeshToonMaterial({ color: vivid(c), gradientMap: gradient });
  return (mats[k] = m);
}
export const inkMat = new T.MeshBasicMaterial({ color: '#07080d', side: T.BackSide });   // casco invertido = contorno

// matriz de uma peça (sem o grupo) e a do seu contorno
const _m = new T.Matrix4();
function partMatrix(x, y, z, w, h, d, ink = 0) {
  return _m.clone().makeScale(w * VOX + ink * 2, h * VOX + ink * 2, d * VOX + ink * 2)
    .setPosition((x + w / 2) * VOX, (y + h / 2) * VOX, (z + d / 2) * VOX);
}

export function buildModel(def, style = 'iluminura') {
  const g = new T.Group();
  g.userData.flames = [];
  g.userData.idle = def.idle || 'bob';
  g.userData.tagged = [];
  for (const [x, y, z, w, h, d, c, tag] of def.parts) {
    const me = new T.Mesh(geo, mat(c, style));
    me.userData.c = c;
    me.scale.set(w * VOX, h * VOX, d * VOX);
    me.position.set((x + w / 2) * VOX, (y + h / 2) * VOX, (z + d / 2) * VOX);
    if (!isGlow(c)) {
      const ink = new T.Mesh(geo, inkMat);
      ink.scale.set(1 + 2 * INK / (w * VOX), 1 + 2 * INK / (h * VOX), 1 + 2 * INK / (d * VOX));
      me.add(ink);
    }
    if (c.startsWith('flame')) { me.userData.h = me.scale.y; g.userData.flames.push(me); }
    if (tag) { me.userData.tag = tag; me.userData.base = me.position.clone(); me.userData.bs = me.scale.clone(); g.userData.tagged.push(me); }
    g.add(me);
  }
  g.scale.setScalar(def.scale || 1);
  g.userData.baseScale = def.scale || 1;
  return g;
}

// troca o estilo de um modelo já montado (ex.: jogador que passa de área aberta para masmorra)
export function restyle(g, style) {
  g.traverse(o => { if (o.userData.c) o.material = mat(o.userData.c, style); });
}

// Lote de cenário estático: todas as peças de todos os objetos viram um InstancedMesh por cor,
// mais um só para os contornos. Poucas chamadas de desenho mesmo com centenas de palmeiras e pedras.
export class StaticBatch {
  constructor(style) { this.style = style; this.byColor = {}; this.ink = []; }
  add(def, x, z, ry = 0) {
    const root = new T.Matrix4().compose(new T.Vector3(x, 0, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ry), new T.Vector3().setScalar(def.scale || 1));
    for (const [px, py, pz, w, h, d, c] of def.parts) {
      (this.byColor[c] ||= []).push(root.clone().multiply(partMatrix(px, py, pz, w, h, d)));
      if (!isGlow(c)) this.ink.push(root.clone().multiply(partMatrix(px, py, pz, w, h, d, INK)));
    }
  }
  build(scene) {
    const mk = (list, material) => {
      if (!list.length) return;
      const im = new T.InstancedMesh(geo, material, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.frustumCulled = false;
      scene.add(im);
    };
    for (const [c, list] of Object.entries(this.byColor)) mk(list, mat(c, this.style));
    mk(this.ink, inkMat);
  }
}

const shGeo = new T.CircleGeometry(1, 20);
const shMat = new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false });
export function blobShadow(r = 0.42) {
  const s = new T.Mesh(shGeo, shMat);
  s.rotation.x = -Math.PI / 2; s.position.y = 0.02; s.scale.setScalar(r);
  return s;
}

// número pseudoaleatório estável por posição (variação de cor do chão etc.)
export function hash(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
