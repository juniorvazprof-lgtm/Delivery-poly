// Combate: zumbis de três tipos, percepção por luz e por som (ondas visíveis), tiro com munição e recarga,
// sinalizadores de mão, efeitos e itens caídos no chão.
import * as T from './lib/three.module.js';
import { CFG } from './config.js';
import { brilho, caixa, mat } from './mundo.js';
import { SOM } from './sons.js';

const tmpA = new T.Vector3(), tmpB = new T.Vector3();
/** Tira um objeto da cena e libera a memória das peças que são só dele. */
function descartar(scene, g) { scene.remove(g); g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }

export function criarCombate(mundo, heroi, render, eventos) {
  const { scene } = mundo, Z = CFG.zumbi, V = CFG.visao, TP = CFG.tipos;
  const zumbis = [], pedacos = [], saques = [], janelas = [], ondas = [], sinalizadores = [], stats = { tiros: 0, acertos: 0 }; let gemidoT = 2;

  // ---------- efeitos do tiro ----------
  const luzTiro = new T.PointLight('#f8e6a0', 0, 5, 1.2); scene.add(luzTiro);
  const clarao = new T.Mesh(new T.BoxGeometry(0.22, 0.22, 0.22), brilho('#fffbe6')); clarao.visible = false; scene.add(clarao);
  const rastro = new T.Mesh(new T.BoxGeometry(0.05, 0.05, 1), brilho('#f8e6a0')); rastro.visible = false; scene.add(rastro);
  const geoPedaco = new T.BoxGeometry(0.09, 0.09, 0.09), matsPedaco = {};
  function respingo(p, cor, n, sp = 2.5) {
    const m0 = (matsPedaco[cor] ??= brilho(cor));
    for (let i = 0; i < n; i++) { const m = new T.Mesh(geoPedaco, m0); m.position.copy(p); m.userData = { v: new T.Vector3((Math.random() - .5) * sp, Math.random() * sp, (Math.random() - .5) * sp), t: 0.5 }; scene.add(m); pedacos.push(m); }
  }

  // ---------- som: ondas visíveis no chão; zumbis dentro do raio vão investigar a origem ----------
  const geoOnda = new T.RingGeometry(0.92, 1, 40);
  /** Faz barulho em `p` com alcance `raio`. Quem está dentro vai até lá (ou caça, se já te viu). */
  function ruido(p, raio, cor = '#8c9cb8', mostrar = true) {
    if (mostrar) { const m = new T.Mesh(geoOnda, new T.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.06, p.z); m.userData = { t: 0, raio }; scene.add(m); ondas.push(m); }
    for (const z of zumbis) if (!z.morto && !z.horda && z.g.position.distanceTo(p) < raio && !z.cacando) { z.investiga = { x: p.x, z: p.z }; z.rumoT = 9; }
  }

  // ---------- zumbis ----------
  function modeloZumbi(tipo) {
    const t = TP[tipo], g = new T.Group(), b = new T.Group(); g.add(b);
    const pele = mat(t.pele), roupa = mat(t.roupa), calca = mat('#1e2340'), s = t.escala;
    const lE = new T.Group(), lD = new T.Group(); lE.position.set(-0.13, 0.6, 0); lD.position.set(0.13, 0.6, 0);
    lE.add(caixa(0.2 * s, 0.6, 0.22 * s, calca, 0, -0.3, 0)); lD.add(caixa(0.2 * s, 0.6, 0.22 * s, calca, 0, -0.3, 0)); b.add(lE, lD);
    b.add(caixa(0.54 * s, 0.6, 0.32 * s, roupa, 0, 0.92, 0), caixa(0.2, 0.18, 0.05, mat('#8a2c3a'), 0.1, 1.0, 0.17 * s));
    const cab = caixa(0.34 * t.cabeca, 0.34 * t.cabeca, 0.32 * t.cabeca, pele, 0.04, 1.42 + (t.cabeca - 1) * 0.15, 0.04); cab.rotation.z = 0.25; b.add(cab);
    const olhos = [caixa(0.07, 0.05, 0.02, brilho(t.olhos), -0.04, 1.46, 0.21 * t.cabeca), caixa(0.07, 0.05, 0.02, brilho(t.olhos), 0.12, 1.48, 0.21 * t.cabeca)];
    if (tipo === 'gritador') olhos.push(caixa(0.16, 0.1, 0.03, brilho('#c84060'), 0.04, 1.33, 0.22 * t.cabeca));   // boca aberta
    b.add(...olhos);
    const aE = new T.Group(), aD = new T.Group(); aE.position.set(-0.33 * s, 1.15, 0); aD.position.set(0.33 * s, 1.15, 0);
    aE.add(caixa(0.15, 0.5 * t.braco, 0.15, pele, 0, -0.22 * t.braco, 0)); aD.add(caixa(0.15, 0.5 * t.braco, 0.15, pele, 0, -0.22 * t.braco, 0));
    aE.rotation.x = aD.rotation.x = t.bracos; b.add(aE, aD);
    const corpoMeshes = []; b.traverse(o => { if (o.isMesh && !olhos.includes(o)) corpoMeshes.push(o); });
    return { g, b, lE, lD, aE, aD, mats: [pele, roupa], olhos, corpoMeshes, vistoT: 0, modo: '' };
  }
  function sortearTipo() {
    const r = Math.random(), gritadores = zumbis.filter(z => !z.morto && z.tipo === 'gritador').length;
    if (r < TP.gritador.chance && gritadores < TP.gritador.max) return 'gritador';
    if (r < TP.gritador.chance + TP.mariposa.chance) return 'mariposa';
    return 'comum';
  }
  function criar(x, z, tipo, horda) {
    const m = modeloZumbi(tipo); m.g.position.set(x, 0, z); m.g.visible = false; scene.add(m.g);
    const zb = { ...m, tipo, vida: TP[tipo].vida, morto: false, t: Math.random() * 6, tocado: 0, ataque: 0, kx: 0, kz: 0, mortoT: 0, cacando: horda, horda, visivel: false, gritou: false, grito: 0 };
    zumbis.push(zb); return zb;
  }
  /** Cria um zumbi num ponto livre entre `min` e `max` de distância do jogador. */
  function surgir(min, max, horda = false, tipo = null) {
    const hp = heroi.g.position;
    for (let k = 0; k < 60; k++) { const a = Math.random() * 6.28, d = min + Math.random() * (max - min), x = hp.x + Math.sin(a) * d, z = hp.z + Math.cos(a) * d;
      if (mundo.livre(x, z, 0.6)) return criar(x, z, tipo || (horda ? (Math.random() < 0.15 ? 'mariposa' : 'comum') : sortearTipo()), horda); }
    return null;
  }
  const vivos = () => zumbis.filter(z => !z.morto).length;

  function ferir(z, dir, dano) {
    z.vida -= dano; z.tocado = 0.12; z.kx = dir.x * 3.2 * TP[z.tipo].empurrao; z.kz = dir.z * 3.2 * TP[z.tipo].empurrao; z.cacando = true;
    respingo(z.g.position.clone().setY(1.1), '#8a2c3a', 4 + Math.round(dano * 1.5)); SOM.impacto();
    if (z.vida <= 0 && !z.morto) {
      z.morto = true; z.mortoT = 0; respingo(z.g.position.clone().setY(0.8), '#5d6a8a', 10); SOM.queda();
      eventos.abate(z);   // inimigo não solta nada: munição vem das caixas
    }
  }
  function soltar(p, tipo, qual = 'espingarda') {
    const g = new T.Group();
    if (tipo === 'pilha') g.add(caixa(0.12, 0.28, 0.12, brilho('#a8cf78'), 0, 0, 0), caixa(0.06, 0.05, 0.06, brilho('#fffbe6'), 0, 0.16, 0));
    else if (qual === 'espingarda') for (let k = 0; k < 3; k++) g.add(caixa(0.08, 0.22, 0.08, brilho(k === 1 ? '#c84060' : '#8a2c3a'), (k - 1) * 0.11, 0, 0));
    else g.add(caixa(0.18, 0.24, 0.08, brilho('#e8a850'), 0, 0, 0), caixa(0.14, 0.06, 0.09, brilho('#fffbe6'), 0, 0.1, 0));
    g.position.set(p.x, 0.45, p.z); scene.add(g); saques.push({ g, tipo, t: 0, arma: qual });
  }

  // ---------- sinalizador de mão: cai à frente, ilumina 20 s em vermelho e chama os zumbis com chiado ----------
  function lancarSinalizador() {
    const g = heroi.g, f = heroi.frente(), S = CFG.sinalizador;
    let [x, z] = mundo.resolver(g.position.x + f.x * S.distancia, g.position.z + f.z * S.distancia, 0.2);
    const o = new T.Group(); o.add(caixa(0.1, 0.1, 0.32, '#7a3a2a', 0, 0.06, 0), caixa(0.12, 0.12, 0.1, brilho('#ff5a3a'), 0, 0.08, 0.18));
    const luz = new T.PointLight('#ff6040', 40, S.luz, 1.3); luz.position.y = 0.8; o.add(luz);
    o.position.set(x, 0, z); o.rotation.y = Math.random() * 6; scene.add(o);
    sinalizadores.push({ o, luz, t: S.duracao, chamado: 0, x, z }); SOM.sinalizadorMao();
    ruido(o.position, S.chamado, '#ff6040');
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
  // ---------- mira: segurar o botão = parar e mirar (o laser fecha); soltar = atirar ----------
  const M = CFG.mira;
  const laser = new T.Mesh(new T.BoxGeometry(0.03, 0.03, 1), new T.MeshBasicMaterial({ color: '#c84060', transparent: true, opacity: 0.5 })); laser.visible = false; scene.add(laser);
  let mira = 0, mirando = false;
  /** Vira, uma vez, para a criatura visível mais próxima dentro de um cone estreito à frente (mira assistida fraca). */
  function travarAlvo() {
    const g = heroi.g, frente = heroi.frente(), A = arma.cfg; let melhor = null, bs = 1e9;
    for (const z of zumbis) { if (z.morto || !z.visivel) continue; tmpA.subVectors(z.g.position, g.position); const d = tmpA.length(); if (d > A.alcance) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, tmpA.dot(frente) / d))); if (ang > M.cone) continue; const sc = d + ang * 4; if (sc < bs) { bs = sc; melhor = z; } }
    if (melhor) g.rotation.y = Math.atan2(melhor.g.position.x - g.position.x, melhor.g.position.z - g.position.z);
  }
  /** Chamado a cada passo com o estado do botão. Devolve true enquanto estiver mirando (o herói não anda). */
  function gatilho(dt, segurando) {
    if (segurando && !mirando && arma.espera <= 0 && arma.recarregando <= 0) { mirando = true; mira = 0; travarAlvo(); }
    if (mirando && segurando) mira = Math.min(1, mira + dt / M.tempo);
    if (mirando && !segurando) { mirando = false; laser.visible = false; atirar(mira); mira = 0; }
    if (mirando) {   // o laser sai do cano; fica mais forte e firme conforme a mira fecha
      const g = heroi.g; g.updateMatrixWorld(true); heroi.boca.getWorldPosition(tmpA); const dir = heroi.frente(), L = arma.cfg.alcance;
      const tremor = (1 - mira) * M.tremor * Math.sin(performance.now() / 70);
      tmpB.copy(tmpA).add(new T.Vector3(dir.x * L + dir.z * tremor * L, 0, dir.z * L - dir.x * tremor * L));
      laser.position.lerpVectors(tmpA, tmpB, 0.5); laser.scale.z = L; laser.lookAt(tmpB); laser.visible = true; laser.material.opacity = 0.2 + mira * 0.6;
    }
    return mirando;
  }
  function atirar(forca = 1) {
    const A = arma.cfg, m = arma.muni[arma.atual];
    if (arma.espera > 0 || arma.recarregando > 0) return;
    if (m.pente <= 0) { if (!recarregar()) { arma.espera = 0.4; SOM.vazio(); eventos.semMunicao(); } return; }
    m.pente--; arma.espera = A.cadencia;
    const g = heroi.g;
    // sem mirar, o tiro desvia; com a mira fechada, vai reto
    g.rotation.y += (Math.random() - 0.5) * 2 * M.desvio * (1 - forca);
    g.updateMatrixWorld(true);
    const dir = heroi.frente(); let alvo = null, ha = A.alcance;
    for (const z of zumbis) { if (z.morto) continue; tmpA.subVectors(z.g.position, g.position); const along = tmpA.dot(dir), perp = Math.abs(tmpA.x * dir.z - tmpA.z * dir.x);
      if (along > 0 && along < ha && perp < A.largura) { ha = along; alvo = z; } }
    heroi.boca.getWorldPosition(tmpA); tmpB.copy(g.position).addScaledVector(dir, ha); tmpB.y = 1.1;
    rastro.position.lerpVectors(tmpA, tmpB, 0.5); rastro.scale.z = tmpA.distanceTo(tmpB); rastro.lookAt(tmpB); rastro.visible = true;
    clarao.position.copy(tmpA); clarao.visible = true; luzTiro.position.copy(tmpA); luzTiro.intensity = arma.atual === 'espingarda' ? 34 : 20; flashT = 0.07;
    heroi.coice = A.coice; render.tremer(0.14 * A.coice);
    arma.atual === 'espingarda' ? SOM.espingarda() : SOM.pistola();
    stats.tiros++; if (alvo) { stats.acertos++; ferir(alvo, dir, A.dano(ha) * (M.danoMin + (1 - M.danoMin) * forca)); }
    // barulho: uma onda visível; quem está perto caça, quem está no raio vem investigar
    ruido(g.position, A.barulho, '#e8a850');
    for (const z of zumbis) if (!z.morto && z.g.position.distanceTo(g.position) < A.barulho * 0.5) z.cacando = true;
    eventos.tiro();
    if (m.pente === 0 && m.reserva > 0) recarregar();
  }

  /** Luzes que revelam zumbis: janelas acesas e sinalizadores queimando. */
  const iluminado = p => janelas.some(j => Math.hypot(j.x - p.x, j.z - p.z) < V.janela) || sinalizadores.some(s => Math.hypot(s.x - p.x, s.z - p.z) < CFG.sinalizador.luz * 0.8);

  function passo(dt, t) {
    const g = heroi.g;
    arma.espera -= dt;
    if (arma.recarregando > 0 && (arma.recarregando -= dt) <= 0) { const m = arma.muni[arma.atual], n = Math.min(arma.cfg.pente - m.pente, m.reserva); m.pente += n; m.reserva -= n; arma.recarregando = 0; }
    if ((flashT -= dt) <= 0) { clarao.visible = false; rastro.visible = false; luzTiro.intensity = 0; }
    for (let i = pedacos.length - 1; i >= 0; i--) { const m = pedacos[i], u = m.userData; u.t -= dt; u.v.y -= 9 * dt; m.position.addScaledVector(u.v, dt); if (m.position.y < 0.05) { m.position.y = 0.05; u.v.set(0, 0, 0); }
      if (u.t <= 0) { scene.remove(m); pedacos.splice(i, 1); } }
    for (let i = ondas.length - 1; i >= 0; i--) { const o = ondas[i], u = o.userData; u.t += dt / 0.7; o.scale.setScalar(Math.max(0.01, u.t * u.raio)); o.material.opacity = 0.7 * (1 - u.t);
      if (u.t >= 1) { scene.remove(o); o.material.dispose(); ondas.splice(i, 1); } }
    for (let i = sinalizadores.length - 1; i >= 0; i--) {
      const s = sinalizadores[i]; s.t -= dt; s.luz.intensity = (s.t < 3 ? s.t / 3 : 1) * (36 + Math.sin(t * 31 + i) * 8 + Math.random() * 6);
      if ((s.chamado -= dt) <= 0) { s.chamado = 2; ruido(s.o.position, CFG.sinalizador.chamado, '#ff6040'); }
      if (s.t <= 0) { descartar(scene, s.o); sinalizadores.splice(i, 1); }
    }
    // saque: flutua, gira e é puxado quando o jogador chega perto
    for (let i = saques.length - 1; i >= 0; i--) {
      const s = saques[i]; s.t += dt; s.g.rotation.y += dt * 2.5; s.g.position.y = 0.45 + Math.sin(s.t * 3) * 0.08;
      const d = Math.hypot(s.g.position.x - g.position.x, s.g.position.z - g.position.z);
      if (d < CFG.saque.ima && !heroi.caido) { s.g.position.x += (g.position.x - s.g.position.x) * Math.min(1, dt * 10); s.g.position.z += (g.position.z - s.g.position.z) * Math.min(1, dt * 10);
        if (d < 0.45) { descartar(scene, s.g); saques.splice(i, 1);
          if (s.tipo === 'municao') { const b = CFG.saque.caixaMunicao[s.arma]; arma.muni[s.arma].reserva += b; SOM.municao(); eventos.municao(b, s.arma); }
          else if (s.tipo === 'pilha') { SOM.municao(); eventos.pilha(); } } }
    }
    const percebe = heroi.lanterna ? CFG.lanterna.visto : CFG.lanterna.escondido, fr = heroi.frente();
    if (!janelas.length && mundo.luzes.length) for (const l of mundo.luzes) { const w = new T.Vector3(); l.getWorldPosition(w); janelas.push(w); }
    if ((gemidoT -= dt) <= 0) { gemidoT = 2 + Math.random() * 3.5; const perto = zumbis.filter(z => !z.morto && z.g.position.distanceTo(g.position) < 15);
      if (perto.length) SOM.gemido(1 - perto[Math.floor(Math.random() * perto.length)].g.position.distanceTo(g.position) / 15); }

    for (let i = zumbis.length - 1; i >= 0; i--) {
      const z = zumbis[i], tp = TP[z.tipo]; z.t += dt;
      if (z.morto) {
        z.mortoT += dt; z.b.rotation.x = -Math.min(1, z.mortoT / 0.35) * Math.PI / 2; z.b.position.y = z.mortoT > 1.5 ? -(z.mortoT - 1.5) * 0.8 : 0;
        if (z.mortoT > 2.6) { descartar(scene, z.g); zumbis.splice(i, 1); }
        continue;
      }
      tmpA.subVectors(g.position, z.g.position); tmpA.y = 0; const d = tmpA.length();
      // percepção: perto o bastante para te notar (mais longe com a lanterna ligada)
      if (!z.cacando && d < percebe * tp.percepcao) z.cacando = true;
      if (z.cacando && !z.horda && d > Z.esquece) z.cacando = false;
      // mariposa: corre para a luz mais próxima (a sua lanterna ou um sinalizador); no escuro, perde o rumo
      let luzAlvo = null;
      if (z.tipo === 'mariposa') {
        let melhor = heroi.lanterna && d < tp.atracao ? d : 1e9;
        for (const s of sinalizadores) { const ds = Math.hypot(s.x - z.g.position.x, s.z - z.g.position.z); if (ds < tp.atracao && ds < melhor) { melhor = ds; luzAlvo = s; } }
        if (luzAlvo) z.cacando = false; else if (melhor < 1e9) z.cacando = true; else if (d > 3.5 && !z.horda) z.cacando = false;
      }
      // gritador: ao te ver, para, se prepara e grita, chamando todos por perto
      if (z.tipo === 'gritador' && z.cacando && !z.gritou && !heroi.caido) {
        if (z.grito === 0) { z.grito = tp.preparo; eventos.alertaGritador(); }
        z.grito -= dt; z.b.position.x = Math.sin(t * 60) * 0.04;
        if (z.grito <= 0) { z.gritou = true; z.b.position.x = 0; SOM.grito(); render.tremer(0.2); ruido(z.g.position, tp.raioGrito, '#c84060');
          for (const o of zumbis) if (!o.morto && o.g.position.distanceTo(z.g.position) < tp.raioGrito) o.cacando = true; }
      }
      const preparando = z.tipo === 'gritador' && z.cacando && !z.gritou;
      const cacar = z.cacando && !heroi.caido && !preparando;
      let dir, sp;
      if (luzAlvo) { dir = tmpB.set(luzAlvo.x - z.g.position.x, 0, luzAlvo.z - z.g.position.z); sp = Math.hypot(dir.x, dir.z) > 1.2 ? tp.velocidade : 0; dir.normalize(); }
      else if (cacar) { dir = tmpA.normalize(); sp = z.horda ? Math.max(tp.velocidade, Z.velocidadeHorda) : tp.velocidade; }
      else {
        // investigando um barulho, ou vagando até um ponto aleatório por perto
        if (z.investiga) { z.rumo = z.investiga; z.investiga = null; z.indo = true; }
        if (!z.rumo || (z.rumoT -= dt) <= 0 || Math.hypot(z.rumo.x - z.g.position.x, z.rumo.z - z.g.position.z) < 0.6) {
          z.rumo = { x: z.g.position.x + (Math.random() - 0.5) * 14, z: z.g.position.z + (Math.random() - 0.5) * 14 }; z.rumoT = 5 + Math.random() * 6; z.indo = false;
        }
        dir = tmpB.set(z.rumo.x - z.g.position.x, 0, z.rumo.z - z.g.position.z).normalize(); sp = preparando ? 0 : z.indo ? tp.velocidade * 0.85 : Z.vagando;
      }
      let nx = z.g.position.x + (dir.x * sp + z.kx) * dt, nz = z.g.position.z + (dir.z * sp + z.kz) * dt;
      z.kx *= Math.pow(0.02, dt); z.kz *= Math.pow(0.02, dt);
      [nx, nz] = mundo.resolver(nx, nz, 0.3);
      if (d > 0.75 || luzAlvo) { z.g.position.x = nx; z.g.position.z = nz; }
      if (sp > 0 || cacar) z.g.rotation.y = Math.atan2(dir.x, dir.z);
      const zw = Math.sin(z.t * (sp > 1.5 ? 9 : cacar ? 5 : 3));
      z.lE.rotation.x = zw * (sp > 1.5 ? 0.7 : 0.35); z.lD.rotation.x = -zw * (sp > 1.5 ? 0.7 : 0.35); z.b.rotation.z = Math.sin(z.t * 2.1) * 0.08; z.b.position.y = Math.abs(zw) * 0.03;
      z.aE.rotation.x = tp.bracos + Math.sin(z.t * 3) * 0.12; z.aD.rotation.x = tp.bracos - Math.sin(z.t * 3) * 0.12;
      z.tocado -= dt; const pisca = z.tocado > 0; z.mats[0].color.set(pisca ? '#fffbe6' : tp.pele); z.mats[1].color.set(pisca ? '#fffbe6' : tp.roupa);
      if (d < Z.alcance && (z.ataque -= dt) <= 0 && !heroi.caido) { z.ataque = Z.ataque; eventos.mordida(tp.dano); }
      // visão: cone da lanterna, muito perto, clarão do tiro, janela acesa ou sinalizador; no escuro, só os olhos
      const vx = z.g.position.x - g.position.x, vz = z.g.position.z - g.position.z, ang = Math.acos(Math.max(-1, Math.min(1, (vx * fr.x + vz * fr.z) / (Math.hypot(vx, vz) || 1))));
      const visto = d < V.perto || (heroi.lanterna && d < V.alcance && ang < V.angulo) || (flashT > 0 && d < V.clarao) || iluminado(z.g.position);
      if (visto) z.vistoT = V.memoria; else z.vistoT -= dt;
      const modo = z.vistoT > 0 ? 'todo' : d < V.olhos && Math.sin(z.t * 1.3 + i) > -0.6 ? 'olhos' : 'nada';
      z.visivel = modo === 'todo';
      if (modo !== z.modo) { z.modo = modo; z.g.visible = modo !== 'nada'; for (const o of z.corpoMeshes) o.visible = modo === 'todo'; }
    }
  }
  function limpar() {
    for (const z of zumbis) descartar(scene, z.g); zumbis.length = 0; for (const s of saques) descartar(scene, s.g); saques.length = 0;
    for (const s of sinalizadores) descartar(scene, s.o); sinalizadores.length = 0; for (const o of ondas) { scene.remove(o); o.material.dispose(); } ondas.length = 0;
  }
  return { stats, zumbis, saques, sinalizadores, arma, resetarArmas, trocar, surgir, vivos, ruido, lancarSinalizador,
    atirar, gatilho, get mira() { return mira; }, recarregar, passo, limpar };
}
