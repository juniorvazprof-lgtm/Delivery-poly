import * as THREE from 'three';
import type { GameScene } from '../core/SceneManager';
import { spawnModel } from '../core/Assets';
import { makeRng } from '../domain/battle/Battle';
import { ENEMIES } from '../data/content';
import { VILLAGE, type EncounterDef } from '../data/village';
import type { GameState } from '../game/GameState';
import { buildGround, placeProp, setupNightAtmosphere, TorchLights } from '../render/world';
import * as P from '../render/props';

interface Pack { def: EncounterDef; root: THREE.Group; alerted: boolean; home: THREE.Vector3; phase: number }
interface Obstacle { x: number; z: number; r: number }

export interface ExploreCallbacks {
  onEncounter(e: EncounterDef, ambush: boolean): void;
  onMessage(text: string): void;
  onRest(): void;
}

const LEADER_SPEED = 4.2;
const ENEMY_SPEED = 3.0;
const ALERT_RADIUS = 5;
const CONTACT_RADIUS = 1.4;

/** Exploração em tempo real, estilo ARPG isométrico: clique para mover o grupo. */
export class ExploreScene implements GameScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  private heroes: THREE.Group[] = [];
  private trail: THREE.Vector3[] = []; // rastro do líder para os seguidores
  private target: THREE.Vector3 | null = null;
  private targetPack: Pack | null = null;
  private packs: Pack[] = [];
  private obstacles: Obstacle[] = [];
  private torches = new TorchLights();
  private partyLight = new THREE.PointLight(0xffb070, 70, 13, 1.3);
  private marker: THREE.Mesh;
  private ray = new THREE.Raycaster();
  private ground!: THREE.Object3D;
  private well = new THREE.Vector3();
  private paused = false;
  private zoom = 7;
  private moon: THREE.DirectionalLight;

  constructor(private state: GameState, private dom: HTMLElement, private cb: ExploreCallbacks) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.moon = setupNightAtmosphere(this.scene, 18, 40);
    const rng = makeRng(42);
    buildGround(this.scene, VILLAGE.size, rng, VILLAGE.road);
    this.ground = this.scene.getObjectByName('ground')!;
    for (const p of VILLAGE.props) {
      placeProp(this.scene, p, rng, this.torches);
      if (p.radius) this.obstacles.push({ x: p.pos[0], z: p.pos[1], r: p.radius });
      if (p.kind === 'well') this.well.set(p.pos[0], 0, p.pos[1]);
    }
    this.scatterNature(rng);
    this.scene.add(this.partyLight);

    for (const u of state.party) {
      const m = spawnModel(u.def.model);
      this.heroes.push(m);
      this.scene.add(m);
    }
    const [sx, sz] = VILLAGE.start;
    this.heroes.forEach((h, i) => h.position.set(sx - i * 0.8, 0, sz + i * 0.8));
    // rastro inicial já espaçado ao longo da formação de chegada
    for (let i = 0; i < 60; i++) this.trail.push(new THREE.Vector3(sx - i * 0.12, 0, sz + i * 0.12));
    this.heroes.forEach((h, i) => h.position.copy(this.trail[i * 7]));

    for (const e of VILLAGE.encounters) this.spawnPack(e);

    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 6).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0 }));
    this.marker.position.y = 0.15;
    this.scene.add(this.marker);

    this.dom.addEventListener('pointerdown', this.onDown);
    this.dom.addEventListener('pointermove', this.onMove);
    for (const t of ['pointerup', 'pointercancel', 'pointerleave'] as const) this.dom.addEventListener(t, this.onUp);
    this.dom.addEventListener('wheel', this.onWheel, { passive: true });
  }

  private scatterNature(rng: () => number): void {
    const half = VILLAGE.size / 2 - 1;
    for (let i = 0; i < 70; i++) {
      // borda densa de árvores mortas e pinheiros, miolo esparso
      const edge = i < 50;
      let x = (rng() * 2 - 1) * half, z = (rng() * 2 - 1) * half;
      if (edge) { if (rng() < 0.5) x = Math.sign(x || 1) * (half - rng() * 4); else z = Math.sign(z || 1) * (half - rng() * 4); }
      if (this.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.5)) continue;
      if (VILLAGE.encounters.some((e) => Math.hypot(e.pos[0] - x, e.pos[1] - z) < 3)) continue;
      if (Math.hypot(x - VILLAGE.start[0], z - VILLAGE.start[1]) < 3) continue;
      const kind = rng() < 0.7 ? 'deadtree' : rng() < 0.6 ? 'pine' : 'rock';
      placeProp(this.scene, { kind, pos: [x, z] }, rng);
      this.obstacles.push({ x, z, r: kind === 'rock' ? 0.5 : 0.35 });
    }
  }

  private spawnPack(e: EncounterDef): void {
    const root = new THREE.Group();
    e.enemies.forEach((id, i) => {
      const def = ENEMIES[id];
      const m = spawnModel(def.model);
      m.scale.setScalar(def.scale ?? 1);
      if (def.possessed) tintPossessed(m);
      const a = (i / e.enemies.length) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.7 * (e.enemies.length > 1 ? 1 : 0), id === 'ghost' ? 0.3 : 0, Math.sin(a) * 0.7 * (e.enemies.length > 1 ? 1 : 0));
      m.userData.ghost = id === 'ghost';
      root.add(m);
    });
    // brilho maligno sob o grupo (ajuda a achar inimigos no escuro)
    const glow = new THREE.PointLight(e.boss ? 0xff2020 : 0x9a3cff, e.boss ? 25 : 8, 4.5, 1.5);
    glow.position.y = 1.2;
    root.add(glow);
    root.position.set(e.pos[0], 0, e.pos[1]);
    root.visible = !this.state.cleared.has(e.id);
    this.scene.add(root);
    this.packs.push({ def: e, root, alerted: false, home: root.position.clone(), phase: Math.random() * 6 });
  }

  // ---------- entrada (mouse e toque) ----------
  // 1 dedo/botão: toque para andar, segure e arraste para ir guiando; 2 dedos: pinça para zoom.
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;

  private onDown = (ev: PointerEvent): void => {
    this.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (this.pointers.size === 2) { this.pinchDist = this.pinchSpan(); this.target = null; return; }
    if (this.pointers.size === 1) this.onPointer(ev, true);
  };
  private onMove = (ev: PointerEvent): void => {
    if (!this.pointers.has(ev.pointerId)) return;
    this.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (this.pointers.size === 2) {
      const d = this.pinchSpan();
      if (this.pinchDist > 0) this.setZoom(this.zoom * (this.pinchDist / d));
      this.pinchDist = d;
    } else if (this.pointers.size === 1 && !this.targetPack) this.onPointer(ev, false);
  };
  private onUp = (ev: PointerEvent): void => { this.pointers.delete(ev.pointerId); if (this.pointers.size < 2) this.pinchDist = 0; };
  private pinchSpan(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  get zoomLevel(): number { return this.zoom; }
  setZoom(z: number): void {
    this.zoom = THREE.MathUtils.clamp(z, 5, 16);
    this.resize(window.innerWidth, window.innerHeight);
  }

  private onPointer(ev: PointerEvent, fresh: boolean): void {
    if (this.paused || ev.button > 0) return;
    const r = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    // clicou num inimigo? persegue e ataca primeiro se ainda não foi visto
    const live = this.packs.filter((p) => p.root.visible);
    const hitPack = fresh ? this.ray.intersectObjects(live.map((p) => p.root), true)[0] : undefined;
    if (hitPack) {
      const pack = live.find((p) => isDescendant(hitPack.object, p.root))!;
      this.targetPack = pack;
      this.target = pack.root.position.clone();
      return;
    }
    if (fresh && this.heroes[0].position.distanceTo(this.well) < 3 && this.ray.ray.distanceToPoint(this.well) < 1.6) {
      this.cb.onRest();
      return;
    }
    const hit = this.ray.intersectObject(this.ground)[0];
    if (hit) {
      this.targetPack = null;
      this.target = hit.point.clone().setY(0);
      this.marker.position.set(this.target.x, 0.15, this.target.z);
      (this.marker.material as THREE.MeshBasicMaterial).opacity = 1;
    }
  }

  private onWheel = (ev: WheelEvent): void => {
    this.setZoom(this.zoom + Math.sign(ev.deltaY) * 0.8);
  };

  // ---------- ciclo ----------
  enter(): void { this.paused = false; this.target = null; this.targetPack = null; this.syncPacks(); }
  exit(): void { this.paused = true; }

  syncPacks(): void {
    for (const p of this.packs) {
      p.root.visible = !this.state.cleared.has(p.def.id);
      p.alerted = false;
      p.root.position.copy(p.home);
    }
  }

  /** Recua o grupo alguns passos (após fugir/derrota) para não reentrar no combate. */
  pushBack(from: THREE.Vector3): void {
    const lead = this.heroes[0].position;
    const away = lead.clone().sub(from).setY(0).normalize().multiplyScalar(4);
    lead.add(away);
  }

  update(dt: number, t: number): void {
    this.torches.update(t);
    const lead = this.heroes[0];
    if (!this.paused) {
      if (this.targetPack) this.target = this.targetPack.root.position.clone();
      if (this.target) {
        const d = this.target.clone().sub(lead.position).setY(0);
        const dist = d.length();
        if (dist < 0.15) this.target = null;
        else {
          d.normalize();
          const step = Math.min(dist, LEADER_SPEED * dt);
          lead.position.addScaledVector(d, step);
          this.collide(lead.position, 0.35);
          faceTowards(lead, d, dt);
        }
      }
      // rastro: seguidores pisam onde o líder pisou
      if (lead.position.distanceTo(this.trail[0]) > 0.12) {
        this.trail.unshift(lead.position.clone());
        this.trail.length = 60;
      }
      for (let i = 1; i < this.heroes.length; i++) {
        const h = this.heroes[i];
        const goal = this.trail[Math.min(this.trail.length - 1, i * 7)];
        const d = goal.clone().sub(h.position).setY(0);
        if (d.length() > 0.05) {
          h.position.addScaledVector(d, Math.min(1, dt * 6));
          faceTowards(h, d.normalize(), dt);
        }
      }
      this.updatePacks(dt, t);
    }
    // passos: leve balanço ao andar
    this.heroes.forEach((h, i) => { h.children[0].position.y = this.target ? Math.abs(Math.sin(t * 10 + i)) * 0.06 : 0; });
    const mm = this.marker.material as THREE.MeshBasicMaterial;
    mm.opacity = Math.max(0, mm.opacity - dt * 1.5);

    this.partyLight.position.set(lead.position.x, 3, lead.position.z);
    this.partyLight.intensity = 70 + Math.sin(t * 3) * 3;
    // câmera isométrica clássica (45° / ~35°) seguindo o líder
    const off = new THREE.Vector3(14, 14, 14);
    this.camera.position.copy(lead.position).add(off);
    this.camera.lookAt(lead.position);
    this.moon.position.set(lead.position.x - 12, 22, lead.position.z + 8);
    this.moon.target.position.copy(lead.position);
  }

  private updatePacks(dt: number, t: number): void {
    const lead = this.heroes[0].position;
    for (const p of this.packs) {
      if (!p.root.visible) continue;
      p.root.children.forEach((m, i) => {
        if (m.userData.ghost) m.position.y = 0.3 + Math.sin(t * 2 + i) * 0.15;
      });
      const dist = p.root.position.distanceTo(lead);
      if (!p.alerted && dist < ALERT_RADIUS && this.targetPack !== p) {
        p.alerted = true;
        if (p.def.intro) this.cb.onMessage(p.def.intro);
      }
      if (p.alerted) {
        const d = lead.clone().sub(p.root.position).setY(0).normalize();
        p.root.position.addScaledVector(d, ENEMY_SPEED * dt);
        p.root.children.forEach((m) => faceTowards(m, d, dt));
      } else {
        p.root.rotation.y = Math.sin(t * 0.4 + p.phase) * 0.6;
      }
      if (dist < CONTACT_RADIUS) {
        const ambush = this.targetPack === p && !p.alerted;
        if (ambush && p.def.intro) this.cb.onMessage(p.def.intro);
        this.paused = true;
        this.target = null;
        this.cb.onEncounter(p.def, ambush);
        return;
      }
    }
  }

  packPosition(id: string): THREE.Vector3 {
    return this.packs.find((p) => p.def.id === id)!.root.position.clone();
  }

  private collide(pos: THREE.Vector3, r: number): void {
    for (const o of this.obstacles) {
      const dx = pos.x - o.x, dz = pos.z - o.z;
      const d = Math.hypot(dx, dz), min = o.r + r;
      if (d < min && d > 1e-4) { pos.x = o.x + (dx / d) * min; pos.z = o.z + (dz / d) * min; }
    }
    const h = VILLAGE.size / 2 - 1.5;
    pos.x = THREE.MathUtils.clamp(pos.x, -h, h);
    pos.z = THREE.MathUtils.clamp(pos.z, -h, h);
  }

  resize(w: number, h: number): void {
    // em pé (celular) a tela é estreita: garante ~6m de mundo para cada lado do herói
    const a = w / h, z = Math.max(this.zoom, 6 / a);
    Object.assign(this.camera, { left: -z * a, right: z * a, top: z, bottom: -z });
    this.camera.updateProjectionMatrix();
  }
}

export function faceTowards(o: THREE.Object3D, dir: THREE.Vector3, dt: number): void {
  const want = Math.atan2(dir.x, dir.z);
  let diff = want - o.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  o.rotation.y += diff * Math.min(1, dt * 10);
}

function isDescendant(o: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let c: THREE.Object3D | null = o; c; c = c.parent) if (c === root) return true;
  return false;
}

/** Aldeão possuído: reaproveita o corpo humano com roupas sujas e olhos roxos brilhando. */
export function tintPossessed(m: THREE.Object3D): void {
  m.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (/sword|shield|shoulder/i.test(mesh.name)) { mesh.visible = false; return; }
    mat.color.lerp(new THREE.Color(0x3a3040), 0.6);
    if (/head/i.test(mesh.name)) { mat.color.set(0x8a7a90); mat.emissive.set(0x6a1aff); mat.emissiveIntensity = 0.35; }
  });
}

export { P as Props };
