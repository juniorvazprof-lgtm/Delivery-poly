import { IDEAIS } from '../data/ideais.js';
import { HEROIS } from '../data/herois.js';
import { VILOES } from '../data/viloes.js';
import { RELIQUIAS } from '../data/reliquias.js';
import { CONSUMIVEIS } from '../data/consumiveis.js';
import { RODADAS, ECONOMIA } from '../data/rodadas.js';
import { criarBatalha, resumo, usarTonico, usarMeteoro, DT } from '../core/combate.js';
import { criarVisual } from '../render/batalha.js';
import {
  criarRun, opcoesDaRodada, disponiveis, precoHeroi, recrutar,
  comprarConsumivel, comprarReliquiaLoja, usarPocao, usarBandagem,
  custoSoldo, validarEnvio, prepararBatalha, gastarConsumivel,
  estrelas, concluirBatalha, escolherReliquiaBau, pularBau,
  pontuacao, serializar, restaurar
} from '../core/run.js';
import {
  telaMenu, telaDesafio, telaTime, telaBatalha, telaResultado,
  telaBau, telaAcampamento, telaFim, modalComoJogar, modalRecordes
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
    aoRecordes: () => modalRecordes(app, { recordes: lerRecordes(), aoFechar: () => {} })
  });
}

function iniciarNovaJornada(){
  const semente = Math.floor(Math.random() * 1e9);
  run = criarRun({ semente, ideais });
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
  for (const c of Object.keys(HEROIS)){
    out[c] = { ...HEROIS[c], disponiveis: disp[c] || 0, total: run.elenco[c] || 0,
      desmaiados: run.desmaiados.filter((d) => d.classe === c && d.volta > run.rodada), preco: precoHeroi(run, c) };
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
    custoSoldo: (n) => custoSoldo(n),
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
  const reliquias = run.bauPendente.map(id => ({ id, ...RELIQUIAS[id] })).filter(r => r.nome);
  telaBau(app, {
    reliquias,
    aoEscolher: (id) => { escolherReliquiaBau(run, id); salvarRun(); irAcampamento(); },
    aoPular: () => { pularBau(run); salvarRun(); irAcampamento(); }
  });
}

function irAcampamento(){
  if (!run) return irMenu();
  if (run.fim) return irFim();
  const disp = infoClasses(run);
  const precos = {};
  for (const c in disp) precos[c] = precoHeroi(run, c);
  telaAcampamento(app, {
    run,
    disponiveis: disp,
    precos,
    reliquiasInfo: RELIQUIAS,
    consumiveisInfo: CONSUMIVEIS,
    aoRecrutar: (classe) => { recrutar(run, classe); salvarRun(); irAcampamento(); },
    aoComprarConsumivel: (id) => { comprarConsumivel(run, id); salvarRun(); irAcampamento(); },
    aoComprarReliquia: (id) => { comprarReliquiaLoja(run, id); salvarRun(); irAcampamento(); },
    aoUsarPocao: (classe) => { usarPocao(run, classe); salvarRun(); irAcampamento(); },
    aoUsarBandagem: (classe) => { usarBandagem(run, classe); salvarRun(); irAcampamento(); },
    aoSeguir: () => { salvarRun(); irDesafio(); }
  });
}

function irFim(){
  if (!run) return irMenu();
  const pts = pontuacao(run);
  const recordes = gravarRecorde({ pontuacao: pts, rodada: run.rodada, data: Date.now() });
  try { localStorage.removeItem(CHAVE_RUN); } catch (e) {}
  telaFim(app, {
    run,
    pontuacao: pts,
    recordes,
    aoNova: () => { run = null; iniciarNovaJornada(); },
    aoMenu: () => { run = null; irMenu(); }
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
