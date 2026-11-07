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
    brasque: { name: 'Brasque', element: 'Ember', glyph: '✹', color: '#F07944', scale: 0.55, cooldown: 7,
      desc: 'Faixa de fogo à frente que queima por 2,5 s', fire: { len: 5.5, width: 1.2, dur: 2.5, tick: 0.45, dmg: 1, guard: 1 } },
    marolho: { name: 'Marolho', element: 'Tide', glyph: '≈', color: '#36B6D5', scale: 0.55, cooldown: 6,
      desc: 'Onda que empurra, interrompe ataques e apaga projéteis', wave: { range: 4.8, arc: 110, time: 0.35, dmg: 1, guard: 2, knock: 10 } },
    brogume: { name: 'Brogume', element: 'Flora', glyph: '✿', color: '#76B868', scale: 0.55, cooldown: 8,
      desc: 'Raízes prendem inimigos numa área por 2 s', roots: { radius: 1.9, delay: 0.3, hold: 2.2, dmg: 1, guard: 1, reach: 6 } },
  },
  companionPoke: { every: 3.5, range: 2.4, dmg: 0.5 },   // apoio automático discreto
  // Guardião da Fenda Verde (câmara final). Só ele marca o chão nos golpes grandes.
  guardian: {
    name: 'Arborion Ancião', model: 'arborion', scale: 1.7, radius: 1.0, hp: 46, guard: 12, stun: 2.2, speed: 1.6, dmg: 1,
    slamRadius: 2.6, dashSpeed: 11, dashDist: 8, wallStun: 1.6, tripleRadius: 1.4, ringShots: 8, ringSpeed: 3.6,
    p1: { slamWind: 0.95, chargeWind: 0.85, recover: 0.9, between: 1.2, chain: 0.6, tripleEach: 0.8 },
    p2: { slamWind: 0.75, chargeWind: 0.7, recover: 0.65, between: 0.8, chain: 0.4, tripleEach: 0.65 },
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
    ima: { name: 'Ímã de Liga', glyph: '⬢', color: '#ffc96b', desc: 'Inimigos soltam +1 Liga de Fenda e ela chega mais rápido.' },
  },
  guardRegen: 2.5,                                   // guarda volta cheia após esse tempo sem apanhar

  // incursão: salas normais + câmara final. Encontros por profundidade (cada um = lista de ondas).
  run: { layers: 8 },   // salas antes da câmara final
  encounters: [
    [[['chaser', 'chaser']], [['chaser', 'shooter']]],
    [[['charger', 'chaser']], [['chaser', 'shooter'], ['chaser']]],
    [[['charger', 'shooter'], ['chaser', 'chaser']], [['chaser', 'chaser', 'shooter']]],
    [[['charger', 'charger'], ['shooter', 'chaser', 'chaser']], [['chaser', 'shooter', 'shooter'], ['charger', 'chaser']]],
    [[['charger', 'shooter', 'chaser'], ['chaser', 'chaser', 'shooter', 'shooter']]],
  ],
  finalEncounter: [['guardian']],
  _oldFinal: [['charger', 'chaser', 'chaser'], ['shooter', 'shooter', 'charger'], ['charger', 'charger', 'chaser', 'shooter']],
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
  drops: { perEnemy: [1, 2], magnetDelay: 0.45, magnetSpeed: 14 },
  spawnTime: 0.6,
  waveDelay: 0.8,
  hitstop: { light: 0.035, heavy: 0.07 },   // pausa curtíssima no impacto: dá peso ao golpe
};
