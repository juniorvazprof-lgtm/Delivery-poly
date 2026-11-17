// Pine Hollow · laço principal: liga mundo, herói, combate, ciclo de dia e noite, abrigos, inventário e interface.
// ?bot=1 joga sozinho (para testes); ?rapido=N acelera a simulação N vezes; ?hora=H começa nessa hora.
import * as T from './lib/three.module.js';
import { CFG } from './config.js';
import { criarRender } from './render.js';
import { criarMundo } from './mundo.js';
import { criarHeroi, criarEntrada } from './heroi.js';
import { criarCombate } from './combate.js';
import { criarMissao } from './missao.js';
import { criarHud } from './hud.js';
import { criarBot } from './bot.js';
import { criarCiclo, aplicarLuz } from './ciclo.js';
import { criarAbrigos } from './abrigos.js';
import { ITENS } from './itens.js';
import { remover } from './inventario.js';
import { temSalvo } from './salvo.js';
import { t, idioma, setIdioma } from './i18n.js';
import { SOM } from './sons.js';

const qs = new URLSearchParams(location.search), RAPIDO = Math.min(20, Math.max(1, Number(qs.get('rapido')) || 1));
const render = criarRender(document.getElementById('view'));
const mundo = criarMundo(CFG.area.semente, CFG.area.mundo);
const heroi = criarHeroi(mundo.scene);
const entrada = criarEntrada();
const hud = criarHud();
const abrigos = criarAbrigos(mundo);
let missao = null, pausa = false;
const hurt = document.getElementById('hurt'), avisos = {};
const nomeItem = id => t(ITENS[id]?.nome || id);
const combate = criarCombate(mundo, heroi, render, {
  abate: () => missao.abate(),
  pegou: (id, qtd) => hud.ganho(t('ui.pegou', { qtd, item: nomeItem(id) })),
  cheio: () => hud.ganho(t('ui.inv.cheio')),
  tiro: () => {}, recarga: () => {},
  repelir: (x, z) => abrigos.repelir(x, z),
  alertaGritador: () => { if (!avisos.gritador) { avisos.gritador = true; hud.radio(hud.fala('fala.gritador'), 3, 'quem.radio'); } },
  semMunicao: () => hud.ganho(t('ui.sem.municao')),
  mordida(dano) {
    if (heroi.invul > 0 || heroi.caido || abrigos.dentro(heroi.g.position)) return;
    heroi.vida = Math.max(0, heroi.vida - dano); SOM.dor(); heroi.invul = CFG.heroi.invul; render.tremer(0.15);
    hurt.style.opacity = 1; setTimeout(() => (hurt.style.opacity = 0), 140);
    if (heroi.vida <= 0) { heroi.caido = true; missao.caiu(); }
  },
});
const ciclo = criarCiclo({ anoitecer: () => missao.anoitecer(), amanhecer: () => missao.amanhecer() });
missao = criarMissao({ mundo, heroi, combate, hud, ciclo, abrigos });
hud.somBotao();
const bot = qs.get('bot') ? criarBot({ heroi, combate, missao, mundo, entrada }) : null;

/** Tela de título: continuar do último abrigo, começar de novo e escolher o idioma. */
function mostrarTitulo() {
  const tela = document.getElementById('telaContrato'); tela.textContent = '';
  const papel = el('div', 'papel'); tela.append(papel);
  papel.append(el('small', '', 'Pine Hollow'), el('h1', '', t('ui.titulo')), el('p', 'brief', `“${t('ui.subtitulo')}”`));
  const iniciar = fn => () => { SOM.iniciar(); tela.hidden = true; document.body.classList.remove('emTela'); for (const k in avisos) delete avisos[k]; fn(); if (qs.get('hora')) ciclo.pular(Number(qs.get('hora'))); };
  if (temSalvo()) { const b = el('button', 'btn', t('ui.continuar')); b.id = 'continuar'; b.onclick = iniciar(missao.continuar); papel.append(b); }
  const novo = el('button', temSalvo() ? 'btn sec' : 'btn', temSalvo() ? t('ui.novo') : t('ui.comecar')); novo.id = 'comecar'; novo.onclick = iniciar(missao.novo); papel.append(novo);
  const lang = el('button', 'btn sec', `${t('ui.idioma')}: ${idioma() === 'en' ? 'English' : 'Português'}`);
  lang.onclick = () => { setIdioma(idioma() === 'en' ? 'pt' : 'en'); mostrarTitulo(); }; papel.append(lang);
  tela.hidden = false; document.getElementById('telaFim').hidden = true; document.body.classList.add('emTela');
  if (bot) novo.click();   // no modo bot, começa sozinho
}
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
hud.aoRecomecar(acao => { if (acao === 'carregar' && temSalvo()) { SOM.iniciar(); missao.continuar(); } else mostrarTitulo(); });

// ---------- abrigo: salvar, baú, dormir ----------
function abrirAbrigo(a) {
  pausa = true;
  hud.abrigo({ nome: t(a.nome), noite: ciclo.noite,
    salvar: () => { missao.salvarAqui(a.id); hud.ganho(t('ui.abrigo.salvo')); },
    bau: () => abrirInventario(missao.bau),
    dormir: () => { missao.dormir(); missao.salvarAqui(a.id); hud.aviso(t('ui.amanhece'), 3); },
    fechar: () => { pausa = false; } });
}
// ---------- inventário (tela feita no ui-inventario.js, carregada quando abre) ----------
async function abrirInventario(bau = null) {
  pausa = true;
  const ui = await import('./ui-inventario.js');
  ui.abrirInventario({ inv: heroi.inv, bau, equipada: combate.arma.atual,
    usar: i => usarItem(i), equipar: id => combate.trocar(id),
    aoFechar: () => { pausa = !!document.querySelector('#telaAbrigo:not([hidden])'); } });
}
/** Usar um item do inventário: curar, trocar a pilha, acender uma vela. Devolve a mensagem para a tela. */
function usarItem(i) {
  const s = heroi.inv.slots[i]; if (!s || !s.id) return null; const it = ITENS[s.id];
  if (it.tipo === 'cura') { if (heroi.vida >= CFG.heroi.vida) return t('ui.inv.nada'); remover(heroi.inv, s.id, 1); heroi.vida = Math.min(CFG.heroi.vida, heroi.vida + it.cura); SOM.pilha(); return `+${it.cura} ♥`; }
  if (s.id === 'pilha') { if (heroi.bateria > 0.95) return t('ui.inv.nada'); remover(heroi.inv, 'pilha', 1); heroi.bateria = 1; avisos.bateria = false; heroi.setLanterna(true); SOM.pilha(); return t('ui.pilha.nova'); }
  if (s.id === 'vela') { remover(heroi.inv, 'vela', 1); combate.lancarSinalizador(); return nomeItem('vela'); }
  return t('ui.inv.nada');
}
document.getElementById('bag').onclick = () => { if (missao.ativo && !heroi.caido) abrirInventario(); };
document.getElementById('rest').onclick = () => { const a = abrigos.perto(heroi.g.position); if (a && missao.ativo) abrirAbrigo(a); };
addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (e.repeat || !missao.ativo || pausa) return;
  if (k === 'i' || k === 'tab') { e.preventDefault(); abrirInventario(); } if (k === 'e') document.getElementById('rest').click(); });

const tmp = new T.Vector3();
let ultimo = performance.now(), acumulado = 0, tempo = 0, passoT = 0, trocaPilha = 0;
function passo(dt) {
  tempo += dt;
  if (bot) bot.passo(dt);
  const ativo = missao.ativo;
  if (ativo) ciclo.passo(dt);
  // movimento relativo à tela; joystick até a metade = andar devagar e em silêncio
  let [ix, iz] = entrada.direcao(); let mag = Math.min(1, Math.hypot(ix, iz));
  // mirando: o herói para; o joystick só gira a mira devagar
  const mirando = ativo && !heroi.caido && combate.gatilho(dt, entrada.atirando);
  if (mirando && mag > 0.2) { const alvo = Math.atan2(tmp.copy(render.right).multiplyScalar(ix).addScaledVector(render.fwd, -iz).x, tmp.z); let da = alvo - heroi.g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); heroi.g.rotation.y += Math.sign(da) * Math.min(Math.abs(da), dt * 2.2); }
  if (mirando) mag = 0;
  heroi.devagar = ativo && mag > 0.05 && mag <= CFG.heroi.devagar + 0.02;
  if (ativo && !heroi.caido && mag > 0.05) {
    const dir = tmp.copy(render.right).multiplyScalar(ix).addScaledVector(render.fwd, -iz).normalize(), sp = CFG.heroi.velocidade * (heroi.devagar ? 0.45 : mag);
    const [nx, nz] = mundo.resolver(heroi.g.position.x + dir.x * sp * dt, heroi.g.position.z + dir.z * sp * dt, CFG.heroi.raio);
    heroi.g.position.x = nx; heroi.g.position.z = nz;
    let da = Math.atan2(dir.x, dir.z) - heroi.g.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); heroi.g.rotation.y += da * Math.min(1, dt * 12);
    // passos: andando normal, cada passada faz um pouco de barulho (de dia não há quem escute)
    if (!heroi.devagar && (passoT -= dt) <= 0) { passoT = CFG.passos.cada; SOM.passo(); if (ciclo.noite) combate.ruido(heroi.g.position, CFG.passos.raio, '#5d6a8a'); }
  }
  // bateria da lanterna: gasta ligada, pisca quando fraca e troca de pilha sozinha se tiver uma no inventário
  if (ativo && heroi.lanterna && heroi.bateria > 0) {
    heroi.bateria -= dt / CFG.lanterna.duracao;
    if (heroi.bateria < CFG.lanterna.fraca && !avisos.bateria) { avisos.bateria = true; hud.radio(hud.fala('fala.bateria'), 2.5, 'quem.voce'); }
    heroi.piscar = heroi.bateria < CFG.lanterna.fraca && Math.random() < 0.06 * (1 - heroi.bateria / CFG.lanterna.fraca) * 3;
    if (heroi.bateria <= 0) { heroi.bateria = 0; heroi.setLanterna(false); if (heroi.pilhas > 0) trocaPilha = CFG.lanterna.troca; else hud.radio(t('ui.sem.pilha'), 3, 'quem.voce'); }
  }
  if (trocaPilha > 0 && (trocaPilha -= dt) <= 0) { if (heroi.pilhas > 0) { heroi.pilhas--; heroi.bateria = 1; avisos.bateria = false; heroi.setLanterna(true); SOM.pilha(); hud.ganho(t('ui.pilha.nova')); } }
  if (entrada.lanterna) { entrada.lanterna = 0; if (ativo && heroi.bateria > 0) { heroi.setLanterna(!heroi.lanterna); SOM.lanterna(); }
    else if (ativo && heroi.pilhas > 0 && trocaPilha <= 0) trocaPilha = CFG.lanterna.troca; }
  if (entrada.sinalizador) { entrada.sinalizador = 0; if (ativo && !heroi.caido && heroi.sinalizadores > 0) { heroi.sinalizadores--; combate.lancarSinalizador(); } }
  if (entrada.trocar) { entrada.trocar = 0; if (ativo && !heroi.caido) combate.trocar(); }
  if (entrada.recarregar) { entrada.recarregar = 0; if (ativo) combate.recarregar(); }
  // primeira mariposa à vista: aviso
  if (ativo && !avisos.mariposa && combate.zumbis.some(z => z.tipo === 'mariposa' && z.visivel && !z.morto)) { avisos.mariposa = true; hud.radio(hud.fala('fala.mariposa'), 3, 'quem.voce'); }
  heroi.invul = Math.max(0, heroi.invul - dt);
  heroi.animar(dt, tempo, ativo ? mag : 0);
  if (heroi.caido && missao.estado === 'caido') heroi.corpo.rotation.x = Math.max(-Math.PI / 2, heroi.corpo.rotation.x - dt * 5); else heroi.corpo.rotation.x = 0;
  combate.passo(dt, tempo);
  missao.passo(dt);
}

function quadro(agora) {
  requestAnimationFrame(quadro);
  const dtReal = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
  if (!pausa) {
    acumulado += dtReal * RAPIDO; let n = 0;
    while (acumulado >= CFG.sim.dt && n < CFG.sim.maxSteps * RAPIDO) { passo(CFG.sim.dt); acumulado -= CFG.sim.dt; n++; }
    if (n >= CFG.sim.maxSteps * RAPIDO) acumulado = 0;
  } else acumulado = 0;
  render.seguir(heroi.g.position, dtReal);
  mundo.ambiente(tempo, render.focus); aplicarLuz(mundo, ciclo); abrigos.animar(tempo);
  hud.quadro(dtReal, { m: missao, heroi, arma: combate.arma, ciclo, abrigo: missao.ativo && !pausa ? abrigos.perto(heroi.g.position) : null });
  render.desenhar(mundo.scene);
}
render.seguir(heroi.g.position, 0, true);
mostrarTitulo();
addEventListener('idioma', () => { if (!missao.ativo) mostrarTitulo(); });
requestAnimationFrame(quadro);
window.__jogo = { heroi, combate, missao, mundo, entrada, CFG, bot, ciclo, abrigos, get pausa() { return pausa; } };
