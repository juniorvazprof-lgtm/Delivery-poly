// Instâncias do mundo: marcos, vegetação por bioma, jacaré e pássaro.
// (módulo 7/20 da Capivara Explora)
import * as THREE from 'three';
import { G, H } from '../core/runtime.js';
import { HALF, LIM, rand, srand, state } from '../core/config.js';
import { scene } from '../engine/scene.js';
import { LAKE, PONDS, STREAM_Y, WATERS, WATER_Y, biomeAt, heightAt, nearStream, streamZ, waterDist } from './terrain.js';
import { makeBall, makeBird, makeBox, makeCave, makeFlowers, makeMushroom, makeRock, makeTree, makeWatermelon, mesh, model, placeAt } from './models.js';
import { TYPES } from './types.js';

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
G.gopro = state.temCamera ? null : addObject('gopro', gp.x, gp.z, MK.gopro);

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
function scareBird() { bird.mode = 'flee'; bird.fleeUntil = G.gameTime + 8; bird.fleeDir = new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize(); }

// acesso tardio para módulos carregados antes deste
Object.defineProperties(H, {
  scareBird: { get: () => scareBird },
  swoopNow: { get: () => swoopNow },
});
export { MK, PORCOES, REGROW, abrigo, addObject, bird, cave, jac, objects, pc, setFood };
