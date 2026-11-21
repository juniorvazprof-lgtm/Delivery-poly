import { HEROIS as HEROIS_BASE } from '../data/herois.js';
import { HEROIS_EVOLUIDOS, EVOLUCOES } from '../data/evolucoes.js';
import { PASSIVAS } from '../data/passivas.js';
import { MELHORIAS } from '../data/melhorias.js';
// todas as classes (base + evoluídas) para elenco e disponíveis; só as base são recrutáveis
const HEROIS = { ...HEROIS_BASE, ...HEROIS_EVOLUIDOS };
import { RELIQUIAS } from '../data/reliquias.js';
import { CONSUMIVEIS } from '../data/consumiveis.js';
import { RODADAS, ECONOMIA } from '../data/rodadas.js';

// ---------- RNG (mulberry32) ----------
// Estado é um inteiro de 32 bits guardado em run.rng (serializável).
function rngProx(run) {
  let t = (run.rng + 0x6D2B79F5) >>> 0;
  run.rng = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rngInt(run, max) {
  return Math.floor(rngProx(run) * max);
}
function rngEscolha(run, arr) {
  return arr[rngInt(run, arr.length)];
}

// ---------- Passivas e melhorias ----------
// soma dos efeitos 'run' das passivas compradas (multPote multiplica; o resto soma)
export function efeitosRun(run) {
  const e = { multPote: 1, descontoRecrutar: 0, soldoMenos: 0, desmaioMenos: 0, curaBasePorRodada: 0, juros: 0 };
  for (const id of run.passivas || []) {
    const ef = PASSIVAS[id]?.efeito;
    if (!ef || ef.tipo !== 'run') continue;
    if (ef.chave === 'multPote') e.multPote *= ef.valor; else e[ef.chave] = (e[ef.chave] || 0) + ef.valor;
  }
  return e;
}
// bônus de batalha das passivas e melhorias: [{ alvo, mod }]
export function bonusBatalha(run) {
  const out = [];
  for (const id of run.passivas || []) { const ef = PASSIVAS[id]?.efeito; if (ef?.tipo === 'batalha') out.push({ alvo: ef.alvo, mod: ef.mod }); }
  for (const id of run.melhorias || []) { const ef = MELHORIAS[id]?.efeito; if (ef?.tipo === 'batalha') out.push({ alvo: ef.alvo, mod: ef.mod }); }
  return out;
}
export function comprarPassiva(run, id) {
  const p = PASSIVAS[id];
  if (!p || run.passivas.includes(id) || run.ouro < p.preco) return false;
  run.ouro -= p.preco; run.passivas.push(id);
  return true;
}
// ---------- Evolução ----------
export function opcoesEvolucao(run) {
  const disp = disponiveis(run);
  return Object.entries(EVOLUCOES).map(([de, ev]) => {
    let motivo = '';
    if (run.rodada < ev.rodadaMin) motivo = `Disponível na rodada ${ev.rodadaMin}`;
    else if (!(disp[de] > 0)) motivo = `Precisa de um ${HEROIS[de].nome} disponível`;
    else if (run.ouro < ev.preco) motivo = 'Ouro insuficiente';
    const a = HEROIS[de], d = HEROIS[ev.para];
    return { de, para: ev.para, nomeDe: a.nome, nomePara: d.nome, preco: ev.preco, rodadaMin: ev.rodadaMin, desc: ev.desc,
      pode: !motivo, motivo, antes: { pv: a.pv, dano: a.dano }, depois: { pv: d.pv, dano: d.dano } };
  });
}
export function evoluir(run, classe) {
  const op = opcoesEvolucao(run).find((o) => o.de === classe);
  if (!op || !op.pode) return false;
  run.ouro -= op.preco; run.elenco[classe]--; run.elenco[op.para] = (run.elenco[op.para] || 0) + 1;
  return true;
}
// ---------- Baú (depois de cada vitória: 3 opções) ----------
function sortearMelhoria(run, excluir) {
  const ids = Object.keys(MELHORIAS).filter((id) => !excluir.includes(id));
  const total = ids.reduce((t, id) => t + (MELHORIAS[id].peso || 1), 0);
  let x = rngProx(run) * total;
  for (const id of ids) { x -= MELHORIAS[id].peso || 1; if (x <= 0) return id; }
  return ids[ids.length - 1];
}
function sortearBau(run, rodadaBatalha) {
  const opcoes = [];
  const relicGarantida = (ECONOMIA.bau.rodadas || []).includes(rodadaBatalha);
  if (relicGarantida) {
    const pool = Object.keys(RELIQUIAS).filter((id) => !run.reliquias.includes(id));
    if (pool.length) opcoes.push({ tipo: 'reliquia', id: pool[rngInt(run, pool.length)] });
  }
  const usados = [];
  while (opcoes.length < 3) { const id = sortearMelhoria(run, usados); usados.push(id); opcoes.push({ tipo: 'melhoria', id }); }
  return opcoes;
}
export function escolherBau(run, i) {
  const op = run.bauPendente?.[i];
  if (!op) return false;
  if (op.tipo === 'reliquia') { if (!run.reliquias.includes(op.id)) run.reliquias.push(op.id); }
  else {
    const ef = MELHORIAS[op.id].efeito;
    if (ef.tipo === 'batalha') run.melhorias.push(op.id);
    else if (ef.tipo === 'ouro') run.ouro += ef.valor;
    else if (ef.tipo === 'heroi') run.elenco[ef.classe] = (run.elenco[ef.classe] || 0) + ef.qtd;
    else if (ef.tipo === 'consumivel') run.inventario[ef.id] = (run.inventario[ef.id] || 0) + ef.qtd;
    else if (ef.tipo === 'curarBase') run.baseVida = Math.min(run.baseVidaMax, run.baseVida + ef.valor);
  }
  run.bauPendente = null;
  return true;
}

// ---------- Criação ----------
export function criarRun({ semente, ideais }) {
  const s = (semente >>> 0) || 1;
  const elenco = Object.fromEntries(Object.keys(HEROIS).map((c) => [c, 0]));
  for (const c of Object.keys(ECONOMIA.elencoInicial)) {
    elenco[c] = ECONOMIA.elencoInicial[c];
  }
  const run = {
    versao: 1,
    semente: s,
    rng: s,
    rodada: 1,
    ouro: ECONOMIA.ouroInicial,
    baseVida: ECONOMIA.vidaBase,
    baseVidaMax: ECONOMIA.vidaBase,
    elenco,
    desmaiados: [],
    reliquias: [],
    chamaLigada: false,
    inventario: {
      pocaoRessurreicao: 0,
      pergaminhoMeteoro: 0,
      bandagem: 0,
      tonicoCura: 0,
    },
    recrutados: Object.fromEntries(Object.keys(HEROIS).map((c) => [c, 0])),
    ideais: ideais || {},
    historico: [],
    fim: null,
    bauPendente: null,
    lojaReliquias: [],
    passivas: [],
    melhorias: [],
  };
  run.lojaReliquias = sortearLojaReliquias(run);
  return run;
}

// ---------- Opções da rodada ----------
export function opcoesDaRodada(run) {
  const r = run.rodada;
  const def = RODADAS[r - 1];
  if (!def) return [];
  const idealSeguro = (run.ideais && run.ideais[String(r)] && run.ideais[String(r)].n) || 1;

  if (r === 10 || def.chefe) {
    return [{
      id: 'chefe',
      titulo: 'O Rei Slime',
      descricao: 'O covil fede. Encare o chefão e seus lacaios.',
      inimigos: def.inimigos,
      ideal: idealSeguro,
      premioBase: ECONOMIA.bonusVitoria(r),
    }];
  }

  const segura = {
    id: 'segura',
    titulo: 'Caminho tranquilo',
    descricao: 'A rota segura. Menos monstros, prêmio honesto.',
    inimigos: def.inimigos.map(([tipo, qtd, opc]) => opc ? [tipo, qtd, opc] : [tipo, qtd]),
    ideal: idealSeguro,
    premioBase: ECONOMIA.bonusVitoria(r),
  };

  const multIni = ECONOMIA.perigosa.multInimigos;
  const perigosa = {
    id: 'perigosa',
    titulo: 'Atalho perigoso',
    descricao: 'Mais monstros, mais ouro. Coragem ou tolice?',
    inimigos: def.inimigos.map(([tipo, qtd, opc]) => {
      const q = Math.max(qtd + 1, Math.round(qtd * multIni));
      return opc ? [tipo, q, opc] : [tipo, q];
    }),
    ideal: run.ideais[String(r)]?.perigosa ?? Math.ceil(idealSeguro * ECONOMIA.perigosa.multIdeal), // medido pelo simulador; estimativa só se faltar
    premioBase: Math.round(ECONOMIA.bonusVitoria(r) * ECONOMIA.perigosa.multPremio),
  };

  return [segura, perigosa];
}

// ---------- Disponibilidade / preços ----------
export function disponiveis(run) {
  const out = Object.fromEntries(Object.keys(HEROIS).map((c) => [c, 0])); // todas as classes, inclusive as recrutadas depois
  for (const c of Object.keys(out)) {
    const total = run.elenco[c] || 0;
    let fora = 0;
    for (const d of run.desmaiados) {
      if (d.classe === c && d.volta > run.rodada) fora++;
    }
    out[c] = Math.max(0, total - fora);
  }
  return out;
}

export function precoHeroi(run, classe) {
  const base = HEROIS[classe].custo;
  const n = run.recrutados[classe] || 0;
  return Math.round(base * Math.pow(1 + ECONOMIA.inflacao, n) * (1 - efeitosRun(run).descontoRecrutar));
}

export function recrutar(run, classe) {
  if (!HEROIS_BASE[classe]) return false; // evoluídos não se recrutam, só por evolução
  const preco = precoHeroi(run, classe);
  if (run.ouro < preco) return false;
  run.ouro -= preco;
  run.elenco[classe] = (run.elenco[classe] || 0) + 1;
  run.recrutados[classe] = (run.recrutados[classe] || 0) + 1;
  return true;
}

// ---------- Loja ----------
export function comprarConsumivel(run, id) {
  const item = CONSUMIVEIS[id];
  if (!item) return false;
  if (run.ouro < item.preco) return false;
  run.ouro -= item.preco;
  run.inventario[id] = (run.inventario[id] || 0) + 1;
  return true;
}

export function comprarReliquiaLoja(run, id) {
  if (!run.lojaReliquias.includes(id)) return false;
  const rel = RELIQUIAS[id];
  if (!rel) return false;
  if (run.reliquias.includes(id)) return false;
  if (run.ouro < rel.preco) return false;
  run.ouro -= rel.preco;
  run.reliquias.push(id);
  run.lojaReliquias = run.lojaReliquias.filter(x => x !== id);
  return true;
}

// ---------- Consumíveis de recuperação ----------
export function usarPocao(run, classe) {
  if ((run.inventario.pocaoRessurreicao || 0) <= 0) return false;
  const idx = run.desmaiados.findIndex(d => d.classe === classe);
  if (idx < 0) return false;
  run.desmaiados.splice(idx, 1);
  run.inventario.pocaoRessurreicao--;
  return true;
}

export function usarBandagem(run, classe) {
  if ((run.inventario.bandagem || 0) <= 0) return false;
  const d = run.desmaiados.find(x => x.classe === classe);
  if (!d) return false;
  d.volta = Math.max(run.rodada, d.volta - 1);
  run.inventario.bandagem--;
  return true;
}

// ---------- Envio / batalha ----------
export function custoSoldo(enviados, run) {
  let total = 0;
  for (const c of Object.keys(enviados)) total += enviados[c] || 0;
  return total * Math.max(0, ECONOMIA.soldo - (run ? efeitosRun(run).soldoMenos : 0));
}

export function validarEnvio(run, opcao, enviados) {
  const disp = disponiveis(run);
  let total = 0;
  for (const c of Object.keys(enviados)) {
    const q = enviados[c] || 0;
    if (q < 0) return { ok: false, motivo: 'Quantidade inválida.' };
    if (q > (disp[c] || 0)) return { ok: false, motivo: `Sem ${c} suficiente disponível.` };
    total += q;
  }
  if (total < 1) return { ok: false, motivo: 'Envie pelo menos 1 herói.' };
  return { ok: true, motivo: '' };
}

export function prepararBatalha(run, opcao, enviados) {
  // o soldo é descontado do ganho da rodada em concluirBatalha (nunca trava a run por falta de ouro)
  const herois = {};
  for (const c of Object.keys(enviados)) {
    if ((enviados[c] || 0) > 0) herois[c] = enviados[c];
  }
  const sementeBatalha = Math.floor(rngProx(run) * 0xFFFFFFFF) >>> 0;
  return {
    herois,
    inimigos: opcao.inimigos,
    reliquias: run.reliquias.slice(),
    chaves: { chamaConcentrada: !!run.chamaLigada },
    consumiveis: {},
    semente: sementeBatalha,
    bonus: bonusBatalha(run),
  };
}

export function gastarConsumivel(run, id) {
  if (!run.inventario[id] || run.inventario[id] <= 0) return false;
  run.inventario[id]--;
  return true;
}

// ---------- Estrelas ----------
export function estrelas(opcao, enviados) {
  let total = 0;
  for (const c of Object.keys(enviados)) total += enviados[c] || 0;
  const ideal = opcao.ideal || 1;
  if (total <= ideal * ECONOMIA.limiteEstrelas.tres) return 3;
  if (total <= ideal * ECONOMIA.limiteEstrelas.duas) return 2;
  return 1;
}

// ---------- Conclusão ----------
export function concluirBatalha(run, opcao, enviados, resumo) {
  const rodadaBatalha = run.rodada;
  const totalEnviado = Object.values(enviados).reduce((a, b) => a + (b || 0), 0);
  const est = estrelas(opcao, enviados);
  const efRun = efeitosRun(run);
  const pote = Math.round((resumo.ouroAbates || 0) * ECONOMIA.multAbate * efRun.multPote);

  let ouroGanho = 0;
  let danoBase = 0;
  let vitoria = !!resumo.vitoria;

  if (vitoria) {
    const potePremio = pote + (opcao.premioBase || 0);
    ouroGanho = Math.round(potePremio * (ECONOMIA.multEstrelas[est] || 1));
    run.rodada = rodadaBatalha + 1;
  } else {
    ouroGanho = pote;
    let soma = 0;
    for (const tipo of (resumo.restantes || [])) {
      soma += ECONOMIA.danoBase[tipo] || 0;
    }
    danoBase = Math.min(ECONOMIA.danoBaseMaximo ?? Infinity, Math.max(ECONOMIA.danoBaseMinimo, soma));
    run.baseVida -= danoBase;
  }

  // Mortos viram desmaiados
  const mortos = resumo.mortos || {};
  for (const c of Object.keys(mortos)) {
    const q = mortos[c] || 0;
    for (let i = 0; i < q; i++) {
      run.desmaiados.push({ classe: c, volta: rodadaBatalha + 1 + Math.max(1, ECONOMIA.rodadasDesmaio - efRun.desmaioMenos) });
    }
  }

  // Fim de jogo
  if (run.baseVida <= 0) {
    run.baseVida = 0;
    run.fim = 'derrota';
  } else if (vitoria && rodadaBatalha === 10) {
    run.fim = 'vitoria';
  }

  // Baú: depois de toda vitória (relíquia garantida nas rodadas de ECONOMIA.bau.rodadas)
  let bauAberto = false;
  if (vitoria && !run.fim) { run.bauPendente = sortearBau(run, rodadaBatalha); bauAberto = true; }

  // Loja de relíquias para o próximo acampamento
  run.lojaReliquias = sortearLojaReliquias(run);

  const faltaram = vitoria ? 0 : Math.max(1, (opcao.ideal || 1) - totalEnviado + 1);

  // soldo: pago com o ganho da rodada; o ouro nunca fica negativo
  const soldo = custoSoldo(enviados, run);
  run.ouro = Math.max(0, run.ouro + ouroGanho - soldo);
  // passivas de run: cura da base ao vencer e juros sobre o ouro guardado (teto 15)
  if (vitoria && efRun.curaBasePorRodada) run.baseVida = Math.min(run.baseVidaMax, run.baseVida + efRun.curaBasePorRodada);
  const juros = efRun.juros ? Math.min(15, Math.floor(run.ouro * efRun.juros)) : 0;
  run.ouro += juros;

  const relatorio = {
    vitoria,
    estrelas: est,
    enviados: { ...enviados },
    total: totalEnviado,
    ideal: opcao.ideal,
    faltaram,
    pote,
    premioBase: opcao.premioBase || 0,
    multiplicador: vitoria ? (ECONOMIA.multEstrelas[est] || 1) : 1,
    ouroGanho,
    soldo,
    danoBase,
    baseVida: run.baseVida,
    mortos: { ...mortos },
    porClasse: resumo.porClasse || {},
    tempo: resumo.tempo || 0,
    bau: bauAberto,
    fim: run.fim,
  };

  run.historico.push({
    rodada: rodadaBatalha,
    opcao: opcao.id,
    vitoria,
    estrelas: est,
    ouroGanho,
    soldo,
    baseVida: run.baseVida,
  });

  return relatorio;
}

// ---------- Baú ----------
export function escolherReliquiaBau(run, id) {
  if (!run.bauPendente || !run.bauPendente.includes(id)) return false;
  if (run.reliquias.includes(id)) return false;
  run.reliquias.push(id);
  run.bauPendente = null;
  return true;
}

export function pularBau(run) {
  run.bauPendente = null;
}

// ---------- Pontuação ----------
export function pontuacao(run) {
  let estrelasTotal = 0;
  for (const h of run.historico) estrelasTotal += h.estrelas || 0;
  return estrelasTotal * 100 + run.ouro + run.baseVida * 10 + run.rodada * 50;
}

// ---------- Serialização ----------
export function serializar(run) {
  return JSON.stringify(run);
}

export function restaurar(str) {
  const run = JSON.parse(str);
  if (!run || run.versao !== 1) throw new Error('Versão de save incompatível.');
  return run;
}

// ---------- Auxiliares ----------
function sortearLojaReliquias(run) {
  const qtd = ECONOMIA.reliquiaNaLoja || 0;
  if (qtd <= 0) return [];
  const pool = Object.keys(RELIQUIAS).filter(id => !run.reliquias.includes(id));
  const out = [];
  const copia = pool.slice();
  for (let i = 0; i < qtd && copia.length > 0; i++) {
    const idx = rngInt(run, copia.length);
    out.push(copia[idx]);
    copia.splice(idx, 1);
  }
  return out;
}
