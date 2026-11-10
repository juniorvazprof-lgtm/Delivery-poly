// Desenho em lote: cada tipo de modelo voxel vira poucas InstancedMesh (uma por material).
// Assim centenas de inimigos custam algumas dezenas de chamadas de desenho.
import * as T from '../lib/three.js';
import { buildModel, inkMat } from '../engine/voxel.js';

const BOX = new T.BoxGeometry(1, 1, 1);
const BP = BOX.attributes.position.array, BN = BOX.attributes.normal.array, BI = BOX.index.array;
const _v = new T.Vector3(), _nm = new T.Matrix3();

function mergeBoxes(matrices) {
  const nv = BP.length / 3, pos = new Float32Array(matrices.length * BP.length), nor = new Float32Array(pos.length);
  const idx = new Uint32Array(matrices.length * BI.length);
  matrices.forEach((m, k) => {
    _nm.getNormalMatrix(m);
    for (let i = 0; i < nv; i++) {
      _v.fromArray(BP, i * 3).applyMatrix4(m).toArray(pos, (k * nv + i) * 3);
      _v.fromArray(BN, i * 3).applyMatrix3(_nm).normalize().toArray(nor, (k * nv + i) * 3);
    }
    for (let i = 0; i < BI.length; i++) idx[k * BI.length + i] = BI[i] + k * nv;
  });
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.BufferAttribute(nor, 3));
  g.setIndex(new T.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

// Um modelo voxel desenhado N vezes. tint escurece as cores comuns (versão sombria); brilhos ficam intactos.
export class ModelBatch {
  constructor(scene, def, scale, max, tint = 1) {
    const g = buildModel(def), S = new T.Matrix4().makeScale(scale * (def.scale || 1), scale * (def.scale || 1), scale * (def.scale || 1));
    const buckets = new Map();
    const push = (mat, m) => { if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(S.clone().multiply(m)); };
    for (const part of g.children) {
      if (!part.isMesh) continue;
      part.updateMatrix(); push(part.material, part.matrix.clone());
      for (const ch of part.children) if (ch.isMesh) { ch.updateMatrix(); push(ch.material, part.matrix.clone().multiply(ch.matrix)); }
    }
    this.max = max; this.meshes = [];
    for (const [mat, list] of buckets) {
      const im = new T.InstancedMesh(mergeBoxes(list), mat, max);
      im.frustumCulled = false; im.count = 0;
      const ink = mat === inkMat, glow = mat.isMeshBasicMaterial && !ink;
      if (!ink) { im.instanceColor = new T.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3); }
      im.userData.base = glow || ink ? 1 : tint;
      scene.add(im); this.meshes.push(im);
    }
    this.m = new T.Matrix4(); this.q = new T.Quaternion(); this.p = new T.Vector3(); this.s = new T.Vector3(); this.e = new T.Euler();
    this.n = 0;
  }
  begin() { this.n = 0; }
  // flash > 0 deixa o inimigo branco por um instante; lift sobe o modelo (flutuar, saltar)
  add(x, y, z, ry, sc = 1, flash = 0, squash = 1, tintMul = 1) {
    if (this.n >= this.max) return;
    this.e.set(0, ry, 0); this.q.setFromEuler(this.e); this.p.set(x, y, z); this.s.set(sc, sc * squash, sc);
    this.m.compose(this.p, this.q, this.s);
    const i = this.n++;
    for (const im of this.meshes) {
      im.setMatrixAt(i, this.m);
      if (im.instanceColor) { const v = flash > 0 ? 3 : im.userData.base * tintMul; im.instanceColor.setXYZ(i, v, v, v); }
    }
  }
  end() {
    for (const im of this.meshes) { im.count = this.n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }
  dispose(scene) { for (const im of this.meshes) { scene.remove(im); im.geometry.dispose(); im.dispose(); } }
}

// Cubos coloridos instanciados (cristais, projéteis, partículas, manchas no chão).
export class CubePool {
  constructor(scene, max, { basic = true, size = [1, 1, 1], opacity = 1, depthWrite = true } = {}) {
    const geo = new T.BoxGeometry(...size);
    const material = basic ? new T.MeshBasicMaterial({ color: '#fff', transparent: opacity < 1, opacity, depthWrite }) : new T.MeshToonMaterial({ color: '#fff' });
    this.im = new T.InstancedMesh(geo, material, max); this.im.frustumCulled = false; this.im.count = 0;
    this.im.instanceColor = new T.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    scene.add(this.im);
    this.max = max; this.n = 0; this.m = new T.Matrix4(); this.q = new T.Quaternion(); this.e = new T.Euler(); this.p = new T.Vector3(); this.s = new T.Vector3(); this.c = new T.Color();
  }
  begin() { this.n = 0; }
  add(x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) {
    if (this.n >= this.max) return;
    this.e.set(rx, ry, rz); this.q.setFromEuler(this.e); this.p.set(x, y, z); this.s.set(sx, sy, sz);
    this.m.compose(this.p, this.q, this.s);
    this.im.setMatrixAt(this.n, this.m);
    if (typeof color === 'string') this.c.set(color); else this.c.copy(color);
    this.im.instanceColor.setXYZ(this.n, this.c.r, this.c.g, this.c.b);
    this.n++;
  }
  end() { this.im.count = this.n; this.im.instanceMatrix.needsUpdate = true; this.im.instanceColor.needsUpdate = true; }
}

// Brilhos (sprites suaves com mistura aditiva) desenhados em resolução normal, sempre virados para a câmera.
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
export class GlowPool {
  constructor(scene, max) {
    const material = new T.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false });
    this.im = new T.InstancedMesh(new T.PlaneGeometry(1, 1), material, max); this.im.frustumCulled = false; this.im.count = 0; this.im.renderOrder = 10;
    this.im.instanceColor = new T.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    scene.add(this.im);
    this.max = max; this.n = 0; this.m = new T.Matrix4(); this.p = new T.Vector3(); this.s = new T.Vector3(); this.c = new T.Color(); this.q = new T.Quaternion();
  }
  begin(cam) { this.n = 0; this.q.copy(cam.quaternion); }
  // intensidade 0..n escurece a cor (na mistura aditiva, mais escuro = mais transparente)
  add(x, y, z, size, color, k = 1) {
    if (this.n >= this.max || k <= 0.01) return;
    this.p.set(x, y, z); this.s.set(size, size, size); this.m.compose(this.p, this.q, this.s);
    this.im.setMatrixAt(this.n, this.m);
    if (typeof color === 'string') this.c.set(color); else this.c.copy(color);
    this.im.instanceColor.setXYZ(this.n, this.c.r * k, this.c.g * k, this.c.b * k);
    this.n++;
  }
  end() { this.im.count = this.n; this.im.instanceMatrix.needsUpdate = true; this.im.instanceColor.needsUpdate = true; }
}
