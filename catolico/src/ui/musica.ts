/* Música ambiente gerada no próprio app (Web Audio): acordes longos e suaves, sinos ocasionais e reverberação.
   Nenhum arquivo de áudio e nenhum direito autoral envolvido. O clima segue o tempo litúrgico.
   Começa no primeiro toque da pessoa (exigência dos navegadores) e baixa sozinha durante orações e o terço. */
import { S } from "../services/storage";
import type { Tempo } from "../core/liturgia";

interface Clima { raiz: number; escala: number[]; acordes: number[][]; brilho: number; sinos: number; passo: number }
// raiz em Hz; escala em semitons; acordes = graus da escala; brilho = corte do filtro; sinos = chance por compasso; passo = segundos por acorde
const CLIMAS: Record<Tempo, Clima> = {
  "Advento": { raiz: 146.83, escala: [0, 2, 3, 5, 7, 9, 10], acordes: [[0, 2, 4], [3, 5, 0], [6, 1, 3], [4, 6, 1]], brilho: 950, sinos: .35, passo: 11 },
  "Natal": { raiz: 196, escala: [0, 2, 4, 6, 7, 9, 11], acordes: [[0, 2, 4, 6], [1, 3, 5], [3, 5, 0], [4, 6, 1]], brilho: 2200, sinos: .7, passo: 9 },
  "Tempo Comum": { raiz: 174.61, escala: [0, 2, 4, 5, 7, 9, 11], acordes: [[0, 4, 1], [5, 0, 2], [3, 5, 0], [4, 1, 5]], brilho: 1500, sinos: .5, passo: 10 },
  "Quaresma": { raiz: 110, escala: [0, 1, 3, 5, 7, 8, 10], acordes: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [0, 4, 6]], brilho: 700, sinos: .15, passo: 13 },
  "Tríduo Pascal": { raiz: 98, escala: [0, 2, 3, 5, 7, 8, 10], acordes: [[0, 4], [3, 0], [5, 2]], brilho: 520, sinos: 0, passo: 15 },
  "Páscoa": { raiz: 261.63, escala: [0, 2, 4, 5, 7, 9, 11], acordes: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [5, 0, 2]], brilho: 2600, sinos: .8, passo: 8 },
};
const VOL = .32;
let ctx: AudioContext | null = null, saida: GainNode | null = null, filtro: BiquadFilterNode | null = null, eco: ConvolverNode | null = null;
let clima: Clima = CLIMAS["Tempo Comum"], timer = 0, grau = 0, nivel = 1, tocando = false;
export const somLigado = () => S.get<boolean>("cat.som", true) !== false;

const hz = (c: Clima, g: number, oit = 0) => c.raiz * 2 ** ((c.escala[((g % 7) + 7) % 7] + 12 * (oit + Math.floor(g / 7))) / 12);
function impulso(a: AudioContext, seg = 4.5): AudioBuffer {
  const n = a.sampleRate * seg, b = a.createBuffer(2, n, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.6; }
  return b;
}
function montar(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return null;
  try {
    ctx = new AC(); saida = ctx.createGain(); saida.gain.value = 0; filtro = ctx.createBiquadFilter(); filtro.type = "lowpass"; filtro.Q.value = .4;
    eco = ctx.createConvolver(); eco.buffer = impulso(ctx);
    const seco = ctx.createGain(), molhado = ctx.createGain(); seco.gain.value = .45; molhado.gain.value = .8;
    filtro.connect(seco); filtro.connect(eco); eco.connect(molhado); seco.connect(saida); molhado.connect(saida); saida.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}
/** Um acorde longo: osciladores suaves com ataque e soltura lentos. */
function acorde(a: AudioContext, graus: number[], dur: number): void {
  const t = a.currentTime;
  graus.forEach((g, i) => [0, 1].forEach(oit => {
    const o = a.createOscillator(), v = a.createGain(); o.type = oit ? "sine" : "triangle";
    o.frequency.value = hz(clima, g, oit - (i === 0 ? 1 : 0)); o.detune.value = (Math.random() - .5) * 8;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(.05 / graus.length * (oit ? .7 : 1), t + dur * .35);
    v.gain.linearRampToValueAtTime(0, t + dur * 1.25); o.connect(v); v.connect(filtro!); o.start(t); o.stop(t + dur * 1.3);
  }));
}
/** Um sino discreto (nota alta com decaimento), às vezes. */
function sino(a: AudioContext, quando: number): void {
  const t = a.currentTime + quando, o = a.createOscillator(), v = a.createGain();
  o.type = "sine"; o.frequency.value = hz(clima, [0, 2, 4, 7, 9][Math.floor(Math.random() * 5)], 2);
  v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(.035, t + .02); v.gain.exponentialRampToValueAtTime(.0001, t + 4.5);
  o.connect(v); v.connect(filtro!); o.start(t); o.stop(t + 4.6);
}
function compasso(): void {
  if (!ctx || !tocando) return;
  acorde(ctx, clima.acordes[grau++ % clima.acordes.length], clima.passo);
  if (Math.random() < clima.sinos) sino(ctx, 1 + Math.random() * (clima.passo - 3));
  if (Math.random() < clima.sinos / 2) sino(ctx, 2 + Math.random() * (clima.passo - 3));
  timer = window.setTimeout(compasso, clima.passo * 1000);
}
function aplicarVolume(seg = 2.5): void {
  if (!ctx || !saida) return; const t = ctx.currentTime;
  saida.gain.cancelScheduledValues(t); saida.gain.setValueAtTime(saida.gain.value, t);
  saida.gain.linearRampToValueAtTime(tocando ? VOL * nivel : 0, t + seg);
}

/** Define o clima pelo tempo litúrgico (pode ser chamado antes do primeiro toque). */
export function climaDoTempo(tempo: Tempo): void { clima = CLIMAS[tempo] || CLIMAS["Tempo Comum"]; if (filtro && ctx) filtro.frequency.setTargetAtTime(clima.brilho, ctx.currentTime, 2); }
export function tocar(): void {
  const a = montar(); if (!a || tocando) return;
  void a.resume(); tocando = true; filtro!.frequency.value = clima.brilho; aplicarVolume(4); compasso();
}
export function parar(): void { tocando = false; clearTimeout(timer); aplicarVolume(1.2); }
/** Liga ou desliga e guarda a escolha. Devolve o novo estado. */
export function alternarSom(): boolean { const on = !tocando; S.set("cat.som", on); on ? tocar() : parar(); return on; }
/** Baixa a música (0–1) durante orações, folhas e o terço; 1 volta ao normal. */
export function abaixar(n: number): void { nivel = n; aplicarVolume(1.8); }
/** Liga no primeiro toque, se a pessoa não desligou; pausa quando o app vai para o fundo. */
export function prepararMusica(): void {
  const primeiro = () => { removeEventListener("pointerdown", primeiro); if (somLigado()) tocar(); dispatchEvent(new CustomEvent("cat:som")); };
  addEventListener("pointerdown", primeiro);
  document.addEventListener("visibilitychange", () => { if (!ctx) return; document.hidden ? void ctx.suspend() : tocando && void ctx.resume(); });
}
export const estaTocando = () => tocando;
