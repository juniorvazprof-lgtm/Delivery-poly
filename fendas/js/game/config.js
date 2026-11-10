// Fendas · protótipo bullet heaven vertical. Todos os números de equilíbrio ficam aqui.
// Unidades do mundo: 1 = altura aproximada do Mago. Tempos em segundos.
export const CFG = {
  sim: { dt: 1 / 60, maxSteps: 4 },
  pixel: { targetH: 340 },                     // altura interna da imagem (pixels); o resto é ampliado sem suavizar
  cam: { viewH: 17, offset: [0, 10, 9], follow: 8 },
  runTime: 480,                                // 8 minutos até o Guardião

  mage: { hp: 100, speed: 3.3, radius: 0.32, iframes: 0.45, magnet: 2.0, slots: 4, passiveSlots: 4 },

  // XP para o próximo nível
  xpFor: lvl => Math.floor(5 + lvl * 4.5 + Math.pow(lvl, 1.6)),

  // ---- feitiços (nível 1 a 5); cada linha lista os valores por nível ----
  spells: {
    fogo: { name: 'Bola de fogo', glyph: '✹', color: '#ff8a3d', el: 'fogo',
      desc: ['Lança uma bola de fogo no inimigo mais próximo; explode em área.', '+1 bola de fogo', '+dano e explosão maior', '+1 bola de fogo', 'Recarga muito menor'],
      cd: [1.0, 0.95, 0.9, 0.85, 0.65], count: [1, 2, 2, 3, 3], dmg: [14, 15, 19, 22, 26], radius: [0.9, 0.95, 1.2, 1.25, 1.35], speed: 9, burn: 2 },
    agua: { name: 'Onda de água', glyph: '≈', color: '#3fb8ff', el: 'agua',
      desc: ['Pulso de água em volta do Mago: empurra e deixa os inimigos encharcados (lentos).', '+alcance', '+dano', '+alcance e mais frequente', 'Empurrão enorme'],
      cd: [3.0, 2.8, 2.6, 2.2, 2.0], radius: [2.1, 2.5, 2.6, 3.0, 3.3], dmg: [8, 9, 14, 15, 18], push: [5, 5.5, 6, 6.5, 9], soak: 2.2 },
    vento: { name: 'Lâmina de vento', glyph: '❯', color: '#c8f5ff', el: 'vento',
      desc: ['Lâminas de ar que atravessam vários inimigos.', '+1 lâmina', '+atravessa mais', '+1 lâmina e +dano', '+2 lâminas'],
      cd: [1.0, 0.95, 0.9, 0.85, 0.75], count: [2, 3, 3, 4, 6], pierce: [3, 3, 6, 6, 8], dmg: [9, 9, 11, 14, 15], speed: 12, life: 0.85 },
    arcano: { name: 'Orbe arcano', glyph: '◉', color: '#c58bff', el: 'arcano',
      desc: ['Orbes que giram em volta do Mago e ferem quem encostar.', '+1 orbe', '+dano e giro mais rápido', '+1 orbe', '+1 orbe e raio maior'],
      count: [1, 2, 2, 3, 4], dmg: [7, 8, 11, 12, 14], radius: [1.5, 1.55, 1.6, 1.7, 2.0], spin: [2.4, 2.4, 3.2, 3.3, 3.5], hitEvery: 0.45 },
    raio: { name: 'Raio', glyph: 'ϟ', color: '#fff27a', el: 'raio',
      desc: ['Raios atingem inimigos aleatórios e saltam para os vizinhos. Encharcados tomam muito mais dano.', '+1 salto', '+1 raio', '+dano e +1 salto', '+1 raio e recarga menor'],
      cd: [1.7, 1.6, 1.5, 1.4, 1.0], strikes: [1, 1, 2, 2, 3], chains: [1, 2, 2, 3, 3], dmg: [16, 17, 19, 25, 28], range: 6.5, soakMul: 1.8 },
    terra: { name: 'Espinhos de terra', glyph: '▲', color: '#c9a36b', el: 'terra',
      desc: ['Espinhos brotam do chão perto do Mago, ferem e prendem por um instante.', '+1 espinho', '+dano', '+2 espinhos', 'Espinhos maiores e mais frequentes'],
      cd: [2.2, 2.1, 2.0, 1.9, 1.5], count: [2, 3, 3, 5, 5], dmg: [12, 13, 18, 19, 24], radius: [0.8, 0.8, 0.85, 0.9, 1.15], root: 0.6 },
  },

  // ---- fusões: dois feitiços no nível 5 viram um feitiço evoluído (libera um espaço) ----
  fusions: {
    vapor: { name: 'Vapor escaldante', glyph: '☁', color: '#ffd6b0', from: ['fogo', 'agua'],
      desc: 'Nuvens de vapor explodem sobre os inimigos e atordoam todos em volta.', cd: 1.6, count: 3, dmg: 46, radius: 2.0, stun: 1.0 },
    tempestade: { name: 'Tempestade de fogo', glyph: '✷', color: '#ff6a2a', from: ['fogo', 'vento'],
      desc: 'Três tornados de fogo vagam em volta do Mago queimando tudo que tocam.', count: 3, dmg: 9, tick: 0.22, radius: 0.8, orbit: 3.0 },
    nevasca: { name: 'Nevasca', glyph: '❄', color: '#bfe9ff', from: ['agua', 'vento'],
      desc: 'Aura gelada: inimigos por perto ficam lentos e congelam a cada pulso.', radius: 3.2, dmg: 7, tick: 0.5, slow: 0.4, freezeEvery: 3.5, freeze: 1.4 },
    tormenta: { name: 'Tormenta arcana', glyph: '✺', color: '#e0b8ff', from: ['raio', 'arcano'],
      desc: 'Os orbes viram esferas de raio que disparam descargas em cadeia.', count: 4, dmg: 14, radius: 2.0, spin: 3.4, zapEvery: 0.7, zapDmg: 22 },
  },

  // ---- passivas (nível 1 a 5) ----
  passives: {
    poder: { name: 'Poder', glyph: '✦', color: '#ff7ad9', desc: '+12% de dano em todos os feitiços.', per: 0.12 },
    pressa: { name: 'Pressa', glyph: '⏱', color: '#9be7f2', desc: 'Feitiços recarregam 8% mais rápido.', per: 0.08 },
    alcance: { name: 'Alcance', glyph: '◎', color: '#8fd06a', desc: '+12% de área dos feitiços.', per: 0.12 },
    ima: { name: 'Ímã', glyph: '⊂', color: '#ffc96b', desc: '+40% de alcance para atrair cristais.', per: 0.4 },
    vigor: { name: 'Vigor', glyph: '♥', color: '#ff5a6a', desc: '+20 de vida máxima e regenera 0,4 por segundo.', hp: 20, regen: 0.4 },
    passo: { name: 'Passo leve', glyph: '»', color: '#c9a6ff', desc: '+8% de velocidade.', per: 0.08 },
  },

  // ---- inimigos (Ressonas sombrias); tint escurece as cores, os olhos brilhantes ficam ----
  enemies: {
    rastejante: { model: 'brogume', scale: 0.38, hp: 7, speed: 1.9, radius: 0.24, dmg: 6, xp: 1, tint: 0.55 },
    espectro: { model: 'velamen', scale: 0.4, hp: 13, speed: 2.25, radius: 0.27, dmg: 8, xp: 1, tint: 0.45, float: true },
    investida: { model: 'volteiro', scale: 0.33, hp: 16, speed: 1.6, radius: 0.27, dmg: 10, xp: 2, tint: 0.5, dash: { every: 3.2, speed: 8, time: 0.45, windup: 0.5 } },
    brutamonte: { model: 'cascalco', scale: 0.5, hp: 60, speed: 1.15, radius: 0.42, dmg: 14, xp: 4, tint: 0.5, heavy: true },
    cuspidor: { model: 'fanaluz', scale: 0.42, hp: 20, speed: 1.4, radius: 0.3, dmg: 8, xp: 3, tint: 0.5, ranged: { keep: 4.5, every: 2.6, speed: 3.6, dmg: 9 } },
    minichefe: { model: 'ferfogo', scale: 1.0, hp: 900, speed: 1.35, radius: 0.75, dmg: 20, xp: 60, tint: 0.6, heavy: true, boss: 'mini' },
    guardiao: { model: 'arborion', scale: 1.5, hp: 5200, speed: 1.25, radius: 1.0, dmg: 28, xp: 0, tint: 0.55, heavy: true, boss: 'final' },
  },
  elite: { chanceFrom: 150, chance: 0.04, hp: 7, scale: 1.45, xp: 12, speed: 1.1 },

  // ---- diretor: o que nasce em cada minuto (pesos) e quantos por segundo ----
  waves: [
    { from: 0, mix: { rastejante: 1 } },
    { from: 50, mix: { rastejante: 3, espectro: 1 } },
    { from: 110, mix: { rastejante: 3, espectro: 2, investida: 1 } },
    { from: 170, mix: { rastejante: 2, espectro: 2, investida: 1, brutamonte: 1 } },
    { from: 250, mix: { rastejante: 2, espectro: 2, investida: 2, brutamonte: 1, cuspidor: 1 } },
    { from: 360, mix: { espectro: 3, investida: 2, brutamonte: 2, cuspidor: 2 } },
  ],
  spawnRate: t => Math.min(26, 0.9 + t / 18 + Math.pow(t / 120, 2)),   // inimigos por segundo
  hpScale: t => 1 + t / 80 + Math.pow(t / 240, 2),
  maxAlive: 380,
  miniboss: 240,
  // eventos da Fenda (segundo em que começam)
  events: [
    { at: 85, kind: 'surto' }, { at: 150, kind: 'cercado' }, { at: 205, kind: 'horda' },
    { at: 300, kind: 'surto' }, { at: 345, kind: 'cercado' }, { at: 420, kind: 'horda' },
  ],
  eventInfo: {
    surto: { name: 'SURTO DE MANA', sub: 'Cristais valem o dobro', color: '#5ff2ff', dur: 20 },
    cercado: { name: 'CERCADO!', sub: 'A Fenda fecha o cerco', color: '#ff4f8b', dur: 4 },
    horda: { name: 'HORDA', sub: 'O triplo de inimigos', color: '#ffb15a', dur: 15 },
  },
  combo: { window: 1.6 },
};
