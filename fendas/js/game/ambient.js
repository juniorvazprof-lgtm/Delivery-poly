// Partículas de ambiente por zona (poeira, cristal, cinzas, abismo).
// Sem estado e sem alocação por quadro: tudo vem de hash(i) + t.

const TAU = Math.PI * 2;
const mod = (a, b) => a - Math.floor(a / b) * b;
// hash estável por índice -> [0,1)
const hash = (i, s) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const ZONE_FX = {
  // poeira/neon flutuando devagar
  cidade: { n: 55, colors: ['#ff40c0', '#40e0ff', '#ffffff'], size: [0.18, 0.48], k: 0.60, move: 'float' },
  // poeira de cristal cintilando
  cristal: { n: 60, colors: ['#b070ff', '#ff70d0', '#ffffff'], size: [0.15, 0.45], k: 0.70, move: 'twinkle' },
  // brasas e cinzas subindo
  cinzas: { n: 65, colors: ['#ff7a20', '#ffd040'], size: [0.15, 0.45], k: 0.65, move: 'rise' },
  // partículas descendo devagar em espiral
  abismo: { n: 50, colors: ['#40e0ff', '#3060ff'], size: [0.15, 0.39], k: 0.55, move: 'fall' },
};

export function drawAmbient(glow, cx, cz, viewW, viewH, zone, t) {
  const fx = ZONE_FX[zone] || ZONE_FX.cidade; // zona desconhecida -> cidade
  const spanX = viewW + 2;                     // área que repete (cobre a tela)
  const spanZ = viewH * 1.2 + 2;               // cobre cz ± viewH*0.6
  const [smin, smax] = fx.size;

  for (let i = 0; i < fx.n; i++) {
    const h1 = hash(i, 1), h2 = hash(i, 2), h3 = hash(i, 3), h4 = hash(i, 4);
    const par = 0.82 + h4 * 0.18;              // paralaxe leve em relação ao mundo
    const color = fx.colors[(h2 * fx.colors.length) | 0];
    const size = smin + (smax - smin) * h3;

    let frac = mod(t / 6 + h3, 1);             // progresso do ciclo (fade suave)
    let y = 0.25 + h4 * 0.95;
    let sway = 0, vz = 0.12;

    if (fx.move === 'rise') {                  // cinzas sobem e balançam de lado
      frac = mod(t / 4.5 + h3, 1);
      y = 0.15 + frac * 1.3;
      sway = Math.sin(t * 1.7 + h1 * TAU) * 0.35;
      vz = -0.18;
    } else if (fx.move === 'fall') {           // abismo: desce devagar em espiral
      frac = mod(t / 9 + h3, 1);
      y = 1.45 - frac * 1.35;
      sway = Math.cos(t * 0.9 + h1 * TAU) * 0.4;
      vz = 0.10;
    } else if (fx.move === 'twinkle') {        // cristal: leve flutuação
      y = 0.3 + h4 * 0.9 + Math.sin(t * 0.8 + h1 * TAU) * 0.12;
    } else {                                   // cidade: sobe/desce devagar
      y += Math.sin(t * 0.5 + h2 * TAU) * 0.18;
    }

    // janela sempre centrada na câmera; a paralaxe só desloca a fase dentro dela
    const x = cx + mod(h1 * spanX + t * 0.25 + sway - cx * par, spanX) - spanX / 2;
    const z = cz + mod(h2 * spanZ + t * vz - cz * par, spanZ) - spanZ / 2;

    // k com fade de entrada/saída para não haver "pulos" no reinício do ciclo
    let k = fx.k * Math.sin(Math.PI * frac);
    if (fx.move === 'twinkle') k *= 0.55 + 0.45 * Math.sin(t * 2.4 + h1 * TAU);
    if (k <= 0.01) continue;

    glow.add(x, y, z, size, color, k);
  }
}
