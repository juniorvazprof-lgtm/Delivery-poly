// Personagem (casaco vermelho, chapéu, espingarda e lanterna) e controles: joystick, teclado e botões.
import * as T from './lib/three.module.js';
import { brilho, caixa } from './mundo.js';
import { CFG } from './config.js';
import { adicionar, contar, remover } from './inventario.js';

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
  // ---- braços e armas: cada arma tem a sua pose (braços vão do ombro até onde a mão segura) ----
  const ombroD = new T.Vector3(0.3, 1.2, 0), ombroE = new T.Vector3(-0.3, 1.2, 0);
  /** Braço como uma caixa que vai do ombro até a mão, com a mão na ponta. */
  function braco(ombro, mao) {
    const g = new T.Group(), v = mao.clone().sub(ombro), L = v.length();
    g.add(caixa(0.15, L, 0.15, '#8a2c3a', 0, -L / 2, 0), caixa(0.13, 0.12, 0.13, '#e8b08a', 0, -L, 0));
    g.position.copy(ombro); g.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), v.normalize()); return g;
  }
  const rigs = {};
  // espingarda: coronha no ombro direito, mão direita no punho, mão esquerda na telha; lanterna presa sob o cano
  {
    const r = new T.Group(), arma = new T.Group(); arma.position.set(0.16, 1.1, 0);
    arma.add(caixa(0.07, 0.07, 0.62, '#3a3f5a', 0, 0.04, 0.62), caixa(0.06, 0.06, 0.5, '#2b2f52', 0, -0.03, 0.56),   // cano e tubo do carregador
      caixa(0.1, 0.12, 0.2, '#3a3f5a', 0, 0, 0.22), caixa(0.11, 0.09, 0.2, '#6e4434', 0, -0.03, 0.48),               // caixa da culatra e telha
      caixa(0.09, 0.13, 0.3, '#6e4434', 0, -0.04, -0.04), caixa(0.08, 0.1, 0.06, '#4a2c2a', 0, -0.07, 0.14),         // coronha e punho
      caixa(0.07, 0.07, 0.12, '#5d6a8a', 0, -0.1, 0.72));                                                           // lanterna sob o cano
    const lente = caixa(0.06, 0.06, 0.02, brilho('#fffbe6'), 0, -0.1, 0.79); arma.add(lente);
    r.add(arma, braco(ombroD, new T.Vector3(0.16, 1.03, 0.15)), braco(ombroE, new T.Vector3(0.12, 1.06, 0.5)));
    rigs.espingarda = { r, arma, lente, boca: new T.Vector3(0.16, 1.14, 0.95), luz: new T.Vector3(0.16, 1.0, 0.82), recuo: 0.12 };
  }
  // pistola: empunhadura com as duas mãos, braços estendidos à frente do peito; lanterna na mão de apoio, sob a arma
  {
    const r = new T.Group(), arma = new T.Group(); arma.position.set(0.03, 1.16, 0.5);
    const cabo = caixa(0.06, 0.15, 0.07, '#2b2f52', 0, -0.07, -0.02); cabo.rotation.x = 0.25;
    arma.add(caixa(0.07, 0.08, 0.26, '#3a3f5a', 0, 0.03, 0.08), cabo, caixa(0.05, 0.05, 0.1, '#5d6a8a', -0.01, -0.12, 0.08));
    const lente = caixa(0.04, 0.04, 0.02, brilho('#fffbe6'), -0.01, -0.12, 0.14); arma.add(lente);
    r.add(arma, braco(ombroD, new T.Vector3(0.06, 1.1, 0.46)), braco(ombroE, new T.Vector3(-0.01, 1.07, 0.47)));
    rigs.pistola = { r, arma, lente, boca: new T.Vector3(0.03, 1.19, 0.73), luz: new T.Vector3(0.02, 1.04, 0.66), recuo: 0.07 };
  }
  for (const k in rigs) corpo.add(rigs[k].r);
  const foco = new T.SpotLight('#f8e6a0', 60, CFG.visao.alcance + 1, CFG.visao.angulo, 0.35, 1.2);
  foco.castShadow = true; foco.shadow.mapSize.set(512, 512); foco.shadow.camera.near = 0.2; heroi.add(foco);
  const alvoFoco = new T.Object3D(); heroi.add(alvoFoco); foco.target = alvoFoco;
  const preench = new T.PointLight('#c5d3e8', 5, 3.2, 1.4); preench.position.set(0.6, 2.4, 0.8); heroi.add(preench);
  const boca = new T.Object3D(); heroi.add(boca);
  let rig = rigs.espingarda;
  function usar(nome) {
    rig = rigs[nome]; for (const k in rigs) rigs[k].r.visible = k === nome;
    foco.position.copy(rig.luz); alvoFoco.position.set(rig.luz.x, 0, 6); boca.position.copy(rig.boca);
  }
  usar('espingarda');

  const h = {
    g: heroi, corpo, pernaE, pernaD, boca, usar,
    vida: CFG.heroi.vida, invul: 0, passo: 0, coice: 0, lanterna: true, caido: false, bateria: 1, devagar: false, piscar: false, inv: null,
    // pilhas e velas vivem no inventário: ler conta, escrever adiciona ou remove (o que não couber se perde)
    get pilhas() { return h.inv ? contar(h.inv, 'pilha') : 0; }, set pilhas(v) { ajustar('pilha', v); },
    get sinalizadores() { return h.inv ? contar(h.inv, 'vela') : 0; }, set sinalizadores(v) { ajustar('vela', v); },
    setLanterna(v) { h.lanterna = v; foco.visible = v; for (const k in rigs) rigs[k].lente.material.color.set(v ? '#fffbe6' : '#3a3f5a'); document.getElementById('lamp')?.classList.toggle('off', !v); },
    frente() { return new T.Vector3(Math.sin(heroi.rotation.y), 0, Math.cos(heroi.rotation.y)); },
    animar(dt, t, mag) {
      if (mag > 0.05) h.passo += dt * 9 * mag; else h.passo += (Math.round(h.passo / Math.PI) * Math.PI - h.passo) * Math.min(1, dt * 10);
      const sw = Math.sin(h.passo);
      pernaE.rotation.x = sw * 0.55; pernaD.rotation.x = -sw * 0.55; corpo.position.y = Math.abs(Math.cos(h.passo)) * 0.06;
      h.coice = Math.max(0, h.coice - dt * 7);
      // coice: a arma (e os braços) recuam e o cano sobe um pouco; ao andar, a mira balança de leve
      rig.r.position.z = -h.coice * rig.recuo; rig.r.rotation.x = -h.coice * 0.12 + sw * 0.015;
      if (h.lanterna) foco.intensity = h.piscar ? 4 : (h.bateria < CFG.lanterna.fraca ? 38 : 60) + Math.sin(t * 23) * 1.5;
      corpo.position.y -= h.devagar ? 0.08 : 0;   // andando devagar, o corpo abaixa um pouco
      heroi.visible = !(h.invul > 0 && Math.floor(t * 14) % 2);
    },
  };
  function ajustar(id, v) { if (!h.inv) return; const d = v - contar(h.inv, id); if (d > 0) adicionar(h.inv, id, d); else if (d < 0) remover(h.inv, id, -d); }
  return h;
}

/** Entrada: joystick na metade esquerda da tela, botões à direita, teclado (WASD/setas, espaço, F, R). */
export function criarEntrada() {
  const e = { x: 0, z: 0, id: null, teclas: new Set(), atirando: false, lanterna: 0, recarregar: 0, trocar: 0, sinalizador: 0 };
  const stick = document.getElementById('stick'), knob = document.getElementById('knob'), R = 50;
  const centro = () => { const r = stick.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const mover = ev => { const [cx, cy] = centro(); let dx = ev.clientX - cx, dy = ev.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; e.x = l > 6 ? dx / R : 0; e.z = l > 6 ? dy / R : 0; };
  addEventListener('pointerdown', ev => { if (ev.target.closest('button,.tela') || e.id !== null || ev.clientX > innerWidth * 0.55) return; e.id = ev.pointerId; stick.classList.add('on'); mover(ev); });
  addEventListener('pointermove', ev => { if (ev.pointerId === e.id) mover(ev); });
  const soltar = ev => { if (ev.pointerId !== e.id) return; e.id = null; e.x = e.z = 0; stick.classList.remove('on'); knob.style.transform = ''; };
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  addEventListener('keydown', ev => { const k = ev.key.toLowerCase(); e.teclas.add(k); if (k === 'f' && !ev.repeat) e.lanterna++; if (k === 'r' && !ev.repeat) e.recarregar++; if (k === 'q' && !ev.repeat) e.trocar++; if (k === 'g' && !ev.repeat) e.sinalizador++; if (k === ' ') { e.atirando = true; ev.preventDefault(); } });
  addEventListener('keyup', ev => { e.teclas.delete(ev.key.toLowerCase()); if (ev.key === ' ') e.atirando = false; });
  const fogo = document.getElementById('fire');
  fogo.addEventListener('pointerdown', ev => { ev.preventDefault(); e.atirando = true; fogo.classList.add('on'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => fogo.addEventListener(n, () => { e.atirando = false; fogo.classList.remove('on'); }));
  document.getElementById('lamp').onclick = () => e.lanterna++;
  document.getElementById('reload').onclick = () => e.recarregar++;
  document.getElementById('swap').onclick = () => e.trocar++;
  document.getElementById('flare').onclick = () => e.sinalizador++;
  // com teclado: Shift segurado = andar devagar
  addEventListener('keydown', ev => { if (ev.key === 'Shift') e.devagarTecla = true; }); addEventListener('keyup', ev => { if (ev.key === 'Shift') e.devagarTecla = false; });
  /** Direção pedida (−1..1 nos dois eixos da tela). */
  e.direcao = () => {
    if (e.id !== null) return [e.x, e.z];
    const k = e.teclas, b = n => (k.has(n) ? 1 : 0);
    const v = e.devagarTecla ? 0.45 : 1;
    return [(Math.max(b('d'), b('arrowright')) - Math.max(b('a'), b('arrowleft'))) * v, (Math.max(b('s'), b('arrowdown')) - Math.max(b('w'), b('arrowup'))) * v];
  };
  return e;
}
