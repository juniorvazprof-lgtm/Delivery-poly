// =====================================================================
//  CAPIVARA EXPLORA
//  Uma capivara controlada por IA explora um mundo 3D low poly,
//  aprende com as consequências e mostra o que está pensando.
//
//  Estrutura do arquivo:
//   1. Configuração e persistência
//   2. Mundo 3D (terreno, água, céu, chuva, objetos)
//   3. Capivara (modelo, animações, movimento com A*)
//   4. Efeitos ocultos (só o código conhece)
//   5. Cérebro (DeepSeek / Gemini / offline) e LOOP DE IA
//   6. Interface (balão, emoji, painel, botões)
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------
// 1. CONFIGURAÇÃO E PERSISTÊNCIA
// ---------------------------------------------------------------------
const DAY_LEN = 240;            // 1 dia = 4 minutos (segundos de jogo)
const HALF = 60;                // mundo 120x120 m, de -60 a 60 (gerado por semente)
const LIM = HALF - 4;           // área útil (borda de segurança)
const PERCEPTION_RADIUS = 15;
const MIN_CALL_INTERVAL = 4000; // ms entre chamadas à IA
const CALL_TIMEOUT = 10000;     // ms
const SAVE_KEY = 'capivara_explora_v1';
const CFG_KEY = 'capivara_explora_cfg';
const ACOES = ['ir_para', 'comer', 'beber', 'nadar', 'dormir', 'cheirar', 'sentar', 'investigar', 'fugir', 'vagar', 'necessidades', 'pegar', 'fotografar', 'pesquisar'];

// Cérebros: 'deepseek' (padrão), 'gemini' ou 'offline'. Cada provedor tem sua chave e modelo.
const cfg = Object.assign({ mode: 'deepseek', keys: { deepseek: '', gemini: '' },
  models: { deepseek: 'deepseek-flash', gemini: 'gemini-2.5-flash' } }, safeJSON(lsGet(CFG_KEY)) || {});
const PROVIDERS = { deepseek: 'DeepSeek', gemini: 'Gemini' };
const hasBrain = () => cfg.mode !== 'offline' && !!cfg.keys[cfg.mode];

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }

const defaultState = () => ({
  stats: { fome: 30, sede: 30, energia: 80, humor: 70 },
  day: 1, clock: 0.29,            // 0 = meia-noite, 0.5 = meio-dia
  aprendizados: [],               // memória de longo prazo (texto)
  descobertas: [],                // chaves "acao:tipo" ou "ver:tipo"
  log: [],
});
const state = Object.assign(defaultState(), safeJSON(lsGet(SAVE_KEY)) || {});
state.stats.frio ??= 10;       // temperatura: 0 = confortável, 100 = congelando
state.mapa ||= {};             // mapa mental: id → {t, x, z} de lugares já vistos
state.crencas ||= {};          // confiança: "acao:tipo" → {bom, ruim}
state.diario ||= [];           // diário escrito ao anoitecer
state.diaryDay ||= 0;
state.stats.bexiga ??= 10;     // vontade de fazer cocô/xixi (0-100)
state.stats.tedio ??= 20;      // tédio: sobe ao repetir, desce ao explorar coisas novas
state.trilhas ||= {};
state.pesquisas ||= [];        // o que leu no computador: {q, titulo, resumo}
state.temCamera ||= false;     // pegou a GoPro?          // desgaste do chão: "i,j" → passagens
// gerador aleatório com semente fixa: os objetos espalhados ficam sempre no mesmo lugar (o mapa mental continua válido)
// mundo novo = semente nova; um save antigo (sem semente) era do mapa fixo, então o mapa mental e as trilhas são zerados
const nextSeed = +lsGet('capivara_explora_seed_next');
if (!state.seed) { state.seed = nextSeed || (Math.random() * 1e9) | 0; state.mapa = {}; state.trilhas = {}; }
try { localStorage.removeItem('capivara_explora_seed_next'); } catch {}
let seed = state.seed;
const srand = (a, b) => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return a + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (b - a); };
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, log: state.log.slice(-30) }));
  } catch {}
}
setInterval(save, 8000);

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function smooth(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

// ---------------------------------------------------------------------
// 2. MUNDO 3D
// ---------------------------------------------------------------------
const canvas = document.getElementById('c');
const stageEl = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fd8ff, 25, 62);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 150);
camera.layers.enable(1);

// Luzes: só 2 (hemisférica + sol com sombra pequena) para rodar bem no celular
const hemi = new THREE.HemisphereLight(0xfff1d6, 0x5a7a3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 1.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
scene.add(sun, sun.target);

// ---------------------------------------------------------------------
// MUNDO PROCEDURAL: relevo e umidade vêm de ruído com a semente do mundo.
// Biomas: campo (aberto), mata (úmida), brejo (perto da água), pedregal (alto e seco).
// ---------------------------------------------------------------------
let GROUND, GROUND_BASE;
const TSIZE = HALF * 2 + 8, TSEG = 104;
const PERM = new Uint8Array(512);
{ const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const k = Math.floor(srand(0, i + 1)); [p[i], p[k]] = [p[k], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const h = (i, j) => PERM[(PERM[i & 255] + (j & 255)) & 511] / 255;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
const fbm = (x, z) => (vnoise(x, z) * 0.5 + vnoise(x * 2.1, z * 2.1) * 0.27 + vnoise(x * 4.3, z * 4.3) * 0.15 + vnoise(x * 8.7, z * 8.7) * 0.08) / 1.0;
const elev = (x, z) => fbm(x * 0.022 + 3.1, z * 0.022 + 7.7);
const moist = (x, z) => fbm(x * 0.03 + 101.3, z * 0.03 + 57.9);

// lago principal (com o jacaré), entre 16 e 28 m do ponto de partida, com espaço para o riacho correr até a borda leste
const LAKE = { x: 18, z: -8, r: 7 };
for (let i = 0; i < 60; i++) {
  const a = srand(0, 6.28), d = srand(16, 28), x = Math.cos(a) * d, z = Math.sin(a) * d;
  if (x + LAKE.r + 14 < HALF && Math.abs(z) < HALF - 14) { LAKE.x = x; LAKE.z = z; break; }
}
const WATER_Y = -0.45;
const STREAM_Y = -0.62;
const streamZ = x => LAKE.z + Math.sin((x - LAKE.x) * 0.18) * 3;
const nearStream = (x, z) => x > LAKE.x + LAKE.r - 2 ? Math.abs(z - streamZ(x)) : 99;
// lagoas pequenas nas áreas úmidas
const PONDS = [];
for (let i = 0; i < 400 && PONDS.length < 4; i++) {
  const x = srand(-LIM + 6, LIM - 6), z = srand(-LIM + 6, LIM - 6), r = srand(2.6, 3.8);
  if (moist(x, z) < 0.5 || Math.hypot(x, z) < 16 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + r + 12 || nearStream(x, z) < 9) continue;
  if (PONDS.some(p => Math.hypot(p.x - x, p.z - z) < p.r + r + 14)) continue;
  PONDS.push({ x, z, r });
}
const WATERS = [LAKE, ...PONDS];
const waterDist = (x, z) => Math.min(...WATERS.map(w => Math.hypot(x - w.x, z - w.z) - w.r));
function biomeAt(x, z) {
  if (Math.hypot(x, z) < 11) return 'campo';               // clareira de partida
  const e = elev(x, z), m = moist(x, z);
  if ((waterDist(x, z) < 7 || nearStream(x, z) < 4) && m > 0.4) return 'brejo';
  if (e > 0.6) return 'pedregal';
  if (m > 0.53) return 'mata';
  return 'campo';
}
function heightAt(x, z) {
  let h = (elev(x, z) - 0.47) * 7 + 0.25 * Math.sin(x * 0.37 + z * 0.21);
  h = lerp(h, 0.2, smooth(13, 6, Math.hypot(x, z)));        // clareira de partida plana
  for (const w of WATERS) {
    const d = Math.hypot(x - w.x, z - w.z);
    h = lerp(h, 0.1, smooth(w.r + 10, w.r + 3, d));
    h = lerp(h, -1.4, smooth(w.r + 3, w.r - 1, d));
  }
  const ds = nearStream(x, z);
  if (ds < 8) { h = lerp(h, 0.1, smooth(7, 2.5, ds)); h = lerp(h, -0.9, smooth(2.2, 0.6, ds)); }
  return h;
}
const BIOME_COL = { campo: [0.26, 0.5, 0.44], mata: [0.31, 0.45, 0.31], brejo: [0.19, 0.32, 0.36], pedregal: [0.1, 0.16, 0.52] };
{
  const g = new THREE.PlaneGeometry(TSIZE, TSIZE, TSEG, TSEG);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = heightAt(x, z);
    p.setY(i, h);
    if (h < -0.35) c.set(0xe8d29a);                         // areia na beira da água
    else { const [hh, ss, ll] = BIOME_COL[biomeAt(x, z)]; c.setHSL(hh + Math.sin(x * 0.7 + z) * 0.015, ss, ll + srand(-0.03, 0.03)); }
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  ground.receiveShadow = true;
  scene.add(ground);
  GROUND = ground; GROUND_BASE = Float32Array.from(colors);
}
const waterMat = new THREE.MeshLambertMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.85 });
const waterMeshes = WATERS.map(w => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(w.r + 1.2, 28), waterMat);
  m.rotation.x = -Math.PI / 2; m.position.set(w.x, WATER_Y, w.z); scene.add(m); return m;
});
const lakeMesh = waterMeshes[0];
{ // riacho: fita de geometria acompanhando a curva, do lago até a borda leste
  const v = [], idx = [];
  let n = 0;
  for (let x = LAKE.x + LAKE.r - 1; x <= HALF + 4; x += 1) {
    const z = streamZ(x);
    v.push(x, STREAM_Y, z - 1.1, x, STREAM_Y, z + 1.1);
    if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })));
}

// --- Chuva (um único Points, barato) ---
const RAIN_N = 900;
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(RAIN_N * 3).map((_, i) =>
  i % 3 === 1 ? rand(0, 14) : rand(-15, 15)), 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xbfe4ff, size: 0.09, transparent: true, opacity: 0.7 }));
rain.visible = false;
scene.add(rain);

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

// --- Noite: estrelas e vaga-lumes (dois Points baratos) ---
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(
  Array.from({ length: 500 }, () => { const a = rand(0, 6.28), e = rand(0.15, 1.45), r = 90; return [Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r]; }).flat(), 3)),
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0, fog: false, depthWrite: false }));
scene.add(stars);
const FLY_N = 45;
const flies = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(
  Array.from({ length: FLY_N * 3 }, (_, i) => i % 3 === 1 ? rand(0.4, 2) : rand(-12, 12)), 3)),
  new THREE.PointsMaterial({ color: 0xfff27a, size: 0.16, transparent: true, opacity: 0, depthWrite: false }));
scene.add(flies);

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

// ---------------------------------------------------------------------
// 4. TIPOS DE OBJETO: descrição visual (a IA vê) + efeitos ocultos (só o código)
//    Cada efeito devolve { d: deltas de status, msg: resultado em texto, anim, extra }
// ---------------------------------------------------------------------
const TYPES = {
  arvore_frutas: {
    nome: 'árvore de frutinhas', desc: 'uma árvore baixa cheia de frutinhas vermelhas brilhantes',
    efeitos: {
      comer: () => Math.random() < 0.15
        ? { d: { fome: -10, humor: -12 }, msg: 'Você comeu frutinhas da árvore, mas estas ainda estavam verdes e ácidas. A barriga doeu um pouco.', anim: 'comer' }
        : { d: { fome: -30, humor: +10 }, msg: 'Você comeu as frutinhas vermelhas da árvore. Doces e suculentas! A fome diminuiu bastante.', anim: 'comer' },
      cheirar: () => ({ d: { humor: +3 }, msg: 'As frutinhas têm um cheiro doce e convidativo.', anim: 'cheirar' }),
    },
  },
  arvore: {
    nome: 'árvore alta', desc: 'uma árvore alta e frondosa, sem frutos',
    efeitos: {
      sentar: () => ({ d: { energia: +6, humor: +4 }, msg: 'Você sentou na sombra da árvore. Fresquinho.', anim: 'sentar' }),
      comer: () => ({ d: { humor: -5 }, msg: 'Você mordeu a casca da árvore. Gosto de madeira. Não matou a fome.', anim: 'comer' }),
    },
  },
  arbusto_amoras: {
    nome: 'arbusto de amoras', desc: 'um arbusto baixo e redondo com cachos de bolinhas roxo-escuras',
    efeitos: {
      comer: () => Math.random() < 0.15
        ? { d: { fome: -6, humor: -12 }, msg: 'Você comeu bolinhas roxas, mas estas estavam passadas e amargas. Ficou um gosto ruim na boca.', anim: 'comer' }
        : { d: { fome: -20, humor: +8 }, msg: 'Você comeu as bolinhas roxas do arbusto. Doces, com um fundo azedinho. A fome diminuiu.', anim: 'comer' },
      cheirar: () => ({ d: { humor: +2 }, msg: 'O arbusto tem um cheiro de fruta madura.', anim: 'cheirar' }),
    },
  },
  capim_alto: {
    nome: 'touceira de capim', desc: 'uma touceira de capim alto, verde-claro e macio',
    efeitos: {
      comer: () => ({ d: { fome: -15, humor: +5 }, msg: 'Você mastigou o capim alto devagar. Fresco e macio, parece feito para você.', anim: 'comer' }),
      sentar: () => ({ d: { energia: +5, humor: +3 }, msg: 'Você se acomodou no meio do capim. Ele faz cócegas na barriga.', anim: 'sentar' }),
    },
  },
  arbusto_espinhos: {
    nome: 'arbusto de folhas pontudas', desc: 'um arbusto de folhas pontudas com frutinhas amarelas no meio',
    efeitos: {
      comer: () => ({ d: { fome: -10, humor: -16 }, msg: 'Você tentou alcançar as frutinhas amarelas e as folhas pontudas furaram o focinho. Comeu pouco e doeu.', anim: 'tremer' }),
      cheirar: () => ({ d: { humor: -3 }, msg: 'Ao cheirar de perto, uma folha pontuda espetou o nariz.', anim: 'tremer' }),
    },
  },
  arbusto_bagas_brancas: {
    nome: 'arbusto de bagas brancas', desc: 'um arbusto delicado, verde-azulado, com bagas brancas peroladas',
    efeitos: {
      comer: () => ({ d: { fome: -8, energia: -20 }, msg: 'Você comeu as bagas brancas. Pouco tempo depois veio uma sonolência pesada, as pálpebras caindo.', anim: 'dormir' }),
      cheirar: () => ({ d: {}, msg: 'As bagas brancas quase não têm cheiro.', anim: 'cheirar' }),
    },
  },
  fonte: {
    nome: 'fonte de pedra', desc: 'uma pequena bacia de pedras com água limpa, alimentada por uma bica que escorre sem parar',
    efeitos: {
      beber: () => ({ d: { sede: -50, humor: +5 }, msg: 'Você bebeu da fonte. A água é limpa, fria e tem gosto de pedra.', anim: 'beber' }),
      cheirar: () => ({ d: { humor: +2 }, msg: 'A fonte cheira a musgo e água corrente.', anim: 'cheirar' }),
    },
  },
  abrigo: {
    nome: 'abrigo de galhos', desc: 'um abrigo simples de galhos e folhas largas, com um forro de folhas secas no chão',
    efeitos: {
      dormir: () => { const n = isNight(); return { d: { energia: n ? +70 : +40 }, msg: n ? 'Você dormiu no abrigo de galhos durante a noite. O forro de folhas é quente e o teto segura o sereno.' : 'Você cochilou no abrigo de galhos. Um descanso curto, mas bom.', anim: 'dormir' }; },
      sentar: () => ({ d: { energia: +8, humor: +4 }, msg: 'Você sentou sob o abrigo e ficou olhando o campo lá fora.', anim: 'sentar' }),
    },
  },
  // ---- gramas: comida fraca, cada uma com seu efeito ----
  grama_baixa: {
    nome: 'grama baixa', desc: 'um tapete de grama baixa e verde',
    efeitos: { comer: () => ({ d: { fome: -6 }, msg: 'Você pastou a grama baixa. Comida simples, mas sempre está por perto.', anim: 'comer' }) },
  },
  trevo: {
    nome: 'trevo', desc: 'uma moita baixa de folhinhas redondas, de três em três, com florzinhas brancas',
    efeitos: {
      comer: () => ({ d: { fome: -8, humor: +4 }, msg: 'Você comeu as folhinhas redondas. Macias e levemente adocicadas.', anim: 'comer' }),
      cheirar: () => ({ d: { humor: +2 }, msg: 'As florzinhas brancas têm um perfume suave de mel.', anim: 'cheirar' }),
    },
  },
  grama_seca: {
    nome: 'grama seca', desc: 'um tufo de grama seca e amarelada',
    efeitos: { comer: () => ({ d: { fome: -2, sede: +5 }, msg: 'Você mastigou a grama seca. Parece palha: quase não alimenta e dá sede.', anim: 'comer' }) },
  },
  // ---- coisas que não se comem: só cheirar, investigar ou sentar ----
  pinha: {
    nome: 'pinha', desc: 'uma coisa marrom, dura e cheia de escamas, caída no chão',
    efeitos: {
      comer: () => ({ d: { humor: -4 }, msg: 'Você tentou morder. Duro como pedra e sem gosto nenhum.', anim: 'curiosa' }),
      cheirar: () => ({ d: { humor: +2 }, msg: 'Cheira a resina, um cheiro forte e limpo.', anim: 'cheirar' }),
      investigar: () => ({ d: { humor: +3 }, msg: 'Você empurrou com o focinho e ela rolou um pouquinho. As escamas se abrem como pétalas de madeira.', anim: 'curiosa' }),
    },
  },
  formigueiro: {
    nome: 'formigueiro', desc: 'um montinho de terra com um furo no topo e muitos pontinhos escuros andando',
    efeitos: {
      cheirar: () => ({ d: {}, msg: 'Cheiro ácido. Os pontinhos andam em fila, sem parar, como se soubessem para onde vão.', anim: 'cheirar' }),
      investigar: () => ({ d: { humor: -12 }, msg: 'Você enfiou o focinho no montinho e os pontinhos subiram pelo nariz e picaram! Ardeu bastante.', anim: 'tremer' }),
      comer: () => ({ d: { humor: -15, fome: -1 }, msg: 'Você abocanhou a terra do montinho. Dezenas de picadas na boca. Péssima ideia.', anim: 'tremer' }),
    },
  },
  tronco_musgo: {
    nome: 'tronco caído', desc: 'um tronco caído, coberto de musgo verde e macio',
    efeitos: {
      sentar: () => ({ d: { energia: +6, humor: +7 }, msg: 'Você se esfregou no musgo e coçou as costas no tronco. Uma delícia.', anim: 'sentar' }),
      cheirar: () => ({ d: { humor: +2 }, msg: 'Cheiro de terra molhada e madeira velha.', anim: 'cheirar' }),
      comer: () => ({ d: { fome: -2, humor: -2 }, msg: 'Você mordiscou o musgo. Úmido e sem graça.', anim: 'comer' }),
    },
  },
  caramujo: {
    nome: 'caramujo', desc: 'uma bolinha em espiral, laranja, que se move bem devagar na beira da água',
    efeitos: {
      investigar: () => ({ d: { humor: +4 }, msg: 'Quando você chegou perto, o bichinho se escondeu dentro da espiral. Ele carrega a própria casa.', anim: 'curiosa' }),
      cheirar: () => ({ d: {}, msg: 'Cheiro de lodo e água parada.', anim: 'cheirar' }),
      comer: () => ({ d: { humor: -5 }, msg: 'A espiral é dura demais. Você desistiu.', anim: 'curiosa' }),
    },
  },
  ninho: {
    nome: 'ninho', desc: 'um círculo de gravetos trançados com três bolinhas azul-claras dentro',
    efeitos: {
      cheirar: () => { swoopNow(); return { d: { humor: -6 }, msg: 'Você cheirou as bolinhas azuis e o bicho-que-voa apareceu gritando e deu um rasante na sua cabeça.', anim: 'tremer' }; },
      investigar: () => { swoopNow(); return { d: { humor: -8 }, msg: 'Assim que você se aproximou, o bicho-que-voa mergulhou do céu para defender as bolinhas azuis.', anim: 'tremer' }; },
      comer: () => { swoopNow(); return { d: { humor: -12 }, msg: 'Você tentou abocanhar as bolinhas azuis e foi atacada pelo bicho-que-voa. Ele não deixou.', anim: 'tremer' }; },
    },
  },
  teia: {
    nome: 'teia', desc: 'fios finíssimos e brilhantes esticados entre dois galhos, com algo pequeno e escuro parado no meio',
    efeitos: {
      investigar: () => ({ d: { humor: +5 }, msg: 'Você observou os fios por um bom tempo. Alguém pequeno construiu isso sozinho, fio por fio.', anim: 'curiosa' }),
      cheirar: () => ({ d: { humor: -2 }, msg: 'Os fios grudaram no focinho. Você espirrou para se livrar deles.', anim: 'espirrar' }),
    },
  },
  coco: {
    nome: 'cocô', desc: 'umas bolinhas ovais marrons no chão, com cheiro forte', temp: true,
    efeitos: {
      cheirar: () => ({ d: { humor: +2 }, msg: 'Cheiro forte e familiar. É seu. Parece dizer que este lugar agora é um pouco seu.', anim: 'cheirar' }),
      comer: () => ({ d: { humor: -15 }, msg: 'Você provou. Não. Definitivamente não.', anim: 'tremer' }),
    },
  },
  lagoa: {
    nome: 'lagoa', desc: 'uma lagoa pequena e rasa, de água parada, cercada de plantas',
    efeitos: {
      beber: () => ({ d: { sede: -35 }, msg: 'Você bebeu da lagoa. Água morna, com gosto de folha.', anim: 'beber' }),
      nadar: () => ({ d: { humor: +15, energia: -6 }, msg: 'Você entrou na lagoa. É rasa, mas dá para boiar. Nenhum bicho de dentes por aqui.', anim: 'nadar' }),
    },
  },
  taboa: {
    nome: 'taboa', desc: 'uma touceira de folhas compridas com espigas marrons em forma de salsicha, na beira da água',
    efeitos: {
      comer: () => ({ d: { fome: -14, humor: +4 }, msg: 'Você mastigou os talos macios da base. Gosto de água doce. Muito bom.', anim: 'comer' }),
      cheirar: () => ({ d: {}, msg: 'Cheiro de lama e de verde molhado.', anim: 'cheirar' }),
    },
  },
  cacto: {
    nome: 'cacto', desc: 'uma planta grossa e verde, cheia de pontinhos, com uma flor rosa no topo',
    efeitos: {
      comer: () => ({ d: { sede: -10, humor: -14 }, msg: 'Você mordeu a planta grossa: os pontinhos espetaram a boca, mas lá dentro tinha água. Doeu e matou um pouco a sede.', anim: 'tremer' }),
      cheirar: () => ({ d: { humor: -3 }, msg: 'Você chegou perto demais e um espinho picou o nariz.', anim: 'tremer' }),
      investigar: () => ({ d: { humor: +4 }, msg: 'A flor rosa nasce no meio dos espinhos. Bonita e protegida ao mesmo tempo.', anim: 'curiosa' }),
    },
  },
  samambaia: {
    nome: 'samambaia', desc: 'uma planta de folhas compridas e recortadas que se curvam até o chão',
    efeitos: {
      comer: () => ({ d: { fome: -2, humor: -6 }, msg: 'Você provou as folhas recortadas. Amargas. Não é comida boa.', anim: 'comer' }),
      sentar: () => ({ d: { energia: +5, humor: +3 }, msg: 'Você deitou embaixo das folhas curvadas. Sombra fresca e úmida.', anim: 'sentar' }),
      cheirar: () => ({ d: { humor: +1 }, msg: 'Cheiro de mata fechada.', anim: 'cheirar' }),
    },
  },
  pedra_brilhante: {
    nome: 'cristais', desc: 'pedras transparentes e pontudas que brilham quando a luz bate',
    efeitos: {
      investigar: () => ({ d: { humor: +9 }, msg: 'A luz entra nas pedras transparentes e sai colorida. Você ficou olhando por muito tempo.', anim: 'curiosa' }),
      comer: () => ({ d: { humor: -8 }, msg: 'Duras como nada que você já mordeu. O dente doeu.', anim: 'tremer' }),
      cheirar: () => ({ d: {}, msg: 'Não têm cheiro nenhum. São frias.', anim: 'cheirar' }),
    },
  },
  computador: {
    nome: 'computador', desc: 'uma caixinha fina e aberta em cima de um toco, com uma parte lisa que brilha como água parada',
    efeitos: {
      investigar: () => ({ d: { humor: +6 }, msg: 'Você encostou o focinho nas pecinhas de baixo e apareceram sinais na parte que brilha. Ela responde ao toque. Parece que dá para perguntar coisas a ela (ação pesquisar).', anim: 'curiosa' }),
      cheirar: () => ({ d: {}, msg: 'Cheira a nada. É morna, como uma pedra no sol.', anim: 'cheirar' }),
      comer: () => ({ d: { humor: -5 }, msg: 'Você mordeu a borda. Dura e sem gosto. Melhor não.', anim: 'curiosa' }),
    },
  },
  gopro: {
    nome: 'câmera', desc: 'uma coisinha preta e lisa com um olho de vidro azul na frente e uma alça', temp: true,
    efeitos: {
      pegar: () => ({ d: { humor: +6 }, msg: 'Você pegou a coisinha de olho azul e ela ficou presa na sua cabeça pela alça. Quando você aperta o botão, ela faz clique e guarda o que você está vendo (ação fotografar).', anim: 'comer', pickup: true }),
      investigar: () => ({ d: { humor: +3 }, msg: 'Tem um botão vermelho. Quando você encostou, ouviu um clique e uma luz piscou. Talvez dê para levar com você (ação pegar).', anim: 'curiosa' }),
      cheirar: () => ({ d: {}, msg: 'Cheiro de coisa nova, que não nasceu aqui.', anim: 'cheirar' }),
    },
  },
  jacare: {
    nome: 'jacaré', desc: 'dois olhinhos e um dorso escuro e rugoso boiando na água grande', mobile: true,
    efeitos: { investigar: o => jacareAtaca(o) },
  },
  cogumelo_vermelho: {
    nome: 'cogumelo vermelho com pintas', desc: 'um cogumelo de chapéu vermelho vivo com pintinhas brancas, muito bonito',
    efeitos: {
      comer: () => { sickUntil = gameTime + 20; return { d: { humor: -30, fome: -5 }, msg: 'Você comeu o cogumelo vermelho com pintas. Sentiu um enjoo fortíssimo e o mundo começou a girar!', anim: 'tremer', remove: true }; },
      cheirar: () => ({ d: {}, msg: 'O cogumelo vermelho tem um cheiro estranho, meio azedo.', anim: 'cheirar' }),
    },
  },
  cogumelo_marrom: {
    nome: 'cogumelo marrom', desc: 'um cogumelo simples de chapéu marrom',
    efeitos: {
      comer: () => ({ d: { fome: -15 }, msg: 'Você comeu o cogumelo marrom. Sabor de terra, mas encheu um pouco a barriga.', anim: 'comer', remove: true }),
    },
  },
  lago: {
    nome: 'lago', desc: 'um lago grande de água azul e calma',
    efeitos: {
      beber: () => ({ d: { sede: -40 }, msg: 'Você bebeu a água fresquinha do lago. A sede passou!', anim: 'beber' }),
      nadar: () => ({ d: { humor: +25, energia: -10 }, msg: 'Você nadou no lago! Sensação maravilhosa de flutuar. Ficou muito feliz, mas um pouco cansada.', anim: 'nadar' }),
    },
  },
  riacho: {
    nome: 'riacho', desc: 'um riacho estreito de água corrente que faz barulhinho',
    efeitos: {
      beber: () => ({ d: { sede: -25 }, msg: 'Você bebeu água do riacho. Geladinha!', anim: 'beber' }),
      nadar: () => ({ d: { humor: +5 }, msg: 'O riacho é raso demais para nadar, mas molhou as patinhas.', anim: 'pular' }),
    },
  },
  pedra: {
    nome: 'pedra grande', desc: 'uma pedra grande, lisa e cinzenta',
    efeitos: {
      sentar: () => ({ d: { energia: +10, humor: +5 }, msg: 'Você sentou na pedra grande e ficou contemplando o horizonte. Um momento de paz profunda.', anim: 'sentar' }),
      comer: () => ({ d: { humor: -8 }, msg: 'Você tentou morder a pedra. Doeu o dente!', anim: 'tremer' }),
    },
  },
  caverna: {
    nome: 'caverna', desc: 'a entrada de uma caverna escura e silenciosa',
    efeitos: {
      dormir: () => { const n = isNight(); return { d: { energia: n ? +100 : +50 }, msg: n ? 'Você dormiu na caverna durante a noite. Sono profundo e reparador, energia lá em cima!' : 'Você tirou um cochilo na caverna escura. Recuperou bastante energia.', anim: 'dormir' }; },
      investigar: () => ({ d: { humor: +3 }, msg: 'A caverna é escura, seca e protegida da chuva. Ecoa quando você respira.', anim: 'curiosa' }),
    },
  },
  flores: {
    nome: 'flores coloridas', desc: 'um canteiro de flores coloridas',
    efeitos: {
      cheirar: () => Math.random() < 0.45
        ? { d: { humor: +5 }, msg: 'Você cheirou as flores e... ATCHIM! Espirrou forte, mas o perfume era bom.', anim: 'espirrar' }
        : { d: { humor: +5 }, msg: 'Você cheirou as flores. Perfume delicioso!', anim: 'cheirar' },
      comer: () => ({ d: { fome: -5, humor: -3 }, msg: 'Você comeu umas flores. Amargas.', anim: 'comer' }),
    },
  },
  passaro: {
    nome: 'pássaro azul', desc: 'um passarinho azul que voa por aí', mobile: true,
    efeitos: {
      investigar: () => { scareBird(); return Math.random() < 0.5
        ? { d: { humor: -10 }, msg: 'Você chegou perto do pássaro e ele bateu as asas na sua cara! Que susto!', anim: 'tremer' }
        : { d: { humor: +8 }, msg: 'O pássaro te olhou, cantou um pouquinho e voou. Que fofo.', anim: 'pular' }; },
    },
  },
  // ---- surpresas do botão 🎁 ----
  melancia: {
    nome: 'melancia', desc: 'uma fruta enorme, verde e listrada', surprise: true,
    efeitos: {
      comer: () => ({ d: { fome: -40, sede: -20, humor: +20 }, msg: 'Você comeu a melancia inteira! Doce, molhada, a melhor coisa do mundo!', anim: 'pular', remove: true }),
    },
  },
  bola: {
    nome: 'bola colorida', desc: 'uma esfera colorida e brilhante, leve', surprise: true,
    efeitos: {
      investigar: o => { o.vel = new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3)); return { d: { humor: +20, energia: -8 }, msg: 'Você encostou o focinho na esfera e ela saiu rolando! Muito divertido!', anim: 'pular' }; },
      comer: () => ({ d: { humor: -5 }, msg: 'Você tentou morder a bola. Borrachuda. Nada comestível.', anim: 'curiosa' }),
    },
  },
  caixa: {
    nome: 'caixa misteriosa', desc: 'uma caixa roxa com laço dourado', surprise: true,
    efeitos: {
      investigar: () => Math.random() < 0.6
        ? { d: { humor: +30 }, msg: 'Você abriu a caixa e saíram confetes coloridos! Uma festa só sua!', anim: 'pular', remove: true }
        : { d: { humor: -15 }, msg: 'Você abriu a caixa e um boneco de mola pulou na sua cara! SUSTO!', anim: 'tremer', remove: true },
      cheirar: () => ({ d: {}, msg: 'A caixa cheira a papelão e mistério.', anim: 'cheirar' }),
    },
  },
};
const DISCOVERY_TEXT = {
  'nadar:lago': 'nadar é incrível', 'comer:arvore_frutas': 'frutinhas vermelhas são deliciosas',
  'comer:cogumelo_vermelho': 'cogumelo vermelho dá enjoo', 'comer:cogumelo_marrom': 'cogumelo marrom mata a fome',
  'beber:lago': 'água do lago', 'dormir:caverna': 'dormir na caverna', 'sentar:pedra': 'contemplar na pedra',
  'cheirar:flores': 'o perfume das flores', 'investigar:passaro': 'um amigo de penas', 'comer:melancia': 'MELANCIA!',
  'investigar:bola': 'brincar de bola', 'investigar:caixa': 'caixas misteriosas',
  'comer:arbusto_amoras': 'amoras matam a fome', 'comer:capim_alto': 'o capim é macio e bom',
  'comer:arbusto_espinhos': 'folhas pontudas machucam', 'comer:arbusto_bagas_brancas': 'bagas brancas dão sono',
  'beber:fonte': 'a fonte de água limpa', 'dormir:abrigo': 'um abrigo para dormir',
};

// --- Instâncias do mundo ---
const objects = [];   // {id, type, pos, mesh, block}
const counters = {};
const PORCOES = { taboa: 3, trevo: 3, grama_baixa: 3, grama_seca: 2, arvore_frutas: 3, arbusto_amoras: 3, capim_alto: 4, arbusto_espinhos: 2, arbusto_bagas_brancas: 2 };
const REGROW = 150; // segundos de jogo para frutificar de novo
// partes comestíveis de cada modelo, reconhecidas pela cor (para sumir quando ela come tudo)
const FRUTA = {
  arvore_frutas: h => (h.h < 0.04 || h.h > 0.94) && h.s > 0.5,
  arbusto_amoras: h => h.h > 0.7 && h.h < 0.95 && h.l < 0.4,
  arbusto_espinhos: h => h.h > 0.09 && h.h < 0.18 && h.s > 0.6,
  arbusto_bagas_brancas: h => h.l > 0.8,
};
function setFood(o, cheio) {
  if (['capim_alto', 'trevo', 'grama_baixa', 'grama_seca', 'taboa'].includes(o.type)) { o.mesh.scale.y = (o.baseSy ??= o.mesh.scale.y) * (cheio ? 1 : 0.35); return; }
  const test = FRUTA[o.type]; if (!test || !o.mesh) return;
  const hsl = {};
  o.mesh.traverse(m => { if (m.isMesh && test(m.material.color.getHSL(hsl))) m.visible = cheio; });
}
function addObject(type, x, z, maker, block = 0) {
  counters[type] = (counters[type] || 0) + 1;
  const o = { id: `${type}_${counters[type]}`, type, pos: new THREE.Vector3(x, heightAt(x, z), z), block };
  if (maker) { o.mesh = placeAt(maker(), x, z); o.mesh.rotation.y = rand(0, 6.28); }
  if (PORCOES[type]) o.porcoes = PORCOES[type];
  objects.push(o); return o;
}
const MK = {
  arvore: () => model('arvore', () => makeTree(false)),
  arvore_frutas: () => model('arvore_frutas', () => makeTree(true)),
  cogumelo_vermelho: () => model('cogumelo_vermelho', () => makeMushroom(true), 1.2),
  cogumelo_marrom: () => model('cogumelo_marrom', () => makeMushroom(false), 1.2),
  pedra: () => model('pedra', makeRock),
  caverna: () => model('caverna', makeCave),
  flores: () => model('flores', makeFlowers, 1.4),
  passaro: () => model('passaro', makeBird),
  melancia: () => model('melancia', makeWatermelon),
  bola: () => model('bola', makeBall),
  caixa: () => model('caixa', makeBox),
  arbusto_amoras: () => model('arbusto_amoras', () => makeFlowers()),
  capim_alto: () => model('capim_alto', () => makeFlowers()),
  arbusto_espinhos: () => model('arbusto_espinhos', () => makeFlowers()),
  arbusto_bagas_brancas: () => model('arbusto_bagas_brancas', () => makeFlowers()),
  fonte: () => model('fonte', makeRock),
  abrigo: () => model('abrigo', makeRock),
  pinha: () => model('pinha', makeRock, 1.1), formigueiro: () => model('formigueiro', makeRock),
  tronco_musgo: () => model('tronco_musgo', makeRock), caramujo: () => model('caramujo', makeRock, 1.3),
  ninho: () => model('ninho', makeRock), teia: () => model('teia', makeRock),
  trevo: () => model('trevo', makeFlowers), grama_seca: () => model('grama_seca', makeFlowers, 1.3),
  grama_baixa: () => model('grama_baixa', makeFlowers, 1.4), coco: () => model('coco', makeRock),
  taboa: () => model('taboa', makeFlowers), cacto: () => model('cacto', makeRock), samambaia: () => model('samambaia', makeFlowers), pedra_brilhante: () => model('pedra_brilhante', makeRock),
  computador: () => model('computador', makeRock), gopro: () => model('gopro', makeBox, 1.6),
  jacare: () => model('jacare', () => mesh(new THREE.BoxGeometry(0.8, 0.4, 2.6), 0x3d5a3a)),
};
// Água como objetos (com raio): lago principal, lagoas e o riacho
const lago = addObject('lago', LAKE.x, LAKE.z, null); lago.pos.y = WATER_Y; lago.radius = LAKE.r;
for (const p of PONDS) { const o = addObject('lagoa', p.x, p.z, null); o.pos.y = WATER_Y; o.radius = p.r; }
const RX = LAKE.x + LAKE.r + 8;
const riacho = addObject('riacho', RX, streamZ(RX), null); riacho.pos.y = STREAM_Y;

const isFreeRaw = p => Math.abs(p.x) < LIM && Math.abs(p.z) < LIM && waterDist(p.x, p.z) > 1.5 && nearStream(p.x, p.z) > 2.5;
const spaced = (p, minD, block = 0) => !objects.some(o => !o.radius && !TYPES[o.type]?.mobile && Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < minD + block + (o.block || 0));
// procura um ponto livre num anel em volta da partida (de preferência num dos biomas pedidos)
function spot(biomes, rMin, rMax, minD = 3, block = 0) {
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 400; i++) {
    const a = srand(0, 6.28), d = srand(rMin, rMax), p = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
    if (!isFreeRaw(p) || !spaced(p, minD, block) || (pass === 0 && !biomes.includes(biomeAt(p.x, p.z)))) continue;
    return p;
  }
  return new THREE.Vector3(rMin, 0, 0);
}
// marcos únicos
const cp = spot(['pedregal'], 22, 50, 6, 3.4);
const cave = addObject('caverna', cp.x, cp.z, MK.caverna, 3.4);
cave.mesh.rotation.y = 0;
cave.entrance = new THREE.Vector3(cp.x + 4.2, 0, cp.z);
const ap = spot(['mata', 'campo'], 14, 30, 5, 1.6);
const abrigo = addObject('abrigo', ap.x, ap.z, MK.abrigo, 1.6);
abrigo.mesh.rotation.y = 0;                    // aberto para +Z
abrigo.entrance = new THREE.Vector3(ap.x, 0, ap.z + 2.6);
const fp = spot(['mata', 'campo'], 16, 40, 4, 1.1);
addObject('fonte', fp.x, fp.z, MK.fonte, 1.1);
// o computador num toco e a câmera caída no chão, os dois perto da clareira de partida
const pcp = spot(['campo'], 6, 9, 3, 0.7);
const pc = addObject('computador', pcp.x, pcp.z, MK.computador, 0.7);
pc.mesh.rotation.y = Math.atan2(-pcp.x, -pcp.z);   // tela virada para o centro
const gp = spot(['campo'], 5, 8, 2);
let gopro = state.temCamera ? null : addObject('gopro', gp.x, gp.z, MK.gopro);

// Espalha a vegetação e as coisas de cada bioma: [tipo, peso, raio de bloqueio]
const BIOMA = {
  campo: [['grama_baixa', 6, 0], ['trevo', 4, 0], ['capim_alto', 4, 0.7], ['flores', 3, 0], ['grama_seca', 2, 0], ['formigueiro', 1, 0.8], ['pinha', 0.7, 0],
          ['arbusto_amoras', 2, 0.7], ['arbusto_espinhos', 1, 0.7], ['cogumelo_marrom', 1, 0], ['arvore', 1.2, 1.1], ['arvore_frutas', 0.6, 1.1], ['pedra', 0.4, 1.6]],
  mata: [['arvore', 6, 1.1], ['arvore_frutas', 2, 1.1], ['samambaia', 3, 0], ['cogumelo_marrom', 2, 0], ['cogumelo_vermelho', 1.5, 0], ['tronco_musgo', 2, 1.2],
         ['teia', 1.5, 0.6], ['ninho', 0.7, 0], ['arbusto_bagas_brancas', 1.5, 0.7], ['arbusto_amoras', 1, 0.7], ['pinha', 1, 0]],
  brejo: [['taboa', 5, 0], ['capim_alto', 3, 0.7], ['grama_baixa', 2, 0], ['trevo', 1, 0], ['flores', 1, 0], ['samambaia', 1, 0]],
  pedregal: [['pedra', 3, 1.6], ['cacto', 3, 0.6], ['pedra_brilhante', 1, 0.5], ['grama_seca', 3, 0], ['formigueiro', 1, 0.8], ['pinha', 0.5, 0]],
};
{
  let placed = 0;
  for (let i = 0; i < 9000 && placed < 300; i++) {
    const p = new THREE.Vector3(srand(-LIM, LIM), 0, srand(-LIM, LIM));
    if (Math.hypot(p.x, p.z) < 4 || !isFreeRaw(p) || heightAt(p.x, p.z) < -0.3) continue;
    const list = BIOMA[biomeAt(p.x, p.z)], tot = list.reduce((a, t) => a + t[1], 0);
    let r = srand(0, tot), pickT = list[0];
    for (const t of list) { if ((r -= t[1]) <= 0) { pickT = t; break; } }
    const [t, , block] = pickT;
    if (!spaced(p, 2.6, block)) continue;
    addObject(t, p.x, p.z, MK[t], block); placed++;
  }
  // caramujos nas margens
  for (const w of WATERS) for (let i = 0; i < (w === LAKE ? 2 : 1); i++) {
    const a = srand(0, 6.28), r = w.r + srand(1.4, 2.2);
    addObject('caramujo', w.x + Math.cos(a) * r, w.z + Math.sin(a) * r, MK.caramujo);
  }
}
// tufos de grama decorativos: um único InstancedMesh (barato), com tons de cada bioma
{
  const N = 3600, geo = new THREE.ConeGeometry(0.05, 0.38, 3); geo.translate(0, 0.19, 0);
  const tufts = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ flatShading: true }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  let k = 0;
  for (let i = 0; i < N * 3 && k < N; i++) {
    const x = srand(-HALF, HALF), z = srand(-HALF, HALF), h = heightAt(x, z);
    if (h < -0.25 || waterDist(x, z) < 1 || nearStream(x, z) < 1.5) continue;
    const b = biomeAt(x, z);
    if (b === 'pedregal' && srand(0, 1) < 0.7) continue;
    e.set(srand(-0.35, 0.35), srand(0, 6.28), srand(-0.35, 0.35)); q.setFromEuler(e);
    const sc = srand(0.6, 1.5) * (b === 'brejo' ? 1.5 : b === 'mata' ? 1.2 : 1);
    m4.compose(new THREE.Vector3(x, h, z), q, new THREE.Vector3(sc, sc * srand(0.7, 1.4), sc));
    tufts.setMatrixAt(k, m4);
    const dry = b === 'pedregal' || Math.sin(x * 0.12 + z * 0.09) > 0.6;
    tufts.setColorAt(k, dry ? c.setHSL(srand(0.11, 0.15), 0.45, srand(0.45, 0.55))
      : b === 'brejo' ? c.setHSL(srand(0.18, 0.22), 0.4, srand(0.3, 0.4))
      : b === 'mata' ? c.setHSL(srand(0.28, 0.33), 0.5, srand(0.26, 0.36))
      : c.setHSL(srand(0.24, 0.3), 0.55, srand(0.38, 0.5)));
    k++;
  }
  tufts.count = k; tufts.receiveShadow = true;
  scene.add(tufts);
}
// Jacaré: vive no lago, às vezes toma sol na margem, espreita quem fica muito perto da água
const jac = addObject('jacare', LAKE.x + 2, LAKE.z + 1, null);
jac.mesh = MK.jacare(); scene.add(jac.mesh);
Object.assign(jac, { mode: 'nadar', target: jac.pos.clone(), until: 0, nextBask: 60, jaw: jac.mesh.getObjectByName('jaw'), tail: jac.mesh.getObjectByName('tail'), jawOpen: 0 });
const bird = addObject('passaro', 0, 0, null);
bird.mesh = MK.passaro(); scene.add(bird.mesh);
bird.mesh.userData.wings = ['wing_l', 'wing_r'].map(n => bird.mesh.getObjectByName(n)).filter(Boolean);
bird.t = 0; bird.mode = 'circle'; bird.home = new THREE.Vector3(0, 0, 0); bird.fleeUntil = 0;
function swoopNow() { bird.mode = 'swoop'; }
function scareBird() { bird.mode = 'flee'; bird.fleeUntil = gameTime + 8; bird.fleeDir = new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize(); }

// ---------------------------------------------------------------------
// 3a. PATHFINDING: grade de 1 m + A* (contorna árvores, pedras, caverna e lago)
// ---------------------------------------------------------------------
const GN = HALF * 2;   // células de 1 m
const blocked = new Uint8Array(GN * GN);
const cellOf = v => [clamp(Math.floor(v.x + HALF), 0, GN - 1), clamp(Math.floor(v.z + HALF), 0, GN - 1)];
const cellCenter = (i, j) => new THREE.Vector3(i - HALF + 0.5, 0, j - HALF + 0.5);
for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) {
  const c = cellCenter(i, j);
  blocked[i + j * GN] = (i < 2 || j < 2 || i > GN - 3 || j > GN - 3 || waterDist(c.x, c.z) < 0.6) ? 1 : 0;
}
for (const o of objects) if (o.block) {   // marca só as células em volta de cada obstáculo
  const R = Math.ceil(o.block + 0.5), [ci, cj] = cellOf(o.pos);
  for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) {
    if (i < 0 || j < 0 || i >= GN || j >= GN) continue;
    const c = cellCenter(i, j); if (Math.hypot(c.x - o.pos.x, c.z - o.pos.z) < o.block + 0.5) blocked[i + j * GN] = 1;
  }
}
function nearestFree(i, j) {
  if (!blocked[i + j * GN]) return [i, j];
  for (let r = 1; r < 12; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < GN && b < GN && !blocked[a + b * GN]) return [a, b];
  }
  return [i, j];
}
// A* com fila de prioridade (heap binário): rápido mesmo no mapa de 120 m
function findPath(from, to) {
  const [si, sj] = nearestFree(...cellOf(from)), [ti, tj] = nearestFree(...cellOf(to));
  const start = si + sj * GN, goal = ti + tj * GN;
  const g = new Float32Array(GN * GN).fill(Infinity), came = new Int32Array(GN * GN).fill(-1), closed = new Uint8Array(GN * GN);
  const hf = k => Math.hypot((k % GN) - ti, Math.floor(k / GN) - tj);
  const heap = [[hf(start), start]];
  const push = it => { heap.push(it); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= it[0]) break; heap[i] = heap[p]; i = p; } heap[i] = it; };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++; if (heap[c][0] >= last[0]) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return top; };
  g[start] = 0;
  let iter = 0;
  while (heap.length && iter++ < 30000) {
    const [, cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % GN, cj = Math.floor(cur / GN);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GN || nj >= GN) continue;
      const n = ni + nj * GN;
      if (blocked[n] || closed[n]) continue;
      if (di && dj && (blocked[ci + di + cj * GN] || blocked[ci + (cj + dj) * GN])) continue; // sem cortar quinas
      const ng = g[cur] + (di && dj ? 1.414 : 1);
      if (ng < g[n]) { g[n] = ng; came[n] = cur; push([ng + hf(n), n]); }
    }
  }
  if (came[goal] === -1 && goal !== start) return [to.clone()];
  const path = []; let k = goal;
  while (k !== -1 && k !== start) { path.unshift(cellCenter(k % GN, Math.floor(k / GN))); k = came[k]; }
  const out = path.filter((p, i) => i % 2 === 1 || i === path.length - 1);
  out.push(to.clone());
  return out;
}
function isFree(v) { const [i, j] = cellOf(v); return !blocked[i + j * GN]; }

// ---------------------------------------------------------------------
// 3b. A CAPIVARA: modelo low poly com primitivas
// ---------------------------------------------------------------------
const capy = { root: new THREE.Group(), model: new THREE.Group(), pos: new THREE.Vector3(0, 0, 0), yaw: 0,
  anim: 'idle', animT: 0, path: [], speed: 2.2, swim: false, onArrive: null };
if (MODELS.capivara) {
  // Modelo do Blender: usa os nós nomeados (body, head_pivot, eye_l/r, leg_fl/fr/bl/br) como pivôs de animação
  const g = MODELS.capivara.clone(true);
  const byName = n => g.getObjectByName(n);
  const body = byName('body'), head = byName('head_pivot');
  capy.model.add(g);
  capy.parts = { body, head, eyes: ['eye_l', 'eye_r'].map(byName).filter(Boolean),
    legs: ['leg_fl', 'leg_fr', 'leg_bl', 'leg_br'].map(byName) };
  capy.root.add(capy.model); scene.add(capy.root);
} else {
  const FUR = M(0xb07a4f), DARK = M(0x7a4f33), BLACK = M(0x1a1410);
  const body = mesh(new THREE.IcosahedronGeometry(0.55, 1), FUR, 0, 0.68, 0); body.scale.set(1, 0.85, 1.45);
  const head = new THREE.Group(); head.position.set(0, 0.98, 0.72);
  head.add(mesh(new THREE.BoxGeometry(0.56, 0.5, 0.58), FUR, 0, 0, 0.05));
  head.add(mesh(new THREE.BoxGeometry(0.48, 0.38, 0.32), DARK, 0, -0.07, 0.45));
  head.add(mesh(new THREE.BoxGeometry(0.22, 0.08, 0.04), BLACK, 0, 0.03, 0.62, false));
  const eyeG = new THREE.SphereGeometry(0.065, 6, 5);
  const eyes = [-1, 1].map(s => { const e = mesh(eyeG, BLACK, s * 0.22, 0.1, 0.24, false);
    e.add(mesh(new THREE.SphereGeometry(0.02, 4, 3), 0xffffff, 0.015, 0.025, 0.05, false)); head.add(e); return e; });
  [-1, 1].forEach(s => head.add(mesh(new THREE.BoxGeometry(0.13, 0.14, 0.08), DARK, s * 0.22, 0.3, -0.15)));
  const legs = [[-0.3, 0.45], [0.3, 0.45], [-0.3, -0.5], [0.3, -0.5]].map(([x, z]) => {
    const lg = new THREE.Group(); lg.position.set(x, 0.42, z);
    lg.add(mesh(new THREE.BoxGeometry(0.17, 0.42, 0.19), DARK, 0, -0.21, 0)); return lg; });
  capy.model.add(body, head, ...legs);
  capy.parts = { body, head, eyes, legs };
  capy.root.add(capy.model); scene.add(capy.root);
}
const groundY = v => capy.swim ? WATER_Y - 0.45 : heightAt(v.x, v.z);

// Animações procedurais (sem arquivos externos)
function animateCapy(dt) {
  const { body, head, eyes, legs } = capy.parts, t = (capy.animT += dt), a = capy.anim;
  // pose neutra
  let my = 0, mrx = 0, mrz = 0, hx = 0, hz = 0, ox = 0, legSwing = 0, legFold = 0, eyeS = 1;
  const breath = Math.sin(t * 2) * 0.015;
  switch (a) {
    case 'andar': legSwing = Math.sin(t * 11) * 0.55; my = Math.abs(Math.sin(t * 11)) * 0.05; break;
    case 'correr': legSwing = Math.sin(t * 18) * 0.8; my = Math.abs(Math.sin(t * 18)) * 0.1; mrx = 0.08; break;
    case 'comer': hx = 0.65 + Math.sin(t * 9) * 0.12; mrx = 0.1; break;
    case 'beber': hx = 0.8 + Math.sin(t * 12) * 0.06; mrx = 0.15; break;
    case 'nadar': legSwing = Math.sin(t * 14) * 0.7; my = Math.sin(t * 2.5) * 0.05; hx = -0.2; break;
    case 'dormir': legFold = 1.4; my = -0.32; hx = 0.25; eyeS = 0.12; mrz = Math.sin(t * 1.2) * 0.02; break;
    case 'pular': my = Math.abs(Math.sin(t * 7)) * 0.7; legSwing = Math.sin(t * 14) * 0.4; hx = -0.2; break;
    case 'tremer': ox = Math.sin(t * 70) * 0.05; hx = 0.25; eyeS = 1.4; break;
    case 'curiosa': hz = Math.sin(Math.min(t, 1) * 1.5) * 0.45; hx = -0.1; break;
    case 'cheirar': hx = 0.45 + Math.sin(t * 22) * 0.04; break;
    case 'espirrar': hx = t < 0.7 ? -0.45 * (t / 0.7) : (t < 0.9 ? 0.6 : 0.1); mrx = t > 0.7 && t < 0.9 ? 0.15 : 0; break;
    case 'sentar': mrx = -0.35; my = -0.12; hx = -0.15; legFold = 0.6; break;
    case 'digitar': mrx = -0.3; my = -0.12; legFold = 0.6; hx = 0.25 + Math.sin(t * 18) * 0.05; break;
    case 'agachar': mrx = -0.28; my = -0.18 + Math.sin(t * 2) * 0.02; hx = 0.1; legFold = 0.5; break;
  }
  if (gameTime < sickUntil) { mrz += Math.sin(t * 3) * 0.12; hz += Math.sin(t * 2.3) * 0.2; }
  capy.model.position.set(ox, my + breath, 0);
  capy.model.rotation.set(mrx, 0, mrz);
  head.rotation.set(hx, 0, hz);
  legs.forEach((l, i) => { l.rotation.x = (i % 3 === 0 ? 1 : -1) * legSwing + legFold * (i < 2 ? -1 : 1); });
  eyes.forEach(e => { e.userData.sy ??= e.scale.y; e.scale.y = e.userData.sy * eyeS; });
  body.userData.sy ??= body.scale.y; body.scale.y = body.userData.sy * (1 + breath);
}

// Movimento ao longo do caminho
// Pegadas (anel de 160 instâncias) e trilhas (o chão escurece onde ela passa muito)
const PRINTS = 160;
const prints = new THREE.InstancedMesh(new THREE.CircleGeometry(0.07, 6).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x3b2a1a, transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), PRINTS);
prints.count = 0; scene.add(prints);
let printIdx = 0, stepDist = 0, stepSide = 1, lastCellKey = '';
const DIRT = new THREE.Color(0xa88a5e);
function dropPrint() {
  const side = new THREE.Vector3(-Math.cos(capy.yaw), 0, Math.sin(capy.yaw)).multiplyScalar(0.14 * (stepSide = -stepSide));
  const p = capy.pos.clone().add(side); p.y = heightAt(p.x, p.z) + 0.03;
  prints.setMatrixAt(printIdx, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z));
  printIdx = (printIdx + 1) % PRINTS; prints.count = Math.min(PRINTS, prints.count + 1); prints.instanceMatrix.needsUpdate = true;
}
function wearGround(x, z, times = 1) {
  const ix = Math.round((x + TSIZE / 2) / TSIZE * TSEG), iz = Math.round((z + TSIZE / 2) / TSIZE * TSEG);
  if (ix < 0 || iz < 0 || ix > TSEG || iz > TSEG) return;
  const key = ix + ',' + iz;
  const w = state.trilhas[key] = (state.trilhas[key] || 0) + times;
  const i = iz * (TSEG + 1) + ix, col = GROUND.geometry.attributes.color, t = Math.min(1, w / 14) * 0.75;
  const c = new THREE.Color(GROUND_BASE[i * 3], GROUND_BASE[i * 3 + 1], GROUND_BASE[i * 3 + 2]).lerp(DIRT, t);
  col.setXYZ(i, c.r, c.g, c.b); col.needsUpdate = true;
}
for (const k in state.trilhas) { const [ix, iz] = k.split(',').map(Number); const v = state.trilhas[k]; state.trilhas[k] = 0; wearGround(ix / TSEG * TSIZE - TSIZE / 2, iz / TSEG * TSIZE - TSIZE / 2, v); }

function moveCapy(dt) {
  if (!capy.path.length) return;
  const tgt = capy.path[0];
  const d = new THREE.Vector3(tgt.x - capy.pos.x, 0, tgt.z - capy.pos.z);
  const dist = d.length();
  if (dist < 0.25) {
    capy.path.shift();
    if (!capy.path.length && capy.onArrive) { const f = capy.onArrive; capy.onArrive = null; f(); }
    return;
  }
  d.normalize();
  const wantYaw = Math.atan2(d.x, d.z);
  let dy = wantYaw - capy.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  capy.yaw += dy * Math.min(1, dt * 8);
  const sp = capy.speed * (gameTime < sickUntil ? 0.6 : 1);
  const step = Math.min(dist, sp * dt);
  capy.pos.addScaledVector(d, step);
  if (!capy.swim && (stepDist += step) > 0.45) { stepDist = 0; dropPrint(); }
  const ck = Math.round((capy.pos.x + TSIZE / 2) / TSIZE * TSEG) + ',' + Math.round((capy.pos.z + TSIZE / 2) / TSIZE * TSEG);
  if (!capy.swim && ck !== lastCellKey) { lastCellKey = ck; wearGround(capy.pos.x, capy.pos.z); }
}

// ---------------------------------------------------------------------
// TEMPO DE JOGO, dia/noite e clima
// ---------------------------------------------------------------------
let gameTime = 0, timeScale = 1, paused = false, sickUntil = -1;
let lastOutcome = null;
let raining = false, rainUntil = 0, nextWeatherCheck = 20;
const waiters = []; // promessas esperando gameTime
const gameWait = s => new Promise(r => waiters.push({ at: gameTime + s, r }));
const isNight = () => state.clock < 0.24 || state.clock > 0.8;
const nearXZ = (p, r) => Math.hypot(capy.pos.x - p.x, capy.pos.z - p.z) < r;
const inCave = () => nearXZ(cave.entrance, 3) || nearXZ(abrigo.entrance, 2.2);   // caverna ou abrigo: protegida da chuva
function periodName() {
  const h = state.clock * 24;
  return h < 5 ? 'madrugada' : h < 12 ? 'manhã' : h < 18 ? 'tarde' : h < 20 ? 'entardecer' : 'noite';
}
const SKY_DAY = new THREE.Color(0x9fd8ff), SKY_NIGHT = new THREE.Color(0x1a2246), SKY_SET = new THREE.Color(0xffa877), SKY_RAIN = new THREE.Color(0x8a96a8);
const skyCol = new THREE.Color();
function updateWorld(dt) {
  // relógio
  state.clock += dt / DAY_LEN;
  if (state.clock >= 1) { state.clock -= 1; state.day++; }
  const ang = (state.clock - 0.25) * Math.PI * 2, sh = Math.sin(ang);
  const light = clamp(sh * 1.6 + 0.25, 0, 1);
  const sunset = clamp(1 - Math.abs(sh) * 3, 0, 1) * (sh > -0.2 ? 1 : 0);
  skyCol.copy(SKY_NIGHT).lerp(SKY_DAY, light).lerp(SKY_SET, sunset * 0.6);
  if (raining) skyCol.lerp(SKY_RAIN, 0.55);
  scene.background = skyCol; scene.fog.color.copy(skyCol);
  // de dia o sol; à noite a mesma luz vira lua (azulada e fraca), economizando uma luz
  const moon = light < 0.2;
  sun.intensity = moon ? 0.35 : light * (raining ? 0.5 : 1.4);
  if (moon) sun.color.set(0x9fb6ff); else sun.color.setHSL(0.09, 0.8, 0.6 + light * 0.25);
  const night = 1 - smooth(0.05, 0.35, light);
  stars.material.opacity = raining ? 0 : night * 0.9; stars.position.copy(camera.position);
  flies.material.opacity = raining ? 0 : night * (0.6 + Math.sin(gameTime * 3) * 0.3);
  if (night > 0.05) {
    flies.position.set(capy.pos.x, heightAt(capy.pos.x, capy.pos.z), capy.pos.z);
    const fp = flies.geometry.attributes.position;
    for (let i = 0; i < FLY_N; i++) { fp.setX(i, fp.getX(i) + Math.sin(gameTime * 0.9 + i) * dt * 0.5); fp.setY(i, 0.4 + Math.abs(Math.sin(gameTime * 0.5 + i * 1.3)) * 1.8); }
    fp.needsUpdate = true;
  }
  hemi.intensity = 0.35 + light * 0.6;
  sun.position.set(capy.pos.x + Math.cos(moon ? ang + Math.PI : ang) * 25, Math.max(6, Math.abs(sh) * 30), capy.pos.z + 12);
  sun.target.position.copy(capy.pos);
  // chuva ocasional
  if (gameTime > nextWeatherCheck) {
    nextWeatherCheck = gameTime + 15;
    if (!raining && Math.random() < 0.08) { raining = true; rainUntil = gameTime + rand(25, 55); }
  }
  if (raining && gameTime > rainUntil) raining = false;
  rain.visible = raining;
  if (raining) {
    const p = rainGeo.attributes.position;
    for (let i = 0; i < RAIN_N; i++) { let y = p.getY(i) - 16 * dt; if (y < 0) y += 14; p.setY(i, y); }
    p.needsUpdate = true; rain.position.set(capy.pos.x, heightAt(capy.pos.x, capy.pos.z) - 1, capy.pos.z);
  }
  // status mudam com o tempo
  const s = state.stats, sleeping = capy.anim === 'dormir';
  s.fome = clamp(s.fome + dt * (sleeping ? 0.12 : 0.22));
  s.sede = clamp(s.sede + dt * (sleeping ? 0.15 : 0.3));
  if (!sleeping) s.energia = clamp(s.energia - dt * 0.14);
  if (raining && !inCave()) s.humor = clamp(s.humor - dt * 0.35);
  // temperatura: água, chuva e noite esfriam; sol aquece; abrigo protege
  const abrigada = inCave();
  let dF = 0;
  if (capy.swim) dF += 1.6;
  if (raining && !abrigada) dF += 0.9;
  if (isNight()) dF += abrigada ? 0 : 0.3;
  else if (!raining) dF -= abrigada ? 0.3 : 0.55;
  if (abrigada && sleeping) dF -= 0.8;
  s.frio = clamp(s.frio + dF * dt);
  // bem alimentada, hidratada e aquecida, o humor volta devagar para o equilíbrio
  s.bexiga = clamp(s.bexiga + dt * 0.05);
  if (s.bexiga > 90) s.humor = clamp(s.humor - dt * 0.2);              // segurar demais incomoda
  if (!sleeping) s.tedio = clamp(s.tedio + dt * 0.06);
  if (s.tedio > 70) s.humor = clamp(s.humor - dt * 0.08);
  if (s.fome < 60 && s.sede < 60 && s.frio < 50 && s.humor < 55) s.humor = clamp(s.humor + dt * 0.12);
  if (s.frio > 60) { s.humor = clamp(s.humor - dt * 0.15); s.energia = clamp(s.energia - dt * 0.08); }
  if (s.frio > 70 && gameTime > nextShiver && !sleeping && !capy.swim) { nextShiver = gameTime + rand(7, 12); flashAnim('tremer', 1); showEmoji('🥶'); }
  // diário ao anoitecer
  if (state.clock > 0.78 && state.clock < 0.8 && state.diaryDay !== state.day) { state.diaryDay = state.day; pendingDiary = true; }
  if (s.fome > 85 || s.sede > 85) s.humor = clamp(s.humor - dt * 0.1);
  // água ondulando de leve
  for (const m of waterMeshes) m.position.y = WATER_Y + Math.sin(gameTime * 1.3) * 0.02;
  updateBird(dt);
  updateJacare(dt);
  updateSurprises(dt);
}

// Pássaro: circula pelo mundo, às vezes dá rasantes perto da capivara
let nextSwoop = 25, nextShiver = 0, pendingDiary = false;
function updateBird(dt) {
  bird.t += dt;
  const m = bird.mesh;
  if (bird.mode === 'flee') {
    bird.pos.addScaledVector(bird.fleeDir, dt * 7); bird.pos.y = Math.min(bird.pos.y + dt * 2, 9);
    if (gameTime > bird.fleeUntil) bird.mode = 'circle';
  } else if (bird.mode === 'swoop') {
    const tgt = capy.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
    bird.pos.lerp(tgt, Math.min(1, dt * 2));
    if (bird.pos.distanceTo(tgt) < 1) {
      bird.mode = 'flee'; bird.fleeUntil = gameTime + 6; bird.fleeDir = new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize();
      if (capy.anim !== 'dormir' && !capy.swim) {
        state.stats.humor = clamp(state.stats.humor - 5);
        pendingNotes.push('Um pássaro azul deu um rasante bem na sua cabeça e te assustou!');
        flashAnim('tremer', 1.2); showEmoji('😱');
      }
    }
  } else {
    // circula em volta de um ponto que segue a capivara devagar
    bird.home.lerp(capy.pos, dt * 0.05);
    const a = bird.t * 0.35;
    const tgt = new THREE.Vector3(bird.home.x + Math.cos(a) * 11, 5 + Math.sin(bird.t) * 1.2, bird.home.z + Math.sin(a) * 11);
    bird.pos.lerp(tgt, Math.min(1, dt * 1.5));
    if (gameTime > nextSwoop) { nextSwoop = gameTime + rand(35, 70); if (Math.random() < 0.5) bird.mode = 'swoop'; }
  }
  bird.pos.x = clamp(bird.pos.x, -29, 29); bird.pos.z = clamp(bird.pos.z, -29, 29);
  const prev = m.position.clone();
  m.position.copy(bird.pos);
  const mv = m.position.clone().sub(prev); if (mv.lengthSq() > 1e-6) m.rotation.y = Math.atan2(mv.x, mv.z);
  const f = Math.sin(bird.t * 18) * 0.7;
  if (m.userData.wings.length === 2) { m.userData.wings[0].rotation.y = f * 0.6; m.userData.wings[1].rotation.y = -f * 0.6; }
}
let animOverride = null;
function flashAnim(name, dur) { animOverride = { name, until: gameTime + dur, prev: capy.anim }; capy.anim = name; capy.animT = 0; }

// Surpresas (bola rola)
function updateSurprises(dt) {
  for (const o of objects) if (o.vel) {
    o.pos.addScaledVector(o.vel, dt); o.vel.multiplyScalar(1 - dt * 1.2);
    if (!isFree(o.pos)) { o.vel.multiplyScalar(-0.6); o.pos.addScaledVector(o.vel, dt * 2); }
    o.pos.y = heightAt(o.pos.x, o.pos.z); o.mesh.position.copy(o.pos); o.mesh.rotation.x += o.vel.length() * dt * 2;
    if (o.vel.length() < 0.05) o.vel = null;
  }
}

// ---------------------------------------------------------------------
// 5a. PERCEPÇÃO: o que a capivara consegue ver (sem efeitos ocultos!)
// ---------------------------------------------------------------------
function directionWord(p) {
  const d = new THREE.Vector3(p.x - capy.pos.x, 0, p.z - capy.pos.z);
  const fwd = new THREE.Vector3(Math.sin(capy.yaw), 0, Math.cos(capy.yaw));
  const right = new THREE.Vector3(-Math.cos(capy.yaw), 0, Math.sin(capy.yaw));
  const ang = Math.atan2(d.dot(right), d.dot(fwd)) * 180 / Math.PI;
  const A = Math.abs(ang);
  if (A < 25) return 'à frente';
  if (A > 150) return 'atrás';
  const side = ang > 0 ? 'direita' : 'esquerda';
  return A < 70 ? `à frente, à ${side}` : A < 115 ? `à ${side}` : `atrás, à ${side}`;
}
function distTo(o) {
  if (o.radius) return Math.max(0, Math.hypot(capy.pos.x - o.pos.x, capy.pos.z - o.pos.z) - o.radius - 1);
  if (o.type === 'riacho') { let best = 99; for (let x = LAKE.x + LAKE.r; x < HALF; x += 1) best = Math.min(best, Math.hypot(capy.pos.x - x, capy.pos.z - streamZ(x)) - 1); return Math.max(0, best); }
  return capy.pos.distanceTo(new THREE.Vector3(o.pos.x, capy.pos.y, o.pos.z));
}
function buildPerception() {
  const visiveis = objects.map(o => ({ o, d: distTo(o) })).filter(x => x.d <= PERCEPTION_RADIUS).sort((a, b) => a.d - b.d);
  // primeiras vezes vendo algo → descoberta
  visiveis.forEach(({ o }) => discover(`ver:${o.type}`, `encontrou ${TYPES[o.type].nome}`));
  // mapa mental: guarda onde viu cada coisa fixa
  for (const { o } of visiveis) if (!TYPES[o.type].mobile && !TYPES[o.type].surprise) state.mapa[o.id] = { t: o.type, x: Math.round(o.pos.x), z: Math.round(o.pos.z) };
  const visIds = new Set(visiveis.map(v => v.o.id));
  const lembrados = Object.entries(state.mapa).filter(([id]) => !visIds.has(id) && objects.some(o => o.id === id))
    .map(([id, m]) => ({ id, m, d: Math.hypot(m.x - capy.pos.x, m.z - capy.pos.z) })).sort((a, b) => a.d - b.d).slice(0, 8);
  const crencas = Object.entries(state.crencas).filter(([k]) => TYPES[k.split(':')[1]]);
  const s = state.stats;
  const h = Math.floor(state.clock * 24), mi = Math.floor((state.clock * 24 % 1) * 60);
  const vazio = o => o.porcoes === 0 ? ' (agora sem nada comestível à vista)' : '';
  return {
    visiveis, lembrados,
    texto: [
      `Hora: ${periodName()} (${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}), dia ${state.day}.`,
      `Clima: ${raining ? 'chovendo' : isNight() ? 'noite tranquila' : 'tempo bom'}.${inCave() ? ' Você está abrigada, protegida da chuva.' : ''}${gameTime < sickUntil ? ' Você está ENJOADA, a barriga revirando.' : ''}`,
      `Seus status (0-100): fome ${s.fome | 0} (alto = faminta), sede ${s.sede | 0} (alto = sedenta), energia ${s.energia | 0} (baixo = exausta), humor ${s.humor | 0} (alto = feliz). Sensação de temperatura: ${s.frio > 70 ? 'muito frio, tremendo' : s.frio > 45 ? 'um pouco de frio' : 'confortável'}. Vontade de fazer cocô/xixi: ${s.bexiga > 85 ? 'urgente' : s.bexiga > 65 ? 'grande' : 'pouca'} (ação necessidades). Tédio: ${s.tedio > 70 ? 'muito entediada, precisa de novidade' : s.tedio > 45 ? 'um pouco entediada' : 'curiosa e entretida'}.`,
      'O que você vê ao redor (raio de 15 m):',
      ...(visiveis.length ? visiveis.map(({ o, d }) => `- id "${o.id}": ${TYPES[o.type].desc}${vazio(o)} — ${d.toFixed(1)} m, ${directionWord(o.pos)}`) : ['- nada de especial, só grama']),
      'Lugares que você lembra de ter visto (fora da vista agora; pode ir até eles pelo id):',
      ...(lembrados.length ? lembrados.map(({ id, m, d }) => `- id "${id}": ${TYPES[m.t].desc} — uns ${Math.round(d)} m, ${directionWord(new THREE.Vector3(m.x, 0, m.z))}`) : ['- nenhum ainda']),
      ...(state.temCamera ? ['Você carrega na cabeça a coisinha que guarda imagens: com a ação "fotografar" você guarda uma imagem (veja "legenda"), e com "gravar": true você filma a próxima ação para o seu vlog (veja "narracao").'] : []),
      ...(state.descobertas.some(d => d.startsWith('investigar:computador|')) ? ['Você sabe que a caixinha brilhante responde perguntas: perto dela, use a ação "pesquisar" e escreva em "pesquisa" o que quer saber.'] : []),
      ...(state.pesquisas.length ? ['O que você já leu na caixinha brilhante:', ...state.pesquisas.slice(-3).map(p => `- "${p.q}": ${p.titulo ? p.titulo + ' — ' + p.resumo.slice(0, 140) : 'nada encontrado'}`)] : []),
      'Suas experiências anteriores (quantas vezes foi bom ou ruim):',
      ...(crencas.length ? crencas.map(([k, c]) => `- ${k.split(':')[0]} ${TYPES[k.split(':')[1]].desc}: ${c.bom} vez(es) bom, ${c.ruim} vez(es) ruim`) : ['- nenhuma ainda']),
    ].join('\n'),
  };
}

// ---------------------------------------------------------------------
// 5b. CÉREBRO
// ---------------------------------------------------------------------
const PERSONALIDADE = `Você é uma capivara jovem que acabou de despertar num mundo que não conhece. Você não sabe o nome de nada: não sabe o que é "árvore", "cogumelo" ou "lago". Quando encontra algo novo, descreve o que vê, cheira e sente, ou inventa um nome simples para ele (por exemplo "bolinhas-roxas", "pedra-de-sentar", "água-que-corre") e passa a usar sempre esse mesmo nome. Você aprende experimentando: forma hipóteses ("talvez isto seja comida"), testa e tira conclusões do resultado ("as bolinhas-roxas matam a fome; vou lembrar disso"). Na maior parte do tempo seus pensamentos são observações curtas e práticas; só às vezes, sem exagero, faz uma reflexão serena sobre o que descobriu. Ama água e não tem pressa. Gosta de céu, luz, plantas, bichos pequenos e de entender por que as coisas são como são; quando encontra algo que a intriga, quer saber mais. Fale em português brasileiro, simples, sem piadas, sem gírias e sem emojis no texto. Você NÃO sabe o que é seguro ou perigoso: só sabe o que está na sua memória. Não repita frases.`;
const FORMATO = `
A cada turno você recebe sua percepção e decide UMA ação. Responda SOMENTE com JSON neste formato:
{"pensamento":"1-2 frases em 1ª pessoa: o que observa, a hipótese que vai testar ou o que concluiu, usando os nomes que você inventou; sem emojis","emoji":"exatamente um destes: 🙂 😌 😋 🤔 😮 😟 😴 🤢 😱 💧 🥶 🥱 😣 📸 💻","acao":"ir_para | comer | beber | nadar | dormir | cheirar | sentar | investigar | fugir | vagar | necessidades | pegar | fotografar | pesquisar","alvo":"id de um objeto visível ou null","aprendizado":"conclusão curta sobre a última experiência, usando seus nomes inventados (ex: \"as bolinhas-roxas são doces e matam a fome\"), ou null"}
Regras: "acao" deve ser exatamente uma das opções. "alvo" deve ser um id exatamente como aparece na percepção (ou null para vagar/fugir/dormir no lugar). Só registre "aprendizado" quando a última ação realmente te ensinou algo novo.
Campos extras (inclua sempre, use null quando não se aplicam): "pesquisa": o que você quer saber, escrito do seu jeito (só com acao "pesquisar", perto da caixinha brilhante); "legenda": uma frase curta para a imagem (só com acao "fotografar", alvo = o que você quer guardar, ou null para a paisagem). Fotografe só o que realmente chama sua atenção ou você gosta.
Se você tem a câmera na cabeça, também pode gravar vídeo para o seu vlog: "gravar": true grava a ação que você vai fazer agora, do seu ponto de vista, e "narracao" é a frase curta que você diz para a câmera enquanto grava. Grave só momentos que valem a pena mostrar (algo novo, bonito, arriscado ou engraçado); no resto, "gravar": false e "narracao": null.`;

const EMOJIS = ['🙂', '😌', '😋', '🤔', '😮', '😟', '😴', '🤢', '😱', '💧', '🥶', '🥱', '😣', '📸', '💻', '🎥'];
const memory = { keys: [], lastResult: 'Você acabou de acordar. Tudo é novo.', history: [] };
const pendingNotes = [];

// Validação: ação fora da lista, alvo inexistente ou JSON quebrado → "vagar"
function normalizeDecision(raw, perc) {
  const ok = raw && typeof raw === 'object';
  const r = ok ? raw : {};
  let acao = ACOES.includes(r.acao) ? r.acao : 'vagar';
  let alvo = typeof r.alvo === 'string' && objects.some(o => o.id === r.alvo) ? r.alvo : null;
  const precisaAlvo = ['ir_para', 'comer', 'beber', 'nadar', 'cheirar', 'sentar', 'investigar', 'pegar'];
  if (acao === 'pesquisar') alvo = pc.id;                                 // sempre no computador
  if (acao === 'fotografar' && !state.temCamera) acao = 'vagar';          // sem câmera não dá
  if (precisaAlvo.includes(acao) && !alvo) {
    // tenta achar algo visível adequado; senão, vaga
    const cand = perc.visiveis.find(({ o }) => TYPES[o.type].efeitos[acao]);
    if (cand && acao !== 'ir_para') alvo = cand.o.id; else acao = 'vagar';
  }
  return {
    pensamento: String(r.pensamento || 'Vou caminhar um pouco e observar.').slice(0, 220),
    emoji: EMOJIS.includes(r.emoji) ? r.emoji : '🤔',
    acao, alvo,
    aprendizado: r.aprendizado && r.aprendizado !== 'null' ? String(r.aprendizado).slice(0, 160) : null,
    pesquisa: typeof r.pesquisa === 'string' && r.pesquisa !== 'null' ? r.pesquisa.slice(0, 80) : null,
    legenda: typeof r.legenda === 'string' && r.legenda !== 'null' ? r.legenda.slice(0, 120) : null,
    gravar: !!r.gravar && state.temCamera,
    narracao: typeof r.narracao === 'string' && r.narracao !== 'null' ? r.narracao.slice(0, 140) : null,
  };
}

// --- Chamada à IA: escolhe o provedor configurado. Sempre devolve o JSON já parseado. ---
function callAI(system, user) { return cfg.mode === 'gemini' ? callGemini(system, user) : callDeepSeek(system, user); }
const parseJSONText = txt => JSON.parse(String(txt).replace(/^```(json)?|```$/g, '').trim());

// --- DeepSeek (API compatível com OpenAI, modo JSON, sem "thinking" para responder rápido) ---
async function callDeepSeek(system, user, timeoutMs = CALL_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.keys.deepseek },
      body: JSON.stringify({
        model: cfg.models.deepseek, temperature: 1.1, max_tokens: 600,
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return parseJSONText(data?.choices?.[0]?.message?.content || '');
  } finally { clearTimeout(timer); }
}

// --- Gemini ---
async function callGemini(system, user, timeoutMs = CALL_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const generationConfig = { responseMimeType: 'application/json', temperature: 1.0, maxOutputTokens: 600 };
    if (/2\.5/.test(cfg.models.gemini)) generationConfig.thinkingConfig = { thinkingBudget: 0 }; // resposta rápida
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.models.gemini)}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.keys.gemini },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig,
      }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    return parseJSONText(txt);
  } finally { clearTimeout(timer); }
}

// --- Cérebro offline: escolhas aleatórias coerentes com os status ---
let lastOfflineThought = '';
const offlineBad = new Set(); // tipos que deram ruim (aprendizado offline simples)
// Nomes que a capivara inventa para o que não conhece (offline). Ficam salvos para ela usar sempre o mesmo.
const NOMES = {
  arvore_frutas: ['árvore-de-bolinhas-vermelhas', 'planta-alta-de-frutinhas'], arvore: ['gigante-verde', 'planta-que-faz-sombra'],
  arbusto_amoras: ['bolinhas-roxas', 'moita-roxa'], capim_alto: ['folhas-macias', 'capim-de-cócegas'],
  arbusto_espinhos: ['moita-pontuda', 'folhas-que-espetam'], arbusto_bagas_brancas: ['pérolas-de-moita', 'bolinhas-brancas'],
  cogumelo_vermelho: ['chapéu-vermelho-pintado', 'guarda-chuva-vermelho'], cogumelo_marrom: ['chapéu-marrom', 'guarda-chuva-de-terra'],
  lago: ['água-grande', 'espelho-de-água'], riacho: ['água-que-corre', 'fio-de-água'], fonte: ['água-que-cai', 'bacia-de-pedras'],
  pedra: ['pedra-de-sentar', 'rocha-morna'], caverna: ['buraco-escuro', 'casa-de-pedra'], abrigo: ['telhado-de-galhos', 'cabana-de-folhas'],
  flores: ['cores-que-cheiram', 'pontinhos-coloridos'], passaro: ['bicho-que-voa', 'pena-azul'], pinha: ['pedra-de-escamas', 'casca-dura'], formigueiro: ['montinho-que-anda', 'morro-de-pontinhos'],
  tronco_musgo: ['tronco-macio', 'madeira-verde'], caramujo: ['casinha-espiral', 'bolinha-lenta'], ninho: ['bolinhas-azuis', 'cesto-de-gravetos'],
  teia: ['fios-brilhantes', 'rede-de-luz'], trevo: ['folhas-redondas', 'tapete-de-três'], grama_seca: ['palha-amarela', 'capim-velho'],
  grama_baixa: ['chão-verde', 'grama-curta'], computador: ['caixinha-brilhante', 'pedra-que-responde'], lagoa: ['água-pequena', 'poça-grande'], taboa: ['salsicha-do-brejo', 'capim-de-espiga'],
  cacto: ['planta-que-espeta', 'pote-de-espinhos'], samambaia: ['folha-que-curva', 'cortina-verde'], pedra_brilhante: ['pedra-de-luz', 'gelo-que-não-derrete'], gopro: ['olho-de-guardar', 'coisinha-de-clique'], coco: ['meu-cheiro', 'bolinhas-marrons'], jacare: ['boca-de-dentes', 'tronco-que-morde'],
  melancia: ['bola-listrada'], bola: ['coisa-que-rola'], caixa: ['caixa-com-laço'],
};
state.nomes ||= {};
const cap = t => t.replace(/(^|[.!?] )(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
// conclusões que o cérebro offline tira de experiências boas
const LICAO = { comer: '{n} mata a fome. Vou lembrar disso.', beber: '{n} mata a sede.', nadar: 'Dentro de {n} o corpo fica leve e o humor melhora.',
  dormir: 'Dormir em {n} devolve as forças.', sentar: 'Ficar perto de {n} acalma.', cheirar: '{n} tem um cheiro bom.', investigar: '{n} é interessante de perto.' };
const nomeDe = t => state.nomes[t] ||= pick(NOMES[t] || ['coisa-nova']);
// [pensamento quando ainda não conhece, pensamento quando já conhece, emoji]; {n} = nome inventado
const FRASES = {
  comer: [['Não sei se isto aqui se come. Vou chamar de {n} e provar um pedaço pequeno.', 'Vou comer {n} de novo. Quero ver se acontece o mesmo da outra vez.', '🤔'],
          ['A barriga pede algo. {n} tem cara de comida, mas só provando para saber.', 'Já conheço {n}. Hora de comer.', '😋']],
  beber: [['Isto parece água. Vou chamar de {n} e testar com a língua.', 'A sede voltou. {n} me ajudou antes.', '💧']],
  nadar: [['E se eu entrar em {n}? Vou testar com o corpo inteiro.', 'Quero voltar para dentro de {n}. Lá o corpo fica leve.', '😌']],
  dormir: [['O corpo está pesado. Talvez {n} seja um bom lugar para descansar.', 'Vou dormir em {n}. Da outra vez funcionou.', '😴']],
  cheirar: [['Que cheiro tem {n}? O focinho vai me contar.', 'Vou cheirar {n} de novo para comparar.', '🤔']],
  sentar: [['Vou sentar perto de {n} e só observar por um tempo.', 'Volto para {n}. Daqui o mundo parece mais calmo.', '😌']],
  investigar: [['Nunca vi isto. Vou chamar de {n} e olhar de perto.', 'Ainda não entendi tudo sobre {n}. Vou olhar de novo.', '😮']],
  vagar: [['Já vi demais por aqui. Quero saber o que existe do outro lado.', 'Fazer sempre as mesmas coisas cansa. Vou procurar algo novo.', '🥱'],
          ['Vou andar um pouco para ver o que existe além daqui.', 'Caminhar também é uma forma de aprender o lugar.', '🙂'],
          ['Ainda há cantos que eu não conheço.', 'O dia mudou de cor desde que acordei. Será que ele também está indo a algum lugar?', '🙂']],
  pegar: [['Uma coisinha preta com um olho de vidro. Vou levar comigo e descobrir para que serve.', 'Vou pegar isto.', '🤔']],
  pesquisar: [['A caixinha brilhante responde quando eu pergunto. Tenho uma dúvida.', 'Vou perguntar à caixinha sobre algo que vi hoje.', '💻'],
              ['Fico pensando no que encontrei. A caixinha talvez saiba.', 'Quero entender melhor uma coisa. Vou até a caixinha.', '💻']],
  fotografar: [['Isto aqui merece ser guardado. Vou apertar o botão.', 'Quero lembrar de {n} exatamente assim.', '📸'],
               ['A luz está bonita agora. Clique.', '{N} chamou minha atenção. Vou guardar uma imagem.', '📸']],
  necessidades: [['A barriga está pesada. Preciso de um canto tranquilo, de preferência perto da água.', 'Hora de encontrar um canto. O corpo avisa e eu obedeço.', '😣']],
  fugir: [['Algo aqui não parece seguro. Melhor me afastar e pensar depois.', 'Prefiro manter distância.', '😟']],
};
const NARR = {
  novo: ['Gravando. Encontrei {n} e nunca tentei {acao}. Vamos ver o que acontece.', 'Olha isso aqui: {n}. Vou testar com cuidado.', 'Primeira vez com {n}. Fica comigo.'],
  lindo: ['O céu está mudando de cor. Queria que alguém visse isso comigo.', 'Fim de tarde. A luz fica dourada em tudo.'],
  nadar: ['Hora do mergulho. Segura firme, câmera.', 'Vou entrar na água. É aqui que eu fico leve.'],
  jac: ['Estou filmando de longe. Aquele é o {n}. Não chego perto.'],
  pc: ['Vou perguntar uma coisa para a caixinha brilhante. Vem comigo.', 'Tenho uma dúvida. A caixinha deve saber.'],
};
const VERBO = { comer: 'comer', beber: 'beber', cheirar: 'cheirar', sentar: 'sentar', investigar: 'olhar de perto', nadar: 'nadar', pegar: 'pegar', ir_para: 'chegar perto' };
function offlineBrain(perc) {
  const s = state.stats, vis = perc.visiveis.map(v => v.o);
  // candidatos: o que vê + o que lembra (mapa mental); prefere o que já deu certo e evita o que deu errado
  const lembrados = perc.lembrados.map(l => objects.find(o => o.id === l.id)).filter(Boolean);
  const medoJac = state.crencas['perto:jacare']?.ruim > 0;            // já levou susto do jacaré
  const jacPerto = vis.includes(jac) && medoJac;
  const ok = (acao, o) => TYPES[o.type].efeitos[acao] && !ruim(acao, o.type) && o.porcoes !== 0 && !(o.type === 'lago' && jacPerto);
  const find = (acao, types) => {
    const c = [...vis, ...lembrados].filter(o => types.includes(o.type) && ok(acao, o));
    if (medoJac) c.sort((a, b) => (a.type === 'lago') - (b.type === 'lago'));   // água sem jacaré primeiro
    return c.find(o => bom(acao, o.type) && !(medoJac && o.type === 'lago')) || c[0];
  };
  let acao = 'vagar', alvo = null, opts = [];
  const pcVisto = vis.includes(pc) || state.mapa[pc.id];
  const sabePc = state.descobertas.some(d => d.startsWith('investigar:computador|'));
  // algo marcante acabou de acontecer: ela quer entender (vai perguntar à caixinha)
  const intrigada = /saltou da água|enjoo|picaram|picadas|não sobrou|contradiz|rasante|sono pesado/.test(memory.lastResult);
  const viuGoPro = gopro && (vis.includes(gopro) || state.mapa[gopro.id]);
  // momentos "fotogênicos": pôr do sol, algo que ela gosta à vista, ou algo que acabou de descobrir
  const lindo = state.clock > 0.7 && state.clock < 0.78 && !raining;
  const gosto = vis.find(o => o !== jac && Object.keys(TYPES[o.type].efeitos).some(a => bom(a, o.type)));
  if (s.bexiga > 75) acao = 'necessidades';
  else if (viuGoPro && Math.random() < 0.5) { acao = vis.includes(gopro) && Math.random() < 0.7 ? 'pegar' : 'investigar'; alvo = gopro.id; }
  else if (pcVisto && !sabePc && Math.random() < 0.4) { acao = 'investigar'; alvo = pc.id; }
  else if (pcVisto && sabePc && (s.tedio > 45 || Math.random() < (intrigada ? 0.6 : 0.2))) { acao = 'pesquisar'; alvo = pc.id; }
  else if (state.temCamera && (lindo || gosto || (vis.includes(jac) && jac.mode === 'sol')) && Math.random() < 0.3) {
    acao = 'fotografar'; alvo = lindo ? null : vis.includes(jac) && jac.mode === 'sol' ? jac.id : gosto.id;
  }
  else if (acao !== 'vagar') {}
  else if (s.frio > 65 && (alvo = find(isNight() || raining ? 'dormir' : 'sentar', ['abrigo', 'caverna', 'pedra'])?.id)) acao = isNight() || raining ? 'dormir' : 'sentar';
  else if (s.energia < 25) { const c = find('dormir', ['abrigo', 'caverna']); acao = 'dormir'; alvo = c ? c.id : null; }
  else if (s.sede > 55 && (alvo = find('beber', ['lago', 'lagoa', 'riacho', 'fonte'])?.id)) acao = 'beber';
  else if (s.fome > 55 && (alvo = find('comer', ['arvore_frutas', 'cogumelo_marrom', 'cogumelo_vermelho', 'melancia', 'arbusto_amoras', 'capim_alto', 'arbusto_espinhos', 'arbusto_bagas_brancas'])?.id)) acao = 'comer';
  else {
    for (const o of vis) for (const a of Object.keys(TYPES[o.type].efeitos)) if (ok(a, o) && !(o === jac && medoJac) && !(medoJac && o.type === 'lago' && a === 'nadar' && Math.random() < 0.8)) opts.push([a, o.id]);
    // entediada: prefere o que nunca experimentou; se não houver, vai explorar longe
    if (s.tedio > 55) { const novas = opts.filter(([a, id]) => !state.crencas[a + ':' + objects.find(o => o.id === id)?.type]); opts = novas.length ? novas : [['vagar', null]]; }
    opts.push(['vagar', null], ['vagar', null]);
    if (s.humor < 50 && s.frio < 50 && !medoJac && find('nadar', ['lago', 'lagoa'])) opts.push(['nadar', find('nadar', ['lago', 'lagoa']).id], ['nadar', find('nadar', ['lago', 'lagoa']).id]);
    if (jacPerto) opts.push(['fugir', jac.id]);
    [acao, alvo] = pick(opts);
  }
  if (acao === 'dormir' && !alvo && s.energia > 25) acao = 'vagar';
  const alvoTipo = alvo && objects.find(o => o.id === alvo)?.type;
  const [novo, visto, emoji] = pick(FRASES[acao] || FRASES.vagar);
  const conhece = alvoTipo && state.descobertas.some(d => d.startsWith(acao + ':' + alvoTipo + '|'));
  // sem alvo, as duas frases servem; nunca repete o pensamento anterior
  const opcoes = (FRASES[acao] || FRASES.vagar).flatMap(([nv, vs]) => !alvoTipo ? [nv, vs] : [conhece ? vs : nv])
    .map(t => cap(t.replaceAll('{N}', cap(alvoTipo ? nomeDe(alvoTipo) : 'isto')).replaceAll('{n}', alvoTipo ? nomeDe(alvoTipo) : 'isto')));
  if (acao === 'vagar') { const ent = s.tedio > 55; opcoes.splice(0, opcoes.length, ...(ent ? FRASES.vagar[0].slice(0, 2) : FRASES.vagar.slice(1).flatMap(f => f.slice(0, 2)))); }
  const pensamento = pick(opcoes.filter(t => t !== lastOfflineThought).length ? opcoes.filter(t => t !== lastOfflineThought) : opcoes);
  lastOfflineThought = pensamento;
  let aprendizado = null;
  const last = memory.history.at(-1) || '';
  const lastTipo = Object.keys(TYPES).find(t => last.includes(TYPES[t].nome));
  if (lastTipo && /fome diminuiu|matou|encheu|sede passou|Geladinha|limpa, fria|maravilhosa|reparador|Recuperou/.test(memory.lastResult) && Math.random() < 0.6)
    aprendizado = cap(LICAO[last.split(' ')[0].replace(':', '')]?.replaceAll('{n}', nomeDe(lastTipo)) || `${nomeDe(lastTipo)} parece bom. Vou lembrar.`);
  if (/não sobrou nada/.test(memory.lastResult) && lastTipo) aprendizado = cap(`${nomeDe(lastTipo)} acaba quando como muito. Preciso esperar crescer de novo ou procurar outro.`);
  if (/saltou da água/.test(memory.lastResult)) aprendizado = cap(`Existe um bicho de dentes escondido em ${nomeDe('lago')}. Vou chamar de ${nomeDe('jacare')}. Preciso olhar antes de chegar perto.`);
  if (lastContradiction) {
    const [a, t] = lastContradiction.key.split(':');
    aprendizado = lastContradiction.res === 'ruim'
      ? cap(`Pensei que ${a} ${nomeDe(t)} era sempre bom, mas desta vez fez mal. Nem tudo se repete igual.`)
      : cap(`${nomeDe(t)} já me fez mal, mas desta vez foi bom. Talvez dependa de algo que ainda não entendi.`);
    lastContradiction = null;
  }
  if (/enjoo/.test(memory.lastResult)) { aprendizado = `Comer ${nomeDe('cogumelo_vermelho')} me deixou enjoada. Não vou repetir.`; offlineBad.add('cogumelo_vermelho'); }
  if (/furaram|espetou/.test(memory.lastResult)) { aprendizado = cap(`${nomeDe('arbusto_espinhos')} machuca o focinho. As frutinhas amarelas não compensam.`); offlineBad.add('arbusto_espinhos'); }
  if (/sonolência/.test(memory.lastResult)) { aprendizado = cap(`${nomeDe('arbusto_bagas_brancas')} dá um sono pesado.`); offlineBad.add('arbusto_bagas_brancas'); }
  // vlog: ela grava momentos novos, bonitos, na água, de longe do jacaré ou no computador
  let gravar = false, narracao = null;
  if (state.temCamera && !['dormir', 'necessidades', 'fotografar'].includes(acao)) {
    const motivo = lindo ? 'lindo' : acao === 'nadar' ? 'nadar' : alvo === jac.id ? 'jac' : acao === 'pesquisar' ? 'pc' : alvoTipo && !conhece ? 'novo' : null;
    if (motivo && Math.random() < 0.55) {
      gravar = true;
      const nome = alvoTipo ? nomeDe(alvoTipo) : 'isto';
      narracao = cap(pick(NARR[motivo]).replaceAll('{n}', nome).replaceAll('{acao}', VERBO[acao] || acao));
    }
  }
  return { pensamento, emoji: acao === 'vagar' && s.tedio > 55 ? '🥱' : emoji, acao, alvo, aprendizado, gravar, narracao };
}

// ---------------------------------------------------------------------
// 5c. EXECUÇÃO DA AÇÃO: anda até o alvo, anima, aplica efeitos ocultos
// ---------------------------------------------------------------------
function walkTo(point, { run = false, swim = false, maxTime = 50 } = {}) {
  return new Promise(resolve => {
    capy.speed = run ? 4.5 : 2.2;
    capy.path = swim ? [point.clone()] : findPath(capy.pos, point);
    capy.anim = swim ? 'nadar' : run ? 'correr' : 'andar'; capy.animT = 0;
    let done = false;
    const fin = () => { if (!done) { done = true; capy.path = []; resolve(); } };
    capy.onArrive = fin;
    gameWait(maxTime).then(fin);
  });
}
function approachPoint(o) {
  const from = capy.pos.clone();
  if (o.radius) { const dir = from.clone().sub(o.pos).setY(0).normalize(); return new THREE.Vector3(o.pos.x + dir.x * (o.radius + 1.1), 0, o.pos.z + dir.z * (o.radius + 1.1)); }
  if (o.type === 'riacho') { let best = null, bd = 1e9; for (let x = LAKE.x + LAKE.r + 1; x < HALF - 2; x++) { const p = new THREE.Vector3(x, 0, streamZ(x) + (from.z > streamZ(x) ? 1.6 : -1.6)); const d = p.distanceTo(from); if (d < bd) { bd = d; best = p; } } return best; }
  if (o.type === 'caverna') return cave.entrance.clone();
  if (o.type === 'abrigo') return abrigo.entrance.clone();
  const dir = from.clone().sub(o.pos).setY(0); if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();
  return o.pos.clone().addScaledVector(dir, (o.block || 0) + 1.1).setY(0);
}
function faceTowards(p) { capy.yaw = Math.atan2(p.x - capy.pos.x, p.z - capy.pos.z); }
const ANIM_DUR = { comer: 3, beber: 3, nadar: 7, dormir: 10, cheirar: 2.2, espirrar: 1.6, sentar: 6, curiosa: 2.5, pular: 2.2, tremer: 2 };

function applyDeltas(d) {
  for (const k in d) state.stats[k] = clamp(state.stats[k] + d[k]);
  // o que entra, um dia sai: comer e beber enchem a bexiga/intestino
  state.stats.bexiga = clamp(state.stats.bexiga + Math.max(0, -(d.fome || 0)) * 0.35 + Math.max(0, -(d.sede || 0)) * 0.5);
}
async function executeAction(dec) {
  const o = dec.alvo ? objects.find(x => x.id === dec.alvo) : null;
  const t = o ? TYPES[o.type] : null;
  switch (dec.acao) {
    case 'necessidades': return doNecessidades();
    case 'pesquisar': return doPesquisa(dec);
    case 'fotografar': return doFoto(dec, o);
    case 'vagar': {
      // entediada, ela escolhe o ponto mais longe de tudo que já conhece (explorar); senão, passeio perto
      const longe = state.stats.tedio > 55, R = longe ? 18 : 10;
      const known = Object.values(state.mapa);
      const novidade = p => known.length ? Math.min(...known.map(m => Math.hypot(m.x - p.x, m.z - p.z))) : 0;
      let p = null, best = -1;
      for (let i = 0; i < (longe ? 12 : 20); i++) {
        const q = capy.pos.clone().add(new THREE.Vector3(rand(-R, R), 0, rand(-R, R)));
        if (!isFree(q) || Math.abs(q.x) > LIM || Math.abs(q.z) > LIM) continue;
        const v = longe ? novidade(q) : 1;
        if (v > best) { best = v; p = q; } if (!longe) break;
      }
      p ||= capy.pos.clone();
      await walkTo(p);
      return state.stats.tedio > 55 ? 'Você caminhou para um lado onde ainda não tinha ido.' : 'Você passeou um pouco sem rumo.';
    }
    case 'fugir': {
      const from = o ? o.pos : bird.pos;
      const dir = capy.pos.clone().sub(from).setY(0).normalize();
      let p = capy.pos.clone().addScaledVector(dir, 9);
      p.x = clamp(p.x, -LIM, LIM); p.z = clamp(p.z, -LIM, LIM);
      await walkTo(p, { run: true });
      return `Você saiu correndo${o ? ' para longe de ' + t.nome : ''}. Ufa, ficou segura.`;
    }
    case 'dormir':
      if (!o || !TYPES[o.type].efeitos.dormir) {
        await walkTo(capy.pos.clone()); capy.anim = 'dormir'; capy.animT = 0;
        await gameWait(ANIM_DUR.dormir);
        applyDeltas({ energia: +20, humor: raining ? -5 : 0 });
        return raining ? 'Você cochilou no meio do campo, mas a chuva te molhou toda. Recuperou só um pouco de energia.' : 'Você cochilou na grama. Recuperou um pouco de energia.';
      }
  }
  if (!o) return 'Você ficou parada sem saber o que fazer.';
  // anda até o objeto (pássaro é alvo móvel: mira onde ele está agora)
  await walkTo(o.type === 'passaro' ? new THREE.Vector3(bird.pos.x, 0, bird.pos.z) : approachPoint(o));
  faceTowards(o.pos);
  if (dec.acao === 'ir_para') return `Você chegou perto de ${t.nome}.`;
  const efeito = t.efeitos[dec.acao];
  if (dec.acao === 'comer' && o.porcoes === 0) {   // já comeu tudo daqui: só folhas e galhos
    capy.anim = 'cheirar'; capy.animT = 0; await gameWait(2);
    return `Você procurou o que comer em ${t.desc.replace(/^(um|uma) /, 'o ')}, mas não sobrou nada. Só folhas e galhos.`;
  }
  // perto da água grande o jacaré pode atacar
  if (o.type === 'lago' && (dec.acao === 'beber' || dec.acao === 'nadar') && jacareAmeaca()) {
    const r = jacareAtaca(jac); await reactAttack(); applyDeltas(r.d); lastOutcome = { key: `${dec.acao}:lago`, d: r.d, extra: 'perto:jacare' };
    return r.msg;
  }
  if (!efeito) {
    capy.anim = 'curiosa'; capy.animT = 0; await gameWait(2);
    return `Você tentou ${dec.acao} ${t.nome}, mas nada de interessante aconteceu.`;
  }
  const r = efeito(o);
  discover(`${dec.acao}:${o.type}`, DISCOVERY_TEXT[`${dec.acao}:${o.type}`] || `${dec.acao} ${t.nome}`);
  if (r.anim === 'nadar' && o.radius) {          // entra na água e dá uma voltinha
    const edge = capy.pos.clone();
    capy.swim = true; sfx('splash');
    const c = new THREE.Vector3(o.pos.x, 0, o.pos.z), sw = o.radius / 3.5;
    await walkTo(edge.clone().lerp(c, 0.55), { swim: true });
    await walkTo(c.clone().add(new THREE.Vector3(rand(-sw, sw), 0, rand(-sw, sw))), { swim: true });
    await walkTo(edge, { swim: true });
    capy.swim = false;
  } else {
    if (o.type === 'caverna' && r.anim === 'dormir') faceTowards(cave.entrance.clone().add(new THREE.Vector3(5, 0, 0)));
    if (o.type === 'abrigo' && r.anim === 'dormir') faceTowards(abrigo.entrance.clone().add(new THREE.Vector3(0, 0, 5)));
    capy.anim = r.anim; capy.animT = 0;
    await gameWait(ANIM_DUR[r.anim] * (r.anim === 'dormir' && isNight() ? 1.4 : 1));
  }
  applyDeltas(r.d);
  if (r.pickup) attachGoPro(o);
  lastOutcome = { key: `${dec.acao}:${o.type}`, d: r.d };
  if (dec.acao === 'comer' && o.porcoes > 0 && --o.porcoes === 0) {
    setFood(o, false);
    gameWait(REGROW).then(() => { o.porcoes = PORCOES[o.type]; setFood(o, true); });
  }
  if (r.remove) removeObject(o);
  return r.msg;
}

// ---- Jacaré ----
function jacareAmeaca() {
  return jac.mode === 'nadar' && gameTime > (jac.calmUntil || 0) && Math.hypot(jac.pos.x - capy.pos.x, jac.pos.z - capy.pos.z) < 8 && Math.random() < 0.55;
}
function jacareAtaca() {
  jac.mode = 'ataque'; jac.until = gameTime + 2.5; jac.calmUntil = gameTime + 120;   // depois de atacar, fica um tempo quieto
  jac.target = capy.pos.clone().lerp(jac.pos, 0.35);
  showEmoji('😱'); sfx('ataque');
  return { d: { humor: -30, energia: -10 }, msg: 'Quando você chegou perto, um bicho comprido e escuro saltou da água com a boca cheia de dentes! Você fugiu correndo, com o coração disparado.', anim: 'tremer' };
}
async function reactAttack() {
  capy.swim = false; capy.anim = 'tremer'; capy.animT = 0;
  await gameWait(0.8);
  const dir = capy.pos.clone().sub(new THREE.Vector3(LAKE.x, 0, LAKE.z)).setY(0).normalize();
  const p = capy.pos.clone().addScaledVector(dir, 9); p.x = clamp(p.x, -LIM, LIM); p.z = clamp(p.z, -LIM, LIM);
  await walkTo(p, { run: true });
}
function lakePoint(r) { const a = rand(0, 6.28); return new THREE.Vector3(LAKE.x + Math.cos(a) * r, 0, LAKE.z + Math.sin(a) * r); }
function updateJacare(dt) {
  const capyNearWater = Math.hypot(capy.pos.x - LAKE.x, capy.pos.z - LAKE.z) < LAKE.r + 4;
  if (jac.mode === 'nadar') {
    // espreita: se a capivara fica perto da margem, vai devagar na direção dela
    if (capyNearWater) { const d = capy.pos.clone().sub(new THREE.Vector3(LAKE.x, 0, LAKE.z)).setY(0); d.setLength(Math.min(d.length(), LAKE.r - 1)); jac.target.set(LAKE.x + d.x, 0, LAKE.z + d.z); }
    else if (jac.pos.distanceTo(jac.target) < 0.5 || Math.random() < 0.002) jac.target = lakePoint(rand(0, LAKE.r - 1.5));
    if (gameTime > jac.nextBask && !isNight() && !raining && !capyNearWater) {
      jac.nextBask = gameTime + rand(60, 120);
      if (Math.random() < 0.5) { jac.mode = 'sol'; jac.until = gameTime + rand(20, 35); jac.target = lakePoint(LAKE.r + 1.8); }
    }
  } else if (jac.mode === 'sol' && gameTime > jac.until) { jac.mode = 'nadar'; jac.target = lakePoint(LAKE.r - 2); }
  else if (jac.mode === 'ataque' && gameTime > jac.until) { jac.mode = 'nadar'; jac.target = lakePoint(LAKE.r - 2.5); }
  const speed = jac.mode === 'ataque' ? 9 : 0.9;
  const d = jac.target.clone().sub(jac.pos).setY(0), dist = d.length();
  if (dist > 0.05) {
    jac.pos.addScaledVector(d.normalize(), Math.min(dist, speed * dt));
    const want = Math.atan2(d.x, d.z); let dy = want - jac.mesh.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    jac.mesh.rotation.y += dy * Math.min(1, dt * 3);
  }
  const inWater = Math.hypot(jac.pos.x - LAKE.x, jac.pos.z - LAKE.z) < LAKE.r + 0.6;
  const wantY = inWater ? WATER_Y - 0.42 : heightAt(jac.pos.x, jac.pos.z);
  jac.pos.y = lerp(jac.pos.y, wantY, Math.min(1, dt * 3));
  jac.mesh.position.copy(jac.pos);
  jac.jawOpen = lerp(jac.jawOpen, jac.mode === 'ataque' ? 0.7 : 0, Math.min(1, dt * 10));
  if (jac.jaw) jac.jaw.rotation.x = jac.jawOpen;
  if (jac.tail) jac.tail.rotation.y = Math.sin(gameTime * (jac.mode === 'sol' ? 0.5 : 2)) * (jac.mode === 'sol' ? 0.05 : 0.3);
  TYPES.jacare.desc = inWater ? 'dois olhinhos e um dorso escuro e rugoso boiando na água grande' : 'um bicho comprido, escuro e escamoso, deitado imóvel na margem da água grande';
}
// ---------------------------------------------------------------------
// COMPUTADOR: pesquisa na Wikipédia (sem chave, funciona no navegador).
// Sem internet (ou no artifact do claude.ai), usa uma pequena enciclopédia embutida.
// ---------------------------------------------------------------------
const ENCICLOPEDIA = [
  [['capivara'], 'Capivara', 'A capivara é o maior roedor do mundo. Vive perto de rios e lagos, nada muito bem e passa boa parte do dia descansando e pastando.'],
  [['jacaré', 'dentes', 'água'], 'Jacaré', 'Jacarés são répteis que vivem em rios, lagos e brejos. Ficam quase submersos, com só os olhos e as narinas para fora, esperando presas que chegam para beber.'],
  [['formiga', 'montinho', 'pontinhos'], 'Formiga', 'Formigas vivem em colônias organizadas. Algumas espécies picam e soltam ácido fórmico para defender o ninho.'],
  [['teia', 'aranha', 'fios'], 'Teia de aranha', 'A teia é feita de seda produzida pela própria aranha. O fio é muito fino, mas proporcionalmente mais resistente que o aço.'],
  [['caramujo', 'espiral', 'concha'], 'Caramujo', 'Caramujos são moluscos que carregam uma concha em espiral. Recolhem-se nela quando se sentem ameaçados.'],
  [['cogumelo', 'chapéu', 'pintas'], 'Amanita muscaria', 'É um cogumelo de chapéu vermelho com pintas brancas. É bonito, mas venenoso: causa enjoo e mal-estar se for comido.'],
  [['trevo', 'três folhas'], 'Trevo', 'O trevo é uma planta baixa de folhas divididas em três. É comida apreciada por muitos herbívoros.'],
  [['amora', 'roxa'], 'Amora', 'A amora é um fruto pequeno, escuro e doce, formado por várias bolinhas unidas.'],
  [['pinha', 'escamas'], 'Pinha', 'A pinha é a estrutura onde ficam as sementes do pinheiro. É dura e lenhosa.'],
  [['ninho', 'pássaro', 'ovo'], 'Ninho', 'Pássaros constroem ninhos com gravetos e folhas para chocar os ovos. Os pais defendem o ninho de qualquer bicho que se aproxima.'],
  [['noite', 'escuro', 'estrela', 'céu'], 'Noite', 'A noite acontece quando o lado da Terra onde estamos fica de costas para o Sol. Sem a luz dele, dá para ver as estrelas.'],
  [['chuva', 'nuvem'], 'Chuva', 'A chuva é água que evapora, forma nuvens e volta a cair quando as gotas ficam pesadas.'],
  [['vaga-lume', 'luzinha', 'luz'], 'Vaga-lume', 'Vaga-lumes produzem luz no próprio corpo para se comunicar, principalmente para encontrar parceiros à noite.'],
  [['foto', 'imagem', 'câmera'], 'Fotografia', 'Fotografia é guardar a luz de um momento. A primeira foto conhecida foi feita em 1826 e precisou de horas de exposição.'],
  [['sol', 'pôr', 'tarde'], 'Pôr do sol', 'No fim da tarde a luz do Sol atravessa mais ar até chegar aos olhos, e por isso o céu fica laranja e vermelho.'],
  [['cacto', 'espinho'], 'Cactaceae', 'Cactos guardam água dentro do caule grosso e têm espinhos no lugar das folhas, o que os protege de bichos com sede.'],
  [['taboa', 'espiga', 'brejo'], 'Taboa', 'A taboa cresce em brejos e beiras de lagoa. Tem folhas longas e uma espiga marrom; sua base é macia e comestível.'],
  [['samambaia'], 'Samambaia', 'Samambaias são plantas antigas, que existem há mais de 300 milhões de anos. Gostam de sombra e umidade.'],
  [['cristal', 'quartzo', 'pedra transparente'], 'Quartzo', 'O quartzo é um mineral transparente que se forma em cristais de seis lados. Quando a luz o atravessa, pode se separar em cores.'],
  [['lagoa', 'poça'], 'Lagoa', 'Lagoas são corpos de água rasos e parados, cheios de plantas e pequenos animais.'],
  [['frio', 'temperatura'], 'Hipotermia', 'Animais perdem calor mais rápido quando estão molhados ou no vento. Abrigar-se e ficar seco ajuda a manter a temperatura.'],
];
const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
async function pesquisarWeb(q) {
  const ctrl = new AbortController(), tm = setTimeout(() => ctrl.abort(), 8000);
  try {
    const busca = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json&origin=*`, { signal: ctrl.signal }).then(r => r.json());
    const titulo = busca?.query?.search?.[0]?.title;
    if (!titulo) return { titulo: null, resumo: '', fonte: 'Wikipédia' };
    const res = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo.replace(/ /g, '_'))}`, { signal: ctrl.signal }).then(r => r.json());
    const frases = (res.extract || '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
    return { titulo, resumo: frases.slice(0, 340), fonte: 'Wikipédia' };
  } catch {
    const nq = norm(q), hit = ENCICLOPEDIA.find(([ks]) => ks.some(k => nq.includes(norm(k))));
    return hit ? { titulo: hit[1], resumo: hit[2], fonte: 'memória da caixinha (sem internet)' } : { titulo: null, resumo: '', fonte: 'sem internet' };
  } finally { clearTimeout(tm); }
}
// o que ela pesquisaria sozinha (modo offline): coisas que viveu ou que a intrigam
const PERGUNTAS = { jacare: 'jacaré', formigueiro: 'formiga', teia: 'teia de aranha', caramujo: 'caramujo', cogumelo_vermelho: 'cogumelo vermelho com pintas brancas',
  trevo: 'trevo', arbusto_amoras: 'amora', cacto: 'cacto', taboa: 'taboa', samambaia: 'samambaia', pedra_brilhante: 'cristal de quartzo', lagoa: 'lagoa', pinha: 'pinha', ninho: 'ninho de pássaro', lago: 'por que a água do lago é calma' };
const CURIOSIDADES = ['capivara', 'por que fica escuro à noite', 'de onde vem a chuva', 'por que o céu fica laranja no fim da tarde', 'vaga-lume', 'como guardar imagens'];
function perguntaOffline() {
  const vividos = [...new Set(memory.keys.map(k => k.split(':')[1]))].filter(t => PERGUNTAS[t] && !state.pesquisas.some(p => p.q === PERGUNTAS[t]));
  const pool = vividos.length ? vividos.map(t => PERGUNTAS[t]) : CURIOSIDADES.filter(q => !state.pesquisas.some(p => p.q === q));
  return pick(pool.length ? pool : CURIOSIDADES);
}
async function doPesquisa(dec) {
  await walkTo(approachPoint(pc));
  faceTowards(pc.pos);
  capy.anim = 'digitar'; capy.animT = 0;
  const q = dec.pesquisa || perguntaOffline();
  const [r] = await Promise.all([pesquisarWeb(q), gameWait(3)]);
  state.pesquisas.push({ q, titulo: r.titulo, resumo: r.resumo }); state.pesquisas = state.pesquisas.slice(-12);
  // entrada estilo terminal no log
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  state.log.push({ t: `Dia ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} · caixinha-brilhante`, pc: true, acao: 'pesquisar',
    pensamento: `> ${q}\n${r.titulo ? `[${r.titulo}] ${r.resumo}` : 'Nenhum resultado.'}\n(${r.fonte})` });
  renderLog(true);
  discover('pesquisar:computador', 'perguntar à caixinha brilhante');
  lastOutcome = { key: 'pesquisar:computador', d: { humor: r.titulo ? 6 : 0 }, };
  applyDeltas({ humor: r.titulo ? +6 : 0, tedio: r.titulo ? -20 : -5 });
  return r.titulo ? `Você perguntou à caixinha brilhante "${q}" e ela mostrou: ${r.titulo}. ${r.resumo}` : `Você perguntou à caixinha brilhante "${q}", mas ela não mostrou nada.`;
}

// ---------------------------------------------------------------------
// CÂMERA (GoPro na cabeça): renderiza o ponto de vista dela e guarda a foto
// ---------------------------------------------------------------------
const FOTO_KEY = 'capivara_explora_fotos';
let fotos = safeJSON(lsGet(FOTO_KEY)) || [];
const goproCam = new THREE.PerspectiveCamera(80, 4 / 3, 0.1, 150);
const photoCanvas = document.createElement('canvas'); photoCanvas.width = 400; photoCanvas.height = 300;
function attachGoPro(o) {
  state.temCamera = true;
  if (o) { const i = objects.indexOf(o); if (i >= 0) objects.splice(i, 1); scene.remove(o.mesh); delete state.mapa[o.id]; }
  const g = MK.gopro(); g.scale.setScalar(1.3);
  g.position.set(0, 0.27, 0.12);       // em cima da cabeça, lente para frente
  g.traverse(m => m.layers.set(1));    // só a câmera principal vê a GoPro; a própria GoPro não aparece no vlog
  capy.parts.head.add(g);
  gopro = null;
}
function takePhoto(alvoPos, legenda) {
  const head = capy.parts.head.getWorldPosition(new THREE.Vector3());
  const fwd = new THREE.Vector3(Math.sin(capy.yaw), 0, Math.cos(capy.yaw));
  goproCam.position.copy(head).addScaledVector(fwd, 0.55).add(new THREE.Vector3(0, 0.3, 0));
  goproCam.lookAt(alvoPos || goproCam.position.clone().addScaledVector(fwd, 10).add(new THREE.Vector3(0, 1.2, 0)));
  goproCam.aspect = canvas.width / canvas.height; goproCam.updateProjectionMatrix();
  renderer.render(scene, goproCam);   // lê o canvas logo em seguida, no mesmo quadro
  const cw = canvas.width, ch = canvas.height, sw = Math.min(cw, ch * 4 / 3), sh = sw * 3 / 4;
  photoCanvas.getContext('2d').drawImage(canvas, (cw - sw) / 2, (ch - sh) / 2, sw, sh, 0, 0, 400, 300);
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  fotos.push({ url: photoCanvas.toDataURL('image/jpeg', 0.72), legenda, t: `Dia ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` });
  for (;;) { try { localStorage.setItem(FOTO_KEY, JSON.stringify(fotos.slice(-24))); break; } catch { if (fotos.length <= 1) break; fotos.shift(); } }
  fotos = fotos.slice(-24);
  const fl = $('flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
  sfx('clique'); renderPhotos();
}
const LEGENDAS = ['{N}, do jeito que eu vi hoje.', '{N}. Quero lembrar disso.', 'Encontrei {n} e precisei guardar.', '{N} sob esta luz.'];
async function doFoto(dec, o) {
  let alvoPos = null, nome = 'a paisagem';
  if (o) {
    nome = nomeDe(o.type);
    alvoPos = o.pos.clone().add(new THREE.Vector3(0, 0.4, 0));
    const dist = distTo(o);
    if (dist > 6 || dist < 2) {   // enquadra: nem longe demais nem colado
      const dir = capy.pos.clone().sub(alvoPos).setY(0).normalize();
      await walkTo((o.radius ? approachPoint(o) : alvoPos.clone().addScaledVector(dir, 3.2 + (o.block || 0))).setY(0));
    }
    faceTowards(alvoPos);
  }
  capy.anim = 'curiosa'; capy.animT = 0; showEmoji('📸');
  await gameWait(1.2);
  const legenda = dec.legenda || cap(pick(LEGENDAS).replace('{N}', cap(nome)).replace('{n}', nome));
  takePhoto(alvoPos, legenda);
  discover('fotografar:' + (o?.type || 'paisagem'), 'guardar uma imagem');
  applyDeltas({ humor: +4, tedio: -10 });
  return `Você apertou o botão e guardou uma imagem de ${nome}. "${legenda}"`;
}

// ---------------------------------------------------------------------
// VLOG: ela mesma grava, pela câmera na cabeça, em vídeo vertical 9:16.
// Um segundo renderizador (360x640) desenha o ponto de vista da GoPro; um canvas 2D
// por cima põe "REC", data e a narração; o MediaRecorder grava esse canvas.
// Os clipes ficam no IndexedDB deste aparelho (aba 🎬 Vlog).
// ---------------------------------------------------------------------
const VW = 360, VH = 640;
const vlogGL = document.createElement('canvas'); vlogGL.width = VW; vlogGL.height = VH;
const vlogComp = document.createElement('canvas'); vlogComp.width = VW; vlogComp.height = VH;
const vctx = vlogComp.getContext('2d');
const vlogCam = new THREE.PerspectiveCamera(88, VW / VH, 0.05, 150);
const qFlip = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, Math.PI, 0));
let vlogRenderer = null;
const rec = { on: false, stopping: false, recorder: null, chunks: [], narr: '', fim: '', t0: 0, until: 0, last: 0, thumb: null, meta: null };
const VLOG_MIME = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  .find(m => window.MediaRecorder?.isTypeSupported?.(m));
function startClip(narr) {
  if (rec.on || !state.temCamera || !VLOG_MIME || !vlogComp.captureStream) return false;
  try {
    vlogRenderer ||= new THREE.WebGLRenderer({ canvas: vlogGL, antialias: false, preserveDrawingBuffer: true });
    vlogRenderer.setPixelRatio(1); vlogRenderer.setSize(VW, VH, false);
    const stream = vlogComp.captureStream(24);
    rec.recorder = new MediaRecorder(stream, { mimeType: VLOG_MIME, videoBitsPerSecond: 1500000 });
  } catch (e) { console.warn('vlog indisponível', e); return false; }
  rec.chunks = []; rec.narr = narr || ''; rec.fim = ''; rec.thumb = null;
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  rec.meta = { dia: state.day, t: `Dia ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
  rec.recorder.ondataavailable = e => e.data.size && rec.chunks.push(e.data);
  rec.recorder.onstop = () => {
    const blob = new Blob(rec.chunks, { type: VLOG_MIME.split(';')[0] });
    saveClip({ id: Date.now(), ...rec.meta, narr: rec.narr, fim: rec.fim, thumb: rec.thumb, blob });
  };
  rec.recorder.start(500);
  rec.on = true; rec.stopping = false; rec.t0 = performance.now(); rec.until = rec.t0 + 20000; rec.last = 0;
  vlogCam.position.copy(capy.pos).add(new THREE.Vector3(0, 1.2, 0));
  $('hud-rec').hidden = false;
  return true;
}
// termina a gravação 2 s depois do fim da ação, mostrando o que aconteceu
function endClip(resultado) {
  if (!rec.on || rec.stopping) return;
  rec.stopping = true;
  rec.fim = (resultado || '').split(/(?<=[.!?])\s/)[0].slice(0, 110);
  setTimeout(() => { if (rec.on) { rec.recorder.stop(); rec.on = false; $('hud-rec').hidden = true; } }, 2200);
}
const tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3(), tmpE = new THREE.Euler();
function wrapText(text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (vctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function renderVlogFrame(now) {
  if (!rec.on) return;
  if (now > rec.until) endClip('');
  if (now - rec.last < 1000 / 24) return;
  rec.last = now;
  // câmera presa na cabeça: segue cada movimento (balança andando, olha pra baixo comendo)
  const head = capy.parts.head; head.updateWorldMatrix(true, false);
  head.localToWorld(tmpP.set(0, 0.42, 0.3));   // logo à frente da lente
  head.getWorldQuaternion(tmpQ).multiply(qFlip);
  tmpE.setFromQuaternion(tmpQ, 'YXZ'); tmpE.z *= 0.35; tmpQ.setFromEuler(tmpE);   // estabilização: corta 65% da inclinação lateral
  vlogCam.position.lerp(tmpP, 0.6); vlogCam.quaternion.slerp(tmpQ, 0.45);
  vlogRenderer.render(scene, vlogCam);
  vctx.drawImage(vlogGL, 0, 0);
  // sobreposição estilo vlog
  vctx.textBaseline = 'top';
  if (Math.floor((now - rec.t0) / 500) % 2 === 0) { vctx.fillStyle = '#ff3b3b'; vctx.beginPath(); vctx.arc(26, 30, 8, 0, 7); vctx.fill(); }
  vctx.font = '800 17px system-ui, sans-serif'; vctx.fillStyle = '#fff'; vctx.shadowColor = 'rgba(0,0,0,.6)'; vctx.shadowBlur = 4;
  vctx.fillText('REC', 40, 21);
  const ts = rec.meta.t.toUpperCase(); vctx.fillText(ts, VW - 16 - vctx.measureText(ts).width, 21);
  vctx.shadowBlur = 0;
  const texto = rec.stopping && rec.fim ? rec.fim : rec.narr;
  if (texto) {
    vctx.font = (rec.stopping && rec.fim ? 'italic 600 ' : '700 ') + '19px system-ui, sans-serif';
    const lines = wrapText(texto, VW - 56), lh = 25, boxH = lines.length * lh + 20, y0 = VH - 70 - boxH;
    vctx.fillStyle = 'rgba(15,17,30,.62)'; vctx.beginPath(); vctx.roundRect(16, y0, VW - 32, boxH, 14); vctx.fill();
    vctx.fillStyle = rec.stopping && rec.fim ? '#ffe39a' : '#fff';
    lines.forEach((l, i) => vctx.fillText(l, 28, y0 + 10 + i * lh));
  }
  if (!rec.thumb && now - rec.t0 > 600) rec.thumb = vlogComp.toDataURL('image/jpeg', 0.6);
}
// ---- armazenamento dos clipes (IndexedDB) ----
const idb = (() => {
  let dbp = null;
  const open = () => dbp ||= new Promise((res, rej) => { const r = indexedDB.open('capivara_vlog', 1); r.onupgradeneeded = () => r.result.createObjectStore('clipes', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('clipes', mode), st = t.objectStore('clipes'); const out = fn(st); t.oncomplete = () => res(out?.result); t.onerror = () => rej(t.error); }); };
  return { put: c => tx('readwrite', st => st.put(c)), all: () => tx('readonly', st => st.getAll()), del: id => tx('readwrite', st => st.delete(id)), clear: () => tx('readwrite', st => st.clear()) };
})();
let clipes = [];
async function saveClip(c) {
  try {
    await idb.put(c);
    clipes = (await idb.all()).sort((a, b) => a.id - b.id);
    while (clipes.length > 24) { await idb.del(clipes[0].id); clipes.shift(); }
  } catch (e) { console.warn('não deu para salvar o clipe', e); clipes.push(c); }
  renderVlog();
}
const urls = new Map();
const clipUrl = c => urls.get(c.id) || (urls.set(c.id, URL.createObjectURL(c.blob)), urls.get(c.id));
function renderVlog() {
  const el = $('vlog-list');
  if (!clipes.length) {
    el.innerHTML = `<p class="hint">${!VLOG_MIME ? 'Este navegador não consegue gravar vídeo.' : state.temCamera ? 'Ela ainda não gravou nenhum momento. Quando achar algo que vale mostrar, ela mesma liga a câmera.' : 'Quando ela pegar a câmera, poderá gravar a própria vida para o vlog.'}</p>`;
    return;
  }
  const dias = [...new Set(clipes.map(c => c.dia))].sort((a, b) => b - a);
  el.innerHTML = dias.map(d => {
    const cs = clipes.filter(c => c.dia === d);
    return `<section class="vday"><div class="vhead"><h4>Dia ${d} · ${cs.length} ${cs.length > 1 ? 'clipes' : 'clipe'}</h4><button data-dia="${d}">Assistir o dia</button></div>
      ${cs.map(c => `<div class="clip"><img src="${c.thumb || ''}" alt="" data-id="${c.id}"><div><b>${esc(c.t)}</b><p>${esc(c.narr || '')}</p>
      <button class="dl" data-dl="${c.id}">Baixar vídeo</button></div></div>`).join('')}</section>`;
  }).join('');
}
// player: toca um clipe ou o dia inteiro em sequência
let fila = [];
function tocar(lista) {
  fila = lista.slice(); if (!fila.length) return;
  $('player').classList.remove('hidden'); proximo();
}
function proximo() {
  const c = fila.shift(); const v = $('player-video');
  if (!c) { $('player').classList.add('hidden'); v.pause(); return; }
  v.src = clipUrl(c); v.play().catch(() => {});
}
// Baixar: no claude.ai usa o recurso de download do artifact; fora dele, o download comum do navegador
let downloadsP = null;
async function baixarClipe(c, btn) {
  if (!c) return;
  const ext = c.blob.type.includes('mp4') ? 'mp4' : 'webm', filename = `capivara-dia${c.dia}-${c.id}.${ext}`;
  downloadsP ||= window.claude?.use ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
  const dl = await downloadsP;
  if (dl) {
    try { await dl.save({ filename, data: c.blob }); btn.textContent = 'Salvo'; }
    catch (e) { btn.textContent = e?.code === 'declined' ? 'Baixar vídeo' : 'Não foi possível salvar aqui'; }
    return;
  }
  const a = document.createElement('a'); a.href = clipUrl(c); a.download = filename; document.body.append(a); a.click(); a.remove();
}
function initVlogUI() {
  $('player-video').onended = proximo;
  $('player').onclick = e => { if (e.target.id === 'player') { fila = []; proximo(); } };
  $('vlog-list').onclick = e => {
    const d = e.target.dataset.dia, id = e.target.dataset.id;
    if (d) tocar(clipes.filter(c => c.dia === +d));
    if (id) tocar(clipes.filter(c => c.id === +id));
    if (e.target.dataset.dl) baixarClipe(clipes.find(c => c.id === +e.target.dataset.dl), e.target);
  };
  idb.all().then(cs => { clipes = (cs || []).sort((a, b) => a.id - b.id); renderVlog(); }).catch(() => renderVlog());
}

// Fazer cocô e xixi: procura um canto (de preferência perto de água, como capivaras de verdade)
async function doNecessidades() {
  const medo = state.crencas['perto:jacare']?.ruim > 0;
  const agua = objects.filter(o => (o.type === 'riacho' || o.type === 'lagoa' || (o.type === 'lago' && !medo)) && distTo(o) < 18).sort((a, b) => distTo(a) - distTo(b))[0];
  let p = agua ? approachPoint(agua) : null;
  if (p && agua.radius) p.lerp(capy.pos, 0.25);
  if (!p) { for (let i = 0; i < 15; i++) { const q = capy.pos.clone().add(new THREE.Vector3(rand(-6, 6), 0, rand(-6, 6))); if (isFree(q)) { p = q; break; } } }
  await walkTo(p || capy.pos.clone());
  capy.anim = 'agachar'; capy.animT = 0;
  await gameWait(3.2);
  const back = new THREE.Vector3(-Math.sin(capy.yaw), 0, -Math.cos(capy.yaw)).multiplyScalar(0.75);
  const pos = capy.pos.clone().add(back);
  const poop = addObject('coco', pos.x, pos.z, MK.coco);
  const pee = new THREE.Mesh(new THREE.CircleGeometry(0.32, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4a3a1c, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  pee.position.set(pos.x + 0.15, heightAt(pos.x, pos.z) + 0.03, pos.z); scene.add(pee);
  gameWait(60).then(() => scene.remove(pee));
  gameWait(200).then(() => removeObject(poop));
  const urg = state.stats.bexiga;
  state.stats.bexiga = 0; applyDeltas({ humor: urg > 85 ? +10 : +5 });
  lastOutcome = { key: 'necessidades:coco', d: { humor: 5 } };
  discover('necessidades:coco', 'fazer as necessidades');
  sfx('xixi');
  return `Você encontrou um canto${agua ? ' perto da água' : ''} e fez suas necessidades. ${urg > 85 ? 'Estava segurando há muito tempo. Que alívio enorme.' : 'Que alívio.'}`;
}
function removeObject(o) {
  const i = objects.indexOf(o); if (i >= 0) objects.splice(i, 1);
  delete state.mapa[o.id];
  if (o.mesh) scene.remove(o.mesh);
  // cogumelos renascem depois de um tempo, num lugar próximo
  if (!TYPES[o.type].surprise && !TYPES[o.type].temp) gameWait(90).then(() => {
    const x = clamp(o.pos.x + rand(-3, 3), -LIM, LIM), z = clamp(o.pos.z + rand(-3, 3), -LIM, LIM);
    const p = new THREE.Vector3(x, 0, z);
    if (isFree(p)) addObject(o.type, x, z, MK[o.type]);
  });
}

// Confiança: cada experiência conta como boa ou ruim; contradições viram nota para o próximo ciclo
let lastContradiction = null;
function updateBelief({ key, d, extra }) {
  const score = -(d.fome || 0) - (d.sede || 0) + (d.energia || 0) + (d.humor || 0);
  const res = score > 3 ? 'bom' : score < -3 ? 'ruim' : null;
  if (!res) return null;
  const keys = [key, extra].filter(Boolean);
  let note = null;
  for (const k of keys) {
    const c = state.crencas[k] ||= { bom: 0, ruim: 0 };
    const antes = res === 'ruim' ? c.bom : c.ruim;
    c[res]++;
    if (k === key && antes >= 1 && c[res] === 1) {
      lastContradiction = { key, res };
      note = res === 'ruim' ? 'Isso contradiz o que você esperava: das outras vezes tinha sido bom.' : 'Curioso: das outras vezes isso tinha feito mal, mas desta vez foi bom.';
    }
  }
  renderMemory();
  return note;
}
const confianca = c => (c.bom + 1) / (c.bom + c.ruim + 2);   // 0..1, começa em 0,5 (incerteza)
const ruim = (a, t) => { const c = state.crencas[a + ':' + t]; return c && confianca(c) < 0.4; };
const bom = (a, t) => { const c = state.crencas[a + ':' + t]; return c && confianca(c) > 0.6; };

async function writeDiary() {
  const dia = state.day, hoje = state.log.filter(e => e.t?.startsWith(`Dia ${dia} `) && !e.diario);
  let texto = null;
  if (hasBrain()) {
    try {
      const r = await callAI(PERSONALIDADE + '\nAgora escreva seu diário. Responda JSON: {"diario":"texto"}',
        `É o fim do dia ${dia}. Escreva um diário curto (3-5 frases), em 1ª pessoa, em tom calmo de diário de campo, usando os nomes que você inventou. Conte o que experimentou, o que aprendeu, o que ainda não entende, e termine com uma reflexão breve.\nPensamentos de hoje:\n- ${hoje.map(e => e.pensamento).join('\n- ')}\nAprendizados:\n- ${state.aprendizados.slice(-6).join('\n- ')}`);
      if (r?.diario) texto = String(r.diario).slice(0, 700);
    } catch {}
  }
  if (!texto) {   // versão offline: monta a partir do que aconteceu
    const feitos = [...new Set(hoje.filter(e => e.alvo).map(e => `${e.acao.replace('_', ' ')} ${nomeDe(e.alvo.replace(/_\d+$/, ''))}`))].slice(0, 4);
    const aprend = hoje.filter(e => e.aprendizado).map(e => e.aprendizado.replace(/\.$/, '').toLowerCase()).slice(0, 2);
    const duvidas = Object.entries(state.crencas).filter(([, c]) => c.bom && c.ruim).map(([k]) => nomeDe(k.split(':')[1]));
    texto = [
      `Dia ${dia}.`,
      feitos.length ? `Hoje experimentei ${feitos.join(', ')}.` : 'Hoje andei mais do que experimentei.',
      aprend.length ? `Aprendi que ${aprend.join(' e que ')}.` : 'Ainda não tirei grandes conclusões.',
      duvidas.length ? `Ainda não entendo por que ${duvidas[0]} às vezes faz bem e às vezes faz mal.` : '',
      pick(['A luz está indo embora devagar. Amanhã quero ir além de onde fui hoje.', 'O céu escurece e os sons mudam. Cada dia este lugar parece um pouco maior.', 'Talvez aprender seja só isso: tentar, lembrar e tentar de novo.']),
    ].filter(Boolean).join(' ');
  }
  state.diario.push({ dia, texto });
  state.log.push({ t: `Dia ${dia} · diário`, diario: true, pensamento: texto, acao: 'diário' });
  renderLog(false); renderDiary(); save();
}

// ---------------------------------------------------------------------
// 5d. MEMÓRIA: aprendizados + resumo quando passar de 20
// ---------------------------------------------------------------------
async function maybeSummarizeMemory() {
  if (state.aprendizados.length <= 20) return;
  let novo = null;
  if (hasBrain()) {
    try {
      const r = await callAI('Você resume a memória de uma capivara exploradora. Responda JSON: {"aprendizados":["..."]}',
        `Resuma estes aprendizados em no máximo 10 itens curtos, juntando repetidos e mantendo os mais úteis (o que é bom, o que é perigoso, onde ficam as coisas):\n- ${state.aprendizados.join('\n- ')}`);
      if (Array.isArray(r.aprendizados)) novo = r.aprendizados.slice(0, 10).map(String);
    } catch {}
  }
  state.aprendizados = novo || [...new Set(state.aprendizados)].slice(-10);
  renderMemory();
}

// ---------------------------------------------------------------------
// 5e. O LOOP DE IA
//   Uma única corrotina async: nunca há duas chamadas ao mesmo tempo,
//   porque cada ciclo espera (await) a resposta E a execução da ação
//   antes de começar o próximo.
//
//   ┌─> monta PERCEPÇÃO (só descrições visuais, distância, direção, clima, status)
//   │   monta PROMPT (personalidade + percepção + memória + último resultado + últimas 5 ações)
//   │   chama o cérebro (DeepSeek ou Gemini, timeout 10 s; falhou → offline nesse ciclo)
//   │   VALIDA a resposta (ação/alvo inválidos → vagar)
//   │   mostra o pensamento no log e o emoji sobre a cabeça
//   │   EXECUTA a ação → efeitos ocultos → texto do resultado
//   │   guarda resultado + histórico + aprendizado
//   └── espera o intervalo mínimo de 4 s desde a última chamada
// ---------------------------------------------------------------------
let brainStatus = '', brainState = 'off';   // ok | falha | off (indicador no canto do mundo)
// Traduz erros de API para português
function apiErro(e) {
  const m = String(e?.message || e);
  if (e?.name === 'AbortError') return 'sem resposta em 10 s';
  if (/HTTP 40[13]/.test(m)) return 'chave recusada (inválida ou sem permissão)';
  if (/HTTP 402/.test(m)) return 'conta sem saldo';
  if (/HTTP 429/.test(m)) return 'limite de uso atingido, tente mais tarde';
  if (/HTTP 404/.test(m)) return 'modelo não encontrado (confira o nome)';
  if (/HTTP 400/.test(m)) return 'pedido recusado (confira o nome do modelo)';
  if (/HTTP 5/.test(m)) return 'o servidor da IA está com problema';
  if (e instanceof SyntaxError) return 'respondeu, mas não em JSON';
  if (e instanceof TypeError) return 'não conectou: sem internet ou bloqueado pelo navegador (no claude.ai as APIs são bloqueadas)';
  return m;
}
async function aiLoop() {
  let lastCall = 0;
  while (true) {
    while (paused) await new Promise(r => setTimeout(r, 200));
    const wait = MIN_CALL_INTERVAL - (performance.now() - lastCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    while (paused) await new Promise(r => setTimeout(r, 200));

    // 0) DIÁRIO: ao anoitecer, escreve um resumo do dia (antes da próxima decisão)
    if (pendingDiary) { pendingDiary = false; await writeDiary(); }

    // 1) PERCEPÇÃO
    const perc = buildPerception();
    if (pendingNotes.length) { memory.lastResult += ' ' + pendingNotes.join(' '); pendingNotes.length = 0; }
    const prompt = [
      'PERCEPÇÃO:', perc.texto, '',
      'MEMÓRIA (o que você já aprendeu):', state.aprendizados.length ? state.aprendizados.map(a => '- ' + a).join('\n') : '- (ainda nada, tudo é novidade)', '',
      'RESULTADO DA ÚLTIMA AÇÃO:', memory.lastResult, '',
      'SUAS ÚLTIMAS AÇÕES:', memory.history.length ? memory.history.slice(-5).map((h, i) => `${i + 1}. ${h}`).join('\n') : '(nenhuma)', '',
      'Decida sua próxima ação. Responda só com o JSON.',
    ].join('\n');

    // 2) CÉREBRO
    lastCall = performance.now();
    let raw, fonte = 'offline';
    if (hasBrain()) {
      const nome = PROVIDERS[cfg.mode];
      try { raw = await callAI(PERSONALIDADE + '\n' + FORMATO, prompt); fonte = 'ia'; brainStatus = `🟢 ${nome} respondeu`; brainState = 'ok'; }
      catch (e) { raw = offlineBrain(perc); brainStatus = `🟠 ${nome} falhou: ${apiErro(e)}. Usei o cérebro offline.`; brainState = 'falha'; }
    } else { raw = offlineBrain(perc); brainState = 'off'; brainStatus = cfg.mode === 'offline' ? '⚪ Cérebro offline' : `⚪ Sem chave do ${PROVIDERS[cfg.mode]} — cérebro offline`; }

    // 3) VALIDAÇÃO
    const dec = normalizeDecision(raw, perc);
    if (gameTime < sickUntil) dec.emoji = '🤢'; // enjoo força o emoji
    if (dec.aprendizado && !state.aprendizados.includes(dec.aprendizado)) state.aprendizados.push(dec.aprendizado);
    showThought(dec, fonte);

    const eraNova = dec.alvo && !state.descobertas.some(d => d.startsWith(dec.acao + ':' + (objects.find(o => o.id === dec.alvo)?.type) + '|'));
    // 4) EXECUÇÃO + efeitos ocultos
    let resultado;
    const gravando = dec.gravar && startClip(dec.narracao || dec.pensamento);
    try { resultado = await executeAction(dec); } catch (e) { console.error(e); resultado = 'Você se distraiu.'; }
    if (gravando) { endClip(resultado); discover('gravar:vlog', 'gravar o próprio vlog'); }
    capy.anim = 'idle'; capy.swim = false;
    if (lastOutcome) { const note = updateBelief(lastOutcome); if (note) resultado += ' ' + note; lastOutcome = null; }
    memory.lastResult = resultado;
    const alvoNome = dec.alvo ? (TYPES[objects.find(o => o.id === dec.alvo)?.type]?.nome || dec.alvo) : '';
    memory.history.push(`${dec.acao}${alvoNome ? ' → ' + alvoNome : ''}: ${resultado}`);
    memory.history = memory.history.slice(-5);
    const tipoAlvo = objects.find(o => o.id === dec.alvo)?.type || (dec.alvo || '').replace(/_\d+$/, '');
    const chave = dec.acao + ':' + tipoAlvo;
    const repetiu = memory.keys.slice(-4).filter(k => k === chave).length;
    const nova = eraNova;
    state.stats.tedio = clamp(state.stats.tedio + (repetiu >= 2 ? 15 : repetiu ? 6 : nova ? -30 : dec.acao === 'vagar' ? -6 : -8));
    memory.keys.push(chave); memory.keys = memory.keys.slice(-8);
    await maybeSummarizeMemory();
    renderMemory(); save();
  }
}

// ---------------------------------------------------------------------
// SONS AMBIENTES (Web Audio, gerados na hora, sem arquivos)
// Passarinhos de dia, grilos à noite, chuva, água por perto, mergulho e o ataque do jacaré.
// O navegador só libera áudio depois de um toque, por isso começa desligado (botão 🔇).
// ---------------------------------------------------------------------
const audio = { ctx: null, on: false, nextBird: 0, nextCricket: 0 };
function noiseBuffer(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function startAudio() {
  const ctx = audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
  audio.noise = noiseBuffer(ctx);
  audio.master = ctx.createGain(); audio.master.connect(ctx.destination);
  const loop = (freq, type, q = 1) => {
    const src = ctx.createBufferSource(); src.buffer = audio.noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(audio.master); src.start(); return g;
  };
  audio.rain = loop(1500, 'bandpass', 0.6);
  audio.water = loop(450, 'lowpass');
}
function beep(freq, t, dur, vol, type = 'sine', to = null) {
  const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.master); o.start(t); o.stop(t + dur + 0.02);
}
function chirp(t) { const base = rand(2300, 3500), n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) beep(base, t + i * 0.14, 0.1, 0.04, 'sine', base * rand(1.2, 1.6)); }
function cricket(t) { for (let i = 0; i < 3; i++) beep(4700, t + i * 0.06, 0.035, 0.012); }
function sfx(kind) {
  if (!audio.on) return;
  const ctx = audio.ctx, t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = audio.noise;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'ataque' ? 350 : 1100;
  const g = ctx.createGain(); g.gain.setValueAtTime(kind === 'ataque' ? 0.7 : 0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  src.connect(f).connect(g).connect(audio.master); src.start(t); src.stop(t + 0.8);
  if (kind === 'ataque') beep(70, t, 0.5, 0.3, 'sawtooth', 45);
  if (kind === 'clique') { g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); f.frequency.value = 4000; beep(1800, t + 0.07, 0.05, 0.05, 'square'); }
}
function updateAudio() {
  if (!audio.ctx) return;
  const ctx = audio.ctx, t = ctx.currentTime;
  audio.master.gain.setTargetAtTime(audio.on && !paused ? 0.8 : 0, t, 0.2);
  if (!audio.on || paused) return;
  audio.rain.gain.setTargetAtTime(raining ? 0.22 : 0, t, 0.8);
  const dAgua = Math.min(...objects.filter(o => ['lago', 'lagoa', 'riacho', 'fonte'].includes(o.type)).map(distTo));
  audio.water.gain.setTargetAtTime(dAgua < 9 ? (1 - dAgua / 9) * 0.14 : 0, t, 0.5);
  if (!isNight() && !raining && t > audio.nextBird) { chirp(t + 0.05); audio.nextBird = t + rand(2, 6); }
  if (isNight() && !raining && t > audio.nextCricket) { cricket(t + 0.05); audio.nextCricket = t + rand(0.3, 1); }
}

// ---------------------------------------------------------------------
// 6. INTERFACE
// ---------------------------------------------------------------------
const $ = id => document.getElementById(id);
const icon = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const emojiEl = $('emoji');
let emojiUntil = 0, zoomUntil = 0;

function showEmoji(e) {
  emojiEl.textContent = e; emojiEl.classList.remove('pop'); void emojiEl.offsetWidth; emojiEl.classList.add('pop');
  emojiUntil = performance.now() + 2000;
}
function showThought(dec, fonte) {
  showEmoji(dec.emoji);
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  const entry = { t: `Dia ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, ...dec, fonte };
  state.log.push(entry); state.log = state.log.slice(-40);
  renderLog(true);
}
let typingTimer = null;
function renderLog(animateLatest) {
  const log = $('log'); log.innerHTML = '';
  const items = state.log.slice(-25).reverse();
  items.forEach((e, i) => {
    const div = document.createElement('div');
    div.className = 'entry' + (i === 0 ? ' latest' : '');
    const meta = document.createElement('div'); meta.className = 'meta';
    if (e.diario) div.classList.add('diary');
    if (e.pc) div.classList.add('pc');
    meta.textContent = e.diario ? e.t : `${e.t} · ${e.acao.replace('_', ' ')}${e.alvo ? ' · ' + nomeDe(e.alvo.replace(/_\d+$/, '')) : ''}`;
    const txt = document.createElement('div'); txt.textContent = i === 0 && animateLatest ? '' : e.pensamento;
    div.append(meta, txt);
    if (e.aprendizado) { const l = document.createElement('div'); l.className = 'learn'; l.textContent = 'Aprendizado: ' + e.aprendizado; div.append(l); }
    log.append(div);
    if (i === 0 && animateLatest) {   // efeito de digitação
      clearInterval(typingTimer); let k = 0; txt.classList.add('caret');
      typingTimer = setInterval(() => { k++; txt.textContent = e.pensamento.slice(0, k); if (k >= e.pensamento.length) { clearInterval(typingTimer); txt.classList.remove('caret'); } }, 28);
    }
  });
  log.parentElement.scrollTop = 0;
}
function renderMemory() {
  $('mem-list').innerHTML = state.aprendizados.length ? state.aprendizados.map(a => `<li>${esc(a)}</li>`).join('') : '<li><i>Ainda não aprendeu nada...</i></li>';
  $('disc-list').innerHTML = state.descobertas.map(d => `<span class="chip">${icon('paw')}${esc(d.split('|')[1] || d)}</span>`).join('');
  // crenças com nível de confiança
  const cr = Object.entries(state.crencas).filter(([k]) => TYPES[k.split(':')[1]]);
  $('belief-list').innerHTML = cr.length ? cr.map(([k, c]) => {
    const [a, t] = k.split(':'), conf = confianca(c), label = conf > 0.6 ? 'bom' : conf < 0.4 ? 'ruim' : 'incerto';
    const quem = k === 'perto:jacare' ? `chegar perto de ${nomeDe('jacare')}` : k === 'necessidades:coco' ? 'fazer as necessidades' : `${a.replace('_', ' ')} ${nomeDe(t)}`;
    return `<div class="belief"><div class="lbl"><span>${esc(cap(quem))}</span><span class="tag ${label}">${label} · ${c.bom + c.ruim}x</span></div>
      <div class="track"><div class="fill" style="width:${Math.round(conf * 100)}%;background:${conf > 0.6 ? 'var(--good)' : conf < 0.4 ? 'var(--alert)' : 'var(--ochre)'}"></div></div></div>`;
  }).join('') : '<i>Ainda não tem experiências suficientes.</i>';
}
function renderPhotos() {
  $('photo-grid').innerHTML = fotos.length ? fotos.slice().reverse().map((f, i) => `<figure data-i="${fotos.length - 1 - i}"><img src="${f.url}" alt="${esc(f.legenda)}"><figcaption><b>${esc(f.t)}</b> ${esc(f.legenda)}</figcaption></figure>`).join('')
    : `<p class="hint">${state.temCamera ? 'Ela ainda não guardou nenhuma imagem.' : 'Existe uma coisinha preta com um olho de vidro perto das flores. Quando ela pegar, as fotos aparecem aqui.'}</p>`;
}
$('photo-grid').onclick = e => {
  const f = fotos[e.target.closest('figure')?.dataset.i]; if (!f) return;
  $('lb-img').src = f.url; $('lb-cap').textContent = `${f.t} · ${f.legenda}`; $('lightbox').classList.remove('hidden');
};
$('lightbox').onclick = () => $('lightbox').classList.add('hidden');
function renderDiary() {
  $('diary-list').innerHTML = state.diario.length ? state.diario.slice().reverse().map(d => `<article class="page"><h4>Dia ${d.dia}</h4><p>${esc(d.texto)}</p></article>`).join('')
    : '<i>O diário é escrito ao anoitecer de cada dia (por volta das 19h no relógio do jogo).</i>';
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Descobertas: registradas na aba Memória (sem aviso sobre o personagem); zoom leve na câmera
function discover(key, label) {
  if (state.descobertas.some(d => d.startsWith(key + '|'))) return;
  state.descobertas.push(key + '|' + label);
  if (!key.startsWith('ver:')) zoomUntil = performance.now() + 3500;
  renderMemory();
}

// Barras de status
const BARS = [['fome', 'Fome', true, 'berry'], ['sede', 'Sede', true, 'drop'], ['energia', 'Energia', false, 'bolt'], ['humor', 'Humor', false, 'smile'], ['frio', 'Frio', true, 'snow'], ['bexiga', 'Necessidade', true, 'bush'], ['tedio', 'Tédio', true, 'spiral']];
$('bars').innerHTML = BARS.map(([k, l, , ic]) => `<div class="bar"><div class="lbl"><span>${icon(ic)}${l}</span><span id="v-${k}"></span></div><div class="track"><div class="fill" id="f-${k}"></div></div></div>`).join('');
function renderBars() {
  for (const [k, , inverse] of BARS) {
    const v = state.stats[k], good = inverse ? 100 - v : v;
    $('v-' + k).textContent = Math.round(v);
    const f = $('f-' + k); f.style.width = v + '%';
    f.style.background = good > 60 ? 'var(--good)' : good > 30 ? 'var(--ochre)' : 'var(--alert)';
  }
  $('brain-info').textContent = `${brainStatus.replace(/^\S+\s/, '')}${gameTime < sickUntil ? ' · enjoada' : ''}${raining ? ' · chovendo' : ''}`;
}

// Abas
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + b.dataset.tab));
});
// Botões
$('btn-sound').onclick = () => {
  if (!audio.ctx) startAudio();
  audio.on = !audio.on; audio.ctx.resume();
  $('btn-sound').innerHTML = icon(audio.on ? 'sound' : 'mute'); $('btn-sound').classList.toggle('on', audio.on);
};
$('btn-pause').onclick = () => { paused = !paused; $('btn-pause').innerHTML = icon(paused ? 'play' : 'pause'); $('btn-pause').classList.toggle('on', paused); };
$('btn-speed').onclick = () => { timeScale = timeScale === 1 ? 2 : 1; $('btn-speed').textContent = timeScale + '×'; $('btn-speed').classList.toggle('on', timeScale === 2); };
$('btn-hide').onclick = () => { $('app').classList.add('clean'); setTimeout(resize, 450); };
$('btn-show').onclick = () => { $('app').classList.remove('clean'); setTimeout(resize, 450); };
// Reset com confirmação na própria tela (toque duas vezes em 3 s)
let resetArmed = 0;
const resetWorld = e => {
  const btn = e.currentTarget;
  if (performance.now() - resetArmed < 3000) { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem('capivara_explora_fotos'); idb.clear(); } catch {} location.reload(); return; }
  resetArmed = performance.now(); const old = btn.innerHTML;
  if (btn.id === 'btn-reset') { btn.classList.add('armed'); btn.title = 'Toque de novo para apagar tudo'; } else btn.textContent = 'Toque de novo para apagar tudo';
  setTimeout(() => { btn.innerHTML = old; btn.classList.remove('armed'); }, 3000);
};
$('cfg-reset').onclick = resetWorld;
if ($('btn-reset')) $('btn-reset').onclick = resetWorld;   // o reset fica nas configurações
$('btn-surprise').onclick = () => {
  const kind = pick(['melancia', 'bola', 'caixa']);
  const maker = MK[kind];
  const fwd = new THREE.Vector3(Math.sin(capy.yaw), 0, Math.cos(capy.yaw));
  let p = capy.pos.clone().addScaledVector(fwd, 3.5);
  if (!isFree(p)) { const [i, j] = nearestFree(...cellOf(p)); p = cellCenter(i, j); }
  const o = addObject(kind, p.x, p.z, maker);
  o.mesh.position.y += 4; o.drop = true;   // cai do céu
  showEmoji('😮');
};
// Configurações
// Ao trocar o seletor, mostra a chave/modelo do provedor escolhido
let cfgShown = cfg.mode;
function fillCfgFields() {
  const m = $('cfg-mode').value, ia = m !== 'offline';
  $('cfg-ia').style.display = ia ? 'block' : 'none';
  if (ia) { $('cfg-key').value = cfg.keys[m] || ''; $('cfg-model').value = cfg.models[m]; $('cfg-key-lbl').textContent = `Chave da API do ${PROVIDERS[m]}`; }
  cfgShown = m;
}
function readCfgFields() { if (cfgShown !== 'offline') { cfg.keys[cfgShown] = $('cfg-key').value.trim(); cfg.models[cfgShown] = $('cfg-model').value.trim() || cfg.models[cfgShown]; } }
$('cfg-test').onclick = async () => {
  readCfgFields();
  const m = $('cfg-mode').value, out = $('cfg-test-res');
  if (m === 'offline') { out.textContent = 'O modo offline não usa chave.'; return; }
  out.className = 'hint';
  if (!cfg.keys[m]) { out.className = 'hint err'; out.textContent = 'Cole uma chave primeiro.'; return; }
  out.textContent = `Testando ${PROVIDERS[m]}...`;
  const prev = cfg.mode; cfg.mode = m; const t0 = performance.now();
  try {
    const r = await callAI('Responda apenas com JSON.', 'Responda {"ok": true}');
    out.className = r ? 'hint ok' : 'hint err';
    out.textContent = r ? `Funcionando: ${PROVIDERS[m]} respondeu em ${((performance.now() - t0) / 1000).toFixed(1)} s.` : 'Resposta vazia.';
  } catch (e) { out.className = 'hint err'; out.textContent = `${PROVIDERS[m]} não respondeu: ${apiErro(e)}.`; }
  finally { cfg.mode = prev; }
};
$('cfg-mode').onchange = () => { readCfgFields(); fillCfgFields(); };
$('btn-settings').onclick = () => { $('cfg-mode').value = cfg.mode; fillCfgFields(); $('settings').classList.remove('hidden'); };
$('cfg-close').onclick = () => {
  readCfgFields(); cfg.mode = $('cfg-mode').value;
  if (cfg.mode !== 'offline' && !cfg.keys[cfg.mode]) { $('cfg-warn').textContent = 'Cole uma chave da API ou escolha Offline.'; return; }
  $('cfg-warn').textContent = '';
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch {}
  $('settings').classList.add('hidden');
};

// Projeção 3D → tela para o emoji / balão / Zzz
const tmpV = new THREE.Vector3();
function placeOverlay(el, worldY, extraPx = 0) {
  tmpV.set(capy.pos.x, capy.root.position.y + worldY, capy.pos.z).project(camera);
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  el.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h - extraPx}px) translate(-50%, -100%)`;
}

// HUD
function renderHUD() {
  $('hud-day').querySelector('b').textContent = state.day;
  const prov = PROVIDERS[cfg.mode] || '';
  const hb = $('hud-brain'); hb.className = 'tag brain ' + brainState;
  hb.querySelector('span').textContent = brainState === 'ok' ? prov : brainState === 'falha' ? `${prov} falhando` : 'Offline';
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  const ic = raining ? 'rain' : isNight() ? 'moon' : (h < 7 || h > 17) ? 'dusk' : 'sun';
  const ht = $('hud-time'); ht.className = 'tag mono ' + (raining ? 'rain' : isNight() ? 'night' : '');
  if (ht.dataset.ic !== ic) { ht.dataset.ic = ic; ht.querySelector('use').setAttribute('href', '#i-' + ic); }
  ht.querySelector('span').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------
// LOOP DE RENDER
// ---------------------------------------------------------------------
function resize() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const camPos = new THREE.Vector3(0, 6, -8), camLook = new THREE.Vector3();
let camYaw = 0, last = performance.now(), uiTick = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = Math.min(0.05, (now - last) / 1000); last = now;
  const dt = paused ? 0 : realDt * timeScale;
  if (dt > 0) {
    gameTime += dt;
    for (let i = waiters.length - 1; i >= 0; i--) if (gameTime >= waiters[i].at) { waiters[i].r(); waiters.splice(i, 1); }
    if (animOverride && gameTime > animOverride.until) { if (capy.anim === animOverride.name) capy.anim = capy.path.length ? 'andar' : animOverride.prev; animOverride = null; }
    updateWorld(dt);
    moveCapy(dt);
    // objetos-surpresa caindo do céu
    for (const o of objects) if (o.drop) { o.mesh.position.y -= dt * 8; if (o.mesh.position.y <= o.pos.y) { o.mesh.position.y = o.pos.y; o.drop = false; } }
  }
  animateCapy(dt);
  capy.root.position.set(capy.pos.x, lerp(capy.root.position.y, groundY(capy.pos), Math.min(1, realDt * 6)), capy.pos.z);
  capy.root.rotation.y = capy.yaw;

  // câmera 3ª pessoa suave, zoom leve nas descobertas
  let dy = capy.yaw - camYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); camYaw += dy * Math.min(1, realDt * 1.5);
  const zoom = now < zoomUntil ? 0.6 : 1;
  const dist = 8.5 * zoom, height = 4.2 * zoom + 0.8;
  const want = new THREE.Vector3(capy.pos.x - Math.sin(camYaw) * dist, capy.root.position.y + height, capy.pos.z - Math.cos(camYaw) * dist);
  want.y = Math.max(want.y, heightAt(want.x, want.z) + 1.2);
  camPos.lerp(want, Math.min(1, realDt * 2.5));
  camLook.lerp(new THREE.Vector3(capy.pos.x, capy.root.position.y + 1, capy.pos.z), Math.min(1, realDt * 4));
  camera.position.copy(camPos); camera.lookAt(camLook);

  renderer.render(scene, camera);
  renderVlogFrame(now);

  // overlays HTML
  // acima do personagem só aparece um emoji simples
  placeOverlay(emojiEl, 2.1);
  if (gameTime < sickUntil) { emojiEl.textContent = '🤢'; emojiEl.style.opacity = 1; }
  else if (capy.anim === 'dormir') { emojiEl.textContent = '💤'; emojiEl.style.opacity = 1; }
  else emojiEl.style.opacity = now < emojiUntil ? 1 : 0;
  if ((uiTick += realDt) > 0.25) {
    uiTick = 0; renderBars(); renderHUD(); updateAudio();
    // esconde objetos longe da capivara (a neblina já os encobre)
    for (const o of objects) if (o.mesh && !TYPES[o.type]?.mobile) o.mesh.visible = (o.pos.x - capy.pos.x) ** 2 + (o.pos.z - capy.pos.z) ** 2 < 3600;
  }
}

// ---------------------------------------------------------------------
// START
// ---------------------------------------------------------------------
capy.pos.set(0, 0, -2);
if (state.temCamera) attachGoPro(null);
initVlogUI();
renderLog(false); renderMemory(); renderDiary(); renderPhotos(); renderBars(); renderHUD();
requestAnimationFrame(frame);
aiLoop();
