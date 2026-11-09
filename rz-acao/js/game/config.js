// Valores de ajuste do MVP 0. Tudo que define "sensação" do combate fica aqui, não espalhado pelo código.
// Tempos em segundos, distâncias em unidades do mundo (1 unidade = 10 voxels), ângulos em graus.
export const CFG = {
  sim: { dt: 1 / 60, maxSteps: 5 },                 // simulação em passo fixo, separada da renderização
  cam: { viewH: 7.2, offset: [0, 8, 8.5], follow: 9 },

  // salas da Fenda em clareira: centro livre, decoração só nas bordas. exits = lados onde podem abrir portas.
  rooms: [
    { w: 15, d: 9.5, exits: ['top', 'left', 'right'] },
    { w: 17, d: 10.5, exits: ['top', 'left', 'right'] },
    { w: 16, d: 10, exits: ['left', 'right'] },
    { w: 19, d: 9.5, exits: ['top', 'right'] },
    { w: 14, d: 11, exits: ['top', 'left'] },
  ],
  finalRoom: { w: 17, d: 11, exits: [], breakables: 2 },

  kay: {
    hp: 6, speed: 6.4, radius: 0.32,
    hurtIframes: 0.8, hurtStun: 0.16, knockback: 6,
    inputBuffer: 0.2,                               // toque registrado um pouco antes ainda vale
    assist: { range: 2.4, cone: 80 },                // ajuste suave de mira no cone frontal
  },

  // combo do bastão: preparação → golpe ativo → recuperação
  // chainFrom: momento da recuperação a partir do qual o próximo toque encadeia
  // dodgeCancel: a esquiva pode cancelar a recuperação a partir deste momento
  combo: [
    { windup: 0.04, active: 0.08, recovery: 0.16, range: 1.35, arc: 130, dmg: 1, guard: 1, lunge: 3.2, chainFrom: 0.0, dodgeCancel: 0.0 },
    { windup: 0.04, active: 0.08, recovery: 0.18, range: 1.35, arc: 130, dmg: 1, guard: 1, lunge: 3.2, chainFrom: 0.0, dodgeCancel: 0.0 },
    { windup: 0.09, active: 0.10, recovery: 0.30, range: 1.65, arc: 170, dmg: 2, guard: 3, lunge: 5.0, chainFrom: 99, dodgeCancel: 0.06 },
  ],

  dodge: { dur: 0.22, iframes: 0.2, speed: 15, cooldown: 0.18 },
  // esquiva perfeita: esquivar logo antes de ser atingido desacelera o tempo e carrega um contra-ataque
  perfectDodge: { window: 0.14, slow: 0.55, slowScale: 0.3, counter: 1.4, counterMul: 2, counterGuard: 2 },

  enemies: {
    // perseguidor corpo a corpo: ergue o corpo, marca o setor e investe curto
    chaser: {
      model: 'arborion', scale: 0.8, hp: 5, guard: 4, radius: 0.5,
      speed: 3.0, reach: 1.5, windup: 0.45, active: 0.12, recovery: 0.6, lunge: 4.5,
      range: 1.25, arc: 100, dmg: 1, cooldown: 0.35, stun: 1.3, poise: 1,
    },
    // disparador: comprime o corpo, mostra a linha e dispara um projétil lento
    shooter: {
      model: 'fanaluz', scale: 0.75, hp: 4, guard: 3, radius: 0.45,
      speed: 2.2, keep: 5, windup: 0.6, track: 0.6, recovery: 0.7, cooldown: 1.1,
      projSpeed: 6, projRadius: 0.22, projRange: 11, dmg: 1, stun: 1.3, poise: 1,
    },
    // escudeiro: casco frontal bloqueia golpes; contorne pelas costas ou quebre a guarda
    shield: {
      model: 'imantado', scale: 0.55, hp: 6, guard: 4, radius: 0.55, poise: 2,
      speed: 1.5, turn: 1.6, reach: 1.4, windup: 0.6, active: 0.12, recovery: 0.7, lunge: 2.4,
      range: 1.2, arc: 110, dmg: 1, cooldown: 0.6, stun: 1.6, shieldArc: 120,
    },
    // explosivo: corre até Kay, incha e explode (também fere outros inimigos). Morto, explode do mesmo jeito.
    exploder: {
      model: 'volteiro', scale: 0.5, hp: 2, guard: 1, radius: 0.4, poise: 9,
      speed: 4.2, reach: 1.3, windup: 0.75, blast: 1.7, dmg: 1, enemyDmg: 3, deathFuse: 0.45, stun: 1, recovery: 0, cooldown: 0,
    },
    // saltador: mantém distância, agacha e salta onde Kay estava (a sombra mostra o pouso)
    leaper: {
      model: 'fulgor', scale: 0.45, hp: 4, guard: 2, radius: 0.45, poise: 1,
      speed: 2.4, keep: 4, windup: 0.55, leapTime: 0.5, leapRadius: 1.2, recovery: 0.8, dmg: 1, cooldown: 1.6, stun: 1.3,
    },
    // curandeiro: fica longe e cura o aliado mais ferido; prioridade de abate
    healer: {
      model: 'memoris', scale: 0.55, hp: 4, guard: 2, radius: 0.45, poise: 1,
      speed: 1.8, keep: 6, windup: 0.8, heal: 2, recovery: 0.9, cooldown: 3.2, stun: 1.3,
    },
    // investidor: recua o corpo, marca a linha e dispara correndo; se bater em obstáculo, fica atordoado
    charger: {
      model: 'cascalco', scale: 0.62, hp: 5, guard: 3, radius: 0.5,
      speed: 2.2, keep: 4, windup: 0.5, track: 0.5, dashSpeed: 13, dashDist: 6, width: 1.0,
      recovery: 0.6, wallStun: 1.1, dmg: 1, cooldown: 1.2, stun: 1.3, poise: 3,
    },
  },
  flinch: 0.28,          // recuo ao levar golpe (interrompe a preparação)
  tell: 0.32,            // brilho branco no fim da preparação: o único aviso dos inimigos comuns
  windupJitter: 0.15,    // variação aleatória da preparação (±15%) para não ficar previsível
  // companheiras: uma por incursão, sem vida própria; habilidade com recarga
  companions: {
    brasque: { name: 'Brasque', element: 'Ember', glyph: '✹', color: '#F07944', scale: 0.55, cooldown: 8,
      desc: 'Salta no inimigo e acende a espada de Kay por 5 s: +1 de dano e queimadura', ember: { dur: 5, dmg: 1, arc: 25, burn: 2, leapDmg: 1, leapRadius: 1.5 } },
    marolho: { name: 'Marolho', element: 'Tide', glyph: '≈', color: '#36B6D5', scale: 0.55, cooldown: 7,
      desc: 'Redemoinho que puxa os inimigos para perto de Kay e os deixa encharcados, sem atacar, por 1,5 s', whirl: { radius: 4.6, pull: 0.45, soak: 1.5, dmg: 1, guard: 2, front: 1.3 } },
    brogume: { name: 'Brogume', element: 'Flora', glyph: '✿', color: '#76B868', scale: 0.55, cooldown: 8,
      desc: 'Raízes prendem inimigos numa área por 2 s', roots: { radius: 1.9, delay: 0.3, hold: 2.2, dmg: 1, guard: 1, reach: 6 } },
  },
  companionPoke: { every: 3.5, range: 2.4, dmg: 0.5 },   // apoio automático discreto
  // Guardião da Fenda Verde (câmara final). Só ele marca o chão nos golpes grandes.
  guardian: {
    name: 'Arborion Ancião', model: 'arborion', scale: 1.7, radius: 1.0, hp: 85, guard: 16, stun: 1.8, speed: 2.4,
    dmg: 1, slamDmg: 2, slamRadius: 2.8, dashSpeed: 14, dashDist: 9, wallStun: 1.3, leapTime: 0.55, leapRadius: 1.9,
    ringShots: 10, ringSpeed: 4.2, minions: 2, summonEvery: 12,
    p1: { slamWind: 0.7, chargeWind: 0.62, leapWind: 0.5, recover: 0.65, between: 0.7, chain: 0.35 },
    p2: { slamWind: 0.55, chargeWind: 0.5, leapWind: 0.4, recover: 0.5, between: 0.45, chain: 0.22 },
  },
  // resgate: Ressona debilitada após limpar a sala; sincronizar consome um Cubo Nexus
  rescue: { startCubes: 2, species: ['brasque', 'marolho', 'brogume'], range: 1.5, syncTime: 1.1 },
  // bênçãos da incursão: a cada 2 salas de combate limpas, escolher 1 de 3 (só valem nesta incursão)
  boonEvery: 2,
  boons: {
    lamina: { name: 'Lâmina larga', glyph: '⟋', color: '#5ff2ff', desc: 'O 3º golpe do combo fica mais largo e alcança mais longe.' },
    corte: { name: 'Fio de pulso', glyph: '✦', color: '#9be7f2', desc: 'Todos os golpes da espada causam mais dano.' },
    recarga: { name: 'Vínculo rápido', glyph: '↻', color: '#8fd06a', desc: 'A habilidade da companheira recarrega 30% mais rápido.' },
    pulso: { name: 'Esquiva de choque', glyph: '»', color: '#ffe066', desc: 'Ao esquivar, Kay empurra os inimigos próximos.' },
    vigor: { name: 'Coração da Fenda', glyph: '◆', color: '#ff7ad9', desc: '+2 de vida máxima e recupera 2 de vida agora.' },
    onda: { name: 'Corte em onda', glyph: '≋', color: '#5ff2ff', desc: 'O 3º golpe do combo lança uma onda que atravessa inimigos à frente.' },
    eco: { name: 'Eco da esquiva', glyph: '◌', color: '#c9a6ff', desc: 'Ao esquivar, Kay deixa um eco que explode logo depois.' },
    ressoar: { name: 'Ressonância', glyph: '↺', color: '#8fd06a', desc: 'Cada inimigo derrotado adianta 1,5 s a habilidade da companheira.' },
    contra: { name: 'Contra-golpe', glyph: '⚡', color: '#ffe066', desc: 'A esquiva perfeita dura mais e o contra-ataque causa o triplo de dano.' },
    raiz: { name: 'Raiz funda', glyph: '✿', color: '#76B868', only: 'brogume', desc: 'Inimigos presos pelas raízes tomam 50% a mais de dano.' },
    brasa: { name: 'Brasa viva', glyph: '✹', color: '#F07944', only: 'brasque', desc: 'Inimigos em chamas espalham o fogo para quem estiver perto ao cair.' },
    mare: { name: 'Maré baixa', glyph: '≈', color: '#36B6D5', only: 'marolho', desc: 'Inimigos encharcados tomam o dobro de dano do 3º golpe.' },
    ima: { name: 'Ímã de Liga', glyph: '⬢', color: '#ffc96b', desc: 'Inimigos soltam +1 Liga de Fenda e ela chega mais rápido.' },
  },
  guardRegen: 2.5,                                   // guarda volta cheia após esse tempo sem apanhar

  // incursão: salas normais + câmara final. Encontros por profundidade (cada um = lista de ondas).
  run: { layers: 8 },   // salas antes da câmara final
  encounters: [
    [[['chaser', 'chaser']], [['chaser', 'shooter']], [['chaser', 'exploder']]],
    [[['charger', 'chaser']], [['chaser', 'shooter'], ['exploder', 'exploder']], [['shield', 'chaser']], [['leaper', 'chaser']]],
    [[['charger', 'shooter'], ['chaser', 'exploder', 'exploder']], [['shield', 'shooter', 'chaser']], [['leaper', 'leaper', 'healer']], [['shield', 'healer'], ['chaser', 'exploder']]],
    [[['charger', 'shield'], ['shooter', 'healer', 'chaser']], [['leaper', 'exploder', 'exploder'], ['shield', 'charger']], [['healer', 'shield', 'shooter'], ['leaper', 'chaser', 'exploder']]],
    [[['charger', 'shooter', 'shield'], ['healer', 'leaper', 'exploder', 'chaser']], [['shield', 'shield', 'healer'], ['leaper', 'charger', 'exploder', 'exploder']]],
  ],
  // elites: maiores, mais vida e mais rápidos; soltam Cristal. Chance cresce com a profundidade.
  elite: { fromTier: 1, chance: [0, 0.12, 0.2, 0.28, 0.35], hp: 2.2, guard: 2, speed: 1.2, windup: 0.85, scale: 1.3, drop: { cristal: 2, liga: 2 } },
  finalEncounter: [['guardian']],
  // tipos de sala do mapa (weight = chance relativa de aparecer)
  roomTypes: {
    combate: { desc: 'Inimigos e Liga de Fenda', label: 'Combate', glyph: '⚔', color: '#ff7ad9', materials: 2, weight: 46 },
    recurso: { desc: 'Uma onda curta e muita Liga', label: 'Recurso', glyph: '◆', color: '#ffc96b', materials: 5, light: true, weight: 14 },
    resgate: { desc: 'Uma Ressona para sincronizar', label: 'Resgate', glyph: '✚', color: '#5ff2ff', materials: 1, rescue: true, weight: 12 },
    bau: { desc: 'Um baú com Liga e Cubo Nexus', label: 'Baú', glyph: '▣', color: '#ffe066', materials: 0, peaceful: true, chest: true, weight: 10 },
    evento: { desc: 'Uma escolha com risco', label: 'Evento', glyph: '?', color: '#c9a6ff', materials: 0, peaceful: true, event: true, weight: 10 },
    descanso: { desc: 'Recupera 2 de vida', label: 'Descanso', glyph: '☾', color: '#9be7f2', materials: 0, peaceful: true, heal: 2, weight: 8 },
  },
  chestDrop: 8,
  // materiais: Liga (construir), Cristal (melhorias de Kay), Fibra e Sementes (horta)
  mats: {
    liga: { name: 'Liga de Fenda', short: 'Liga', color: '#ffc96b', glow: 'glowA' },
    cristal: { name: 'Cristal bruto', short: 'Cristal', color: '#7fd8ff', glow: 'glowOreQz' },
    fibra: { name: 'Fibra viva', short: 'Fibra', color: '#9dff4a', glow: 'glowOreAm' },
    semente: { name: 'Sementes', short: 'Sementes', color: '#e8d27a', glow: 'glowY' },
  },
  // veios de minério na Fenda: vários golpes para quebrar
  veins: {
    liga: { hp: 3, drop: { liga: 4 }, crystal: 'glowOreCu', label: 'Veio de Liga' },
    cristal: { hp: 4, drop: { cristal: 3 }, crystal: 'glowOreQz', label: 'Veio de Cristal' },
    fibra: { hp: 2, drop: { fibra: 3, semente: 1 }, crystal: 'glowOreAm', label: 'Raiz de Fibra' },
  },
  veinsPerRoom: { combate: [0, 2], recurso: [4, 6], resgate: [0, 1], bau: [1, 2], evento: [1, 2], descanso: [1, 2], final: [0, 0] },
  // subúrbio de Kanda-9 (refúgio)
  hub: {
    w: 24, d: 15, clearRadius: 3.4, piles: 22,
    debris: {
      mato: { hp: 1, drop: { fibra: 1 }, seedChance: 0.4, label: 'Mato' },
      entulho: { hp: 2, drop: { liga: 2 }, label: 'Entulho' },
      carcaca: { hp: 3, drop: { liga: 3 }, cristalChance: 0.3, label: 'Carcaça' },
    },
  },
  lossKeep: 0.5,   // fração dos materiais da incursão mantida na derrota
  drops: { perEnemy: [1, 2], magnetDelay: 0.45, magnetSpeed: 14 },
  spawnTime: 0.6,
  waveDelay: 0.8,
  hitstop: { light: 0.035, heavy: 0.07 },   // pausa curtíssima no impacto: dá peso ao golpe
};
