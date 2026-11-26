// Sons ambientes gerados com Web Audio.
// (módulo 18/20 da Capivara Explora)
import { G, H } from '../core/runtime.js';
import { isNight, rand } from '../core/config.js';
import { objects } from '../world/objects.js';
import { raining } from '../world/simulation.js';
import { distTo } from '../brain/perception.js';

// ---------------------------------------------------------------------
// SONS AMBIENTES (Web Audio, gerados na hora, sem arquivos)
// Passarinhos de dia, grilos à noite, chuva, água por perto, mergulho e o ataque do jacaré.
// O navegador só libera áudio depois de um toque, por isso começa desligado (botão 🔇).
// ---------------------------------------------------------------------
const audio = { ctx: null, on: false, nextBird: 0, nextCricket: 0 };
function noiseBuffer(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function startAudio() {
  const ctx = audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
  audio.noise = noiseBuffer(ctx);
  audio.master = ctx.createGain(); audio.master.connect(ctx.destination);
  const loop = (freq, type, q = 1) => {
    const src = ctx.createBufferSource(); src.buffer = audio.noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(audio.master); src.start(); return g;
  };
  audio.rain = loop(1500, 'bandpass', 0.6);
  audio.water = loop(450, 'lowpass');
}
function beep(freq, t, dur, vol, type = 'sine', to = null) {
  const ctx = audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.master); o.start(t); o.stop(t + dur + 0.02);
}
function chirp(t) { const base = rand(2300, 3500), n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) beep(base, t + i * 0.14, 0.1, 0.04, 'sine', base * rand(1.2, 1.6)); }
function cricket(t) { for (let i = 0; i < 3; i++) beep(4700, t + i * 0.06, 0.035, 0.012); }
function sfx(kind) {
  if (!audio.on) return;
  const ctx = audio.ctx, t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = audio.noise;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'ataque' ? 350 : 1100;
  const g = ctx.createGain(); g.gain.setValueAtTime(kind === 'ataque' ? 0.7 : 0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  src.connect(f).connect(g).connect(audio.master); src.start(t); src.stop(t + 0.8);
  if (kind === 'ataque') beep(70, t, 0.5, 0.3, 'sawtooth', 45);
  if (kind === 'clique') { g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); f.frequency.value = 4000; beep(1800, t + 0.07, 0.05, 0.05, 'square'); }
}
function updateAudio() {
  if (!audio.ctx) return;
  const ctx = audio.ctx, t = ctx.currentTime;
  audio.master.gain.setTargetAtTime(audio.on && !G.paused ? 0.8 : 0, t, 0.2);
  if (!audio.on || G.paused) return;
  audio.rain.gain.setTargetAtTime(raining ? 0.22 : 0, t, 0.8);
  const dAgua = Math.min(...objects.filter(o => ['lago', 'lagoa', 'riacho', 'fonte'].includes(o.type)).map(distTo));
  audio.water.gain.setTargetAtTime(dAgua < 9 ? (1 - dAgua / 9) * 0.14 : 0, t, 0.5);
  if (!isNight() && !raining && t > audio.nextBird) { chirp(t + 0.05); audio.nextBird = t + rand(2, 6); }
  if (isNight() && !raining && t > audio.nextCricket) { cricket(t + 0.05); audio.nextCricket = t + rand(0.3, 1); }
}

// acesso tardio para módulos carregados antes deste
Object.defineProperties(H, {
  sfx: { get: () => sfx },
});
export { audio, startAudio, updateAudio };
