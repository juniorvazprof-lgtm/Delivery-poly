// Grade de 1 m e A* com heap.
// (módulo 8/20 da Capivara Explora)
import * as THREE from 'three';
import { HALF, clamp } from '../core/config.js';
import { waterDist } from './terrain.js';
import { objects } from './objects.js';

// ---------------------------------------------------------------------
// 3a. PATHFINDING: grade de 1 m + A* (contorna árvores, pedras, caverna e lago)
// ---------------------------------------------------------------------
const GN = HALF * 2;   // células de 1 m
const blocked = new Uint8Array(GN * GN);
const cellOf = v => [clamp(Math.floor(v.x + HALF), 0, GN - 1), clamp(Math.floor(v.z + HALF), 0, GN - 1)];
const cellCenter = (i, j) => new THREE.Vector3(i - HALF + 0.5, 0, j - HALF + 0.5);
for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) {
  const c = cellCenter(i, j);
  blocked[i + j * GN] = (i < 2 || j < 2 || i > GN - 3 || j > GN - 3 || waterDist(c.x, c.z) < 0.6) ? 1 : 0;
}
for (const o of objects) if (o.block) {   // marca só as células em volta de cada obstáculo
  const R = Math.ceil(o.block + 0.5), [ci, cj] = cellOf(o.pos);
  for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) {
    if (i < 0 || j < 0 || i >= GN || j >= GN) continue;
    const c = cellCenter(i, j); if (Math.hypot(c.x - o.pos.x, c.z - o.pos.z) < o.block + 0.5) blocked[i + j * GN] = 1;
  }
}
function nearestFree(i, j) {
  if (!blocked[i + j * GN]) return [i, j];
  for (let r = 1; r < 12; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < GN && b < GN && !blocked[a + b * GN]) return [a, b];
  }
  return [i, j];
}
// A* com fila de prioridade (heap binário): rápido mesmo no mapa de 120 m
function findPath(from, to) {
  const [si, sj] = nearestFree(...cellOf(from)), [ti, tj] = nearestFree(...cellOf(to));
  const start = si + sj * GN, goal = ti + tj * GN;
  const g = new Float32Array(GN * GN).fill(Infinity), came = new Int32Array(GN * GN).fill(-1), closed = new Uint8Array(GN * GN);
  const hf = k => Math.hypot((k % GN) - ti, Math.floor(k / GN) - tj);
  const heap = [[hf(start), start]];
  const push = it => { heap.push(it); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= it[0]) break; heap[i] = heap[p]; i = p; } heap[i] = it; };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++; if (heap[c][0] >= last[0]) break; heap[i] = heap[c]; i = c; } heap[i] = last; } return top; };
  g[start] = 0;
  let iter = 0;
  while (heap.length && iter++ < 30000) {
    const [, cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % GN, cj = Math.floor(cur / GN);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GN || nj >= GN) continue;
      const n = ni + nj * GN;
      if (blocked[n] || closed[n]) continue;
      if (di && dj && (blocked[ci + di + cj * GN] || blocked[ci + (cj + dj) * GN])) continue; // sem cortar quinas
      const ng = g[cur] + (di && dj ? 1.414 : 1);
      if (ng < g[n]) { g[n] = ng; came[n] = cur; push([ng + hf(n), n]); }
    }
  }
  if (came[goal] === -1 && goal !== start) return [to.clone()];
  const path = []; let k = goal;
  while (k !== -1 && k !== start) { path.unshift(cellCenter(k % GN, Math.floor(k / GN))); k = came[k]; }
  const out = path.filter((p, i) => i % 2 === 1 || i === path.length - 1);
  out.push(to.clone());
  return out;
}
function isFree(v) { const [i, j] = cellOf(v); return !blocked[i + j * GN]; }

export { cellCenter, cellOf, findPath, isFree, nearestFree };
