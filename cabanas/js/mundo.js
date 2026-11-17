// Mundo da área: chão, cabanas, pinheiros, pedras, caixas de suprimento e vaga-lumes.
// Gerado a partir de uma semente: a mesma semente tem sempre o mesmo mapa.
import * as T from './lib/three.module.js';

export const mat = (c, o = {}) => new T.MeshLambertMaterial({ color: c, flatShading: true, ...o });
export const brilho = c => new T.MeshBasicMaterial({ color: c });
export const caixa = (w, h, d, c, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'string' ? mat(c) : c); m.position.set(x, y, z); m.castShadow = true; return m; };
export const aleatorio = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

export function criarMundo(semente, MUNDO) {
  const rand = aleatorio(semente);
  const scene = new T.Scene();
  scene.background = new T.Color('#0a0a14');
  scene.fog = new T.Fog('#141428', 22, 46);
  scene.add(new T.HemisphereLight('#8c9cb8', '#1e2340', 1.6));
  const lua = new T.DirectionalLight('#c5d3e8', 1.6); lua.castShadow = true;
  Object.assign(lua.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 }); lua.shadow.mapSize.set(1024, 1024);
  scene.add(lua, lua.target);

  const colisores = [];   // círculos [x, z, raio]
  const livre = (x, z, r) => Math.abs(x) < MUNDO - 2 && Math.abs(z) < MUNDO - 2 && !colisores.some(([cx, cz, cr]) => Math.hypot(cx - x, cz - z) < cr + r);

  // chão com trilhas de terra entre as cabanas
  {
    const g = new T.PlaneGeometry(MUNDO * 2, MUNDO * 2, 68, 68); g.rotateX(-Math.PI / 2);
    const cols = [], p = g.attributes.position, tmp = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), n = Math.sin(x * 0.7) * Math.cos(z * 0.6) + Math.sin(x * 0.23 + z * 0.31);
      const trilha = Math.abs(z - Math.sin(x * 0.18) * 3) < 1.4 || Math.abs(x + 2 - Math.sin(z * 0.2) * 2) < 1.2;
      tmp.set(trilha ? (n > 0 ? '#4a2c2a' : '#6e4434') : n > 0.6 ? '#25553d' : n > -0.4 ? '#1b3a30' : '#132420');
      cols.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    const chao = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })); chao.receiveShadow = true; scene.add(chao);
  }

  function pinheiro(x, z, s = 1) {
    const g = new T.Group();
    const tronco = new T.Mesh(new T.CylinderGeometry(0.16 * s, 0.22 * s, 1.2 * s, 5), mat('#4a2c2a')); tronco.position.y = 0.6 * s; g.add(tronco);
    ['#1b3a30', '#25553d', '#3f7a48'].forEach((c, i) => { const m = new T.Mesh(new T.ConeGeometry((1.35 - i * 0.33) * s, 1.5 * s, 6), mat(c)); m.position.y = (1.4 + i * 0.85) * s; m.rotation.y = rand() * 3; g.add(m); });
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, 0, z); scene.add(g); colisores.push([x, z, 0.45 * s]);
  }
  const luzes = [];
  function cabana(x, z, ry) {
    const g = new T.Group(), w = 3.4, d = 2.8, h = 2.0;
    for (let i = 0; i < 6; i++) { const log = new T.Mesh(new T.BoxGeometry(w, h / 6, d), mat(i % 2 ? '#6e4434' : '#9a6a44')); log.position.y = h / 12 + i * h / 6; g.add(log); }
    const forma = new T.Shape(); forma.moveTo(-w / 2 - 0.35, 0); forma.lineTo(0, 1.5); forma.lineTo(w / 2 + 0.35, 0);
    const telhado = new T.Mesh(new T.ExtrudeGeometry(forma, { depth: d + 0.6, bevelEnabled: false }), mat('#2b1d2a')); telhado.position.set(0, h, -d / 2 - 0.3); g.add(telhado);
    g.add(caixa(0.8, 1.3, 0.08, '#4a2c2a', -0.7, 0.65, d / 2 + 0.03));
    const acesa = rand() < 0.7;
    g.add(caixa(0.7, 0.55, 0.08, brilho(acesa ? '#e8a850' : '#1e2340'), 0.8, 1.1, d / 2 + 0.03));
    g.add(caixa(0.06, 0.6, 0.1, '#2b1d2a', 0.8, 1.1, d / 2 + 0.06));
    g.add(caixa(0.45, 1.2, 0.45, '#5d6a8a', w / 2 - 0.6, h + 0.9, -0.4));
    g.traverse(o => { if (o.isMesh && o.material.type !== 'MeshBasicMaterial') { o.castShadow = true; o.receiveShadow = true; } });
    if (acesa) { const l = new T.PointLight('#e8a850', 14, 7, 1.5); l.position.set(0.8, 1.1, d / 2 + 0.8); g.add(l); luzes.push(l); }
    g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); colisores.push([x, z, 2.0]);
    // ponto em frente à porta (onde fica a caixa de suprimentos)
    const porta = new T.Vector3(-0.7, 0, d / 2 + 0.9).applyAxisAngle(new T.Vector3(0, 1, 0), ry).add(g.position);
    return porta;
  }

  // acampamento: cabanas em volta da clareira central (o jogador começa no meio)
  const portas = [];
  const nCab = 6;
  for (let i = 0; i < nCab; i++) {
    const a = (i / nCab) * Math.PI * 2 + rand() * 0.5, r = 7 + rand() * 9, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!livre(x, z, 3)) continue;
    portas.push(cabana(x, z, a + Math.PI + (rand() - 0.5) * 0.6));
  }
  for (let i = 0; i < 22; i++) {
    const x = (rand() - 0.5) * MUNDO * 1.7, z = (rand() - 0.5) * MUNDO * 1.7;
    if (Math.hypot(x, z) < 3 || !livre(x, z, 0.6)) continue;
    const r = new T.Mesh(new T.DodecahedronGeometry(0.3 + rand() * 0.35, 0), mat(rand() < 0.5 ? '#3a3f5a' : '#5d6a8a'));
    r.position.set(x, 0.15, z); r.rotation.set(rand(), rand(), rand()); r.castShadow = r.receiveShadow = true; scene.add(r);
  }
  for (let i = 0; i < 230; i++) {
    const x = (rand() - 0.5) * MUNDO * 2, z = (rand() - 0.5) * MUNDO * 2, r = Math.hypot(x, z);
    if (r < 4 || (r < 13 && rand() < 0.7)) continue;
    if (!livre(x, z, 1.2)) continue;
    pinheiro(x, z, 0.8 + rand() * 0.7);
  }
  // muro de árvores na borda (o mapa tem limite visível)
  for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2, r = MUNDO - 1 + rand(); const x = Math.sin(a) * r * 1.0, z = Math.cos(a) * r; if (Math.abs(x) < MUNDO && Math.abs(z) < MUNDO) pinheiro(x, z, 1.1 + rand() * 0.5); }

  // vaga-lumes
  const vagalumes = [];
  for (let i = 0; i < 26; i++) { const m = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 0.08), brilho('#f8e6a0')); m.userData = { x: (rand() - 0.5) * 34, z: (rand() - 0.5) * 34, y: 0.6 + rand() * 1.4, p: rand() * 6 }; scene.add(m); vagalumes.push(m); }

  // ---- caixas de suprimento (munição) em frente às portas ----
  const caixas = portas.map(p => {
    const g = new T.Group();
    g.add(caixa(0.7, 0.42, 0.5, '#6e4434', 0, 0.21, 0), caixa(0.74, 0.08, 0.54, '#2b1d2a', 0, 0.44, 0), caixa(0.2, 0.12, 0.04, brilho('#e8a850'), 0, 0.3, 0.27));
    g.position.copy(p); g.rotation.y = rand() * 3; scene.add(g);
    return { g, aberta: false };
  });

  return {
    scene, lua, colisores, luzes, vagalumes, caixas, livre, rand, MUNDO,
    /** Empurra um ponto para fora dos colisores (cabanas, árvores) e dos limites do mapa. */
    resolver(nx, nz, raio) {
      for (const [cx, cz, cr] of colisores) { const dx = nx - cx, dz = nz - cz, d = Math.hypot(dx, dz), m = cr + raio; if (d < m && d > 0) { nx = cx + dx / d * m; nz = cz + dz / d * m; } }
      const lim = MUNDO - 2; return [Math.max(-lim, Math.min(lim, nx)), Math.max(-lim, Math.min(lim, nz))];
    },
    ambiente(t, foco) {
      lua.position.set(foco.x - 14, 22, foco.z + 8); lua.target.position.copy(foco);
      for (const f of vagalumes) { const u = f.userData; f.position.set(u.x + Math.sin(t * 0.6 + u.p) * 1.2, u.y + Math.sin(t * 1.7 + u.p) * 0.3, u.z + Math.cos(t * 0.5 + u.p) * 1.2); f.visible = Math.sin(t * 2 + u.p * 3) > -0.2; }
      luzes.forEach((l, i) => l.intensity = 14 + Math.sin(t * 9 + i) * 1);
    },
  };
}
