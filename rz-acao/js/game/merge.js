// Junta as caixas estáticas de um modelo voxel em uma malha por material.
// Peças com tag (animadas pelo idle) e chamas ficam separadas. Reduz muito as chamadas de desenho no celular.
import * as T from '../lib/three.js';

const box = new T.BoxGeometry(1, 1, 1);
const BP = box.attributes.position.array, BN = box.attributes.normal.array, BI = box.index.array;
const v = new T.Vector3(), nm = new T.Matrix3();

function mergeBoxes(matrices) {
  const nv = BP.length / 3, pos = new Float32Array(matrices.length * BP.length), nor = new Float32Array(pos.length);
  const idx = new Uint32Array(matrices.length * BI.length);
  matrices.forEach((m, k) => {
    nm.getNormalMatrix(m);
    for (let i = 0; i < nv; i++) {
      v.fromArray(BP, i * 3).applyMatrix4(m).toArray(pos, (k * nv + i) * 3);
      v.fromArray(BN, i * 3).applyMatrix3(nm).normalize().toArray(nor, (k * nv + i) * 3);
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

// Retorna as malhas de cor (sem contorno) para o flash de dano.
export function mergeModel(g) {
  const buckets = new Map(), drop = [];
  const push = (mat, m) => { if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(m); };
  for (const part of g.children) {
    if (!part.isMesh || part.userData.tag || part.userData.c?.startsWith('flame')) continue;
    part.updateMatrix();
    push(part.material, part.matrix.clone());
    for (const ch of part.children) if (ch.isMesh) { ch.updateMatrix(); push(ch.material, part.matrix.clone().multiply(ch.matrix)); }
    drop.push(part);
  }
  drop.forEach(p => g.remove(p));
  const colorMeshes = [];
  for (const [mat, list] of buckets) {
    const mesh = new T.Mesh(mergeBoxes(list), mat);
    mesh.userData.baseMat = mat;
    if (mat.side !== T.BackSide) colorMeshes.push(mesh);   // contorno usa BackSide
    g.add(mesh);
  }
  // peças animadas também piscam
  g.traverse(o => { if (o.isMesh && o.userData.c && o.material.side !== T.BackSide) { o.userData.baseMat = o.material; colorMeshes.push(o); } });
  return colorMeshes;
}

const flashMat = new T.MeshBasicMaterial({ color: '#fff4e8' });
export function setFlash(meshes, on) {
  for (const m of meshes) m.material = on ? flashMat : m.userData.baseMat;
}
