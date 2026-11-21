// render/sprites.js
// Desenho procedural dos personagens chibi do jogo "Quantos Heróis?".
// Tudo em Canvas 2D. Coordenadas locais: (0,0) = centro da base (pés no chão).

import { ARENA } from '../core/combate.js';

// --- Paleta --------------------------------------------------------------
const CONTORNO = '#1d1424';

// Fator visual: personagens maiores na tela sem alterar a lógica.
const TAMANHO_VISUAL = 1.7;

export function corDoTipo(tipo) {
  switch (tipo) {
    case 'guerreiro':   return '#3d6fd1';
    case 'guardiao':    return '#e0a92b';
    case 'piromante':   return '#7d3fb8';
    case 'arqueiro':    return '#3f7d3a';
    case 'clerigo':     return '#f2e6c8';
    case 'goblin':      return '#5cc04a';
    case 'slime':       return '#8fdc4a';
    case 'slimeMedio':  return '#7ad13a';
    case 'slimePequeno':return '#b6ea7a';
    case 'reiSlime':    return '#8a3fd1';
    case 'magoTornado': return '#e0532b';
    case 'campeao':     return '#c9d3dc';
    case 'paladino':    return '#f2e6c8';
    case 'atirador':    return '#2f5a2a';
    case 'sumoSacerdote':return '#f7f2e0';
    case 'goblinArqueiro':return '#5cc04a';
    case 'ogro':        return '#8a9a6a';
    case 'morcego':     return '#5a2b6e';
    case 'xamaGoblin':  return '#5cc04a';
    default:            return '#cccccc';
  }
}

// --- Cache de gradientes por tipo ----------------------------------------
const _gradCache = new Map();

function gradienteCorpo(ctx, tipo, rPix, claro) {
  const chave = tipo + '|' + (rPix | 0) + '|' + (claro ? 1 : 0);
  let g = _gradCache.get(chave);
  if (g) return g;
  const base = corDoTipo(tipo);
  g = ctx.createRadialGradient(-rPix * 0.35, -rPix * 0.55, rPix * 0.15,
                               0, 0, rPix * 1.05);
  g.addColorStop(0, claro ? '#ffffff' : misturar(base, '#ffffff', 0.35));
  g.addColorStop(0.6, base);
  g.addColorStop(1, misturar(base, '#000000', 0.28));
  _gradCache.set(chave, g);
  return g;
}

function misturar(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

function faseDe(id) {
  return ((id * 2654435761) >>> 0) / 4294967295 * Math.PI * 2;
}

// --- Desenho principal ---------------------------------------------------
export function desenharUnidade(ctx, u, anim, escala) {
  const rMetros = u.raio;
  const rPix = rMetros * escala * TAMANHO_VISUAL;
  const alturaPix = 2.6 * rPix;

  // Espessura de linha proporcional ao tamanho em pixels.
  const lw = Math.max(1, Math.min(3, rPix * 0.09));

  const t = anim.t || 0;
  const fase = faseDe(u.id | 0);
  const respira = Math.sin(t * 2.2 + fase) * 0.035;
  const balanco = Math.sin(t * 1.6 + fase) * 0.03;
  const avanco = anim.avanco || 0;
  const squash = anim.squash || 0;
  const dead = anim.morto || 0;
  const dir = anim.dir || 1;

  const deadEscala = 1 - dead * 0.85;
  const deadInclinacao = dead * (Math.PI * 1.2);
  const alphaGeral = 1 - Math.max(0, (dead - 0.75) / 0.25);

  if (alphaGeral <= 0.01) return;

  // Sombra no chão (desenhada uma única vez, antes de qualquer flash).
  ctx.save();
  ctx.globalAlpha *= alphaGeral * 0.25 * (1 - dead * 0.7);
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  // Morcego voa: sombra menor e afastada.
  if (u.tipo === 'morcego') {
    ctx.ellipse(0, rPix * 0.15, rPix * 0.55, rPix * 0.18, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(0, 0, rPix * 1.05, rPix * 0.32, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();

  // Corpo (com transformações de morte).
  ctx.save();
  ctx.globalAlpha *= alphaGeral;
  ctx.translate(0, -dead * alturaPix * 0.15);
  ctx.rotate(deadInclinacao);
  ctx.scale(deadEscala, deadEscala);

  const stretchY = 1 - squash * 0.18;
  const stretchX = 1 + squash * 0.18;

  ctx.save();
  ctx.scale(stretchX, stretchY);
  ctx.translate(balanco * rPix * 0.4, -Math.abs(respira) * rPix * 0.15);

  // Desenho normal
  desenharCorpo(ctx, u, anim, rPix, lw, alturaPix, t, avanco, squash, fase, dir);

  // Flash branco: redesenha o corpo com filtro de silhueta.
  if (anim.flash > 0.01 && typeof ctx.filter === 'string') {
    ctx.save();
    ctx.filter = 'brightness(0) invert(1)';
    ctx.globalAlpha *= anim.flash * 0.85;
    desenharCorpo(ctx, u, anim, rPix, lw, alturaPix, t, avanco, squash, fase, dir);
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

// --- Corpo (pode ser chamado 1 ou 2 vezes para o flash) ------------------
function desenharCorpo(ctx, u, anim, rPix, lw, alturaPix, t, avanco, squash, fase, dir) {
  switch (u.tipo) {
    case 'guerreiro':  desenharGuerreiro(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'guardiao':   desenharGuardiao(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'piromante':  desenharPiromante(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'arqueiro':   desenharArqueiro(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'clerigo':    desenharClerigo(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'goblin':     desenharGoblin(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'slime':
    case 'slimeMedio':
    case 'slimePequeno': desenharSlime(ctx, u, rPix, alturaPix, t, squash, fase, lw); break;
    case 'reiSlime':   desenharReiSlime(ctx, u, rPix, alturaPix, t, squash, fase, lw); break;
    case 'magoTornado': desenharMagoTornado(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'campeao':    desenharCampeao(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'paladino':   desenharPaladino(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'atirador':   desenharAtirador(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'sumoSacerdote': desenharSumoSacerdote(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'goblinArqueiro': desenharGoblinArqueiro(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'ogro':       desenharOgro(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'morcego':    desenharMorcego(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    case 'xamaGoblin': desenharXamaGoblin(ctx, rPix, alturaPix, t, avanco, fase, lw, dir); break;
    default:           desenharGenerico(ctx, rPix, alturaPix, lw); break;
  }

  if (u.lado === 'v' && anim.provocado) desenharExclamacao(ctx, rPix, alturaPix, t, fase, lw);
  if (anim.queimando) desenharChamas(ctx, rPix, alturaPix, t, fase, lw);
}

// --- Heróis --------------------------------------------------------------

function desenharGuerreiro(ctx, r, h, t, avanco, fase, lw, dir) {
  const headR = r * 0.72;
  const headY = -h + headR;
  const bodyW = r * 0.9;
  const bodyH = h * 0.52;
  const bodyTopY = headY + headR * 0.55;
  const bodyCY = bodyTopY + bodyH * 0.5;

  // Espada atrás
  ctx.save();
  ctx.translate(r * 0.35, bodyCY - bodyH * 0.1);
  ctx.rotate(-0.45 + avanco * 1.9);
  ctx.fillStyle = '#d8e3ef';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.05);
  ctx.lineTo(r * 0.14, -r * 1.15);
  ctx.lineTo(0, -r * 1.35);
  ctx.lineTo(-r * 0.14, -r * 1.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c79a3a';
  ctx.beginPath();
  ctx.rect(-r * 0.28, -r * 0.05, r * 0.56, r * 0.16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6b3a1e';
  ctx.beginPath();
  ctx.rect(-r * 0.08, r * 0.1, r * 0.16, r * 0.35);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Pernas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#3b3b52';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.28, bodyTopY + bodyH * 0.6, bodyW * 0.22, h * 0.14);
  ctx.rect(bodyW * 0.06, bodyTopY + bodyH * 0.6, bodyW * 0.22, h * 0.14);
  ctx.fill();
  ctx.stroke();

  // Corpo
  corpoArredondado(ctx, -bodyW * 0.5, bodyTopY, bodyW, bodyH, '#3d6fd1', r, lw);
  // Peitoral
  ctx.fillStyle = '#b9cde0';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.35, bodyTopY + bodyH * 0.15);
  ctx.lineTo(bodyW * 0.35, bodyTopY + bodyH * 0.15);
  ctx.lineTo(0, bodyTopY + bodyH * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Braços
  ctx.fillStyle = '#3d6fd1';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.75, bodyTopY + bodyH * 0.2, bodyW * 0.28, bodyH * 0.5);
  ctx.rect(bodyW * 0.47, bodyTopY + bodyH * 0.2, bodyW * 0.28, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Capacete
  ctx.fillStyle = '#c9d3dc';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.1, headR, Math.PI, Math.PI * 2);
  ctx.lineTo(headR, headY + headR * 0.05);
  ctx.lineTo(-headR, headY + headR * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Pluma
  ctx.fillStyle = '#d63030';
  ctx.beginPath();
  ctx.moveTo(0, headY - headR * 1.25);
  ctx.bezierCurveTo(r * 0.55, headY - headR * 1.7,
                    r * 0.6, headY - headR * 0.85,
                    0, headY - headR * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  olhos(ctx, 0, headY + headR * 0.1, headR, dir, '#1b1020', '#ffffff', 0, lw);
}

function desenharGuardiao(ctx, r, h, t, avanco, fase, lw, dir) {
  const headR = r * 0.75;
  const headY = -h + headR;
  const bodyW = r * 1.0;
  const bodyH = h * 0.5;
  const bodyTopY = headY + headR * 0.55;

  // Pernas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#a47b1e';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.3, bodyTopY + bodyH * 0.62, bodyW * 0.22, h * 0.13);
  ctx.rect(bodyW * 0.08, bodyTopY + bodyH * 0.62, bodyW * 0.22, h * 0.13);
  ctx.fill();
  ctx.stroke();

  // Corpo
  corpoArredondado(ctx, -bodyW * 0.5, bodyTopY, bodyW, bodyH, '#e0a92b', r, lw);

  // Braço do lado oposto ao escudo
  ctx.fillStyle = '#e0a92b';
  ctx.beginPath();
  ctx.rect(-dir * bodyW * 0.73, bodyTopY + bodyH * 0.2, bodyW * 0.28, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Braço do lado do escudo (por trás do escudo)
  ctx.beginPath();
  ctx.rect(dir * bodyW * 0.45, bodyTopY + bodyH * 0.18, bodyW * 0.28, bodyH * 0.55);
  ctx.fill();
  ctx.stroke();

  // Escudo À FRENTE do corpo, do lado de dir, cobrindo parte do tronco.
  const escX = dir * (bodyW * 0.28 + avanco * r * 0.35);
  ctx.save();
  ctx.translate(escX, bodyTopY + bodyH * 0.35);
  ctx.rotate(dir * (-0.08 + avanco * 0.25));
  const sw = r * 0.9, sh = r * 1.4;
  ctx.fillStyle = '#2b5fa8';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-sw * 0.5, -sh * 0.5);
  ctx.lineTo(sw * 0.5, -sh * 0.5);
  ctx.lineTo(sw * 0.5, sh * 0.25);
  ctx.quadraticCurveTo(sw * 0.5, sh * 0.55, 0, sh * 0.6);
  ctx.quadraticCurveTo(-sw * 0.5, sh * 0.55, -sw * 0.5, sh * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Emblema
  ctx.fillStyle = '#ffe066';
  desenharEstrela(ctx, 0, 0, sw * 0.32, 5);
  ctx.fill();
  ctx.lineWidth = lw * 0.7;
  ctx.strokeStyle = CONTORNO;
  ctx.stroke();
  ctx.restore();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Elmo
  ctx.fillStyle = '#a47b1e';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.15, headR * 1.02, Math.PI, Math.PI * 2);
  ctx.lineTo(headR * 1.02, headY + headR * 0.35);
  ctx.lineTo(headR * 0.6, headY + headR * 0.55);
  ctx.lineTo(-headR * 0.6, headY + headR * 0.55);
  ctx.lineTo(-headR * 1.02, headY + headR * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Viseira
  ctx.fillStyle = '#1d1424';
  ctx.beginPath();
  ctx.rect(-headR * 0.6, headY - headR * 0.05, headR * 1.2, headR * 0.22);
  ctx.fill();
  olhos(ctx, 0, headY + headR * 0.1, headR * 0.85, dir, '#1b1020', '#ffe066', 0, lw);
}

function desenharPiromante(ctx, r, h, t, avanco, fase, lw, dir) {
  const headR = r * 0.7;
  const headY = -h + headR + r * 0.15;
  const bodyW = r * 0.85;
  const bodyH = h * 0.48;
  const bodyTopY = headY + headR * 0.5;

  // Manto
  ctx.fillStyle = '#7d3fb8';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.5, bodyTopY);
  ctx.lineTo(bodyW * 0.5, bodyTopY);
  ctx.lineTo(bodyW * 0.55, bodyTopY + bodyH);
  ctx.lineTo(-bodyW * 0.55, bodyTopY + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#4a1f73';
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.beginPath();
  ctx.moveTo(0, bodyTopY);
  ctx.lineTo(0, bodyTopY + bodyH);
  ctx.stroke();

  // Cajado
  ctx.save();
  ctx.translate(r * 0.55, bodyTopY + bodyH * 0.3);
  ctx.rotate(-0.15 - avanco * 0.5);
  ctx.strokeStyle = '#6b3a1e';
  ctx.lineWidth = lw + 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 1.6);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Chama do cajado: borda laranja + núcleo amarelo, mais visível.
  const intens = 1 + avanco * 0.6;
  const fs = r * 0.5 * intens;
  const fl = Math.sin(t * 12 + fase) * 0.15;
  // borda laranja
  ctx.fillStyle = '#ff8a2b';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.95 - fs * 0.2);
  ctx.quadraticCurveTo(fs * 1.15, -r * 1.6 + fl, 0, -r * 1.5);
  ctx.quadraticCurveTo(-fs * 1.15, -r * 1.6 - fl, 0, -r * 1.95 - fs * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // núcleo amarelo
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(0, -r * 1.72, fs * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Chapéu
  ctx.fillStyle = '#5a2b8f';
  ctx.beginPath();
  ctx.moveTo(-headR * 1.15, headY - headR * 0.35);
  ctx.lineTo(headR * 1.15, headY - headR * 0.35);
  ctx.lineTo(headR * 0.1, headY - headR * 2.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe066';
  desenharEstrela(ctx, -headR * 0.4, headY - headR * 0.95, headR * 0.18, 5); ctx.fill();
  desenharEstrela(ctx, headR * 0.35, headY - headR * 1.15, headR * 0.14, 5); ctx.fill();
  desenharEstrela(ctx, headR * 0.05, headY - headR * 1.45, headR * 0.12, 5); ctx.fill();

  olhos(ctx, 0, headY + headR * 0.05, headR, dir, '#1b1020', '#ffffff', 0, lw);

  if (avanco > 0.05) {
    ctx.save();
    ctx.globalAlpha *= avanco * 0.6;
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.arc(r * 0.55, bodyTopY + bodyH * 0.3 - r * 1.6, r * 0.5 * avanco, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function desenharArqueiro(ctx, r, h, t, avanco, fase, lw, dir) {
  const headR = r * 0.72;
  const headY = -h + headR;
  const bodyW = r * 0.88;
  const bodyH = h * 0.5;
  const bodyTopY = headY + headR * 0.55;

  // Aljava nas costas (do lado oposto ao arco)
  ctx.save();
  ctx.translate(-dir * bodyW * 0.35, bodyTopY + bodyH * 0.15);
  ctx.rotate(-dir * 0.35);
  ctx.fillStyle = '#6b3a1e';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-r * 0.18, -r * 0.1, r * 0.36, r * 0.9);
  ctx.fill();
  ctx.stroke();
  // 3 flechas saindo da aljava
  for (let i = 0; i < 3; i++) {
    const fx = (i - 1) * r * 0.12;
    ctx.strokeStyle = '#c9d3dc';
    ctx.lineWidth = Math.max(1, lw * 0.8);
    ctx.beginPath();
    ctx.moveTo(fx, -r * 0.1);
    ctx.lineTo(fx, -r * 0.75);
    ctx.stroke();
    // penas
    ctx.fillStyle = i === 1 ? '#d63030' : '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(fx, -r * 0.75);
    ctx.lineTo(fx - r * 0.08, -r * 0.6);
    ctx.lineTo(fx + r * 0.08, -r * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Pernas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#5a3a1e';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.28, bodyTopY + bodyH * 0.6, bodyW * 0.22, h * 0.14);
  ctx.rect(bodyW * 0.06, bodyTopY + bodyH * 0.6, bodyW * 0.22, h * 0.14);
  ctx.fill();
  ctx.stroke();

  // Túnica marrom-clara
  corpoArredondado(ctx, -bodyW * 0.5, bodyTopY, bodyW, bodyH, '#a67c52', r, lw);
  // Faixa/cinto
  ctx.fillStyle = '#3f7d3a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-bodyW * 0.5, bodyTopY + bodyH * 0.55, bodyW, bodyH * 0.14);
  ctx.fill();
  ctx.stroke();

  // Braço de trás
  ctx.fillStyle = '#a67c52';
  ctx.beginPath();
  ctx.rect(-dir * bodyW * 0.72, bodyTopY + bodyH * 0.2, bodyW * 0.26, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Capuz verde-floresta com sombra no rosto
  ctx.fillStyle = '#3f7d3a';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.08, headR * 1.08, Math.PI * 0.95, Math.PI * 2.05);
  ctx.lineTo(headR * 1.05, headY + headR * 0.55);
  ctx.lineTo(headR * 0.55, headY + headR * 0.35);
  ctx.lineTo(-headR * 0.55, headY + headR * 0.35);
  ctx.lineTo(-headR * 1.05, headY + headR * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Sombra interna do capuz (sobre a testa)
  ctx.fillStyle = 'rgba(20,30,20,0.55)';
  ctx.beginPath();
  ctx.ellipse(0, headY - headR * 0.15, headR * 0.85, headR * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  olhos(ctx, 0, headY + headR * 0.12, headR, dir, '#1b1020', '#ffffff', 0, lw);

  // Braço da frente + arco grande de madeira
  const arcoX = dir * bodyW * 0.55;
  const arcoY = bodyTopY + bodyH * 0.35;
  // Braço da frente
  ctx.fillStyle = '#a67c52';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(dir * bodyW * 0.45, bodyTopY + bodyH * 0.2, bodyW * 0.28, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Arco: desenhado no lado de dir, com corda que puxa para trás com avanco
  ctx.save();
  ctx.translate(arcoX, arcoY);
  ctx.rotate(dir * (0.05 + avanco * 0.15));
  const arcoR = r * 1.15;
  // Madeira do arco
  ctx.strokeStyle = '#6b3a1e';
  ctx.lineWidth = Math.max(2, lw * 1.4);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, arcoR, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // Corda: puxa para trás (lado oposto ao dir) com avanco
  const pux = avanco * arcoR * 0.9;
  const topX = Math.cos(-Math.PI * 0.55) * arcoR;
  const topY = Math.sin(-Math.PI * 0.55) * arcoR;
  const botX = Math.cos(Math.PI * 0.55) * arcoR;
  const botY = Math.sin(Math.PI * 0.55) * arcoR;
  ctx.strokeStyle = '#e8e0c8';
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(-pux, 0);
  ctx.lineTo(botX, botY);
  ctx.stroke();
  // Flecha engatilhada quando tensionado
  if (avanco > 0.05) {
    ctx.strokeStyle = '#c9d3dc';
    ctx.lineWidth = Math.max(1, lw * 0.9);
    ctx.beginPath();
    ctx.moveTo(-pux, 0);
    ctx.lineTo(arcoR * 0.9, 0);
    ctx.stroke();
    // ponta
    ctx.fillStyle = '#c9d3dc';
    ctx.beginPath();
    ctx.moveTo(arcoR * 0.9, 0);
    ctx.lineTo(arcoR * 0.75, -r * 0.08);
    ctx.lineTo(arcoR * 0.75, r * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function desenharClerigo(ctx, r, h, t, avanco, fase, lw, dir) {
  const headR = r * 0.72;
  const headY = -h + headR + r * 0.1;
  const bodyW = r * 0.9;
  const bodyH = h * 0.5;
  const bodyTopY = headY + headR * 0.55;

  // Manto branco-creme
  ctx.fillStyle = '#f2e6c8';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.5, bodyTopY);
  ctx.lineTo(bodyW * 0.5, bodyTopY);
  ctx.lineTo(bodyW * 0.58, bodyTopY + bodyH);
  ctx.lineTo(-bodyW * 0.58, bodyTopY + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Faixa dourada central
  ctx.fillStyle = '#e0b83a';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.08, bodyTopY, bodyW * 0.16, bodyH);
  ctx.fill();
  ctx.stroke();
  // Faixa dourada na cintura
  ctx.beginPath();
  ctx.rect(-bodyW * 0.5, bodyTopY + bodyH * 0.55, bodyW, bodyH * 0.12);
  ctx.fill();
  ctx.stroke();

  // Cajado com sol dourado
  ctx.save();
  ctx.translate(dir * r * 0.55, bodyTopY + bodyH * 0.3);
  ctx.rotate(dir * (0.1 - avanco * 0.35));
  // haste
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = lw + 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 1.7);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // halo suave (brilha mais com avanco)
  const brilho = 0.35 + avanco * 0.55;
  const haloR = r * (0.55 + avanco * 0.25);
  const grad = ctx.createRadialGradient(0, -r * 1.85, r * 0.05, 0, -r * 1.85, haloR);
  grad.addColorStop(0, 'rgba(255,240,150,' + brilho.toFixed(3) + ')');
  grad.addColorStop(1, 'rgba(255,240,150,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, -r * 1.85, haloR, 0, Math.PI * 2);
  ctx.fill();
  // sol dourado
  ctx.fillStyle = '#ffd24a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, -r * 1.85, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // raios do sol
  const raios = 8;
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = Math.max(1, lw * 0.8);
  for (let i = 0; i < raios; i++) {
    const ang = (i / raios) * Math.PI * 2 + t * 0.6;
    const r1 = r * 0.34, r2 = r * 0.46;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r1, -r * 1.85 + Math.sin(ang) * r1);
    ctx.lineTo(Math.cos(ang) * r2, -r * 1.85 + Math.sin(ang) * r2);
    ctx.stroke();
  }
  ctx.restore();

  // Braço do lado oposto ao cajado
  ctx.fillStyle = '#f2e6c8';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-dir * bodyW * 0.72, bodyTopY + bodyH * 0.2, bodyW * 0.26, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mitra/capuz branco baixo
  ctx.fillStyle = '#f7f2e0';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.1, headR * 1.05, Math.PI * 0.92, Math.PI * 2.08);
  ctx.lineTo(headR * 1.0, headY + headR * 0.15);
  ctx.lineTo(-headR * 1.0, headY + headR * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Detalhe dourado na mitra
  ctx.strokeStyle = '#e0b83a';
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.9, headY - headR * 0.05);
  ctx.lineTo(headR * 0.9, headY - headR * 0.05);
  ctx.stroke();

  // Cruz/sol dourado na testa da mitra
  ctx.fillStyle = '#ffd24a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.beginPath();
  ctx.rect(-headR * 0.06, headY - headR * 0.75, headR * 0.12, headR * 0.4);
  ctx.rect(-headR * 0.2, headY - headR * 0.62, headR * 0.4, headR * 0.12);
  ctx.fill();
  ctx.stroke();

  // Rosto gentil
  olhos(ctx, 0, headY + headR * 0.15, headR, dir, '#1b1020', '#ffffff', 0, lw);
  // Sorriso gentil
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.22, headY + headR * 0.55);
  ctx.quadraticCurveTo(0, headY + headR * 0.72, headR * 0.22, headY + headR * 0.55);
  ctx.stroke();

  // Pequeno halo dourado acima da cabeça
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = Math.max(1.5, lw * 1.1);
  ctx.beginPath();
  ctx.ellipse(0, headY - headR * 1.35, headR * 0.55, headR * 0.18, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// --- Vilões --------------------------------------------------------------

function desenharGoblin(ctx, r, h, t, avanco, fase, lw, dir) {
  const headR = r * 0.85;
  const saltito = Math.abs(Math.sin(t * 6 + fase)) * r * 0.18;
  const headY = -h + headR + saltito * 0.4;
  const bodyW = r * 0.85;
  const bodyH = h * 0.42 - saltito * 0.2;
  const bodyTopY = headY + headR * 0.5;

  // Pernas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#3e7a26';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.3, bodyTopY + bodyH * 0.65, bodyW * 0.22, h * 0.12);
  ctx.rect(bodyW * 0.08, bodyTopY + bodyH * 0.65, bodyW * 0.22, h * 0.12);
  ctx.fill();
  ctx.stroke();

  // Corpo verde-vivo
  ctx.fillStyle = '#5cc04a';
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.5, bodyTopY + bodyH);
  ctx.quadraticCurveTo(-bodyW * 0.65, bodyTopY, 0, bodyTopY - bodyH * 0.15);
  ctx.quadraticCurveTo(bodyW * 0.65, bodyTopY, bodyW * 0.5, bodyTopY + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Barriga
  ctx.fillStyle = '#a8d97a';
  ctx.beginPath();
  ctx.ellipse(0, bodyTopY + bodyH * 0.55, bodyW * 0.28, bodyH * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Adaga
  ctx.save();
  ctx.translate(bodyW * 0.5, bodyTopY + bodyH * 0.5);
  ctx.rotate(-0.6 + avanco * 1.6);
  ctx.fillStyle = '#c9d3dc';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.1, -r * 0.55);
  ctx.lineTo(0, -r * 0.7);
  ctx.lineTo(-r * 0.1, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6b3a1e';
  ctx.beginPath();
  ctx.rect(-r * 0.05, -r * 0.05, r * 0.1, r * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Cabeça verde-vivo
  ctx.fillStyle = '#5cc04a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Orelhas menores (máx 0.9× largura da cabeça para cada lado)
  const orelhaLarg = headR * 0.9;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.85, headY - headR * 0.15);
  ctx.lineTo(-headR * 0.85 - orelhaLarg, headY - headR * 0.45);
  ctx.lineTo(-headR * 0.85, headY + headR * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headR * 0.85, headY - headR * 0.15);
  ctx.lineTo(headR * 0.85 + orelhaLarg, headY - headR * 0.45);
  ctx.lineTo(headR * 0.85, headY + headR * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Olhos
  olhos(ctx, 0, headY, headR, dir, '#1b1020', '#e8e22a', 0, lw);

  // Sobrancelhas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(1, lw * 0.85);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.55, headY - headR * 0.35);
  ctx.lineTo(-headR * 0.15, headY - headR * 0.18);
  ctx.moveTo(headR * 0.55, headY - headR * 0.35);
  ctx.lineTo(headR * 0.15, headY - headR * 0.18);
  ctx.stroke();

  // Boca
  ctx.beginPath();
  ctx.moveTo(-headR * 0.3, headY + headR * 0.5);
  ctx.quadraticCurveTo(0, headY + headR * 0.7, headR * 0.3, headY + headR * 0.5);
  ctx.stroke();
}

function desenharSlime(ctx, u, r, h, t, squash, fase, lw) {
  const corClaro = u.tipo === 'slimePequeno';
  const baseR = r * 1.05;
  const respir = Math.sin(t * 3 + fase) * 0.06;
  const estic = 1 - squash * 0.22 + respir;
  const larg = 1 + squash * 0.22 - respir;
  const cy = -h * 0.35;

  ctx.save();
  ctx.globalAlpha *= corClaro ? 0.78 : 0.88;
  const g = gradienteCorpo(ctx, u.tipo, baseR, corClaro);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, cy - baseR * 0.9 * estic);
  ctx.bezierCurveTo(larg * baseR * 0.85, cy - baseR * 0.1,
                    larg * baseR * 0.95, cy + baseR * 0.8,
                    0, cy + baseR * 0.75);
  ctx.bezierCurveTo(-larg * baseR * 0.95, cy + baseR * 0.8,
                    -larg * baseR * 0.85, cy - baseR * 0.1,
                    0, cy - baseR * 0.9 * estic);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha /= (corClaro ? 0.78 : 0.88);
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha *= 0.55;
  ctx.beginPath();
  ctx.ellipse(-baseR * 0.35, cy - baseR * 0.4, baseR * 0.22, baseR * 0.35, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha /= 0.55;
  ctx.restore();

  olhos(ctx, 0, cy - baseR * 0.05, baseR * 0.55, 1, '#1b1020', '#ffffff', baseR, lw);
}

function desenharReiSlime(ctx, u, r, h, t, squash, fase, lw) {
  const baseR = r * 1.25;
  const respir = Math.sin(t * 2.4 + fase) * 0.05;
  const estic = 1 - squash * 0.2 + respir;
  const larg = 1 + squash * 0.2 - respir;
  const cy = -h * 0.36;

  ctx.save();
  ctx.globalAlpha *= 0.9;
  const g = gradienteCorpo(ctx, 'reiSlime', baseR, false);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, cy - baseR * 0.95 * estic);
  ctx.bezierCurveTo(larg * baseR * 0.9, cy - baseR * 0.15,
                    larg * baseR, cy + baseR * 0.85,
                    0, cy + baseR * 0.8);
  ctx.bezierCurveTo(-larg * baseR, cy + baseR * 0.85,
                    -larg * baseR * 0.9, cy - baseR * 0.15,
                    0, cy - baseR * 0.95 * estic);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha /= 0.9;
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha *= 0.4;
  ctx.beginPath();
  ctx.ellipse(-baseR * 0.4, cy - baseR * 0.45, baseR * 0.22, baseR * 0.38, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha /= 0.4;
  ctx.restore();

  // Coroa NO TOPO da cabeça, levemente inclinada.
  const crownY = cy - baseR * 0.95 * estic;
  ctx.save();
  ctx.translate(0, crownY);
  ctx.rotate(-0.12);
  ctx.fillStyle = '#ffd24a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-baseR * 0.6, baseR * 0.1);
  ctx.lineTo(-baseR * 0.55, -baseR * 0.35);
  ctx.lineTo(-baseR * 0.25, -baseR * 0.05);
  ctx.lineTo(0, -baseR * 0.5);
  ctx.lineTo(baseR * 0.25, -baseR * 0.05);
  ctx.lineTo(baseR * 0.55, -baseR * 0.35);
  ctx.lineTo(baseR * 0.6, baseR * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Joias
  ctx.fillStyle = '#d63030';
  ctx.beginPath(); ctx.arc(0, -baseR * 0.05, baseR * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3d6fd1';
  ctx.beginPath(); ctx.arc(-baseR * 0.4, -baseR * 0.02, baseR * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(baseR * 0.4, -baseR * 0.02, baseR * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Olhos
  olhos(ctx, 0, cy - baseR * 0.05, baseR * 0.6, 1, '#1b1020', '#ffe066', baseR, lw);
  // Sobrancelhas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(1, lw);
  ctx.beginPath();
  ctx.moveTo(-baseR * 0.55, cy - baseR * 0.4);
  ctx.lineTo(-baseR * 0.15, cy - baseR * 0.22);
  ctx.moveTo(baseR * 0.55, cy - baseR * 0.4);
  ctx.lineTo(baseR * 0.15, cy - baseR * 0.22);
  ctx.stroke();
  // Boca
  ctx.beginPath();
  ctx.moveTo(-baseR * 0.25, cy + baseR * 0.45);
  ctx.quadraticCurveTo(0, cy + baseR * 0.3, baseR * 0.25, cy + baseR * 0.45);
  ctx.stroke();
}

function desenharGenerico(ctx, r, h, lw) {
  ctx.fillStyle = '#999999';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, -h * 0.5, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// --- Heróis evoluídos ----------------------------------------------------

function auraClasse(ctx, r, h, t, fase, cor) {
  // Aura suave no chão, da cor da classe.
  ctx.save();
  ctx.globalAlpha *= 0.35 + Math.sin(t * 3 + fase) * 0.08;
  const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6);
  g.addColorStop(0, cor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.6, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function desenharMagoTornado(ctx, r, h, t, avanco, fase, lw, dir) {
  auraClasse(ctx, r, h, t, fase, 'rgba(255,140,60,0.55)');

  const headR = r * 0.72;
  const headY = -h + headR + r * 0.15;
  const bodyW = r * 0.9;
  const bodyH = h * 0.5;
  const bodyTopY = headY + headR * 0.5;

  // Manto vermelho-alaranjado
  ctx.fillStyle = '#e0532b';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.5, bodyTopY);
  ctx.lineTo(bodyW * 0.5, bodyTopY);
  ctx.lineTo(bodyW * 0.58, bodyTopY + bodyH);
  ctx.lineTo(-bodyW * 0.58, bodyTopY + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Detalhe dourado central
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.beginPath();
  ctx.moveTo(0, bodyTopY);
  ctx.lineTo(0, bodyTopY + bodyH);
  ctx.stroke();

  // Cajado com redemoinho de fogo
  ctx.save();
  ctx.translate(dir * r * 0.6, bodyTopY + bodyH * 0.3);
  ctx.rotate(dir * (-0.15 - avanco * 0.5));
  ctx.strokeStyle = '#6b3a1e';
  ctx.lineWidth = lw + 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 1.65);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Redemoinho de fogo girando
  const giro = t * 6 + fase;
  const swirlR = r * 0.42 * (1 + avanco * 0.4);
  const cyS = -r * 1.85;
  for (let i = 0; i < 3; i++) {
    const a = giro + (i / 3) * Math.PI * 2;
    const rr = swirlR * (0.6 + i * 0.2);
    ctx.fillStyle = i === 0 ? '#ffe066' : '#ff8a2b';
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, cyS + Math.sin(a) * rr * 0.5, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Núcleo
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(0, cyS, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Chapéu pontudo maior
  ctx.fillStyle = '#b8381e';
  ctx.beginPath();
  ctx.moveTo(-headR * 1.25, headY - headR * 0.35);
  ctx.lineTo(headR * 1.25, headY - headR * 0.35);
  ctx.lineTo(headR * 0.15, headY - headR * 2.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Faixa dourada
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.beginPath();
  ctx.moveTo(-headR * 1.1, headY - headR * 0.55);
  ctx.lineTo(headR * 1.1, headY - headR * 0.55);
  ctx.stroke();
  // Chamas na ponta do chapéu
  const pontaY = headY - headR * 2.6;
  for (let i = 0; i < 2; i++) {
    const fl = Math.sin(t * 10 + fase + i * 1.5) * r * 0.06;
    ctx.fillStyle = i === 0 ? '#ff8a2b' : '#ffe066';
    ctx.beginPath();
    ctx.moveTo(0, pontaY - r * 0.35 - i * r * 0.1);
    ctx.quadraticCurveTo(r * 0.18 + fl, pontaY - r * 0.1, 0, pontaY + r * 0.05);
    ctx.quadraticCurveTo(-r * 0.18 + fl, pontaY - r * 0.1, 0, pontaY - r * 0.35 - i * r * 0.1);
    ctx.closePath();
    ctx.fill();
  }

  olhos(ctx, 0, headY + headR * 0.05, headR, dir, '#1b1020', '#ffffff', 0, lw);
}

function desenharCampeao(ctx, r, h, t, avanco, fase, lw, dir) {
  auraClasse(ctx, r, h, t, fase, 'rgba(220,220,255,0.5)');

  const headR = r * 0.75;
  const headY = -h + headR;
  const bodyW = r * 0.95;
  const bodyH = h * 0.54;
  const bodyTopY = headY + headR * 0.55;
  const bodyCY = bodyTopY + bodyH * 0.5;

  // Capa vermelha atrás
  ctx.save();
  ctx.fillStyle = '#b02020';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.45, bodyTopY + bodyH * 0.1);
  ctx.quadraticCurveTo(-bodyW * 0.85, bodyTopY + bodyH * 0.6,
                       -bodyW * 0.7, bodyTopY + bodyH * 1.05);
  ctx.lineTo(bodyW * 0.7, bodyTopY + bodyH * 1.05);
  ctx.quadraticCurveTo(bodyW * 0.85, bodyTopY + bodyH * 0.6,
                       bodyW * 0.45, bodyTopY + bodyH * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Espada grande de duas mãos atrás
  ctx.save();
  ctx.translate(r * 0.4, bodyCY - bodyH * 0.15);
  ctx.rotate(-0.5 + avanco * 2.0);
  ctx.fillStyle = '#e8eef5';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.1);
  ctx.lineTo(r * 0.2, -r * 1.5);
  ctx.lineTo(0, -r * 1.8);
  ctx.lineTo(-r * 0.2, -r * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Guarda dourada
  ctx.fillStyle = '#e0b83a';
  ctx.beginPath();
  ctx.rect(-r * 0.4, -r * 0.1, r * 0.8, r * 0.18);
  ctx.fill();
  ctx.stroke();
  // Cabo
  ctx.fillStyle = '#6b3a1e';
  ctx.beginPath();
  ctx.rect(-r * 0.1, r * 0.08, r * 0.2, r * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Pernas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#4a4a5e';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.28, bodyTopY + bodyH * 0.6, bodyW * 0.22, h * 0.14);
  ctx.rect(bodyW * 0.06, bodyTopY + bodyH * 0.6, bodyW * 0.22, h * 0.14);
  ctx.fill();
  ctx.stroke();

  // Corpo prateado-dourado
  corpoArredondado(ctx, -bodyW * 0.5, bodyTopY, bodyW, bodyH, '#c9d3dc', r, lw);
  // Peitoral dourado
  ctx.fillStyle = '#e0b83a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.35, bodyTopY + bodyH * 0.15);
  ctx.lineTo(bodyW * 0.35, bodyTopY + bodyH * 0.15);
  ctx.lineTo(0, bodyTopY + bodyH * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Braços
  ctx.fillStyle = '#c9d3dc';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.75, bodyTopY + bodyH * 0.2, bodyW * 0.28, bodyH * 0.5);
  ctx.rect(bodyW * 0.47, bodyTopY + bodyH * 0.2, bodyW * 0.28, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Elmo prateado com detalhe dourado
  ctx.fillStyle = '#c9d3dc';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.1, headR, Math.PI, Math.PI * 2);
  ctx.lineTo(headR, headY + headR * 0.05);
  ctx.lineTo(-headR, headY + headR * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Faixa dourada
  ctx.strokeStyle = '#e0b83a';
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.beginPath();
  ctx.moveTo(-headR, headY - headR * 0.05);
  ctx.lineTo(headR, headY - headR * 0.05);
  ctx.stroke();
  // Pluma vermelha
  ctx.fillStyle = '#d63030';
  ctx.beginPath();
  ctx.moveTo(0, headY - headR * 1.25);
  ctx.bezierCurveTo(r * 0.6, headY - headR * 1.75,
                    r * 0.65, headY - headR * 0.85,
                    0, headY - headR * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  olhos(ctx, 0, headY + headR * 0.1, headR, dir, '#1b1020', '#ffffff', 0, lw);
}

function desenharPaladino(ctx, r, h, t, avanco, fase, lw, dir) {
  auraClasse(ctx, r, h, t, fase, 'rgba(255,220,120,0.55)');

  const headR = r * 0.76;
  const headY = -h + headR;
  const bodyW = r * 1.0;
  const bodyH = h * 0.52;
  const bodyTopY = headY + headR * 0.55;

  // Pernas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#c9b06a';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.3, bodyTopY + bodyH * 0.62, bodyW * 0.22, h * 0.13);
  ctx.rect(bodyW * 0.08, bodyTopY + bodyH * 0.62, bodyW * 0.22, h * 0.13);
  ctx.fill();
  ctx.stroke();

  // Corpo branco e dourado
  corpoArredondado(ctx, -bodyW * 0.5, bodyTopY, bodyW, bodyH, '#f7f2e0', r, lw);
  // Detalhe dourado
  ctx.fillStyle = '#e0b83a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-bodyW * 0.5, bodyTopY + bodyH * 0.5, bodyW, bodyH * 0.14);
  ctx.fill();
  ctx.stroke();

  // Braço oposto
  ctx.fillStyle = '#f7f2e0';
  ctx.beginPath();
  ctx.rect(-dir * bodyW * 0.73, bodyTopY + bodyH * 0.2, bodyW * 0.28, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Braço do escudo
  ctx.beginPath();
  ctx.rect(dir * bodyW * 0.45, bodyTopY + bodyH * 0.18, bodyW * 0.28, bodyH * 0.55);
  ctx.fill();
  ctx.stroke();

  // Escudo grande com sol
  const escX = dir * (bodyW * 0.3 + avanco * r * 0.35);
  ctx.save();
  ctx.translate(escX, bodyTopY + bodyH * 0.35);
  ctx.rotate(dir * (-0.08 + avanco * 0.25));
  const sw = r * 1.05, sh = r * 1.55;
  ctx.fillStyle = '#f7f2e0';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-sw * 0.5, -sh * 0.5);
  ctx.lineTo(sw * 0.5, -sh * 0.5);
  ctx.lineTo(sw * 0.5, sh * 0.25);
  ctx.quadraticCurveTo(sw * 0.5, sh * 0.55, 0, sh * 0.6);
  ctx.quadraticCurveTo(-sw * 0.5, sh * 0.55, -sw * 0.5, sh * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Sol dourado no escudo
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath();
  ctx.arc(0, 0, sw * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = lw * 0.7;
  ctx.strokeStyle = CONTORNO;
  ctx.stroke();
  // Raios do sol
  ctx.strokeStyle = '#e0b83a';
  ctx.lineWidth = Math.max(1, lw * 0.7);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + t * 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * sw * 0.34, Math.sin(ang) * sw * 0.34);
    ctx.lineTo(Math.cos(ang) * sw * 0.46, Math.sin(ang) * sw * 0.46);
    ctx.stroke();
  }
  ctx.restore();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Elmo branco-dourado
  ctx.fillStyle = '#f7f2e0';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.15, headR * 1.02, Math.PI, Math.PI * 2);
  ctx.lineTo(headR * 1.02, headY + headR * 0.35);
  ctx.lineTo(headR * 0.6, headY + headR * 0.55);
  ctx.lineTo(-headR * 0.6, headY + headR * 0.55);
  ctx.lineTo(-headR * 1.02, headY + headR * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Detalhe dourado no elmo
  ctx.strokeStyle = '#e0b83a';
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.beginPath();
  ctx.moveTo(0, headY - headR * 1.1);
  ctx.lineTo(0, headY + headR * 0.5);
  ctx.stroke();
  // Viseira
  ctx.fillStyle = '#1d1424';
  ctx.beginPath();
  ctx.rect(-headR * 0.6, headY - headR * 0.05, headR * 1.2, headR * 0.22);
  ctx.fill();
  olhos(ctx, 0, headY + headR * 0.1, headR * 0.85, dir, '#1b1020', '#ffe066', 0, lw);
}

function desenharAtirador(ctx, r, h, t, avanco, fase, lw, dir) {
  auraClasse(ctx, r, h, t, fase, 'rgba(120,200,120,0.45)');

  const headR = r * 0.74;
  const headY = -h + headR;
  const bodyW = r * 0.9;
  const bodyH = h * 0.52;
  const bodyTopY = headY + headR * 0.55;

  // Capa verde-escura atrás
  ctx.save();
  ctx.fillStyle = '#1f3f1c';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.45, bodyTopY + bodyH * 0.1);
  ctx.quadraticCurveTo(-bodyW * 0.8, bodyTopY + bodyH * 0.6,
                       -bodyW * 0.65, bodyTopY + bodyH * 1.0);
  ctx.lineTo(bodyW * 0.65, bodyTopY + bodyH * 1.0);
  ctx.quadraticCurveTo(bodyW * 0.8, bodyTopY + bodyH * 0.6,
                       bodyW * 0.45, bodyTopY + bodyH * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Aljava nas costas
  ctx.save();
  ctx.translate(-dir * bodyW * 0.35, bodyTopY + bodyH * 0.15);
  ctx.rotate(-dir * 0.35);
  ctx.fillStyle = '#4a2a10';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-r * 0.18, -r * 0.1, r * 0.36, r * 0.9);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const fx = (i - 1) * r * 0.12;
    ctx.strokeStyle = '#c9d3dc';
    ctx.lineWidth = Math.max(1, lw * 0.8);
    ctx.beginPath();
    ctx.moveTo(fx, -r * 0.1);
    ctx.lineTo(fx, -r * 0.75);
    ctx.stroke();
    ctx.fillStyle = i === 1 ? '#d63030' : '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(fx, -r * 0.75);
    ctx.lineTo(fx - r * 0.08, -r * 0.6);
    ctx.lineTo(fx + r * 0.08, -r * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Pernas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.28, bodyTopY + bodyH * 0.6, bodyW * 0.22, h * 0.14);
  ctx.rect(bodyW * 0.06, bodyTopY + bodyH * 0.6, bodyW * 0.22, h * 0.14);
  ctx.fill();
  ctx.stroke();

  // Túnica verde-escura
  corpoArredondado(ctx, -bodyW * 0.5, bodyTopY, bodyW, bodyH, '#2f5a2a', r, lw);
  // Cinto dourado
  ctx.fillStyle = '#e0b83a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-bodyW * 0.5, bodyTopY + bodyH * 0.55, bodyW, bodyH * 0.14);
  ctx.fill();
  ctx.stroke();

  // Braço de trás
  ctx.fillStyle = '#2f5a2a';
  ctx.beginPath();
  ctx.rect(-dir * bodyW * 0.72, bodyTopY + bodyH * 0.2, bodyW * 0.26, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Capuz verde-escuro
  ctx.fillStyle = '#1f3f1c';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.08, headR * 1.1, Math.PI * 0.95, Math.PI * 2.05);
  ctx.lineTo(headR * 1.08, headY + headR * 0.55);
  ctx.lineTo(headR * 0.55, headY + headR * 0.35);
  ctx.lineTo(-headR * 0.55, headY + headR * 0.35);
  ctx.lineTo(-headR * 1.08, headY + headR * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Sombra interna
  ctx.fillStyle = 'rgba(10,20,10,0.6)';
  ctx.beginPath();
  ctx.ellipse(0, headY - headR * 0.15, headR * 0.85, headR * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  olhos(ctx, 0, headY + headR * 0.12, headR, dir, '#1b1020', '#ffffff', 0, lw);

  // Monóculo dourado sobre um olho
  ctx.strokeStyle = '#e0b83a';
  ctx.lineWidth = Math.max(1.5, lw * 1.1);
  ctx.beginPath();
  ctx.arc(dir * headR * 0.42, headY + headR * 0.12, headR * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  // Corrente do monóculo
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.beginPath();
  ctx.moveTo(dir * headR * 0.42 + headR * 0.28, headY + headR * 0.35);
  ctx.quadraticCurveTo(dir * headR * 0.6, headY + headR * 0.7,
                       dir * headR * 0.3, headY + headR * 0.85);
  ctx.stroke();

  // Braço da frente + arco longo dourado
  const arcoX = dir * bodyW * 0.55;
  const arcoY = bodyTopY + bodyH * 0.35;
  ctx.fillStyle = '#2f5a2a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(dir * bodyW * 0.45, bodyTopY + bodyH * 0.2, bodyW * 0.28, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.translate(arcoX, arcoY);
  ctx.rotate(dir * (0.05 + avanco * 0.15));
  const arcoR = r * 1.35;
  // Madeira dourada
  ctx.strokeStyle = '#e0b83a';
  ctx.lineWidth = Math.max(2, lw * 1.5);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, arcoR, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // Corda
  const pux = avanco * arcoR * 0.9;
  const topX = Math.cos(-Math.PI * 0.55) * arcoR;
  const topY = Math.sin(-Math.PI * 0.55) * arcoR;
  const botX = Math.cos(Math.PI * 0.55) * arcoR;
  const botY = Math.sin(Math.PI * 0.55) * arcoR;
  ctx.strokeStyle = '#e8e0c8';
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(-pux, 0);
  ctx.lineTo(botX, botY);
  ctx.stroke();
  if (avanco > 0.05) {
    ctx.strokeStyle = '#c9d3dc';
    ctx.lineWidth = Math.max(1, lw * 0.9);
    ctx.beginPath();
    ctx.moveTo(-pux, 0);
    ctx.lineTo(arcoR * 0.9, 0);
    ctx.stroke();
    ctx.fillStyle = '#c9d3dc';
    ctx.beginPath();
    ctx.moveTo(arcoR * 0.9, 0);
    ctx.lineTo(arcoR * 0.75, -r * 0.08);
    ctx.lineTo(arcoR * 0.75, r * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function desenharSumoSacerdote(ctx, r, h, t, avanco, fase, lw, dir) {
  auraClasse(ctx, r, h, t, fase, 'rgba(255,235,150,0.6)');

  const headR = r * 0.74;
  const headY = -h + headR + r * 0.1;
  const bodyW = r * 0.95;
  const bodyH = h * 0.56;
  const bodyTopY = headY + headR * 0.55;

  // Vestes longas brancas e douradas
  ctx.fillStyle = '#f7f2e0';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.5, bodyTopY);
  ctx.lineTo(bodyW * 0.5, bodyTopY);
  ctx.lineTo(bodyW * 0.65, bodyTopY + bodyH);
  ctx.lineTo(-bodyW * 0.65, bodyTopY + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Faixa dourada central
  ctx.fillStyle = '#e0b83a';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.1, bodyTopY, bodyW * 0.2, bodyH);
  ctx.fill();
  ctx.stroke();
  // Cinto dourado
  ctx.beginPath();
  ctx.rect(-bodyW * 0.5, bodyTopY + bodyH * 0.55, bodyW, bodyH * 0.14);
  ctx.fill();
  ctx.stroke();

  // Cajado com sol grande
  ctx.save();
  ctx.translate(dir * r * 0.6, bodyTopY + bodyH * 0.3);
  ctx.rotate(dir * (0.1 - avanco * 0.35));
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = lw + 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 1.85);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // Halo grande
  const brilho = 0.4 + avanco * 0.55;
  const haloR = r * (0.75 + avanco * 0.3);
  const grad = ctx.createRadialGradient(0, -r * 2.0, r * 0.05, 0, -r * 2.0, haloR);
  grad.addColorStop(0, 'rgba(255,240,150,' + brilho.toFixed(3) + ')');
  grad.addColorStop(1, 'rgba(255,240,150,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, -r * 2.0, haloR, 0, Math.PI * 2);
  ctx.fill();
  // Sol grande
  ctx.fillStyle = '#ffd24a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, -r * 2.0, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Raios
  const raios = 10;
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = Math.max(1, lw * 0.9);
  for (let i = 0; i < raios; i++) {
    const ang = (i / raios) * Math.PI * 2 + t * 0.7;
    const r1 = r * 0.44, r2 = r * 0.6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r1, -r * 2.0 + Math.sin(ang) * r1);
    ctx.lineTo(Math.cos(ang) * r2, -r * 2.0 + Math.sin(ang) * r2);
    ctx.stroke();
  }
  ctx.restore();

  // Braço oposto
  ctx.fillStyle = '#f7f2e0';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-dir * bodyW * 0.72, bodyTopY + bodyH * 0.2, bodyW * 0.26, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#f2c79a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mitra alta
  ctx.fillStyle = '#f7f2e0';
  ctx.beginPath();
  ctx.moveTo(-headR * 1.05, headY - headR * 0.1);
  ctx.lineTo(headR * 1.05, headY - headR * 0.1);
  ctx.lineTo(headR * 0.55, headY - headR * 1.9);
  ctx.lineTo(-headR * 0.55, headY - headR * 1.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Detalhe dourado na mitra
  ctx.strokeStyle = '#e0b83a';
  ctx.lineWidth = Math.max(1, lw * 0.9);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.9, headY - headR * 0.35);
  ctx.lineTo(headR * 0.9, headY - headR * 0.35);
  ctx.stroke();
  // Sol na testa da mitra
  ctx.fillStyle = '#ffd24a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.9, headR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rosto gentil
  olhos(ctx, 0, headY + headR * 0.15, headR, dir, '#1b1020', '#ffffff', 0, lw);
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.22, headY + headR * 0.55);
  ctx.quadraticCurveTo(0, headY + headR * 0.72, headR * 0.22, headY + headR * 0.55);
  ctx.stroke();

  // Halo maior
  ctx.save();
  ctx.globalAlpha *= 0.9;
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = Math.max(2, lw * 1.3);
  ctx.beginPath();
  ctx.ellipse(0, headY - headR * 2.15, headR * 0.75, headR * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// --- Monstros novos ------------------------------------------------------

function desenharGoblinArqueiro(ctx, r, h, t, avanco, fase, lw, dir) {
  const headR = r * 0.82;
  const saltito = Math.abs(Math.sin(t * 6 + fase)) * r * 0.14;
  const headY = -h + headR + saltito * 0.4;
  const bodyW = r * 0.85;
  const bodyH = h * 0.44 - saltito * 0.2;
  const bodyTopY = headY + headR * 0.5;

  // Pernas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#3e7a26';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.3, bodyTopY + bodyH * 0.65, bodyW * 0.22, h * 0.12);
  ctx.rect(bodyW * 0.08, bodyTopY + bodyH * 0.65, bodyW * 0.22, h * 0.12);
  ctx.fill();
  ctx.stroke();

  // Corpo verde
  ctx.fillStyle = '#5cc04a';
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.5, bodyTopY + bodyH);
  ctx.quadraticCurveTo(-bodyW * 0.65, bodyTopY, 0, bodyTopY - bodyH * 0.15);
  ctx.quadraticCurveTo(bodyW * 0.65, bodyTopY, bodyW * 0.5, bodyTopY + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Barriga
  ctx.fillStyle = '#a8d97a';
  ctx.beginPath();
  ctx.ellipse(0, bodyTopY + bodyH * 0.55, bodyW * 0.28, bodyH * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cabeça
  ctx.fillStyle = '#5cc04a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Orelhas
  const orelhaLarg = headR * 0.85;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.85, headY - headR * 0.15);
  ctx.lineTo(-headR * 0.85 - orelhaLarg, headY - headR * 0.45);
  ctx.lineTo(-headR * 0.85, headY + headR * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headR * 0.85, headY - headR * 0.15);
  ctx.lineTo(headR * 0.85 + orelhaLarg, headY - headR * 0.45);
  ctx.lineTo(headR * 0.85, headY + headR * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Capuz de couro marrom
  ctx.fillStyle = '#6b3a1e';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.1, headR * 1.05, Math.PI * 0.95, Math.PI * 2.05);
  ctx.lineTo(headR * 1.02, headY + headR * 0.45);
  ctx.lineTo(headR * 0.5, headY + headR * 0.3);
  ctx.lineTo(-headR * 0.5, headY + headR * 0.3);
  ctx.lineTo(-headR * 1.02, headY + headR * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Sombra interna
  ctx.fillStyle = 'rgba(20,10,5,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, headY - headR * 0.1, headR * 0.8, headR * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Olhos
  olhos(ctx, 0, headY, headR, dir, '#1b1020', '#e8e22a', 0, lw);

  // Braço de trás
  ctx.fillStyle = '#5cc04a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-dir * bodyW * 0.72, bodyTopY + bodyH * 0.2, bodyW * 0.26, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Braço da frente
  ctx.beginPath();
  ctx.rect(dir * bodyW * 0.45, bodyTopY + bodyH * 0.2, bodyW * 0.28, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Arco curto
  ctx.save();
  ctx.translate(dir * bodyW * 0.6, bodyTopY + bodyH * 0.35);
  ctx.rotate(dir * (0.05 + avanco * 0.15));
  const arcoR = r * 0.85;
  ctx.strokeStyle = '#6b3a1e';
  ctx.lineWidth = Math.max(2, lw * 1.3);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, arcoR, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.stroke();
  ctx.lineCap = 'butt';
  const pux = avanco * arcoR * 0.9;
  const topX = Math.cos(-Math.PI * 0.55) * arcoR;
  const topY = Math.sin(-Math.PI * 0.55) * arcoR;
  const botX = Math.cos(Math.PI * 0.55) * arcoR;
  const botY = Math.sin(Math.PI * 0.55) * arcoR;
  ctx.strokeStyle = '#e8e0c8';
  ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(-pux, 0);
  ctx.lineTo(botX, botY);
  ctx.stroke();
  if (avanco > 0.05) {
    ctx.strokeStyle = '#c9d3dc';
    ctx.lineWidth = Math.max(1, lw * 0.9);
    ctx.beginPath();
    ctx.moveTo(-pux, 0);
    ctx.lineTo(arcoR * 0.9, 0);
    ctx.stroke();
    ctx.fillStyle = '#c9d3dc';
    ctx.beginPath();
    ctx.moveTo(arcoR * 0.9, 0);
    ctx.lineTo(arcoR * 0.75, -r * 0.07);
    ctx.lineTo(arcoR * 0.75, r * 0.07);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function desenharOgro(ctx, r, h, t, avanco, fase, lw, dir) {
  // Ogro é bem maior: usa raio ampliado internamente.
  const R = r * 1.35;
  const H = h * 1.15;

  const headR = R * 0.62;
  const headY = -H + headR;
  const bodyW = R * 1.15;
  const bodyH = H * 0.55;
  const bodyTopY = headY + headR * 0.55;

  // Pernas grossas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#6a7a4a';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.35, bodyTopY + bodyH * 0.62, bodyW * 0.28, H * 0.16);
  ctx.rect(bodyW * 0.07, bodyTopY + bodyH * 0.62, bodyW * 0.28, H * 0.16);
  ctx.fill();
  ctx.stroke();

  // Corpo cinza-esverdeado
  corpoArredondado(ctx, -bodyW * 0.5, bodyTopY, bodyW, bodyH, '#8a9a6a', R, lw);
  // Barriga
  ctx.fillStyle = '#b0bd8a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, bodyTopY + bodyH * 0.6, bodyW * 0.32, bodyH * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tanga
  ctx.fillStyle = '#6b3a1e';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.5, bodyTopY + bodyH * 0.82, bodyW, bodyH * 0.22);
  ctx.fill();
  ctx.stroke();

  // Braço de trás
  ctx.fillStyle = '#8a9a6a';
  ctx.beginPath();
  ctx.rect(-dir * bodyW * 0.72, bodyTopY + bodyH * 0.15, bodyW * 0.3, bodyH * 0.55);
  ctx.fill();
  ctx.stroke();

  // Braço da frente (levanta com avanco)
  ctx.save();
  ctx.translate(dir * bodyW * 0.55, bodyTopY + bodyH * 0.25);
  ctx.rotate(dir * (-avanco * 1.2));
  ctx.fillStyle = '#8a9a6a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-bodyW * 0.15, 0, bodyW * 0.3, bodyH * 0.55);
  ctx.fill();
  ctx.stroke();

  // Porrete de madeira com cravos
  ctx.save();
  ctx.translate(0, bodyH * 0.5);
  ctx.rotate(-0.3 + avanco * 1.4);
  ctx.fillStyle = '#6b3a1e';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-R * 0.1, 0);
  ctx.lineTo(-R * 0.18, -R * 0.9);
  ctx.lineTo(R * 0.18, -R * 0.9);
  ctx.lineTo(R * 0.1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Cravos
  ctx.fillStyle = '#c9d3dc';
  for (let i = 0; i < 3; i++) {
    const cy = -R * (0.3 + i * 0.22);
    ctx.beginPath();
    ctx.arc(-R * 0.1, cy, R * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(R * 0.1, cy, R * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();

  // Cabeça
  ctx.fillStyle = '#8a9a6a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Orelhas pontudas
  ctx.beginPath();
  ctx.moveTo(-headR * 0.9, headY - headR * 0.1);
  ctx.lineTo(-headR * 1.35, headY - headR * 0.35);
  ctx.lineTo(-headR * 0.9, headY + headR * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headR * 0.9, headY - headR * 0.1);
  ctx.lineTo(headR * 1.35, headY - headR * 0.35);
  ctx.lineTo(headR * 0.9, headY + headR * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Olhos pequenos e vermelhos
  olhos(ctx, 0, headY, headR, dir, '#1b1020', '#d63030', 0, lw);

  // Sobrancelhas grossas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(2, lw * 1.2);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.6, headY - headR * 0.4);
  ctx.lineTo(-headR * 0.15, headY - headR * 0.2);
  ctx.moveTo(headR * 0.6, headY - headR * 0.4);
  ctx.lineTo(headR * 0.15, headY - headR * 0.2);
  ctx.stroke();

  // Boca com presas
  ctx.beginPath();
  ctx.moveTo(-headR * 0.35, headY + headR * 0.5);
  ctx.quadraticCurveTo(0, headY + headR * 0.7, headR * 0.35, headY + headR * 0.5);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-headR * 0.25, headY + headR * 0.55);
  ctx.lineTo(-headR * 0.15, headY + headR * 0.75);
  ctx.lineTo(-headR * 0.05, headY + headR * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headR * 0.25, headY + headR * 0.55);
  ctx.lineTo(headR * 0.15, headY + headR * 0.75);
  ctx.lineTo(headR * 0.05, headY + headR * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function desenharMorcego(ctx, r, h, t, avanco, fase,lw, dir) {
  // Morcego pequeno, voa um pouco acima do chão.
  const voo = r * 0.55 + Math.sin(t * 4 + fase) * r * 0.08;
  const cy = -h * 0.55 - voo;
  const bodyR = r * 0.55;

  // Asas batendo rápido (anim.t)
  const bate = Math.sin(t * 22 + fase);
  const asaY = bate * r * 0.35;
  const asaAbertura = 0.6 + Math.abs(bate) * 0.4;

  // Asa esquerda
  ctx.save();
  ctx.translate(-bodyR * 0.6, cy);
  ctx.fillStyle = '#3a1a4a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-r * 1.1 * asaAbertura, -r * 0.5 + asaY,
                       -r * 1.5 * asaAbertura, r * 0.1 + asaY);
  ctx.quadraticCurveTo(-r * 1.0 * asaAbertura, r * 0.35 + asaY,
                       -r * 0.7 * asaAbertura, r * 0.15 + asaY);
  ctx.quadraticCurveTo(-r * 0.5 * asaAbertura, r * 0.4 + asaY,
                       0, r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Asa direita
  ctx.save();
  ctx.translate(bodyR * 0.6, cy);
  ctx.fillStyle = '#3a1a4a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(r * 1.1 * asaAbertura, -r * 0.5 + asaY,
                       r * 1.5 * asaAbertura, r * 0.1 + asaY);
  ctx.quadraticCurveTo(r * 1.0 * asaAbertura, r * 0.35 + asaY,
                       r * 0.7 * asaAbertura, r * 0.15 + asaY);
  ctx.quadraticCurveTo(r * 0.5 * asaAbertura, r * 0.4 + asaY,
                       0, r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Corpo roxo-escuro
  ctx.fillStyle = '#5a2b6e';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, cy, bodyR * 0.85, bodyR * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Orelhas pontudas
  ctx.beginPath();
  ctx.moveTo(-bodyR * 0.5, cy - bodyR * 0.7);
  ctx.lineTo(-bodyR * 0.75, cy - bodyR * 1.6);
  ctx.lineTo(-bodyR * 0.15, cy - bodyR * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyR * 0.5, cy - bodyR * 0.7);
  ctx.lineTo(bodyR * 0.75, cy - bodyR * 1.6);
  ctx.lineTo(bodyR * 0.15, cy - bodyR * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Olhos vermelhos
  olhos(ctx, 0, cy - bodyR * 0.1, bodyR * 0.7, dir, '#d63030', '#ff6060', bodyR, lw);

  // Presas pequenas
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.beginPath();
  ctx.moveTo(-bodyR * 0.2, cy + bodyR * 0.5);
  ctx.lineTo(-bodyR * 0.12, cy + bodyR * 0.75);
  ctx.lineTo(-bodyR * 0.04, cy + bodyR * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyR * 0.2, cy + bodyR * 0.5);
  ctx.lineTo(bodyR * 0.12, cy + bodyR * 0.75);
  ctx.lineTo(bodyR * 0.04, cy + bodyR * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function desenharXamaGoblin(ctx, r, h, t, avanco, fase, lw, dir) {
  const headR = r * 0.82;
  const saltito = Math.abs(Math.sin(t * 5 + fase)) * r * 0.12;
  const headY = -h + headR + saltito * 0.4;
  const bodyW = r * 0.88;
  const bodyH = h * 0.45 - saltito * 0.2;
  const bodyTopY = headY + headR * 0.5;

  // Pernas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#3e7a26';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.3, bodyTopY + bodyH * 0.65, bodyW * 0.22, h * 0.12);
  ctx.rect(bodyW * 0.08, bodyTopY + bodyH * 0.65, bodyW * 0.22, h * 0.12);
  ctx.fill();
  ctx.stroke();

  // Corpo verde com tanga de couro
  ctx.fillStyle = '#5cc04a';
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.5, bodyTopY + bodyH);
  ctx.quadraticCurveTo(-bodyW * 0.65, bodyTopY, 0, bodyTopY - bodyH * 0.15);
  ctx.quadraticCurveTo(bodyW * 0.65, bodyTopY, bodyW * 0.5, bodyTopY + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Tanga
  ctx.fillStyle = '#6b3a1e';
  ctx.beginPath();
  ctx.rect(-bodyW * 0.5, bodyTopY + bodyH * 0.75, bodyW, bodyH * 0.25);
  ctx.fill();
  ctx.stroke();
  // Colar de penas
  ctx.fillStyle = '#e8e22a';
  for (let i = 0; i < 5; i++) {
    const px = (i - 2) * bodyW * 0.18;
    ctx.beginPath();
    ctx.moveTo(px, bodyTopY + bodyH * 0.05);
    ctx.lineTo(px - r * 0.05, bodyTopY + bodyH * 0.25);
    ctx.lineTo(px + r * 0.05, bodyTopY + bodyH * 0.25);
    ctx.closePath();
    ctx.fill();
  }

  // Cajado com caveira
  ctx.save();
  ctx.translate(dir * r * 0.6, bodyTopY + bodyH * 0.3);
  ctx.rotate(dir * (0.1 - avanco * 0.35));
  ctx.strokeStyle = '#4a2a10';
  ctx.lineWidth = lw + 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 1.6);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // Brilho verde (mais forte com avanco)
  const brilho = 0.3 + avanco * 0.6;
  const haloR = r * (0.55 + avanco * 0.3);
  const grad = ctx.createRadialGradient(0, -r * 1.75, r * 0.05, 0, -r * 1.75, haloR);
  grad.addColorStop(0, 'rgba(120,255,120,' + brilho.toFixed(3) + ')');
  grad.addColorStop(1, 'rgba(120,255,120,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, -r * 1.75, haloR, 0, Math.PI * 2);
  ctx.fill();
  // Caveira
  ctx.fillStyle = '#f2e6c8';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, -r * 1.75, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Olhos da caveira
  ctx.fillStyle = '#1d1424';
  ctx.beginPath();
  ctx.arc(-r * 0.1, -r * 1.78, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.1, -r * 1.78, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // Mandíbula
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, -r * 1.62);
  ctx.lineTo(r * 0.12, -r * 1.62);
  ctx.stroke();
  ctx.restore();

  // Braço oposto
  ctx.fillStyle = '#5cc04a';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.rect(-dir * bodyW * 0.72, bodyTopY + bodyH * 0.2, bodyW * 0.26, bodyH * 0.5);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#5cc04a';
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Orelhas
  const orelhaLarg = headR * 0.85;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.85, headY - headR * 0.15);
  ctx.lineTo(-headR * 0.85 - orelhaLarg, headY - headR * 0.45);
  ctx.lineTo(-headR * 0.85, headY + headR * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headR * 0.85, headY - headR * 0.15);
  ctx.lineTo(headR * 0.85 + orelhaLarg, headY - headR * 0.45);
  ctx.lineTo(headR * 0.85, headY + headR * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Máscara de osso
  ctx.fillStyle = '#f2e6c8';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.05, headR * 0.95, Math.PI * 0.9, Math.PI * 2.1);
  ctx.lineTo(headR * 0.9, headY + headR * 0.35);
  ctx.lineTo(headR * 0.4, headY + headR * 0.5);
  ctx.lineTo(-headR * 0.4, headY + headR * 0.5);
  ctx.lineTo(-headR * 0.9, headY + headR * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Buracos dos olhos na máscara
  ctx.fillStyle = '#1d1424';
  ctx.beginPath();
  ctx.ellipse(-headR * 0.35, headY, headR * 0.2, headR * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headR * 0.35, headY, headR * 0.2, headR * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  // Olhos verdes brilhando dentro dos buracos
  ctx.fillStyle = '#7dff7d';
  ctx.beginPath();
  ctx.arc(-headR * 0.35, headY, headR * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headR * 0.35, headY, headR * 0.08, 0, Math.PI * 2);
  ctx.fill();
  // Nariz da caveira
  ctx.fillStyle = '#1d1424';
  ctx.beginPath();
  ctx.moveTo(0, headY + headR * 0.05);
  ctx.lineTo(-headR * 0.08, headY + headR * 0.25);
  ctx.lineTo(headR * 0.08, headY + headR * 0.25);
  ctx.closePath();
  ctx.fill();
  // Dentes
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = Math.max(1, lw * 0.6);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * headR * 0.12, headY + headR * 0.35);
    ctx.lineTo(i * headR * 0.12, headY + headR * 0.5);
    ctx.stroke();
  }

  // Penas no topo da cabeça
  const penas = ['#d63030', '#e8e22a', '#3d6fd1'];
  for (let i = 0; i < 3; i++) {
    const ang = -Math.PI / 2 + (i - 1) * 0.4 + Math.sin(t * 3 + fase + i) * 0.05;
    const px = Math.cos(ang) * headR * 1.1;
    const py = headY - headR * 0.6 + Math.sin(ang) * headR * 0.5;
    ctx.fillStyle = penas[i];
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = Math.max(1, lw * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, headY - headR * 0.7);
    ctx.lineTo(px, py - headR * 0.6);
    ctx.lineTo(px + headR * 0.1, py - headR * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// --- Efeitos -------------------------------------------------------------

function desenharExclamacao(ctx, r, h, t, fase, lw) {
  const pulso = 1 + Math.sin(t * 8 + fase) * 0.12;
  const y = -h - r * 0.5;
  ctx.save();
  ctx.translate(0, y);
  ctx.scale(pulso, pulso);
  ctx.fillStyle = '#e03030';
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, -r * 0.55);
  ctx.lineTo(r * 0.12, -r * 0.55);
  ctx.lineTo(r * 0.06, r * 0.05);
  ctx.lineTo(-r * 0.06, r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, r * 0.22, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function desenharChamas(ctx, r, h, t, fase, lw) {
  const n = 3;
  for (let i = 0; i < n; i++) {
    const fx = (i - 1) * r * 0.55 + Math.sin(t * 9 + fase + i) * r * 0.08;
    const fy = -h * (0.35 + i * 0.18) + Math.cos(t * 11 + fase + i * 1.7) * r * 0.1;
    const s = r * (0.28 + (i % 2) * 0.08) * (0.9 + Math.sin(t * 13 + i) * 0.15);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.fillStyle = '#ff8a2b';
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.4);
    ctx.quadraticCurveTo(s, -s * 0.2, 0, s * 0.6);
    ctx.quadraticCurveTo(-s, -s * 0.2, 0, -s * 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Helpers de desenho --------------------------------------------------

function corpoArredondado(ctx, x, y, w, h, cor, r, lw) {
  ctx.fillStyle = cor;
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = lw;
  arredondarRetangulo(ctx, x, y, w, h, r * 0.35);
  ctx.fill();
  ctx.stroke();
}

function arredondarRetangulo(ctx, x, y, w, h, rad) {
  const rr = Math.min(rad, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Olhos expressivos proporcionais. lw controla a espessura do contorno.
function olhos(ctx, cx, cy, headR, dir, corPupila, corIris, escalaExtra, lw) {
  const sep = headR * 0.42;
  const eyeR = headR * 0.28 * (escalaExtra ? 1.15 : 1);
  const eyeY = cy + headR * 0.05;
  const lwOlho = Math.max(1, (lw || 2) * 0.7);
  for (let i = 0; i < 2; i++) {
    const ex = cx + (i === 0 ? -sep : sep) + dir * headR * 0.05;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = lwOlho;
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = corPupila || '#1b1020';
    ctx.beginPath();
    ctx.arc(ex + dir * eyeR * 0.15, eyeY + eyeR * 0.05, eyeR * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + dir * eyeR * 0.15 - eyeR * 0.18, eyeY - eyeR * 0.18, eyeR * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

function desenharEstrela(ctx, cx, cy, raio, pontas) {
  ctx.beginPath();
  for (let i = 0; i < pontas * 2; i++) {
    const ang = (i / (pontas * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = (i % 2 === 0) ? raio : raio * 0.45;
    const px = cx + Math.cos(ang) * rr;
    const py = cy + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}