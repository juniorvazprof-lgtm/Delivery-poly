// Entrada: joystick flutuante (metade esquerda), botões à direita, teclado no computador.
// Cada dedo mantém sua captura de ponteiro. Perder foco ou abrir menu limpa tudo.
export function createInput({ layer, stick, knob, attackBtn, dodgeBtn, onPause }) {
  const R = 58, DEAD = 0.15;
  const s = { id: null, ox: 0, oy: 0, mx: 0, mz: 0, atkT: -1e9, dodgeT: -1e9, atkHeld: false, keyAtk: false, keys: new Set() };
  const now = () => performance.now();

  const showStick = (x, y) => { stick.style.left = x + 'px'; stick.style.top = y + 'px'; stick.classList.add('on'); knob.style.transform = ''; };
  const hideStick = () => { stick.classList.remove('on'); knob.style.transform = ''; };

  layer.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || s.id !== null || e.clientX > innerWidth * 0.55) return;
    e.preventDefault();
    s.id = e.pointerId; s.ox = e.clientX; s.oy = e.clientY;
    layer.setPointerCapture(e.pointerId);
    showStick(s.ox, s.oy);
  });
  layer.addEventListener('pointermove', e => {
    if (e.pointerId !== s.id) return;
    let dx = e.clientX - s.ox, dy = e.clientY - s.oy;
    const len = Math.hypot(dx, dy);
    if (len > R) { dx *= R / len; dy *= R / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const m = Math.min(1, len / R);
    if (m < DEAD) { s.mx = s.mz = 0; return; }
    s.mx = dx / R; s.mz = dy / R;              // tela para baixo = +z no mundo
  });
  const endStick = e => { if (e.pointerId !== s.id) return; s.id = null; s.mx = s.mz = 0; hideStick(); };
  layer.addEventListener('pointerup', endStick);
  layer.addEventListener('pointercancel', endStick);
  layer.addEventListener('lostpointercapture', endStick);
  layer.addEventListener('contextmenu', e => e.preventDefault());

  function bindButton(btn, down, up) {
    btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); btn.setPointerCapture(e.pointerId); btn.classList.add('down'); down(); });
    const rel = () => { btn.classList.remove('down'); up?.(); };
    btn.addEventListener('pointerup', rel);
    btn.addEventListener('pointercancel', rel);
    btn.addEventListener('lostpointercapture', rel);
  }
  bindButton(attackBtn, () => { s.atkT = now(); s.atkHeld = true; }, () => { s.atkHeld = false; });
  bindButton(dodgeBtn, () => { s.dodgeT = now(); });

  const MOVE = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (MOVE[k]) { s.keys.add(k); e.preventDefault(); }
    if ((k === 'j' || k === 'enter') && !e.repeat) { s.atkT = now(); s.keyAtk = true; }
    if ((k === 'k' || k === ' ' || k === 'shift') && !e.repeat) { s.dodgeT = now(); e.preventDefault(); }
    if ((k === 'escape' || k === 'p') && !e.repeat) onPause();
  });
  addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    s.keys.delete(k);
    if (k === 'j' || k === 'enter') s.keyAtk = false;
  });

  return {
    move() {
      if (s.id !== null) return { x: s.mx, z: s.mz };
      let x = 0, z = 0;
      for (const k of s.keys) { x += MOVE[k][0]; z += MOVE[k][1]; }
      const l = Math.hypot(x, z);
      return l ? { x: x / l, z: z / l } : { x: 0, z: 0 };
    },
    attack: buf => s.atkHeld || s.keyAtk || now() - s.atkT < buf * 1000,
    dodge: buf => now() - s.dodgeT < buf * 1000,
    consumeAttack() { s.atkT = -1e9; },
    consumeDodge() { s.dodgeT = -1e9; },
    clear() {
      s.id = null; s.mx = s.mz = 0; s.atkT = s.dodgeT = -1e9; s.atkHeld = s.keyAtk = false; s.keys.clear();
      hideStick(); attackBtn.classList.remove('down'); dodgeBtn.classList.remove('down');
    },
  };
}
