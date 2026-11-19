import test from 'node:test'; import assert from 'node:assert/strict';
import { rota, bloqueado, pontoLivre } from '../src/engine/nav.js';
const livre = (a, b, c, d) => { let px = a, pz = b; for (const [x, z] of rota(a, b, c, d)) { for (let t = 0; t <= 1; t += 0.02) if (bloqueado(px + (x - px) * t, pz + (z - pz) * t)) return false; px = x; pz = z; } return true; };
test('rotas longas não atravessam móveis', () => { for (const c of [[11.2, 6.6, -7.6, 6.2], [0, -1.95, 0, 3.05], [-6, -1.95, 6, 3.05], [8.2, 5.6, -3, -6.2]]) assert.ok(livre(...c)); });
test('destino dentro de móvel vira o ponto livre mais próximo', () => { const [x, z] = pontoLivre(-6, -3); assert.equal(bloqueado(x, z), false); });
test('paredes bloqueiam', () => { assert.ok(bloqueado(-13, 0)); assert.ok(bloqueado(0, -9)); });
