// Percepção: o que a capivara vê (sem efeitos ocultos).
// (módulo 11/20 da Capivara Explora)
import * as THREE from 'three';
import { G, H } from '../core/runtime.js';
import { HALF, PERCEPTION_RADIUS, isNight, periodName, state } from '../core/config.js';
import { LAKE, streamZ } from '../world/terrain.js';
import { TYPES } from '../world/types.js';
import { objects } from '../world/objects.js';
import { capy } from '../capy/capybara.js';
import { inCave, raining } from '../world/simulation.js';

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
  visiveis.forEach(({ o }) => H.discover(`ver:${o.type}`, `encontrou ${TYPES[o.type].nome}`));
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
      `Clima: ${raining ? 'chovendo' : isNight() ? 'noite tranquila' : 'tempo bom'}.${inCave() ? ' Você está abrigada, protegida da chuva.' : ''}${G.gameTime < G.sickUntil ? ' Você está ENJOADA, a barriga revirando.' : ''}`,
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

export { buildPerception, distTo };
