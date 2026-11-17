// Sons sintetizados na hora (Web Audio): sem arquivos de áudio e sem direitos autorais envolvidos.
// Começam no primeiro toque (exigência dos navegadores). Tecla M liga/desliga.
let ctx = null, mestre = null, ruido = null, ambiente = null, chiado = null, ligado = true;
try { ligado = localStorage.getItem('cabanas.som') !== '0'; } catch { /* sem armazenamento */ }

function montar() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); mestre = ctx.createGain(); mestre.gain.value = ligado ? 0.8 : 0;
  const comp = ctx.createDynamicsCompressor(); mestre.connect(comp); comp.connect(ctx.destination);
  ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
/** Ruído filtrado com envelope (tiros, passos na mata, impactos, chiado). */
function chiar({ dur = 0.2, vol = 0.5, f = 1000, q = 0.7, tipo = 'lowpass', ataque = 0.002, quando = 0, fim = null, destino = null }) {
  if (!ctx) return null; const t = ctx.currentTime + quando, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruido; s.loop = dur > 1.9; fl.type = tipo; fl.frequency.setValueAtTime(f, t); if (fim) fl.frequency.exponentialRampToValueAtTime(fim, t + dur); fl.Q.value = q;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(destino || mestre); s.start(t, Math.random()); s.stop(t + dur + 0.05); return g;
}
/** Tom com queda de frequência (baques, cliques, sinos, gemidos). */
function tom({ f = 200, f2 = null, dur = 0.2, vol = 0.3, tipo = 'sine', quando = 0, ataque = 0.005 }) {
  if (!ctx) return; const t = ctx.currentTime + quando, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(mestre); o.start(t); o.stop(t + dur + 0.05);
}

export const SOM = {
  iniciar() { if (!montar()) return; void ctx.resume(); if (!ambiente) iniciarAmbiente(); },
  alternar() { ligado = !ligado; try { localStorage.setItem('cabanas.som', ligado ? '1' : '0'); } catch { /* */ } if (mestre) mestre.gain.setTargetAtTime(ligado ? 0.8 : 0, ctx.currentTime, 0.05); return ligado; },
  get ligado() { return ligado; },
  espingarda() { chiar({ dur: 0.45, vol: 0.9, f: 3200, fim: 300 }); tom({ f: 120, f2: 40, dur: 0.35, vol: 0.7, tipo: 'triangle' }); chiar({ dur: 1.2, vol: 0.12, f: 600, quando: 0.08 }); },
  pistola() { chiar({ dur: 0.18, vol: 0.6, f: 4500, fim: 900 }); tom({ f: 220, f2: 70, dur: 0.15, vol: 0.4, tipo: 'triangle' }); chiar({ dur: 0.6, vol: 0.06, f: 900, quando: 0.05 }); },
  recarga(espingarda) { const n = espingarda ? 3 : 2; for (let i = 0; i < n; i++) { tom({ f: 1800, dur: 0.03, vol: 0.12, tipo: 'square', quando: 0.25 + i * 0.32 }); chiar({ dur: 0.06, vol: 0.2, f: 2500, tipo: 'bandpass', q: 3, quando: 0.25 + i * 0.32 }); } },
  vazio() { tom({ f: 2600, dur: 0.025, vol: 0.15, tipo: 'square' }); },
  troca() { chiar({ dur: 0.12, vol: 0.2, f: 1800, tipo: 'bandpass', q: 2 }); tom({ f: 900, dur: 0.04, vol: 0.08, tipo: 'square', quando: 0.12 }); },
  impacto() { chiar({ dur: 0.12, vol: 0.35, f: 700, fim: 200 }); tom({ f: 90, f2: 50, dur: 0.1, vol: 0.3 }); },
  queda() { tom({ f: 70, f2: 35, dur: 0.4, vol: 0.4, tipo: 'triangle', quando: 0.25 }); chiar({ dur: 0.3, vol: 0.2, f: 400, quando: 0.25 }); },
  /** Gemido de zumbi; `perto` 0..1 controla o volume (longe = baixo). */
  gemido(perto) {
    if (!ctx) return; const v = 0.05 + perto * 0.22, f = 85 + Math.random() * 50, dur = 0.8 + Math.random() * 0.8;
    tom({ f, f2: f * 0.7, dur, vol: v, tipo: 'sawtooth', ataque: 0.15 });
    chiar({ dur, vol: v * 0.6, f: 500 + Math.random() * 300, tipo: 'bandpass', q: 4, ataque: 0.15 });
  },
  dor() { tom({ f: 180, f2: 110, dur: 0.22, vol: 0.3, tipo: 'sawtooth' }); chiar({ dur: 0.18, vol: 0.2, f: 900, tipo: 'bandpass', q: 2 }); },
  moeda() { tom({ f: 1320, dur: 0.12, vol: 0.12, tipo: 'square' }); tom({ f: 1760, dur: 0.2, vol: 0.1, tipo: 'square', quando: 0.07 }); },
  carteira() { [988, 1318, 1568, 2093].forEach((f, i) => tom({ f, dur: 0.25, vol: 0.1, tipo: 'square', quando: i * 0.07 })); },
  municao() { tom({ f: 600, dur: 0.05, vol: 0.12, tipo: 'square' }); tom({ f: 800, dur: 0.05, vol: 0.12, tipo: 'square', quando: 0.06 }); },
  caixa() { chiar({ dur: 0.25, vol: 0.3, f: 500, tipo: 'bandpass', q: 1.5 }); tom({ f: 140, dur: 0.15, vol: 0.2, tipo: 'triangle', quando: 0.15 }); },
  lanterna() { tom({ f: 3000, dur: 0.02, vol: 0.12, tipo: 'square' }); },
  bip() { tom({ f: 1500, dur: 0.09, vol: 0.15, tipo: 'square' }); },
  sinal() { tom({ f: 400, f2: 900, dur: 0.6, vol: 0.18, tipo: 'sawtooth' }); if (ctx && !chiado) chiado = chiar({ dur: 999, vol: 0.06, f: 3500, tipo: 'highpass', ataque: 0.5 }); },
  pararSinal() { if (chiado) { chiado.gain.cancelScheduledValues(ctx.currentTime); chiado.gain.setTargetAtTime(0, ctx.currentTime, 0.2); chiado = null; } },
  helicoptero() { if (!ctx) return; for (let i = 0; i < 26; i++) chiar({ dur: 0.09, vol: 0.06 + Math.min(i, 12) * 0.025, f: 300, tipo: 'lowpass', quando: i * 0.085 }); },
  passo() { chiar({ dur: 0.07, vol: 0.05, f: 900, tipo: 'bandpass', q: 1.2 }); },
  grito() { tom({ f: 520, f2: 260, dur: 1.4, vol: 0.32, tipo: 'sawtooth', ataque: 0.05 }); tom({ f: 760, f2: 300, dur: 1.2, vol: 0.18, tipo: 'square', ataque: 0.05 }); chiar({ dur: 1.3, vol: 0.25, f: 2200, tipo: 'bandpass', q: 3 }); },
  sinalizadorMao() { tom({ f: 300, dur: 0.06, vol: 0.2, tipo: 'square' }); chiar({ dur: 1.4, vol: 0.18, f: 4000, tipo: 'highpass', ataque: 0.05 }); },
  vasculhar() { for (let i = 0; i < 5; i++) chiar({ dur: 0.12, vol: 0.12, f: 1200 + Math.random() * 800, tipo: 'bandpass', q: 2, quando: i * 0.35 }); },
  pilha() { tom({ f: 1200, dur: 0.04, vol: 0.12, tipo: 'square' }); tom({ f: 3000, dur: 0.02, vol: 0.12, tipo: 'square', quando: 0.12 }); },
  derrota() { tom({ f: 196, f2: 98, dur: 1.4, vol: 0.25, tipo: 'triangle' }); tom({ f: 147, f2: 73, dur: 1.6, vol: 0.2, tipo: 'triangle', quando: 0.2 }); },
  vitoria() { [392, 523, 659, 784].forEach((f, i) => tom({ f, dur: 0.35, vol: 0.12, tipo: 'square', quando: i * 0.12 })); },
};

// noite na floresta: vento baixo e grilos
function iniciarAmbiente() {
  ambiente = chiar({ dur: 999, vol: 0.05, f: 380, ataque: 2 });
  const grilo = () => { if (!ctx) return; for (let i = 0; i < 3; i++) tom({ f: 4200 + Math.random() * 300, dur: 0.04, vol: 0.012 + Math.random() * 0.01, tipo: 'sine', quando: i * 0.07 }); setTimeout(grilo, 600 + Math.random() * 2400); };
  grilo();
}
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm' && !e.repeat) SOM.alternar(); });
