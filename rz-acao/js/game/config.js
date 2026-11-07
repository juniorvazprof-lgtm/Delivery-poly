// Valores de ajuste do MVP 0. Tudo que define "sensação" do combate fica aqui, não espalhado pelo código.
// Tempos em segundos, distâncias em unidades do mundo (1 unidade = 10 voxels), ângulos em graus.
export const CFG = {
  sim: { dt: 1 / 60, maxSteps: 5 },                 // simulação em passo fixo, separada da renderização
  cam: { viewH: 7.2, offset: [0, 8, 8.5], follow: 9 },

  arena: {
    w: 17, d: 10.5,
    // obstáculos baixos (não escondem Kay): [x, z, raio]
    pillars: [[-4.2, -1.6, 0.6], [4.4, 1.4, 0.6], [0.4, -2.9, 0.5], [-1.2, 2.6, 0.5]],
  },

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
      speed: 3.0, reach: 1.5, windup: 0.5, active: 0.12, recovery: 0.6, lunge: 4.5,
      range: 1.25, arc: 100, dmg: 1, cooldown: 0.35, stun: 1.3,
    },
    // disparador: comprime o corpo, mostra a linha e dispara um projétil lento
    shooter: {
      model: 'fanaluz', scale: 0.75, hp: 4, guard: 3, radius: 0.45,
      speed: 2.2, keep: 5, windup: 0.75, track: 0.6, recovery: 0.7, cooldown: 1.1,
      projSpeed: 6, projRadius: 0.22, projRange: 11, dmg: 1, stun: 1.3,
    },
  },
  guardRegen: 2.5,                                   // guarda volta cheia após esse tempo sem apanhar

  waves: [
    ['chaser', 'chaser'],
    ['chaser', 'shooter'],
    ['chaser', 'chaser', 'shooter', 'shooter'],
  ],
  spawnTime: 0.6,
  waveDelay: 0.8,
  hitstop: { light: 0.035, heavy: 0.07 },   // pausa curtíssima no impacto: dá peso ao golpe
};
