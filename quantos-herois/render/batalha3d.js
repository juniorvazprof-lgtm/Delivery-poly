import * as THREE from 'three';
import { passo, DT } from '../core/combate.js';
import { VILOES } from '../data/viloes.js';
import { ECONOMIA } from '../data/rodadas.js';

const CAMERA = { altura: 8, distancia: 17, alvoY: .8 };
const ESC = 0.2;
const PELE = '#ffd7b0';

const mat = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, ...o });
const toon = (geo, c, o) => { const m = new THREE.Mesh(geo, mat(c, o)); m.castShadow = true; return m; };
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

function olhos(cab, r, cor = '#2a1a12') {
  for (const s of [-1, 1]) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r * .16, 10, 8), new THREE.MeshBasicMaterial({ color: cor }));
    o.scale.set(1, 1.35, .6); o.position.set(s * r * .34, -r * .05, r * .9); cab.add(o);
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * .055, 6, 6), new THREE.MeshBasicMaterial({ color: '#fff' }));
    b.position.set(s * r * .34 + r * .04, r * .03, r * .97); cab.add(b);
  }
  for (const s of [-1, 1]) {
    const bo = new THREE.Mesh(new THREE.CircleGeometry(r * .13, 12), new THREE.MeshBasicMaterial({ color: '#ff9a9a', transparent: true, opacity: .6 }));
    bo.position.set(s * r * .58, -r * .3, r * .8); bo.rotation.y = s * .5; cab.add(bo);
  }
}
function corpoChibi({ roupa, pele = PELE, escala = 1, cabR = .62 }) {
  const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
  const corpo = toon(new THREE.CapsuleGeometry(.36, .35, 6, 12), roupa); corpo.position.y = .62; rig.add(corpo);
  for (const s of [-1, 1]) { const p = toon(new THREE.CapsuleGeometry(.12, .16, 4, 8), '#5a3a2a'); p.position.set(s * .17, .2, 0); rig.add(p); }
  const bracos = [-1, 1].map(s => {
    const b = new THREE.Group(); b.position.set(s * .44, .85, 0);
    const m = toon(new THREE.CapsuleGeometry(.1, .22, 4, 8), roupa); m.position.y = -.17; b.add(m);
    const mao = toon(new THREE.SphereGeometry(.11, 8, 8), pele); mao.position.y = -.36; b.add(mao);
    rig.add(b); return b;
  });
  const cab = new THREE.Group(); cab.position.y = 1.32; rig.add(cab);
  cab.add(toon(new THREE.SphereGeometry(cabR, 24, 18), pele)); olhos(cab, cabR);
  g.scale.setScalar(escala);
  return { g, rig, cab, bracos, cabR };
}
function arma(tipo) {
  const g = new THREE.Group();
  if (tipo === 'espada') { const l = toon(new THREE.BoxGeometry(.09, .75, .04), '#dfe6ee', { emissive: '#223' }); l.position.y = -.6; g.add(l); const gd = toon(new THREE.BoxGeometry(.32, .06, .08), '#c9a227'); gd.position.y = -.24; g.add(gd); }
  if (tipo === 'escudo') { const e = toon(new THREE.CylinderGeometry(.42, .42, .08, 20), '#3e6fd8'); e.rotation.x = Math.PI / 2; e.position.set(0, -.35, .12); g.add(e);
    const b = toon(new THREE.CylinderGeometry(.14, .14, .1, 12), '#f0c34a'); b.rotation.x = Math.PI / 2; b.position.set(0, -.35, .17); g.add(b); }
  if (tipo === 'cajado' || tipo === 'cajadoLuz' || tipo === 'cajadoPena') { const c = toon(new THREE.CylinderGeometry(.04, .05, 1.3, 6), '#8a5a35'); c.position.y = -.3; g.add(c);
    const cor = tipo === 'cajado' ? '#ff7a1a' : tipo === 'cajadoLuz' ? '#fff3a0' : '#7ae0ff';
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.16, 1), new THREE.MeshBasicMaterial({ color: cor })); orb.position.y = .38; g.add(orb); g.userData.orb = orb; }
  if (tipo === 'arco') { const a = toon(new THREE.TorusGeometry(.42, .035, 6, 20, Math.PI), '#8a5a35'); a.rotation.z = Math.PI / 2; a.position.set(0, -.35, .1); g.add(a); }
  if (tipo === 'adaga') { const l = toon(new THREE.ConeGeometry(.06, .4, 6), '#c8ccd4'); l.rotation.x = Math.PI; l.position.y = -.5; g.add(l); }
  if (tipo === 'clava') { const c = toon(new THREE.CylinderGeometry(.16, .07, .9, 7), '#7a4a2a'); c.position.y = -.55; g.add(c); }
  return g;
}
function modelo(tipo) {
  let m;
  const H = {
    guerreiro: () => { m = corpoChibi({ roupa: '#d6453d' }); const el = toon(new THREE.SphereGeometry(.66, 20, 12, 0, 6.29, 0, 1.45), '#b8c0cc'); el.position.y = .05; m.cab.add(el);
      const crista = toon(new THREE.BoxGeometry(.08, .3, .7), '#d6453d'); crista.position.y = .62; m.cab.add(crista); m.bracos[1].add(arma('espada')); },
    guardiao: () => { m = corpoChibi({ roupa: '#3e6fd8', escala: 1.08 }); const el = toon(new THREE.CylinderGeometry(.6, .68, .55, 16), '#8b96a8'); el.position.y = .32; m.cab.add(el); m.bracos[0].add(arma('escudo')); m.bracos[1].add(arma('adaga')); },
    piromante: () => { m = corpoChibi({ roupa: '#e8742a' }); const ch = toon(new THREE.ConeGeometry(.6, 1.1, 16), '#6a2fb0'); ch.position.y = .78; ch.rotation.z = -.15; m.cab.add(ch);
      const aba = toon(new THREE.CylinderGeometry(.82, .82, .06, 20), '#6a2fb0'); aba.position.y = .32; m.cab.add(aba); m.bracos[1].add(arma('cajado')); },
    arqueiro: () => { m = corpoChibi({ roupa: '#3f9a4a' }); const cap = toon(new THREE.SphereGeometry(.68, 18, 12, 0, 6.29, 0, 1.7), '#2f7a3a'); cap.position.set(0, .02, -.06); m.cab.add(cap); m.bracos[0].add(arma('arco')); },
    clerigo: () => { m = corpoChibi({ roupa: '#f2eee4' }); const aur = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 8, 28), new THREE.MeshBasicMaterial({ color: '#ffe066' })); aur.rotation.x = Math.PI / 2; aur.position.y = .85; m.cab.add(aur);
      const ca = toon(new THREE.SphereGeometry(.66, 18, 12, 0, 6.29, 0, 1.2), '#f0c34a'); ca.position.y = .05; m.cab.add(ca); m.bracos[1].add(arma('cajadoLuz')); },
  };
  const V = {
    goblin: () => { m = corpoChibi({ roupa: '#6b4a2a', pele: '#7cc44a', escala: .82 }); for (const s of [-1, 1]) { const o = toon(new THREE.ConeGeometry(.16, .55, 6), '#7cc44a'); o.rotation.z = -s * 1.2; o.position.set(s * .7, .1, 0); m.cab.add(o); } m.bracos[1].add(arma('adaga')); },
    goblinArqueiro: () => { V.goblin(); const cap = toon(new THREE.ConeGeometry(.5, .5, 10), '#3d5a2a'); cap.position.y = .55; m.cab.add(cap); m.bracos[0].add(arma('arco')); },
    xamaGoblin: () => { V.goblin(); for (let i = 0; i < 3; i++) { const p = toon(new THREE.ConeGeometry(.06, .5, 5), ['#ff5a5a', '#ffe14a', '#5ac8ff'][i]); p.position.set((i - 1) * .16, .7, -.1); m.cab.add(p); } m.bracos[0].add(arma('cajadoPena')); },
    ogro: () => { m = corpoChibi({ roupa: '#7a5a3a', pele: '#a8b46a', escala: 1.55, cabR: .58 }); const pre = toon(new THREE.ConeGeometry(.07, .2, 6), '#fff8e0'); for (const s of [-1, 1]) { const p = pre.clone(); p.position.set(s * .2, -.32, .5); m.cab.add(p); } m.bracos[1].add(arma('clava')); },
    morcego: () => { m = { g: new THREE.Group(), rig: new THREE.Group(), bracos: [] }; m.g.add(m.rig); const c = toon(new THREE.SphereGeometry(.42, 16, 12), '#6a4aa8'); c.position.y = 1.4; m.rig.add(c); m.cab = c; olhos(c, .42, '#ffe14a');
      m.asas = [-1, 1].map(s => { const a = new THREE.Mesh(new THREE.CircleGeometry(.6, 3), mat('#4a2f88', { side: THREE.DoubleSide })); a.position.set(s * .42, 1.45, 0); a.rotation.set(0, 0, s * .3); m.rig.add(a); return a; }); },
    slime: (esc = 1) => { m = { g: new THREE.Group(), rig: new THREE.Group(), bracos: [] }; m.g.add(m.rig); const c = new THREE.Mesh(new THREE.SphereGeometry(.7, 24, 16), new THREE.MeshToonMaterial({ color: '#5fd16a', transparent: true, opacity: .85 }));
      c.scale.set(1, .78, 1); c.position.y = .55; c.castShadow = true; m.rig.add(c); m.cab = c; olhos(c, .7); m.g.scale.setScalar(esc); m.slime = c; },
    slimeMedio: () => V.slime(.75), slimePequeno: () => V.slime(.55),
    reiSlime: () => { V.slime(2.2); const co = toon(new THREE.CylinderGeometry(.3, .38, .3, 5, 1, true), '#f0c34a'); co.position.y = .78; m.cab.add(co); },
  };
  (H[tipo] || V[tipo] || H.guerreiro)();
  return m;
}

function barra() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 10;
  const t = new THREE.CanvasTexture(cv);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  s.scale.set(1.1, .17, 1); s.renderOrder = 10; s.userData = { cv, t, ult: -1 };
  return s;
}
function pintaBarra(s, f, lado) {
  if (Math.abs(s.userData.ult - f) < .01) return;
  s.userData.ult = f;
  const g = s.userData.cv.getContext('2d');
  g.fillStyle = '#2a1a12'; g.fillRect(0, 0, 64, 10);
  g.fillStyle = lado === 'h' ? '#5fd16a' : '#e0453d';
  g.fillRect(2, 2, 60 * Math.max(0, f), 6);
  s.userData.t.needsUpdate = true;
}
function numero(txt, cor) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const g = cv.getContext('2d');
  g.font = '900 44px system-ui'; g.textAlign = 'center';
  g.lineWidth = 8; g.strokeStyle = '#2a1a12'; g.strokeText(txt, 64, 46);
  g.fillStyle = cor; g.fillText(txt, 64, 46);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
  s.scale.set(1, .5, 1); s.renderOrder = 11;
  return s;
}

export function criarVisual(canvas, batalha, opcoes = {}) {
  const velocidadeInicial = [0.5, 1, 2].includes(opcoes.velocidade) ? opcoes.velocidade : 1;
  let velocidade = velocidadeInicial;
  let pausadoManual = false;
  let rodando = false;
  let rafId = 0;
  let acum = 0;
  let tAnt = 0;
  let ultimoReal = 0;
  let eixo = null;
  let fimChamado = false;
  let fimTempo = 0;
  let fimAguardandoMoedas = false;
  let tremor = 0;
  let reduzido = false;
  try { reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  const estado = { pausado: false };
  const visual = { estado };

  const cena = new THREE.Scene();
  cena.background = new THREE.Color('#8fd0f0');
  cena.fog = new THREE.Fog('#8fd0f0', 22, 48);
  const cam = new THREE.PerspectiveCamera(38, 1, .1, 200);

  cena.add(new THREE.HemisphereLight('#fff6e0', '#4a7a3a', 1.6));
  const sol = new THREE.DirectionalLight('#fff1d0', 2.6);
  sol.position.set(-8, 16, 10); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12 });
  sol.shadow.bias = -0.0005;
  cena.add(sol);

  const raiz = new THREE.Group(); cena.add(raiz);

  // chão + cenário
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const g = cv.getContext('2d');
    g.fillStyle = '#6cbf4a'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = ['#5fb043', '#78c955', '#64b847'][i % 3];
      g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 3 + rnd() * 9, 0, 7); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 4); tex.colorSpace = THREE.SRGBColorSpace;
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), new THREE.MeshToonMaterial({ map: tex }));
    chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; cena.add(chao);
    const terra = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat('#c9a46a'));
    terra.scale.set(15, 7.5, 1); terra.rotation.x = -Math.PI / 2; terra.position.y = .01; terra.receiveShadow = true; cena.add(terra);
    for (let i = 0; i < 46; i++) {
      const a = rnd() * 6.28, d = 17 + rnd() * 12;
      const x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * .75;
      const gq = new THREE.Group(); gq.position.set(x, 0, z);
      if (i % 3) {
        const tr = toon(new THREE.CylinderGeometry(.25, .35, 1.4, 7), '#8a5a35'); tr.position.y = .7; gq.add(tr);
        const copa = toon(new THREE.IcosahedronGeometry(1.3 + rnd() * .6, 0), ['#3f9a3a', '#4fae3f', '#2f8a3a'][i % 3]); copa.position.y = 2.2; gq.add(copa);
      } else {
        const p = toon(new THREE.DodecahedronGeometry(.5 + rnd() * .6, 0), '#9aa0a8'); p.position.y = .3; gq.add(p);
      }
      gq.rotation.y = rnd() * 6; cena.add(gq);
    }
    for (let i = 0; i < 30; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 5), mat(['#ffe14a', '#ff7ab6', '#fff'][i % 3]));
      f.position.set((rnd() - .5) * 34, .08, (rnd() - .5) * 22);
      if (Math.abs(f.position.x) < 14 && Math.abs(f.position.z) < 7) continue;
      cena.add(f);
    }
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  function redim() {
    const w = canvas.clientWidth || canvas.width || 1;
    const h = canvas.clientHeight || canvas.height || 1;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }

  let ro = null;
  const onResize = () => redim();
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(redim);
    ro.observe(canvas);
  } else {
    window.addEventListener('resize', onResize);
  }

  const onVis = () => { if (!document.hidden) tAnt = performance.now(); };
  document.addEventListener('visibilitychange', onVis);

  // estado visual
  const vis = new Map();
  const projVis = new Map();
  let efeitos = [];
  let moedas = [];
  let zonasVis = new Map();
  let numerosAtivos = 0;
  const foco = new THREE.Vector3();

  function media(us) {
    const s = us.reduce((a, u) => ({ x: a.x + u.x, y: a.y + u.y }), { x: 0, y: 0 });
    return { x: s.x / us.length, y: s.y / us.length };
  }
  function mundo(x, y) {
    if (!eixo) return new THREE.Vector3();
    const rx = x - eixo.cx, ry = y - eixo.cy;
    return new THREE.Vector3((rx * eixo.ux + ry * eixo.uy) * ESC, 0, (-rx * eixo.uy + ry * eixo.ux) * ESC);
  }

  function obterVis(u) {
    let v = vis.get(u.id); if (v) return v;
    const m = modelo(u.tipo);
    const bar = barra();
    bar.position.y = (u.tipo === 'ogro' ? 3.6 : u.tipo === 'reiSlime' ? 3.4 : 2.3) / m.g.scale.x;
    m.g.add(bar);
    v = { m, bar, flash: 0, ataque: 0, morte: -1, pos: mundo(u.x, u.y), dir: u.lado === 'h' ? 1 : -1, fase: rnd() * 6 };
    m.g.position.copy(v.pos);
    m.g.rotation.y = v.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    raiz.add(m.g); vis.set(u.id, v);
    return v;
  }

  function efeito(tipo, p, extra = {}) {
    if (tipo === 'explosao' || tipo === 'meteoro') {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffb02e', transparent: true, opacity: .8 }));
      s.position.copy(p).setY(.4); raiz.add(s);
      efeitos.push({ obj: s, vida: .5, t: 0, tipo: 'bola', raio: (extra.raio || 2) * ESC * 1.2 });
    }
    if (tipo === 'cura') {
      const s = new THREE.Mesh(new THREE.TorusGeometry(.5, .06, 8, 24), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true }));
      s.rotation.x = Math.PI / 2; s.position.copy(p).setY(.1); raiz.add(s);
      efeitos.push({ obj: s, vida: .7, t: 0, tipo: 'anel' });
    }
    if (tipo === 'poeira') {
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(.18, 6, 5), mat('#e8dcc0'));
        s.position.copy(p).add(new THREE.Vector3(Math.cos(i) * .3, .2, Math.sin(i) * .3));
        raiz.add(s);
        efeitos.push({ obj: s, vida: .6, t: 0, tipo: 'poeira', v: new THREE.Vector3(Math.cos(i) * 1.5, 1.5, Math.sin(i) * 1.5) });
      }
    }
    if (tipo === 'numero') {
      if (numerosAtivos >= 40) {
        const antigo = efeitos.find(e => e.tipo === 'numero');
        if (antigo) { raiz.remove(antigo.obj); antigo.t = antigo.vida; numerosAtivos--; }
      }
      const s = numero(extra.txt, extra.cor);
      s.position.copy(p).setY(2.2); raiz.add(s);
      efeitos.push({ obj: s, vida: .8, t: 0, tipo: 'numero' });
      numerosAtivos++;
    }
    if (tipo === 'giro') {
      const s = new THREE.Mesh(new THREE.TorusGeometry(1, .08, 8, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9 }));
      s.rotation.x = Math.PI / 2; s.position.copy(p).setY(.15); raiz.add(s);
      efeitos.push({ obj: s, vida: .5, t: 0, tipo: 'anel', raio: (extra.raio || 2) * ESC });
    }
    if (tipo === 'provocar') {
      const s = new THREE.Mesh(new THREE.TorusGeometry(1, .12, 8, 32), new THREE.MeshBasicMaterial({ color: '#e0453d', transparent: true, opacity: .7 }));
      s.rotation.x = Math.PI / 2; s.position.copy(p).setY(.15); raiz.add(s);
      efeitos.push({ obj: s, vida: .7, t: 0, tipo: 'anel', raio: (extra.raio || 2) * ESC });
    }
    if (tipo === 'meteoro') {
      const s = new THREE.Mesh(new THREE.SphereGeometry(.8, 16, 12), new THREE.MeshBasicMaterial({ color: '#ff8a1a', transparent: true, opacity: .95 }));
      s.position.copy(p).setY(14); raiz.add(s);
      efeitos.push({ obj: s, vida: .3, t: 0, tipo: 'meteoroQueda', alvo: p.clone() });
      if (!reduzido) tremor = Math.max(tremor, .35);
    }
    if (tipo === 'respingo') {
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), mat('#5fd16a'));
        s.position.copy(p).setY(.4); raiz.add(s);
        const ang = (i / 5) * Math.PI * 2;
        efeitos.push({ obj: s, vida: .5, t: 0, tipo: 'poeira', v: new THREE.Vector3(Math.cos(ang) * 1.2, 2, Math.sin(ang) * 1.2) });
      }
    }
  }

  function criarMoeda(p, tipo) {
    const ouro = VILOES[tipo] ? VILOES[tipo].ouro : 0;
    if (!ouro || ouro <= 0) return;
    const qtd = Math.max(1, Math.min(8, Math.round(ouro)));
    const valorCada = (ouro * (ECONOMIA.multAbate || 1)) / qtd;
    const geo = new THREE.CylinderGeometry(.16, .16, .05, 16);
    const matMoeda = new THREE.MeshToonMaterial({ color: '#f0c34a', emissive: '#3a2a00', emissiveIntensity: .4 });
    for (let i = 0; i < qtd; i++) {
      const m = new THREE.Mesh(geo, matMoeda);
      m.castShadow = true;
      const ang = (i / qtd) * Math.PI * 2 + rnd() * .5;
      const vel = 1.5 + rnd() * 1.5;
      m.position.copy(p).setY(.4);
      raiz.add(m);
      moedas.push({
        obj: m, valor: valorCada, t: 0,
        vx: Math.cos(ang) * vel, vz: Math.sin(ang) * vel, vy: 3 + rnd() * 1.5,
        fase: 'pulo', tPulo: 0, tSubida: 0,
      });
    }
  }

  function consumirEventos() {
    const evs = batalha.eventos || [];
    for (const ev of evs) {
      const p = ev.x !== undefined ? mundo(ev.x, ev.y) : null;
      if (ev.tipo === 'dano') {
        const v = vis.get(ev.alvo); if (v) v.flash = .18;
        const f = vis.get(ev.fonte); if (f && ev.golpe !== 'queima') f.ataque = .25;
        if (p && ev.valor >= 1 && ev.golpe !== 'queima') {
          efeito('numero', p, { txt: Math.round(ev.valor), cor: (ev.golpe === 'firme' || ev.golpe === 'certeiro') ? '#ffe14a' : '#fff' });
        }
      }
      if (ev.tipo === 'morte') {
        const v = vis.get(ev.alvo); if (v) v.morte = 0;
        if (p) efeito('poeira', p);
        if (ev.lado === 'v' && ev.unidade) criarMoeda(p || new THREE.Vector3(), ev.unidade);
        if ((ev.unidade === 'ogro' || ev.unidade === 'reiSlime') && !reduzido) tremor = Math.max(tremor, .25);
      }
      if (ev.tipo === 'disparo') { const f = vis.get(ev.fonte); if (f) f.ataque = .25; }
      if ((ev.tipo === 'explosao' || ev.tipo === 'meteoro') && p) efeito(ev.tipo, p, ev);
      if (ev.tipo === 'cura' && p) efeito('cura', p);
      if (ev.tipo === 'giro' && p) efeito('giro', p, ev);
      if (ev.tipo === 'provocar' && p) efeito('provocar', p, ev);
      if (ev.tipo === 'meteoro' && p) efeito('meteoro', p, ev);
      if (ev.tipo === 'respingo' && p) efeito('respingo', p);
      if ((ev.tipo === 'invocar' || ev.tipo === 'divisao') && p) efeito('poeira', p);
    }
    evs.length = 0;
  }

  function atualizar(dtR) {
    const t = batalha.t;
    for (const u of batalha.unidades) {
      const v = obterVis(u); const m = v.m;
      if (u.morto) {
        if (v.morte < 0) v.morte = 0;
        v.morte += dtR;
        m.g.rotation.z = Math.min(1.4, v.morte * 5) * -v.dir;
        m.g.position.y = -v.morte * .6;
        m.g.visible = v.morte < 1.2;
        if (m.g.children.length) m.g.children[m.g.children.length - 1].visible = false;
        continue;
      }
      if (u.atraso > 0 && t < u.atraso) { m.g.visible = false; continue; }
      m.g.visible = true;
      const alvo = mundo(u.x, u.y);
      const ant = v.pos.clone();
      v.pos.lerp(alvo, Math.min(1, dtR * 12));
      m.g.position.copy(v.pos);
      const mov = ant.distanceTo(v.pos) / Math.max(dtR, 1e-3);
      if (u.alvo && !u.alvo.morto) {
        const ap = mundo(u.alvo.x, u.alvo.y);
        const ang = Math.atan2(ap.x - v.pos.x, ap.z - v.pos.z);
        m.g.rotation.y += (((ang - m.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dtR * 10);
      }
      v.fase += dtR * (mov > .3 ? 12 : 3);
      const anda = mov > .3 ? 1 : 0;
      m.rig.position.y = Math.abs(Math.sin(v.fase)) * .12 * anda + (u.tipo === 'morcego' ? Math.sin(v.fase * .5) * .15 : 0);
      if (m.bracos[0]) { m.bracos[0].rotation.x = Math.sin(v.fase) * .6 * anda; m.bracos[1].rotation.x = -Math.sin(v.fase) * .6 * anda; }
      if (v.ataque > 0) {
        v.ataque -= dtR;
        const k = v.ataque / .25;
        if (m.bracos[1]) m.bracos[1].rotation.x = -2.4 * Math.sin(k * Math.PI);
        m.rig.position.z = Math.sin(k * Math.PI) * .25;
      } else m.rig.position.z = 0;
      if (m.asas) m.asas.forEach((a, i) => a.rotation.y = Math.sin(t * 22 + i * Math.PI) * .9);
      if (m.slime) { const s = 1 + Math.sin(v.fase * 1.3) * .08; m.slime.scale.set(1 * s, .78 / s, 1 * s); }
      m.g.traverse(o => {
        if (o.isMesh && o.material.emissive) o.material.emissive.setRGB(v.flash > 0 ? .9 : 0, v.flash > 0 ? .15 : 0, v.flash > 0 ? .1 : 0);
      });
      if (v.flash > 0) v.flash -= dtR;
      pintaBarra(v.bar, u.pv / u.pvMax, u.lado);
    }

    // projéteis
    const vivos = new Set();
    for (const p of batalha.projeteis) {
      let s = projVis.get(p);
      if (!s) {
        const fogo = p.tipo === 'bola' || p.raio;
        s = new THREE.Mesh(
          fogo ? new THREE.IcosahedronGeometry(.22, 1) : new THREE.CylinderGeometry(.03, .03, .7, 5),
          new THREE.MeshBasicMaterial({ color: fogo ? '#ff8a1a' : p.tipo === 'luz' ? '#fff3a0' : '#f2e0c0' })
        );
        if (!fogo) s.rotation.z = Math.PI / 2;
        raiz.add(s); projVis.set(p, s);
      }
      const w = mundo(p.x, p.y);
      s.position.set(w.x, 1.1, w.z);
      vivos.add(p);
    }
    for (const [p, s] of projVis) if (!vivos.has(p)) { raiz.remove(s); projVis.delete(p); }

    // zonas (tornado)
    const zonasAtivas = new Set();
    if (batalha.zonas) {
      for (const z of batalha.zonas) {
        zonasAtivas.add(z);
        let zv = zonasVis.get(z);
        if (!zv) {
          const raio = (z.raio || 1) * ESC;
          const geo = new THREE.ConeGeometry(raio, raio * 3, 16, 1, true);
          const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ff8a1a', transparent: true, opacity: .35, side: THREE.DoubleSide }));
          const w = mundo(z.x, z.y);
          m.position.set(w.x, raio * 1.5, w.z);
          raiz.add(m);
          zv = { obj: m, raio };
          zonasVis.set(z, zv);
        }
        zv.obj.rotation.y += dtR * 6;
      }
    }
    for (const [z, zv] of zonasVis) if (!zonasAtivas.has(z)) { raiz.remove(zv.obj); zonasVis.delete(z); }

    // efeitos
    for (const e of efeitos) {
      e.t += dtR;
      const k = e.t / e.vida;
      if (e.tipo === 'bola') { e.obj.scale.setScalar(.2 + k * e.raio * 2); e.obj.material.opacity = .8 * (1 - k); }
      if (e.tipo === 'anel') { const r = e.raio || 1.5; e.obj.scale.setScalar(1 + k * r * 2); e.obj.material.opacity = (1 - k) * .9; }
      if (e.tipo === 'poeira') { e.obj.position.addScaledVector(e.v, dtR); e.v.y -= dtR * 4; e.obj.scale.setScalar(Math.max(0, 1 - k)); }
      if (e.tipo === 'numero') { e.obj.position.y += dtR * 1.5; e.obj.material.opacity = 1 - k * k; }
      if (e.tipo === 'meteoroQueda') {
        const kk = Math.min(1, k);
        e.obj.position.y = 14 + (e.alvo.y + .4 - 14) * kk;
        e.obj.position.x = e.alvo.x; e.obj.position.z = e.alvo.z;
        if (k >= 1) {
          raiz.remove(e.obj);
          efeito('explosao', e.alvo, { raio: 3 });
        }
      }
      if (k >= 1 && e.tipo !== 'meteoroQueda') {
        raiz.remove(e.obj);
        if (e.tipo === 'numero') numerosAtivos--;
      }
    }
    efeitos = efeitos.filter(e => e.t < e.vida || e.tipo === 'meteoroQueda');

    // moedas
    for (const mo of moedas) {
      mo.t += dtR;
      if (mo.fase === 'pulo') {
        mo.tPulo += dtR;
        mo.obj.position.x += mo.vx * dtR;
        mo.obj.position.z += mo.vz * dtR;
        mo.obj.position.y += mo.vy * dtR;
        mo.vy -= 9.8 * dtR;
        mo.obj.rotation.y += dtR * 8;
        if (mo.tPulo >= .5) { mo.fase = 'subida'; mo.tSubida = 0; }
      } else if (mo.fase === 'subida') {
        mo.tSubida += dtR;
        const k = Math.min(1, mo.tSubida / .35);
        mo.obj.position.y += dtR * 3;
        mo.obj.rotation.y += dtR * 12;
        mo.obj.scale.setScalar(1 - k);
        if (k >= 1) {
          raiz.remove(mo.obj);
          mo.fase = 'fim';
          if (opcoes.aoMoeda) { try { opcoes.aoMoeda(mo.valor); } catch (e) {} }
        }
      }
    }
    moedas = moedas.filter(m => m.fase !== 'fim');

    // câmera
    const vivosU = batalha.unidades.filter(u => !u.morto && !(u.atraso > 0 && batalha.t < u.atraso));
    const c = vivosU.length ? media(vivosU) : { x: eixo.cx, y: eixo.cy };
    foco.lerp(mundo(c.x, c.y), Math.min(1, dtR * 1.5));
    const ret = (canvas.clientWidth / Math.max(1, canvas.clientHeight)) < 1.2 ? 1.5 : 1;
    let tx = 0, tz = 0;
    if (tremor > 0) {
      tremor -= dtR;
      tx = (rnd() - .5) * tremor * 1.2;
      tz = (rnd() - .5) * tremor * 1.2;
    }
    cam.position.set(foco.x - .5 + tx, CAMERA.altura * ret, foco.z + CAMERA.distancia * ret + tz);
    cam.lookAt(foco.x, CAMERA.alvoY, foco.z - .5);
  }

  function checarFim(dtR) {
    if (fimChamado) return;
    if (!batalha.fim) return;
    if (!fimAguardandoMoedas) { fimAguardandoMoedas = true; fimTempo = 0; }
    fimTempo += dtR;
    const esperaMin = 1.2;
    const temMoedas = moedas.length > 0;
    if (fimTempo >= esperaMin && (!temMoedas || fimTempo >= 3.0)) {
      fimChamado = true;
      if (opcoes.aoFim) { try { opcoes.aoFim(batalha.fim); } catch (e) {} }
    }
  }

  function quadro(agora) {
    rafId = requestAnimationFrame(quadro);
    if (!rodando) return;
    const dtReal = Math.min(.05, (agora - tAnt) / 1000);
    tAnt = agora;
    if (document.hidden) { renderer.render(cena, cam); return; }
    const pausado = pausadoManual || estado.pausado;
    if (!pausado && !batalha.fim) {
      acum += dtReal * velocidade;
      let guard = 0;
      while (acum >= DT && guard < 60) { passo(batalha); acum -= DT; guard++; }
    }
    consumirEventos();
    atualizar(dtReal * (pausado ? 0 : velocidade));
    checarFim(dtReal);
    renderer.render(cena, cam);
  }

  function iniciar() {
    if (rodando) { pausadoManual = false; estado.pausado = false; tAnt = performance.now(); return; }
    // eixo a partir dos centróides iniciais
    const hs = batalha.unidades.filter(u => u.lado === 'h');
    const vs = batalha.unidades.filter(u => u.lado === 'v');
    const cH = hs.length ? media(hs) : { x: 0, y: 0 };
    const cV = vs.length ? media(vs) : { x: 1, y: 0 };
    const dx = cV.x - cH.x, dy = cV.y - cH.y, n = Math.hypot(dx, dy) || 1;
    eixo = { ux: dx / n, uy: dy / n, cx: (cH.x + cV.x) / 2, cy: (cH.y + cV.y) / 2 };
    redim();
    rodando = true;
    pausadoManual = false;
    estado.pausado = false;
    acum = 0;
    tAnt = performance.now();
    rafId = requestAnimationFrame(quadro);
  }

  function pausar(p) {
    if (typeof p === 'boolean') pausadoManual = p;
    else pausadoManual = !pausadoManual;
    estado.pausado = pausadoManual;
  }

  function setVelocidade(v) {
    velocidade = [0.5, 1, 2].includes(v) ? v : 1;
  }

  function destruir() {
    rodando = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
    else window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    // libera recursos
    const geoSet = new Set();
    const matSet = new Set();
    const texSet = new Set();
    cena.traverse(o => {
      if (o.geometry) geoSet.add(o.geometry);
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          matSet.add(m);
          if (m.map) texSet.add(m.map);
        }
      }
    });
    for (const g of geoSet) { try { g.dispose(); } catch (e) {} }
    for (const m of matSet) { try { m.dispose(); } catch (e) {} }
    for (const t of texSet) { try { t.dispose(); } catch (e) {} }
    vis.clear(); projVis.clear(); zonasVis.clear();
    efeitos = []; moedas = [];
    try { renderer.dispose(); } catch (e) {}
  }

  function contagem() {
    let herois = 0, viloes = 0;
    const t = batalha.t;
    for (const u of batalha.unidades) {
      if (u.morto) continue;
      if (u.atraso > 0 && t < u.atraso) continue;
      if (u.lado === 'h') herois++;
      else if (u.lado === 'v') viloes++;
    }
    return { herois, viloes };
  }

  function forca() {
    let hPv = 0, hMax = 0, vPv = 0, vMax = 0;
    const t = batalha.t;
    for (const u of batalha.unidades) {
      if (u.morto) continue;
      if (u.atraso > 0 && t < u.atraso) continue;
      if (u.lado === 'h') { hPv += u.pv; hMax += u.pvMax; }
      else if (u.lado === 'v') { vPv += u.pv; vMax += u.pvMax; }
    }
    return {
      herois: hMax > 0 ? hPv / hMax : 0,
      viloes: vMax > 0 ? vPv / vMax : 0,
    };
  }

  visual.iniciar = iniciar;
  visual.pausar = pausar;
  visual.setVelocidade = setVelocidade;
  visual.destruir = destruir;
  visual.contagem = contagem;
  visual.forca = forca;

  return visual;
}