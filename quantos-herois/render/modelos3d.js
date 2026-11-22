import * as THREE from 'three';

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

    // ===== HERÓIS EVOLUÍDOS =====
    magoTornado: () => {
      m = corpoChibi({ roupa: '#8a1a1a', escala: 1.12 });
      const ch = toon(new THREE.ConeGeometry(.62, 1.15, 16), '#5a0f0f'); ch.position.y = .8; ch.rotation.z = -.12; m.cab.add(ch);
      const aba = toon(new THREE.CylinderGeometry(.85, .85, .07, 20), '#5a0f0f'); aba.position.y = .32; m.cab.add(aba);
      const faixa = toon(new THREE.CylinderGeometry(.63, .63, .1, 20), '#e8c34a'); faixa.position.y = .42; m.cab.add(faixa);
      // capa com chamas
      const capa = toon(new THREE.ConeGeometry(.55, 1.1, 8, 1, true), '#3a0a0a'); capa.position.set(0, .55, -.35); capa.rotation.x = .25; m.rig.add(capa);
      for (let i = 0; i < 5; i++) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(.12, .35, 6), new THREE.MeshBasicMaterial({ color: ['#ff5a1a', '#ff8a2a', '#ffb02e'][i % 3] }));
        f.position.set((i - 2) * .18, .15 + rnd() * .3, -.55); f.rotation.x = -.3; m.rig.add(f);
      }
      // cajado com redemoinho
      const cg = arma('cajado'); m.bracos[1].add(cg);
      const orb = cg.userData.orb; if (orb) orb.visible = false;
      const redemoinho = new THREE.Mesh(new THREE.TorusGeometry(.18, .04, 8, 20), new THREE.MeshBasicMaterial({ color: '#ff8a2a' }));
      redemoinho.position.y = .38; redemoinho.rotation.x = Math.PI / 2; cg.add(redemoinho);
      const redemoinho2 = new THREE.Mesh(new THREE.TorusGeometry(.12, .03, 8, 16), new THREE.MeshBasicMaterial({ color: '#ffd04a' }));
      redemoinho2.position.y = .38; redemoinho2.rotation.x = Math.PI / 2; redemoinho2.rotation.z = .5; cg.add(redemoinho2);
      cg.userData.girar = [redemoinho, redemoinho2];
    },
    campeao: () => {
      m = corpoChibi({ roupa: '#c03028', escala: 1.12 });
      const el = toon(new THREE.SphereGeometry(.7, 20, 12, 0, 6.29, 0, 1.45), '#e8c34a'); el.position.y = .05; m.cab.add(el);
      const crista = toon(new THREE.BoxGeometry(.1, .45, .85), '#f5f5f5'); crista.position.y = .72; m.cab.add(crista);
      // capa vermelha
      const capa = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3, 4, 4), mat('#a02020', { side: THREE.DoubleSide }));
      capa.position.set(0, .55, -.38); capa.rotation.x = .15; m.rig.add(capa);
      // espada maior com brilho
      const esp = arma('espada'); m.bracos[1].add(esp);
      const l = esp.children[0]; if (l) { l.scale.set(1.3, 1.35, 1); l.material = mat('#eef4ff', { emissive: '#4a6aff', emissiveIntensity: .5 }); }
    },
    paladino: () => {
      m = corpoChibi({ roupa: '#e8d8a0', escala: 1.12 });
      const el = toon(new THREE.CylinderGeometry(.62, .7, .58, 16), '#e8c34a'); el.position.y = .32; m.cab.add(el);
      // auréola fina
      const aur = new THREE.Mesh(new THREE.TorusGeometry(.44, .035, 8, 28), new THREE.MeshBasicMaterial({ color: '#fff3a0' }));
      aur.rotation.x = Math.PI / 2; aur.position.y = .88; m.cab.add(aur);
      // escudo grande dourado com cruz
      const esc = new THREE.Group();
      const e = toon(new THREE.CylinderGeometry(.52, .52, .1, 20), '#e8c34a'); e.rotation.x = Math.PI / 2; e.position.set(0, -.35, .12); esc.add(e);
      const cruzV = toon(new THREE.BoxGeometry(.1, .55, .06), '#fff8e0'); cruzV.position.set(0, -.35, .18); esc.add(cruzV);
      const cruzH = toon(new THREE.BoxGeometry(.4, .1, .06), '#fff8e0'); cruzH.position.set(0, -.35, .18); esc.add(cruzH);
      m.bracos[0].add(esc);
      m.bracos[1].add(arma('espada'));
    },
    atirador: () => {
      m = corpoChibi({ roupa: '#2a5a2a', escala: 1.12 });
      const cap = toon(new THREE.SphereGeometry(.7, 18, 12, 0, 6.29, 0, 1.75), '#1a3a1a'); cap.position.set(0, .02, -.06); m.cab.add(cap);
      // luneta
      const lun = toon(new THREE.CylinderGeometry(.08, .08, .28, 10), '#3a3a3a'); lun.rotation.z = Math.PI / 2; lun.position.set(.35, .05, .55); m.cab.add(lun);
      // arco maior escuro com detalhes dourados
      const arco = new THREE.Group();
      const a = toon(new THREE.TorusGeometry(.55, .045, 6, 24, Math.PI), '#2a1a0a'); a.rotation.z = Math.PI / 2; a.position.set(0, -.35, .1); arco.add(a);
      const det = toon(new THREE.TorusGeometry(.55, .02, 6, 24, Math.PI), '#e8c34a'); det.rotation.z = Math.PI / 2; det.position.set(0, -.35, .13); arco.add(det);
      m.bracos[0].add(arco);
    },
    sumoSacerdote: () => {
      m = corpoChibi({ roupa: '#f5f0e0', escala: 1.12 });
      // mitra alta
      const mitra = toon(new THREE.ConeGeometry(.5, 1.0, 8), '#fff8e0'); mitra.position.y = .75; m.cab.add(mitra);
      const faixa = toon(new THREE.CylinderGeometry(.52, .52, .12, 16), '#e8c34a'); faixa.position.y = .32; m.cab.add(faixa);
      // auréola dupla
      const aur1 = new THREE.Mesh(new THREE.TorusGeometry(.42, .04, 8, 28), new THREE.MeshBasicMaterial({ color: '#ffe066' }));
      aur1.rotation.x = Math.PI / 2; aur1.position.y = .88; m.cab.add(aur1);
      const aur2 = new THREE.Mesh(new THREE.TorusGeometry(.55, .03, 8, 28), new THREE.MeshBasicMaterial({ color: '#fff3a0' }));
      aur2.rotation.x = Math.PI / 2; aur2.position.y = .95; m.cab.add(aur2);
      // cajado com cruz dourada luminosa
      const cg = arma('cajadoLuz'); m.bracos[1].add(cg);
      const orb = cg.userData.orb; if (orb) orb.visible = false;
      const cruzV = new THREE.Mesh(new THREE.BoxGeometry(.08, .4, .08), new THREE.MeshBasicMaterial({ color: '#ffe066' })); cruzV.position.y = .38; cg.add(cruzV);
      const cruzH = new THREE.Mesh(new THREE.BoxGeometry(.28, .08, .08), new THREE.MeshBasicMaterial({ color: '#ffe066' })); cruzH.position.y = .42; cg.add(cruzH);
    },
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

// ===== RETRATO (offscreen WebGLRenderer único reutilizado) =====
let _retRenderer = null;
let _retFalhou = false;
const _retCache = new Map();

function _obterRetRenderer() {
  if (_retRenderer || _retFalhou) return _retRenderer;
  try {
    const cv = document.createElement('canvas');
    _retRenderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    _retRenderer.setClearColor(0x000000, 0);
    _retRenderer.outputColorSpace = THREE.SRGBColorSpace;
    _retRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  } catch (e) {
    _retFalhou = true;
    _retRenderer = null;
  }
  return _retRenderer;
}

export function retrato(tipo, tamanho = 128) {
  const chave = tipo + '|' + tamanho;
  if (_retCache.has(chave)) return _retCache.get(chave);
  const r = _obterRetRenderer();
  if (!r) { _retCache.set(chave, null); return null; }
  try {
    const cena = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(28, 1, .1, 50);
    // 3/4 de frente
    cam.position.set(1.6, 1.9, 2.6);
    cam.lookAt(0, 1.35, 0);

    const hemi = new THREE.HemisphereLight('#fff6e0', '#4a7a3a', 1.8);
    cena.add(hemi);
    const dir = new THREE.DirectionalLight('#fff1d0', 2.4);
    dir.position.set(-3, 5, 4);
    cena.add(dir);

    const m = modelo(tipo);
    // enquadra só cabeça+tronco: esconde pernas e afasta o resto
    m.g.position.set(0, 0, 0);
    // esconde pernas (primeiros filhos do rig que não são braços/cab)
    // simplificação: esconde tudo abaixo de y ~0.4 no rig
    m.rig.children.forEach(o => {
      if (o === m.cab) return;
      if (m.bracos && m.bracos.includes(o)) return;
      if (o.position && o.position.y < .5) o.visible = false;
    });
    cena.add(m.g);

    r.setSize(tamanho, tamanho, false);
    r.setPixelRatio(1);
    r.render(cena, cam);
    const url = r.domElement.toDataURL('image/png');

    // limpa cena
    cena.traverse(o => {
      if (o.geometry) { try { o.geometry.dispose(); } catch (e) {} }
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const mm of ms) { try { mm.dispose(); } catch (e) {} }
      }
    });

    _retCache.set(chave, url);
    return url;
  } catch (e) {
    _retCache.set(chave, null);
    return null;
  }
}

export { modelo };
