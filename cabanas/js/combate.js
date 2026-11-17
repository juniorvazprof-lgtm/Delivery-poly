// Combate: zumbis (percepção por barulho e lanterna), tiro com munição e recarga, efeitos e saque no chão.
import * as T from './lib/three.module.js';
import { CFG } from './config.js';
import { brilho, caixa, mat } from './mundo.js';

const tmpA = new T.Vector3(), tmpB = new T.Vector3();
/** Tira um objeto da cena e libera a memória das peças que são só dele. */
function descartar(scene, g) { scene.remove(g); g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }

export function criarCombate(mundo, heroi, render, eventos) {
  const { scene } = mundo, Z = CFG.zumbi, A = CFG.arma;
  const zumbis = [], pedacos = [], saques = [];

  // ---------- efeitos do tiro ----------
  const luzTiro = new T.PointLight('#f8e6a0', 0, 5, 1.2); scene.add(luzTiro);
  const clarao = new T.Mesh(new T.BoxGeometry(0.22, 0.22, 0.22), brilho('#fffbe6')); clarao.visible = false; scene.add(clarao);
  const rastro = new T.Mesh(new T.BoxGeometry(0.05, 0.05, 1), brilho('#f8e6a0')); rastro.visible = false; scene.add(rastro);
  const geoPedaco = new T.BoxGeometry(0.09, 0.09, 0.09), matsPedaco = {};
  function respingo(p, cor, n, sp = 2.5) {
    const m0 = (matsPedaco[cor] ??= brilho(cor));
    for (let i = 0; i < n; i++) { const m = new T.Mesh(geoPedaco, m0); m.position.copy(p); m.userData = { v: new T.Vector3((Math.random() - .5) * sp, Math.random() * sp, (Math.random() - .5) * sp), t: 0.5 }; scene.add(m); pedacos.push(m); }
  }

  // ---------- zumbis ----------
  function modeloZumbi() {
    const g = new T.Group(), b = new T.Group(); g.add(b);
    const pele = mat('#6fa35a'), roupa = mat('#3a3f5a'), calca = mat('#2b2f52');
    const lE = new T.Group(), lD = new T.Group(); lE.position.set(-0.13, 0.6, 0); lD.position.set(0.13, 0.6, 0);
    lE.add(caixa(0.2, 0.6, 0.22, calca, 0, -0.3, 0)); lD.add(caixa(0.2, 0.6, 0.22, calca, 0, -0.3, 0)); b.add(lE, lD);
    b.add(caixa(0.54, 0.6, 0.32, roupa, 0, 0.92, 0), caixa(0.2, 0.18, 0.05, mat('#8a2c3a'), 0.1, 1.0, 0.17));
    const cab = caixa(0.34, 0.34, 0.32, pele, 0.04, 1.42, 0.04); cab.rotation.z = 0.25; b.add(cab);
    b.add(caixa(0.07, 0.05, 0.02, brilho('#e84040'), -0.04, 1.46, 0.21), caixa(0.07, 0.05, 0.02, brilho('#e84040'), 0.12, 1.48, 0.21));
    const aE = new T.Group(), aD = new T.Group(); aE.position.set(-0.33, 1.15, 0); aD.position.set(0.33, 1.15, 0);
    aE.add(caixa(0.15, 0.5, 0.15, pele, 0, -0.22, 0)); aD.add(caixa(0.15, 0.5, 0.15, pele, 0, -0.22, 0));
    aE.rotation.x = aD.rotation.x = -1.45; b.add(aE, aD);
    return { g, b, lE, lD, aE, aD, mats: [pele, roupa] };
  }
  /** Cria um zumbi num ponto livre entre `min` e `max` de distância do jogador. */
  function surgir(min, max, horda = false) {
    const hp = heroi.g.position; let x = 0, z = 0, ok = false;
    for (let k = 0; k < 60 && !ok; k++) { const a = Math.random() * 6.28, d = min + Math.random() * (max - min); x = hp.x + Math.sin(a) * d; z = hp.z + Math.cos(a) * d; ok = mundo.livre(x, z, 0.6); }
    if (!ok) return null;
    const m = modeloZumbi(); m.g.position.set(x, 0, z); scene.add(m.g);
    const zb = { ...m, vida: Z.vida, morto: false, t: Math.random() * 6, tocado: 0, ataque: 0, kx: 0, kz: 0, mortoT: 0, cacando: horda, horda };
    zumbis.push(zb); return zb;
  }
  /** Surge junto de um ponto (para grupos). */
  function surgirPerto(c) {
    for (let k = 0; k < 20; k++) { const x = c.x + (Math.random() - 0.5) * 3, z = c.z + (Math.random() - 0.5) * 3;
      if (mundo.livre(x, z, 0.6)) { const m = modeloZumbi(); m.g.position.set(x, 0, z); scene.add(m.g); const zb = { ...m, vida: Z.vida, morto: false, t: Math.random() * 6, tocado: 0, ataque: 0, kx: 0, kz: 0, mortoT: 0, cacando: true, horda: false }; zumbis.push(zb); return zb; } }
    return null;
  }
  const vivos = () => zumbis.filter(z => !z.morto).length;

  function ferir(z, dir, dano) {
    z.vida -= dano; z.tocado = 0.12; z.kx = dir.x * 3.2; z.kz = dir.z * 3.2; z.cacando = true;
    respingo(z.g.position.clone().setY(1.1), '#8a2c3a', 5 + dano * 2);
    if (z.vida <= 0 && !z.morto) {
      z.morto = true; z.mortoT = 0; respingo(z.g.position.clone().setY(0.8), '#6fa35a', 10);
      eventos.abate(z);
      // saque no chão: moedas e, às vezes, uma carteira fria
      const S = CFG.saque, r = Math.random(), p = z.g.position;
      if (r < S.carteiraFria.chance) soltar(p, 'carteira', sorteio(S.carteiraFria.sats));
      else if (r < S.carteiraFria.chance + S.moeda.chance) soltar(p, 'moeda', sorteio(S.moeda.sats));
      else if (r < S.carteiraFria.chance + S.moeda.chance + S.municao.chance) soltar(p, 'municao', 0);
    }
  }
  const sorteio = ([a, b]) => Math.round(a + Math.random() * (b - a));
  function soltar(p, tipo, sats) {
    const g = new T.Group();
    if (tipo === 'moeda') g.add(caixa(0.24, 0.24, 0.06, brilho('#e8a850'), 0, 0, 0), caixa(0.1, 0.12, 0.07, brilho('#fffbe6'), 0, 0, 0));
    else if (tipo === 'carteira') g.add(caixa(0.36, 0.24, 0.1, brilho('#3fd0c8'), 0, 0, 0), caixa(0.12, 0.08, 0.11, brilho('#fffbe6'), 0.06, 0.03, 0));
    else for (let k = 0; k < 3; k++) g.add(caixa(0.08, 0.22, 0.08, brilho(k === 1 ? '#c84060' : '#8a2c3a'), (k - 1) * 0.11, 0, 0));
    g.position.set(p.x, 0.45, p.z); scene.add(g); saques.push({ g, tipo, sats, t: 0 });
  }

  // ---------- arma ----------
  const arma = { pente: A.pente, reserva: A.reserva, espera: 0, recarregando: 0 };
  function recarregar() { if (arma.recarregando > 0 || arma.pente >= A.pente || arma.reserva <= 0) return false; arma.recarregando = A.recarga; eventos.recarga(); return true; }
  let flashT = 0;
  function atirar() {
    if (arma.espera > 0 || arma.recarregando > 0) return;
    if (arma.pente <= 0) { if (!recarregar()) { arma.espera = 0.4; eventos.semMunicao(); } return; }
    arma.pente--; arma.espera = A.cadencia;
    // mira assistida: vira para o zumbi vivo mais próximo à frente
    const g = heroi.g, frente = heroi.frente(); let melhor = null, bs = 1e9;
    for (const z of zumbis) { if (z.morto) continue; tmpA.subVectors(z.g.position, g.position); const d = tmpA.length(); if (d > A.alcance) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, tmpA.dot(frente) / d))), sc = d + ang * 4; if (sc < bs) { bs = sc; melhor = z; } }
    if (melhor) g.rotation.y = Math.atan2(melhor.g.position.x - g.position.x, melhor.g.position.z - g.position.z);
    g.updateMatrixWorld(true);
    const dir = heroi.frente(); let alvo = null, ha = A.alcance;
    for (const z of zumbis) { if (z.morto) continue; tmpA.subVectors(z.g.position, g.position); const along = tmpA.dot(dir), perp = Math.abs(tmpA.x * dir.z - tmpA.z * dir.x);
      if (along > 0 && along < ha && perp < A.largura) { ha = along; alvo = z; } }
    heroi.boca.getWorldPosition(tmpA); tmpB.copy(g.position).addScaledVector(dir, ha); tmpB.y = 1.0;
    rastro.position.lerpVectors(tmpA, tmpB, 0.5); rastro.scale.z = tmpA.distanceTo(tmpB); rastro.lookAt(tmpB); rastro.visible = true;
    clarao.position.copy(tmpA); clarao.visible = true; luzTiro.position.copy(tmpA); luzTiro.intensity = 30; flashT = 0.07;
    heroi.coice = 1; render.tremer(0.12);
    if (alvo) ferir(alvo, dir, A.dano(ha));
    // barulho: zumbis no raio escutam e vêm
    for (const z of zumbis) if (!z.morto && z.g.position.distanceTo(g.position) < A.barulho) z.cacando = true;
    eventos.tiro();
    if (arma.pente === 0 && arma.reserva > 0) recarregar();
  }

  function passo(dt, t) {
    const g = heroi.g;
    arma.espera -= dt;
    if (arma.recarregando > 0 && (arma.recarregando -= dt) <= 0) { const n = Math.min(A.pente - arma.pente, arma.reserva); arma.pente += n; arma.reserva -= n; arma.recarregando = 0; }
    if ((flashT -= dt) <= 0) { clarao.visible = false; rastro.visible = false; luzTiro.intensity = 0; }
    for (let i = pedacos.length - 1; i >= 0; i--) { const m = pedacos[i], u = m.userData; u.t -= dt; u.v.y -= 9 * dt; m.position.addScaledVector(u.v, dt); if (m.position.y < 0.05) { m.position.y = 0.05; u.v.set(0, 0, 0); }
      if (u.t <= 0) { scene.remove(m); pedacos.splice(i, 1); } }
    // saque: flutua, gira e é puxado quando o jogador chega perto
    for (let i = saques.length - 1; i >= 0; i--) {
      const s = saques[i]; s.t += dt; s.g.rotation.y += dt * 2.5; s.g.position.y = 0.45 + Math.sin(s.t * 3) * 0.08;
      const d = Math.hypot(s.g.position.x - g.position.x, s.g.position.z - g.position.z);
      if (d < CFG.saque.ima && !heroi.caido) { s.g.position.x += (g.position.x - s.g.position.x) * Math.min(1, dt * 10); s.g.position.z += (g.position.z - s.g.position.z) * Math.min(1, dt * 10);
        if (d < 0.45) { descartar(scene, s.g); saques.splice(i, 1); if (s.tipo === 'municao') { arma.reserva += CFG.saque.municao.balas; eventos.municao(CFG.saque.municao.balas); } else eventos.saque(s.tipo, s.sats); } }
    }
    const percebe = heroi.lanterna ? CFG.lanterna.visto : CFG.lanterna.escondido;
    for (let i = zumbis.length - 1; i >= 0; i--) {
      const z = zumbis[i]; z.t += dt;
      if (z.morto) {
        z.mortoT += dt; z.b.rotation.x = -Math.min(1, z.mortoT / 0.35) * Math.PI / 2; z.b.position.y = z.mortoT > 1.5 ? -(z.mortoT - 1.5) * 0.8 : 0;
        if (z.mortoT > 2.6) { descartar(scene, z.g); zumbis.splice(i, 1); }
        continue;
      }
      tmpA.subVectors(g.position, z.g.position); tmpA.y = 0; const d = tmpA.length();
      if (!z.cacando && d < percebe) z.cacando = true;
      if (z.cacando && !z.horda && d > Z.esquece) z.cacando = false;
      const cacar = z.cacando && !heroi.caido, sp = cacar ? (z.horda ? Z.velocidadeHorda : Z.velocidade) : Z.vagando;
      const dir = cacar ? tmpA.normalize() : tmpB.set(Math.sin(z.t * 0.3 + i), 0, Math.cos(z.t * 0.3 + i));
      let nx = z.g.position.x + (dir.x * sp + z.kx) * dt, nz = z.g.position.z + (dir.z * sp + z.kz) * dt;
      z.kx *= Math.pow(0.02, dt); z.kz *= Math.pow(0.02, dt);
      [nx, nz] = mundo.resolver(nx, nz, 0.3);
      if (d > 0.75) { z.g.position.x = nx; z.g.position.z = nz; }
      z.g.rotation.y = Math.atan2(dir.x, dir.z);
      const zw = Math.sin(z.t * (cacar ? 5 : 3));
      z.lE.rotation.x = zw * 0.35; z.lD.rotation.x = -zw * 0.35; z.b.rotation.z = Math.sin(z.t * 2.1) * 0.08; z.b.position.y = Math.abs(zw) * 0.03;
      z.aE.rotation.x = -1.45 + Math.sin(z.t * 3) * 0.12; z.aD.rotation.x = -1.45 - Math.sin(z.t * 3) * 0.12;
      z.tocado -= dt; const pisca = z.tocado > 0; z.mats[0].color.set(pisca ? '#fffbe6' : '#6fa35a'); z.mats[1].color.set(pisca ? '#fffbe6' : '#3a3f5a');
      if (d < Z.alcance && (z.ataque -= dt) <= 0 && !heroi.caido) { z.ataque = Z.ataque; eventos.mordida(Z.dano); }
    }
  }
  function limpar() { for (const z of zumbis) descartar(scene, z.g); zumbis.length = 0; for (const s of saques) descartar(scene, s.g); saques.length = 0; }
  return { zumbis, saques, arma, surgir, surgirPerto, vivos, soltarMunicao: (p, n = 1) => { for (let i = 0; i < n; i++) soltar(p.clone().add(new T.Vector3((i - (n - 1) / 2) * 0.7, 0, 0.9)), 'municao', 0); }, atirar, recarregar, passo, limpar };
}
