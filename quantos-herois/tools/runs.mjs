import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { simular } from '../core/combate.js';
import { HEROIS } from '../data/herois.js';
const CLASSES = Object.keys(HEROIS);
import { RELIQUIAS } from '../data/reliquias.js';
import { CONSUMIVEIS } from '../data/consumiveis.js';
import { RODADAS, ECONOMIA } from '../data/rodadas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDEIAS = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ideais.json'), 'utf8'));

// ---------- RNG determinístico ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Utilidades ----------
function copiaElenco(e) { return { guerreiro: e.guerreiro | 0, guardiao: e.guardiao | 0, piromante: e.piromante | 0 }; }
function somaElenco(e) { return e.guerreiro + e.guardiao + e.piromante; }
function somaComp(c) { return (c.guerreiro | 0) + (c.guardiao | 0) + (c.piromante | 0); }

function distribuicaoProporcional(comp, total) {
  // distribui `total` mantendo proporção da comp; resto vai para a classe mais numerosa
  const base = somaComp(comp);
  const out = Object.fromEntries(CLASSES.map((c) => [c, 0]));
  if (base === 0 || total <= 0) return out;
  let acumulado = 0;
  const classes = CLASSES;
  for (const c of classes) {
    const v = Math.floor((comp[c] | 0) * total / base);
    out[c] = v; acumulado += v;
  }
  let resto = total - acumulado;
  if (resto > 0) {
    // classe mais numerosa da comp
    let maior = 'guerreiro', maiorV = -1;
    for (const c of classes) { if ((comp[c] | 0) > maiorV) { maiorV = comp[c] | 0; maior = c; } }
    out[maior] += resto;
  }
  return out;
}

function disponiveis(elenco, desmaiados, rodada) {
  const out = { guerreiro: elenco.guerreiro, guardiao: elenco.guardiao, piromante: elenco.piromante };
  for (const d of desmaiados) {
    if (d.voltaNaRodada > rodada) out[d.classe] = Math.max(0, out[d.classe] - 1);
  }
  return out;
}

function completarFaltando(pedido, disp) {
  // nunca manda mais do que tem; completa faltando com outras disponíveis
  const out = Object.fromEntries(CLASSES.map((c) => [c, 0]));
  const classes = CLASSES;
  let faltando = 0;
  for (const c of classes) {
    const q = Math.min(pedido[c] | 0, disp[c] | 0);
    out[c] = q;
    faltando += (pedido[c] | 0) - q;
  }
  // completa com o que sobra, prioridade guerreiro > guardião > piromante
  for (const c of classes) {
    if (faltando <= 0) break;
    const sobra = disp[c] - out[c];
    if (sobra > 0) {
      const add = Math.min(sobra, faltando);
      out[c] += add; faltando -= add;
    }
  }
  return out;
}

function todosSlimes(rodada) {
  const r = RODADAS[rodada - 1];
  if (!r) return false;
  return r.inimigos.every(([tipo]) => tipo === 'slime' || tipo === 'slimeGrande' || tipo === 'slimePequeno');
}

function precoRecrutar(classe, recrutados, economia) {
  return Math.round(HEROIS[classe].custo * Math.pow(1 + economia.inflacao, recrutados[classe] | 0));
}

function precoReliquia(id) { return RELIQUIAS[id].preco; }
function precoConsumivel(id) { return CONSUMIVEIS[id].preco; }

// disponíveis na rodada r (elenco menos desmaiados que ainda não voltaram)
function dispProx(ctx, r) { return disponiveis(ctx.elenco, ctx.desmaiados, r); }
// Bandagem: adianta em 1 rodada a volta de um desmaiado que ainda faltaria na próxima rodada
function usarBandagens(ctx, prox) {
  for (const d of ctx.desmaiados) if (d.voltaNaRodada > prox && ctx.inventario.bandagem > 0 && d.voltaNaRodada - 1 <= prox) { d.voltaNaRodada--; ctx.inventario.bandagem--; }
}
// ---------- Perfis ----------
function criarPerfilCauteloso() {
  return {
    nome: 'cauteloso',
    escolherFormacao(ctx) {
      const ideal = IDEIAS[String(ctx.rodada)];
      const total = Math.ceil(1.5 * ideal.n);
      const pedido = distribuicaoProporcional(ideal.comp, total);
      return completarFaltando(pedido, ctx.disponiveis);
    },
    usarConsumiveisBatalha(ctx) {
      const uso = { pergaminhoMeteoro: false, tonicoCura: false };
      if (ctx.rodada >= 7 && ctx.inventario.tonicoCura > 0) uso.tonicoCura = true;
      return uso;
    },
    acampamento(ctx) {
      // compra heróis até ter disponíveis o que vai mandar na próxima rodada
      const prox = ctx.rodada + 1;
      if (prox > 10) return;
      const ideal = IDEIAS[String(prox)];
      const total = Math.ceil(1.5 * ideal.n);
      const pedido = distribuicaoProporcional(ideal.comp, total);
      let comprouAlgo = false;
      // tenta cobrir pedido
      for (const c of CLASSES) {
        // compara com os DISPONÍVEIS na próxima rodada (desmaiados não contam)
        while (dispProx(ctx, prox)[c] < pedido[c]) {
          const preco = precoRecrutar(c, ctx.recrutados, ctx.economia);
          // guarda o soldo da próxima batalha antes de recrutar
          if (ctx.ouro < preco) { ctx.aperto = ctx.aperto ?? prox; break; }
          ctx.ouro -= preco; ctx.recrutados[c]++; ctx.elenco[c]++; ctx.gastos.herois += preco; comprouAlgo = true;
        }
      }
      // bandagem se algum desmaiado voltaria só 1 rodada depois da próxima
      if (ctx.desmaiados.some((d) => d.voltaNaRodada === prox + 1) && ctx.ouro >= precoConsumivel('bandagem') + 20) {
        ctx.ouro -= precoConsumivel('bandagem'); ctx.inventario.bandagem++; ctx.gastos.consumiveis += precoConsumivel('bandagem'); usarBandagens(ctx, prox);
      }
      // sobra >= 40 compra 1 tonicoCura se não tiver
      if (ctx.ouro >= 40 && ctx.inventario.tonicoCura === 0) {
        const preco = precoConsumivel('tonicoCura');
        if (ctx.ouro >= preco) { ctx.ouro -= preco; ctx.inventario.tonicoCura++; ctx.gastos.consumiveis += preco; }
      }
    },
  };
}

function criarPerfilEsperto(extra = 1, nome = 'esperto') {
  const prioridadeReliquias = ['golpeGiratorio', 'estandarteDeGuerra', 'bencaoEmArea', 'aljavaFarta', 'muralha', 'ressurreicaoDivina', 'relicarioSagrado', 'provocacaoLonga', 'flechasEnvenenadas', 'escudoReforcado', 'focoArcano', 'grimorioAntigo', 'olhoDeAguia', 'preceFervorosa', 'brasaViva', 'chamaConcentrada', 'espadaAfiada', 'irmaosDeArmas'];
  return {
    nome,
    escolherFormacao(ctx) {
      const ideal = IDEIAS[String(ctx.rodada)];
      let total = ideal.n + extra; // esperto: 1 de margem; arriscado: exatamente o ideal
      if (ctx.perdeuAntes) total = Math.ceil(1.3 * ideal.n);
      const pedido = distribuicaoProporcional(ideal.comp, total);
      return completarFaltando(pedido, ctx.disponiveis);
    },
    usarConsumiveisBatalha(ctx) {
      const uso = { pergaminhoMeteoro: false, tonicoCura: false };
      if (ctx.rodada === 10 && ctx.inventario.pergaminhoMeteoro > 0) uso.pergaminhoMeteoro = true;
      return uso;
    },
    acampamento(ctx) {
      const prox = ctx.rodada + 1;
      if (prox > 10) return;
      const ideal = IDEIAS[String(prox)];
      const folga = (prox >= 6 ? 1 : 0) + extra;
      const pedido = distribuicaoProporcional(ideal.comp, ideal.n + folga);
      // poção de reserva a partir da rodada 5, se sobrar ouro
      if (prox >= 5 && ctx.inventario.pocaoRessurreicao === 0 && ctx.ouro >= precoConsumivel('pocaoRessurreicao') + 60) {
        ctx.ouro -= precoConsumivel('pocaoRessurreicao'); ctx.inventario.pocaoRessurreicao++; ctx.gastos.consumiveis += precoConsumivel('pocaoRessurreicao');
      }
      // usa poção de ressurreição se faltar herói para a comp
      const disp = disponiveis(ctx.elenco, ctx.desmaiados, prox);
      for (const c of CLASSES) {
        while (disp[c] < pedido[c] && ctx.inventario.pocaoRessurreicao > 0) {
          // tira um desmaiado dessa classe
          const idx = ctx.desmaiados.findIndex(d => d.classe === c);
          if (idx < 0) break;
          ctx.desmaiados.splice(idx, 1);
          ctx.inventario.pocaoRessurreicao--;
          disp[c]++;
        }
      }
      // compra heróis para cobrir
      for (const c of CLASSES) {
        // compara com os DISPONÍVEIS na próxima rodada (desmaiados não contam)
        while (dispProx(ctx, prox)[c] < pedido[c]) {
          const preco = precoRecrutar(c, ctx.recrutados, ctx.economia);
          // guarda o soldo da próxima batalha antes de recrutar
          if (ctx.ouro < preco) { ctx.aperto = ctx.aperto ?? prox; break; }
          ctx.ouro -= preco; ctx.recrutados[c]++; ctx.elenco[c]++; ctx.gastos.herois += preco;
        }
      }
      // compra relíquia se sobrar ouro >= preço + 20
      const loja = ctx.lojaReliquias;
      const disponiveisCompra = loja.filter(id => !ctx.reliquias.includes(id));
      disponiveisCompra.sort((a, b) => prioridadeReliquias.indexOf(a) - prioridadeReliquias.indexOf(b));
      for (const id of disponiveisCompra) {
        const preco = precoReliquia(id);
        if (ctx.ouro >= preco + 20) {
          ctx.ouro -= preco; ctx.reliquias.push(id); ctx.gastos.reliquias += preco;
          break;
        }
      }
      // compra 1 pergaminho antes da rodada 10
      if (prox === 10 && ctx.inventario.pergaminhoMeteoro === 0) {
        const preco = precoConsumivel('pergaminhoMeteoro');
        if (ctx.ouro >= preco) { ctx.ouro -= preco; ctx.inventario.pergaminhoMeteoro++; ctx.gastos.consumiveis += preco; }
      }
    },
  };
}

function criarPerfilExagerado() {
  return {
    nome: 'exagerado',
    escolherFormacao(ctx) {
      const ideal = IDEIAS[String(ctx.rodada)];
      const total = 2 * ideal.n;
      const pedido = distribuicaoProporcional(ideal.comp, total);
      return completarFaltando(pedido, ctx.disponiveis);
    },
    usarConsumiveisBatalha() { return { pergaminhoMeteoro: false, tonicoCura: false }; },
    acampamento(ctx) {
      const prox = ctx.rodada + 1;
      if (prox > 10) return;
      const ideal = IDEIAS[String(prox)];
      const pedido = distribuicaoProporcional(ideal.comp, 2 * ideal.n);
      for (const c of CLASSES) {
        // compara com os DISPONÍVEIS na próxima rodada (desmaiados não contam)
        while (dispProx(ctx, prox)[c] < pedido[c]) {
          const preco = precoRecrutar(c, ctx.recrutados, ctx.economia);
          // guarda o soldo da próxima batalha antes de recrutar
          if (ctx.ouro < preco) { ctx.aperto = ctx.aperto ?? prox; break; }
          ctx.ouro -= preco; ctx.recrutados[c]++; ctx.elenco[c]++; ctx.gastos.herois += preco;
        }
      }
    },
  };
}

const PERFIS = {
  cauteloso: criarPerfilCauteloso,
  esperto: () => criarPerfilEsperto(1, 'esperto'),
  arriscado: () => criarPerfilEsperto(0, 'arriscado'),
  exagerado: criarPerfilExagerado,
};

// ---------- Simulação de uma run ----------
function simularRun(perfilNome, semente, economia) {
  const rng = mulberry32(semente);
  const perfil = PERFIS[perfilNome]();

  const estado = {
    ouro: economia.ouroInicial,
    elenco: copiaElenco(economia.elencoInicial),
    desmaiados: [],
    reliquias: [],
    inventario: { pocaoRessurreicao: 0, pergaminhoMeteoro: 0, bandagem: 0, tonicoCura: 0 },
    vidas: economia.vidas,
    recrutados: Object.fromEntries(CLASSES.map((c) => [c, 0])),
    rodada: 1,
  };

  const stats = {
    completa: false,
    rodadaFinal: 0,
    vidasPerdidas: 0,
    ouroFinal: 0,
    ouroTotalGanho: 0,
    gastos: { herois: 0, reliquias: 0, consumiveis: 0 },
    reliquiasCompradas: 0,
    estrelasPorRodada: [],
    elencoFinal: 0,
    aperto: null,
    ouroPorRodada: [],
    comprasReliquias: {},
    comprasConsumiveis: {},
  };

  let perdeuAntes = false;
  let batalhas = 0;

  while (estado.rodada <= 10 && estado.vidas > 0 && batalhas < 40) {
    batalhas++;
    const r = estado.rodada;
    const ideal = IDEIAS[String(r)];

    // poção de ressurreição antes de escolher formação (esperto)
    if (perfilNome === 'esperto') {
      const disp = disponiveis(estado.elenco, estado.desmaiados, r);
      const pedido = distribuicaoProporcional(ideal.comp, ideal.n);
      for (const c of CLASSES) {
        while (disp[c] < pedido[c] && estado.inventario.pocaoRessurreicao > 0) {
          const idx = estado.desmaiados.findIndex(d => d.classe === c);
          if (idx < 0) break;
          estado.desmaiados.splice(idx, 1);
          estado.inventario.pocaoRessurreicao--;
          disp[c]++;
        }
      }
    }

    const disp = disponiveis(estado.elenco, estado.desmaiados, r);
    const ctxForm = {
      rodada: r,
      disponiveis: disp,
      perdeuAntes,
      inventario: estado.inventario,
      elenco: estado.elenco,
      desmaiados: estado.desmaiados,
      reliquias: estado.reliquias,
      ouro: estado.ouro,
      economia,
      recrutados: estado.recrutados,
    };
    const enviados = perfil.escolherFormacao(ctxForm);
    // Soldo: cada herói enviado custa `soldo` de ouro antes da batalha; sem ouro, manda só quem dá para pagar
    if (economia.soldo > 0) { // regra do jogo (core/run.js): o soldo sai do ganho da rodada; nunca impede de lutar
      const custo = somaComp(enviados) * economia.soldo;
      estado.ouro -= custo; stats.gastoSoldo = (stats.gastoSoldo || 0) + custo;
    }


    if (somaComp(enviados) === 0) {
      // derrota sem batalha
      estado.vidas--; stats.vidasPerdidas++;
      perdeuAntes = true;
      if (estado.vidas <= 0) { stats.rodadaFinal = r; break; }
      // acampamento mesmo assim
      fazerAcampamento(perfil, estado, r, economia, rng, stats);
      continue;
    }

    // consumíveis de batalha
    const uso = perfil.usarConsumiveisBatalha({
      rodada: r, inventario: estado.inventario, elenco: estado.elenco,
    });
    if (uso.pergaminhoMeteoro && estado.inventario.pergaminhoMeteoro > 0) estado.inventario.pergaminhoMeteoro--;
    if (uso.tonicoCura && estado.inventario.tonicoCura > 0) estado.inventario.tonicoCura--;

    const chamaConcentrada = estado.reliquias.includes('chamaConcentrada') && todosSlimes(r);

    const res = simular({
      herois: enviados,
      inimigos: RODADAS[r - 1].inimigos,
      reliquias: estado.reliquias.slice(),
      chaves: { chamaConcentrada },
      consumiveis: {
        pergaminhoMeteoro: !!uso.pergaminhoMeteoro,
        tonicoCura: !!uso.tonicoCura,
      },
      semente: Math.floor(rng() * 1e9),
    });

    // ouro de abates
    const ouroAbates = Math.round(res.ouroAbates * economia.multAbate);
    estado.ouro += ouroAbates;
    stats.ouroTotalGanho += ouroAbates;

    let bonus = 0;
    let estrelas = 1;
    if (res.vitoria) {
      const enviadosTotal = somaComp(enviados);
      if (enviadosTotal <= ideal.n * economia.limiteEstrelas.tres) estrelas = 3;
      else if (enviadosTotal <= ideal.n * economia.limiteEstrelas.duas) estrelas = 2;
      else estrelas = 1;
      bonus = Math.round(economia.bonusTabela[r] * economia.multEstrelas[estrelas]);
      estado.ouro += bonus;
      stats.ouroTotalGanho += bonus;
      stats.estrelasPorRodada.push({ rodada: r, estrelas });
    }

    stats.ouroPorRodada.push({ rodada: r, abates: ouroAbates, bonus, total: ouroAbates + bonus, caixaAposLoja: 0 });

    // mortos viram desmaiados
    if (res.mortos) {
      for (const c of CLASSES) {
        const n = res.mortos[c] | 0;
        for (let i = 0; i < n; i++) {
          estado.desmaiados.push({ classe: c, voltaNaRodada: r + 1 + economia.rodadasDesmaio });
        }
      }
    }

    if (res.vitoria) {
      perdeuAntes = false;
      if (r === 10) { stats.completa = true; stats.rodadaFinal = 10; break; }
      fazerAcampamento(perfil, estado, r, economia, rng, stats);
      estado.rodada++;
    } else {
      estado.vidas--; stats.vidasPerdidas++;
      perdeuAntes = true;
      if (estado.vidas <= 0) { stats.rodadaFinal = r; break; }
      fazerAcampamento(perfil, estado, r, economia, rng, stats);
      // repete a mesma rodada
    }

    // registra caixa após loja
    if (stats.ouroPorRodada.length > 0) {
      stats.ouroPorRodada[stats.ouroPorRodada.length - 1].caixaAposLoja = estado.ouro;
    }
  }

  stats.ouroFinal = estado.ouro;
  stats.reliquiasCompradas = estado.reliquias.length;
  stats.elencoFinal = somaElenco(estado.elenco);
  stats.aperto = estado.aperto ?? null;
  return stats;
}

function fazerAcampamento(perfil, estado, rodadaAtual, economia, rng, stats) {
  estado.ouro = Math.max(0, estado.ouro); // o ouro nunca fica negativo depois do soldo
  // sorteia 3 relíquias ainda não compradas
  const todas = Object.keys(RELIQUIAS);
  const naoCompradas = todas.filter(id => !estado.reliquias.includes(id));
  const loja = [];
  const pool = naoCompradas.slice();
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    loja.push(pool.splice(idx, 1)[0]);
  }

  const gastosAntes = { ...stats.gastos };
  const relAntes = estado.reliquias.length;
  const consAntes = { ...estado.inventario };

  perfil.acampamento({
    rodada: rodadaAtual,
    ouro: estado.ouro,
    elenco: estado.elenco,
    desmaiados: estado.desmaiados,
    reliquias: estado.reliquias,
    inventario: estado.inventario,
    recrutados: estado.recrutados,
    economia,
    lojaReliquias: loja,
    aperto: estado.aperto,
    gastos: stats.gastos,
    set ouro(v) { estado.ouro = v; },
    get ouro() { return estado.ouro; },
  });

  // registra compras de relíquias
  for (let i = relAntes; i < estado.reliquias.length; i++) {
    const id = estado.reliquias[i];
    stats.comprasReliquias[id] = (stats.comprasReliquias[id] || 0) + 1;
  }
  // registra compras de consumíveis
  for (const id of Object.keys(estado.inventario)) {
    const delta = estado.inventario[id] - consAntes[id];
    if (delta > 0) stats.comprasConsumiveis[id] = (stats.comprasConsumiveis[id] || 0) + delta;
  }
}

// ---------- Worker ----------
if (!isMainThread) {
  const { perfil, runs, baseSemente, economia } = workerData;
  const resultados = [];
  for (let i = 0; i < runs; i++) {
    resultados.push(simularRun(perfil, baseSemente + i, economia));
  }
  parentPort.postMessage(resultados);
} else {
  // ---------- CLI ----------
  const args = process.argv.slice(2);
  function arg(nome, def) {
    const i = args.indexOf(nome);
    if (i >= 0 && i + 1 < args.length) return args[i + 1];
    return def;
  }
  const numRuns = parseInt(arg('--runs', '300'), 10);
  const perfilArg = arg('--perfil', 'todos');
  const jsonOut = arg('--json', null);

  const economia = {
    ouroInicial: parseFloat(arg('--ouroInicial', String(ECONOMIA.ouroInicial))),
    multAbate: parseFloat(arg('--multAbate', String(ECONOMIA.multAbate))),
    soldo: parseFloat(arg('--soldo', String(ECONOMIA.soldo || 0))),
    inflacao: parseFloat(arg('--inflacao', String(ECONOMIA.inflacao))),
    vidas: parseInt(arg('--vidas', String(ECONOMIA.vidas ?? Math.ceil(ECONOMIA.vidaBase / ECONOMIA.danoBaseMaximo))), 10),
    rodadasDesmaio: ECONOMIA.rodadasDesmaio,
    multEstrelas: {
      1: parseFloat(arg('--m1', String(ECONOMIA.multEstrelas[1]))),
      2: parseFloat(arg('--m2', String(ECONOMIA.multEstrelas[2]))),
      3: parseFloat(arg('--m3', String(ECONOMIA.multEstrelas[3]))),
    },
    limiteEstrelas: { ...ECONOMIA.limiteEstrelas },
    elencoInicial: { ...ECONOMIA.elencoInicial },
    // tabela pronta (funções não passam para os workers): bonusTabela[r] = bônus de vitória da rodada r
    bonusTabela: Array.from({ length: 11 }, (_, r) => {
      if (args.includes('--bonusBase') || args.includes('--bonusPorRodada')) return parseFloat(arg('--bonusBase', '0')) + parseFloat(arg('--bonusPorRodada', '0')) * r;
      return ECONOMIA.bonusVitoria(r);
    }),
  };
  const elencoArg = arg('--elenco', null);
  if (elencoArg) {
    const [g, t, p] = elencoArg.split(',').map(x => parseInt(x, 10));
    economia.elencoInicial = { guerreiro: g | 0, guardiao: t | 0, piromante: p | 0 };
  }

  const perfis = perfilArg === 'todos' ? ['cauteloso', 'esperto', 'arriscado', 'exagerado'] : [perfilArg];
  const numWorkers = Math.min(os.cpus().length, numRuns);
  const baseSemente = 12345;

  function rodarPerfil(perfil) {
    return new Promise((resolve) => {
      const resultados = [];
      let pendentes = numWorkers;
      const porWorker = Math.ceil(numRuns / numWorkers);
      for (let w = 0; w < numWorkers; w++) {
        const inicio = w * porWorker;
        const qtd = Math.min(porWorker, numRuns - inicio);
        if (qtd <= 0) { pendentes--; if (pendentes === 0) resolve(resultados); continue; }
        const worker = new Worker(fileURLToPath(import.meta.url), {
          workerData: { perfil, runs: qtd, baseSemente: baseSemente + inicio, economia },
        });
        worker.on('message', (res) => {
          resultados.push(...res);
          pendentes--;
          if (pendentes === 0) resolve(resultados);
        });
        worker.on('error', () => { pendentes--; if (pendentes === 0) resolve(resultados); });
      }
    });
  }

  function agregar(resultados) {
    const n = resultados.length;
    const completas = resultados.filter(r => r.completa).length;
    const dist = {};
    for (let i = 1; i <= 10; i++) dist[i] = 0;
    let vidasPerdidas = 0, ouroFinal = 0, ouroTotal = 0;
    let gastos = { herois: 0, reliquias: 0, consumiveis: 0 };
    let reliquias = 0, elencoFinal = 0;
    let estrelasSoma = 0, estrelasCount = 0;
    let apertoSoma = 0, apertoCount = 0;
    const comprasReliquias = {};
    const comprasConsumiveis = {};
    const ouroPorRodada = {};
    for (let i = 1; i <= 10; i++) ouroPorRodada[i] = { abates: 0, bonus: 0, total: 0, caixa: 0, count: 0 };

    for (const r of resultados) {
      if (r.completa) dist[10]++;
      else dist[r.rodadaFinal] = (dist[r.rodadaFinal] || 0) + 1;
      vidasPerdidas += r.vidasPerdidas;
      ouroFinal += r.ouroFinal;
      ouroTotal += r.ouroTotalGanho;
      gastos.herois += r.gastos.herois;
      gastos.reliquias += r.gastos.reliquias;
      gastos.consumiveis += r.gastos.consumiveis;
      reliquias += r.reliquiasCompradas;
      elencoFinal += r.elencoFinal;
      for (const e of r.estrelasPorRodada) { estrelasSoma += e.estrelas; estrelasCount++; }
      if (r.aperto) { apertoSoma += r.aperto; apertoCount++; }
      for (const [id, v] of Object.entries(r.comprasReliquias)) comprasReliquias[id] = (comprasReliquias[id] || 0) + v;
      for (const [id, v] of Object.entries(r.comprasConsumiveis)) comprasConsumiveis[id] = (comprasConsumiveis[id] || 0) + v;
      for (const o of r.ouroPorRodada) {
        ouroPorRodada[o.rodada].abates += o.abates;
        ouroPorRodada[o.rodada].bonus += o.bonus;
        ouroPorRodada[o.rodada].total += o.total;
        ouroPorRodada[o.rodada].caixa += o.caixaAposLoja;
        ouroPorRodada[o.rodada].count++;
      }
    }

    return {
      n, completas,
      pctCompletas: n ? (completas / n * 100) : 0,
      dist,
      vidasPerdidasMedia: n ? vidasPerdidas / n : 0,
      ouroFinalMedio: n ? ouroFinal / n : 0,
      ouroTotalMedio: n ? ouroTotal / n : 0,
      gastosMedios: { herois: n ? gastos.herois / n : 0, reliquias: n ? gastos.reliquias / n : 0, consumiveis: n ? gastos.consumiveis / n : 0 },
      reliquiasMedia: n ? reliquias / n : 0,
      estrelasMedia: estrelasCount ? estrelasSoma / estrelasCount : 0,
      elencoFinalMedia: n ? elencoFinal / n : 0,
      apertoMedia: apertoCount ? apertoSoma / apertoCount : null,
      comprasReliquias, comprasConsumiveis, ouroPorRodada,
    };
  }

  const todosResultados = {};
  for (const p of perfis) {
    const res = await rodarPerfil(p);
    todosResultados[p] = agregar(res);
  }

  // ---------- Impressão ----------
  function fmt(x, d = 2) { return typeof x === 'number' ? x.toFixed(d) : String(x); }

  console.log('\n## Resumo por perfil\n');
  console.log('| Perfil | % completas | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | Completa | Vidas perdidas | Ouro final | Ouro total | Gasto heróis | Gasto relíquias | Gasto consumíveis | Relíquias | Estrelas méd. | Elenco final | Rodada do aperto |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const p of perfis) {
    const a = todosResultados[p];
    const dist = [];
    for (let i = 1; i <= 10; i++) dist.push(a.dist[i] || 0);
    console.log(`| ${p} | ${fmt(a.pctCompletas, 1)}% | ${dist.join(' | ')} | ${a.completas} | ${fmt(a.vidasPerdidasMedia)} | ${fmt(a.ouroFinalMedio)} | ${fmt(a.ouroTotalMedio)} | ${fmt(a.gastosMedios.herois)} | ${fmt(a.gastosMedios.reliquias)} | ${fmt(a.gastosMedios.consumiveis)} | ${fmt(a.reliquiasMedia)} | ${fmt(a.estrelasMedia)} | ${fmt(a.elencoFinalMedia)} | ${a.apertoMedia === null ? '-' : fmt(a.apertoMedia)} |`);
  }

  console.log('\n## Ouro por rodada (média entre runs do esperto e do cauteloso)\n');
  console.log('| Rodada | Ouro de abates | Bônus | Total | Caixa após loja |');
  console.log('|---|---|---|---|---|');
  for (let i = 1; i <= 10; i++) {
    let abates = 0, bonus = 0, total = 0, caixa = 0, count = 0;
    for (const p of ['esperto', 'cauteloso']) {
      if (!todosResultados[p]) continue;
      const o = todosResultados[p].ouroPorRodada[i];
      if (o && o.count > 0) { abates += o.abates; bonus += o.bonus; total += o.total; caixa += o.caixa; count += o.count; }
    }
    if (count > 0) {
      console.log(`| ${i} | ${fmt(abates / count)} | ${fmt(bonus / count)} | ${fmt(total / count)} | ${fmt(caixa / count)} |`);
    } else {
      console.log(`| ${i} | - | - | - | - |`);
    }
  }

  console.log('\n## Itens nunca comprados\n');
  const todosItens = [...Object.keys(RELIQUIAS), ...Object.keys(CONSUMIVEIS)];
  const nunca = [];
  for (const id of todosItens) {
    let total = 0;
    for (const p of perfis) {
      const a = todosResultados[p];
      total += (a.comprasReliquias[id] || 0) + (a.comprasConsumiveis[id] || 0);
    }
    if (total === 0) nunca.push(id);
  }
  if (nunca.length === 0) console.log('(nenhum)');
  else for (const id of nunca) console.log(`- ${id}`);

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify(todosResultados, null, 2));
    console.log(`\nJSON gravado em ${jsonOut}`);
  }
}