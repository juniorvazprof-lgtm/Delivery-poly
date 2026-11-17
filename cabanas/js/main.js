// Cabanas na Floresta · laço principal: liga mundo, herói, combate, missão e interface.
// ?bot=1 joga sozinho (para testes); ?rapido=N acelera a simulação N vezes.
import * as T from './lib/three.module.js';
import { CFG } from './config.js';
import { criarRender } from './render.js';
import { criarMundo } from './mundo.js';
import { criarHeroi, criarEntrada } from './heroi.js';
import { criarCombate } from './combate.js';
import { criarMissao } from './missao.js';
import { criarHud } from './hud.js';
import { criarBot } from './bot.js';
import { SOM } from './sons.js';

const qs = new URLSearchParams(location.search), RAPIDO = Math.min(20, Math.max(1, Number(qs.get('rapido')) || 1));
const render = criarRender(document.getElementById('view'));
const mundo = criarMundo(CFG.contrato.semente, CFG.contrato.mundo);
const heroi = criarHeroi(mundo.scene);
const entrada = criarEntrada();
const hud = criarHud();
let missao = null;
const hurt = document.getElementById('hurt');
const combate = criarCombate(mundo, heroi, render, {
  abate: () => missao.abate(),
  saque: (tipo, sats) => missao.ganhoSaque(tipo, sats),
  municao: (n, qual) => hud.ganho('municao', 0, `${n} balas de ${CFG.armas[qual].nome.toLowerCase()}`),
  tiro: () => {}, recarga: () => {}, semMunicao: () => hud.radio('Sem munição! Procure as caixas nas cabanas.', 2.5),
  mordida(dano) {
    if (heroi.invul > 0 || heroi.caido) return;
    heroi.vida = Math.max(0, heroi.vida - dano); SOM.dor(); heroi.invul = CFG.heroi.invul; render.tremer(0.15);
    hurt.style.opacity = 1; setTimeout(() => (hurt.style.opacity = 0), 140);
    if (heroi.vida <= 0) { heroi.caido = true; missao.caiu(); }
  },
});
missao = criarMissao({ mundo, heroi, combate, hud });
hud.somBotao();
const bot = qs.get('bot') ? criarBot({ heroi, combate, missao, mundo, entrada }) : null;

function comecar() { hud.contrato(missao.carteira, () => missao.iniciar()); if (bot) document.getElementById('aceitar').click(); }
hud.aoRecomecar(() => { heroi.g.visible = true; feixe.visible = false; comecar(); });

// feixe de luz da extração (o helicóptero "puxa" o jogador)
const feixe = new T.Mesh(new T.CylinderGeometry(0.9, 1.4, 16, 8, 1, true), new T.MeshBasicMaterial({ color: '#f8e6a0', transparent: true, opacity: 0.45 }));
feixe.visible = false; mundo.scene.add(feixe);

const tmp = new T.Vector3();
let ultimo = performance.now(), acumulado = 0, tempo = 0, extraidoT = 0;
function passo(dt) {
  tempo += dt;
  if (bot) bot.passo(dt);
  const ativo = missao.estado === 'limpeza' || missao.estado === 'extracao';
  // movimento relativo à tela
  let [ix, iz] = entrada.direcao(); const mag = Math.min(1, Math.hypot(ix, iz));
  if (ativo && !heroi.caido && mag > 0.05) {
    const dir = tmp.copy(render.right).multiplyScalar(ix).addScaledVector(render.fwd, -iz).normalize(), sp = CFG.heroi.velocidade * mag;
    const [nx, nz] = mundo.resolver(heroi.g.position.x + dir.x * sp * dt, heroi.g.position.z + dir.z * sp * dt, CFG.heroi.raio);
    heroi.g.position.x = nx; heroi.g.position.z = nz;
    let da = Math.atan2(dir.x, dir.z) - heroi.g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); heroi.g.rotation.y += da * Math.min(1, dt * 12);
  }
  if (entrada.lanterna) { entrada.lanterna = 0; if (ativo) { heroi.setLanterna(!heroi.lanterna); SOM.lanterna(); } }
  if (entrada.trocar) { entrada.trocar = 0; if (ativo && !heroi.caido) combate.trocar(); }
  if (entrada.recarregar) { entrada.recarregar = 0; if (ativo) combate.recarregar(); }
  if (ativo && entrada.atirando && !heroi.caido) combate.atirar();
  heroi.invul = Math.max(0, heroi.invul - dt);
  heroi.animar(dt, tempo, ativo ? mag : 0);
  if (heroi.caido && missao.estado === 'caido') heroi.corpo.rotation.x = Math.max(-Math.PI / 2, heroi.corpo.rotation.x - dt * 5); else heroi.corpo.rotation.x = 0;
  combate.passo(dt, tempo);
  missao.passo(dt);
  if (missao.estado === 'pago') {
    if (extraidoT === 0) { heroi.caido = true; feixe.visible = true; }
    extraidoT += dt; feixe.position.set(heroi.g.position.x, 8, heroi.g.position.z); feixe.material.opacity = 0.3 + Math.sin(tempo * 20) * 0.1;
    heroi.g.position.y = Math.min(6, extraidoT * extraidoT * 2); if (extraidoT > 1.6) heroi.g.visible = false;
  } else { extraidoT = 0; heroi.g.position.y = 0; }
  mundo.animarSinal(tempo, missao.segurando / CFG.extracao.segurar);
}

function quadro(agora) {
  requestAnimationFrame(quadro);
  const dtReal = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
  acumulado += dtReal * RAPIDO; let n = 0;
  while (acumulado >= CFG.sim.dt && n < CFG.sim.maxSteps * RAPIDO) { passo(CFG.sim.dt); acumulado -= CFG.sim.dt; n++; }
  if (n >= CFG.sim.maxSteps * RAPIDO) acumulado = 0;
  render.seguir(heroi.g.position, dtReal);
  mundo.ambiente(tempo, render.focus);
  hud.quadro(dtReal, { m: missao, heroi, arma: combate.arma, sinal: mundo.sinal, render });
  render.desenhar(mundo.scene);
}
render.seguir(heroi.g.position, 0, true);
comecar();
requestAnimationFrame(quadro);
window.__jogo = { heroi, combate, missao, mundo, entrada, CFG, bot };
