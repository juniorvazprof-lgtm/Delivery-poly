// Execução das ações, jacaré, necessidades e confiança.
// (módulo 13/20 da Capivara Explora)
import * as THREE from 'three';
import { G, H } from '../core/runtime.js';
import { HALF, LIM, NREG, centroRegiao, clamp, hasBrain, isNight, lerp, pendingNotes, pick, rand, regiaoDe, save, state } from '../core/config.js';
import { scene } from '../engine/scene.js';
import { LAKE, WATER_Y, biomeAt, heightAt, streamZ } from '../world/terrain.js';
import { DISCOVERY_TEXT, TYPES } from '../world/types.js';
import { MK, PORCOES, REGROW, abrigo, addObject, bird, cave, jac, objects, setFood } from '../world/objects.js';
import { findPath, isFree } from '../world/pathfinding.js';
import { capy } from '../capy/capybara.js';
import { gameWait, raining } from '../world/simulation.js';
import { distTo } from './perception.js';
import { PERSONALIDADE, callAI, nomeDe } from './brain.js';

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
    case 'explorar': return doExplorar(dec);
    case 'pesquisar': return H.doPesquisa(dec);
    case 'fotografar': return H.doFoto(dec, o);
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
    const r = jacareAtaca(jac); await reactAttack(); applyDeltas(r.d); G.lastOutcome = { key: `${dec.acao}:lago`, d: r.d, extra: 'perto:jacare' };
    return r.msg;
  }
  if (!efeito) {
    capy.anim = 'curiosa'; capy.animT = 0; await gameWait(2);
    return `Você tentou ${dec.acao} ${t.nome}, mas nada de interessante aconteceu.`;
  }
  const r = efeito(o);
  H.discover(`${dec.acao}:${o.type}`, DISCOVERY_TEXT[`${dec.acao}:${o.type}`] || `${dec.acao} ${t.nome}`);
  if (r.anim === 'nadar' && o.radius) {          // entra na água e dá uma voltinha
    const edge = capy.pos.clone();
    capy.swim = true; H.sfx('splash');
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
  if (r.pickup) H.attachGoPro(o);
  G.lastOutcome = { key: `${dec.acao}:${o.type}`, d: r.d };
  if (dec.acao === 'comer' && o.porcoes > 0 && --o.porcoes === 0) {
    setFood(o, false);
    gameWait(REGROW).then(() => { o.porcoes = PORCOES[o.type]; setFood(o, true); });
  }
  if (r.remove) removeObject(o);
  return r.msg;
}

// ---- Explorar: viagem até uma região onde ela nunca esteve ----
const BIOMA_TXT = { campo: 'um campo aberto de grama e flores', mata: 'uma mata fechada, úmida e sombreada', brejo: 'um brejo de plantas altas e chão molhado', pedregal: 'um pedregal alto, seco e cheio de pedras' };
async function doExplorar(dec) {
  let alvoReg = dec.destino && !state.regioes[dec.destino] ? dec.destino : null;
  if (!alvoReg) {   // escolhe uma região nova a uns 30 m (nem colada, nem do outro lado do mundo)
    const cands = [];
    for (let i = 0; i < NREG; i++) for (let j = 0; j < NREG; j++) {
      const k = i + ',' + j; if (state.regioes[k]) continue;
      const c = centroRegiao(k); cands.push({ k, d: Math.hypot(c.x - capy.pos.x, c.z - capy.pos.z) });
    }
    if (!cands.length) return 'Você já esteve em todas as regiões. Caminhou um pouco e reconheceu cada canto.';
    cands.sort((x, y) => Math.abs(x.d - 32) - Math.abs(y.d - 32));
    alvoReg = pick(cands.slice(0, 3)).k;
  }
  const c = centroRegiao(alvoReg);
  let p = new THREE.Vector3(c.x + rand(-5, 5), 0, c.z + rand(-5, 5));
  for (let i = 0; i < 20 && !isFree(p); i++) p = new THREE.Vector3(c.x + rand(-9, 9), 0, c.z + rand(-9, 9));
  await walkTo(p, { maxTime: 75 });
  const chegou = regiaoDe(capy.pos.x, capy.pos.z) === alvoReg;
  const bio = biomeAt(capy.pos.x, capy.pos.z);
  H.discover('explorar:' + bio, 'chegar a ' + BIOMA_TXT[bio].split(' de ')[0].split(',')[0]);
  applyDeltas({ tedio: -25, energia: -6 });
  return chegou ? `Depois de uma longa caminhada, você chegou a uma região nova: ${BIOMA_TXT[bio]}.` : `Você caminhou muito em direção a uma região nova e parou em ${BIOMA_TXT[bio]}.`;
}

// ---- Jacaré ----
function jacareAmeaca() {
  return jac.mode === 'nadar' && G.gameTime > (jac.calmUntil || 0) && Math.hypot(jac.pos.x - capy.pos.x, jac.pos.z - capy.pos.z) < 8 && Math.random() < 0.55;
}
function jacareAtaca() {
  jac.mode = 'ataque'; jac.until = G.gameTime + 2.5; jac.calmUntil = G.gameTime + 120;   // depois de atacar, fica um tempo quieto
  jac.target = capy.pos.clone().lerp(jac.pos, 0.35);
  H.showEmoji('😱'); H.sfx('ataque');
  hurtFx();
  return { d: { humor: -30, energia: -10, saude: -30 }, msg: 'Quando você chegou perto, um bicho comprido e escuro saltou da água com a boca cheia de dentes e te mordeu! Doeu muito. Você fugiu correndo, com o coração disparado.', anim: 'tremer' };
}
async function reactAttack() {
  capy.swim = false; capy.anim = 'tremer'; capy.animT = 0;
  await gameWait(0.8);
  const dir = capy.pos.clone().sub(new THREE.Vector3(LAKE.x, 0, LAKE.z)).setY(0).normalize();
  const p = capy.pos.clone().addScaledVector(dir, 9); p.x = clamp(p.x, -LIM, LIM); p.z = clamp(p.z, -LIM, LIM);
  await walkTo(p, { run: true });
}
function lakePoint(r) { const a = rand(0, 6.28); return new THREE.Vector3(LAKE.x + Math.cos(a) * r, 0, LAKE.z + Math.sin(a) * r); }
// efeito de dano na tela (flash vermelho)
function hurtFx() { const fl = document.getElementById('flash'); fl.classList.remove('go', 'hurt'); void fl.offsetWidth; fl.classList.add('go', 'hurt'); }
// Mordida por proximidade: chegou perto demais (na água ou na margem), o jacaré dá o bote
function jacareMorde() {
  jac.mode = 'ataque'; jac.until = G.gameTime + 1.6; jac.calmUntil = G.gameTime + 90;
  jac.target = capy.pos.clone().lerp(jac.pos, 0.3);
  H.showEmoji('😱'); H.sfx('ataque'); hurtFx();
  applyDeltas({ saude: capy.swim ? -40 : -30, humor: -30, energia: -10 });
  const c = state.crencas['perto:jacare'] ||= { bom: 0, ruim: 0 }; c.ruim++;
  pendingNotes.push('De repente o bicho comprido e escuro saltou e te MORDEU! Doeu muito e você saiu correndo. Chegar perto dele é perigoso.');
  // foge correndo para longe dele, interrompendo o que estava fazendo
  capy.swim = false;
  const dir = capy.pos.clone().sub(jac.pos).setY(0).normalize();
  const p = capy.pos.clone().addScaledVector(dir, 10); p.x = clamp(p.x, -LIM, LIM); p.z = clamp(p.z, -LIM, LIM);
  capy.speed = 4.5; capy.path = findPath(capy.pos, p); capy.anim = 'correr'; capy.animT = 0;
}
function updateJacare(dt) {
  const dCapy = Math.hypot(jac.pos.x - capy.pos.x, jac.pos.z - capy.pos.z);
  if (jac.mode !== 'ataque' && G.gameTime > (jac.calmUntil || 0) && capy.anim !== 'dormir' && dCapy < (jac.mode === 'sol' ? 3 : 4)) jacareMorde();
  const capyNearWater = Math.hypot(capy.pos.x - LAKE.x, capy.pos.z - LAKE.z) < LAKE.r + 4;
  if (jac.mode === 'nadar') {
    // espreita: se a capivara fica perto da margem, vai devagar na direção dela
    if (capyNearWater) { const d = capy.pos.clone().sub(new THREE.Vector3(LAKE.x, 0, LAKE.z)).setY(0); d.setLength(Math.min(d.length(), LAKE.r - 1)); jac.target.set(LAKE.x + d.x, 0, LAKE.z + d.z); }
    else if (jac.pos.distanceTo(jac.target) < 0.5 || Math.random() < 0.002) jac.target = lakePoint(rand(0, LAKE.r - 1.5));
    if (G.gameTime > jac.nextBask && !isNight() && !raining && !capyNearWater) {
      jac.nextBask = G.gameTime + rand(60, 120);
      if (Math.random() < 0.5) { jac.mode = 'sol'; jac.until = G.gameTime + rand(20, 35); jac.target = lakePoint(LAKE.r + 1.8); }
    }
  } else if (jac.mode === 'sol' && G.gameTime > jac.until) { jac.mode = 'nadar'; jac.target = lakePoint(LAKE.r - 2); }
  else if (jac.mode === 'ataque' && G.gameTime > jac.until) { jac.mode = 'nadar'; jac.target = lakePoint(LAKE.r - 2.5); }
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
  if (jac.tail) jac.tail.rotation.y = Math.sin(G.gameTime * (jac.mode === 'sol' ? 0.5 : 2)) * (jac.mode === 'sol' ? 0.05 : 0.3);
  TYPES.jacare.desc = inWater ? 'dois olhinhos e um dorso escuro e rugoso boiando na água grande' : 'um bicho comprido, escuro e escamoso, deitado imóvel na margem da água grande';
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
  G.lastOutcome = { key: 'necessidades:coco', d: { humor: 5 } };
  H.discover('necessidades:coco', 'fazer as necessidades');
  H.sfx('xixi');
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
G.lastContradiction = null;
function updateBelief({ key, d, extra }) {
  const score = -(d.fome || 0) - (d.sede || 0) + (d.energia || 0) + (d.humor || 0) + (d.saude || 0) * 1.5;
  const res = score > 3 ? 'bom' : score < -3 ? 'ruim' : null;
  if (!res) return null;
  const keys = [key, extra].filter(Boolean);
  let note = null;
  for (const k of keys) {
    const c = state.crencas[k] ||= { bom: 0, ruim: 0 };
    const antes = res === 'ruim' ? c.bom : c.ruim;
    c[res]++;
    if (k === key && antes >= 1 && c[res] === 1) {
      G.lastContradiction = { key, res };
      note = res === 'ruim' ? 'Isso contradiz o que você esperava: das outras vezes tinha sido bom.' : 'Curioso: das outras vezes isso tinha feito mal, mas desta vez foi bom.';
    }
  }
  H.renderMemory();
  return note;
}

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
  H.renderLog(false); H.renderDiary(); save();
}

// acesso tardio para módulos carregados antes deste
Object.defineProperties(H, {
  jacareAtaca: { get: () => jacareAtaca },
  updateJacare: { get: () => updateJacare },
});
export { applyDeltas, approachPoint, executeAction, faceTowards, updateBelief, walkTo, writeDiary };
