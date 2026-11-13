// Fendas · protótipo bullet heaven vertical. Todos os números de equilíbrio ficam aqui.
// Unidades do mundo: 1 = altura aproximada do Mago. Tempos em segundos.
export const CFG = {
  sim: { dt: 1 / 60, maxSteps: 4 },
  pixel: { on: false, targetH: 400 },                     // altura interna da imagem (pixels); o resto é ampliado sem suavizar
  cam: { viewH: 27, offset: [0, 10, 9], follow: 8 },
  runTime: 480,                                // 8 minutos até o Guardião

  reach: 4.2,                                  // alcance base de mira dos feitiços (cresce com Alcance)
  mage: { hp: 100, speed: 3.3, radius: 0.32, iframes: 0.45, magnet: 2.6, slots: 4, passiveSlots: 4, rerolls: 2, bans: 2 },

  // XP para o próximo nível
  xpFor: lvl => Math.floor(4 + lvl * 2.6 + Math.pow(lvl, 1.62)),   // cada nível pede mais cristais

  // ---- feitiços (nível 1 a 5); cada linha lista os valores por nível ----
  spells: {
    fogo: { name: 'Bola de fogo', glyph: '✹', color: '#ff8a3d', el: 'fogo',
      desc: ['Lança uma bola de fogo no inimigo mais próximo; explode em área.', '+1 bola de fogo', '+dano e explosão maior', '+1 bola de fogo', 'Recarga muito menor'],
      cd: [1.0, 0.95, 0.9, 0.85, 0.65], count: [1, 2, 2, 3, 3], dmg: [20, 21, 27, 31, 36], radius: [0.9, 0.95, 1.2, 1.25, 1.35], speed: 9, burn: 2 },
    agua: { name: 'Onda de água', glyph: '≈', color: '#3fb8ff', el: 'agua',
      desc: ['Pulso de água em volta do Mago: empurra e deixa os inimigos encharcados (lentos).', '+alcance', '+dano', '+alcance e mais frequente', 'Empurrão enorme'],
      cd: [3.0, 2.8, 2.6, 2.2, 2.0], radius: [2.1, 2.5, 2.6, 3.0, 3.3], dmg: [11, 13, 20, 21, 25], push: [5, 5.5, 6, 6.5, 9], soak: 2.2 },
    vento: { name: 'Lâmina de vento', glyph: '❯', color: '#c8f5ff', el: 'vento',
      desc: ['Lâminas de ar que atravessam vários inimigos.', '+1 lâmina', '+atravessa mais', '+1 lâmina e +dano', '+2 lâminas'],
      cd: [1.0, 0.95, 0.9, 0.85, 0.75], count: [2, 3, 3, 4, 6], pierce: [3, 3, 6, 6, 8], dmg: [13, 13, 15, 20, 21], speed: 12, life: 0.85 },
    arcano: { name: 'Orbe arcano', glyph: '◉', color: '#c58bff', el: 'arcano',
      desc: ['Orbes que giram em volta do Mago e ferem quem encostar.', '+1 orbe', '+dano e giro mais rápido', '+1 orbe', '+1 orbe e raio maior'],
      count: [1, 2, 2, 3, 4], dmg: [10, 11, 15, 17, 20], radius: [1.5, 1.55, 1.6, 1.7, 2.0], spin: [2.4, 2.4, 3.2, 3.3, 3.5], hitEvery: 0.45 },
    raio: { name: 'Raio', glyph: 'ϟ', color: '#fff27a', el: 'raio',
      desc: ['Raios atingem inimigos aleatórios e saltam para os vizinhos. Encharcados tomam muito mais dano.', '+1 salto', '+1 raio', '+dano e +1 salto', '+1 raio e recarga menor'],
      cd: [1.7, 1.6, 1.5, 1.4, 1.0], strikes: [1, 1, 2, 2, 3], chains: [1, 2, 2, 3, 3], dmg: [22, 24, 27, 35, 39], range: 6.5, soakMul: 1.8 },
    terra: { name: 'Espinhos de terra', glyph: '▲', color: '#c9a36b', el: 'terra',
      desc: ['Espinhos brotam do chão perto do Mago, ferem e prendem por um instante.', '+1 espinho', '+dano', '+2 espinhos', 'Espinhos maiores e mais frequentes'],
      cd: [2.2, 2.1, 2.0, 1.9, 1.5], count: [2, 2, 3, 3, 4], dmg: [17, 18, 25, 27, 34], radius: [0.8, 0.8, 0.85, 0.9, 1.15], root: 0.25 },
    // ---- poderes "absurdos": grandes, raros e com recarga longa ----
    anel: { name: 'Anel de fogo', glyph: '◯', color: '#ff5a1f', el: 'fogo', big: true,
      desc: ['Um pequeno anel de fogo gira em volta do Mago e queima quem toca nele.', 'Anel maior', '+dano', 'Anel maior e queima mais rápido', 'Anel enorme: a cada 5 s solta uma onda de fogo'],
      radius: [1.1, 1.5, 1.6, 2.1, 2.6], band: 0.45, dmg: [4, 5, 6, 8, 11], tick: [0.5, 0.48, 0.44, 0.38, 0.32], waveEvery: 5, wave: 60 },
    meteoro: { name: 'Chuva de meteoros', glyph: '☄', color: '#ffb15a', el: 'fogo', big: true,
      desc: ['Um meteoro cai sobre o maior grupo de inimigos. A sombra mostra onde.', '+dano', '+1 meteoro', 'Cratera maior e recarga menor', '+1 meteoro e dano enorme'],
      cd: [6.5, 6.0, 5.6, 4.8, 4.2], count: [1, 1, 2, 2, 3], dmg: [80, 105, 115, 140, 210], radius: [2.0, 2.1, 2.2, 2.7, 3.0], fall: 0.85 },
    buraco: { name: 'Buraco negro', glyph: '●', color: '#b77bff', el: 'arcano', big: true,
      desc: ['Abre um buraco negro que suga os inimigos e explode ao fechar.', 'Dura mais', 'Puxa mais forte e de mais longe', '+dano da explosão', 'Recarga menor e explosão enorme'],
      cd: [10, 9.5, 9, 8.5, 7], dur: [2.6, 3.4, 3.5, 3.6, 4.0], radius: [3.4, 3.6, 4.4, 4.5, 5.0], pull: [4.5, 5, 6.5, 7, 8], dmg: [4, 4, 5, 6, 8], tick: 0.35, collapse: [70, 85, 100, 140, 200] },
    trovoada: { name: 'Trovoada', glyph: '☇', color: '#fff27a', el: 'raio', big: true,
      desc: ['Por alguns segundos, raios caem do céu sem parar sobre os inimigos na tela.', 'Mais raios por segundo', 'Dura mais', '+dano', 'Tempestade quase contínua'],
      cd: [11, 10.5, 10, 9.5, 7.5], dur: [2.5, 2.5, 3.5, 3.5, 4.5], rate: [6, 9, 9, 11, 15], dmg: [20, 21, 23, 30, 34], radius: 0.9 },
    // ---- novos feitiços ----
    luz: { name: 'Feixe da Aurora', glyph: '✧', color: '#fff3b0', el: 'luz',
      desc: ['Um feixe de luz sagrada gira em volta do Mago e expõe os inimigos (+25% de dano recebido).', 'Feixe mais longo', '+1 feixe', '+dano e giro mais rápido', '+1 feixe e feixes longos'],
      count: [1, 1, 2, 2, 3], length: [3.4, 4.2, 4.3, 4.6, 5.4], width: 0.32, dmg: [8, 10, 11, 15, 18], tick: 0.2, spin: [1.5, 1.5, 1.6, 2.0, 2.1] },
    orbes: { name: 'Fagulhas caçadoras', glyph: '∴', color: '#d78bff', el: 'arcano',
      desc: ['Pequenos orbes perseguem os inimigos e os corrompem: corrompidos explodem ao morrer.', '+1 orbe', '+dano', '+1 orbe e recarga menor', '+1 orbe e +dano'],
      cd: [1.7, 1.6, 1.5, 1.35, 1.2], count: [1, 2, 2, 3, 3], dmg: [9, 10, 13, 14, 18], speed: 6.5, life: 1.3 },
    runa: { name: 'Lâmina rúnica', glyph: '◈', color: '#7ff0ff', el: 'arcano',
      desc: ['Uma lâmina de runas ricocheteia nas bordas da tela cortando tudo no caminho.', '+dura mais', '+1 lâmina', '+dano', '+1 lâmina e mais rápida'],
      cd: [3.4, 3.2, 3.0, 2.9, 2.6], count: [1, 1, 2, 2, 3], dmg: [14, 17, 18, 24, 27], life: [3.0, 3.8, 3.8, 4.2, 4.5], speed: [7, 7, 7.2, 7.5, 8.5], rehit: 0.35 },
    gelo: { name: 'Pulso glacial', glyph: '✻', color: '#bfe9ff', el: 'gelo',
      desc: ['Um pulso de gelo em volta do Mago esfria os inimigos e às vezes congela. Encharcados congelam o dobro.', '+alcance', '+chance de congelar', '+dano e mais frequente', 'Pulso enorme'],
      cd: [3.6, 3.4, 3.2, 2.8, 2.6], radius: [2.3, 2.7, 2.8, 3.0, 3.6], dmg: [13, 14, 17, 22, 27], freeze: [0.25, 0.3, 0.42, 0.45, 0.55], freezeDur: 1.3, chill: 2 },
  },

  // ---- evoluções: feitiço no nível 5 + passiva certa = versão evoluída (no mesmo espaço) ----
  // os valores daqui substituem os do nível 5
  evolutions: {
    fogo: { name: 'Inferno carmesim', glyph: '✹', color: '#ff3d2a', need: 'poder', desc: 'Cinco bolas de fogo gigantes que deixam tudo em chamas.', count: 5, dmg: 34, radius: 1.75, cd: 0.55, burn: 4 },
    luz: { name: 'Aurora suprema', glyph: '✧', color: '#fffbe0', need: 'alcance', desc: 'Quatro feixes enormes varrem a tela inteira.', count: 4, length: 7.5, width: 0.45, dmg: 17, spin: 1.3 },
    orbes: { name: 'Enxame de almas', glyph: '∴', color: '#f0a8ff', need: 'sorte', desc: 'Sete orbes; cada acerto se divide em dois orbes menores.', count: 7, dmg: 20, cd: 0.9, split: 2 },
    runa: { name: 'Runa eterna', glyph: '◈', color: '#b8fbff', need: 'quantidade', desc: 'Quatro lâminas que quase nunca somem.', count: 4, dmg: 24, life: 9, speed: 9, cd: 4 },
    gelo: { name: 'Inverno zero', glyph: '✻', color: '#e8f8ff', need: 'duracao', desc: 'Dois pulsos seguidos que congelam quase tudo na tela.', radius: 4.6, dmg: 28, freeze: 0.9, cd: 2.4, second: true },
    anel: { name: 'Coroa solar', glyph: '◯', color: '#ffd24a', need: 'vigor', desc: 'Um anel solar enorme que cura o Mago a cada inimigo queimado.', radius: 3.0, dmg: 18, tick: 0.2, waveEvery: 3.5, wave: 90, heal: 0.25 },
  },

  // ---- status elementais ----
  status: {
    burnDps: t => 2 + t / 90,          // dano a cada meio segundo, cresce com o tempo
    exposeMul: 1.25,
    shockDmg: 14, shockRange: 2.8,     // Sobrecarga: o próximo golpe num eletrizado descarrega um raio
    soakShockMul: 1.8,                 // Condutor: raio em encharcado
    thermal: 2, thermalBonus: 20,      // Choque térmico: fogo em congelado
    corruptR: 1.5, corruptDmg: 14, corruptHp: 0.15,
  },
  combos: {
    termico: { name: 'CHOQUE TÉRMICO', sub: 'Fogo em congelado: dano dobrado', color: '#ff9a6a' },
    condutor: { name: 'CONDUTOR', sub: 'Raio em encharcado: +80% de dano', color: '#9be7ff' },
    congela: { name: 'CONGELAMENTO', sub: 'Gelo em encharcado: congela o dobro', color: '#bfe9ff' },
    sobrecarga: { name: 'SOBRECARGA', sub: 'Golpe em eletrizado solta um raio', color: '#fff27a' },
    corrupcao: { name: 'CORRUPÇÃO', sub: 'Corrompidos explodem ao morrer', color: '#d78bff' },
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
    quantidade: { name: 'Eco', glyph: '⁂', color: '#ffe066', desc: '+1 projétil, orbe ou feixe nos níveis 1, 3 e 5.' },
    duracao: { name: 'Ampulheta', glyph: '⌛', color: '#8fe3c8', desc: '+12% de duração dos feitiços.', per: 0.12 },
    sorte: { name: 'Sorte', glyph: '♣', color: '#7dffa0', desc: '+5% de chance de crítico (dano dobrado) e mais corações e moedas.', crit: 0.05, drop: 0.3 },
  },

  // ---- inimigos (Ressonas sombrias); tint escurece as cores, os olhos brilhantes ficam ----
  enemies: {
    rastejante: { model: 'brogume', scale: 0.68, hp: 7, speed: 1.9, radius: 0.35, dmg: 6, xp: 1, tint: 1 },
    espectro: { model: 'velamen', scale: 0.72, hp: 13, speed: 2.25, radius: 0.39, dmg: 8, xp: 2, tint: 1, float: true },
    investida: { model: 'volteiro', scale: 0.59, hp: 16, speed: 1.6, radius: 0.39, dmg: 10, xp: 3, tint: 1, dash: { every: 3.2, speed: 8, time: 0.45, windup: 0.5 } },
    brutamonte: { model: 'cascalco', scale: 0.90, hp: 60, speed: 1.15, radius: 0.61, dmg: 14, xp: 8, tint: 1, heavy: true },
    cuspidor: { model: 'fanaluz', scale: 0.76, hp: 20, speed: 1.4, radius: 0.43, dmg: 8, xp: 5, tint: 1, ranged: { keep: 4.5, every: 2.6, speed: 3.6, dmg: 9 } },
    minichefe: { model: 'ferfogo', scale: 1.40, hp: 3200, speed: 1.35, radius: 0.98, dmg: 20, xp: 60, tint: 1, heavy: true, boss: 'mini' },
    minerio: { model: null, scale: 1.1, hp: 40, speed: 0, radius: 0.6, dmg: 0, xp: 0, tint: 1, heavy: true, ore: true },
    guardiao: { model: 'arborion', scale: 2.5, hp: 12000, speed: 1.15, radius: 1.6, dmg: 22, xp: 0, tint: 1, heavy: true, boss: 'final' },
  },
  elite: { chanceFrom: 150, chance: 0.04, hp: 16, scale: 1.45, r: 1.3, xp: 30, speed: 1.1, dmg: 1.5, reels: 1 },
  // campeão: elite gigante e resistente; o baú dele rola 3 melhorias
  // elites do baú: poucas, em momentos fixos, bem resistentes e lentas. As elites comuns não soltam baú.
  chestElites: [{ at: 120, reels: 1 }, { at: 180, reels: 1 }, { at: 300, reels: 3 }, { at: 400, reels: 3 }],
  champion: { hpFlat: 900, scale: 2.2, r: 1.9, xp: 120, speed: 0.6, dmg: 1.5 },

  // ---- diretor: o que nasce em cada minuto (pesos) e quantos por segundo ----
  waves: [
    { from: 0, mix: { rastejante: 1 } },
    { from: 50, mix: { rastejante: 3, espectro: 1, investida: 0.5 } },
    { from: 110, mix: { rastejante: 3, espectro: 2, investida: 1, cuspidor: 0.4 } },
    { from: 170, mix: { rastejante: 2, espectro: 2, investida: 1, brutamonte: 1 } },
    { from: 250, mix: { rastejante: 2, espectro: 2, investida: 2, brutamonte: 1, cuspidor: 1 } },
    { from: 360, mix: { espectro: 3, investida: 2, brutamonte: 2, cuspidor: 2 } },
  ],
  spawnRate: t => Math.min(11, 1.1 + t / 38 + Math.pow(t / 200, 2)),   // inimigos por segundo
  hpScale: t => 1.2 + t / 120 + Math.pow(t / 250, 2),
  drops: { heart: 0.012, heartElite: 0.4, heal: 20, critBase: 0.03 },
  maxAlive: 220,
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
  // minério: rochas que os feitiços quebram, soltam cristais e às vezes ouro
  ore: { chance: 0.55, perZone: { cidade: 2, cristal: 3, cinzas: 1, abismo: 2 }, gems: 4, gemValue: 3, coin: 0.4 },
  // santuários: fique dentro do círculo até ele fechar e ganhe uma bênção temporária
  shrines: { chance: 0.4, radius: 1.5, charge: 3.5, decay: 0.35,
    buffs: {
      furia: { name: 'FÚRIA ARCANA', sub: '+60% de dano', color: '#ff4f5a', glow: '#ff2a3a', dur: 12, w: 3, dmg: 1.6 },
      vento: { name: 'PASSOS DO VENTO', sub: '+45% de velocidade', color: '#5ff2ff', glow: '#2fd8ff', dur: 12, w: 2, speed: 1.45 },
      fluxo: { name: 'FLUXO TOTAL', sub: 'Feitiços recarregam 40% mais rápido', color: '#ffe066', glow: '#ffc020', dur: 12, w: 2, cd: 0.6 },
      egide: { name: 'ÉGIDE', sub: 'Invulnerável', color: '#ffffff', glow: '#dfe8ff', dur: 6, w: 1, inv: true },
      chamado: { name: 'CHAMADO', sub: 'Todos os cristais vêm até você', color: '#5dff9a', glow: '#2aff7a', dur: 0, w: 2, heal: 25 },
    } },
};
