// Simulador em lote (sem gráficos) + relatório de balanceamento no formato do balance-check.
// Uso: node tools/balance.mjs [--sementes 24] [--saida design/balance/relatorio.md]
import { writeFileSync } from 'node:fs';
import { HEROIS } from '../data/herois.js';
import { VILOES } from '../data/viloes.js';
import { RELIQUIAS } from '../data/reliquias.js';
import { RODADAS, ECONOMIA } from '../data/rodadas.js';
import { simular, criarBatalha, passo } from '../core/combate.js';
import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { lote, ideal as idealLocal, setN, CLASSES, LIMIAR, MAXN } from './simlib.mjs';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => s.trim().split(/\s+/)));
const N = +(args.sementes || 24); setN(N);
const SAIDA = args.saida || 'design/balance/relatorio-etapa1.md';
const RAPIDO = 'rapido' in args;
// pool de workers: cada job calcula um "ideal" em paralelo
const W = Math.max(1, cpus().length);
const pool = Array.from({ length: W }, () => new Worker(new URL('./worker.mjs', import.meta.url), { workerData: { N } }));
const fila = []; const livres = [...pool]; let seq = 0; const pend = new Map();
for (const w of pool) w.on('message', ({ id, res }) => { pend.get(id)(res); pend.delete(id); livres.push(w); bombear(); });
function bombear() { while (livres.length && fila.length) { const w = livres.pop(); const { resolve, ...j } = fila.shift(); pend.set(j.id, resolve); w.postMessage(j); } }
const ideal = (inimigos, reliquias = [], classes = CLASSES, inicio = 1, fim = MAXN, extra = {}) =>
  new Promise((resolve) => { fila.push({ id: seq++, args: [inimigos, reliquias, classes, inicio, fim], extra, resolve }); bombear(); });

const f1 = (x) => (Math.round(x * 10) / 10).toLocaleString('pt-BR');
const pct = (x) => `${Math.round(x * 100)}%`;
const nTxt = (n) => (isFinite(n) ? String(n) : '∞');
const compTxt = (c) => CLASSES.filter((k) => c[k]).map((k) => `${c[k]} ${HEROIS[k].nome}`).join(' + ') || '—';
const total = (c) => CLASSES.reduce((s, k) => s + (c[k] || 0), 0);
const soGoblin = (r) => r.inimigos.every(([t]) => t === 'goblin');
const soSlime = (r) => r.inimigos.every(([t]) => t.startsWith('slime'));

function tempoPrimeiraMorte(herois, inimigo) {
  let soma = 0;
  for (let s = 0; s < N; s++) {
    const b = criarBatalha({ herois, inimigos: [[inimigo, 1]], semente: 500 + s });
    const id = b.unidades.find((u) => u.lado === 'v').id; let t = null;
    while (!b.fim && t === null) { passo(b); for (const e of b.eventos) if (e.tipo === 'morte' && e.alvo === id) t = b.t; b.eventos.length = 0; }
    soma += t ?? 90;
  }
  return soma / N;
}
const tempoSobrevivencia = (heroi, inimigos) => { let s = 0; for (let i = 0; i < N; i++) s += simular({ herois: { [heroi]: 1 }, inimigos, semente: 700 + i }).tempo; return s / N; };

const L = []; const out = (s = '') => L.push(s);
const t0 = Date.now(); const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);

// ---------- cálculos ----------
const dpsH = (k) => { const h = HEROIS[k]; let d = h.dano / h.intervalo; const gf = h.habilidades.find((x) => x.tipo === 'golpeFirme'); if (gf) d *= 1 + (gf.mult - 1) / gf.aCada; return d; };
const metas = [];
const goblinsGuerreiro = Math.ceil(VILOES.goblin.pv / (HEROIS.guerreiro.dano * 0.9));
const goblinsFogo = Math.ceil(VILOES.goblin.pv / (HEROIS.piromante.dano * 0.9));
const ttkSlime = tempoPrimeiraMorte({ guerreiro: 1 }, 'slime');
const horda = lote({ piromante: 3 }, [['goblin', 14]]);
const surv = tempoSobrevivencia('guardiao', [['goblin', 6]]);
const piro6 = lote({ piromante: 1 }, [['goblin', 6]]);
metas.push(['Golpes do Guerreiro para matar 1 goblin (pior caso −10%)', '2', goblinsGuerreiro, goblinsGuerreiro === 2]);
metas.push(['Bolas de fogo para matar 1 goblin (pior caso −10%)', '1', goblinsFogo, goblinsFogo === 1]);
metas.push(['Guerreiro sozinho mata o Slime grande (só o 1º corpo)', '6–10 s', `${f1(ttkSlime)} s`, ttkSlime >= 6 && ttkSlime <= 10]);
metas.push(['Goblins atingidos por bola de fogo (3 Piromantes x 14 goblins)', '≥ 1,5', f1(horda.area), horda.area >= 1.5]);
metas.push(['Guardião sozinho resiste a 6 goblins', '≥ 15 s', `${f1(surv)} s`, surv >= 15]);
metas.push(['Piromante sozinho contra 6 goblins', 'vence', pct(piro6.taxa), piro6.taxa >= 0.9]);

log('ideal por rodada...');
const ideais = (await Promise.all(RODADAS.map((r) => ideal(r.inimigos)))).map((i, j) => { const r = RODADAS[j]; log(`R${r.n}: ${i.n} (${compTxt(i.c)})`); return { rod: r, ...i }; });
// "Atalho perigoso": mesma regra de core/run.js (cada quantidade × multInimigos, mínimo +1)
const perigosa = (inim) => inim.map(([t, q, o]) => [t, Math.max(q + 1, Math.round(q * ECONOMIA.perigosa.multInimigos)), o]);
const ideaisPerigosa = await Promise.all(RODADAS.slice(0, 9).map((r) => ideal(perigosa(r.inimigos))));
ideaisPerigosa.forEach((i, j) => log(`R${j + 1} perigosa: ${i.n} (${compTxt(i.c)})`));
// grava os ideais medidos nos dados do jogo (data/ideais.json e data/ideais.js)
{
  const obj = {};
  ideais.forEach((i, j) => { obj[j + 1] = { n: i.n, comp: i.c, ...(ideaisPerigosa[j] ? { perigosa: ideaisPerigosa[j].n } : {}) }; });
  writeFileSync(new URL('../data/ideais.json', import.meta.url), JSON.stringify({ _fonte: SAIDA, ...obj }, null, 2) + '\n');
  writeFileSync(new URL('../data/ideais.js', import.meta.url), `// Número ideal de heróis por rodada (gerado por tools/balance.mjs; relatório: ${SAIDA}).\n// n = opção segura; perigosa = "Atalho perigoso" medido.\nexport const IDEAIS = ${JSON.stringify(obj, null, 2)};\n`);
}
const puros = {};
for (const k of ['guerreiro', 'piromante']) { puros[k] = (await Promise.all(RODADAS.map((r) => ideal(r.inimigos, [], [k])))).map((x) => x.n); log('só', k, puros[k].join(',')); }

const gob = RODADAS.map((r, i) => i).filter((i) => soGoblin(RODADAS[i]));
const gob3 = gob.filter((i) => i >= 2); // R1 e R2 seguem rápidas de propósito
const outras = RODADAS.map((r, i) => i).filter((i) => !soGoblin(RODADAS[i]) && i >= 2);
const dG = gob3.map((i) => ideais[i].r.tempo), dO = outras.map((i) => ideais[i].r.tempo);
metas.push(['Duração das rodadas só de goblins R3–R10 (formação ideal)', '8–45 s', `${f1(Math.min(...dG))}–${f1(Math.max(...dG))} s`, Math.min(...dG) >= 8 && Math.max(...dG) <= 45]);
metas.push(['Duração das demais rodadas R3–R10', '12–45 s', `${f1(Math.min(...dO))}–${f1(Math.max(...dO))} s`, Math.min(...dO) >= 12 && Math.max(...dO) <= 45]);
const degraus = ideais.slice(1).map((x, i) => x.n - ideais[i].n);
metas.push(['Ideal R1 → R10, sem degraus maiores que +3', '~2 → 9–12', ideais.map((x) => nTxt(x.n)).join(' → '), ideais[0].n <= 3 && ideais[9].n >= 9 && ideais[9].n <= 12 && Math.max(...degraus) <= 3]);
const sl = RODADAS.map((r, i) => i).filter((i) => soSlime(RODADAS[i]));
const piorPiroSlime = sl.every((i) => puros.piromante[i] > puros.guerreiro[i]);
const melhorPiroGob = gob.every((i) => puros.piromante[i] < puros.guerreiro[i]);
metas.push(['Só Piromantes piores que só Guerreiros contra slimes', 'sim', piorPiroSlime ? 'sim' : 'não', piorPiroSlime]);
metas.push(['Só Piromantes melhores que só Guerreiros contra goblins', 'sim', melhorPiroGob ? 'sim' : 'não', melhorPiroGob]);
const r6 = 5; const razao6 = puros.piromante[r6] / ideais[r6].n;
metas.push(['R6: Piromantes necessários (só Piromantes) ≤ 2× o ideal', '≤ 2×', `${nTxt(puros.piromante[r6])} / ${ideais[r6].n} = ${f1(razao6)}×`, razao6 <= 2]);
const piroTarde = [6, 7, 8, 9].filter((i) => ideais[i].c.piromante > 0);
metas.push(['Piromante na formação ideal de alguma rodada R7–R10', 'sim', piroTarde.length ? piroTarde.map((i) => `R${i + 1}`).join(', ') : 'não', piroTarde.length > 0]);
const degenerado = Object.entries(puros).filter(([, arr]) => arr.every((n, i) => n <= ideais[i].n));
metas.push(['Nenhuma classe sozinha é ideal em todas as rodadas', 'nenhuma', degenerado.map(([k]) => HEROIS[k].nome).join(', ') || 'nenhuma', !degenerado.length]);
const chama = await Promise.all(sl.map(async (i) => ({ r: RODADAS[i].n, sem: puros.piromante[i], com: (await ideal(RODADAS[i].inimigos, ['chamaConcentrada'], ['piromante'])).n })));
metas.push(['Chama Concentrada (chave) reduz Piromantes necessários contra slimes', 'reduz', chama.map((x) => `R${x.r}: ${nTxt(x.sem)}→${nTxt(x.com)}`).join(', '), chama.every((x) => x.com < x.sem)]);

// relíquias: ideal com e sem, em todas as rodadas
log('relíquias...');
const rel = RAPIDO ? [] : await Promise.all(Object.entries(RELIQUIAS).map(async ([id, r]) => {
  const ns = await Promise.all(ideais.map((i) => ideal(i.rod.inimigos, [id], CLASSES, Math.max(1, i.n - 3), i.n + 2)));
  const red = ns.map((x, j) => ideais[j].n - x.n);
  log(r.nome, ns.map((x) => nTxt(x.n)).join(','));
  return { id, r, ns, maxRed: Math.max(...red.filter(isFinite)), red };
}));
const raras = rel.filter((x) => x.r.raridade === 'rara');
const rarasFalham = raras.filter((x) => x.maxRed < 1);
metas.push(['Cada relíquia rara reduz o ideal em ≥ 1 em alguma rodada', 'todas', rarasFalham.length ? `falham: ${rarasFalham.map((x) => x.r.nome).join(', ')}` : 'todas', !rarasFalham.length]);

// guardião sem armadura
log('guardião sem armadura...');
const semArm = RAPIDO ? ideais : await Promise.all(RODADAS.map((r) => ideal(r.inimigos, [], CLASSES, 1, MAXN, { semArmadura: true })));
const rodGuard = ideais.filter((i) => i.c.guardiao > 0).length;
const partGuard = ideais.reduce((s, i) => s + (i.c.guardiao || 0), 0) / ideais.reduce((s, i) => s + i.n, 0);

// economia (mantida; corte de ouro fica para a etapa 3)
function economia(estrelas) {
  let ouro = ECONOMIA.ouroInicial; const elenco = { ...ECONOMIA.elencoInicial }; const desm = []; const linhas = [];
  for (const i of ideais) {
    const alvoN = estrelas === 3 ? i.n : Math.ceil(i.n * 1.5);
    const comp = { ...i.c }; let extra = alvoN - i.n; let k = 0; while (extra-- > 0) { const c = k++ % 2 === 0 ? 'guerreiro' : 'guardiao'; comp[c] = (comp[c] || 0) + 1; }
    const disp = { ...elenco }; for (const d of desm) if (d.volta > i.rod.n) disp[d.tipo]--;
    let compra = 0;
    for (const c of CLASSES) { const falta = Math.max(0, (comp[c] || 0) - disp[c]); if (falta) { const custo = falta * HEROIS[c].custo; ouro -= custo; compra += custo; elenco[c] += falta; } }
    const res = lote(comp, i.rod.inimigos, [], 12);
    for (const [c, q] of Object.entries(res.mortos)) for (let j = 0; j < Math.round(q); j++) desm.push({ tipo: c, volta: i.rod.n + 1 + ECONOMIA.rodadasDesmaio });
    ouro += Math.round(ECONOMIA.bonusVitoria(i.rod.n) * ECONOMIA.multEstrelas[estrelas]);
    linhas.push({ ouro });
  }
  return linhas;
}
const eco2 = economia(2);
metas.push(['Jogador 2★ repõe heróis até a R10 sem ouro negativo', 'sim', eco2.every((l) => l.ouro >= 0) ? 'sim' : 'não', eco2.every((l) => l.ouro >= 0)]);

// ---------- relatório ----------
const ruins = metas.filter((m) => !m[3]);
out('## Balance Check: Combate — Quantos Heróis? (etapa 1, revisão 2)\n');
out('### Data Sources Analyzed');
out('- `data/herois.js`, `data/viloes.js`, `data/reliquias.js`, `data/consumiveis.js`, `data/rodadas.js`');
out(`- Metas: \`design/gdd/quantos-herois.md\`. Simulações: \`core/combate.js\`, ${N} sementes por formação, ideal = menor time com ≥${pct(LIMIAR)} de vitórias. Com Chama Concentrada, cada formação usa a melhor posição da chave.\n`);
out(`### Health Summary: ${degenerado.length ? 'CRITICAL ISSUES' : ruins.length ? 'CONCERNS' : 'HEALTHY'}\n`);
out('### Tabela de unidades');
out('| Unidade | Vida | Dano | Intervalo (s) | Alcance | Movimento | Custo / ouro | Especial |'); out('|---|--:|--:|--:|--:|--:|--:|---|');
for (const h of Object.values(HEROIS)) out(`| ${h.nome} | ${h.pv} | ${h.dano} | ${h.intervalo} | ${h.alcance} | ${h.velocidade} | ${h.custo} | ${h.reducaoDano ? `armadura ${pct(h.reducaoDano)}` : ''} |`);
for (const v of Object.values(VILOES)) out(`| ${v.nome} | ${v.pv} | ${v.dano} | ${v.intervalo} | ${v.alcance} | ${v.velocidade} | ${v.ouro} | ${[v.divide && `divide em ${v.divide.qtd}`, v.respingo && `respinga até ${v.respingo.max}`, v.invoca && `invoca ${v.invoca.qtd} ${v.invoca.tipo} a cada ${v.invoca.intervalo} s`].filter(Boolean).join(', ')} |`);
out();
out('### DPS e tempo até matar (teórico, um alvo)');
out('| Herói | DPS | ' + Object.values(VILOES).map((v) => v.nome).join(' | ') + ' |'); out('|---|--:|' + Object.keys(VILOES).map(() => '--:').join('|') + '|');
for (const k of CLASSES) out(`| ${HEROIS[k].nome} | ${f1(dpsH(k))} | ` + Object.values(VILOES).map((v) => `${f1(v.pv / dpsH(k))} s`).join(' | ') + ' |');
out();
out('### Metas do GDD x resultado'); out('| Métrica | Meta | Resultado | OK? |'); out('|---|---|---|:-:|');
for (const [a, b, c, ok] of metas) out(`| ${a} | ${b} | ${c} | ${ok ? '✅' : '❌'} |`);
out();
out('### Número ideal por rodada');
out('| Rodada | Inimigos | Ideal | Melhor formação | Vitórias | Duração | Só Guerreiros | Só Piromantes |'); out('|---|---|--:|---|--:|--:|--:|--:|');
for (const [j, i] of ideais.entries()) out(`| R${i.rod.n} ${i.rod.nome} | ${i.rod.inimigos.map(([t, q]) => `${q} ${VILOES[t].nome}`).join(' + ')} | **${nTxt(i.n)}** | ${compTxt(i.c)} | ${pct(i.r.taxa)} | ${f1(i.r.tempo)} s | ${nTxt(puros.guerreiro[j])} | ${nTxt(puros.piromante[j])} |`);
out();
out('### Atalho perigoso: ideal medido x estimativa antiga (ideal × ' + ECONOMIA.perigosa.multIdeal + ')');
out('| Rodada | Inimigos | Ideal medido | Estimativa antiga | Melhor formação |'); out('|---|---|--:|--:|---|');
ideaisPerigosa.forEach((i, j) => out(`| R${j + 1} | ${perigosa(RODADAS[j].inimigos).map(([t, q]) => `${q} ${VILOES[t].nome}`).join(' + ')} | **${nTxt(i.n)}** | ${Math.ceil(ideais[j].n * ECONOMIA.perigosa.multIdeal)} | ${compTxt(i.c)} |`));
out();
out('### Relíquias: número ideal com cada relíquia (sem relíquia na primeira linha; em negrito onde reduz)');
out('| Relíquia | Raridade | ' + RODADAS.map((r) => `R${r.n}`).join(' | ') + ' | Maior redução |'); out('|---|---|' + RODADAS.map(() => '--:').join('|') + '|--:|');
out('| (sem relíquia) | — | ' + ideais.map((i) => nTxt(i.n)).join(' | ') + ' | — |');
for (const x of rel) out(`| ${x.r.nome} | ${x.r.raridade} | ` + x.ns.map((y, j) => (x.red[j] >= 1 ? `**${nTxt(y.n)}**` : nTxt(y.n))).join(' | ') + ` | ${x.maxRed >= 1 ? '−' + x.maxRed : x.maxRed <= 0 ? '0' : x.maxRed} |`);
out();
out('### Guardião: ideal com e sem a armadura de 30%');
out('| | ' + RODADAS.map((r) => `R${r.n}`).join(' | ') + ' |'); out('|---|' + RODADAS.map(() => '--:').join('|') + '|');
out('| Com armadura | ' + ideais.map((i) => nTxt(i.n)).join(' | ') + ' |');
out('| Sem armadura | ' + semArm.map((i) => nTxt(i.n)).join(' | ') + ' |');
out('| Guardiões na formação (com) | ' + ideais.map((i) => i.c.guardiao || 0).join(' | ') + ' |');
out('| Guardiões na formação (sem) | ' + semArm.map((i) => i.c.guardiao || 0).join(' | ') + ' |');
out(`\nCom armadura, o Guardião aparece em ${rodGuard} de 10 formações ideais e é ${pct(partGuard)} dos heróis enviados.\n`);
out('### Degenerate Strategies Found');
out(degenerado.length ? degenerado.map(([k]) => `- Só ${HEROIS[k].nome}s iguala a melhor mistura em todas as rodadas.`).join('\n') : '- Nenhuma classe sozinha iguala a melhor mistura em todas as rodadas.');
out(`\n_Gerado em ${((Date.now() - t0) / 1000).toFixed(0)} s._`);
writeFileSync(SAIDA, L.join('\n') + '\n');
log(`relatório: ${SAIDA}`); for (const w of pool) w.terminate(); console.log(ruins.length ? 'metas não atingidas:\n' + ruins.map((m) => ` - ${m[0]}: ${m[2]} (meta ${m[1]})`).join('\n') : 'todas as metas atingidas');
