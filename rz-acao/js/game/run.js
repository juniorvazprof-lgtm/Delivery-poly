// Incursão na Fenda: sequência de salas, ondas, escolha de portas, materiais e câmara final.
import * as T from '../lib/three.js';
import { CFG } from './config.js';
import { Arena } from './arena.js';
import { Enemy } from './enemies.js';
import { mat } from '../engine/voxel.js';
import { COL } from './fx.js';

const pick = a => a[Math.floor(Math.random() * a.length)];
const FINAL = { label: 'Câmara final', glyph: '☗', color: '#b77bff', materials: 6, final: true };

const dropGeo = new T.BoxGeometry(0.16, 0.16, 0.16);
class Drop {
  constructor(pos, g) {
    this.g = g; this.t = 0; this.alive = true;
    this.pos = pos.clone(); this.pos.y = 0.4;
    const a = Math.random() * Math.PI * 2;
    this.vel = new T.Vector3(Math.cos(a) * 2.2, 3.5, Math.sin(a) * 2.2);
    this.mesh = new T.Mesh(dropGeo, mat('glowA')); g.scene.add(this.mesh);
  }
  update(dt, magnet) {
    const k = this.g.kay;
    this.t += dt;
    if (this.t < CFG.drops.magnetDelay && !magnet) {
      this.vel.y -= 14 * dt; this.pos.addScaledVector(this.vel, dt);
      if (this.pos.y < 0.15) { this.pos.y = 0.15; this.vel.set(0, 0, 0); }
    } else {
      const to = new T.Vector3(k.pos.x - this.pos.x, 0.5 - this.pos.y, k.pos.z - this.pos.z), d = to.length();
      const sp = CFG.drops.magnetSpeed * Math.min(1, 0.3 + this.t);
      if (d < 0.35) return this.collect();
      this.pos.addScaledVector(to.normalize(), Math.min(d, sp * dt));
    }
    this.mesh.position.copy(this.pos); this.mesh.rotation.y += dt * 6;
  }
  collect() { this.alive = false; this.g.scene.remove(this.mesh); this.g.run.addMaterial(); }
  remove() { this.alive = false; this.g.scene.remove(this.mesh); }
}

export class Run {
  constructor(g, ui) { this.g = g; this.ui = ui; this.drops = []; this.lastLayout = -1; }

  start() {
    this.materials = 0; this.rescued = 0; this.cleared = 0; this.t0 = this.g.time;
    this.enter({ ...CFG.roomTypes.combate, key: 'combate' }, 0);
  }

  enter(info, depth) {
    const g = this.g;
    g.enemies.forEach(e => e.destroy()); g.enemies = [];
    g.projectiles.forEach(p => g.scene.remove(p.mesh)); g.projectiles = [];
    this.drops.forEach(d => this.collectOrRemove(d)); this.drops = [];
    g.fx.clear(); this.ui.clearDoors();
    g.arena?.dispose();

    const final = depth >= CFG.run.rooms;
    let li = Math.floor(Math.random() * CFG.rooms.length);
    if (li === this.lastLayout) li = (li + 1) % CFG.rooms.length;
    this.lastLayout = li;
    const layout = final ? CFG.finalRoom : CFG.rooms[li];
    this.layout = layout;
    g.arena = new Arena(g.scene, layout, depth + 1 + Math.floor(Math.random() * 50), g.settings.reduceFx);

    let waves = final ? CFG.finalEncounter : pick(CFG.encounters[Math.min(depth, CFG.encounters.length - 1)]);
    if (info.light) waves = waves.slice(0, 1);
    this.room = { info, depth, final, waves, wave: -1, waveT: CFG.waveDelay - 0.3, clear: false };

    const k = g.kay;
    k.pos.set(0, 0, layout.d / 2 - 1.2); k.face = Math.PI; k.state = 'free'; k.combo = -1; k.t = 0;
    this.ui.snapCamera(); this.ui.objective();
  }
  collectOrRemove(d) { if (d.alive) { d.remove(); this.addMaterial(); } }

  get total() { return CFG.run.rooms + 1; }
  status() {
    const r = this.room, n = this.g.enemies.filter(e => e.state !== 'dying').length;
    const where = `Sala ${r.depth + 1}/${this.total} · ${r.info.label}`;
    if (r.clear) return r.final ? `${where} · concluída` : `${where} · escolha uma porta`;
    return `${where} · ${n} ${n === 1 ? 'inimigo' : 'inimigos'}`;
  }

  startWave(i) {
    const r = this.room, g = this.g, taken = [];
    r.wave = i; r.waveT = 0;
    for (const kind of r.waves[i]) {
      const p = g.arena.spawnPoint(g.kay.pos, taken); taken.push(p);
      g.enemies.push(new Enemy(kind, p, g));
    }
    this.ui.objective();
  }

  update(dt) {
    const r = this.room, g = this.g;
    if (!r.clear && g.enemies.length === 0) {
      r.waveT += dt;
      if (r.waveT >= CFG.waveDelay) {
        if (r.wave + 1 < r.waves.length) this.startWave(r.wave + 1);
        else this.clearRoom();
      }
    }
    for (const d of this.drops) d.update(dt, r.clear);
    this.drops = this.drops.filter(d => d.alive);
    if (r.clear && !r.final && g.mode === 'play') {
      const k = g.kay;
      for (const door of g.arena.doors) {
        door.veil.material.opacity = 0.45 + Math.sin(g.time * 3) * 0.12;
        if (door.inside(k.pos)) { this.ui.transition(() => this.enter(door.info, r.depth + 1)); break; }
      }
    }
  }

  dropAt(pos, n) { for (let i = 0; i < n; i++) this.drops.push(new Drop(pos, this.g)); }
  onEnemyKilled(e) { const [a, b] = CFG.drops.perEnemy; this.dropAt(e.pos, a + Math.floor(Math.random() * (b - a + 1))); }
  addMaterial() { this.materials++; this.ui.materials(this.materials); }

  clearRoom() {
    const r = this.room, g = this.g;
    r.clear = true; this.cleared++;
    this.dropAt(g.kay.pos.clone().setZ(g.kay.pos.z - 0.6), r.info.materials);
    if (r.info.rescue) { this.rescued++; this.ui.toast('Ressona debilitada encontrada · resgate completo na etapa 3', COL.friend); }
    if (r.final) { this.ui.finish(); return; }
    const next = r.depth + 1;
    const sides = [...this.layout.exits].sort(() => Math.random() - 0.5);
    if (next >= CFG.run.rooms) {
      this.ui.addDoor(g.arena.addDoor(sides[0] || 'top', FINAL));
    } else {
      const keys = Object.keys(CFG.roomTypes).sort(() => Math.random() - 0.5).slice(0, Math.min(CFG.run.doorChoices, sides.length));
      keys.forEach((key, i) => this.ui.addDoor(g.arena.addDoor(sides[i], { ...CFG.roomTypes[key], key })));
    }
    this.ui.toast('Sala limpa · as portas abriram', COL.loot);
    this.ui.objective();
  }

  summary() {
    return { time: this.g.time - this.t0, materials: this.materials, rescued: this.rescued, rooms: this.cleared, depth: this.room.depth + 1 };
  }
}
