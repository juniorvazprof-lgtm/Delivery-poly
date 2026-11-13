// Sons sintetizados na hora (Web Audio), sem arquivos. Curtos e com limite de repetição para não virar ruído.
let ac = null, master = null, on = true;
const last = {};
try { on = localStorage.getItem('fendas_sound') !== '0'; } catch { /* sem storage */ }

function ctx() {
  if (!ac) {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    ac = new A(); master = ac.createGain(); master.gain.value = 0.35; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// o navegador só libera áudio depois de um toque
addEventListener('pointerdown', () => ctx(), { once: true });
addEventListener('keydown', () => ctx(), { once: true });

function tone({ f = 440, f2 = f, dur = 0.1, type = 'square', vol = 0.3, delay = 0 }) {
  const a = ctx(); if (!a || !on) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise({ dur = 0.15, vol = 0.25, freq = 1200, delay = 0 }) {
  const a = ctx(); if (!a || !on) return;
  const t = a.currentTime + delay, len = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
  s.buffer = b; fl.type = 'lowpass'; fl.frequency.value = freq; g.gain.value = vol;
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t);
}
// no máximo um som de cada tipo a cada `gap` segundos
const gate = (k, gap) => { const n = performance.now() / 1000; if (n - (last[k] || 0) < gap) return false; last[k] = n; return true; };

export const sfx = {
  get on() { return on; },
  toggle() { on = !on; try { localStorage.setItem('fendas_sound', on ? '1' : '0'); } catch { /* ignorar */ } return on; },
  hit() { if (gate('hit', 0.06)) tone({ f: 220 + Math.random() * 60, f2: 90, dur: 0.06, vol: 0.12 }); },
  kill() { if (gate('kill', 0.05)) noise({ dur: 0.08, vol: 0.12, freq: 2200 }); },
  // o tom do cristal sobe com o combo
  gem(combo = 0) { if (gate('gem', 0.04)) tone({ f: 660 * Math.pow(2, Math.min(combo, 24) / 24), dur: 0.07, type: 'triangle', vol: 0.12 }); },
  coin() { tone({ f: 990, dur: 0.06, type: 'square', vol: 0.12 }); tone({ f: 1480, dur: 0.1, type: 'square', vol: 0.12, delay: 0.06 }); },
  heart() { tone({ f: 520, f2: 880, dur: 0.2, type: 'triangle', vol: 0.25 }); },
  levelup() { [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.12, type: 'square', vol: 0.18, delay: i * 0.07 })); },
  pick() { tone({ f: 784, f2: 1175, dur: 0.12, type: 'triangle', vol: 0.25 }); },
  hurt() { if (gate('hurt', 0.2)) { tone({ f: 180, f2: 60, dur: 0.18, type: 'sawtooth', vol: 0.25 }); } },
  boom() { if (gate('boom', 0.12)) { noise({ dur: 0.35, vol: 0.35, freq: 600 }); tone({ f: 120, f2: 40, dur: 0.3, type: 'sine', vol: 0.4 }); } },
  zap() { if (gate('zap', 0.08)) tone({ f: 1800, f2: 300, dur: 0.08, type: 'sawtooth', vol: 0.1 }); },
  warn() { [0, 0.25].forEach(d => tone({ f: 330, f2: 300, dur: 0.2, type: 'square', vol: 0.25, delay: d })); },
  spin() { if (gate('spin', 0.07)) tone({ f: 900 + Math.random() * 300, dur: 0.03, type: 'square', vol: 0.08 }); },
  stop() { tone({ f: 1320, f2: 1760, dur: 0.15, type: 'triangle', vol: 0.3 }); },
  bless() { [659, 880, 1319].forEach((f, i) => tone({ f, dur: 0.25, type: 'sine', vol: 0.25, delay: i * 0.08 })); },
  evo() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.18, type: 'triangle', vol: 0.25, delay: i * 0.06 })); },
  over() { [392, 330, 262, 196].forEach((f, i) => tone({ f, dur: 0.25, type: 'triangle', vol: 0.25, delay: i * 0.15 })); },
};
