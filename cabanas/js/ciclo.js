// Ciclo de dia e noite de Pine Hollow: relógio do mundo, luz, névoa e céu.
// Dia 06:00–19:00 (~8 min reais), noite 19:00–06:00 (~5 min). O sino toca três vezes ao anoitecer.
import * as T from './lib/three.module.js';

export const CICLO = {
  inicioDia: 6, inicioNoite: 19,
  segDia: 480, segNoite: 300,                      // duração real de cada fase, em segundos
  transicao: 1.2,                                  // horas de crepúsculo (antes de 19h e antes de 6h)
};
// cores na paleta do jogo: noite fria e escura; dia nublado, cinza-azulado (a cidade nunca tem sol pleno)
const NOITE = { fundo: '#0a0a14', nevoa: '#0a0a14', perto: 6, longe: 13, ceu: '#8c9cb8', chao: '#1e2340', hemi: 1.6, sol: '#c5d3e8', solI: 1.6 };
const DIA = { fundo: '#8c9cb8', nevoa: '#8c9cb8', perto: 3.2, longe: 9.5, ceu: '#c5d3e8', chao: '#3f7a48', hemi: 3.0, sol: '#f8e6a0', solI: 2.2 };
const ENTARDECER = { fundo: '#4a2c2a', nevoa: '#4a2c2a', perto: 4.5, longe: 11, ceu: '#e8a850', chao: '#2b1d2a', hemi: 2.2, sol: '#c8703a', solI: 1.8 };

const ehNoite = h => h >= CICLO.inicioNoite || h < CICLO.inicioDia;
/** 0 = noite fechada, 1 = dia pleno, com crepúsculo suave nas viradas. */
export function claridade(h) {
  const tr = CICLO.transicao;
  if (h >= CICLO.inicioDia && h < CICLO.inicioNoite - tr) return Math.min(1, (h - CICLO.inicioDia) / tr + 0.35);
  if (h >= CICLO.inicioNoite - tr && h < CICLO.inicioNoite) return (CICLO.inicioNoite - h) / tr;
  if (h >= CICLO.inicioDia - tr && h < CICLO.inicioDia) return (h - (CICLO.inicioDia - tr)) / tr * 0.35;
  return 0;
}

/** Relógio do mundo. `ao` recebe callbacks: anoitecer, amanhecer. */
export function criarCiclo(ao = {}) {
  const c = {
    hora: 7, dia: 1, parado: false,
    get noite() { return ehNoite(c.hora); },
    get luz() { return claridade(c.hora); },
    /** Horário em texto, "07:30". */
    relogio() { const h = Math.floor(c.hora), m = Math.floor((c.hora - h) * 60 / 10) * 10; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },
    passo(dt) {
      if (c.parado) return;
      const antes = c.noite, porSeg = c.noite ? (24 - CICLO.inicioNoite + CICLO.inicioDia) / CICLO.segNoite : (CICLO.inicioNoite - CICLO.inicioDia) / CICLO.segDia;
      c.hora += dt * porSeg;
      if (c.hora >= 24) { c.hora -= 24; }
      if (!antes && c.noite) ao.anoitecer?.();
      if (antes && !c.noite) { c.dia++; ao.amanhecer?.(); }
    },
    /** Dormir no abrigo: pula para as 06:00 do próximo dia. */
    dormir() { const eraNoite = c.noite; if (c.hora >= CICLO.inicioDia) c.dia += 1; c.hora = CICLO.inicioDia; if (eraNoite) ao.amanhecer?.(); },
    pular(h) { c.hora = h; },
  };
  return c;
}

/** Aplica a luz da hora à cena: fundo, névoa, luz ambiente e "sol"/lua. Janelas acesas só à noite. */
export function aplicarLuz(mundo, ciclo) {
  const s = mundo.scene, L = ciclo.luz, h = ciclo.hora;
  // crepúsculo: puxa para os tons de entardecer perto das 19h e das 6h
  const crep = Math.max(0, 1 - Math.abs(L - 0.5) * 2) * (h > 12 || h < 6 ? 1 : 0.6);
  const mix = (a, b, k) => tmp1.set(a).lerp(tmp2.set(b), k).getHex();
  const v = k => NOITE[k] + (DIA[k] - NOITE[k]) * L;
  const cor = k => mix(mix(NOITE[k], DIA[k], L), ENTARDECER[k], crep * 0.6);
  s.background.set(cor('fundo')); s.fog.color.set(cor('nevoa')); s.fog.near = v('perto'); s.fog.far = v('longe');
  if (!hemi) s.traverse(o => { if (o.isHemisphereLight) hemi = o; });
  if (hemi) { hemi.intensity = v('hemi'); hemi.color.set(cor('ceu')); hemi.groundColor.set(cor('chao')); }
  mundo.lua.intensity = v('solI'); mundo.lua.color.set(cor('sol'));
  const acesas = L < 0.4;
  mundo.luzes.forEach((l, i) => { l.visible = acesas; });
  for (const f of mundo.vagalumes) f.visible = f.visible && L < 0.3;
}
let hemi = null;
const tmp1 = new T.Color(), tmp2 = new T.Color();
