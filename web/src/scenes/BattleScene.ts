import * as THREE from 'three';
import type { GameScene } from '../core/SceneManager';
import { spawnModel } from '../core/Assets';
import { Battle, createUnit, makeRng } from '../domain/battle/Battle';
import type { BattleEvent, Skill, Unit } from '../domain/types';
import { ENEMIES, SKILLS } from '../data/content';
import type { EncounterDef } from '../data/village';
import type { GameState } from '../game/GameState';
import { buildGround, placeProp, setupNightAtmosphere, TorchLights } from '../render/world';
import { tintPossessed } from './ExploreScene';
import type { BattleUI } from '../ui/BattleUI';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface View { unit: Unit; obj: THREE.Group; home: THREE.Vector3; ring: THREE.Mesh; mats: THREE.MeshStandardMaterial[] }

export type BattleResult = { outcome: 'victory' | 'defeat'; freed: number };

/** Combate por turnos: arena, câmera em 3/4 atrás do grupo, escolha de ação e alvo. */
export class BattleScene implements GameScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private battle!: Battle;
  private views = new Map<string, View>();
  private torches = new TorchLights();
  private ray = new THREE.Raycaster();
  private camBase = new THREE.Vector3(-5.0, 4.6, 8.6);
  private camLook = new THREE.Vector3(-1.5, 1.0, 0.2);
  private shake = 0;
  private hovered: string | null = null;
  private pick: ((uid: string | null) => void) | null = null;
  private pickable: Set<string> = new Set();
  private time = 0;

  constructor(private state: GameState, private dom: HTMLElement, private ui: BattleUI) {
    setupNightAtmosphere(this.scene, 12, 30);
    const rng = makeRng(7);
    buildGround(this.scene, 30, rng, []);
    // anel de cenário ao redor da arena
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rng() * 0.2;
      const r = 8 + rng() * 4;
      placeProp(this.scene, { kind: rng() < 0.75 ? 'deadtree' : 'rock', pos: [Math.cos(a) * r, Math.sin(a) * r] }, rng);
    }
    for (const [x, z] of [[-4.5, -3.5], [5.5, 1.5], [3.5, -4.5], [-6, 2]] as const) {
      placeProp(this.scene, { kind: 'torch', pos: [x, z] }, rng, this.torches);
    }
    for (let i = 0; i < 5; i++) placeProp(this.scene, { kind: i < 2 ? 'blood' : 'grave', pos: [4 + rng() * 4, -6 + rng() * 3] }, rng);
    const fill = new THREE.PointLight(0xffc890, 30, 14, 1.5);
    fill.position.set(-3, 5, 3);
    this.scene.add(fill);
    const rim = new THREE.PointLight(0x9a3cff, 25, 12, 1.5);
    rim.position.set(4, 3, -4);
    this.scene.add(rim);
    this.dom.addEventListener('pointermove', this.onMove);
    this.dom.addEventListener('pointerdown', this.onDown);
  }

  // ---------- montagem ----------
  start(enc: EncounterDef, ambush: boolean): Promise<BattleResult> {
    for (const v of this.views.values()) this.scene.remove(v.obj, v.ring);
    this.views.clear();
    const enemies = enc.enemies.map((id, i) => createUnit(ENEMIES[id], 'enemy', `${id}#${i}`));
    this.battle = new Battle(this.state.party, enemies, makeRng(Date.now() & 0xffff), { heroesFirst: ambush });
    // formação: heróis em diagonal à esquerda, inimigos à direita, se encarando
    const heroSpots = [[-1.4, 0.2], [-2.3, 1.6], [-3.0, -0.9], [-3.9, 0.7]];
    const tankFirst = ['tank', 'warrior', 'archer', 'mage'];
    tankFirst.forEach((id, i) => {
      const u = this.state.party.find((p) => p.uid === id)!;
      this.addView(u, heroSpots[i][0], heroSpots[i][1]);
    });
    const n = enemies.length;
    enemies.forEach((u, i) => {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      this.addView(u, 2.2 + Math.abs(t) * 0.8, 0.2 + t * 2.6);
    });
    for (const v of this.views.values()) {
      const other = v.unit.side === 'hero' ? new THREE.Vector3(2.5, 0, 0.2) : new THREE.Vector3(-2.5, 0, 0.4);
      v.obj.rotation.y = Math.atan2(other.x - v.home.x, other.z - v.home.z);
      if (v.unit.downed) this.setDowned(v, true, true);
    }
    this.ui.show(this.battle, this.views.keys());
    if (ambush) this.ui.banner('Emboscada! Vocês atacam primeiro.');
    else if (enc.boss) this.ui.banner(ENEMIES[enc.enemies[0]].name);
    return this.loop();
  }

  private addView(u: Unit, x: number, z: number): void {
    const obj = spawnModel(u.def.model);
    obj.scale.setScalar(u.def.scale ?? 1);
    if (u.def.possessed) tintPossessed(obj);
    const home = new THREE.Vector3(x, u.def.model === 'ghost' ? 0.3 : 0, z);
    obj.position.copy(home);
    const mats: THREE.MeshStandardMaterial[] = [];
    obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) mats.push(m.material as THREE.MeshStandardMaterial); });
    for (const m of mats) m.userData.baseEmissive = m.emissive.clone();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0 }));
    ring.position.set(x, 0.14, z);
    this.scene.add(obj, ring);
    this.views.set(u.uid, { unit: u, obj, home, ring, mats });
  }

  // ---------- fluxo de turnos ----------
  private async loop(): Promise<BattleResult> {
    let freed = 0;
    await wait(700);
    while (this.battle.outcome() === 'ongoing') {
      const begin = this.battle.beginTurn();
      this.ui.refresh();
      await this.play(begin.events);
      if (begin.skipped) continue;
      const u = this.battle.current();
      this.focusTurn(u);
      let events: BattleEvent[];
      if (u.side === 'enemy') {
        await wait(550);
        events = this.battle.enemyTurn();
      } else {
        events = await this.playerTurn(u);
      }
      freed += events.filter((e) => e.type === 'freed').length;
      await this.play(events);
      this.ui.refresh();
    }
    for (const v of this.views.values()) (v.ring.material as THREE.MeshBasicMaterial).opacity = 0;
    const outcome = this.battle.outcome() as 'victory' | 'defeat';
    await this.ui.endScreen(outcome, freed);
    return { outcome, freed };
  }

  private async playerTurn(u: Unit): Promise<BattleEvent[]> {
    for (;;) {
      const skill = await this.ui.chooseSkill(u, this.battle.getSkills(u).map((s) => ({ skill: s, usable: this.battle.canUse(u, s) })));
      const targets = this.battle.validTargets(u, skill);
      const multi = skill.target === 'all_enemies' || skill.target === 'all_allies' || skill.target === 'self';
      this.ui.targetHint(skill, multi);
      const uid = await this.pickTarget(targets.map((t) => t.uid), multi);
      this.ui.targetHint(null, false);
      if (uid === null) continue; // voltar ao menu
      return this.battle.act(skill.id, multi ? undefined : uid);
    }
  }

  /** Espera o jogador clicar num alvo válido (ou em qualquer um deles, se a skill for em área). */
  private pickTarget(uids: string[], multi: boolean): Promise<string | null> {
    this.pickable = new Set(uids);
    this.highlight(multi ? uids : []);
    return new Promise((res) => {
      this.pick = (uid) => { this.pick = null; this.pickable.clear(); this.highlight([]); res(uid); };
      this.ui.onCancel = () => this.pick?.(null);
      this.ui.onConfirmAll = multi ? () => this.pick?.(uids[0]) : null;
    });
  }

  private highlight(uids: string[]): void {
    for (const [id, v] of this.views) {
      const on = uids.includes(id) || id === this.hovered && this.pickable.has(id);
      v.mats.forEach((m) => m.emissive.copy(on ? new THREE.Color(0x553311) : (m.userData.baseEmissive as THREE.Color)));
    }
  }

  private focusTurn(u: Unit): void {
    for (const [id, v] of this.views) {
      const m = v.ring.material as THREE.MeshBasicMaterial;
      m.opacity = id === u.uid ? 0.9 : 0;
      m.color.set(u.side === 'hero' ? 0xd9a441 : 0xb3261e);
    }
    this.ui.setActive(u.uid);
  }

  // ---------- animação dos eventos ----------
  private async play(events: BattleEvent[]): Promise<void> {
    for (const e of events) {
      switch (e.type) {
        case 'action': {
          const skill = SKILLS[e.skill];
          this.ui.log(`${this.name(e.unit)}: ${skill.name}`);
          await this.animateAction(e.unit, skill, e.targets);
          break;
        }
        case 'damage': {
          const v = this.views.get(e.target)!;
          this.flash(v, 0xff2200);
          this.shake = e.crit ? 0.25 : 0.1;
          const tag = e.crit ? ' CRÍTICO' : e.affinity === 'weak' ? ' FRACO!' : e.affinity === 'resist' ? ' resiste' : '';
          this.ui.floatText(this.screenPos(v), `${e.amount}${tag}`, e.crit ? 'crit' : 'dmg');
          if (e.redirectedFrom) this.ui.floatText(this.screenPos(v, 2.6), 'Protegeu!', 'info');
          this.knock(v);
          this.ui.refresh();
          await wait(e.crit ? 380 : 260);
          break;
        }
        case 'heal': {
          const v = this.views.get(e.target)!;
          this.flash(v, 0x33ff66);
          this.ui.floatText(this.screenPos(v), `+${e.amount}`, 'heal');
          this.ui.refresh();
          await wait(300);
          break;
        }
        case 'status_tick': {
          const v = this.views.get(e.target)!;
          this.flash(v, e.status === 'burn' ? 0xff7700 : 0x990000);
          this.ui.floatText(this.screenPos(v), `${e.amount} ${e.status === 'burn' ? 'queimadura' : 'sangramento'}`, 'dmg');
          this.ui.refresh();
          await wait(400);
          break;
        }
        case 'status': {
          const v = this.views.get(e.target);
          if (v) this.ui.floatText(this.screenPos(v, 2.4), STATUS_LABEL[e.status], 'info');
          await wait(140);
          break;
        }
        case 'downed': {
          const v = this.views.get(e.unit)!;
          this.ui.log(`${v.unit.def.name} caiu!`);
          await this.setDowned(v, true);
          break;
        }
        case 'revived': {
          const v = this.views.get(e.unit)!;
          this.flash(v, 0xffffaa);
          await this.setDowned(v, false);
          this.ui.floatText(this.screenPos(v), 'De pé!', 'heal');
          break;
        }
        case 'freed': {
          const v = this.views.get(e.unit)!;
          this.ui.log(`${v.unit.def.name} foi libertado do mal!`);
          this.ui.floatText(this.screenPos(v, 2.4), 'Libertado!', 'heal');
          await this.fadeOut(v, 0xfff2c0);
          break;
        }
        default: break;
      }
    }
  }

  private name(uid: string): string { return this.views.get(uid)!.unit.def.name; }

  private async animateAction(uid: string, skill: Skill, targets: string[]): Promise<void> {
    const v = this.views.get(uid)!;
    const tv = targets.map((t) => this.views.get(t)!).filter(Boolean);
    const center = tv.reduce((acc, t) => acc.add(t.home), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, tv.length));
    const ranged = skill.kind !== 'physical' || v.unit.def.id === 'archer' || v.unit.def.model === 'ghost';
    const support = ['heal', 'revive', 'buff'].includes(skill.kind);
    if (support) {
      await this.tween(300, (k) => { v.obj.position.y = v.home.y + Math.sin(k * Math.PI) * 0.35; });
      return;
    }
    if (!ranged && tv.length) {
      // investida até o alvo e volta
      const to = v.home.clone().lerp(center, 0.72);
      await this.tween(220, (k) => v.obj.position.lerpVectors(v.home, to, easeOut(k)));
      void this.tween(320, (k) => v.obj.position.lerpVectors(to, v.home, k)).then(() => v.obj.position.copy(v.home));
      return;
    }
    // projétil (flecha, magia, fogo)
    const color = skill.kind === 'holy' ? 0xfff2a0 : skill.kind === 'magic' ? (v.unit.side === 'hero' ? 0xff7a26 : 0x9a3cff) : 0xd8d0c0;
    await this.tween(160, (k) => { v.obj.position.y = v.home.y + Math.sin(k * Math.PI) * 0.2; });
    await Promise.all(tv.map((t) => this.projectile(v.home.clone().setY(1.4), t.home.clone().setY(1.2), color, skill.kind === 'physical' ? 0.06 : 0.18)));
  }

  private projectile(from: THREE.Vector3, to: THREE.Vector3, color: number, size: number): Promise<void> {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), new THREE.MeshBasicMaterial({ color }));
    const light = new THREE.PointLight(color, size > 0.1 ? 12 : 0, 4, 1.5);
    m.add(light);
    this.scene.add(m);
    return this.tween(300, (k) => {
      m.position.lerpVectors(from, to, k);
      m.position.y += Math.sin(k * Math.PI) * 0.8;
    }).then(() => { this.scene.remove(m); m.geometry.dispose(); });
  }

  private flash(v: View, color: number): void {
    v.mats.forEach((m) => { m.emissive.set(color); });
    setTimeout(() => v.mats.forEach((m) => m.emissive.copy(m.userData.baseEmissive as THREE.Color)), 140);
  }

  private knock(v: View): void {
    const dir = v.unit.side === 'enemy' ? new THREE.Vector3(0.25, 0, -0.08) : new THREE.Vector3(-0.25, 0, 0.08);
    void this.tween(220, (k) => v.obj.position.copy(v.home).addScaledVector(dir, Math.sin(k * Math.PI)));
  }

  private async setDowned(v: View, down: boolean, instant = false): Promise<void> {
    const from = v.obj.rotation.x, to = down ? -Math.PI / 2.2 : 0;
    if (instant) { v.obj.rotation.x = to; return; }
    await this.tween(400, (k) => { v.obj.rotation.x = from + (to - from) * easeOut(k); });
    v.obj.position.y = down ? 0.15 : v.home.y;
  }

  private async fadeOut(v: View, color: number): Promise<void> {
    v.mats.forEach((m) => { m.transparent = true; m.emissive.set(color); });
    await this.tween(700, (k) => {
      v.mats.forEach((m) => { m.opacity = 1 - k; });
      v.obj.position.y = v.home.y + k * 1.2;
    });
    v.obj.visible = false;
  }

  private tween(ms: number, fn: (k: number) => void): Promise<void> {
    return new Promise((res) => {
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        fn(k);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
  }

  screenPos(v: View, h = 2.1): { x: number; y: number } {
    const p = v.obj.position.clone().setY(h * (v.unit.def.scale ?? 1)).project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight };
  }

  // ---------- entrada ----------
  private pickAt(ev: PointerEvent): string | null {
    const r = this.dom.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), this.camera);
    let best: string | null = null, bestD = Infinity;
    for (const [id, v] of this.views) {
      if (!this.pickable.has(id)) continue;
      // cilindro de clique generoso em volta de cada unidade
      const c = v.home.clone().setY(1);
      const d = this.ray.ray.distanceToPoint(c);
      if (d < 0.9 * (v.unit.def.scale ?? 1) && d < bestD) { best = id; bestD = d; }
    }
    return best;
  }
  private onMove = (ev: PointerEvent): void => {
    if (!this.pick) return;
    const id = this.pickAt(ev);
    if (id !== this.hovered) { this.hovered = id; if (this.pickable.size) this.highlight([]); this.ui.hoverTarget(id ? this.views.get(id)!.unit : null); }
  };
  private onDown = (ev: PointerEvent): void => {
    if (!this.pick || ev.button !== 0) return;
    const id = this.pickAt(ev);
    if (id) this.pick(id);
  };

  enter(): void { this.time = 0; }
  exit(): void { this.ui.hide(); }

  update(dt: number, t: number): void {
    this.time += dt;
    this.torches.update(t);
    // respiração ociosa + fantasmas flutuando
    for (const v of this.views.values()) {
      if (v.unit.downed || v.unit.freed) continue;
      const s = (v.unit.def.scale ?? 1);
      v.obj.scale.y = s * (1 + Math.sin(t * 2 + v.home.x) * 0.015);
      if (v.unit.def.model === 'ghost') v.obj.children[0].position.y = Math.sin(t * 2 + v.home.z) * 0.15;
    }
    // câmera: leve deriva cinematográfica + tremor
    const drift = new THREE.Vector3(Math.sin(this.time * 0.25) * 0.4, 0, Math.cos(this.time * 0.2) * 0.3);
    this.camera.position.copy(this.camBase).add(drift);
    if (this.shake > 0) {
      this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0));
      this.shake = Math.max(0, this.shake - dt * 1.2);
    }
    this.camera.lookAt(this.camLook);
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 60 : 38; // retrato (celular): abre o campo de visão
    this.camera.updateProjectionMatrix();
  }
}

const STATUS_LABEL: Record<string, string> = {
  bleed: 'Sangrando', burn: 'Queimando', guarded: 'Protegido', taunt: 'Provocando', weaken: 'Enfraquecido', fortify: 'Muralha',
};
const easeOut = (k: number) => 1 - (1 - k) * (1 - k);
