// Carrega os modelos GLB do Blender e os modelos de reserva feitos com primitivas.
// (módulo 5/20 da Capivara Explora)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pick, rand } from '../core/config.js';
import { scene } from '../engine/scene.js';
import { heightAt } from './terrain.js';

// --- Modelos GLB gerados no Blender (tools/blender_gen) ---
// Carregados uma vez; cada objeto do mundo recebe um clone. Se um arquivo faltar,
// usa o modelo procedural equivalente (função de fallback).
const MODEL_NAMES = ['capivara', 'arvore', 'arvore_frutas', 'arbusto_amoras', 'capim_alto', 'arbusto_espinhos', 'arbusto_bagas_brancas',
  'cogumelo_vermelho', 'cogumelo_marrom', 'pedra', 'caverna', 'flores', 'fonte', 'abrigo', 'passaro', 'melancia', 'bola', 'caixa', 'jacare',
  'pinha', 'formigueiro', 'tronco_musgo', 'caramujo', 'ninho', 'teia', 'trevo', 'grama_seca', 'grama_baixa', 'coco', 'computador', 'gopro', 'taboa', 'cacto', 'samambaia', 'pedra_brilhante'];
const MODELS = {};
// Modelos animados mantêm as peças; os outros têm as peças fundidas, uma malha por cor
// (cada objeto vira 2-5 chamadas de desenho em vez de dezenas: essencial com ~300 objetos no celular)
const KEEP_PARTS = ['capivara', 'passaro', 'jacare'];
function bake(root, matCache) {
  root.updateMatrixWorld(true);
  const groups = {};
  root.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (g.index) g = g.toNonIndexed();
    (groups[o.material.color.getHex()] ||= []).push(g);
  });
  const out = new THREE.Group();
  for (const hex in groups) {
    const m = new THREE.Mesh(mergeGeometries(groups[hex]), matCache[hex] || (matCache[hex] = new THREE.MeshLambertMaterial({ color: +hex, flatShading: true })));
    m.castShadow = true; out.add(m);
  }
  return out;
}
{
  const loader = new GLTFLoader(), matCache = {};
  await Promise.all(MODEL_NAMES.map(n => loader.loadAsync(`models/${n}.glb`).then(g => {
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      // troca o material PBR por Lambert flat (mais leve no celular, mesmo visual low poly)
      const hex = o.material.color.getHex();
      o.material = matCache[hex] || (matCache[hex] = new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
      o.castShadow = true;
    });
    MODELS[n] = KEEP_PARTS.includes(n) ? g.scene : bake(g.scene, matCache);
  }).catch(e => console.warn('modelo ausente:', n, e.message))));
}
const model = (name, fallback, scale = 1) => {
  const g = MODELS[name] ? MODELS[name].clone(true) : fallback();
  if (MODELS[name] && scale !== 1) g.scale.setScalar(scale);
  return g;
};

// --- Helpers de modelagem low poly ---
const M = col => new THREE.MeshLambertMaterial({ color: col, flatShading: true });
function mesh(geo, col, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, typeof col === 'number' ? M(col) : col);
  m.position.set(x, y, z); m.castShadow = shadow; return m;
}
function placeAt(obj, x, z) { obj.position.set(x, heightAt(x, z), z); scene.add(obj); return obj; }

function makeTree(fruits) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.6, 6), 0x8a5a3b, 0, 0.8, 0));
  const leaf = mesh(new THREE.IcosahedronGeometry(1.5, 0), fruits ? 0x3fae5a : 0x4c9a45, 0, 2.4, 0);
  leaf.scale.y = 0.85; g.add(leaf);
  g.add(mesh(new THREE.IcosahedronGeometry(1, 0), fruits ? 0x56c26b : 0x5fae4f, 0.5, 3.1, 0.2));
  if (fruits) {
    const fg = new THREE.SphereGeometry(0.14, 6, 4), fm = M(0xff2d4b);
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, r = 1.35, yy = 2 + Math.sin(i * 1.7) * 0.7;
      g.add(mesh(fg, fm, Math.cos(a) * r, yy, Math.sin(a) * r, false));
    }
  }
  return g;
}
function makeMushroom(red) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.4, 6), 0xf3ead2, 0, 0.2, 0));
  const cap = mesh(new THREE.SphereGeometry(0.32, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), red ? 0xe8262f : 0x9a6a3e, 0, 0.38, 0);
  g.add(cap);
  if (red) for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    g.add(mesh(new THREE.SphereGeometry(0.05, 4, 3), 0xffffff, Math.cos(a) * 0.2, 0.6, Math.sin(a) * 0.2, false));
  }
  g.scale.setScalar(1.3);
  return g;
}
function makeFlowers() {
  const g = new THREE.Group(), cols = [0xff6fb1, 0xffe14d, 0xa77bff, 0xff8a3d, 0x6fd6ff];
  for (let i = 0; i < 9; i++) {
    const x = rand(-0.9, 0.9), z = rand(-0.9, 0.9);
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 3), 0x3f8f3a, x, 0.2, z, false));
    g.add(mesh(new THREE.IcosahedronGeometry(0.12, 0), pick(cols), x, 0.42, z, false));
  }
  return g;
}
function makeRock() {
  const g = new THREE.Group();
  const r = mesh(new THREE.DodecahedronGeometry(1.3, 0), 0x9a9aa6, 0, 0.6, 0);
  r.scale.set(1.2, 0.75, 1); g.add(r);
  return g;
}
function makeCave() {
  const g = new THREE.Group();
  const d = mesh(new THREE.DodecahedronGeometry(3, 0), 0x6e6a73, 0, 0.8, 0);
  d.scale.set(1.2, 0.9, 1.1); g.add(d);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.25, 10, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x0b0a10 }));
  hole.position.set(3.25, 0.05, 0); hole.rotation.y = Math.PI / 2; g.add(hole);
  return g;
}
function makeBird() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.22, 6, 4), 0x2f7dff, 0, 0, 0));
  g.add(mesh(new THREE.ConeGeometry(0.06, 0.18, 4), 0xffb02e, 0, 0, 0.26).rotateX(Math.PI / 2));
  const w1 = mesh(new THREE.BoxGeometry(0.5, 0.04, 0.22), 0x1e5fd0, 0.3, 0, 0);
  const w2 = mesh(new THREE.BoxGeometry(0.5, 0.04, 0.22), 0x1e5fd0, -0.3, 0, 0);
  g.add(w1, w2); g.userData.wings = [w1, w2];
  return g;
}
function makeWatermelon() {
  const g = new THREE.Group();
  const m = mesh(new THREE.IcosahedronGeometry(0.45, 1), 0x2e9a3c, 0, 0.4, 0); m.scale.set(1.3, 0.9, 1); g.add(m);
  for (let i = -1; i <= 1; i++) { const s = mesh(new THREE.TorusGeometry(0.42, 0.03, 3, 12), 0x16602a, 0, 0.4, i * 0.18, false); s.scale.set(1.3, 0.95, 1); g.add(s); }
  return g;
}
function makeBall() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.IcosahedronGeometry(0.35, 1), 0xff4f8b, 0, 0.35, 0));
  g.add(mesh(new THREE.TorusGeometry(0.36, 0.05, 3, 12), 0xfff35c, 0, 0.35, 0, false));
  return g;
}
function makeBox() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), 0xa45cff, 0, 0.35, 0));
  g.add(mesh(new THREE.BoxGeometry(0.74, 0.74, 0.14), 0xffd35c, 0, 0.35, 0, false));
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.74, 0.74), 0xffd35c, 0, 0.35, 0, false));
  g.add(mesh(new THREE.TorusGeometry(0.12, 0.04, 3, 8), 0xffd35c, 0, 0.78, 0, false));
  return g;
}

export { M, MODELS, makeBall, makeBird, makeBox, makeCave, makeFlowers, makeMushroom, makeRock, makeTree, makeWatermelon, mesh, model, placeAt };
