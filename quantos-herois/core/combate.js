// Motor de combate: simulação pura (sem tela), passo fixo, determinística por semente.
// A batalha visual (render/) lê `b.unidades`, `b.projeteis` e consome `b.eventos`.
import { HEROIS } from '../data/herois.js';
import { VILOES } from '../data/viloes.js';
import { CONSUMIVEIS } from '../data/consumiveis.js';
import { criarRng } from './rng.js';
import { modsPorClasse } from './efeitos.js';

// Arena DEITADA: heróis à esquerda, monstros à direita.
export const ARENA = { largura: 140, altura: 90 };
// As posições de nascimento são calculadas no layout original (90 x 140, heróis embaixo)
// e transpostas: mesma geometria, então o balanceamento medido continua valendo.
const LADO = 90, PROF = 140;
const deitar = (x, y) => [PROF - y, x];
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
    dano: base.dano, intervalo: base.intervalo * (m.intervaloMult ?? 1), alcance: base.alcance * (m.alcanceMult ?? 1),
    vel: base.velocidade, raio: base.raio,
    cd: b.rng.entre(0.2, base.intervalo), golpes: 0, alvo: null, reAlvo: 0,
    provocadoPor: null, provocadoAte: 0, provCd: 1, queima: null, morto: false,
    base, m, ...extra,
  };
  b.unidades.push(u);
  return u;
}

export function criarBatalha({ herois = {}, inimigos = [], reliquias = [], chaves = {}, consumiveis = {}, semente = 1 }) {
  const b = {
    t: 0, rng: criarRng(semente), mods: modsPorClasse(reliquias, chaves),
    unidades: [], projeteis: [], eventos: [], fim: null,
    consumiveis: { ...consumiveis }, usado: {}, stats: { danoPorClasse: {}, acertosArea: [], porClasse: {} },
  };
  // heróis embaixo: guardiões na frente, guerreiros no meio, piromantes atrás
  const filas = [['guardiao', 108], ['guerreiro', 114], ['arqueiro', 121], ['piromante', 126], ['clerigo', 131]];
  for (const [tipo, y0] of filas) {
    const n = herois[tipo] || 0;
    for (let i = 0; i < n; i++) {
      const col = i % 6, lin = Math.floor(i / 6);
      const x = LADO / 2 + (col - (Math.min(n, 6) - 1) / 2) * 11 + b.rng.entre(-1.5, 1.5);
      criarUnidade(b, 'h', tipo, ...deitar(x, y0 + lin * 5 + b.rng.entre(-1, 1)));
    }
  }
  // inimigos em cima, em bandos
  for (const [tipo, qtd, opc = {}] of inimigos) {
    const cx = tipo === 'reiSlime' ? LADO / 2 : b.rng.entre(20, 70);
    for (let i = 0; i < qtd; i++) {
      // goblins chegam espalhados e em levas; slimes em grupo
      const goblin = tipo === 'goblin';
      const x = goblin ? b.rng.entre(8, LADO - 8) : clamp(cx + b.rng.entre(-18, 18), 6, LADO - 6);
      criarUnidade(b, 'v', tipo, ...deitar(x, tipo === 'reiSlime' ? 20 : b.rng.entre(6, 36)),
        { geracao: 0, atraso: opc.chegada ? b.rng.entre(...opc.chegada) : goblin ? b.rng.entre(0, 3) : 0 });
    }
  }
  for (const u of b.unidades) if (u.lado === 'h') est(b, u.tipo).enviados++;
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
  if (alvo.lado === 'h') { // Muralha: aliados perto de um Guardião com a relíquia recebem menos dano
    const red = b.mods.guardiao?.auraReducao;
    if (red && vivos(b, 'h').some((g) => g.tipo === 'guardiao' && dist(g, alvo) <= (b.mods.guardiao.auraRaio || 12))) v *= 1 - red;
  }
  v = Math.max(1, Math.round(v));
  alvo.pv -= v;
  if (fonte && fonte.lado === 'h') { b.stats.danoPorClasse[fonte.tipo] = (b.stats.danoPorClasse[fonte.tipo] || 0) + v; est(b, fonte.tipo).dano += v; }
  if (alvo.lado === 'h') est(b, alvo.tipo).danoRecebido += v;
  emitir(b, { tipo: 'dano', fonte: fonte ? fonte.id : null, alvo: alvo.id, valor: v, x: alvo.x, y: alvo.y, golpe: tipoGolpe });
  if (emArea && alvo.base.respingo && (alvo.respingos || 0) < alvo.base.respingo.max) {
    // dano em área espalha o slime: solta um filhote extra
    alvo.respingos = (alvo.respingos || 0) + 1;
    const ang = b.rng.entre(0, Math.PI * 2);
    const f = criarUnidade(b, 'v', alvo.base.respingo.em, clamp(alvo.x + Math.cos(ang) * 5, 4, ARENA.largura - 4), clamp(alvo.y + Math.sin(ang) * 5, 4, ARENA.altura - 4), { geracao: 2 });
    f.cd = 0.6; emitir(b, { tipo: 'respingo', x: alvo.x, y: alvo.y });
  }
  if (alvo.pv <= 0) morrer(b, alvo, fonte);
  return v;
}

function est(b, classe) { return (b.stats.porClasse[classe] ||= { enviados: 0, caidos: 0, abates: 0, dano: 0, cura: 0, danoRecebido: 0 }); }
function morrer(b, u, assassino) {
  // Ressurreição Divina: o primeiro herói a cair volta com parte da vida (uma vez por batalha, se houver Clérigo vivo)
  if (u.lado === 'h' && !b.usado.reviver) {
    const cler = vivos(b, 'h').find((h) => h !== u && h.m.reviverUmaVez);
    if (cler) { b.usado.reviver = true; u.pv = Math.round(u.pvMax * cler.m.reviverUmaVez); emitir(b, { tipo: 'cura', fonte: cler.id, alvo: u.id, valor: u.pv, x: u.x, y: u.y, reviveu: true }); return; }
  }
  u.morto = true; u.pv = 0;
  if (u.lado === 'h') est(b, u.tipo).caidos++;
  else if (assassino && assassino.lado === 'h') est(b, assassino.tipo).abates++;
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
  if (u.base.projetil) { // flecha / raio de luz: projétil de alvo único
    const tiro = hab.find((h) => h.tipo === 'tiroCerteiro');
    const certeiro = tiro && u.golpes % Math.max(2, tiro.aCada - (u.m.certeiroMenos || 0)) === 0;
    b.projeteis.push({ x: u.x, y: u.y - 1, alvo, tx: alvo.x, ty: alvo.y, vel: u.base.projetil.velocidade,
      dano: danoDoGolpe(b, u) * (certeiro ? tiro.mult : 1), raio: 0, fonte: u, tipo: u.base.projetil.tipo || 'flecha',
      perfura: certeiro ? tiro.perfura : 0 });
    emitir(b, { tipo: 'disparo', fonte: u.id, x: u.x, y: u.y, projetil: u.base.projetil.tipo || 'flecha' });
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

function acertarProjetil(b, p) {
  // flecha / luz: acerta o alvo; o Tiro Certeiro atravessa e acerta mais inimigos logo atrás
  const golpe = p.tipo === 'luz' ? 'luz' : p.perfura ? 'certeiro' : 'flecha';
  const alvo = p.alvo && !p.alvo.morto ? p.alvo : null;
  if (!alvo) return;
  const x = alvo.x, y = alvo.y;
  causarDano(b, p.fonte, alvo, p.dano, golpe);
  const m = p.fonte.m;
  if (m.queimaDps && !alvo.morto) alvo.queima = { dps: m.queimaDps, ate: b.t + (m.queimaDur || 3), fonte: p.fonte, acc: 0 };
  if (p.perfura) {
    const atras = vivos(b, 'v').filter((o) => o !== alvo && Math.hypot(o.x - x, o.y - y) <= 9)
      .sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y)).slice(0, p.perfura);
    for (const o of atras) causarDano(b, p.fonte, o, p.dano * 0.7, golpe);
  }
}

function explodir(b, p) {
  if (p.tipo) return acertarProjetil(b, p);
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
  if (b.consumiveis.pergaminhoMeteoro && !b.usado.meteoro && (b.t >= 1.5 || b.meteoroAgora)) {
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
    if (hs.length && (pct < 0.5 || b.tonicoAgora)) {
      b.usado.tonico = true;
      const cura = CONSUMIVEIS.tonicoCura.efeito.curaPct;
      for (const h of hs) { const v = Math.round(h.pvMax * cura); h.pv = Math.min(h.pvMax, h.pv + v); est(b, h.tipo).cura += v; emitir(b, { tipo: 'cura', alvo: h.id, valor: v, x: h.x, y: h.y }); }
    }
  }
}

// Consumíveis acionados pelo jogador durante a batalha (botões do HUD).
// Marcar a flag faz o efeito disparar no próximo passo (o tônico cura na hora, sem esperar vida baixa).
export function usarTonico(b) { if (b.fim || b.usado.tonico) return false; b.consumiveis.tonicoCura = true; b.tonicoAgora = true; return true; }
export function usarMeteoro(b) { if (b.fim || b.usado.meteoro) return false; b.consumiveis.pergaminhoMeteoro = true; b.meteoroAgora = true; return true; }

export function passo(b, dt = DT) {
  if (b.fim) return b;
  b.t += dt;
  usarConsumiveis(b);
  const us = b.unidades.filter((u) => !u.morto);
  // Relicário Sagrado: vale para o time todo enquanto houver um Clérigo vivo com a relíquia
  b.regenPct = (us.find((h) => h.lado === 'h' && h.m.regenPct) || {}).m?.regenPct || 0;
  for (const u of us) {
    if (u.morto || (u.atraso && b.t < u.atraso)) continue;
    // queimadura
    if (u.queima && b.t < u.queima.ate) {
      u.queima.acc += u.queima.dps * dt;
      if (u.queima.acc >= 1) { const v = Math.floor(u.queima.acc); u.queima.acc -= v; causarDano(b, u.queima.fonte, u, v, 'queima'); if (u.morto) continue; }
    }
    // provocação do Guardião
    // regeneração (relíquia de família Divina): recupera uma fração da vida por segundo
    if (u.lado === 'h' && b.regenPct && u.pv < u.pvMax) { u.regAcc = (u.regAcc || 0) + u.pvMax * b.regenPct * dt; if (u.regAcc >= 1) { const v = Math.floor(u.regAcc); u.regAcc -= v; u.pv = Math.min(u.pvMax, u.pv + v); } }
    // cura do Clérigo: cura o aliado mais ferido dentro do alcance
    const cur = u.base.habilidades?.find((h) => h.tipo === 'curar');
    if (cur) {
      u.curaCd = (u.curaCd ?? 1) - dt;
      if (u.curaCd <= 0) {
        let alvoCura = null, pior = 0.92;
        for (const h of vivos(b, 'h')) { if (h === u && !cur.siMesmo) continue; const f = h.pv / h.pvMax; if (f < pior && dist(h, u) <= cur.alcance) { pior = f; alvoCura = h; } }
        if (alvoCura) {
          const valor = Math.round(cur.valor * (u.m.curaMult ?? 1));
          // Bênção em Área: a cura também alcança aliados perto do alvo (metade do valor)
          const alvos = [[alvoCura, valor]];
          if (u.m.curaArea) for (const h of vivos(b, 'h')) if (h !== alvoCura && dist(h, alvoCura) <= u.m.curaArea) alvos.push([h, Math.round(valor * 0.5)]);
          for (const [h, val] of alvos) {
            const v = Math.min(h.pvMax - h.pv, val);
            if (v <= 0) continue;
            h.pv += v; est(b, u.tipo).cura += v;
            emitir(b, { tipo: 'cura', fonte: u.id, alvo: h.id, valor: v, x: h.x, y: h.y });
          }
          u.curaCd = cur.recarga;
        } else u.curaCd = 0.3;
      }
    }
    const prov = u.base.habilidades?.find((h) => h.tipo === 'provocar');
    if (prov) {
      u.provCd -= dt;
      const raioProv = prov.raio + (u.m.provocarRaioMais || 0);
      const perto = vivos(b, 'v').filter((o) => dist(o, u) <= raioProv);
      if (u.provCd <= 0 && perto.length) {
        const dur = prov.duracao + (u.m.provocarDuracaoMais || 0);
        for (const o of perto) { o.provocadoPor = u; o.provocadoAte = b.t + dur; o.alvo = u; }
        u.provCd = prov.recarga;
        emitir(b, { tipo: 'provocar', fonte: u.id, x: u.x, y: u.y, raio: raioProv });
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
  // chefes que invocam ondas
  for (const u of b.unidades) {
    const inv = u.base.invoca;
    if (!inv || u.morto) continue;
    u.invT = (u.invT ?? inv.primeiro ?? inv.intervalo) - dt;
    if (u.invT <= 0) {
      u.invT = inv.intervalo;
      for (let i = 0; i < inv.qtd; i++) criarUnidade(b, 'v', inv.tipo, ...deitar(b.rng.entre(8, LADO - 8), b.rng.entre(4, 14)), { geracao: 0, atraso: b.t + b.rng.entre(0, 1.5) });
      emitir(b, { tipo: 'invocar', fonte: u.id, x: u.x, y: u.y, qtd: inv.qtd });
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

// Resumo de uma batalha terminada (usado pelo simulador e pela tela de resultado).
export function resumo(b) {
  const sobreviventes = {}, mortos = {};
  for (const u of b.unidades.filter((x) => x.lado === 'h')) (u.morto ? mortos : sobreviventes)[u.tipo] = ((u.morto ? mortos : sobreviventes)[u.tipo] || 0) + 1;
  const restantes = b.unidades.filter((u) => u.lado === 'v' && !u.morto && !(u.atraso && b.t < u.atraso)).map((u) => u.tipo);
  return { vitoria: b.fim === 'vitoria', fim: b.fim, tempo: +b.t.toFixed(2), sobreviventes, mortos, restantes, porClasse: b.stats.porClasse,
    ouroAbates: b.unidades.filter((u) => u.lado === 'v' && u.morto).reduce((t, u) => t + (u.base.ouro || 0), 0) };
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
    slimesGerados: b.unidades.filter((u) => u.tipo.startsWith('slime') && u.geracao > 0).length,
    ouroAbates: b.unidades.filter((u) => u.lado === 'v' && u.morto).reduce((t, u) => t + (u.base.ouro || 0), 0), porClasse: b.stats.porClasse };
}
