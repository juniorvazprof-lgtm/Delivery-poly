import { passo, DT, ARENA } from '../core/combate.js';
import { desenharUnidade, corDoTipo } from './sprites.js';
import { VILOES } from '../data/viloes.js';
import { ECONOMIA } from '../data/rodadas.js';

// Motor visual da batalha: loop com passo fixo, interpolação, particulas e efeitos.
export function criarVisual(canvas, batalha, opcoes = {}) {
  const cfg = Object.assign({ velocidade: 1, aoFim: null, aoMoeda: null, alvoMoeda: null }, opcoes);
  const ctx = canvas.getContext('2d', { alpha: false });

  // ----- Configurações base -----
  const DPR_MAX = 2;
  let dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
  const arenaL = ARENA.largura;
  const arenaA = ARENA.altura;

  // Reduz movimento
  const prefereSemMovimento = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Escala/offset atuais (recalculados no resize)
  let escala = 1;
  let offsetX = 0;
  let offsetY = 0;
  let larguraPx = 0;
  let alturaPx = 0;

  // ----- Fundo offscreen -----
  let fundoCanvas = null;
  let fundoCtx = null;
  let fundoValido = false;

  // ----- Estado de loop -----
  let rodando = false;
  let pausadoPorOculto = false;
  let pausadoManual = false;
  let velocidade = cfg.velocidade;
  let acumulador = 0;
  let ultimoTempo = 0;
  let rafId = 0;
  let destruido = false;
  let fimAgendado = false;
  let tempoFimAte = 0; // acumular tempo visual até chamar aoFim
  let aoFimChamado = false;
  let esperandoMoedas = false;
  let tempoEsperaMoedas = 0;

  // Tempo visual (usado para animações que não dependem do batalha.t)
  let tVisual = 0;

  // ----- Tremor de tela -----
  let tremorForca = 0;

  // ----- Estado visual por unidade -----
  const estados = new Map();
  const conhecidas = new Set();

  // ----- Rastreio de projéteis para orientação (flechas) -----
  // Guarda última posição vista por objeto de projétil.
  const rastroProj = new WeakMap();

  // ----- Pools de particulas e textos -----
  const MAX_PARTICULAS = 500;
  const MAX_TEXTOS = 80;
  const particulas = [];
  for (let i = 0; i < MAX_PARTICULAS; i++) {
    particulas.push({
      ativo: false,
      x: 0, y: 0, vx: 0, vy: 0,
      vida: 0, vidaMax: 0,
      tam: 1, tamFinal: 1,
      cor: '#fff', corFinal: '#fff',
      tipo: 0,
      gravidade: 0,
      arrasto: 0.9,
      rot: 0, rotVel: 0,
      raioIni: 0, raioFim: 0,
      larguraLinha: 2,
      composite: 'source-over',
    });
  }
  let particulasAtivas = 0;
  function alocarParticula() {
    if (particulasAtivas >= MAX_PARTICULAS) return null;
    for (let i = 0; i < particulas.length; i++) {
      if (!particulas[i].ativo) { particulasAtivas++; return particulas[i]; }
    }
    return null;
  }

  const textos = [];
  for (let i = 0; i < MAX_TEXTOS; i++) {
    textos.push({
      ativo: false,
      x: 0, y: 0, vx: 0, vy: 0,
      vida: 0, vidaMax: 0,
      texto: '', cor: '#fff', tamBase: 10, tam: 10,
      arco: 0,
      fase: 0,
    });
  }
  let textosAtivos = 0;
  function alocarTexto() {
    if (textosAtivos >= MAX_TEXTOS) return null;
    for (let i = 0; i < textos.length; i++) {
      if (!textos[i].ativo) { textosAtivos++; return textos[i]; }
    }
    return null;
  }

  // ----- Pool de moedas -----
  const MAX_MOEDAS = 150;
  const moedas = [];
  for (let i = 0; i < MAX_MOEDAS; i++) {
    moedas.push({
      ativo: false,
      // posição em metros (mundo)
      x: 0, y: 0, vx: 0, vy: 0,
      // estado
      fase: 0, // 0=quique, 1=voo
      t: 0,
      quiques: 0,
      // voo
      vooIniX: 0, vooIniY: 0,
      vooCtrX: 0, vooCtrY: 0,
      vooFimX: 0, vooFimY: 0,
      vooT: 0,
      vooDur: 0.45,
      // visual
      valor: 0,
      rot: 0,
      rotVel: 0,
      brilho: 0,
      squash: 0,
      escalaX: 1,
      // posição em pixels (para desenho final)
      px: 0, py: 0,
    });
  }
  let moedasAtivas = 0;
  function alocarMoeda() {
    if (moedasAtivas >= MAX_MOEDAS) return null;
    for (let i = 0; i < moedas.length; i++) {
      if (!moedas[i].ativo) { moedasAtivas++; return moedas[i]; }
    }
    return null;
  }

  // ----- Tremor -----
  function tremer(forca) {
    if (prefereSemMovimento) return;
    if (forca > tremorForca) tremorForca = forca;
    if (tremorForca > 7) tremorForca = 7;
  }

  // ----- Resize -----
  function redimensionar() {
    const r = canvas.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    larguraPx = r.width;
    alturaPx = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    canvas.width = Math.max(1, Math.round(larguraPx * dpr));
    canvas.height = Math.max(1, Math.round(alturaPx * dpr));
    // Escala mantendo proporção da arena (deitada)
    const escalaX = larguraPx / arenaL;
    const escalaY = alturaPx / arenaA;
    escala = Math.min(escalaX, escalaY);
    const desenhoW = arenaL * escala;
    const desenhoH = arenaA * escala;
    offsetX = (larguraPx - desenhoW) / 2;
    offsetY = (alturaPx - desenhoH) / 2;
    fundoValido = false;
  }

  // ----- Fundo cartunesco (desenhado uma vez em offscreen, em pixels de tela) -----
  function construirFundo() {
    if (fundoValido) return;
    const W = Math.max(1, Math.round(arenaL * escala));
    const H = Math.max(1, Math.round(arenaA * escala));
    if (!fundoCanvas) {
      fundoCanvas = document.createElement('canvas');
      fundoCtx = fundoCanvas.getContext('2d');
    }
    fundoCanvas.width = W;
    fundoCanvas.height = H;
    const f = fundoCtx;

    // base: gradiente horizontal — esquerda (heróis) mais claro, direita (monstros) mais escuro
    const grad = f.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#9ad96f');
    grad.addColorStop(0.45, '#7abf5c');
    grad.addColorStop(0.55, '#4f8f45');
    grad.addColorStop(1, '#2f5a30');
    f.fillStyle = grad;
    f.fillRect(0, 0, W, H);

    // faixa de transição de tom (grama mais escura no topo)
    f.fillStyle = 'rgba(20,60,20,0.22)';
    f.fillRect(0, 0, W, H * 0.22);
    f.fillStyle = 'rgba(255,255,200,0.05)';
    f.fillRect(0, H * 0.78, W, H * 0.22);

    // trilha de terra cruzando da esquerda para a direita
    const trail = f.createLinearGradient(0, 0, W, 0);
    trail.addColorStop(0, '#c39a63');
    trail.addColorStop(0.5, '#a8804d');
    trail.addColorStop(1, '#7a5a34');
    f.strokeStyle = trail;
    f.lineCap = 'round';
    f.lineJoin = 'round';
    f.lineWidth = Math.max(6, H * 0.16);
    f.beginPath();
    f.moveTo(0, H * 0.5);
    f.bezierCurveTo(W * 0.25, H * 0.32, W * 0.55, H * 0.68, W * 0.78, H * 0.5);
    f.bezierCurveTo(W * 0.88, H * 0.42, W * 0.95, H * 0.55, W, H * 0.5);
    f.stroke();
    // pontinhos na trilha
    f.fillStyle = 'rgba(120,80,40,0.35)';
    for (let i = 0; i < 40; i++) {
      const tt = i / 40;
      const px = W * tt;
      const py = H * (0.5 + Math.sin(tt * 6.28) * 0.06 + (Math.random() - 0.5) * 0.12);
      f.beginPath();
      f.arc(px, py, Math.max(1, escala * 0.6 + Math.random() * 1.5), 0, Math.PI * 2);
      f.fill();
    }

    // tufos de grama
    for (let i = 0; i < 160; i++) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      if (Math.abs(py - H * 0.5) < H * 0.1) continue;
      const h = (1 + Math.random() * 2.2) * Math.max(1, escala * 0.5);
      const ladoEscuro = px > W * 0.5;
      f.strokeStyle = ladoEscuro
        ? (Math.random() < 0.5 ? 'rgba(20,50,20,0.8)' : 'rgba(70,120,60,0.8)')
        : (Math.random() < 0.5 ? 'rgba(40,90,40,0.7)' : 'rgba(120,170,80,0.8)');
      f.lineWidth = Math.max(1, escala * 0.15);
      f.beginPath();
      f.moveTo(px, py);
      f.lineTo(px - h * 0.4, py - h);
      f.moveTo(px, py);
      f.lineTo(px + h * 0.3, py - h * 1.1);
      f.stroke();
    }

    // flores
    const coresFlores = ['#ff6b8a', '#ffd447', '#ff8c42', '#f5f0ff'];
    for (let i = 0; i < 40; i++) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      if (Math.abs(py - H * 0.5) < H * 0.1) continue;
      const r = Math.max(1.5, escala * 0.35 + Math.random() * escala * 0.4);
      f.fillStyle = coresFlores[(Math.random() * coresFlores.length) | 0];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        f.beginPath();
        f.arc(px + Math.cos(a) * r, py + Math.sin(a) * r, r * 0.8, 0, Math.PI * 2);
        f.fill();
      }
      f.fillStyle = '#ffde58';
      f.beginPath();
      f.arc(px, py, r * 0.7, 0, Math.PI * 2);
      f.fill();
    }

    // pedrinhas
    for (let i = 0; i < 30; i++) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      if (Math.abs(py - H * 0.5) < H * 0.1) continue;
      const r = Math.max(1.2, escala * 0.3 + Math.random() * escala * 0.5);
      f.fillStyle = '#8b8f96';
      f.strokeStyle = '#3b3f45';
      f.lineWidth = Math.max(1, escala * 0.12);
      f.beginPath();
      f.ellipse(px, py, r, r * 0.75, Math.random() * 3, 0, Math.PI * 2);
      f.fill();
      f.stroke();
    }

    fundoValido = true;
  }

  // ----- Utilitários -----
  function corComAlpha(cor, a) {
    if (cor[0] === '#') {
      const r = parseInt(cor.slice(1, 3), 16);
      const g = parseInt(cor.slice(3, 5), 16);
      const b = parseInt(cor.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    return cor;
  }

  // ----- Estado das unidades -----
  function obterEstado(u) {
    let e = estados.get(u.id);
    if (!e) {
      e = {
        x: u.x, y: u.y,
        prevX: u.x, prevY: u.y,
        flash: 0,
        avanco: 0,
        dir: 1,
        mortoEm: -1,
        nasceuEm: -1,
        poeira: false,
        glow: 0,
        squash: 0,
        squashVel: 0,
      };
      estados.set(u.id, e);
    }
    return e;
  }

  function atualizarDirEstados() {
    for (let i = 0; i < batalha.unidades.length; i++) {
      const u = batalha.unidades[i];
      const e = obterEstado(u);
      if (u.alvo && !u.alvo.morto) {
        e.dir = (u.alvo.x < u.x) ? -1 : 1;
      }
    }
  }

  // ----- Moedas -----
  function criarMoedasDeMorte(x, y, tipo) {
    const dados = VILOES[tipo];
    if (!dados) return;
    const ouro = dados.ouro || 0;
    if (ouro <= 0) return;
    const multAbate = (ECONOMIA && ECONOMIA.multAbate) || 1;
    const total = ouro * multAbate;
    let qtd = Math.round(ouro);
    if (qtd < 1) qtd = 1;
    if (qtd > 8) qtd = 8;
    const valorCada = total / qtd; // total já inclui multAbate
    for (let i = 0; i < qtd; i++) {
      const m = alocarMoeda();
      if (!m) break;
      m.ativo = true;
      m.fase = 0;
      m.t = 0;
      m.quiques = 0;
      m.x = x + (Math.random() - 0.5) * 1.5;
      m.y = y + (Math.random() - 0.5) * 1.0;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = 12 + Math.random() * 10;
      m.vx = Math.cos(ang) * sp;
      m.vy = Math.sin(ang) * sp;
      m.valor = valorCada;
      m.rot = Math.random() * Math.PI * 2;
      m.rotVel = 6 + Math.random() * 6;
      m.brilho = 0;
      m.squash = 0;
      m.escalaX = 1;
      m.vooT = 0;
      m.vooDur = 0.45;
      m.px = 0; m.py = 0;
      // física em metros: (gx, gy) = ponto no chão; h = altura acima do chão
      m.gx = x + (Math.random() - 0.5) * 1.5;
      m.gy = y + (Math.random() - 0.5) * 1.0;
      m.h = 0.6;
      m.vh = 9 + Math.random() * 6;
      m.vx = (Math.random() - 0.5) * 12;
      m.vy = (Math.random() - 0.5) * 6;
    }
  }
  // posição da moeda em pixels CSS (mesmo sistema do alvo do pote)
  function moedaPx(m) { return [offsetX + m.gx * escala, offsetY + (m.gy - m.h) * escala]; }

  function atualizarMoedas(dtV) {
    for (let i = 0; i < moedas.length; i++) {
      const m = moedas[i];
      if (!m.ativo) continue;
      m.t += dtV;
      m.rot += m.rotVel * dtV;
      m.brilho = Math.max(0, m.brilho - dtV * 2);
      if (m.squash > 0) m.squash = Math.max(0, m.squash - dtV * 4);

      if (m.fase === 0) {
        // quique no chão (metros)
        m.vh -= 45 * dtV;
        m.h += m.vh * dtV;
        m.gx += m.vx * dtV; m.gy += m.vy * dtV;
        m.vx *= Math.max(0, 1 - 2.5 * dtV); m.vy *= Math.max(0, 1 - 2.5 * dtV);
        if (m.h < 0) {
          m.h = 0;
          if (m.quiques < 2) { m.vh = -m.vh * 0.45; m.quiques++; m.squash = 1; m.brilho = 1; }
          else m.vh = 0;
        }
        // após ~0.7 s, começa o voo
        if (m.t >= 0.7) {
          const alvo = (typeof cfg.alvoMoeda === 'function') ? cfg.alvoMoeda() : null;
          if (alvo) {
            m.fase = 1;
            m.vooT = 0;
            [m.vooIniX, m.vooIniY] = moedaPx(m);
            m.vooFimX = alvo.x;
            m.vooFimY = alvo.y;
            // ponto de controle: acima do meio
            m.vooCtrX = (m.vooIniX + m.vooFimX) / 2 + (Math.random() - 0.5) * 20;
            m.vooCtrY = Math.min(m.vooIniY, m.vooFimY) - 30 - Math.random() * 20;
            m.vooDur = 0.45;
          } else {
            // sem alvo: some
            m.ativo = false;
            moedasAtivas--;
          }
        }
      } else {
        // voo em curva de Bézier até o alvo (em pixels)
        m.vooT += dtV;
        const k = Math.min(1, m.vooT / m.vooDur);
        // acelera no final
        const kk = k * k * (3 - 2 * k);
        const u = 1 - kk;
        const bx = u * u * m.vooIniX + 2 * u * kk * m.vooCtrX + kk * kk * m.vooFimX;
        const by = u * u * m.vooIniY + 2 * u * kk * m.vooCtrY + kk * kk * m.vooFimY;
        m.px = bx;
        m.py = by;
        if (k >= 1) {
          // chegou
          if (typeof cfg.aoMoeda === 'function') {
            try { cfg.aoMoeda(m.valor); } catch (err) { console.error(err); }
          }
          // brilhinho
          for (let j = 0; j < 4; j++) {
            const p = alocarParticula();
            if (!p) break;
            const ang = Math.random() * Math.PI * 2;
            iniciarParticula(p, m.px, m.py, Math.cos(ang) * 8, Math.sin(ang) * 8 - 4,
              0.3, 0.8, 0.1, '#ffe066', 0, 30);
          }
          m.ativo = false;
          moedasAtivas--;
        }
      }
    }
  }

  // ----- Entrada de eventos (por passo) -----
  function processarEventos() {
    const evs = batalha.eventos;
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i];
      switch (ev.tipo) {
        case 'dano': {
          const e = estados.get(ev.alvo);
          if (e) e.flash = 0.15;
          if (ev.fonte != null) {
            const ef = estados.get(ev.fonte);
            if (ef) ef.avanco = Math.min(1, ef.avanco + 0.9);
          }
          const tx = ev.x != null ? ev.x : (e ? e.x : 45);
          const ty = ev.y != null ? ev.y : (e ? e.y : 70);
          let txt = '' + Math.round(ev.valor);
          let cor = '#ffffff';
          let tam = 3.4;
          let arco = 0;
          let pop = false;
          switch (ev.golpe) {
            case 'golpe': cor = '#ffffff'; tam = 3.2; break;
            case 'firme': cor = '#ffe14d'; tam = 4.8; txt = txt + '!'; pop = true; tremer(1.2); break;
            case 'fogo': cor = '#ff8c1a'; tam = 3.8; break;
            case 'queima': cor = '#ff9a3c'; tam = 2.4; break;
            case 'meteoro': cor = '#ff3b30'; tam = 5.6; pop = true; break;
            case 'flecha': cor = '#ffffff'; tam = 2.6; break;
            case 'certeiro': cor = '#ffe14d'; tam = 4.8; txt = txt + '!'; pop = true; tremer(1.2); break;
            case 'luz': cor = '#ffe9a8'; tam = 2.8; break;
          }
          criarTexto(tx, ty - 4, txt, cor, tam, pop);
          for (let k = 0; k < 4; k++) {
            const p = alocarParticula();
            if (!p) break;
            const ang = Math.random() * Math.PI * 2;
            const sp = 8 + Math.random() * 22;
            iniciarParticula(p, tx, ty, Math.cos(ang) * sp, Math.sin(ang) * sp - 8,
              0.25 + Math.random() * 0.15, 0.7 + Math.random() * 0.6, 0.6, corPosImpacto(ev.golpe), 0, 60);
          }
          break;
        }
        case 'cura': {
          const e = estados.get(ev.alvo);
          const tx = ev.x != null ? ev.x : (e ? e.x : 45);
          const ty = ev.y != null ? ev.y : (e ? e.y : 70);
          criarTexto(tx, ty - 4, '+' + Math.round(ev.valor), '#6eff7a', 3.6, false);
          // raio de luz dourada curvo do clérigo até o alvo
          if (ev.fonte != null) {
            const ef = estados.get(ev.fonte);
            if (ef) {
              const fx = ef.x, fy = ef.y;
              const mx = (fx + tx) / 2;
              const my = Math.min(fy, ty) - 6 - Math.random() * 3;
              const p = alocarParticula();
              if (p) {
                iniciarParticula(p, fx, fy, 0, 0, 0.25, 1, 1, '#ffe9a8', 0, 0, 7);
                p.raioIni = 0; p.raioFim = 0;
                p.rot = 0; p.rotVel = 0;
                // guarda pontos da curva nos campos disponíveis
                p.x = fx; p.y = fy;
                p.vx = mx; p.vy = my;
                p.tam = tx; p.tamFinal = ty;
              }
            }
          }
          // partículas "+" verdes subindo do alvo
          for (let k = 0; k < 5; k++) {
            const p = alocarParticula();
            if (!p) break;
            const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            iniciarParticula(p, tx + (Math.random() - 0.5) * 2, ty, Math.cos(ang) * 6, Math.sin(ang) * 14,
              0.4 + Math.random() * 0.2, 0.8, 0.3, '#6eff7a', -20, 20, 8);
          }
          break;
        }
        case 'morte': {
          const e = estados.get(ev.alvo);
          const tipo = ev.unidade || 'guerreiro'; // no evento, unidade = tipo (texto)
          const cor = corDoTipo(tipo) || '#ff5b5b';
          if (e) {
            e.mortoEm = tVisual;
            e.flash = 0.2;
          }
          const x = ev.x, y = ev.y;
          const ehSlime = tipo && tipo.indexOf('slime') >= 0;
          const qtd = ehSlime ? 16 : 12;
          for (let k = 0; k < qtd; k++) {
            const p = alocarParticula();
            if (!p) break;
            const ang = Math.random() * Math.PI * 2;
            const sp = 10 + Math.random() * 30;
            iniciarParticula(p, x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 12,
              0.4 + Math.random() * 0.3, ehSlime ? 1.4 : 1.0 + Math.random() * 0.8, 0.4,
              ehSlime ? (Math.random() < 0.5 ? '#7fe08a' : '#c9ff8a') : cor, ehSlime ? 120 : 40, 220);
          }
          for (let k = 0; k < 3; k++) {
            const p = alocarParticula();
            if (!p) break;
            const ang = Math.random() * Math.PI * 2;
            iniciarParticula(p, x, y, Math.cos(ang) * 10, Math.sin(ang) * 10 - 15,
              0.5, 1.0, 0.3, '#fff6a0', 0, 320, 1);
          }
          // moedas para mortes de vilões
          if (ev.lado === 'v') { // no evento, unidade = tipo (texto) e lado vem em ev.lado
            criarMoedasDeMorte(x, y, tipo);
          }
          break;
        }
        case 'divisao':
        case 'respingo': {
          const qtd = ev.qtd || 4;
          for (let k = 0; k < qtd + 3; k++) {
            const p = alocarParticula();
            if (!p) break;
            const ang = Math.random() * Math.PI * 2;
            const sp = 15 + Math.random() * 30;
            iniciarParticula(p, ev.x, ev.y, Math.cos(ang) * sp, Math.sin(ang) * sp - 20,
              0.4 + Math.random() * 0.25, 1.3 + Math.random() * 0.8, 0.4,
              Math.random() < 0.5 ? '#a8ff7a' : '#7fe08a', 160, 250, 5);
          }
          break;
        }
        case 'disparo': {
          const e = estados.get(ev.fonte);
          if (e) { e.avanco = Math.min(1, e.avanco + 0.8); }
          // brilho de cajado apenas para bola de fogo (sem tipo)
          if (!ev.projetil) {
            if (e) e.glow = 0.18;
            for (let k = 0; k < 3; k++) {
              const p = alocarParticula();
              if (!p) break;
              const ang = Math.random() * Math.PI * 2;
              iniciarParticula(p, ev.x, ev.y, Math.cos(ang) * 6, Math.sin(ang) * 6 - 5,
                0.2, 0.6, 0, '#ffcc66', 0, 20);
            }
          } else if (ev.projetil === 'flecha') {
            // "twang" visual: 2 linhas curtas atrás do arqueiro
            if (e) {
              const dir = e.dir || 1;
              const bx = e.x - dir * 0.6;
              const by = e.y - 0.4;
              for (let k = 0; k < 2; k++) {
                const p = alocarParticula();
                if (!p) break;
                iniciarParticula(p, bx + (Math.random() - 0.5) * 0.3, by + (Math.random() - 0.5) * 0.3,
                  -dir * (10 + Math.random() * 6), (Math.random() - 0.5) * 4,
                  0.18, 0.5, 0.05, '#f5e6c8', 0, 40, 9);
              }
            }
          } else if (ev.projetil === 'luz') {
            // pequeno flash dourado na fonte
            for (let k = 0; k < 3; k++) {
              const p = alocarParticula();
              if (!p) break;
              const ang = Math.random() * Math.PI * 2;
              iniciarParticula(p, ev.x, ev.y, Math.cos(ang) * 5, Math.sin(ang) * 5 - 4,
                0.22, 0.7, 0.05, '#ffe9a8', 0, 20);
            }
          }
          break;
        }
        case 'explosao': {
          efeitoExplosao(ev.x, ev.y, ev.raio || 10, 1.0);
          break;
        }
        case 'giro': {
          efeitoGiro(ev.x, ev.y, ev.raio || 8);
          break;
        }
        case 'provocar': {
          efeitoProvocar(ev.x, ev.y, ev.raio || 10);
          break;
        }
        case 'meteoro': {
          efeitoMeteoro(ev.x, ev.y, ev.raio || 12);
          tremer(5);
          break;
        }
        case 'invocar': {
          efeitoInvocar(ev.x, ev.y);
          break;
        }
        case 'fim': {
          break;
        }
      }
    }
    evs.length = 0;
  }

  function corPosImpacto(golpe) {
    switch (golpe) {
      case 'fogo': return '#ff9a3c';
      case 'queima': return '#ffb347';
      case 'firme': return '#ffe14d';
      case 'meteoro': return '#ff5b3b';
      case 'flecha': return '#f5e6c8';
      case 'certeiro': return '#ffe14d';
      case 'luz': return '#ffe9a8';
      default: return '#ffffff';
    }
  }

  // ----- Inicialización de particulas -----
  function iniciarParticula(p, x, y, vx, vy, vida, tam, tamFinal, cor, grav, arrasto, tipo) {
    p.ativo = true;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.vida = vida; p.vidaMax = vida;
    p.tam = tam; p.tamFinal = tamFinal === undefined ? 0 : tamFinal;
    p.cor = cor; p.corFinal = cor;
    p.gravidade = grav || 0;
    p.arrasto = arrasto || 0;
    p.tipo = tipo || 0;
    p.rot = Math.random() * Math.PI * 2;
    p.rotVel = (Math.random() - 0.5) * 12;
    p.raioIni = 0; p.raioFim = 0;
    p.larguraLinha = 2;
    p.composite = 'source-over';
    return p;
  }

  function iniciarAnel(x, y, raioFim, cor, vida, largura) {
    const p = alocarParticula();
    if (!p) return;
    iniciarParticula(p, x, y, 0, 0, vida, 0, 0, cor, 0, 0, 3);
    p.raioIni = 0.5; p.raioFim = raioFim;
    p.larguraLinha = largura || 3;
    p.tam = 1;
  }

  function iniciarArco(x, y, raio, cor, vida) {
    const p = alocarParticula();
    if (!p) return;
    iniciarParticula(p, x, y, 0, 0, vida, raio, raio, cor, 0, 0, 6);
    p.rotVel = 22;
  }

  // ----- Efeitos compostos -----
  function efeitoExplosao(x, y, raio, forca) {
    iniciarAnel(x, y, raio, '#ffd06a', 0.35, 3);
    iniciarAnel(x, y, raio * 0.7, '#ff8c3c', 0.3, 2);
    for (let k = 0; k < 18; k++) {
      const p = alocarParticula();
      if (!p) break;
      const ang = Math.random() * Math.PI * 2;
      const sp = 15 + Math.random() * 40;
      iniciarParticula(p, x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 8,
        0.3 + Math.random() * 0.35, 1.0 + Math.random() * 1.4, 0.2,
        Math.random() < 0.5 ? '#ff6a1a' : '#ffcc33', 30, 40);
    }
    for (let k = 0; k < 8; k++) {
      const p = alocarParticula();
      if (!p) break;
      const ang = Math.random() * Math.PI * 2;
      const sp = 6 + Math.random() * 14;
      iniciarParticula(p, x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 6,
        0.6 + Math.random() * 0.3, 1.6 + Math.random() * 1.5, 3.0,
        'rgba(90,90,90,0.6)', -5, 30, 2);
    }
    tremer(2.5 * forca);
  }

  function efeitoGiro(x, y, raio) {
    iniciarArco(x, y, raio, '#ffffff', 0.35);
    iniciarArco(x, y, raio * 0.7, 'rgba(255,255,255,0.7)', 0.3);
    for (let k = 0; k < 6; k++) {
      const p = alocarParticula();
      if (!p) break;
      const a = (k / 6) * Math.PI * 2;
      iniciarParticula(p, x + Math.cos(a) * raio * 0.7, y + Math.sin(a) * raio * 0.4,
        Math.cos(a + Math.PI / 2) * 20, Math.sin(a + Math.PI / 2) * 8,
        0.3, 0.8, 0.2, '#ffffff', 0, 30, 4);
    }
  }

  function efeitoProvocar(x, y, raio) {
    iniciarAnel(x, y, raio, '#ffe14d', 0.55, 4);
    iniciarAnel(x, y, raio * 0.7, 'rgba(255,235,120,0.8)', 0.45, 2);
    const txt = alocarTexto();
    if (txt) {
      txt.ativo = true; textosAtivos++;
      txt.x = x; txt.y = y - 8; txt.vx = 0; txt.vy = -6;
      txt.vida = 0.6; txt.vidaMax= 0.6;
      txt.texto = '!'; txt.cor = '#ffe14d'; txt.tamBase = 12; txt.tam = 12;
      txt.arco = 0; txt.fase = 0;
    }
  }

  function efeitoMeteoro(x, y, raio) {
    iniciarAnel(x, y, raio, 'rgba(255,60,40,0.9)', 0.5, 4);
    iniciarAnel(x, y, raio * 0.6, 'rgba(255,200,60,0.9)', 0.4, 3);
    for (let k = 0; k < 24; k++) {
      const p = alocarParticula();
      if (!p) break;
      const ang = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 55;
      iniciarParticula(p, x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 15,
        0.4 + Math.random() * 0.4, 1.4 + Math.random() * 1.8, 0.2,
        Math.random() < 0.5 ? '#ff3b30' : '#ffb347', 40, 40);
    }
    for (let k = 0; k < 10; k++) {
      const p = alocarParticula();
      if (!p) break;
      const ang = Math.random() * Math.PI * 2;
      const sp = 8 + Math.random() * 20;
      iniciarParticula(p, x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 10,
        0.7 + Math.random() * 0.4, 2.0 + Math.random() * 2.0, 4.0,
        'rgba(80,70,70,0.55)', -4, 25, 2);
    }
  }

  function efeitoInvocar(x, y) {
    for (let k = 0; k < 3; k++) {
      iniciarAnel(x, y, 5 + k * 2, 'rgba(160,80,220,0.8)', 0.5, 2);
    }
    for (let k = 0; k < 14; k++) {
      const p = alocarParticula();
      if (!p) break;
      const ang = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 3;
      iniciarParticula(p, x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.6,
        Math.cos(ang + Math.PI / 2) * 14, -10 - Math.random() * 15,
        0.5 + Math.random() * 0.3, 1.2, 0.2,
        Math.random() < 0.5 ? '#c07cff' : '#8a4dff', -10, 30);
    }
    const txt = alocarTexto();
    if (txt) {
      txt.ativo = true; textosAtivos++;
      txt.x = x; txt.y = y - 10; txt.vx = 0; txt.vy = -5;
      txt.vida = 1.1; txt.vidaMax = 1.1;
      txt.texto = 'Chamou reforços!'; txt.cor = '#e6c8ff'; txt.tamBase = 4.5; txt.tam = 4.5;
      txt.arco = 0; txt.fase = 0;
    }
  }

  function criarTexto(x, y, txt, cor, tam, pop) {
    const t = alocarTexto();
    if (!t) return;
    t.ativo = true; textosAtivos++;
    t.x = x;
    t.y = y;
    t.vx = (Math.random() - 0.5) * 6;
    t.vy = -14 - Math.random() * 4;
    t.vida = 0.75;
    t.vidaMax = 0.75;
    t.texto = txt;
    t.cor = cor;
    t.tamBase = tam;
    t.tam = pop ? tam * 1.6 : tam;
    t.arco = (Math.random() - 0.5) * 4;
    t.fase = 0;
  }

  // ----- Atualização de particulas/textos (delta visual em segundos) -----
  function atualizarEfeitos(dtV) {
    for (let i = 0; i < particulas.length; i++) {
      const p = particulas[i];
      if (!p.ativo) continue;
      p.vida -= dtV;
      if (p.vida <= 0) { p.ativo = false; particulasAtivas--; continue; }
      p.vy += p.gravidade * dtV;
      if (p.arrasto) {
        const f = Math.pow(1 - Math.min(0.99, p.arrasto / 100), dtV * 60);
        p.vx *= f;
        p.vy *= f;
      }
      p.x += p.vx * dtV;
      p.y += p.vy * dtV;
      p.rot += p.rotVel * dtV;
    }
    for (let i = 0; i < textos.length; i++) {
      const t = textos[i];
      if (!t.ativo) continue;
      t.vida -= dtV;
      if (t.vida <= 0) { t.ativo = false; textosAtivos--; continue; }
      t.x += t.vx * dtV;
      t.y += t.vy * dtV;
      t.vy += 18 * dtV;
      t.vx *= Math.pow(0.9, dtV * 60);
      t.x += Math.sin((1 - t.vida / t.vidaMax) * Math.PI) * t.arco * dtV;
      if (t.vida > t.vidaMax - 0.08) {
        const k = (t.vidaMax - t.vida) / 0.08;
        t.tam = t.tamBase * (1.6 - 0.6 * k);
      } else {
        t.tam += (t.tamBase - t.tam) * Math.min(1, dtV * 12);
      }
    }
    for (const u of batalha.unidades) {
      const e = estados.get(u.id);
      if (!e) continue;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dtV);
      if (e.avanco > 0) e.avanco = Math.max(0, e.avanco - dtV / 0.2);
      if (e.glow > 0) e.glow = Math.max(0, e.glow - dtV);
      const vel = Math.hypot(e.x - e.prevX, e.y - e.prevY);
      if (u.morto) {
        e.squash += (1.3 - e.squash) * Math.min(1, dtV * 6);
      } else if (vel > 0.1) {
        e.squash = Math.sin(tVisual * 14 + u.id * 0.7) * 0.08;
      } else {
        e.squash += (0 - e.squash) * Math.min(1, dtV * 6);
      }
    }
  }

  // ----- Desenho -----
  function desenhar() {
    if (larguraPx < 1 || alturaPx < 1) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2f5a30';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let sx = 0, sy = 0;
    if (tremorForca > 0.05 && !prefereSemMovimento) {
      sx = (Math.random() * 2 - 1) * tremorForca * dpr;
      sy = (Math.random() * 2 - 1) * tremorForca * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.translate(offsetX + sx / dpr, offsetY + sy / dpr);

    construirFundo();
    if (fundoCanvas) {
      ctx.drawImage(fundoCanvas, 0, 0, arenaL * escala, arenaA * escala);
    }

    ctx.scale(escala, escala);

    desenharProjeteis();

    const visiveis = [];
    for (let i = 0; i < batalha.unidades.length; i++) {
      const u = batalha.unidades[i];
      if (batalha.t < u.atraso) continue;
      visiveis.push(u);
    }
    visiveis.sort((a, b) => a.y - b.y);

    for (let i = 0; i < visiveis.length; i++) {
      desenharUnidadeVisual(visiveis[i]);
    }

    desenharParticulas();
    desenharTextos();

    ctx.restore();

    // Moedas desenhadas em pixels (por cima de tudo)
    desenharMoedas();

    if (tremorForca > 0) {
      tremorForca *= Math.pow(0.001, 1 / 60);
      if (tremorForca < 0.05) tremorForca = 0;
    }
  }

  function desenharProjeteis() {
    const projs = batalha.projeteis;
    if (!projs || projs.length === 0) return;
    ctx.save();
    for (let i = 0; i < projs.length; i++) {
      const p = projs[i];
      if (p.tipo === 'flecha') {
        desenharFlecha(p);
      } else if (p.tipo === 'luz') {
        desenharLuz(p);
      } else {
        // bola de fogo (comportamento original)
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 2.4);
        g.addColorStop(0, 'rgba(255,220,120,0.9)');
        g.addColorStop(0.5, 'rgba(255,140,40,0.55)');
        g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ff8c1a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3a1a00';
        ctx.lineWidth = 1.5 / escala;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 2; k++) {
          const pt = alocarParticula();
          if (!pt) break;
          iniciarParticula(pt,
            p.x + (Math.random() - 0.5) * 0.6,
            p.y + (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            0.28, 0.9, 0.05,
            Math.random() < 0.5 ? '#ffb347' : '#ffe066', 0, 20);
        }
      }
    }
    ctx.restore();
  }

  // Desenha uma flecha orientada na direção do movimento
  function desenharFlecha(p) {
    const ant = rastroProj.get(p);
    let ang = 0;
    if (ant) {
      const dx = p.x - ant.x;
      const dy = p.y - ant.y;
      if (dx * dx + dy * dy > 1e-6) ang = Math.atan2(dy, dx);
      else if (ant.ang !== undefined) ang = ant.ang;
    } else if (p.vx !== undefined || p.vy !== undefined) {
      const vx = p.vx || 0, vy = p.vy || 0;
      if (vx * vx + vy * vy > 1e-6) ang = Math.atan2(vy, vx);
    }
    rastroProj.set(p, { x: p.x, y: p.y, ang });

    const perfura = (p.perfura || 0) > 0;
    const comp = 3.0; // comprimento em metros
    const meia = comp / 2;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);

    // rastro brilhante para flecha perfurante
    if (perfura) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(-meia - 2, 0, meia, 0);
      g.addColorStop(0, 'rgba(255,220,120,0)');
      g.addColorStop(0.6, 'rgba(255,220,120,0.55)');
      g.addColorStop(1, 'rgba(255,240,180,0.9)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-meia - 2, -0.35);
      ctx.lineTo(meia, 0);
      ctx.lineTo(-meia - 2, 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // haste de madeira
    ctx.strokeStyle = perfura ? '#c9a24a' : '#8a5a2b';
    ctx.lineWidth = 0.28;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-meia, 0);
    ctx.lineTo(meia - 0.5, 0);
    ctx.stroke();

    // ponta metálica
    ctx.fillStyle = perfura ? '#fff2a8' : '#d9dde3';
    ctx.strokeStyle = perfura ? '#a07a20' : '#5a5f66';
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(meia, 0);
    ctx.lineTo(meia - 0.7, -0.32);
    ctx.lineTo(meia - 0.7, 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // penas na traseira
    ctx.fillStyle = perfura ? '#ffe066' : '#e8e2d0';
    ctx.strokeStyle = perfura ? '#a07a20' : '#8a8470';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(-meia, 0);
    ctx.lineTo(-meia + 0.7, -0.45);
    ctx.lineTo(-meia + 0.55, 0);
    ctx.lineTo(-meia + 0.7, 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // rastro de faíscas douradas para flecha perfurante
    if (perfura) {
      for (let k = 0; k < 2; k++) {
        const pt = alocarParticula();
        if (!pt) break;
        iniciarParticula(pt,
          p.x - Math.cos(ang) * meia + (Math.random() - 0.5) * 0.4,
          p.y - Math.sin(ang) * meia + (Math.random() - 0.5) * 0.4,
          -Math.cos(ang) * (4 + Math.random() * 4) + (Math.random() - 0.5) * 3,
          -Math.sin(ang) * (4 + Math.random() * 4) + (Math.random() - 0.5) * 3,
          0.25, 0.7, 0.05, '#ffe066', 0, 30);
      }
    }
  }

  // Desenha uma esfera de luz dourada-clara com halo e faíscas
  function desenharLuz(p) {
    const raio = 0.7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, raio * 3.2);
    g.addColorStop(0, 'rgba(255,245,200,0.95)');
    g.addColorStop(0.35, 'rgba(255,225,140,0.6)');
    g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, raio * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff6d0';
    ctx.beginPath();
    ctx.arc(p.x, p.y, raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,140,40,0.8)';
    ctx.lineWidth = 1.2 / escala;
    ctx.beginPath();
    ctx.arc(p.x, p.y, raio, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // rastro de faíscas douradas
    for (let k = 0; k < 2; k++) {
      const pt = alocarParticula();
      if (!pt) break;
      iniciarParticula(pt,
        p.x + (Math.random() - 0.5) * 0.6,
        p.y + (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4 - 2,
        0.3, 0.6, 0.05,
        Math.random() < 0.5 ? '#ffe9a8' : '#fff6d0', 0, 20);
    }
  }

  function desenharUnidadeVisual(u) {
    const e = estados.get(u.id);
    if (!e) return;

    const alpha = Math.min(1, acumulador / DT);
    const ix = e.prevX + (e.x - e.prevX) * alpha;
    const iy = e.prevY + (e.y - e.prevY) * alpha;

    let escalaMorte = 1;
    let alphaMorte = 1;
    if (u.morto) {
      if (e.mortoEm < 0) e.mortoEm = tVisual;
      const dt = tVisual - e.mortoEm;
      if (dt > 0.4) return;
      const k = dt / 0.4;
      escalaMorte = 1 + k * 0.3;
      alphaMorte = 1 - k;
    }

    let escalaPop = 1;
    if (e.nasceuEm < 0) e.nasceuEm = tVisual;
    const dtNasc = tVisual - e.nasceuEm;
    if (dtNasc < 0.2) {
      const k = dtNasc / 0.2;
      escalaPop = k < 0.7 ? (k / 0.7) * 1.15 : 1.15 - ((k - 0.7) / 0.3) * 0.15;
      if (!e.poeira) {
        e.poeira = true;
        for (let i = 0; i < 6; i++) {
          const p = alocarParticula();
          if (!p) break;
          const ang = Math.random() * Math.PI * 2;
          iniciarParticula(p, ix, iy + 0.5, Math.cos(ang) * 6, Math.sin(ang) * 3 - 2,
            0.35, 1.0, 0.2, 'rgba(200,180,140,0.8)', 10, 30, 2);
        }
      }
    }

    const avancoY = -e.avanco * 0.6;
    const flash = e.flash > 0;
    const provocado = u.provocadoAte && batalha.t < u.provocadoAte;
    const queimando = u.queima && batalha.t < u.queima.ate;

    ctx.save();
    ctx.globalAlpha = alphaMorte;
    ctx.translate(ix, iy + avancoY);
    ctx.scale(escalaPop * escalaMorte, escalaPop * escalaMorte);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, u.raio * 0.9, u.raio * 0.9, u.raio * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    if (provocado) {
      ctx.strokeStyle = 'rgba(255,225,80,0.7)';
      ctx.lineWidth = 2 / escala;
      ctx.beginPath();
      ctx.arc(0, 0, u.raio * 1.3 + Math.sin(tVisual * 8) * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (queimando) {
      for (let i = 0; i < 3; i++) {
        const p = alocarParticula();
        if (!p) break;
        const ang = Math.random() * Math.PI * 2;
        iniciarParticula(p, ix + Math.cos(ang) * u.raio * 0.6, iy + Math.sin(ang) * u.raio * 0.4,
          (Math.random() - 0.5) * 4, -8 - Math.random() * 6,
          0.3, 0.6, 0.1, Math.random() < 0.5 ? '#ff8c1a' : '#ffcc33', -10, 20);
      }
    }

    if (e.glow > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, -u.raio * 0.5, 0, 0, -u.raio * 0.5, u.raio * 2);
      g.addColorStop(0, `rgba(255,200,80,${e.glow * 4})`);
      g.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -u.raio * 0.5, u.raio * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const squash = (u.tipo && u.tipo.indexOf('slime') >= 0) ? e.squash : 0;
    ctx.scale(1 / escala, 1 / escala);
    desenharUnidade(ctx, u, {
      dir: e.dir || 1,
      flash: Math.max(0, Math.min(1, e.flash || 0)),
      avanco: Math.max(0, Math.min(1, e.avanco || 0)),
      squash,
      provocado: !!provocado,
      queimando: !!queimando,
      morto: u.morto ? 1 - alphaMorte : 0,
      t: tVisual,
    }, escala);

    ctx.restore();

    if (!u.morto && u.pv < u.pvMax && u.pv > 0) {
      const bw = Math.max(22 / escala, u.raio * 2.2);
      const bh = 4 / escala;
      const bx = ix - bw / 2;
      const by = iy - (2.6 * u.raio * 1.7) - bh - 2 / escala;
      const frac = Math.max(0, u.pv / u.pvMax);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 1 / escala, by - 1 / escala, bw + 2 / escala, bh + 2 / escala);
      ctx.fillStyle = u.lado === 'h' ? '#3ee0ff' : '#ff4d4d';
      ctx.fillRect(bx, by, bw * frac, bh);
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 1 / escala;
      ctx.strokeRect(bx, by, bw, bh);
    }
  }

  function desenharParticulas() {
    ctx.save();
    for (let i = 0; i < particulas.length; i++) {
      const p = particulas[i];
      if (!p.ativo) continue;
      const k = p.vida / p.vidaMax;
      const a = k < 0.3 ? k / 0.3 : 1;
      const tam = p.tam + (p.tamFinal - p.tam) * (1 - k);

      if (p.tipo === 3) {
        const r = p.raioIni + (p.raioFim - p.raioIni) * (1 - k);
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = (p.larguraLinha * k) / escala;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.tipo === 6) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = 2 / escala;
        ctx.beginPath();
        ctx.arc(p.x, p.y, tam, p.rot, p.rot + Math.PI * 1.2);
        ctx.stroke();
      } else if (p.tipo === 7) {
        // raio de luz dourada curvo (cura)
        const kk = 1 - k;
        const x0 = p.x, y0 = p.y;
        const cx = p.vx, cy = p.vy;
        const x1 = p.tam, y1 = p.tamFinal;
        ctx.globalAlpha = a * 0.9;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = (3 * k) / escala;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,220,0.9)';
        ctx.lineWidth = (1.2 * k) / escala;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.tipo === 8) {
        // partícula "+" verde subindo
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = (1.6 * k) / escala;
        ctx.lineCap = 'round';
        const s = tam * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y);
        ctx.lineTo(p.x + s, p.y);
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x, p.y + s);
        ctx.stroke();
      } else if (p.tipo === 9) {
        // "twang" — linha curta atrás do arqueiro
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = (1.4 * k) / escala;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.04, p.y + p.vy * 0.04);
        ctx.stroke();
      } else if (p.tipo === 1) {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.cor;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        desenharEstrela(ctx, tam);
        ctx.restore();
      } else if (p.tipo === 2) {
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, tam, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.tipo === 5) {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, tam * 0.7, tam, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, tam, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function desenharEstrela(c, r) {
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a2 = a1 + Math.PI / 5;
      c.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      c.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
    }
    c.closePath();
    c.fill();
  }

  function desenharTextos() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = 0; i < textos.length; i++) {
      const t = textos[i];
      if (!t.ativo) continue;
      const k = t.vida / t.vidaMax;
      const a = k < 0.3 ? k / 0.3 : 1;
      ctx.globalAlpha = a;
      const tamTela = Math.max(t.tam, 13 / escala);
      ctx.font = `900 ${tamTela}px system-ui, sans-serif`;
      ctx.lineWidth = 3 / escala;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(t.texto, t.x, t.y);
      ctx.fillStyle = t.cor;
      ctx.fillText(t.texto, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ----- Desenho de moedas (em pixels, por cima de tudo) -----
  function desenharMoedas() {
    if (moedasAtivas === 0) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < moedas.length; i++) {
      const m = moedas[i];
      if (!m.ativo) continue;
      let px, py;
      if (m.fase === 1) {
        px = m.px;
        py = m.py;
      } else {
        [px, py] = moedaPx(m);
      }
      // brilho
      if (m.brilho > 0) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(px, py, 0, px, py, 14);
        g.addColorStop(0, `rgba(255,240,150,${m.brilho * 0.8})`);
        g.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      // escala X oscilando (efeito de moeda girando)
      const escalaX = Math.abs(Math.cos(m.rot));
      const escalaY = 1 + m.squash * 0.4;
      const raio = 9;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(Math.max(0.15, escalaX), escalaY);
      // corpo dourado
      ctx.fillStyle = '#ffd447';
      ctx.strokeStyle = '#7a4a00';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, raio, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // brilho interno
      ctx.fillStyle = '#fff2a8';
      ctx.beginPath();
      ctx.arc(-raio * 0.3, -raio * 0.3, raio * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // símbolo "$"
      if (escalaX > 0.35) {
        ctx.fillStyle = '#7a4a00';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0.5);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ----- Loop principal -----
  function loop(agora) {
    if (destruido) return;
    rafId = requestAnimationFrame(loop);

    if (ultimoTempo === 0) ultimoTempo = agora;
    let dtReal = (agora - ultimoTempo) / 1000;
    ultimoTempo = agora;
    if (dtReal > 0.1) dtReal = 0.1;
    if (dtReal < 0) dtReal = 0;

    if (pausadoManual || pausadoPorOculto) {
      desenhar();
      return;
    }

    tVisual += dtReal;

    acumulador += dtReal * velocidade;
    let passos = 0;
    const maxPassos = 8;
    while (acumulador >= DT && passos < maxPassos) {
      for (let i = 0; i < batalha.unidades.length; i++) {
        const u = batalha.unidades[i];
        const e = obterEstado(u);
        e.prevX = e.x;
        e.prevY = e.y;
        e.x = u.x;
        e.y = u.y;
      }
      passo(batalha, DT);
      processarEventos();
      acumulador -= DT;
      passos++;
    }
    if (passos >= maxPassos) acumulador = 0;

    for (let i = 0; i < batalha.unidades.length; i++) {
      const u = batalha.unidades[i];
      const e = obterEstado(u);
      e.x = u.x;
      e.y = u.y;
    }
    atualizarDirEstados();

    atualizarEfeitos(dtReal);
    atualizarMoedas(dtReal);

    // Fim de batalha
    if (batalha.fim && !fimAgendado) {
      fimAgendado = true;
      tempoFimAte = 1.2;
      esperandoMoedas = true;
      tempoEsperaMoedas = 1.5;
    }
    if (fimAgendado && !aoFimChamado) {
      tempoFimAte -= dtReal;
      // espera moedas em voo pousarem (no máximo +1.5 s)
      if (esperandoMoedas) {
        tempoEsperaMoedas -= dtReal;
        let temMoedaVoando = false;
        for (let i = 0; i < moedas.length; i++) {
          if (moedas[i].ativo && moedas[i].fase === 1) { temMoedaVoando = true; break; }
        }
        if (!temMoedaVoando || tempoEsperaMoedas <= 0) {
          esperandoMoedas = false;
        }
      }
      if (tempoFimAte <= 0 && !esperandoMoedas) {
        aoFimChamado = true;
        if (typeof cfg.aoFim === 'function') {
          try { cfg.aoFim(batalha.fim); } catch (err) { console.error(err); }
        }
      }
    }

    desenhar();
  }

  // ----- Contagem para HUD -----
  function contagem() {
    let herois = 0, viloes = 0;
    for (let i = 0; i < batalha.unidades.length; i++) {
      const u = batalha.unidades[i];
      if (u.morto) continue;
      if (batalha.t < u.atraso) continue;
      if (u.lado === 'h') herois++;
      else viloes++;
    }
    return { herois, viloes };
  }

  // ----- Força para HUD -----
  function forca() {
    let hp = 0, hpMax = 0;
    let hv = 0, hvMax = 0;
    for (let i = 0; i < batalha.unidades.length; i++) {
      const u = batalha.unidades[i];
      if (batalha.t < u.atraso) continue;
      if (u.lado === 'h') {
        hp += Math.max(0, u.pv);
        hpMax += u.pvMax;
      } else {
        hv += Math.max(0, u.pv);
        hvMax += u.pvMax;
      }
    }
    return {
      herois: hpMax > 0 ? hp / hpMax : 0,
      viloes: hvMax > 0 ? hv / hvMax : 0,
    };
  }

  // ----- Visibilidade -----
  function aoMudarVisibilidade() {
    if (document.hidden) {
      pausadoPorOculto = true;
    } else {
      pausadoPorOculto = false;
      ultimoTempo = 0;
    }
  }

  // ----- ResizeObserver -----
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => redimensionar());
    ro.observe(canvas);
  } else {
    window.addEventListener('resize', redimensionar);
  }
  document.addEventListener('visibilitychange', aoMudarVisibilidade);

  // ----- API pública -----
  const visual = {
    estado: { pausado: false },
    iniciar() {
      if (rodando || destruido) return;
      redimensionar();
      for (let i = 0; i < batalha.unidades.length; i++) {
        const u = batalha.unidades[i];
        obterEstado(u);
        conhecidas.add(u.id);
      }
      rodando = true;
      pausadoManual = false;
      visual.estado.pausado = false;
      ultimoTempo = 0;
      rafId = requestAnimationFrame(loop);
    },
    pausar(p) {
      if (typeof p === 'boolean') pausadoManual = p;
      else pausadoManual = !pausadoManual;
      visual.estado.pausado = pausadoManual;
      if (!pausadoManual) ultimoTempo = 0;
    },
    setVelocidade(v) {
      // aceita apenas 0.5, 1, 2
      if (v === 0.5 || v === 1 || v === 2) velocidade = v;
      else velocidade = 1;
    },
    destruir() {
      destruido = true;
      rodando = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', redimensionar);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      estados.clear();
      conhecidas.clear();
      particulasAtivas = 0;
      textosAtivos = 0;
      moedasAtivas = 0;
      for (let i = 0; i < particulas.length; i++) particulas[i].ativo = false;
      for (let i = 0; i < textos.length; i++) textos[i].ativo = false;
      for (let i = 0; i < moedas.length; i++) moedas[i].ativo = false;
    },
    contagem,
    forca,
  };

  return visual;
}
