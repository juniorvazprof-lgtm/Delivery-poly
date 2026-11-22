import { IDEAIS } from '../data/ideais.js';
import { PASSIVAS } from '../data/passivas.js';
import { MELHORIAS } from '../data/melhorias.js';
import { HEROIS_EVOLUIDOS } from '../data/evolucoes.js';
import { HEROIS } from '../data/herois.js';
import { VILOES } from '../data/viloes.js';
import { RELIQUIAS } from '../data/reliquias.js';
import { CONSUMIVEIS } from '../data/consumiveis.js';
import { RODADAS, ECONOMIA } from '../data/rodadas.js';
import { criarBatalha, resumo, usarTonico, usarMeteoro, DT } from '../core/combate.js';
import { criarVisual } from '../render/batalha3d.js';
import { avaliar, mostrarToast, painelConquistas } from './conquistas.js'; // visual 3D chibi (o 2D continua em render/batalha.js)
import {
  criarRun, opcoesDaRodada, disponiveis, precoHeroi, recrutar,
  comprarConsumivel, comprarReliquiaLoja, usarPocao, usarBandagem, usarTrombeta, compradoNestaRodada,
  custoSoldo, validarEnvio, prepararBatalha, gastarConsumivel,
  estrelas, concluirBatalha, escolherBau, pularBau, comprarPassiva, opcoesEvolucao, evoluir,
  pontuacao, serializar, restaurar
} from '../core/run.js';
import {
  telaMenu, telaDesafio, telaTime, telaBatalha, telaResultado,
  telaBau, telaAcampamento, telaFim, modalComoJogar, modalRecordes, modalConteudo
} from './telas.js';

const CHAVE_RUN = 'qh_run';
const CHAVE_RECORDES = 'qh_recordes';

const app = document.getElementById('app');

let run = null;
let ideais = null;
let opcaoAtual = null;
let enviadosAtual = null;
let visualAtual = null;
let batalhaAtual = null;

function carregarIdeais(){
  return Promise.resolve(IDEAIS);
}

function salvarRun(){
  try {
    if (run) localStorage.setItem(CHAVE_RUN, serializar(run));
    else localStorage.removeItem(CHAVE_RUN);
  } catch (e) {}
}

function carregarRun(){
  try {
    const s = localStorage.getItem(CHAVE_RUN);
    if (!s) return null;
    return restaurar(s);
  } catch (e) { return null; }
}

function lerRecordes(){
  try {
    const s = localStorage.getItem(CHAVE_RECORDES);
    return s ? JSON.parse(s) : [];
  } catch (e) { return []; }
}

function gravarRecorde(rec){
  try {
    const lista = lerRecordes();
    lista.push(rec);
    lista.sort((a, b) => b.pontuacao - a.pontuacao);
    const top = lista.slice(0, 5);
    localStorage.setItem(CHAVE_RECORDES, JSON.stringify(top));
    return top;
  } catch (e) { return []; }
}

function destruirVisual(){
  if (visualAtual){ try { visualAtual.destruir(); } catch (e) {} visualAtual = null; }
  batalhaAtual = null;
}

function irMenu(){
  destruirVisual();
  telaMenu(app, {
    temRun: !!carregarRun(),
    aoNova: () => { run = null; salvarRun(); iniciarNovaJornada(); },
    aoContinuar: () => { const r = carregarRun(); if (r){ run = r; rotear(); } },
    aoComoJogar: () => modalComoJogar(app, { aoFechar: () => {} }),
    aoRecordes: () => modalRecordes(app, { recordes: lerRecordes(), aoFechar: () => {} }),
    aoDiario: () => { run = null; iniciarNovaJornada(true); },
    diarioInfo: (() => { const m = melhorDiario(); return m ? `recorde hoje ${m} pts` : ''; })(),
    aoConquistas: () => modalConteudo(app, { titulo: 'Conquistas', conteudo: painelConquistas(app) })
  });
}

// Desafio do dia: mesma semente para todos os jogadores no mesmo dia
function hojeStr(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function sementeDoDia(){ let h = 2166136261; for (const ch of 'qh-' + hojeStr()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h) % 1e9; }
function melhorDiario(){ try { const o = JSON.parse(localStorage.getItem('qh_diario') || '{}'); return o[hojeStr()] || 0; } catch (e) { return 0; } }
function gravarDiario(pts){ try { const o = JSON.parse(localStorage.getItem('qh_diario') || '{}'); o[hojeStr()] = Math.max(o[hojeStr()] || 0, pts); localStorage.setItem('qh_diario', JSON.stringify(o)); } catch (e) {} }
function avisar(evento, dados){ for (const c of avaliar(evento, dados)) mostrarToast(app, c); }

function iniciarNovaJornada(diario = false){
  const semente = diario ? sementeDoDia() : Math.floor(Math.random() * 1e9);
  run = criarRun({ semente, ideais });
  if (diario) run.diario = hojeStr();
  salvarRun();
  irDesafio();
}

function irDesafio(){
  if (!run) return irMenu();
  if (run.fim){ return irFim(); }
  const opcoes = opcoesDaRodada(run);
  telaDesafio(app, {
    run,
    opcoes,
    aoEscolher: (op) => { opcaoAtual = op; irTime(); },
    aoVoltar: () => { salvarRun(); irMenu(); }
  });
}

// Informação de cada classe no formato que as telas esperam
function infoClasses(run){
  const disp = disponiveis(run);
  const out = {};
  const todas = { ...HEROIS, ...HEROIS_EVOLUIDOS };
  for (const c of Object.keys(todas)){
    if (HEROIS_EVOLUIDOS[c] && !(run.elenco[c] > 0)) continue; // evoluídos só aparecem quando você tem
    out[c] = { ...todas[c], disponiveis: disp[c] || 0, total: run.elenco[c] || 0,
      desmaiados: run.desmaiados.filter((d) => d.classe === c && d.volta > run.rodada), preco: HEROIS[c] ? precoHeroi(run, c) : null };
  }
  return out;
}

function irTime(){
  if (!run || !opcaoAtual) return irDesafio();
  const disp = infoClasses(run);
  const precos = {};
  for (const c in disp) precos[c] = precoHeroi(run, c);
  telaTime(app, {
    run,
    opcao: opcaoAtual,
    disponiveis: disp,
    estrelasCalc: (op, env) => estrelas(op, env),
    custoSoldo: (env) => custoSoldo(env, run),
    validar: (op, env) => validarEnvio(run, op, env),
    aoMudar: (env) => { enviadosAtual = env; },
    aoLutar: (env) => { enviadosAtual = env; irBatalha(); },
    aoVoltar: () => { opcaoAtual = null; irDesafio(); },
    aoToggleChama: () => { run.chamaLigada = !run.chamaLigada; salvarRun(); irTime(); }
  });
}

function irBatalha(){
  if (!run || !opcaoAtual || !enviadosAtual) return irDesafio();
  const cfg = prepararBatalha(run, opcaoAtual, enviadosAtual);
  batalhaAtual = criarBatalha(cfg);
  const tela = telaBatalha(app, {
    run,
    cfg,
    aoFim: () => finalizarBatalha(resumo(batalhaAtual)), // o visual só avisa que acabou; o resumo vem do motor
    aoConsumivel: (id) => {
      if (!run.inventario[id] || run.inventario[id] <= 0) return false;
      let ok = false;
      if (id === 'tonicoCura') ok = usarTonico(batalhaAtual);
      else if (id === 'pergaminhoMeteoro') ok = usarMeteoro(batalhaAtual);
      if (ok){ gastarConsumivel(run, id); salvarRun(); }
      return ok;
    },
    aoSair: () => { destruirVisual(); irDesafio(); }
  });
  visualAtual = tela;
  tela.iniciarVisual(criarVisual, batalhaAtual);
}

function finalizarBatalha(res){
  destruirVisual();
  const relatorio = concluirBatalha(run, opcaoAtual, enviadosAtual, res);
  salvarRun();
  avisar('batalha', { relatorio, enviados: enviadosAtual, run });
  telaResultado(app, {
    relatorio,
    aoContinuar: () => {
      if (relatorio.fim){ return irFim(); }
      if (relatorio.bau){ return irBau(); }
      irAcampamento();
    }
  });
}

function irBau(){
  if (!run || !run.bauPendente) return irAcampamento();
  // 3 opções: relíquia (garantida nas rodadas 3, 6 e 9) ou melhorias sorteadas por raridade
  const opcoes = run.bauPendente.map((op) => op.tipo === 'reliquia'
    ? { tipo: 'reliquia', nome: RELIQUIAS[op.id].nome, icone: '💎', desc: RELIQUIAS[op.id].desc, raridade: RELIQUIAS[op.id].raridade === 'rara' ? 'epica' : 'rara' }
    : { tipo: 'melhoria', nome: MELHORIAS[op.id].nome, icone: MELHORIAS[op.id].icone, desc: MELHORIAS[op.id].desc, raridade: MELHORIAS[op.id].raridade });
  telaBau(app, {
    opcoes,
    aoEscolher: (i) => { escolherBau(run, i); avisar('bau', { run }); salvarRun(); irAcampamento(); },
    aoPular: () => { pularBau(run); salvarRun(); irAcampamento(); }
  });
}

function irAcampamento(){
  if (!run) return irMenu();
  if (run.fim) return irFim();
  const disp = infoClasses(run);
  const precos = {};
  for (const c in disp) precos[c] = precoHeroi(run, c);
  // só as classes base são recrutáveis
  const recrutaveis = Object.fromEntries(Object.entries(disp).filter(([c]) => HEROIS[c]));
  telaAcampamento(app, {
    run,
    classes: recrutaveis,
    disponiveis: recrutaveis,
    precos,
    reliquiasInfo: RELIQUIAS,
    consumiveisInfo: CONSUMIVEIS,
    passivasInfo: PASSIVAS,
    evolucoes: opcoesEvolucao(run),
    aoComprarPassiva: (id) => { comprarPassiva(run, id); salvarRun(); irAcampamento(); },
    aoEvoluir: (classe) => { if (evoluir(run, classe)) avisar('evoluir', { run }); salvarRun(); irAcampamento(); },
    aoRecrutar: (classe) => { recrutar(run, classe); salvarRun(); irAcampamento(); },
    aoComprarConsumivel: (id) => { comprarConsumivel(run, id); salvarRun(); irAcampamento(); },
    aoComprarReliquia: (id) => { comprarReliquiaLoja(run, id); salvarRun(); irAcampamento(); },
    aoUsarPocao: (classe) => { usarPocao(run, classe); salvarRun(); irAcampamento(); },
    aoUsarBandagem: (classe) => { usarBandagem(run, classe); salvarRun(); irAcampamento(); },
    aoUsarTrombeta: () => { if (usarTrombeta(run)) avisar('trombeta', { run }); salvarRun(); irAcampamento(); },
    esgotadoRodada: (id) => compradoNestaRodada(run, id),
    aoSeguir: () => { salvarRun(); irDesafio(); }
  });
}

function irFim(){
  if (!run) return irMenu();
  const pts = pontuacao(run);
  const recordes = gravarRecorde({ pontuacao: pts, rodada: run.rodada, data: Date.now() });
  avisar('fimJornada', { run, vitoriaFinal: run.fim === 'vitoria', diario: !!run.diario });
  let extra = null;
  if (run.diario){
    gravarDiario(pts);
    const texto = `Quantos Heróis? · Desafio ${run.diario}\n🏆 ${pts} pts · rodada ${Math.min(run.rodada, 10)}/10\n${(run.historico || []).map(h => h.vitoria ? '⭐'.repeat(Math.max(1, h.estrelas || 1)) : '💀').join(' ')}`;
    extra = document.createElement('div'); extra.className = 'caixa-diario';
    const pre = document.createElement('pre'); pre.textContent = texto; extra.appendChild(pre);
    const bt = document.createElement('button'); bt.className = 'principal'; bt.textContent = 'Copiar resultado';
    bt.onclick = () => { navigator.clipboard?.writeText(texto).then(() => { bt.textContent = 'Copiado!'; }).catch(() => { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); bt.textContent = 'Selecionado: copie'; }); };
    extra.appendChild(bt);
  }
  try { localStorage.removeItem(CHAVE_RUN); } catch (e) {}
  telaFim(app, {
    run,
    pontuacao: pts,
    recordes,
    aoNova: () => { run = null; iniciarNovaJornada(); },
    aoMenu: () => { run = null; irMenu(); },
    extra
  });
}

function rotear(){
  if (!run) return irMenu();
  if (run.fim) return irFim();
  if (run.bauPendente) return irBau();
  if (run.rodada === 1 && (!run.historico || run.historico.length === 0)){
    return irDesafio();
  }
  return irAcampamento();
}

carregarIdeais().then(dados => {
  ideais = dados || {};
  const salva = carregarRun();
  if (salva) run = salva;
  irMenu();
}).catch(() => {
  ideais = {};
  irMenu();
});
