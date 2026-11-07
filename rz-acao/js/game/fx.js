// Avisos no chão, rastro de golpe, faíscas e anéis. Ameaça = magenta com borda definida e preenchimento que cresce.
import * as T from '../lib/three.js';

export const COL = { threat: '#ff3d8b', threatEdge: '#ff7ad9', friend: '#5ff2ff', loot: '#ffc96b', rift: '#b77bff', guard: '#ffe066' };
const basic = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: T.DoubleSide });

// setor no plano XY centrado em -Y; girado para o chão, aponta para +z local
function sectorGeo(r, arcDeg) {
  const a = T.MathUtils.degToRad(arcDeg), sh = new T.Shape();
  sh.moveTo(0, 0); sh.absarc(0, 0, r, -Math.PI / 2 - a / 2, -Math.PI / 2 + a / 2, false); sh.lineTo(0, 0);
  return new T.ShapeGeometry(sh, 20);
}
function sectorEdgeGeo(r, arcDeg, w = 0.06) {
  const a = T.MathUtils.degToRad(arcDeg), parts = [new T.RingGeometry(r - w, r, 24, 1, -Math.PI / 2 - a / 2, a)];
  for (const s of [-1, 1]) {
    const g = new T.PlaneGeometry(r, w); g.translate(r / 2, 0, 0); g.rotateZ(-Math.PI / 2 + s * a / 2); parts.push(g);
  }
  return merge(parts);
}
function rectGeo(len, w) { const g = new T.PlaneGeometry(w, len); g.translate(0, -len / 2, 0); return g; }
function rectEdgeGeo(len, w, e = 0.05) {
  const parts = [];
  for (const s of [-1, 1]) { const g = new T.PlaneGeometry(e, len); g.translate(s * (w / 2 - e / 2), -len / 2, 0); parts.push(g); }
  const end = new T.PlaneGeometry(w, e); end.translate(0, -len + e / 2, 0); parts.push(end);
  return merge(parts);
}
function merge(gs) {   // junta geometrias não indexadas simples
  const pos = [];
  for (const g of gs) { const ng = g.index ? g.toNonIndexed() : g; pos.push(...ng.attributes.position.array); }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); return out;
}
function floorGroup(...meshes) {
  const g = new T.Group(), inner = new T.Group();
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.03;
  meshes.forEach(m => inner.add(m)); g.add(inner); return g;
}

export class Fx {
  constructor(scene, settings) {
    this.scene = scene; this.settings = settings; this.live = [];
    this.cube = new T.BoxGeometry(1, 1, 1);
  }
  add(obj, dur, tick) { this.scene.add(obj); this.live.push({ obj, t: 0, dur, tick }); }

  // aviso de setor (perseguidor): borda fixa, preenchimento cresce de dentro para fora
  sector(range, arc) {
    const fill = new T.Mesh(sectorGeo(range, arc), basic(COL.threat, 0.28));
    const edge = new T.Mesh(sectorEdgeGeo(range, arc), basic(COL.threatEdge, 0.95));
    const g = floorGroup(fill, edge); this.scene.add(g);
    return {
      set(pos, face, p) { g.position.set(pos.x, 0, pos.z); g.rotation.y = face; const k = Math.max(0.05, p); fill.scale.set(k, k, 1); fill.material.opacity = 0.18 + 0.3 * p; },
      strike() { fill.scale.set(1, 1, 1); fill.material.opacity = 0.6; },
      remove: () => this.scene.remove(g),
    };
  }
  // aviso de linha (disparador): borda fixa, preenchimento avança na direção do tiro
  line(len, w) {
    const fill = new T.Mesh(rectGeo(len, w), basic(COL.threat, 0.25));
    const edge = new T.Mesh(rectEdgeGeo(len, w), basic(COL.threatEdge, 0.9));
    const g = floorGroup(fill, edge); this.scene.add(g);
    return {
      set(pos, face, p, locked) { g.position.set(pos.x, 0, pos.z); g.rotation.y = face; fill.scale.set(1, Math.max(0.04, p), 1); edge.material.opacity = locked ? 1 : 0.55; },
      remove: () => this.scene.remove(g),
    };
  }
  // rastro do golpe de Kay: ciano, discreto, some rápido
  slash(pos, face, range, arc) {
    const m = new T.Mesh(sectorGeo(range, arc), basic(COL.friend, 0.3));
    const g = floorGroup(m); g.position.set(pos.x, 0, pos.z); g.rotation.y = face;
    this.add(g, 0.16, p => { m.material.opacity = 0.3 * (1 - p); });
  }
  ring(pos, color, dur = 0.5, r0 = 0.3, r1 = 1.2, opacity = 0.8) {
    const m = new T.Mesh(new T.RingGeometry(0.85, 1, 32), basic(color, opacity));
    const g = floorGroup(m); g.position.set(pos.x, 0, pos.z);
    this.add(g, dur, p => { const r = r0 + (r1 - r0) * p; m.scale.set(r, r, 1); m.material.opacity = opacity * (1 - p); });
  }
  burst(pos, color, n = 8, speed = 3, y = 0.5) {
    if (this.settings.reduceFx) n = Math.ceil(n / 2);
    const mat = new T.MeshBasicMaterial({ color, transparent: true });
    for (let i = 0; i < n; i++) {
      const c = new T.Mesh(this.cube, mat), a = Math.random() * Math.PI * 2, sp = speed * (0.5 + Math.random() * 0.6);
      const vel = new T.Vector3(Math.cos(a) * sp, 2 + Math.random() * 2, Math.sin(a) * sp);
      c.position.set(pos.x, y, pos.z); c.scale.setScalar(0.09 + Math.random() * 0.06);
      this.add(c, 0.4, (p, dt) => { vel.y -= 12 * dt; c.position.addScaledVector(vel, dt); c.scale.multiplyScalar(0.96); mat.opacity = 1 - p; });
    }
  }
  update(dt) {
    this.live = this.live.filter(f => {
      f.t += dt; const p = Math.min(1, f.t / f.dur);
      f.tick?.(p, dt);
      if (p >= 1) { this.scene.remove(f.obj); return false; }
      return true;
    });
  }
  clear() { this.live.forEach(f => this.scene.remove(f.obj)); this.live = []; }
}

// marcador de posição sob os pés: círculo = Kay, hexágono = hostil
export function footMarker(color, r, segments = 32, opacity = 0.8) {
  const m = new T.Mesh(new T.RingGeometry(r * 0.82, r, segments), basic(color, opacity));
  return floorGroup(m);
}
