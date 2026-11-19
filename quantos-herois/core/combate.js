// Motor de combate: simulação pura (sem tela), passo fixo, determinística por semente.
// A batalha visual (render/) lê `b.unidades`, `b.projeteis` e consome `b.eventos`.
import { HEROIS } from '../data/herois.js';
import { VILOES } from '../data/viloes.js';
import { CONSUMIVEIS } from '../data/consumiveis.js';
import { criarRng } from './rng.js';
import { modsPorClasse } from './efeitos.js';

export const ARENA = { largura: 90, altura: 140 };
export const DT = 0.05;          // 20 passos por segundo
export const TEMPO_MAX = 90;     // depois disso, conta como derrota
const VARIACAO = 0.1;            // ±10% de dano por golpe

let proxId = 1;

function criarUnidade(b, lado, tipo, x, y, extra = {}) {
  const base = lado === 'h' ? HEROIS[tipo] : VILOES[tipo];
  const m = lado === 'h' ? (b.mods[tipo] || {}) : {};
  const pv = Math.round(base.pv * (m.pvMult ?? 1));
  const u = {
    id: proxId++, lado, tipo, x, y, pv, pvMax: pv,
    dano: base.dano, intervalo: base.intervalo, alcance: base.alcance,
    vel: base.velocidade, raio: base.raio,
    cd: b.rng.entre(0.2, base.intervalo), golpes: 0, alvo: null, reAlvo: 0,
    provocadoPor: null, provocadoAte: 0, provCd: 1, queima: null, morto: false,
    base, m, ...extra,
  };
  b.unidades.push(u);
  return u;
}

export function criarBatalha({ herois = {}, inimigos = [], reliquias = [], consumiveis = {}, semente = 1 }) {
  const b = {
    t: 0, rng: criarRng(semente), mods: modsPorClasse(reliquias),
    unidades: [], projeteis: [], eventos: [], fim: null,
    consumiveis: { ...consumiveis }, usado: {}, stats: { danoPorClasse: {}, acertosArea: [] },
  };
  // heróis embaixo: guardiões na frente, guerreiros no meio, piromantes atrás
  const filas = [['guardiao', 108], ['guerreiro', 114], ['piromante', 126]];
  for (const [tipo, y0] of filas) {
    const n = herois[tipo] || 0;
    for (let i = 0; i < n; i++) {
      const col = i % 6, lin = Math.floor(i / 6);
      const x = ARENA.largura / 2 + (col - (Math.min(n, 6) - 1) / 2) * 11 + b.rng.entre(-1.5, 1.5);
      criarUnidade(b, 'h', tipo, x, y0 + lin * 5 + b.rng.entre(-1, 1));
    }
  }
  // inimigos em cima, em bandos
  for (const [tipo, qtd] of inimigos) {
    const cx = tipo === 'reiSlime' ? ARENA.largura / 2 : b.rng.entre(20, 70);
    for (let i = 0; i < qtd; i++) {
      // goblins chegam espalhados e em levas; slimes em grupo
      const goblin = tipo === 'goblin';
      const x = goblin ? b.rng.entre(8, ARENA.largura - 8) : clamp(cx + b.rng.entre(-18, 18), 6, ARENA.largura - 6);
      criarUnidade(b, 'v', tipo, x, tipo === 'reiSlime' ? 20 : b.rng.entre(6, 36),
        { geracao: 0, atraso: goblin ? b.rng.entre(0, 3) : 0 });
    }
  }
  return b;
}

const clamp = (v, a, z) => Math.max(a, Math.min(z, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const vivos = (b, lado) => b.unidades.filter((u) => !u.morto && u.lado === lado);

function emitir(b, ev) { b.eventos.push({ t: b.t, ...ev }); }

function causarDano(b, fonte, alvo, valor, tipoGolpe = 'golpe', emArea = false) {
  if (alvo.morto) return 0;
  let v = valor;
  if (alvo.base.reducaoDano) v *= 1 - alvo.base.reducaoDano;
  if (emArea && alvo.base.resisteArea) v *= 1 - alvo.base.resisteArea; // gelatinosos absorvem explosões
  if (alvo.lado === 'h') { // Muralha: aliados perto de um Guardião com a relíquia recebem menos dano
    const red = b.mods.guardiao?.auraReducao;
    if (red && vivos(b, 'h').some((g) => g.tipo === 'guardiao' && dist(g, alvo) <= (b.mods.guardiao.auraRaio || 12))) v *= 1 - red;
  }
  v = Math.max(1, Math.round(v));
  alvo.pv -= v;
  if (fonte && fonte.lado === 'h') b.stats.danoPorClasse[fonte.tipo] = (b.stats.danoPorClasse[fonte.tipo] || 0) + v;
  emitir(b, { tipo: 'dano', alvo: alvo.id, valor: v, x: alvo.x, y: alvo.y, golpe: tipoGolpe });
  if (emArea && alvo.base.respingo && (alvo.respingos || 0) < alvo.base.respingo.max) {
    // dano em área espalha o slime: solta um filhote extra
    alvo.respingos = (alvo.respingos || 0) + 1;
    const ang = b.rng.entre(0, Math.PI * 2);
    const f = criarUnidade(b, 'v', alvo.base.respingo.em, clamp(alvo.x + Math.cos(ang) * 5, 4, ARENA.largura - 4), clamp(alvo.y + Math.sin(ang) * 5, 4, ARENA.altura - 4), { geracao: 2 });
    f.cd = 0.6; emitir(b, { tipo: 'respingo', x: alvo.x, y: alvo.y });
  }
  if (alvo.pv <= 0) morrer(b, alvo);
  return v;
}

function morrer(b, u) {
  u.morto = true; u.pv = 0;
  emitir(b, { tipo: 'morte', alvo: u.id, x: u.x, y: u.y, lado: u.lado, unidade: u.tipo });
  const div = u.base.divide;
  if (div) {
    for (let i = 0; i < div.qtd; i++) {
      const ang = b.rng.entre(0, Math.PI * 2);
      const f = criarUnidade(b, 'v', div.em,
        clamp(u.x + Math.cos(ang) * 4, 4, ARENA.largura - 4), clamp(u.y + Math.sin(ang) * 4, 4, ARENA.altura - 4),
        { geracao: (u.geracao || 0) + 1 });
      f.cd = 0.6; // filhotes demoram um pouco para atacar
    }
    emitir(b, { tipo: 'divisao', x: u.x, y: u.y, em: div.em, qtd: div.qtd });
  }
}

function danoDoGolpe(b, u) {
  let d = u.dano * (u.m.danoMult ?? 1);
  if (u.m.danoPorAliadoMesmaClasse) d *= 1 + u.m.danoPorAliadoMesmaClasse * vivos(b, 'h').filter((o) => o.tipo === u.tipo).length;
  return d * (1 + b.rng.entre(-VARIACAO, VARIACAO));
}

function escolherAlvo(b, u) {
  const inimigos = vivos(b, u.lado === 'h' ? 'v' : 'h');
  if (!inimigos.length) return null;
  if (u.lado === 'v' && u.provocadoPor && b.t < u.provocadoAte && !u.provocadoPor.morto) return u.provocadoPor;
  const area = u.base.habilidades?.find((h) => h.tipo === 'bolaDeFogo');
  if (area && !u.m.semArea) { // piromante mira onde pega mais inimigos
    const raio = area.raio * (u.m.areaMult ?? 1);
    let melhor = null, nota = -1;
    for (const c of inimigos) {
      const n = inimigos.filter((o) => dist(o, c) <= raio).length;
      const s = n * 10 - dist(u, c) * 0.1;
      if (s > nota) { nota = s; melhor = c; }
    }
    return melhor;
  }
  // goblins flanqueiam: preferem heróis frágeis (até ~25 m de desvio)
  const flanco = u.base.comportamento === 'flanqueia' ? 25 : 0;
  let melhor = null, md = Infinity;
  for (const c of inimigos) { const d = dist(u, c) - (flanco && c.pvMax < 100 ? flanco : 0); if (d < md) { md = d; melhor = c; } }
  return melhor;
}

function atacar(b, u, alvo) {
  u.golpes++;
  const hab = u.base.habilidades || [];
  const fogo = hab.find((h) => h.tipo === 'bolaDeFogo');
  if (fogo) {
    const raio = u.m.semArea ? 0 : fogo.raio * (u.m.areaMult ?? 1);
    b.projeteis.push({ x: u.x, y: u.y - 2, alvo, tx: alvo.x, ty: alvo.y, vel: u.base.projetil.velocidade,
      dano: danoDoGolpe(b, u), raio, fonte: u });
    emitir(b, { tipo: 'disparo', fonte: u.id, x: u.x, y: u.y });
    return;
  }
  let d = danoDoGolpe(b, u);
  const firme = hab.find((h) => h.tipo === 'golpeFirme');
  if (firme && u.golpes % firme.aCada === 0) {
    d *= firme.mult;
    const raio = u.m.golpeFirmeRaio || 0;
    if (raio) {
      for (const o of vivos(b, 'v')) if (dist(o, alvo) <= raio) causarDano(b, u, o, d, 'firme', true);
      emitir(b, { tipo: 'giro', x: alvo.x, y: alvo.y, raio });
      return;
    }
    causarDano(b, u, alvo, d, 'firme');
    return;
  }
  causarDano(b, u, alvo, d);
}

function explodir(b, p) {
  const x = p.alvo && !p.alvo.morto ? p.alvo.x : p.tx, y = p.alvo && !p.alvo.morto ? p.alvo.y : p.ty;
  const m = p.fonte.m;
  const alvos = p.raio > 0 ? vivos(b, 'v').filter((o) => Math.hypot(o.x - x, o.y - y) <= p.raio + o.raio)
    : (p.alvo && !p.alvo.morto ? [p.alvo] : []);
  b.stats.acertosArea.push(alvos.length);
  for (const o of alvos) {
    causarDano(b, p.fonte, o, p.dano, 'fogo', p.raio > 0);
    if (m.queimaDps && !o.morto) o.queima = { dps: m.queimaDps, ate: b.t + (m.queimaDur || 3), fonte: p.fonte, acc: 0 };
  }
  emitir(b, { tipo: 'explosao', x, y, raio: p.raio || 2 });
}

function usarConsumiveis(b) {
  if (b.consumiveis.pergaminhoMeteoro && !b.usado.meteoro && b.t >= 1.5) {
    b.usado.meteoro = true;
    const ef = CONSUMIVEIS.pergaminhoMeteoro.efeito;
    const vs = vivos(b, 'v');
    let c = vs[0], mel = -1;
    for (const v of vs) { const n = vs.filter((o) => dist(o, v) <= ef.raio).length; if (n > mel) { mel = n; c = v; } }
    if (c) {
      const x = c.x, y = c.y;
      emitir(b, { tipo: 'meteoro', x, y, raio: ef.raio });
      for (const o of vs) if (Math.hypot(o.x - x, o.y - y) <= ef.raio) causarDano(b, null, o, ef.dano, 'meteoro', true);
    }
  }
  if (b.consumiveis.tonicoCura && !b.usado.tonico) {
    const hs = vivos(b, 'h');
    const pct = hs.reduce((s, h) => s + h.pv / h.pvMax, 0) / Math.max(1, hs.length);
    if (hs.length && pct < 0.5) {
      b.usado.tonico = true;
      const cura = CONSUMIVEIS.tonicoCura.efeito.curaPct;
      for (const h of hs) { const v = Math.round(h.pvMax * cura); h.pv = Math.min(h.pvMax, h.pv + v); emitir(b, { tipo: 'cura', alvo: h.id, valor: v, x: h.x, y: h.y }); }
    }
  }
}

export function passo(b, dt = DT) {
  if (b.fim) return b;
  b.t += dt;
  usarConsumiveis(b);
  const us = b.unidades.filter((u) => !u.morto);
  for (const u of us) {
    if (u.morto || (u.atraso && b.t < u.atraso)) continue;
    // queimadura
    if (u.queima && b.t < u.queima.ate) {
      u.queima.acc += u.queima.dps * dt;
      if (u.queima.acc >= 1) { const v = Math.floor(u.queima.acc); u.queima.acc -= v; causarDano(b, u.queima.fonte, u, v, 'queima'); if (u.morto) continue; }
    }
    // provocação do Guardião
    const prov = u.base.habilidades?.find((h) => h.tipo === 'provocar');
    if (prov) {
      u.provCd -= dt;
      const perto = vivos(b, 'v').filter((o) => dist(o, u) <= prov.raio);
      if (u.provCd <= 0 && perto.length) {
        const dur = prov.duracao + (u.m.provocarDuracaoMais || 0);
        for (const o of perto) { o.provocadoPor = u; o.provocadoAte = b.t + dur; o.alvo = u; }
        u.provCd = prov.recarga;
        emitir(b, { tipo: 'provocar', fonte: u.id, x: u.x, y: u.y, raio: prov.raio });
      }
    }
    // alvo
    u.reAlvo -= dt;
    if (!u.alvo || u.alvo.morto || u.reAlvo <= 0) { u.alvo = escolherAlvo(b, u); u.reAlvo = 0.5; }
    const a = u.alvo;
    if (!a) continue;
    const d = dist(u, a);
    u.cd -= dt;
    if (d <= u.alcance + u.raio + a.raio) {
      if (u.cd <= 0) { atacar(b, u, a); u.cd = u.intervalo * b.rng.entre(0.95, 1.05); }
    } else {
      const k = Math.min(1, (u.vel * dt) / d);
      u.x += (a.x - u.x) * k; u.y += (a.y - u.y) * k;
    }
  }
  // separação simples para não empilhar
  const vs = b.unidades.filter((u) => !u.morto);
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
    const p = vs[i], q = vs[j]; const dx = q.x - p.x, dy = q.y - p.y; const dd = Math.hypot(dx, dy) || 0.01;
    const min = p.raio + q.raio;
    if (dd < min) { const push = (min - dd) / 2; p.x -= (dx / dd) * push; p.y -= (dy / dd) * push; q.x += (dx / dd) * push; q.y += (dy / dd) * push; }
  }
  for (const u of vs) { u.x = clamp(u.x, 2, ARENA.largura - 2); u.y = clamp(u.y, 2, ARENA.altura - 2); }
  // projéteis
  for (const p of b.projeteis) {
    if (p.alvo && !p.alvo.morto) { p.tx = p.alvo.x; p.ty = p.alvo.y; }
    const d = Math.hypot(p.tx - p.x, p.ty - p.y), passoP = p.vel * dt;
    if (d <= passoP) { p.feito = true; explodir(b, p); } else { p.x += ((p.tx - p.x) / d) * passoP; p.y += ((p.ty - p.y) / d) * passoP; }
  }
  b.projeteis = b.projeteis.filter((p) => !p.feito);
  // fim
  const h = vivos(b, 'h').length, v = vivos(b, 'v').length;
  if (!v) b.fim = 'vitoria'; else if (!h) b.fim = 'derrota'; else if (b.t >= TEMPO_MAX) b.fim = 'tempo';
  if (b.fim) emitir(b, { tipo: 'fim', resultado: b.fim });
  return b;
}

// Roda uma batalha inteira e devolve o resumo.
export function simular(cfg) {
  const b = criarBatalha(cfg);
  while (!b.fim) { passo(b); b.eventos.length = 0; }
  const sobreviventes = {}, mortos = {};
  for (const u of b.unidades.filter((x) => x.lado === 'h')) (u.morto ? mortos : sobreviventes)[u.tipo] = ((u.morto ? mortos : sobreviventes)[u.tipo] || 0) + 1;
  const ah = b.stats.acertosArea;
  return { vitoria: b.fim === 'vitoria', fim: b.fim, tempo: +b.t.toFixed(2), sobreviventes, mortos,
    danoPorClasse: b.stats.danoPorClasse, mediaAcertosArea: ah.length ? ah.reduce((s, x) => s + x, 0) / ah.length : 0,
    slimesGerados: b.unidades.filter((u) => u.tipo.startsWith('slime') && u.geracao > 0).length };
}
