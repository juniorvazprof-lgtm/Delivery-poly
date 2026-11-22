import * as THREE from 'three';
import { passo, DT } from '../core/combate.js';
import { VILOES } from '../data/viloes.js';
import { ECONOMIA } from '../data/rodadas.js';
import { modelo } from './modelos3d.js';

// Câmera isométrica (ortográfica): azimute 45°, elevação ~35°; zoom automático pelo espalhamento da luta.
const CAMERA = { azimute: 45, elevacao: 35.3, distancia: 30, zoomMin: 5, zoomMax: 10, folga: 2.2 };
const ESC = 0.2;

const mat = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, ...o });
const toon = (geo, c, o) => { const m = new THREE.Mesh(geo, mat(c, o)); m.castShadow = true; return m; };
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

function barra() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 10;
  const t = new THREE.CanvasTexture(cv);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(1.1, .17, 1); s.renderOrder = 10; s.userData = { cv, t, ult: -1 };
  return s;
}
function pintaBarra(s, f, lado) {
  if (Math.abs(s.userData.ult - f) < .01) return;
  s.userData.ult = f;
  const g = s.userData.cv.getContext('2d');
  g.clearRect(0, 0, 64, 10);
  g.fillStyle = '#2a1a12'; g.fillRect(0, 0, 64, 10);
  g.fillStyle = lado === 'h' ? '#5fd16a' : '#e0453d';
  g.fillRect(2, 2, 60 * Math.max(0, f), 6);
  s.userData.t.needsUpdate = true;
}
function numero(txt, cor, critico) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const g = cv.getContext('2d');
  g.font = '900 44px system-ui'; g.textAlign = 'center';
  g.lineWidth = 8; g.strokeStyle = '#2a1a12'; g.strokeText(txt, 64, 46);
  g.fillStyle = cor; g.fillText(txt, 64, 46);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
  s.scale.set(1, .5, 1); s.renderOrder = 11;
  if (critico) s.scale.multiplyScalar(1.6);
  return s;
}

function configCenario(rodada) {
  const r = typeof rodada === 'number' ? rodada : 1;
  if (r >= 4 && r <= 5) return {
    tipo: 'deserto', chao: '#e3c27a', ceu: '#f6d9a0', fog: '#f6d9a0', terra: '#c9a46a',
  };
  if (r >= 6 && r <= 7) return {
    tipo: 'pantano', chao: '#4f6b3a', ceu: '#9fb59a', fog: '#9fb59a', terra: '#647546',
  };
  if (r >= 8) return {
    tipo: 'caverna', chao: '#5b5560', ceu: '#2a2433', fog: '#2a2433', terra: '#776d7e',
  };
  return { tipo: 'floresta', chao: '#6cbf4a', ceu: '#8fd0f0', fog: '#8fd0f0', terra: '#c9a46a' };
}

export function criarVisual(canvas, batalha, opcoes = {}) {
  const velocidadeInicial = [0.5, 1, 2].includes(opcoes.velocidade) ? opcoes.velocidade : 1;
  let velocidade = velocidadeInicial;
  let pausadoManual = false;
  let rodando = false;
  let rafId = 0;
  let acum = 0;
  let tAnt = 0;
  let eixo = null;
  let fimChamado = false;
  let fimTempo = 0;
  let fimAguardandoMoedas = false;
  let tremor = 0;
  let reduzido = false;
  try { reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  const estado = { pausado: false };
  const visual = { estado, modoEconomico: false };

  const cfg = configCenario(opcoes.rodada);

  const cena = new THREE.Scene();
  cena.background = new THREE.Color(cfg.ceu);
  cena.fog = new THREE.Fog(cfg.fog, 38, 70);
  const cam = new THREE.OrthographicCamera(-10, 10, 6, -6, -60, 200); let aspecto = 16 / 9, meiaAlt = 8;

  const luzHemi = new THREE.HemisphereLight('#fff6e0', cfg.tipo === 'caverna' ? '#2a1a3a' : '#4a7a3a', cfg.tipo === 'caverna' ? 1.0 : 1.6);
  cena.add(luzHemi);
  const sol = new THREE.DirectionalLight('#fff1d0', cfg.tipo === 'caverna' ? 1.4 : 2.6);
  sol.position.set(-8, 16, 10); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12 });
  sol.shadow.bias = -0.0005;
  cena.add(sol);
  let luzRoxa = null;
  if (cfg.tipo === 'caverna') {
    luzRoxa = new THREE.PointLight('#a05aff', 2.5, 30);
    luzRoxa.position.set(0, 6, 0);
    cena.add(luzRoxa);
  }

  const raiz = new THREE.Group(); cena.add(raiz);

  // chão + cenário
  {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const g = cv.getContext('2d');
    g.fillStyle = cfg.chao; g.fillRect(0, 0, 512, 512);
    const cores = cfg.tipo === 'deserto' ? ['#d9b86a', '#e8cc88', '#d0b060']
      : cfg.tipo === 'pantano' ? ['#455f30', '#5a7a42', '#3a5028']
      : cfg.tipo === 'caverna' ? ['#524c58', '#645e6c', '#4a4450']
      : ['#5fb043', '#78c955', '#64b847'];
    for (let i = 0; i < 900; i++) {
      g.fillStyle = cores[i % 3];
      g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 3 + rnd() * 9, 0, 7); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(13, 9); tex.colorSpace = THREE.SRGBColorSpace;
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(170, 120), new THREE.MeshToonMaterial({ map: tex }));
    chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; cena.add(chao);
    const terra = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat(cfg.terra));
    terra.scale.set(15, 7.5, 1); terra.rotation.x = -Math.PI / 2; terra.position.y = .01; terra.receiveShadow = true; cena.add(terra);

    if (cfg.tipo === 'floresta') {
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
        if(Math.abs(f.position.x) < 14 && Math.abs(f.position.z) < 7) continue;
        cena.add(f);
      }
    } else if (cfg.tipo === 'deserto') {
      for (let i = 0; i < 30; i++) {
        const a = rnd() * 6.28, d = 17 + rnd() * 12;
        const x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * .75;
        const gq = new THREE.Group(); gq.position.set(x, 0, z);
        if (i % 2) {
          const tr = toon(new THREE.CylinderGeometry(.28, .32, 1.6, 8), '#4a8a3a'); tr.position.y = .8; gq.add(tr);
          const b1 = toon(new THREE.CylinderGeometry(.14, .14, .5, 6), '#4a8a3a'); b1.position.set(.35, 1.1, 0); b1.rotation.z = -.6; gq.add(b1);
          const b2 = toon(new THREE.CylinderGeometry(.12, .12, .4, 6), '#4a8a3a'); b2.position.set(-.3, .9, 0); b2.rotation.z = .6; gq.add(b2);
        } else {
          const p = toon(new THREE.DodecahedronGeometry(.5 + rnd() * .7, 0), '#c98a4a'); p.position.y = .3; gq.add(p);
        }
        gq.rotation.y = rnd() * 6; cena.add(gq);
      }
    } else if (cfg.tipo === 'pantano') {
      for (let i = 0; i < 26; i++) {
        const a = rnd() * 6.28, d = 17 + rnd() * 12;
        const x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * .75;
        const gq = new THREE.Group(); gq.position.set(x, 0, z);
        const tr = toon(new THREE.CylinderGeometry(.2, .35, 2.2, 6), '#2a2a1a'); tr.position.y = 1.1; gq.add(tr);
        const b1 = toon(new THREE.CylinderGeometry(.08, .12, .8, 5), '#2a2a1a'); b1.position.set(.4, 1.8, 0); b1.rotation.z = -.8; gq.add(b1);
        gq.rotation.y = rnd() * 6; cena.add(gq);
      }
      for (let i = 0; i < 12; i++) {
        const p = new THREE.Mesh(new THREE.CircleGeometry(.8 + rnd() * 1.2, 16), new THREE.MeshBasicMaterial({ color: '#5a8aa0', transparent: true, opacity: .6 }));
        p.rotation.x = -Math.PI / 2; p.position.set((rnd() - .5) * 30, .02, (rnd() - .5) * 18); cena.add(p);
      }
    } else if (cfg.tipo === 'caverna') {
      for (let i = 0; i < 30; i++) {
        const a = rnd() * 6.28, d = 17 + rnd() * 12;
        const x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * .75;
        const gq = new THREE.Group(); gq.position.set(x, 0, z);
        if (i % 2) {
          const c = toon(new THREE.ConeGeometry(.3 + rnd() * .3, 1.2 + rnd() * 1.2, 6), '#6a6470'); c.position.y = .6; gq.add(c);
        } else {
          const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.4 + rnd() * .3, 0), new THREE.MeshBasicMaterial({ color: '#a05aff' }));
          cr.position.y = .4; gq.add(cr);
        }
        gq.rotation.y = rnd() * 6; cena.add(gq);
      }
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
    aspecto = w / Math.max(1, h);
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

  // dano agrupado
  const danoAcum = new Map(); // alvoId -> { soma, t, critico, p }
  const JANELA_DANO = .35;
  const MAX_NUMEROS = 25;

  // câmera lenta final
  let slowmo = 0; // tempo restante real
  let slowmoAlvo = null;
  let flash = null;
  let flashT = 0;

  // modo econômico
  let fpsAmostras = [];
  let fpsTempo = 0;
  let economicoAvaliado = false;

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
    const chefe = u.tipo === 'ogro' || u.tipo === 'reiSlime';
    bar.position.y = (chefe ? 3.6 : 2.3) / m.g.scale.x;
    if (chefe) bar.scale.set(1.6, .24, 1);
    bar.visible = chefe;
    m.g.add(bar);
    v = {
      m, bar, flash: 0, ataque: 0, morte: -1,
      pos: mundo(u.x, u.y), dir: u.lado === 'h' ? 1 : -1, fase: rnd() * 6,
      chefe, barTempo: 0, acao: null, escudoT: 0, curaT: 0, tiroT: 0,
    };
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
    if (tipo === 'rastro') {
      const geo = new THREE.RingGeometry(.6, 1.1, 20, 1, 0, Math.PI);
      const s = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false }));
      s.position.copy(p).setY(1.1);
      if (extra.dir !== undefined) s.rotation.y = extra.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      raiz.add(s);
      efeitos.push({ obj: s, vida: .15, t: 0, tipo: 'rastro' });
    }
    if (tipo === 'feixe') {
      const s = new THREE.Mesh(
        new THREE.CylinderGeometry(.18, .18, 4, 8, 1, true),
        new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      s.position.copy(p).setY(2); raiz.add(s);
      efeitos.push({ obj: s, vida: .4, t: 0, tipo: 'feixe' });
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

  function emitirNumero(p, txt, cor, critico) {
    if (numerosAtivos >= MAX_NUMEROS) {
      const antigo = efeitos.find(e => e.tipo === 'numero');
      if (antigo) { raiz.remove(antigo.obj); antigo.t = antigo.vida; numerosAtivos--; }
    }
    const s = numero(txt, cor, critico);
    s.position.copy(p).setY(2.2); raiz.add(s);
    efeitos.push({ obj: s, vida: .8, t: 0, tipo: 'numero' });
    numerosAtivos++;
  }

  function consumirEventos() {
    const evs = batalha.eventos || [];
    for (const ev of evs) {
      const p = ev.x !== undefined ? mundo(ev.x, ev.y) : null;
      if (ev.tipo === 'dano') {
        const v = vis.get(ev.alvo); if (v) { v.flash = .18; v.barTempo = 2.5; }
        const f = vis.get(ev.fonte);
        if (f && ev.golpe !== 'queima') {
          f.ataque = .25;
          // animação de ação
          if (ev.golpe === 'firme' || ev.golpe === 'certeiro' || ev.golpe === 'normal') {
            if (p) efeito('rastro', p, { dir: f.dir });
          }
        }
        if (p && ev.valor >= 1 && ev.golpe !== 'queima') {
          const alvoId = ev.alvo;
          const critico = ev.golpe === 'firme' || ev.golpe === 'certeiro';
          let d = danoAcum.get(alvoId);
          if (!d) { d = { soma: 0, t: 0, critico: false, p: p.clone() }; danoAcum.set(alvoId, d); }
          d.soma += ev.valor;
          d.t = 0;
          d.critico = d.critico || critico;
          d.p.copy(p);
        }
      }
      if (ev.tipo === 'morte') {
        const v = vis.get(ev.alvo); if (v) v.morte = 0;
        if (p) efeito('poeira', p);
        if (ev.lado === 'v' && ev.unidade) criarMoeda(p || new THREE.Vector3(), ev.unidade);
        if ((ev.unidade === 'ogro' || ev.unidade === 'reiSlime') && !reduzido) tremor = Math.max(tremor, .25);
        // câmera lenta no último inimigo
        if (ev.lado === 'v' && !batalha.fim) {
          const vivosV = batalha.unidades.filter(u => u.lado === 'v' && !u.morto && !(u.atraso > 0 && batalha.t < u.atraso));
          if (vivosV.length === 0 && !slowmoAlvo) {
            slowmo = .8;
            slowmoAlvo = p ? p.clone() : null;
          }
        }
      }
      if (ev.tipo === 'disparo') {
        const f = vis.get(ev.fonte);
        if (f) { f.ataque = .25; f.tiroT = .3; }
      }
      if ((ev.tipo === 'explosao' || ev.tipo === 'meteoro') && p) efeito(ev.tipo, p, ev);
      if (ev.tipo === 'cura' && p) {
        efeito('cura', p);
        // feixe vertical sobre alvo curado
        efeito('feixe', p);
        // animação de cura na fonte
        const f = vis.get(ev.fonte);
        if (f) f.curaT = .4;
        // número verde
        if (ev.valor && ev.valor >= 1) {
          emitirNumero(p, '+' + Math.round(ev.valor), '#7ae07a', false);
        }
      }
      if (ev.tipo === 'giro' && p) efeito('giro', p, ev);
      if (ev.tipo === 'provocar' && p) {
        efeito('provocar', p, ev);
        const f = vis.get(ev.fonte);
        if (f) f.escudoT = .6;
      }
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
      // animações de ação especiais
      if (v.escudoT > 0) {
        v.escudoT -= dtR;
        const k = 1 - v.escudoT / .6;
        if (m.bracos[0]) m.bracos[0].rotation.x = -1.2 * Math.sin(k * Math.PI);
      }
      if (v.curaT > 0) {
        v.curaT -= dtR;
        const k = 1 - v.curaT / .4;
        if (m.bracos[1]) m.bracos[1].rotation.x = -2.0 * Math.sin(k * Math.PI);
      }
      if (v.tiroT > 0) {
        v.tiroT -= dtR;
        const k = 1 - v.tiroT / .3;
        if (m.bracos[0]) m.bracos[0].rotation.x = .8 * Math.sin(k * Math.PI);
      }
      if (m.asas) m.asas.forEach((a, i) => a.rotation.y = Math.sin(t * 22 + i * Math.PI) * .9);
      if (m.slime) { const s = 1 + Math.sin(v.fase * 1.3) * .08; m.slime.scale.set(1 * s, .78 / s, 1 * s); }
      // girar redemoinho do magoTornado
      m.g.traverse(o => {
        if (o.userData && o.userData.girar) o.userData.girar.forEach(r => { r.rotation.z += dtR * 8; });
      });
      m.g.traverse(o => {
        if (o.isMesh && o.material.emissive) o.material.emissive.setRGB(v.flash > 0 ? .9 : 0, v.flash > 0 ? .15 : 0, v.flash > 0 ? .1 : 0);
      });
      if (v.flash > 0) v.flash -= dtR;
      // barra de vida
      const frac = u.pv / u.pvMax;
      if (v.chefe) {
        v.bar.visible = true;
        pintaBarra(v.bar, frac, u.lado);
      } else {
        if (v.barTempo > 0) {
          v.barTempo -= dtR;
          v.bar.visible = true;
          pintaBarra(v.bar, frac, u.lado);
          if (v.barTempo < .5) v.bar.material.opacity = v.barTempo / .5;
          else v.bar.material.opacity = 1;
        } else {
          v.bar.visible = false;
        }
      }
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
      if (e.tipo === 'rastro') { e.obj.material.opacity = .7 * (1 - k); e.obj.scale.setScalar(1 + k * .5); }
      if (e.tipo === 'feixe') { e.obj.material.opacity = .7 * (1 - k); e.obj.scale.x = e.obj.scale.z = 1 + k * .5; }
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

    // dano agrupado
    for (const [id, d] of danoAcum) {
      d.t += dtR;
      if (d.t >= JANELA_DANO) {
        const txt = Math.round(d.soma) + (d.critico ? '!' : '');
        emitirNumero(d.p, txt, d.critico ? '#ffe14a' : '#fff', d.critico);
        danoAcum.delete(id);
      }
    }

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
    let alvoFoco = mundo(c.x, c.y);
    if (slowmoAlvo) alvoFoco = slowmoAlvo.clone();
    foco.lerp(alvoFoco, Math.min(1, dtR * 1.5));
    // zoom: cabe todo mundo vivo (com folga), suavizado
    let esp = 0;
    for (const u of vivosU) { const w = mundo(u.x, u.y); esp = Math.max(esp, Math.abs(w.x - foco.x), Math.abs(w.z - foco.z) * 1.6); }
    let alvoMeia = Math.min(CAMERA.zoomMax, Math.max(CAMERA.zoomMin, esp * .5 + CAMERA.folga));
    if (slowmoAlvo) alvoMeia *= .65;
    meiaAlt += (alvoMeia - meiaAlt) * Math.min(1, dtR * 1.2);
    const mw = meiaAlt * Math.max(aspecto, .8);
    cam.left = -mw; cam.right = mw; cam.top = meiaAlt; cam.bottom = -meiaAlt; cam.updateProjectionMatrix();
    let tx = 0, tz = 0;
    if (tremor > 0) { tremor -= dtR; tx = (rnd() - .5) * tremor * 1.2; tz = (rnd() - .5) * tremor * 1.2; }
    const az = CAMERA.azimute * Math.PI / 180, el = CAMERA.elevacao * Math.PI / 180, d = CAMERA.distancia;
    cam.position.set(foco.x + Math.sin(az) * Math.cos(el) * d + tx, Math.sin(el) * d, foco.z + Math.cos(az) * Math.cos(el) * d + tz);
    cam.lookAt(foco.x + tx, 0, foco.z + tz);

    // flash
    if (flash) {
      flashT += dtR;
      flash.material.opacity = Math.max(0, .8 * (1 - flashT / .3));
      if (flashT >= .3) { cena.remove(flash); flash = null; }
    }
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

  function avaliarEconomico(dtReal) {
    if (economicoAvaliado) return;
    fpsTempo += dtReal;
    if (dtReal > 0) fpsAmostras.push(1 / dtReal);
    if (fpsTempo >= 3) {
      economicoAvaliado = true;
      const media = fpsAmostras.reduce((a, b) => a + b, 0) / Math.max(1, fpsAmostras.length);
      if (media < 32) {
        visual.modoEconomEconomico = true;
        renderer.shadowMap.enabled = false;
        sol.castShadow = false;
        renderer.setPixelRatio(1);
        cena.traverse(o => {
          if (o.material) {
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            for (const mm of ms) mm.needsUpdate = true;
          }
        });
        // reduz partículas pela metade
        efeitos = efeitos.filter((e, i) => i % 2 === 0);
      }
    }
  }

  function quadro(agora) {
    rafId = requestAnimationFrame(quadro);
    if (!rodando) return;
    const dtReal = Math.min(.05, (agora - tAnt) / 1000);
    tAnt = agora;
    if (document.hidden) { renderer.render(cena, cam); return; }
    avaliarEconomico(dtReal);
    const pausado = pausadoManual || estado.pausado;
    // câmera lenta
    let velEfetiva = velocidade;
    if (slowmo > 0) {
      slowmo -= dtReal;
      velEfetiva = velocidade * .25;
      if (!flash) {
        flash = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 2),
          new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .8, depthTest: false })
        );
        flash.renderOrder = 999;
        flash.position.set(0, 0, -1);
        cam.add(flash);
        flashT = 0;
      }
      if (slowmo <= 0) {
        slowmoAlvo = null;
      }
    }
    if (!pausado && !batalha.fim) {
      acum += dtReal * velEfetiva;
      let guard = 0;
      while (acum >= DT && guard < 60) { passo(batalha); acum -= DT; guard++; }
    }
    consumirEventos();
    atualizar(dtReal * (pausado ? 0 : velEfetiva));
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
    efeitos = []; moedas = []; danoAcum.clear();
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
