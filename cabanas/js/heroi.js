// Personagem (casaco vermelho, chapéu, espingarda e lanterna) e controles: joystick, teclado e botões.
import * as T from './lib/three.module.js';
import { brilho, caixa } from './mundo.js';
import { CFG } from './config.js';

export function criarHeroi(scene) {
  const heroi = new T.Group(); scene.add(heroi);
  const corpo = new T.Group(); heroi.add(corpo);
  const pernaE = new T.Group(), pernaD = new T.Group();
  pernaE.position.set(-0.13, 0.62, 0); pernaD.position.set(0.13, 0.62, 0);
  for (const p of [pernaE, pernaD]) p.add(caixa(0.2, 0.62, 0.22, '#2b2f52', 0, -0.31, 0), caixa(0.22, 0.14, 0.3, '#2b1d2a', 0, -0.58, 0.04));
  corpo.add(pernaE, pernaD);
  corpo.add(caixa(0.56, 0.62, 0.34, '#8a2c3a', 0, 0.95, 0), caixa(0.58, 0.1, 0.36, '#4a2c2a', 0, 0.7, 0), caixa(0.34, 0.32, 0.32, '#e8b08a', 0, 1.42, 0),
    caixa(0.5, 0.08, 0.5, '#2b1d2a', 0, 1.6, 0), caixa(0.32, 0.2, 0.32, '#4a2c2a', 0, 1.72, 0));
  corpo.add(caixa(0.36, 0.5, 0.14, '#4a2c2a', 0, 1.0, -0.24));                  // mochila (o saque)
  const bracoD = new T.Group(); bracoD.position.set(0.34, 1.18, 0);
  bracoD.add(caixa(0.16, 0.44, 0.16, '#8a2c3a', 0, -0.2, 0.08));
  const arma = new T.Group(); arma.position.set(0, -0.36, 0.2);
  arma.add(caixa(0.08, 0.08, 0.9, '#3a3f5a', 0, 0.02, 0.4), caixa(0.12, 0.14, 0.34, '#6e4434', 0, -0.03, -0.06));
  bracoD.add(arma); bracoD.rotation.x = -1.1; corpo.add(bracoD);
  const bracoE = new T.Group(); bracoE.position.set(-0.34, 1.18, 0);
  bracoE.add(caixa(0.16, 0.44, 0.16, '#8a2c3a', 0, -0.2, 0.08), caixa(0.12, 0.12, 0.26, '#5d6a8a', 0, -0.4, 0.2));
  const lente = caixa(0.1, 0.1, 0.03, brilho('#fffbe6'), 0, -0.4, 0.34); bracoE.add(lente);
  bracoE.rotation.x = -1.0; corpo.add(bracoE);
  const foco = new T.SpotLight('#f8e6a0', 60, 15, 0.42, 0.35, 1.2);
  foco.castShadow = true; foco.shadow.mapSize.set(512, 512); foco.shadow.camera.near = 0.2;
  foco.position.set(-0.34, 1.1, 0.35); heroi.add(foco);
  const alvoFoco = new T.Object3D(); alvoFoco.position.set(-0.2, 0, 5); heroi.add(alvoFoco); foco.target = alvoFoco;
  const preench = new T.PointLight('#c5d3e8', 5, 3.2, 1.4); preench.position.set(0.6, 2.4, 0.8); heroi.add(preench);
  const boca = new T.Object3D(); boca.position.set(0, 0.02, 0.88); arma.add(boca);

  const h = {
    g: heroi, corpo, pernaE, pernaD, bracoD, bracoE, arma, boca,
    vida: CFG.heroi.vida, invul: 0, passo: 0, coice: 0, lanterna: true, caido: false,
    setLanterna(v) { h.lanterna = v; foco.visible = v; lente.material.color.set(v ? '#fffbe6' : '#3a3f5a'); document.getElementById('lamp')?.classList.toggle('off', !v); },
    frente() { return new T.Vector3(Math.sin(heroi.rotation.y), 0, Math.cos(heroi.rotation.y)); },
    animar(dt, t, mag) {
      if (mag > 0.05) h.passo += dt * 9 * mag; else h.passo += (Math.round(h.passo / Math.PI) * Math.PI - h.passo) * Math.min(1, dt * 10);
      const sw = Math.sin(h.passo);
      pernaE.rotation.x = sw * 0.55; pernaD.rotation.x = -sw * 0.55; corpo.position.y = Math.abs(Math.cos(h.passo)) * 0.06;
      h.coice = Math.max(0, h.coice - dt * 7);
      bracoE.rotation.x = -1.0 + sw * 0.06; bracoD.rotation.x = -1.1 - sw * 0.06 - h.coice * 0.55; arma.position.z = 0.2 - h.coice * 0.12;
      if (h.lanterna) foco.intensity = 60 + Math.sin(t * 23) * 1.5;
      heroi.visible = !(h.invul > 0 && Math.floor(t * 14) % 2);
    },
  };
  return h;
}

/** Entrada: joystick na metade esquerda da tela, botões à direita, teclado (WASD/setas, espaço, F, R). */
export function criarEntrada() {
  const e = { x: 0, z: 0, id: null, teclas: new Set(), atirando: false, lanterna: 0, recarregar: 0 };
  const stick = document.getElementById('stick'), knob = document.getElementById('knob'), R = 50;
  const centro = () => { const r = stick.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const mover = ev => { const [cx, cy] = centro(); let dx = ev.clientX - cx, dy = ev.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; e.x = l > 6 ? dx / R : 0; e.z = l > 6 ? dy / R : 0; };
  addEventListener('pointerdown', ev => { if (ev.target.closest('button,.tela') || e.id !== null || ev.clientX > innerWidth * 0.55) return; e.id = ev.pointerId; stick.classList.add('on'); mover(ev); });
  addEventListener('pointermove', ev => { if (ev.pointerId === e.id) mover(ev); });
  const soltar = ev => { if (ev.pointerId !== e.id) return; e.id = null; e.x = e.z = 0; stick.classList.remove('on'); knob.style.transform = ''; };
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  addEventListener('keydown', ev => { const k = ev.key.toLowerCase(); e.teclas.add(k); if (k === 'f' && !ev.repeat) e.lanterna++; if (k === 'r' && !ev.repeat) e.recarregar++; if (k === ' ') { e.atirando = true; ev.preventDefault(); } });
  addEventListener('keyup', ev => { e.teclas.delete(ev.key.toLowerCase()); if (ev.key === ' ') e.atirando = false; });
  const fogo = document.getElementById('fire');
  fogo.addEventListener('pointerdown', ev => { ev.preventDefault(); e.atirando = true; fogo.classList.add('on'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => fogo.addEventListener(n, () => { e.atirando = false; fogo.classList.remove('on'); }));
  document.getElementById('lamp').onclick = () => e.lanterna++;
  document.getElementById('reload').onclick = () => e.recarregar++;
  /** Direção pedida (−1..1 nos dois eixos da tela). */
  e.direcao = () => {
    if (e.id !== null) return [e.x, e.z];
    const k = e.teclas, b = n => (k.has(n) ? 1 : 0);
    return [Math.max(b('d'), b('arrowright')) - Math.max(b('a'), b('arrowleft')), Math.max(b('s'), b('arrowdown')) - Math.max(b('w'), b('arrowup'))];
  };
  return e;
}
