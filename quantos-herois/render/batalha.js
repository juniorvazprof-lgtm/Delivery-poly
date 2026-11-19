import { passo, DT, ARENA } from '../core/combate.js';
import { desenharUnidade, corDoTipo } from './sprites.js';

// Motor visual da batalha: loop com passo fixo, interpolação, particulas e efeitos.
export function criarVisual(canvas, batalha, opcoes = {}) {
  const cfg = Object.assign({ velocidade: 1, aoFim: null }, opcoes);
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

  // Tempo visual (usado para animações que não dependem do batalha.t)
  let tVisual = 0;

  // ----- Tremor de tela -----
  let tremorForca = 0;

  // ----- Estado visual por unidade -----
  // Map: id -> { x, y (posições do passo anterior), flash, avanco, dir, mortoEm (tVisual), nasceuEm, poeiraFeita, glowCajado, barraVisivel }
  const estados = new Map();
  // Unidades já conhecidas (para detectar aparecimento / morte)
  const conhecidas = new Set();

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
      tipo: 0, // 0=bolinha, 1=estrela, 2=fumaça, 3=anel, 4=faísca, 5=gota, 6=arco
      gravidade: 0,
      arrasto: 0.9,
      rot: 0, rotVel: 0,
      raioIni: 0, raioFim: 0, // para anel
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
    // Escala mantendo proporção 90x140 (letterbox)
    const escalaX = larguraPx / arenaL;
    const escalaY = alturaPx / arenaA;
    escala = Math.min(escalaX, escalaY);
    const desenhoW = arenaL * escala;
    const desenhoH = arenaA * escala;
    offsetX = (larguraPx - desenhoW) / 2;
    // Alinha a arena ao TOPO quando sobrar altura (letterbox embaixo)
    offsetY = 0;
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

    // base: faixa superior (vilões) mais escura, inferior mais clara
    const grad = f.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#3f7a3c');
    grad.addColorStop(0.45, '#5fa84f');
    grad.addColorStop(0.55, '#7abf5c');
    grad.addColorStop(1, '#9ad96f');
    f.fillStyle = grad;
    f.fillRect(0, 0, W, H);

    // faixa de transição de tom (grama mais escura no topo)
    f.fillStyle = 'rgba(20,60,20,0.28)';
    f.fillRect(0, 0, W, H * 0.22);
    f.fillStyle = 'rgba(255,255,200,0.06)';
    f.fillRect(0, H * 0.78, W, H * 0.22);

    // trilha de terra serpenteando ao centro
    const trail = f.createLinearGradient(0, H * 0.35, 0, H * 0.65);
    trail.addColorStop(0, '#a8804d');
    trail.addColorStop(1, '#c39a63');
    f.strokeStyle = trail;
    f.lineCap = 'round';
    f.lineJoin = 'round';
    f.lineWidth = Math.max(6, W * 0.14);
    f.beginPath();
    f.moveTo(W * 0.5, H * 0.18);
    f.bezierCurveTo(W * 0.3, H * 0.35, W * 0.7, H * 0.5, W * 0.45, H * 0.72);
    f.bezierCurveTo(W * 0.3, H * 0.85, W * 0.55, H * 0.95, W * 0.5, H);
    f.stroke();
    // pontinhos na trilha
    f.fillStyle = 'rgba(120,80,40,0.35)';
    for (let i = 0; i < 40; i++) {
      const tt = i / 40;
      const px = W * (0.5 + Math.sin(tt * 6.28) * 0.08 + (Math.random() - 0.5) * 0.12);
      const py = H * (0.18 + tt * 0.82);
      f.beginPath();
      f.arc(px, py, Math.max(1, escala * 0.6 + Math.random() * 1.5), 0, Math.PI * 2);
      f.fill();
    }

    // tufos de grama
    for (let i = 0; i < 140; i++) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      // desvia da trilha central
      if (Math.abs(px - W * 0.5) < W * 0.12) continue;
      const h = (1 + Math.random() * 2.2) * Math.max(1, escala * 0.5);
      f.strokeStyle = Math.random() < 0.5 ? 'rgba(40,90,40,0.7)' : 'rgba(120,170,80,0.8)';
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
      if (Math.abs(px - W * 0.5) < W * 0.12) continue;
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
      if (Math.abs(px - W * 0.5) < W * 0.12) continue;
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
    // cor pode ser hex #rrggbb; retorna rgba
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
        avanco: 0, // 0..1, "pop" vertical
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
          // texto flutuante
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
          }
          criarTexto(tx, ty - 4, txt, cor, tam, pop);
          // particulas de impacto
          // (cor das faíscas vem de corPosImpacto, conforme o tipo de golpe)
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
          for (let k = 0; k < 6; k++) {
            const p = alocarParticula();
            if (!p) break;
            const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            iniciarParticula(p, tx + (Math.random() - 0.5) * 2, ty, Math.cos(ang) * 6, Math.sin(ang) * 14,
              0.4 + Math.random() * 0.2, 0.8, 0.3, '#6eff7a', -20, 20);
          }
          break;
        }
        case 'morte': {
          const e = estados.get(ev.alvo);
          const tipo = (ev.unidade && ev.unidade.tipo) || 'guerreiro';
          const cor = corDoTipo(tipo) || '#ff5b5b';
          if (e) {
            e.mortoEm = tVisual;
            e.flash = 0.2;
          }
          const x = ev.x, y = ev.y;
          const ehSlime = tipo && tipo.indexOf('slime') >= 0;
          // estouro de particulas
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
          // estrelinhas
          for (let k = 0; k < 3; k++) {
            const p = alocarParticula();
            if (!p) break;
            const ang = Math.random() * Math.PI * 2;
            iniciarParticula(p, x, y, Math.cos(ang) * 10, Math.sin(ang) * 10 - 15,
              0.5, 1.0, 0.3, '#fff6a0', 0, 320, 1);
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
          if (e) { e.avanco = Math.min(1, e.avanco + 0.8); e.glow = 0.18; }
          // faísca no ponto de origem
          for (let k = 0; k < 3; k++) {
            const p = alocarParticula();
            if (!p) break;
            const ang = Math.random() * Math.PI * 2;
            iniciarParticula(p, ev.x, ev.y, Math.cos(ang) * 6, Math.sin(ang) * 6 - 5,
              0.2, 0.6, 0, '#ffcc66', 0, 20);
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
          // processado pelo loop
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

  // Anel (explosão/provocar)
  function iniciarAnel(x, y, raioFim, cor, vida, largura) {
    const p = alocarParticula();
    if (!p) return;
    iniciarParticula(p, x, y, 0, 0, vida, 0, 0, cor, 0, 0, 3);
    p.raioIni = 0.5; p.raioFim = raioFim;
    p.larguraLinha = largura || 3;
    p.tam = 1;
  }

  // Arco (giro)
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
    // "!" grande sobre o guardião
    const txt = alocarTexto();
    if (txt) {
      txt.ativo = true; textosAtivos++;
      txt.x = x; txt.y = y - 8; txt.vx = 0; txt.vy = -6;
      txt.vida = 0.6; txt.vidaMax = 0.6;
      txt.texto = '!'; txt.cor = '#ffe14d'; txt.tamBase = 12; txt.tam = 12;
      txt.arco = 0; txt.fase = 0;
    }
  }

  function efeitoMeteoro(x, y, raio) {
    // sombra rápida já que visual (o motor manda o evento na queda)
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
    // redemoinho roxo
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
      t.vy += 18 * dtV; // desacelera a subida (gravidade leve)
      t.vx *= Math.pow(0.9, dtV * 60);
      // arco
      t.x += Math.sin((1 - t.vida / t.vidaMax) * Math.PI) * t.arco * dtV;
      // escala do "pop"
      if (t.vida > t.vidaMax - 0.08) {
        const k = (t.vidaMax - t.vida) / 0.08;
        t.tam = t.tamBase * (1.6 - 0.6 * k);
      } else {
        t.tam += (t.tamBase - t.tam) * Math.min(1, dtV * 12);
      }
    }
    // decaimentos
    for (const u of batalha.unidades) {
      const e = estados.get(u.id);
      if (!e) continue;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dtV);
      if (e.avanco > 0) e.avanco = Math.max(0, e.avanco - dtV / 0.2);
      if (e.glow > 0) e.glow = Math.max(0, e.glow - dtV);
      // squash dos slimes pulsando (se moverem)
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
    // Preenche toda a tela com a cor da grama mais escura (letterbox)
    ctx.fillStyle = '#3f7a3c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Tremor
    let sx = 0, sy = 0;
    if (tremorForca > 0.05 && !prefereSemMovimento) {
      sx = (Math.random() * 2 - 1) * tremorForca * dpr;
      sy = (Math.random() * 2 - 1) * tremorForca * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.translate(offsetX + sx / dpr, offsetY + sy / dpr);

    // Fundo
    construirFundo();
    if (fundoCanvas) {
      ctx.drawImage(fundoCanvas, 0, 0, arenaL * escala, arenaA * escala);
    }

    // Escala para metros
    ctx.scale(escala, escala);

    // Projéteis (atrás das unidades)
    desenharProjeteis();

    // Unidades ordenadas por y
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

    // Partículas (por cima)
    desenharParticulas();

    // Textos
    desenharTextos();

    ctx.restore();

    // Decaimento do tremor
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
      // Halo (lighter) raio 2.4 m
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
      // Corpo laranja raio 1.1 m
      ctx.fillStyle = '#ff8c1a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
      ctx.fill();
      // Núcleo amarelo raio 0.6 m
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Contorno escuro fino (1.5 px de tela)
      ctx.strokeStyle = '#3a1a00';
      ctx.lineWidth = 1.5 / escala;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
      ctx.stroke();
      // Rastro: 2 partículas por frame laranja/amarela que encolhem
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
    ctx.restore();
  }

  function desenharUnidadeVisual(u) {
    const e = estados.get(u.id);
    if (!e) return;

    // Interpolação
    const alpha = Math.min(1, acumulador / DT);
    const ix = e.prevX + (e.x - e.prevX) * alpha;
    const iy = e.prevY + (e.y - e.prevY) * alpha;

    // Morte
    let escalaMorte = 1;
    let alphaMorte = 1;
    if (u.morto) {
      if (e.mortoEm < 0) e.mortoEm = tVisual;
      const dt = tVisual - e.mortoEm;
      if (dt > 0.4) return; // some
      const k = dt / 0.4;
      escalaMorte = 1 + k * 0.3;
      alphaMorte = 1 - k;
    }

    // Aparecimento (pop)
    let escalaPop = 1;
    if (e.nasceuEm < 0) e.nasceuEm = tVisual;
    const dtNasc = tVisual - e.nasceuEm;
    if (dtNasc < 0.2) {
      const k = dtNasc / 0.2;
      escalaPop = k < 0.7 ? (k / 0.7) * 1.15 : 1.15 - ((k - 0.7) / 0.3) * 0.15;
      // poeira ao aparecer
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

    // Avanço (pop vertical)
    const avancoY = -e.avanco * 0.6;

    // Flash
    const flash = e.flash > 0;

    // Provocado / queimando
    const provocado = u.provocadoAte && batalha.t < u.provocadoAte;
    const queimando = u.queima && batalha.t < u.queima.ate;

    ctx.save();
    ctx.globalAlpha = alphaMorte;
    ctx.translate(ix, iy + avancoY);
    ctx.scale(escalaPop * escalaMorte, escalaPop * escalaMorte);

    // Sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, u.raio * 0.9, u.raio * 0.9, u.raio * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aura de provocado
    if (provocado) {
      ctx.strokeStyle = 'rgba(255,225,80,0.7)';
      ctx.lineWidth = 2 / escala;
      ctx.beginPath();
      ctx.arc(0, 0, u.raio * 1.3 + Math.sin(tVisual * 8) * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Chamas se queimando
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

    // Glow do cajado
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

    // Desenha a unidade via sprites.js
    const squash = (u.tipo && u.tipo.indexOf('slime') >= 0) ? e.squash : 0;
    // sprites.js desenha em PIXELS: desfaz a escala de metros e passa a escala como 4º argumento
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

    // Barra de vida (fora da transformação de escala, mas em metros)
    if (!u.morto && u.pv < u.pvMax && u.pv > 0) {
      // Largura mínima 22 px de tela, altura 4 px de tela
      const bw = Math.max(22 / escala, u.raio * 2.2);
      const bh = 4 / escala;
      const bx = ix - bw / 2;
      // Sprites desenhados 1.7× maiores: altura visual ≈ 2.6*raio*1.7 acima do pé
      const by = iy - (2.6 * u.raio * 1.7) - bh - 2 / escala;
      const frac = Math.max(0, u.pv / u.pvMax);
      // fundo
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 1 / escala, by - 1 / escala, bw + 2 / escala, bh + 2 / escala);
      // preenchimento
      ctx.fillStyle = u.lado === 'h' ? '#3ee0ff' : '#ff4d4d';
      ctx.fillRect(bx, by, bw * frac, bh);
      // contorno
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
        // anel
        const r = p.raioIni + (p.raioFim - p.raioIni) * (1 - k);
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = (p.larguraLinha * k) / escala;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.tipo === 6) {
        // arco girando
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = 2 / escala;
        ctx.beginPath();
        ctx.arc(p.x, p.y, tam, p.rot, p.rot + Math.PI * 1.2);
        ctx.stroke();
      } else if (p.tipo === 1) {
        // estrela
        ctx.globalAlpha = a;
        ctx.fillStyle = p.cor;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        desenharEstrela(ctx, tam);
        ctx.restore();
      } else if (p.tipo === 2) {
        // fumaça
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, tam, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.tipo === 5) {
        // gota
        ctx.globalAlpha = a;
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, tam * 0.7, tam, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // bolinha/faísca
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
      // Fonte mínima equivalente a 13 px na tela
      const tamTela = Math.max(t.tam, 13 / escala);
      ctx.font = `900 ${tamTela}px system-ui, sans-serif`;
      // Contorno proporcional (3 px de tela)
      ctx.lineWidth = 3 / escala;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(t.texto, t.x, t.y);
      ctx.fillStyle = t.cor;
      ctx.fillText(t.texto, t.x, t.y);
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
    if (dtReal > 0.1) dtReal = 0.1; // clamp
    if (dtReal < 0) dtReal = 0;

    if (pausadoManual || pausadoPorOculto) {
      // Ainda desenha para manter o quadro
      desenhar();
      return;
    }

    tVisual += dtReal;

    // Acumulador de passo fixo
    acumulador += dtReal * velocidade;
    let passos = 0;
    const maxPassos = 8;
    while (acumulador >= DT && passos < maxPassos) {
      // guarda posições anteriores
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
    if (passos >= maxPassos) acumulador = 0; // evita espiral

    // Atualiza posições atuais (para interpolação)
    for (let i = 0; i < batalha.unidades.length; i++) {
      const u = batalha.unidades[i];
      const e = obterEstado(u);
      e.x = u.x;
      e.y = u.y;
    }
    atualizarDirEstados();

    // Atualiza efeitos com dt real (visual)
    atualizarEfeitos(dtReal);

    // Fim de batalha
    if (batalha.fim && !fimAgendado) {
      fimAgendado = true;
      tempoFimAte = 1.2;
    }
    if (fimAgendado && !aoFimChamado) {
      tempoFimAte -= dtReal;
      if (tempoFimAte <= 0) {
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

  // ----- Visibilidade -----
  function aoMudarVisibilidade() {
    if (document.hidden) {
      pausadoPorOculto = true;
    } else {
      pausadoPorOculto = false;
      ultimoTempo = 0; // reseta para não acumular dt gigante
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
      // inicializa estados das unidades existentes
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
      velocidade = Math.max(0.1, Math.min(4, v || 1));
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
      for (let i = 0; i < particulas.length; i++) particulas[i].ativo = false;
      for (let i = 0; i < textos.length; i++) textos[i].ativo = false;
    },
    contagem,
  };

  return visual;
}