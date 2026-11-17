// Combate: zumbis (percepção por barulho e lanterna), tiro com munição e recarga, efeitos e saque no chão.
import * as T from './lib/three.module.js';
import { CFG } from './config.js';
import { brilho, caixa, mat } from './mundo.js';
import { SOM } from './sons.js';

const tmpA = new T.Vector3(), tmpB = new T.Vector3();
/** Tira um objeto da cena e libera a memória das peças que são só dele. */
function descartar(scene, g) { scene.remove(g); g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }

export function criarCombate(mundo, heroi, render, eventos) {
  const { scene } = mundo, Z = CFG.zumbi, V = CFG.visao;
  const zumbis = [], pedacos = [], saques = [], janelas = []; let gemidoT = 2;

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
    const pele = mat('#8c9cb8'), roupa = mat('#2b2f52'), calca = mat('#1e2340');   // pele cinza-azulada, roupa escura
    const lE = new T.Group(), lD = new T.Group(); lE.position.set(-0.13, 0.6, 0); lD.position.set(0.13, 0.6, 0);
    lE.add(caixa(0.2, 0.6, 0.22, calca, 0, -0.3, 0)); lD.add(caixa(0.2, 0.6, 0.22, calca, 0, -0.3, 0)); b.add(lE, lD);
    b.add(caixa(0.54, 0.6, 0.32, roupa, 0, 0.92, 0), caixa(0.2, 0.18, 0.05, mat('#8a2c3a'), 0.1, 1.0, 0.17));
    const cab = caixa(0.34, 0.34, 0.32, pele, 0.04, 1.42, 0.04); cab.rotation.z = 0.25; b.add(cab);
    const olhos = [caixa(0.07, 0.05, 0.02, brilho('#e84040'), -0.04, 1.46, 0.21), caixa(0.07, 0.05, 0.02, brilho('#e84040'), 0.12, 1.48, 0.21)]; b.add(...olhos);
    const aE = new T.Group(), aD = new T.Group(); aE.position.set(-0.33, 1.15, 0); aD.position.set(0.33, 1.15, 0);
    aE.add(caixa(0.15, 0.5, 0.15, pele, 0, -0.22, 0)); aD.add(caixa(0.15, 0.5, 0.15, pele, 0, -0.22, 0));
    aE.rotation.x = aD.rotation.x = -1.45; b.add(aE, aD);
    const corpoMeshes = []; b.traverse(o => { if (o.isMesh && !olhos.includes(o)) corpoMeshes.push(o); });
    return { g, b, lE, lD, aE, aD, mats: [pele, roupa], olhos, corpoMeshes, vistoT: 0, modo: '' };
  }
  /** Cria um zumbi num ponto livre entre `min` e `max` de distância do jogador. */
  function surgir(min, max, horda = false) {
    const hp = heroi.g.position; let x = 0, z = 0, ok = false;
    for (let k = 0; k < 60 && !ok; k++) { const a = Math.random() * 6.28, d = min + Math.random() * (max - min); x = hp.x + Math.sin(a) * d; z = hp.z + Math.cos(a) * d; ok = mundo.livre(x, z, 0.6); }
    if (!ok) return null;
    const m = modeloZumbi(); m.g.position.set(x, 0, z); scene.add(m.g);
    const zb = { ...m, vida: Z.vida, morto: false, t: Math.random() * 6, tocado: 0, ataque: 0, kx: 0, kz: 0, mortoT: 0, cacando: horda, horda, visivel: false };
    m.g.visible = false;
    zumbis.push(zb); return zb;
  }
  /** Surge junto de um ponto (para grupos). */
  function surgirPerto(c) {
    for (let k = 0; k < 20; k++) { const x = c.x + (Math.random() - 0.5) * 3, z = c.z + (Math.random() - 0.5) * 3;
      if (mundo.livre(x, z, 0.6)) { const m = modeloZumbi(); m.g.position.set(x, 0, z); scene.add(m.g); const zb = { ...m, vida: Z.vida, morto: false, t: Math.random() * 6, tocado: 0, ataque: 0, kx: 0, kz: 0, mortoT: 0, cacando: true, horda: false }; m.g.visible = false; zb.visivel = false; zumbis.push(zb); return zb; } }
    return null;
  }
  const vivos = () => zumbis.filter(z => !z.morto).length;

  function ferir(z, dir, dano) {
    z.vida -= dano; z.tocado = 0.12; z.kx = dir.x * 3.2; z.kz = dir.z * 3.2; z.cacando = true;
    respingo(z.g.position.clone().setY(1.1), '#8a2c3a', 4 + Math.round(dano * 1.5)); SOM.impacto();
    if (z.vida <= 0 && !z.morto) {
      z.morto = true; z.mortoT = 0; respingo(z.g.position.clone().setY(0.8), '#5d6a8a', 10); SOM.queda();
      eventos.abate(z);
      // saque no chão: moedas e, às vezes, uma carteira fria
      const S = CFG.saque, r = Math.random(), p = z.g.position;
      if (r < S.carteiraFria.chance) soltar(p, 'carteira', sorteio(S.carteiraFria.sats));
      else if (r < S.carteiraFria.chance + S.moeda.chance) soltar(p, 'moeda', sorteio(S.moeda.sats));
      else if (r < S.carteiraFria.chance + S.moeda.chance + S.municao.chance) soltar(p, 'municao', 0, Math.random() < 0.6 ? arma.atual : (arma.atual === 'espingarda' ? 'pistola' : 'espingarda'));
    }
  }
  const sorteio = ([a, b]) => Math.round(a + Math.random() * (b - a));
  function soltar(p, tipo, sats, qual = 'espingarda') {
    const g = new T.Group();
    if (tipo === 'moeda') g.add(caixa(0.24, 0.24, 0.06, brilho('#e8a850'), 0, 0, 0), caixa(0.1, 0.12, 0.07, brilho('#fffbe6'), 0, 0, 0));
    else if (tipo === 'carteira') g.add(caixa(0.36, 0.24, 0.1, brilho('#3fd0c8'), 0, 0, 0), caixa(0.12, 0.08, 0.11, brilho('#fffbe6'), 0.06, 0.03, 0));
    else if (qual === 'espingarda') for (let k = 0; k < 3; k++) g.add(caixa(0.08, 0.22, 0.08, brilho(k === 1 ? '#c84060' : '#8a2c3a'), (k - 1) * 0.11, 0, 0));
    else g.add(caixa(0.18, 0.24, 0.08, brilho('#e8a850'), 0, 0, 0), caixa(0.14, 0.06, 0.09, brilho('#fffbe6'), 0, 0.1, 0));
    g.position.set(p.x, 0.45, p.z); scene.add(g); saques.push({ g, tipo, sats, t: 0, arma: qual });
  }

  // ---------- armas: espingarda e pistola, cada uma com seu pente e sua reserva ----------
  const novaArma = () => Object.fromEntries(Object.entries(CFG.armas).map(([k, a]) => [k, { pente: a.pente, reserva: a.reserva }]));
  const arma = { atual: 'espingarda', muni: novaArma(), espera: 0, recarregando: 0,
    get pente() { return this.muni[this.atual].pente; }, get reserva() { return this.muni[this.atual].reserva; }, get cfg() { return CFG.armas[this.atual]; } };
  function resetarArmas() { arma.atual = 'espingarda'; arma.muni = novaArma(); arma.espera = 0; arma.recarregando = 0; heroi.usar('espingarda'); }
  function recarregar() { const m = arma.muni[arma.atual]; if (arma.recarregando > 0 || m.pente >= arma.cfg.pente || m.reserva <= 0) return false; arma.recarregando = arma.cfg.recarga; SOM.recarga(arma.atual === 'espingarda'); eventos.recarga(); return true; }
  function trocar(para) {
    const nova = para || (arma.atual === 'espingarda' ? 'pistola' : 'espingarda'); if (nova === arma.atual) return;
    arma.atual = nova; arma.recarregando = 0; arma.espera = 0.35; heroi.usar(nova); SOM.troca();
  }
  let flashT = 0;
  function atirar() {
    const A = arma.cfg, m = arma.muni[arma.atual];
    if (arma.espera > 0 || arma.recarregando > 0) return;
    if (m.pente <= 0) { if (!recarregar()) { arma.espera = 0.4; SOM.vazio(); eventos.semMunicao(); } return; }
    m.pente--; arma.espera = A.cadencia;
    // mira assistida: vira para o zumbi vivo e VISÍVEL mais próximo à frente
    const g = heroi.g, frente = heroi.frente(); let melhor = null, bs = 1e9;
    for (const z of zumbis) { if (z.morto || !z.visivel) continue; tmpA.subVectors(z.g.position, g.position); const d = tmpA.length(); if (d > A.alcance) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, tmpA.dot(frente) / d))), sc = d + ang * 4; if (sc < bs) { bs = sc; melhor = z; } }
    if (melhor) g.rotation.y = Math.atan2(melhor.g.position.x - g.position.x, melhor.g.position.z - g.position.z);
    g.updateMatrixWorld(true);
    const dir = heroi.frente(); let alvo = null, ha = A.alcance;
    for (const z of zumbis) { if (z.morto) continue; tmpA.subVectors(z.g.position, g.position); const along = tmpA.dot(dir), perp = Math.abs(tmpA.x * dir.z - tmpA.z * dir.x);
      if (along > 0 && along < ha && perp < A.largura) { ha = along; alvo = z; } }
    heroi.boca.getWorldPosition(tmpA); tmpB.copy(g.position).addScaledVector(dir, ha); tmpB.y = 1.1;
    rastro.position.lerpVectors(tmpA, tmpB, 0.5); rastro.scale.z = tmpA.distanceTo(tmpB); rastro.lookAt(tmpB); rastro.visible = true;
    clarao.position.copy(tmpA); clarao.visible = true; luzTiro.position.copy(tmpA); luzTiro.intensity = arma.atual === 'espingarda' ? 34 : 20; flashT = 0.07;
    heroi.coice = A.coice; render.tremer(0.14 * A.coice);
    arma.atual === 'espingarda' ? SOM.espingarda() : SOM.pistola();
    if (alvo) ferir(alvo, dir, A.dano(ha));
    // barulho: zumbis no raio escutam e vêm
    for (const z of zumbis) if (!z.morto && z.g.position.distanceTo(g.position) < A.barulho) z.cacando = true;
    eventos.tiro();
    if (m.pente === 0 && m.reserva > 0) recarregar();
  }

  function passo(dt, t) {
    const g = heroi.g;
    arma.espera -= dt;
    if (arma.recarregando > 0 && (arma.recarregando -= dt) <= 0) { const m = arma.muni[arma.atual], n = Math.min(arma.cfg.pente - m.pente, m.reserva); m.pente += n; m.reserva -= n; arma.recarregando = 0; }
    if ((flashT -= dt) <= 0) { clarao.visible = false; rastro.visible = false; luzTiro.intensity = 0; }
    for (let i = pedacos.length - 1; i >= 0; i--) { const m = pedacos[i], u = m.userData; u.t -= dt; u.v.y -= 9 * dt; m.position.addScaledVector(u.v, dt); if (m.position.y < 0.05) { m.position.y = 0.05; u.v.set(0, 0, 0); }
      if (u.t <= 0) { scene.remove(m); pedacos.splice(i, 1); } }
    // saque: flutua, gira e é puxado quando o jogador chega perto
    for (let i = saques.length - 1; i >= 0; i--) {
      const s = saques[i]; s.t += dt; s.g.rotation.y += dt * 2.5; s.g.position.y = 0.45 + Math.sin(s.t * 3) * 0.08;
      const d = Math.hypot(s.g.position.x - g.position.x, s.g.position.z - g.position.z);
      if (d < CFG.saque.ima && !heroi.caido) { s.g.position.x += (g.position.x - s.g.position.x) * Math.min(1, dt * 10); s.g.position.z += (g.position.z - s.g.position.z) * Math.min(1, dt * 10);
        if (d < 0.45) { descartar(scene, s.g); saques.splice(i, 1); if (s.tipo === 'municao') { const b = CFG.saque.municao.balas[s.arma]; arma.muni[s.arma].reserva += b; SOM.municao(); eventos.municao(b, s.arma); } else { s.tipo === 'carteira' ? SOM.carteira() : SOM.moeda(); eventos.saque(s.tipo, s.sats); } } }
    }
    const percebe = heroi.lanterna ? CFG.lanterna.visto : CFG.lanterna.escondido, fr = heroi.frente();
    if (!janelas.length && mundo.luzes.length) for (const l of mundo.luzes) { const w = new T.Vector3(); l.getWorldPosition(w); janelas.push(w); }
    // gemidos: de tempos em tempos, um zumbi perto geme (mais alto quanto mais perto)
    if ((gemidoT -= dt) <= 0) { gemidoT = 2 + Math.random() * 3.5; const perto = zumbis.filter(z => !z.morto && z.g.position.distanceTo(heroi.g.position) < 15);
      if (perto.length) SOM.gemido(1 - perto[Math.floor(Math.random() * perto.length)].g.position.distanceTo(heroi.g.position) / 15); }
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
      // vagando: anda devagar até um ponto aleatório por perto e escolhe outro ao chegar
      if (!cacar && (!z.rumo || (z.rumoT -= dt) <= 0 || Math.hypot(z.rumo.x - z.g.position.x, z.rumo.z - z.g.position.z) < 0.6)) {
        z.rumo = { x: z.g.position.x + (Math.random() - 0.5) * 14, z: z.g.position.z + (Math.random() - 0.5) * 14 }; z.rumoT = 5 + Math.random() * 6;
      }
      const dir = cacar ? tmpA.normalize() : tmpB.set(z.rumo.x - z.g.position.x, 0, z.rumo.z - z.g.position.z).normalize();
      let nx = z.g.position.x + (dir.x * sp + z.kx) * dt, nz = z.g.position.z + (dir.z * sp + z.kz) * dt;
      z.kx *= Math.pow(0.02, dt); z.kz *= Math.pow(0.02, dt);
      [nx, nz] = mundo.resolver(nx, nz, 0.3);
      if (d > 0.75) { z.g.position.x = nx; z.g.position.z = nz; }
      z.g.rotation.y = Math.atan2(dir.x, dir.z);
      const zw = Math.sin(z.t * (cacar ? 5 : 3));
      z.lE.rotation.x = zw * 0.35; z.lD.rotation.x = -zw * 0.35; z.b.rotation.z = Math.sin(z.t * 2.1) * 0.08; z.b.position.y = Math.abs(zw) * 0.03;
      z.aE.rotation.x = -1.45 + Math.sin(z.t * 3) * 0.12; z.aD.rotation.x = -1.45 - Math.sin(z.t * 3) * 0.12;
      z.tocado -= dt; const pisca = z.tocado > 0; z.mats[0].color.set(pisca ? '#fffbe6' : '#8c9cb8'); z.mats[1].color.set(pisca ? '#fffbe6' : '#2b2f52');
      if (d < Z.alcance && (z.ataque -= dt) <= 0 && !heroi.caido) { z.ataque = Z.ataque; eventos.mordida(Z.dano); }
      // visão: só aparece no cone da lanterna, muito perto, no clarão do tiro ou perto de uma janela acesa; no escuro, só os olhos
      const vx = z.g.position.x - g.position.x, vz = z.g.position.z - g.position.z, ang = Math.acos(Math.max(-1, Math.min(1, (vx * fr.x + vz * fr.z) / (Math.hypot(vx, vz) || 1))));
      const visto = d < V.perto || (heroi.lanterna && d < V.alcance && ang < V.angulo) || (flashT > 0 && d < V.clarao) || janelas.some(j => Math.hypot(j.x - z.g.position.x, j.z - z.g.position.z) < V.janela);
      if (visto) z.vistoT = V.memoria; else z.vistoT -= dt;
      const modo = z.vistoT > 0 ? 'todo' : d < V.olhos && Math.sin(z.t * 1.3 + i) > -0.6 ? 'olhos' : 'nada';
      z.visivel = modo === 'todo';
      if (modo !== z.modo) { z.modo = modo; z.g.visible = modo !== 'nada'; for (const o of z.corpoMeshes) o.visible = modo === 'todo'; }
    }
  }
  function limpar() { for (const z of zumbis) descartar(scene, z.g); zumbis.length = 0; for (const s of saques) descartar(scene, s.g); saques.length = 0; }
  return { zumbis, saques, arma, resetarArmas, trocar, surgir, surgirPerto, vivos, soltarMunicao: (p, n = 1) => { for (let i = 0; i < n; i++) soltar(p.clone().add(new T.Vector3((i - (n - 1) / 2) * 0.7, 0, 0.9)), 'municao', 0, i % 2 ? 'pistola' : 'espingarda'); }, atirar, recarregar, passo, limpar };
}
