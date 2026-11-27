// Percepção: o que a capivara vê (sem efeitos ocultos).
// (módulo 11/20 da Capivara Explora)
import * as THREE from 'three';
import { G, H } from '../core/runtime.js';
import { HALF, NREG, PERCEPTION_RADIUS, centroRegiao, isNight, periodName, state } from '../core/config.js';
import { LAKE, streamZ } from '../world/terrain.js';
import { TYPES } from '../world/types.js';
import { objects, pc } from '../world/objects.js';
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
// Manual que veio com a câmera: entra em toda percepção enquanto ela tem a câmera
const MANUAL_CAMERA = (semFoto, semClipe) => [
  'MANUAL DA CÂMERA (o papel que veio com a coisinha de olho azul):',
  '  1. Para guardar uma imagem: ação "fotografar", "alvo" = o id do que você quer guardar (ou null para a paisagem) e "legenda" = uma frase sua sobre a imagem.',
  '  2. Para gravar o seu vlog: em QUALQUER ação, use "gravar": true e escreva em "narracao" o que você diz para quem vai assistir. A câmera filma a ação inteira do seu ponto de vista.',
  '  3. Bons momentos para registrar: algo que você vê ou prova pela primeira vez, a luz do amanhecer e do pôr do sol, a água, bichos, lugares novos, sustos, descobertas no computador.',
  '  4. Uma boa exploradora registra o caminho: tente guardar uma imagem ou um vídeo a cada 3 ou 4 ações.',
  `  Agora: ${state.ultimaFoto < 0 ? 'você ainda não guardou nenhuma imagem.' : semFoto > 4 ? `faz ${semFoto} ações que você não guarda nenhuma imagem.` : 'você guardou uma imagem há pouco.'} ${state.ultimoClipe < 0 ? 'Você ainda não gravou nenhum vídeo para o seu vlog.' : semClipe > 4 ? `Faz ${semClipe} ações que você não grava vídeo.` : 'Você gravou um vídeo há pouco.'}`,
];
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
  // regiões ainda não visitadas, das mais próximas para as mais distantes
  const novas = [];
  for (let i = 0; i < NREG; i++) for (let j = 0; j < NREG; j++) {
    const k = i + ',' + j; if (state.regioes[k]) continue;
    const c = centroRegiao(k), d = Math.round(Math.hypot(c.x - capy.pos.x, c.z - capy.pos.z));
    novas.push({ k, d, dir: directionWord(new THREE.Vector3(c.x, 0, c.z)) });
  }
  novas.sort((a, b) => a.d - b.d); novas.splice(5);
  const s = state.stats;
  const h = Math.floor(state.clock * 24), mi = Math.floor((state.clock * 24 % 1) * 60);
  const vazio = o => o.porcoes === 0 ? ' (agora sem nada comestível à vista)' : '';
  return {
    visiveis, lembrados,
    texto: [
      `Hora: ${periodName()} (${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}), dia ${state.day}.`,
      `Clima: ${raining ? 'chovendo' : isNight() ? 'noite tranquila' : 'tempo bom'}.${inCave() ? ' Você está abrigada, protegida da chuva.' : ''}${G.gameTime < G.sickUntil ? ' Você está ENJOADA, a barriga revirando.' : ''}`,
      `Seus status (0-100): fome ${s.fome | 0} (alto = faminta), sede ${s.sede | 0} (alto = sedenta), energia ${s.energia | 0} (baixo = exausta), humor ${s.humor | 0} (alto = feliz), saúde ${s.saude | 0} (baixa = machucada; dormir recupera). Sensação de temperatura: ${s.frio > 70 ? 'muito frio, tremendo' : s.frio > 45 ? 'um pouco de frio' : 'confortável'}. Vontade de fazer cocô/xixi: ${s.bexiga > 85 ? 'urgente' : s.bexiga > 65 ? 'grande' : 'pouca'} (ação necessidades). Tédio: ${s.tedio > 70 ? 'muito entediada, precisa de novidade' : s.tedio > 45 ? 'um pouco entediada' : 'curiosa e entretida'}.`,
      'O que você vê ao redor (raio de 15 m):',
      ...(visiveis.length ? visiveis.map(({ o, d }) => `- id "${o.id}": ${TYPES[o.type].desc}${vazio(o)} — ${d.toFixed(1)} m, ${directionWord(o.pos)}`) : ['- nada de especial, só grama']),
      'Lugares que você lembra de ter visto (fora da vista agora; pode ir até eles pelo id):',
      ...(lembrados.length ? lembrados.map(({ id, m, d }) => `- id "${id}": ${TYPES[m.t].desc} — uns ${Math.round(d)} m, ${directionWord(new THREE.Vector3(m.x, 0, m.z))}`) : ['- nenhum ainda']),
      ...(state.temCamera ? MANUAL_CAMERA(state.ciclo - state.ultimaFoto, state.ciclo - state.ultimoClipe) : []),
      ...(G.gopro && (visIds.has(G.gopro.id) || state.mapa[G.gopro.id]) ? ['Dica: a coisinha preta com olho de vidro parece algo que dá para levar com você (ação "pegar").'] : []),
      ...(visIds.has(pc.id) || state.mapa[pc.id] ? [`A caixinha brilhante (id "${pc.id}") responde perguntas sobre o mundo: use a ação "pesquisar" e escreva em "pesquisa" de 1 a 3 palavras-chave, como numa enciclopédia (ex: "jacaré", "cogumelo venenoso", "pôr do sol"). Você pode ir até ela de qualquer lugar.`] : []),
      'Regiões do mapa onde você nunca esteve (ação "explorar" com "destino" = o id da região; são viagens longas):',
      ...(novas.length ? novas.map(r => `- regiao "${r.k}": ${r.dir}, a uns ${r.d} m`) : ['- você já passou por todas as regiões']),
      ...(state.pesquisas.length ? ['O que você já leu na caixinha brilhante:', ...state.pesquisas.slice(-3).map(p => `- "${p.q}": ${p.titulo ? p.titulo + ' — ' + p.resumo.slice(0, 140) : 'nada encontrado'}`)] : []),
      'Suas experiências anteriores (quantas vezes foi bom ou ruim):',
      ...(crencas.length ? crencas.map(([k, c]) => `- ${k.split(':')[0]} ${TYPES[k.split(':')[1]].desc}: ${c.bom} vez(es) bom, ${c.ruim} vez(es) ruim`) : ['- nenhuma ainda']),
    ].join('\n'),
  };
}

export { buildPerception, distTo };
