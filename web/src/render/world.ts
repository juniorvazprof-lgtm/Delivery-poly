import * as THREE from 'three';
import { IS_MOBILE } from '../core/SceneManager';
import * as P from './props';
import type { PropDef } from '../data/village';

export type Rng = () => number;

/** Luz e névoa do estilo 1 (Vila Amaldiçoada): noite quase negra, lua fria, tochas quentes. */
export function setupNightAtmosphere(scene: THREE.Scene, fogNear = 14, fogFar = 34): THREE.DirectionalLight {
  scene.background = new THREE.Color(0x050405);
  scene.fog = new THREE.Fog(0x070506, fogNear, fogFar);
  scene.add(new THREE.HemisphereLight(0x4a5070, 0x1a0f08, 1.1));
  const moon = new THREE.DirectionalLight(0x8a9ad0, 1.1);
  moon.position.set(-12, 22, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.setScalar(IS_MOBILE ? 1024 : 2048);
  const c = moon.shadow.camera;
  c.left = -30; c.right = 30; c.top = 30; c.bottom = -30; c.far = 80;
  moon.shadow.bias = -0.0008;
  scene.add(moon, moon.target);
  return moon;
}

export class TorchLights {
  private items: { light: THREE.PointLight; flame?: THREE.Mesh; phase: number; base: number }[] = [];
  add(scene: THREE.Scene, torch: THREE.Group, intensity = 14, distance = 7): void {
    const pos = (torch.userData.lightPos as THREE.Vector3 | undefined)?.clone() ?? new THREE.Vector3(0, 1.9, 0);
    const light = new THREE.PointLight(0xff8a3a, intensity, distance, 1.6);
    light.position.copy(torch.localToWorld(pos));
    scene.add(light);
    this.items.push({ light, flame: torch.userData.flame as THREE.Mesh | undefined, phase: Math.random() * 10, base: intensity });
  }
  update(t: number): void {
    for (const it of this.items) {
      const f = 0.82 + 0.12 * Math.sin(t * 9 + it.phase) + 0.08 * Math.sin(t * 23 + it.phase * 2);
      it.light.intensity = it.base * f;
      if (it.flame) it.flame.scale.setScalar(0.9 + 0.2 * f);
    }
  }
}

/** Chão em placas irregulares low poly + estrada. */
export function buildGround(scene: THREE.Scene, size: number, rng: Rng, road: [number, number][] = []): void {
  const half = size / 2;
  const geo = new THREE.PlaneGeometry(size, size, size, size);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const c1 = new THREE.Color(P.PALETTE.ground), c2 = new THREE.Color(P.PALETTE.ground2), cr = new THREE.Color(P.PALETTE.path);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, (rng() - 0.5) * 0.18);
    if (Math.abs(x) < half - 0.5 && Math.abs(z) < half - 0.5) {
      pos.setX(i, x + (rng() - 0.5) * 0.35);
      pos.setZ(i, z + (rng() - 0.5) * 0.35);
    }
  }
  const g2 = geo.toNonIndexed();
  const p2 = g2.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p2.count; i += 3) {
    const cx = (p2.getX(i) + p2.getX(i + 1) + p2.getX(i + 2)) / 3;
    const cz = (p2.getZ(i) + p2.getZ(i + 1) + p2.getZ(i + 2)) / 3;
    const onRoad = distToPolyline(cx, cz, road) < 1.4 + rng() * 0.4;
    const col = (onRoad ? cr.clone() : (rng() < 0.55 ? c1 : c2).clone()).multiplyScalar(0.85 + rng() * 0.3);
    for (let k = 0; k < 3; k++) colors.push(col.r, col.g, col.b);
  }
  g2.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g2.computeVertexNormals();
  const mesh = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  scene.add(mesh);
}

export function distToPolyline(x: number, z: number, pts: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best;
}

export function makeBlood(rng: Rng): THREE.Object3D {
  const g = new THREE.CircleGeometry(0.6 + rng() * 0.5, 7);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: P.PALETTE.blood, roughness: 0.4, flatShading: true }));
  m.position.y = 0.11;
  m.receiveShadow = true;
  return m;
}

const BUILDERS: Record<PropDef['kind'], (r: Rng) => THREE.Object3D> = {
  house: (r) => P.makeHouse(r), ruin: (r) => P.makeHouse(r, true), deadtree: P.makeDeadTree, pine: P.makePine,
  torch: P.makeTorch, grave: P.makeGrave, fence: (r) => P.makeFence(r), rock: P.makeRock, church: P.makeChurch,
  well: P.makeWell, barrel: P.makeBarrel, cart: P.makeCart, blood: makeBlood,
};

export function placeProp(scene: THREE.Scene, d: PropDef, rng: Rng, torches?: TorchLights): THREE.Object3D {
  const o = BUILDERS[d.kind](rng);
  o.position.set(d.pos[0], 0, d.pos[1]);
  o.rotation.y = d.rot ?? rng() * Math.PI * 2;
  scene.add(o);
  o.updateMatrixWorld(true);
  if (d.kind === 'torch' && torches) torches.add(scene, o as THREE.Group);
  return o;
}
