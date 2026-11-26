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
//   5. Cérebro (Gemini / offline) e LOOP DE IA
//   6. Interface (balão, emoji, painel, botões)
// =====================================================================
import * as THREE from 'three';

// ---------------------------------------------------------------------
// 1. CONFIGURAÇÃO E PERSISTÊNCIA
// ---------------------------------------------------------------------
const DAY_LEN = 240;            // 1 dia = 4 minutos (segundos de jogo)
const HALF = 30;                // mundo 60x60 m, de -30 a 30
const PERCEPTION_RADIUS = 15;
const MIN_CALL_INTERVAL = 4000; // ms entre chamadas à IA
const CALL_TIMEOUT = 10000;     // ms
const SAVE_KEY = 'capivara_explora_v1';
const CFG_KEY = 'capivara_explora_cfg';
const ACOES = ['ir_para', 'comer', 'beber', 'nadar', 'dormir', 'cheirar', 'sentar', 'investigar', 'fugir', 'vagar'];

const cfg = Object.assign({ mode: 'offline', key: '', model: 'gemini-2.5-flash' },
  safeJSON(localStorage.getItem(CFG_KEY)) || {});
if (!cfg.key) cfg.mode = 'offline';

function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }

const defaultState = () => ({
  stats: { fome: 30, sede: 30, energia: 80, humor: 70 },
  day: 1, clock: 0.29,            // 0 = meia-noite, 0.5 = meio-dia
  aprendizados: [],               // memória de longo prazo (texto)
  descobertas: [],                // chaves "acao:tipo" ou "ver:tipo"
  log: [],
});
const state = Object.assign(defaultState(), safeJSON(localStorage.getItem(SAVE_KEY)) || {});
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
scene.fog = new THREE.Fog(0x9fd8ff, 25, 70);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 150);

// Luzes: só 2 (hemisférica + sol com sombra pequena) para rodar bem no celular
const hemi = new THREE.HemisphereLight(0xfff1d6, 0x5a7a3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 1.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
scene.add(sun, sun.target);

// --- Terreno com relevo leve, lago e riacho ---
const LAKE = { x: 8, z: -6, r: 6 };
const WATER_Y = -0.45;
const STREAM_Y = -0.62;
const streamZ = x => LAKE.z + Math.sin(x * 0.35) * 1.6;
function heightAt(x, z) {
  let h = 0.55 * Math.sin(x * 0.15) * Math.cos(z * 0.13) + 0.25 * Math.sin(x * 0.37 + z * 0.21) + 0.15 * Math.cos(z * 0.5);
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  h = lerp(h, -1.4, smooth(LAKE.r + 3, LAKE.r - 1, dl));
  if (x > LAKE.x + LAKE.r - 2) h = lerp(h, -0.9, smooth(2.2, 0.6, Math.abs(z - streamZ(x))));
  return h;
}
{
  const g = new THREE.PlaneGeometry(64, 64, 56, 56);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = heightAt(x, z);
    p.setY(i, h);
    if (h < -0.35) c.set(0xe8d29a);                         // areia
    else c.setHSL(0.27 + Math.sin(x * 0.7 + z) * 0.02, 0.55, 0.42 + Math.random() * 0.06); // grama
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  ground.receiveShadow = true;
  scene.add(ground);
}
const waterMat = new THREE.MeshLambertMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.85 });
const lakeMesh = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r + 1.2, 28), waterMat);
lakeMesh.rotation.x = -Math.PI / 2;
lakeMesh.position.set(LAKE.x, WATER_Y, LAKE.z);
scene.add(lakeMesh);
{ // riacho: fita de geometria acompanhando a curva
  const v = [], idx = [];
  let n = 0;
  for (let x = LAKE.x + LAKE.r - 1; x <= 32; x += 1) {
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
      comer: () => ({ d: { fome: -30, humor: +10 }, msg: 'Você comeu as frutinhas vermelhas da árvore. Doces e suculentas! A fome diminuiu bastante.', anim: 'comer' }),
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
};

// --- Instâncias do mundo ---
const objects = [];   // {id, type, pos, mesh, block}
const counters = {};
function addObject(type, x, z, maker, block = 0) {
  counters[type] = (counters[type] || 0) + 1;
  const o = { id: `${type}_${counters[type]}`, type, pos: new THREE.Vector3(x, heightAt(x, z), z), block };
  if (maker) { o.mesh = placeAt(maker(), x, z); o.mesh.rotation.y = rand(0, 6.28); }
  objects.push(o); return o;
}
addObject('arvore_frutas', -10, -10, () => makeTree(true), 1.1);
addObject('arvore_frutas', -14, 7, () => makeTree(true), 1.1);
[[-4, 13], [12, 13], [-21, -18], [20, -20], [-23, 15], [4, -19], [24, 6], [-26, 0], [15, 24], [-8, 24], [0, -26]].forEach(([x, z]) => addObject('arvore', x, z, () => makeTree(false), 1.1));
addObject('cogumelo_vermelho', -6, -4, () => makeMushroom(true));
addObject('cogumelo_vermelho', 17, 9, () => makeMushroom(true));
addObject('cogumelo_marrom', -12, -2, () => makeMushroom(false));
addObject('cogumelo_marrom', 3, 10, () => makeMushroom(false));
addObject('cogumelo_marrom', -17, 12, () => makeMushroom(false));
const lago = addObject('lago', LAKE.x, LAKE.z, null);
lago.pos.y = WATER_Y;
const riacho = addObject('riacho', 23, streamZ(23), null);
riacho.pos.y = STREAM_Y;
addObject('pedra', -2, 4, makeRock, 1.6);
const cave = addObject('caverna', -21, -5, makeCave, 3.4);
cave.mesh.rotation.y = 0;
cave.entrance = new THREE.Vector3(-17, 0, -5);
addObject('flores', 4, 4, makeFlowers);
addObject('flores', -16, -13, makeFlowers);
addObject('flores', 12, 18, makeFlowers);
const bird = addObject('passaro', 0, 0, null);
bird.mesh = makeBird(); scene.add(bird.mesh);
bird.t = 0; bird.mode = 'circle'; bird.home = new THREE.Vector3(0, 0, 0); bird.fleeUntil = 0;
function scareBird() { bird.mode = 'flee'; bird.fleeUntil = gameTime + 8; bird.fleeDir = new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize(); }

// ---------------------------------------------------------------------
// 3a. PATHFINDING: grade de 1 m + A* (contorna árvores, pedras, caverna e lago)
// ---------------------------------------------------------------------
const GN = 60;
const blocked = new Uint8Array(GN * GN);
const cellOf = v => [clamp(Math.floor(v.x + HALF), 0, GN - 1), clamp(Math.floor(v.z + HALF), 0, GN - 1)];
const cellCenter = (i, j) => new THREE.Vector3(i - HALF + 0.5, 0, j - HALF + 0.5);
for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) {
  const c = cellCenter(i, j);
  let b = i < 2 || j < 2 || i > GN - 3 || j > GN - 3;
  if (Math.hypot(c.x - LAKE.x, c.z - LAKE.z) < LAKE.r + 0.6) b = true;
  for (const o of objects) if (o.block && Math.hypot(c.x - o.pos.x, c.z - o.pos.z) < o.block + 0.5) b = true;
  blocked[i + j * GN] = b ? 1 : 0;
}
function nearestFree(i, j) {
  if (!blocked[i + j * GN]) return [i, j];
  for (let r = 1; r < 12; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < GN && b < GN && !blocked[a + b * GN]) return [a, b];
  }
  return [i, j];
}
function findPath(from, to) {
  const [si, sj] = nearestFree(...cellOf(from)), [ti, tj] = nearestFree(...cellOf(to));
  const start = si + sj * GN, goal = ti + tj * GN;
  const g = new Float32Array(GN * GN).fill(Infinity), came = new Int32Array(GN * GN).fill(-1), closed = new Uint8Array(GN * GN);
  const open = [start]; g[start] = 0;
  const hf = k => Math.hypot((k % GN) - ti, Math.floor(k / GN) - tj);
  let iter = 0;
  while (open.length && iter++ < 4000) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (g[open[k]] + hf(open[k]) < g[open[bi]] + hf(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    closed[cur] = 1;
    const ci = cur % GN, cj = Math.floor(cur / GN);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GN || nj >= GN) continue;
      const n = ni + nj * GN;
      if (blocked[n] || closed[n]) continue;
      if (di && dj && (blocked[ci + di + cj * GN] || blocked[ci + (cj + dj) * GN])) continue; // sem cortar quinas
      const ng = g[cur] + (di && dj ? 1.414 : 1);
      if (ng < g[n]) { g[n] = ng; came[n] = cur; if (!open.includes(n)) open.push(n); }
    }
  }
  if (came[goal] === -1 && goal !== start) return [to.clone()];
  const path = []; let k = goal;
  while (k !== -1 && k !== start) { path.unshift(cellCenter(k % GN, Math.floor(k / GN))); k = came[k]; }
  // suaviza: pula pontos intermediários alinhados
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
{
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
  }
  if (gameTime < sickUntil) { mrz += Math.sin(t * 3) * 0.12; hz += Math.sin(t * 2.3) * 0.2; }
  capy.model.position.set(ox, my + breath, 0);
  capy.model.rotation.set(mrx, 0, mrz);
  head.rotation.set(hx, 0, hz);
  legs.forEach((l, i) => { l.rotation.x = (i % 3 === 0 ? 1 : -1) * legSwing + legFold * (i < 2 ? -1 : 1); });
  eyes.forEach(e => e.scale.set(1, eyeS, 1));
  body.scale.y = 0.85 + breath;
}

// Movimento ao longo do caminho
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
  capy.pos.addScaledVector(d, Math.min(dist, sp * dt));
}

// ---------------------------------------------------------------------
// TEMPO DE JOGO, dia/noite e clima
// ---------------------------------------------------------------------
let gameTime = 0, timeScale = 1, paused = false, sickUntil = -1;
let raining = false, rainUntil = 0, nextWeatherCheck = 20;
const waiters = []; // promessas esperando gameTime
const gameWait = s => new Promise(r => waiters.push({ at: gameTime + s, r }));
const isNight = () => state.clock < 0.24 || state.clock > 0.8;
const inCave = () => capy.pos.distanceTo(new THREE.Vector3(cave.entrance.x, capy.pos.y, cave.entrance.z)) < 3;
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
  sun.intensity = light * (raining ? 0.5 : 1.4);
  sun.color.setHSL(0.09, 0.8, 0.6 + light * 0.25);
  hemi.intensity = 0.35 + light * 0.6;
  sun.position.set(capy.pos.x + Math.cos(ang) * 25, Math.max(4, sh * 30), capy.pos.z + 12);
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
  if (s.fome > 85 || s.sede > 85) s.humor = clamp(s.humor - dt * 0.1);
  // água ondulando de leve
  lakeMesh.position.y = WATER_Y + Math.sin(gameTime * 1.3) * 0.02;
  updateBird(dt);
  updateSurprises(dt);
}

// Pássaro: circula pelo mundo, às vezes dá rasantes perto da capivara
let nextSwoop = 25;
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
  m.userData.wings[0].rotation.z = f; m.userData.wings[1].rotation.z = -f;
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
  if (o.type === 'lago') return Math.max(0, Math.hypot(capy.pos.x - LAKE.x, capy.pos.z - LAKE.z) - LAKE.r - 1);
  if (o.type === 'riacho') { let best = 99; for (let x = LAKE.x + LAKE.r; x < 30; x += 1) best = Math.min(best, Math.hypot(capy.pos.x - x, capy.pos.z - streamZ(x)) - 1); return Math.max(0, best); }
  return capy.pos.distanceTo(new THREE.Vector3(o.pos.x, capy.pos.y, o.pos.z));
}
function buildPerception() {
  const visiveis = objects.map(o => ({ o, d: distTo(o) })).filter(x => x.d <= PERCEPTION_RADIUS).sort((a, b) => a.d - b.d);
  // primeiras vezes vendo algo → descoberta
  visiveis.forEach(({ o }) => discover(`ver:${o.type}`, `encontrou ${TYPES[o.type].nome}`));
  const s = state.stats;
  const h = Math.floor(state.clock * 24), mi = Math.floor((state.clock * 24 % 1) * 60);
  return {
    visiveis,
    texto: [
      `Hora: ${periodName()} (${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}), dia ${state.day}.`,
      `Clima: ${raining ? 'chovendo' : isNight() ? 'noite tranquila' : 'tempo bom'}.${inCave() ? ' Você está na entrada da caverna, protegida.' : ''}${gameTime < sickUntil ? ' Você está ENJOADA, a barriga revirando.' : ''}`,
      `Seus status (0-100): fome ${s.fome | 0} (alto = faminta), sede ${s.sede | 0} (alto = sedenta), energia ${s.energia | 0} (baixo = exausta), humor ${s.humor | 0} (alto = feliz).`,
      'O que você vê ao redor (raio de 15 m):',
      ...(visiveis.length ? visiveis.map(({ o, d }) => `- id "${o.id}": ${TYPES[o.type].desc} — ${d.toFixed(1)} m, ${directionWord(o.pos)}`) : ['- nada de especial, só grama']),
    ].join('\n'),
  };
}

// ---------------------------------------------------------------------
// 5b. CÉREBRO
// ---------------------------------------------------------------------
const PERSONALIDADE = `Você é uma capivara jovem, calma, zen e levemente filosófica, que acabou de acordar num mundo desconhecido. É curiosa, mas preguiçosa, e ama água. Às vezes faz reflexões existenciais inesperadas ('Será que o lago sabe que eu existo?'). Fale em português brasileiro, natural e engraçado. Você NÃO sabe o que é seguro ou perigoso: só sabe o que está na sua memória e o que aprendeu experimentando. Varie suas falas e não repita frases.`;
const FORMATO = `
A cada turno você recebe sua percepção e decide UMA ação. Responda SOMENTE com JSON neste formato:
{"pensamento":"monólogo em 1ª pessoa, 1-2 frases, engraçado e com personalidade","fala":"balão curto de 2-6 palavras","emoji":"um emoji da emoção","acao":"ir_para | comer | beber | nadar | dormir | cheirar | sentar | investigar | fugir | vagar","alvo":"id de um objeto visível ou null","aprendizado":"algo novo aprendido com a última experiência, ou null"}
Regras: "acao" deve ser exatamente uma das opções. "alvo" deve ser um id exatamente como aparece na percepção (ou null para vagar/fugir/dormir no lugar). Só registre "aprendizado" quando a última ação realmente te ensinou algo novo.`;

const memory = { lastResult: 'Você acabou de acordar. Tudo é novo.', history: [] };
const pendingNotes = [];

// Validação: ação fora da lista, alvo inexistente ou JSON quebrado → "vagar"
function normalizeDecision(raw, perc) {
  const ok = raw && typeof raw === 'object';
  const r = ok ? raw : {};
  let acao = ACOES.includes(r.acao) ? r.acao : 'vagar';
  let alvo = typeof r.alvo === 'string' && objects.some(o => o.id === r.alvo) ? r.alvo : null;
  const precisaAlvo = ['ir_para', 'comer', 'beber', 'nadar', 'cheirar', 'sentar', 'investigar'];
  if (precisaAlvo.includes(acao) && !alvo) {
    // tenta achar algo visível adequado; senão, vaga
    const cand = perc.visiveis.find(({ o }) => TYPES[o.type].efeitos[acao]);
    if (cand && acao !== 'ir_para') alvo = cand.o.id; else acao = 'vagar';
  }
  return {
    pensamento: String(r.pensamento || 'Hmm... deixa eu dar uma voltinha.').slice(0, 220),
    fala: String(r.fala || '...').slice(0, 40),
    emoji: String(r.emoji || '🙂').slice(0, 4),
    acao, alvo,
    aprendizado: r.aprendizado && r.aprendizado !== 'null' ? String(r.aprendizado).slice(0, 160) : null,
  };
}

// --- Gemini ---
async function callGemini(system, user, timeoutMs = CALL_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const generationConfig = { responseMimeType: 'application/json', temperature: 1.0, maxOutputTokens: 600 };
    if (/2\.5/.test(cfg.model)) generationConfig.thinkingConfig = { thinkingBudget: 0 }; // resposta rápida
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig,
      }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    return JSON.parse(txt.replace(/^```(json)?|```$/g, '').trim());
  } finally { clearTimeout(timer); }
}

// --- Cérebro offline: escolhas aleatórias coerentes com os status ---
const offlineBad = new Set(); // tipos que deram ruim (aprendizado offline simples)
const FRASES = {
  comer: [['Hora do lanchinho', 'Barriguinha roncando... isso aí parece comida, né? Vou arriscar.', '😋'], ['Nham nham?', 'Minha filosofia é simples: se parece gostoso, provavelmente é.', '🤤']],
  beber: [['Água, minha paixão', 'A sede bateu. Água é tipo um abraço por dentro.', '💧'], ['Golinho básico', 'Uma capivara hidratada é uma capivara em paz.', '😌']],
  nadar: [['Mergulho zen!', 'Toda célula do meu corpo está gritando: ÁGUA!', '🏊'], ['Bora boiar', 'Flutuar é só deitar com mais estilo.', '🌊']],
  dormir: [['Soninho chegou', 'Minhas pálpebras pesam mais que meus problemas.', '😴'], ['Só cinco minutinhos', 'Dormir também é uma forma de explorar... os sonhos.', '💤']],
  cheirar: [['Que cheirinho...', 'Meu focinho está muito curioso agora.', '👃'], ['Snif snif', 'Cada cheiro é uma história que o mundo me conta.', '🌸']],
  sentar: [['Momento contemplativo', 'Se eu sentar aqui por tempo suficiente, será que viro paisagem?', '🧘'], ['Pausa filosófica', 'O tempo passa diferente quando a gente não tem pressa.', '🌅']],
  investigar: [['O que é isso?', 'Nunca vi nada assim. Preciso entender de perto.', '🧐'], ['Hmm, curioso...', 'A curiosidade é o motor da capivara moderna.', '🤔']],
  vagar: [['Passeiozinho', 'Sem destino, sem pressa. Esse é o caminho.', '🚶'], ['Explorando...', 'Será que o horizonte também está olhando pra mim?', '✨'], ['Vamos ver ali', 'Onde será que esse mundo acaba? Será que acaba?', '🌿']],
  fugir: [['SOCORRO!', 'Nope. Nope. Nope. Vou ali e já volto.', '😱']],
};
function offlineBrain(perc) {
  const s = state.stats, vis = perc.visiveis.map(v => v.o);
  const find = (acao, types) => vis.find(o => types.includes(o.type) && !offlineBad.has(o.type) && TYPES[o.type].efeitos[acao]);
  let acao = 'vagar', alvo = null, opts = [];
  if (s.energia < 25) { const c = vis.find(o => o.type === 'caverna'); acao = 'dormir'; alvo = c ? c.id : null; }
  else if (s.sede > 55 && (alvo = find('beber', ['lago', 'riacho'])?.id)) acao = 'beber';
  else if (s.fome > 55 && (alvo = find('comer', ['arvore_frutas', 'cogumelo_marrom', 'cogumelo_vermelho', 'melancia', 'flores'])?.id)) acao = 'comer';
  else {
    for (const o of vis) for (const a of Object.keys(TYPES[o.type].efeitos)) if (!offlineBad.has(o.type) || a !== 'comer') opts.push([a, o.id]);
    opts.push(['vagar', null], ['vagar', null]);
    if (s.humor < 50 && find('nadar', ['lago'])) opts.push(['nadar', find('nadar', ['lago']).id], ['nadar', find('nadar', ['lago']).id]);
    [acao, alvo] = pick(opts);
  }
  if (acao === 'dormir' && !alvo && s.energia > 25) acao = 'vagar';
  const [fala, pensamento, emoji] = pick(FRASES[acao] || FRASES.vagar);
  let aprendizado = null;
  if (/enjoo/.test(memory.lastResult)) { aprendizado = 'Cogumelo vermelho com pintas me deixa enjoada. Evitar!'; offlineBad.add('cogumelo_vermelho'); }
  return { pensamento, fala, emoji, acao, alvo, aprendizado };
}

// ---------------------------------------------------------------------
// 5c. EXECUÇÃO DA AÇÃO: anda até o alvo, anima, aplica efeitos ocultos
// ---------------------------------------------------------------------
function walkTo(point, { run = false, swim = false, maxTime = 25 } = {}) {
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
  if (o.type === 'lago') { const dir = from.clone().sub(new THREE.Vector3(LAKE.x, from.y, LAKE.z)).setY(0).normalize(); return new THREE.Vector3(LAKE.x + dir.x * (LAKE.r + 1.1), 0, LAKE.z + dir.z * (LAKE.r + 1.1)); }
  if (o.type === 'riacho') { let best = null, bd = 1e9; for (let x = LAKE.x + LAKE.r + 1; x < 28; x++) { const p = new THREE.Vector3(x, 0, streamZ(x) + (from.z > streamZ(x) ? 1.6 : -1.6)); const d = p.distanceTo(from); if (d < bd) { bd = d; best = p; } } return best; }
  if (o.type === 'caverna') return cave.entrance.clone();
  const dir = from.clone().sub(o.pos).setY(0); if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();
  return o.pos.clone().addScaledVector(dir, (o.block || 0) + 1.1).setY(0);
}
function faceTowards(p) { capy.yaw = Math.atan2(p.x - capy.pos.x, p.z - capy.pos.z); }
const ANIM_DUR = { comer: 3, beber: 3, nadar: 7, dormir: 10, cheirar: 2.2, espirrar: 1.6, sentar: 6, curiosa: 2.5, pular: 2.2, tremer: 2 };

function applyDeltas(d) {
  for (const k in d) state.stats[k] = clamp(state.stats[k] + d[k]);
}
async function executeAction(dec) {
  const o = dec.alvo ? objects.find(x => x.id === dec.alvo) : null;
  const t = o ? TYPES[o.type] : null;
  switch (dec.acao) {
    case 'vagar': {
      let p; for (let i = 0; i < 20; i++) { p = capy.pos.clone().add(new THREE.Vector3(rand(-10, 10), 0, rand(-10, 10))); if (isFree(p) && Math.abs(p.x) < 27 && Math.abs(p.z) < 27) break; }
      await walkTo(p);
      return 'Você passeou um pouco sem rumo.';
    }
    case 'fugir': {
      const from = o ? o.pos : bird.pos;
      const dir = capy.pos.clone().sub(from).setY(0).normalize();
      let p = capy.pos.clone().addScaledVector(dir, 9);
      p.x = clamp(p.x, -26, 26); p.z = clamp(p.z, -26, 26);
      await walkTo(p, { run: true });
      return `Você saiu correndo${o ? ' para longe de ' + t.nome : ''}. Ufa, ficou segura.`;
    }
    case 'dormir':
      if (!o || o.type !== 'caverna') {
        await walkTo(capy.pos.clone()); capy.anim = 'dormir'; capy.animT = 0;
        await gameWait(ANIM_DUR.dormir);
        applyDeltas({ energia: +20, humor: raining ? -5 : 0 });
        return raining ? 'Você cochilou no meio do campo, mas a chuva te molhou toda. Recuperou só um pouco de energia.' : 'Você cochilou na grama. Recuperou um pouco de energia.';
      }
  }
  if (!o) return 'Você ficou parada sem saber o que fazer.';
  // anda até o objeto (pássaro é alvo móvel: mira onde ele está agora)
  await walkTo(o.type === 'passaro' ? new THREE.Vector3(bird.pos.x, 0, bird.pos.z) : approachPoint(o));
  faceTowards(o.type === 'lago' ? new THREE.Vector3(LAKE.x, 0, LAKE.z) : o.pos);
  if (dec.acao === 'ir_para') return `Você chegou perto de ${t.nome}.`;
  const efeito = t.efeitos[dec.acao];
  if (!efeito) {
    capy.anim = 'curiosa'; capy.animT = 0; await gameWait(2);
    return `Você tentou ${dec.acao} ${t.nome}, mas nada de interessante aconteceu.`;
  }
  const r = efeito(o);
  discover(`${dec.acao}:${o.type}`, DISCOVERY_TEXT[`${dec.acao}:${o.type}`] || `${dec.acao} ${t.nome}`);
  if (r.anim === 'nadar' && o.type === 'lago') {          // entra no lago e dá uma voltinha
    const edge = capy.pos.clone();
    capy.swim = true;
    const c = new THREE.Vector3(LAKE.x, 0, LAKE.z);
    await walkTo(edge.clone().lerp(c, 0.55), { swim: true });
    await walkTo(c.clone().add(new THREE.Vector3(rand(-2, 2), 0, rand(-2, 2))), { swim: true });
    await walkTo(edge, { swim: true });
    capy.swim = false;
  } else {
    if (o.type === 'caverna' && r.anim === 'dormir') faceTowards(new THREE.Vector3(0, 0, -5));
    capy.anim = r.anim; capy.animT = 0;
    await gameWait(ANIM_DUR[r.anim] * (r.anim === 'dormir' && isNight() ? 1.4 : 1));
  }
  applyDeltas(r.d);
  if (r.remove) removeObject(o);
  return r.msg;
}
function removeObject(o) {
  const i = objects.indexOf(o); if (i >= 0) objects.splice(i, 1);
  if (o.mesh) scene.remove(o.mesh);
  // cogumelos renascem depois de um tempo, num lugar próximo
  if (!TYPES[o.type].surprise) gameWait(90).then(() => {
    const x = clamp(o.pos.x + rand(-3, 3), -26, 26), z = clamp(o.pos.z + rand(-3, 3), -26, 26);
    const p = new THREE.Vector3(x, 0, z);
    if (isFree(p)) addObject(o.type, x, z, () => makeMushroom(o.type === 'cogumelo_vermelho'));
  });
}

// ---------------------------------------------------------------------
// 5d. MEMÓRIA: aprendizados + resumo quando passar de 20
// ---------------------------------------------------------------------
async function maybeSummarizeMemory() {
  if (state.aprendizados.length <= 20) return;
  let novo = null;
  if (cfg.mode === 'gemini' && cfg.key) {
    try {
      const r = await callGemini('Você resume a memória de uma capivara exploradora. Responda JSON: {"aprendizados":["..."]}',
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
//   │   chama o cérebro (Gemini com timeout 10 s; falhou → offline nesse ciclo)
//   │   VALIDA a resposta (ação/alvo inválidos → vagar)
//   │   mostra pensamento, fala e emoji
//   │   EXECUTA a ação → efeitos ocultos → texto do resultado
//   │   guarda resultado + histórico + aprendizado
//   └── espera o intervalo mínimo de 4 s desde a última chamada
// ---------------------------------------------------------------------
let brainStatus = '';
async function aiLoop() {
  let lastCall = 0;
  while (true) {
    while (paused) await new Promise(r => setTimeout(r, 200));
    const wait = MIN_CALL_INTERVAL - (performance.now() - lastCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    while (paused) await new Promise(r => setTimeout(r, 200));

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
    if (cfg.mode === 'gemini' && cfg.key) {
      try { raw = await callGemini(PERSONALIDADE + '\n' + FORMATO, prompt); fonte = 'gemini'; brainStatus = '🟢 Gemini respondeu'; }
      catch (e) { raw = offlineBrain(perc); brainStatus = `🟠 Gemini falhou (${e.name === 'AbortError' ? 'timeout' : e.message}) — usei o cérebro offline`; }
    } else { raw = offlineBrain(perc); brainStatus = '⚪ Cérebro offline'; }

    // 3) VALIDAÇÃO
    const dec = normalizeDecision(raw, perc);
    if (gameTime < sickUntil) dec.emoji = '🤢'; // enjoo força o emoji
    if (dec.aprendizado && !state.aprendizados.includes(dec.aprendizado)) state.aprendizados.push(dec.aprendizado);
    showThought(dec, fonte);

    // 4) EXECUÇÃO + efeitos ocultos
    let resultado;
    try { resultado = await executeAction(dec); } catch (e) { console.error(e); resultado = 'Você se distraiu.'; }
    capy.anim = 'idle'; capy.swim = false;
    memory.lastResult = resultado;
    const alvoNome = dec.alvo ? (TYPES[objects.find(o => o.id === dec.alvo)?.type]?.nome || dec.alvo) : '';
    memory.history.push(`${dec.acao}${alvoNome ? ' → ' + alvoNome : ''}: ${resultado}`);
    memory.history = memory.history.slice(-5);
    await maybeSummarizeMemory();
    renderMemory(); save();
  }
}

// ---------------------------------------------------------------------
// 6. INTERFACE
// ---------------------------------------------------------------------
const $ = id => document.getElementById(id);
const emojiEl = $('emoji'), bubbleEl = $('bubble'), zzzEl = $('zzz'), bannerEl = $('banner');
let bubbleUntil = 0, emojiUntil = 0, zoomUntil = 0;

function showEmoji(e) {
  emojiEl.textContent = e; emojiEl.classList.remove('pop'); void emojiEl.offsetWidth; emojiEl.classList.add('pop');
  emojiUntil = performance.now() + 2000;
}
function showThought(dec, fonte) {
  showEmoji(dec.emoji);
  bubbleEl.textContent = dec.fala; bubbleEl.classList.add('show'); bubbleUntil = performance.now() + 4500;
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
    meta.textContent = `${e.t} · ${e.acao}${e.alvo ? ' → ' + e.alvo : ''} · ${e.fonte === 'gemini' ? '✨ IA' : '🎲 offline'}`;
    const txt = document.createElement('div'); txt.textContent = `${e.emoji} ${i === 0 && animateLatest ? '' : e.pensamento}`;
    div.append(meta, txt);
    if (e.aprendizado) { const l = document.createElement('div'); l.className = 'learn'; l.textContent = '💡 ' + e.aprendizado; div.append(l); }
    log.append(div);
    if (i === 0 && animateLatest) {   // efeito de digitação
      clearInterval(typingTimer); let k = 0; txt.classList.add('caret');
      typingTimer = setInterval(() => { k++; txt.textContent = `${e.emoji} ${e.pensamento.slice(0, k)}`; if (k >= e.pensamento.length) { clearInterval(typingTimer); txt.classList.remove('caret'); } }, 28);
    }
  });
  log.parentElement.scrollTop = 0;
}
function renderMemory() {
  $('mem-list').innerHTML = state.aprendizados.length ? state.aprendizados.map(a => `<li>${esc(a)}</li>`).join('') : '<li><i>Ainda não aprendeu nada...</i></li>';
  $('disc-list').innerHTML = state.descobertas.map(d => `<span class="chip">🏆 ${esc(d.split('|')[1] || d)}</span>`).join('');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Descobertas: banner animado na primeira vez
const bannerQueue = []; let bannerBusy = false;
function discover(key, label) {
  if (state.descobertas.some(d => d.startsWith(key + '|'))) return;
  state.descobertas.push(key + '|' + label);
  bannerQueue.push('🏆 Nova descoberta: ' + label);
  if (!key.startsWith('ver:')) zoomUntil = performance.now() + 3500;
  pumpBanner(); renderMemory();
}
function pumpBanner() {
  if (bannerBusy || !bannerQueue.length) return;
  bannerBusy = true; bannerEl.textContent = bannerQueue.shift();
  bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
  setTimeout(() => { bannerBusy = false; pumpBanner(); }, 3000);
}

// Barras de status
const BARS = [['fome', '🍎 Fome', true], ['sede', '💧 Sede', true], ['energia', '⚡ Energia', false], ['humor', '😊 Humor', false]];
$('bars').innerHTML = BARS.map(([k, l]) => `<div class="bar"><div class="lbl"><span>${l}</span><span id="v-${k}"></span></div><div class="track"><div class="fill" id="f-${k}"></div></div></div>`).join('');
function renderBars() {
  for (const [k, , inverse] of BARS) {
    const v = state.stats[k], good = inverse ? 100 - v : v;
    $('v-' + k).textContent = Math.round(v);
    const f = $('f-' + k); f.style.width = v + '%';
    f.style.background = `hsl(${good * 1.2}, 75%, 55%)`;
  }
  $('brain-info').textContent = `${brainStatus}${gameTime < sickUntil ? ' · 🤢 enjoada' : ''}${raining ? ' · 🌧️ chovendo' : ''}`;
}

// Abas
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + b.dataset.tab));
});
// Botões
$('btn-pause').onclick = () => { paused = !paused; $('btn-pause').textContent = paused ? '▶️' : '⏸️'; };
$('btn-speed').onclick = () => { timeScale = timeScale === 1 ? 2 : 1; $('btn-speed').textContent = timeScale + 'x'; };
$('btn-hide').onclick = () => { $('app').classList.add('clean'); setTimeout(resize, 450); };
$('btn-show').onclick = () => { $('app').classList.remove('clean'); setTimeout(resize, 450); };
const resetWorld = () => { if (confirm('Resetar o mundo e apagar a memória da capivara?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } };
$('cfg-reset').onclick = resetWorld;
$('btn-reset').onclick = resetWorld;
$('btn-surprise').onclick = () => {
  const kind = pick(['melancia', 'bola', 'caixa']);
  const maker = { melancia: makeWatermelon, bola: makeBall, caixa: makeBox }[kind];
  const fwd = new THREE.Vector3(Math.sin(capy.yaw), 0, Math.cos(capy.yaw));
  let p = capy.pos.clone().addScaledVector(fwd, 3.5);
  if (!isFree(p)) { const [i, j] = nearestFree(...cellOf(p)); p = cellCenter(i, j); }
  const o = addObject(kind, p.x, p.z, maker);
  o.mesh.position.y += 4; o.drop = true;   // cai do céu
  showEmoji('😮');
};
// Configurações
$('btn-settings').onclick = () => { $('cfg-mode').value = cfg.mode; $('cfg-key').value = cfg.key; $('cfg-model').value = cfg.model; $('settings').classList.remove('hidden'); };
$('cfg-close').onclick = () => {
  cfg.key = $('cfg-key').value.trim(); cfg.model = $('cfg-model').value.trim() || 'gemini-2.5-flash';
  cfg.mode = $('cfg-mode').value === 'gemini' && cfg.key ? 'gemini' : 'offline';
  if ($('cfg-mode').value === 'gemini' && !cfg.key) alert('Sem chave da API: usando o cérebro offline.');
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
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
  $('hud-day').textContent = `Dia ${state.day}`;
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  const icon = raining ? '🌧️' : isNight() ? '🌙' : (h < 7 || h > 17) ? '🌅' : '☀️';
  $('hud-time').textContent = `${icon} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

  // overlays HTML
  placeOverlay(emojiEl, 2.3, bubbleEl.classList.contains('show') ? bubbleEl.offsetHeight + 18 : 0);
  placeOverlay(bubbleEl, 1.95);
  placeOverlay(zzzEl, 1.6, -10);
  if (gameTime < sickUntil) { emojiEl.textContent = '🤢'; emojiEl.style.opacity = 1; }
  else emojiEl.style.opacity = now < emojiUntil ? 1 : 0;
  if (now > bubbleUntil) bubbleEl.classList.remove('show');
  zzzEl.style.display = capy.anim === 'dormir' ? 'block' : 'none';
  if ((uiTick += realDt) > 0.25) { uiTick = 0; renderBars(); renderHUD(); }
}

// ---------------------------------------------------------------------
// START
// ---------------------------------------------------------------------
capy.pos.set(0, 0, -2);
renderLog(false); renderMemory(); renderBars(); renderHUD();
requestAnimationFrame(frame);
aiLoop();
