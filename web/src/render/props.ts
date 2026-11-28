import * as THREE from 'three';

export const PALETTE = { ground: 0x1a140f, ground2: 0x2a1f15, path: 0x38332f, stone: 0x3a3634, wood: 0x2e1a0d, roof: 0x1f0d0d, deadwood: 0x241810, grass: 0x1c2410, flame: 0xff7a26, blood: 0x4a0808 };

const matCache = new Map<string, THREE.MeshStandardMaterial>();

function mat(color: number, emissive = 0, emissiveIntensity = 0): THREE.MeshStandardMaterial {
  const key = `${color}|${emissive}|${emissiveIntensity}`;
  const cached = matCache.get(key);
  if (cached) return cached;
  const m = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    flatShading: true,
    roughness: 0.9,
    metalness: 0,
  });
  matCache.set(key, m);
  return m;
}

function setup(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w: number, h: number, d: number, m: THREE.Material): THREE.Mesh {
  return setup(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
}

function cone(r: number, h: number, seg: number, m: THREE.Material): THREE.Mesh {
  return setup(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m));
}

function cyl(rt: number, rb: number, h: number, seg: number, m: THREE.Material): THREE.Mesh {
  return setup(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m));
}

export function makeHouse(rng: () => number, ruined = false): THREE.Group {
  const g = new THREE.Group();
  const w = 2.4 + (rng() - 0.5) * 0.4;
  const h = 2 + (rng() - 0.5) * 0.3;
  const d = 2.2 + (rng() - 0.5) * 0.4;
  const wallMat = mat(PALETTE.stone);
  const woodMat = mat(PALETTE.wood);
  const roofMat = mat(PALETTE.roof);

  if (ruined) {
    const halfW = w / 2;
    const back = box(w, h, 0.15, wallMat);
    back.position.set(0, h / 2, -d / 2 + 0.075);
    g.add(back);
    const left = box(0.15, h * 0.8, d, wallMat);
    left.position.set(-halfW + 0.075, (h * 0.8) / 2, 0);
    left.rotation.z = (rng() - 0.5) * 0.15;
    g.add(left);
    const beam1 = box(0.1, h * 1.1, 0.1, woodMat);
    beam1.position.set(halfW - 0.1, (h * 1.1) / 2, -d / 2 + 0.2);
    beam1.rotation.x = (rng() - 0.5) * 0.5;
    beam1.rotation.z = (rng() - 0.5) * 0.3;
    g.add(beam1);
    const beam2 = box(0.1, h * 0.7, 0.1, woodMat);
    beam2.position.set(halfW - 0.3, (h * 0.7) / 2, d / 2 - 0.3);
    beam2.rotation.x = (rng() - 0.5) * 0.7;
    g.add(beam2);
  } else {
    const walls = box(w, h, d, wallMat);
    walls.position.y = h / 2;
    g.add(walls);
    const roof = cone(Math.max(w, d) * 0.78, 1.1 + rng() * 0.2, 4, roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + (1.1 + rng() * 0.2) / 2;
    g.add(roof);
    const door = box(0.5, 1.1, 0.08, woodMat);
    door.position.set(0, 0.55, d / 2 + 0.02);
    g.add(door);
    const win = box(0.35, 0.35, 0.06, mat(PALETTE.flame, PALETTE.flame, 0.8));
    win.position.set(-w / 4, h * 0.65, d / 2 + 0.02);
    g.add(win);
  }
  return g;
}

export function makeDeadTree(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const deadMat = mat(PALETTE.deadwood);
  const height = 2.5 + rng();
  const trunk = cyl(0.08 + rng() * 0.05, 0.15 + rng() * 0.05, height, 5, deadMat);
  trunk.position.y = height / 2;
  trunk.rotation.z = (rng() - 0.5) * 0.2;
  g.add(trunk);
  const branches = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < branches; i++) {
    const bl = 0.6 + rng() * 0.6;
    const branch = cone(0.07, bl, 5, deadMat);
    const angle = rng() * Math.PI * 2;
    const tilt = 0.6 + rng() * 0.7;
    branch.position.set(
      Math.cos(angle) * 0.15,
      height * (0.5 + rng() * 0.4),
      Math.sin(angle) * 0.15
    );
    branch.rotation.z = Math.cos(angle) * tilt;
    branch.rotation.x = Math.sin(angle) * tilt;
    g.add(branch);
  }
  return g;
}

export function makePine(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const grassMat = mat(PALETTE.grass);
  const deadMat = mat(PALETTE.deadwood);
  const h = 2.5 + rng() * 2;
  const trunk = cyl(0.08, 0.13, h * 0.35, 5, deadMat);
  trunk.position.y = h * 0.175;
  g.add(trunk);
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const r = 0.9 - i * 0.22 + rng() * 0.1;
    const ch = h * (0.35 - i * 0.05);
    const c = cone(r, ch, 6, grassMat);
    c.position.y = h * (0.35 + i * 0.22) + ch / 2;
    g.add(c);
  }
  return g;
}

export function makeTorch(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const woodMat = mat(PALETTE.wood);
  const pole = cyl(0.06, 0.08, 1.6, 5, woodMat);
  pole.position.y = 0.8;
  pole.rotation.z = (rng() - 0.5) * 0.08;
  g.add(pole);
  const basket = cyl(0.16, 0.1, 0.22, 6, woodMat);
  basket.position.y = 1.65;
  g.add(basket);
  const flameMat = mat(PALETTE.flame, PALETTE.flame, 3);
  const flame = setup(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), flameMat));
  flame.position.y = 1.9;
  g.add(flame);
  g.userData.flame = flame;
  g.userData.lightPos = new THREE.Vector3(0, 1.9, 0);
  return g;
}

export function makeGrave(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = mat(PALETTE.stone);
  const isCross = rng() < 0.5;
  if (isCross) {
    const v = box(0.12, 0.9, 0.12, stoneMat);
    v.position.y = 0.45;
    g.add(v);
    const hb = box(0.5, 0.12, 0.1, stoneMat);
    hb.position.y = 0.65;
    g.add(hb);
  } else {
    const slab = box(0.55, 0.75, 0.1, stoneMat);
    slab.position.y = 0.375;
    g.add(slab);
  }
  g.rotation.z = (rng() - 0.5) * 0.3;
  g.rotation.y = rng() * Math.PI * 2;
  return g;
}

export function makeFence(rng: () => number, length = 4): THREE.Group {
  const g = new THREE.Group();
  const woodMat = mat(PALETTE.wood);
  const posts = Math.max(2, Math.floor(length / 0.7));
  const step = length / (posts - 1);
  const positions: number[] = [];
  for (let i = 0; i < posts; i++) {
    const missing = rng() < 0.15;
    const x = -length / 2 + i * step;
    positions.push(x);
    if (missing) continue;
    const p = cyl(0.05, 0.06, 1 + rng() * 0.2, 5, woodMat);
    const hh = 1 + rng() * 0.2;
    p.position.set(x, hh / 2, 0);
    p.rotation.z = (rng() - 0.5) * 0.3;
    g.add(p);
  }
  for (let r = 0; r < 2; r++) {
    const rail = box(length, 0.06, 0.06, woodMat);
    rail.position.set(0, 0.4 + r * 0.4, 0);
    rail.rotation.z = (rng() - 0.5) * 0.04;
    g.add(rail);
  }
  return g;
}

export function makeRock(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = mat(PALETTE.stone);
  const r = 0.3 + rng() * 0.5;
  const rock = setup(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), stoneMat));
  rock.scale.y = 0.5 + rng() * 0.3;
  rock.position.y = r * rock.scale.y * 0.6;
  rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
  g.add(rock);
  return g;
}

export function makeChurch(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = mat(PALETTE.stone);
  const roofMat = mat(PALETTE.roof);
  const woodMat = mat(PALETTE.wood);
  const naveW = 6;
  const naveH = 4;
  const naveD = 9;
  const nave = box(naveW, naveH, naveD, stoneMat);
  nave.position.y = naveH / 2;
  g.add(nave);
  const naveRoof = cone(naveW * 0.75, 2.5, 4, roofMat);
  naveRoof.rotation.y = Math.PI / 4;
  naveRoof.position.y = naveH + 1.25;
  naveRoof.scale.z = naveD / naveW;
  g.add(naveRoof);
  const towerH = 6 + rng() * 0.5;
  const tower = box(2.2, towerH, 2.2, stoneMat);
  tower.position.set(0, towerH / 2, -naveD / 2 - 1.1);
  g.add(tower);
  const spire = cone(1.6, 3.5, 4, roofMat);
  spire.rotation.y = Math.PI / 4;
  spire.position.set(0, towerH + 1.75, -naveD / 2 - 1.1);
  g.add(spire);
  const door = box(1.8, 2.8, 0.15, woodMat);
  door.position.set(0, 1.4, naveD / 2 + 0.02);
  g.add(door);
  const windowMat = mat(PALETTE.blood, PALETTE.blood, 0.6);
  const win = box(0.8, 1.4, 0.1, windowMat);
  win.position.set(0, naveH * 0.65, naveD / 2 + 0.02);
  g.add(win);
  const sideWin = box(0.1, 1.2, 0.7, windowMat);
  sideWin.position.set(naveW / 2 + 0.02, naveH * 0.55, 0);
  g.add(sideWin);
  const bell = cyl(0.2, 0.3, 0.4, 6, mat(0x2a2410));
  bell.position.set(0, towerH - 0.8, -naveD / 2 - 1.1);
  g.add(bell);
  return g;
}

export function makeWell(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = mat(PALETTE.stone);
  const woodMat = mat(PALETTE.wood);
  const roofMat = mat(PALETTE.roof);
  const r = 0.8 + rng() * 0.15;
  const wall = cyl(r, r, 0.9, 8, stoneMat);
  wall.position.y = 0.45;
  g.add(wall);
  const inner = cyl(r * 0.7, r * 0.7, 0.05, 8, mat(0x050505));
  inner.position.y = 0.85;
  g.add(inner);
  const p1 = cyl(0.06, 0.07, 1.6, 5, woodMat);
  p1.position.set(-r + 0.1, 0.8, 0);
  g.add(p1);
  const p2 = cyl(0.06, 0.07, 1.6, 5, woodMat);
  p2.position.set(r - 0.1, 0.8, 0);
  g.add(p2);
  const roof = cone(r + 0.2, 0.7, 4, roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.95;
  g.add(roof);
  return g;
}

export function makeBarrel(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const woodMat = mat(PALETTE.wood);
  const h = 0.9 + rng() * 0.1;
  const r = 0.35 + rng() * 0.05;
  const body = cyl(r * 0.9, r * 0.9, h, 8, woodMat);
  body.position.y = h / 2;
  g.add(body);
  const mid = cyl(r, r, h * 0.5, 8, woodMat);
  mid.position.y = h / 2;
  g.add(mid);
  const bandMat = mat(0x1a1a1a);
  for (let i = 0; i < 2; i++) {
    const band = cyl(r + 0.01, r + 0.01, 0.05, 8, bandMat);
    band.position.y = h * (0.25 + i * 0.5);
    g.add(band);
  }
  return g;
}

export function makeCart(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const woodMat = mat(PALETTE.wood);
  const body = box(2, 0.15, 1, woodMat);
  body.position.set(0, 0.7, 0);
  body.rotation.z = (rng() - 0.5) * 0.15;
  g.add(body);
  const back = box(2, 0.4, 0.1, woodMat);
  back.position.set(0, 0.9, -0.5);
  back.rotation.x = 0.15;
  g.add(back);
  const sideL = box(0.1, 0.4, 1, woodMat);
  sideL.position.set(-1, 0.9, 0);
  sideL.rotation.z = 0.15;
  g.add(sideL);
  const sideR = box(0.1, 0.4, 1, woodMat);
  sideR.position.set(1, 0.9, 0);
  sideR.rotation.z = -0.1;
  g.add(sideR);
  const wheelMat = mat(PALETTE.deadwood);
  const wR = 0.45;
  const w1 = cyl(wR, wR, 0.1, 8, wheelMat);
  w1.rotation.z = Math.PI / 2;
  w1.position.set(-1, wR - 0.35, 0.6);
  g.add(w1);
  const w2 = cyl(wR, wR, 0.1, 8, wheelMat);
  w2.rotation.z = Math.PI / 2;
  w2.position.set(1, wR - 0.38, 0.55);
  w2.rotation.x = 0.3;
  g.add(w2);
  const shaft = box(1.8, 0.08, 0.08, woodMat);
  shaft.position.set(0, 0.55, 1.3);
  shaft.rotation.x = -0.25;
  g.add(shaft);
  return g;
}
