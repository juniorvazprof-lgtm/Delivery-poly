// Teste de fumaça da lógica da run (core/run.js) jogando uma run inteira com um robô simples.
// Uso: node tools/teste-run.mjs [semente]
import { readFileSync } from 'node:fs';
import * as R from '../core/run.js';
import { HEROIS } from '../data/herois.js';
const CLASSES = Object.keys(HEROIS);
import { criarBatalha, passo, resumo } from '../core/combate.js';

const ideais = JSON.parse(readFileSync(new URL('../data/ideais.json', import.meta.url)));
const run = R.criarRun({ semente: Number(process.argv[2] || 7), ideais });
const falhas = [];
const checar = (cond, msg) => { if (!cond) falhas.push(msg); };

let guarda = 0;
while (!run.fim && guarda++ < 40) {
  const opcoes = R.opcoesDaRodada(run);
  checar(opcoes.length === (run.rodada === 10 ? 1 : 2), `R${run.rodada}: ${opcoes.length} opções`);
  const op = opcoes[0];
  // manda o ideal + 1 do que estiver disponível
  const disp = R.disponiveis(run);
  const enviados = Object.fromEntries(CLASSES.map((c) => [c, 0]));
  let falta = op.ideal + 1;
  for (const c of CLASSES) { const q = Math.min(disp[c] || 0, falta); enviados[c] = q; falta -= q; }
  const v = R.validarEnvio(run, op, enviados);
  if (!v.ok) { console.log(`R${run.rodada}: não pode enviar (${v.motivo}); ouro ${run.ouro}`); break; }
  const ouroAntes = run.ouro;
  const cfg = R.prepararBatalha(run, op, enviados);
  checar(run.ouro === ouroAntes, "prepararBatalha não deve mexer no ouro");
  const b = criarBatalha(cfg);
  while (!b.fim) { passo(b); b.eventos.length = 0; }
  const rodadaAntes = run.rodada;
  const rel = R.concluirBatalha(run, op, enviados, resumo(b));
  console.log(`R${rodadaAntes} ${op.id}: ${rel.vitoria ? 'vitória' : 'derrota'} ${rel.estrelas}★ enviados ${rel.total}/${rel.ideal} pote ${rel.pote} +prêmio ${rel.premioBase} ×${rel.multiplicador} = ${rel.ouroGanho} − soldo ${rel.soldo} | ouro ${run.ouro} base ${run.baseVida} desmaiados ${run.desmaiados.length} baú ${rel.bau}`);
  checar(Number.isFinite(run.ouro), 'ouro inválido');
  if (rel.vitoria) checar(run.rodada === rodadaAntes + 1 || run.fim, 'não avançou a rodada');
  else checar(run.rodada === rodadaAntes, 'avançou depois de derrota');
  if (run.bauPendente) { checar(run.bauPendente.length >= 1, 'baú vazio'); R.escolherReliquiaBau(run, run.bauPendente[0]); }
  // acampamento: repõe heróis até ideal+1 da próxima
  if (!run.fim) {
    const prox = R.opcoesDaRodada(run)[0];
    let g = 0;
    while (Object.values(R.disponiveis(run)).reduce((a, b) => a + b, 0) < prox.ideal + 1 && g++ < 10) {
      const c = CLASSES[g % CLASSES.length];
      if (!R.recrutar(run, c)) break;
    }
  }
}
const txt = R.serializar(run); const volta = R.restaurar(txt);
checar(volta.rodada === run.rodada && volta.ouro === run.ouro, 'serializar/restaurar perdeu dados');
console.log(`fim: ${run.fim} na rodada ${run.rodada}, relíquias ${run.reliquias.length}, pontuação ${R.pontuacao(run)}`);
console.log(falhas.length ? 'FALHAS:\n - ' + falhas.join('\n - ') : 'sem falhas');
