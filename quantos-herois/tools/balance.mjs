// Simulador em lote (sem gráficos) + relatório de balanceamento no formato do balance-check.
// Uso: node tools/balance.mjs [--sementes 24] [--saida design/balance/relatorio.md]
import { writeFileSync } from 'node:fs';
import { HEROIS } from '../data/herois.js';
import { VILOES } from '../data/viloes.js';
import { RELIQUIAS } from '../data/reliquias.js';
import { RODADAS, ECONOMIA } from '../data/rodadas.js';
import { simular, criarBatalha, passo } from '../core/combate.js';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => s.trim().split(/\s+/)));
const N = +(args.sementes || 24);
const SAIDA = args.saida || 'design/balance/relatorio-etapa1.md';
const CLASSES = Object.keys(HEROIS);
const LIMIAR = 0.9;   // "ideal" = menor nº de heróis com ≥90% de vitórias
const MAXN = 16;

const f1 = (x) => (Math.round(x * 10) / 10).toLocaleString('pt-BR');
const pct = (x) => `${Math.round(x * 100)}%`;
const compTxt = (c) => CLASSES.filter((k) => c[k]).map((k) => `${c[k]} ${HEROIS[k].nome}`).join(' + ') || '—';
const total = (c) => CLASSES.reduce((s, k) => s + (c[k] || 0), 0);

function lote(herois, inimigos, reliquias = [], n = N, base = 1000) {
  let v = 0, t = 0, vivos = 0, area = 0, areaN = 0, filhotes = 0; const mortos = {};
  for (let s = 0; s < n; s++) {
    const r = simular({ herois, inimigos, reliquias, semente: base + s });
    if (r.vitoria) { v++; vivos += total(r.sobreviventes); }
    t += r.tempo; filhotes += r.slimesGerados;
    if (r.mediaAcertosArea) { area += r.mediaAcertosArea; areaN++; }
    for (const [k, q] of Object.entries(r.mortos)) mortos[k] = (mortos[k] || 0) + q / n;
  }
  return { taxa: v / n, tempo: t / n, vivos: v ? vivos / v : 0, area: areaN ? area / areaN : 0, filhotes: filhotes / n, mortos };
}

function* composicoes(n, classes = CLASSES) {
  if (classes.length === 1) { yield { [classes[0]]: n }; return; }
  const [c, ...resto] = classes;
  for (let i = n; i >= 0; i--) for (const r of composicoes(n - i, resto)) yield { [c]: i, ...r };
}

// menor formação que vence com ≥ LIMIAR (busca crescente; poda rápida com 8 sementes)
function ideal(inimigos, reliquias = [], classes = CLASSES) {
  for (let n = 1; n <= MAXN; n++) {
    let melhor = null;
    for (const c of composicoes(n, classes)) {
      if (lote(c, inimigos, reliquias, 6).taxa < 0.5) continue;
      const r = lote(c, inimigos, reliquias);
      if (r.taxa >= LIMIAR && (!melhor || r.taxa > melhor.r.taxa || (r.taxa === melhor.r.taxa && r.vivos > melhor.r.vivos))) melhor = { c, r };
    }
    if (melhor) return { n, ...melhor };
  }
  return { n: Infinity, c: {}, r: null };
}

// tempo para matar só o primeiro corpo de um inimigo (ex.: slime grande antes de dividir)
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
function tempoSobrevivencia(heroi, inimigos) {
  let soma = 0;
  for (let s = 0; s < N; s++) soma += simular({ herois: { [heroi]: 1 }, inimigos, semente: 700 + s }).tempo;
  return soma / N;
}

const L = []; const out = (s = '') => { L.push(s); };
const t0 = Date.now();

// ---------- 1. Tabela de unidades ----------
out('## Balance Check: Combate e economia — Quantos Heróis? (etapa 1)\n');
out('### Data Sources Analyzed');
out('- `data/herois.js`, `data/viloes.js`, `data/reliquias.js`, `data/consumiveis.js`, `data/rodadas.js`');
out('- Metas: `design/gdd/quantos-herois.md` (não há `design/registry/entities.yaml`)');
out(`- Simulações: motor \`core/combate.js\`, ${N} sementes por formação, limiar do "ideal" = ${pct(LIMIAR)} de vitórias\n`);
out('### Tabela de unidades');
out('| Unidade | Lado | Vida | Dano | Intervalo (s) | Alcance | Movimento | Custo / ouro |');
out('|---|---|--:|--:|--:|--:|--:|--:|');
for (const [k, h] of Object.entries(HEROIS)) out(`| ${h.nome} | herói | ${h.pv} | ${h.dano} | ${h.intervalo} | ${h.alcance} | ${h.velocidade} | ${h.custo} |`);
for (const [k, v] of Object.entries(VILOES)) out(`| ${v.nome} | vilão | ${v.pv} | ${v.dano} | ${v.intervalo} | ${v.alcance} | ${v.velocidade} | ${v.ouro} |`);
out();

// ---------- 2. DPS e tempo até matar (teórico, alvo único) ----------
const dpsH = (k) => { const h = HEROIS[k]; let d = h.dano / h.intervalo; const gf = h.habilidades.find((x) => x.tipo === 'golpeFirme'); if (gf) d *= 1 + (gf.mult - 1) / gf.aCada; return d; };
out('### DPS e tempo até matar (teórico, um alvo, sem deslocamento)');
out('| Herói | DPS | ' + Object.values(VILOES).map((v) => `TTK ${v.nome}`).join(' | ') + ' |');
out('|---|--:|' + Object.keys(VILOES).map(() => '--:').join('|') + '|');
for (const k of CLASSES) out(`| ${HEROIS[k].nome} | ${f1(dpsH(k))} | ` + Object.values(VILOES).map((v) => `${f1(v.pv / dpsH(k))} s`).join(' | ') + ' |');
out('\nTTK de um slime não inclui os filhotes: matar um Slime grande gera 2 médios e 4 pequenos (234 de vida a mais).');
out('| Vilão | DPS contra um herói |'); out('|---|--:|');
for (const v of Object.values(VILOES)) out(`| ${v.nome} | ${f1(v.dano / v.intervalo)} |`);
out();

// ---------- 3. Verificação das metas e contra-ataques ----------
const goblinsGuerreiro = Math.ceil(VILOES.goblin.pv / (HEROIS.guerreiro.dano * 0.9));
const goblinsFogo = Math.ceil(VILOES.goblin.pv / (HEROIS.piromante.dano * 0.9));
const ttkSlime = tempoPrimeiraMorte({ guerreiro: 1 }, 'slime');
const horda = lote({ piromante: 3 }, [['goblin', 14]]);
const surv = tempoSobrevivencia('guardiao', [['goblin', 6]]);
const piro6 = lote({ piromante: 1 }, [['goblin', 6]]);
const metas = [
  ['Golpes do Guerreiro para matar 1 goblin (pior caso −10%)', '2', goblinsGuerreiro, goblinsGuerreiro === 2],
  ['Bolas de fogo para matar 1 goblin (pior caso −10%)', '1', goblinsFogo, goblinsFogo === 1],
  ['Guerreiro sozinho mata o Slime grande (só o 1º corpo)', '6–10 s', `${f1(ttkSlime)} s`, ttkSlime >= 6 && ttkSlime <= 10],
  ['Goblins atingidos por bola de fogo (3 Piromantes x 14 goblins) — meta revisada', '≥ 1,5', f1(horda.area), horda.area >= 1.5],
  ['Guardião sozinho resiste a 6 goblins', '≥ 15 s', `${f1(surv)} s`, surv >= 15],
  ['Piromante sozinho contra 6 goblins', 'vence', pct(piro6.taxa), piro6.taxa >= 0.9],
];

// ---------- 4. Número ideal por rodada ----------
console.log('calculando ideal por rodada...');
const ideais = RODADAS.map((r) => { const i = ideal(r.inimigos); console.log(`R${r.n}: ${i.n} (${compTxt(i.c)})`); return { rod: r, ...i }; });
const puros = {};
for (const k of CLASSES) { if (k === 'guardiao') continue; puros[k] = RODADAS.map((r) => ideal(r.inimigos, [], [k]).n); console.log('puro', k, puros[k].join(',')); }
const duracoes = ideais.map((i) => i.r?.tempo || 0);
const dur3 = duracoes.slice(2);
metas.push(['Duração das batalhas R3–R10 (formação ideal) — R1/R2 rápidas de propósito', '12–45 s', `${f1(Math.min(...dur3))}–${f1(Math.max(...dur3))} s`, Math.min(...dur3) >= 12 && Math.max(...dur3) <= 45]);
const degraus = ideais.slice(1).map((x, i) => x.n - ideais[i].n);
metas.push(['Ideal R1 → R10, sem degraus maiores que +3', '~2 → 9–12', ideais.map((x) => x.n).join(' → '), ideais[0].n <= 3 && ideais[9].n >= 9 && ideais[9].n <= 12 && Math.max(...degraus) <= 3]);
// contra-ataques: piromante puro vs guerreiro puro nos slimes
const slimeRods = RODADAS.map((r, i) => i).filter((i) => RODADAS[i].inimigos.every(([t]) => t.startsWith('slime')));
const gobRods = RODADAS.map((r, i) => i).filter((i) => RODADAS[i].inimigos.every(([t]) => t === 'goblin'));
const piorPiroSlime = slimeRods.every((i) => puros.piromante[i] > puros.guerreiro[i]);
const melhorPiroGob = gobRods.every((i) => puros.piromante[i] < puros.guerreiro[i]);
metas.push(['Piromantes puros piores que guerreiros puros contra slimes', 'sim', piorPiroSlime ? 'sim' : 'não', piorPiroSlime]);
metas.push(['Piromantes puros melhores que guerreiros puros contra goblins', 'sim', melhorPiroGob ? 'sim' : 'não', melhorPiroGob]);
const degenerado = Object.entries(puros).filter(([k, arr]) => arr.every((n, i) => n <= ideais[i].n));
metas.push(['Nenhuma classe sozinha é ideal em todas as rodadas', 'nenhuma', degenerado.map(([k]) => HEROIS[k].nome).join(', ') || 'nenhuma', !degenerado.length]);
// Chama Concentrada para piromante contra slimes
const chama = slimeRods.map((i) => ({ r: RODADAS[i].n, sem: puros.piromante[i], com: ideal(RODADAS[i].inimigos, ['chamaConcentrada'], ['piromante']).n }));
const chamaOk = chama.every((x) => x.com < x.sem);
metas.push(['Chama Concentrada reduz Piromantes necessários contra slimes', 'reduz', chama.map((x) => `R${x.r}: ${x.sem}→${x.com}`).join(', '), chamaOk]);

// ---------- 5. Relíquias ----------
console.log('relíquias...');
const relRods = [2, 4, 7, 9].map((i) => RODADAS[i]);
const rel = Object.entries(RELIQUIAS).map(([id, r]) => {
  const linha = relRods.map((rod) => { const base = ideais[rod.n - 1]; const res = lote(base.c, rod.inimigos, [id]); return { rod: rod.n, taxa: res.taxa, vivos: res.vivos, tempo: res.tempo, base: base.r }; });
  return { id, r, linha };
});

// ---------- 6. Economia ----------
function economia(estrelas) {
  let ouro = ECONOMIA.ouroInicial; const elenco = { ...ECONOMIA.elencoInicial }; const desm = []; const linhas = [];
  for (const i of ideais) {
    const alvoN = estrelas === 3 ? i.n : Math.ceil(i.n * 1.5);
    // formação: a ideal + extras proporcionais (2★ manda mais gente)
    const comp = { ...i.c }; let extra = alvoN - i.n; let k = 0; while (extra-- > 0) { comp[CLASSES[k++ % 2 === 0 ? 0 : 1]]++; }
    // disponíveis
    const disp = { ...elenco }; for (const d of desm) if (d.volta > i.rod.n) disp[d.tipo]--;
    let compra = 0;
    for (const c of CLASSES) { const falta = Math.max(0, (comp[c] || 0) - disp[c]); if (falta) { const custo = falta * HEROIS[c].custo; ouro -= custo; compra += custo; elenco[c] += falta; } }
    const res = lote(comp, i.rod.inimigos, [], 12);
    for (const [c, q] of Object.entries(res.mortos)) { const n = Math.round(q); for (let j = 0; j < n; j++) desm.push({ tipo: c, volta: i.rod.n + 1 + ECONOMIA.rodadasDesmaio }); }
    const ganho = Math.round(ECONOMIA.ouroBase(i.rod.n) * ECONOMIA.multEstrelas[estrelas]);
    ouro += ganho;
    linhas.push({ r: i.rod.n, manda: total(comp), compra, ganho, ouro, elenco: total(elenco), desm: desm.filter((d) => d.volta > i.rod.n + 1).length });
  }
  return linhas;
}
const eco3 = economia(3), eco2 = economia(2);
const ecoOk = eco2.every((l) => l.ouro >= 0) && eco3.every((l) => l.ouro >= 0);
metas.push(['Jogador 2★ consegue repor heróis até a R10 sem ouro negativo', 'sim', eco2.every((l) => l.ouro >= 0) ? 'sim' : `não (mínimo ${Math.min(...eco2.map((l) => l.ouro))})`, eco2.every((l) => l.ouro >= 0)]);

// ---------- relatório ----------
const ruins = metas.filter((m) => !m[3]);
const critico = degenerado.length || ideais.some((i) => !isFinite(i.n));
out(`### Health Summary: ${critico ? 'CRITICAL ISSUES' : ruins.length ? 'CONCERNS' : 'HEALTHY'}\n`);
out('### Metas do GDD x resultado');
out('| Métrica | Meta | Resultado | OK? |'); out('|---|---|---|:-:|');
for (const [a, b, c, ok] of metas) out(`| ${a} | ${b} | ${c} | ${ok ? '✅' : '❌'} |`);
out();
out('### Número ideal por rodada');
out('| Rodada | Inimigos | Ideal | Melhor formação | Vitórias | Duração | Heróis vivos | Ideal só Guerreiros | Ideal só Piromantes |');
out('|---|---|--:|---|--:|--:|--:|--:|--:|');
for (const [j, i] of ideais.entries()) out(`| R${i.rod.n} ${i.rod.nome} | ${i.rod.inimigos.map(([t, q]) => `${q} ${VILOES[t].nome}`).join(' + ')} | **${i.n}** | ${compTxt(i.c)} | ${pct(i.r.taxa)} | ${f1(i.r.tempo)} s | ${f1(i.r.vivos)} | ${puros.guerreiro[j]} | ${puros.piromante[j]} |`);
out('\n"Ideal" = menor número total de heróis em que alguma combinação vence ≥90% das sementes. "Só X" = o mesmo cálculo usando apenas uma classe (∞ = não vence até 16).\n');
out('### Estrelas por rodada (regra: 3★ ≤ ideal, 2★ ≤ 150% do ideal, 1★ só vencer)');
out('| Rodada | 3★ com até | 2★ com até |'); out('|---|--:|--:|');
for (const i of ideais) out(`| R${i.rod.n} | ${i.n} | ${Math.floor(i.n * 1.5)} |`);
out();
out('### Relíquias: efeito na formação ideal (taxa de vitória · heróis vivos)');
out('| Relíquia | ' + relRods.map((r) => `R${r.n}`).join(' | ') + ' |'); out('|---|' + relRods.map(() => '---').join('|') + '|');
out(`| (sem relíquia) | ` + relRods.map((r) => { const b = ideais[r.n - 1].r; return `${pct(b.taxa)} · ${f1(b.vivos)}`; }).join(' | ') + ' |');
for (const x of rel) out(`| ${x.r.nome} | ` + x.linha.map((l) => `${pct(l.taxa)} · ${f1(l.vivos)}`).join(' | ') + ' |');
out();
out('### Economia (projeção de um jogador de referência)');
for (const [nome, eco] of [['3 estrelas (manda o ideal)', eco3], ['2 estrelas (manda 150% do ideal)', eco2]]) {
  out(`**${nome}**\n`);
  out('| Rodada | Mandou | Gastou recrutando | Ganhou | Ouro no fim | Elenco total | Desmaiados |'); out('|---|--:|--:|--:|--:|--:|--:|');
  for (const l of eco) out(`| R${l.r} | ${l.manda} | ${l.compra} | ${l.ganho} | ${l.ouro} | ${l.elenco} | ${l.desm} |`);
  out();
}
out('### Degenerate Strategies Found');
out(degenerado.length ? degenerado.map(([k]) => `- Só ${HEROIS[k].nome}s é tão bom quanto a melhor mistura em todas as rodadas.`).join('\n') : '- Nenhuma: nenhuma classe sozinha iguala a melhor mistura em todas as rodadas.');
out(`\n_Gerado em ${((Date.now() - t0) / 1000).toFixed(0)} s._`);
writeFileSync(SAIDA, L.join('\n') + '\n');
console.log(`\nrelatório: ${SAIDA}`); console.log(ruins.length ? 'metas não atingidas:\n' + ruins.map((m) => ` - ${m[0]}: ${m[2]} (meta ${m[1]})`).join('\n') : 'todas as metas atingidas');
