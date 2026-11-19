// Navegação com colisão: grade de 0,25 m sobre o chão, obstáculos inflados pelo raio do boneco,
// A* com 8 direções e depois "puxa o fio" (linha de visão) para a rota ficar reta e natural.
import { MESAS } from '../scene/office.js';

const CEL = 0.25, RAIO = 0.32, X0 = -12.7, X1 = 12.7, Z0 = -8.6, Z1 = 8.9;
const NX = Math.ceil((X1 - X0) / CEL), NZ = Math.ceil((Z1 - Z0) / CEL);
// retângulos [cx, cz, largura, profundidade] e círculos [cx, cz, raio]
const RET = [
  ...Object.values(MESAS).map(([x, z]) => [x, z, 2.6, 1.3]),
  [-4.4, 6.4, 0.12, 3.8], [-7.6, 4.5, 5.2, 0.12],            // vidros da sala de reunião
  [0.5, 7.8, 3.2, 0.9], [8.6, 4.6, 2.8, 0.8],                 // balcão da copa e da recepção
  [12.9, 6.6, 0.2, 1.6],                                       // porta
  ...[[-12, -8], [12, -8], [-12, 8], [4, 8]].map(([x, z]) => [x, z, 0.7, 0.7]), // plantas
];
const CIR = [[-8, 6.6, 1.25], ...[0, 1, 2, 3].map(i => { const a = i * Math.PI / 2 + 0.4; return [-8 + Math.cos(a) * 1.7, 6.6 + Math.sin(a) * 1.7, 0.3]; })];

export function bloqueado(x, z) {
  if (x < X0 + RAIO || x > X1 - RAIO || z < Z0 + RAIO || z > Z1 - RAIO) return true;
  for (const [cx, cz, w, d] of RET) if (Math.abs(x - cx) < w / 2 + RAIO && Math.abs(z - cz) < d / 2 + RAIO) return true;
  for (const [cx, cz, r] of CIR) if (Math.hypot(x - cx, z - cz) < r + RAIO) return true;
  return false;
}
const livre = new Uint8Array(NX * NZ);
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) livre[j * NX + i] = bloqueado(X0 + (i + 0.5) * CEL, Z0 + (j + 0.5) * CEL) ? 0 : 1;
// só vale o que é alcançável a partir do meio do escritório (evita destinos presos entre cadeiras)
{ const vis = new Uint8Array(NX * NZ), fila = [Math.floor((0.5 - Z0) / CEL) * NX + Math.floor((0 - X0) / CEL)]; vis[fila[0]] = 1;
  while (fila.length) { const c = fila.pop(), i = c % NX, j = Math.floor(c / NX);
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) { const n = b * NX + a; if (a >= 0 && b >= 0 && a < NX && b < NZ && livre[n] && !vis[n]) { vis[n] = 1; fila.push(n); } } }
  for (let k = 0; k < livre.length; k++) livre[k] = vis[k]; }
const celula = (x, z) => [Math.min(NX - 1, Math.max(0, Math.floor((x - X0) / CEL))), Math.min(NZ - 1, Math.max(0, Math.floor((z - Z0) / CEL)))];
const centro = (i, j) => [X0 + (i + 0.5) * CEL, Z0 + (j + 0.5) * CEL];

/** Célula livre mais próxima (busca em anéis). */
function maisProxima(i, j) {
  if (livre[j * NX + i]) return [i, j];
  for (let r = 1; r < 40; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < NX && b < NZ && livre[b * NX + a]) return [a, b];
  }
  return [i, j];
}
/** Ponto livre mais próximo de (x, z): usado quando o destino cai dentro de um móvel. */
export function pontoLivre(x, z) { const [ci, cj] = celula(x, z); if (!bloqueado(x, z) && livre[cj * NX + ci]) return [x, z]; const [i, j] = maisProxima(...celula(x, z)); return centro(i, j); }

function visivel(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (CEL * 0.5));
  for (let k = 1; k < n; k++) { const t = k / n; if (bloqueado(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}

/** Rota de (x0,z0) até (x1,z1) como lista de pontos [x, z], sem atravessar paredes nem móveis. */
export function rota(x0, z0, x1, z1) {
  [x1, z1] = pontoLivre(x1, z1);
  if (visivel(x0, z0, x1, z1)) return [[x1, z1]];
  const [si, sj] = maisProxima(...celula(x0, z0)), [ti, tj] = maisProxima(...celula(x1, z1));
  const S = sj * NX + si, A = tj * NX + ti, g = new Float32Array(NX * NZ).fill(Infinity), de = new Int32Array(NX * NZ).fill(-1), fechado = new Uint8Array(NX * NZ);
  const h = k => Math.hypot((k % NX) - ti, Math.floor(k / NX) - tj);
  const aberto = [[h(S), S]]; g[S] = 0;
  while (aberto.length) {
    let m = 0; for (let k = 1; k < aberto.length; k++) if (aberto[k][0] < aberto[m][0]) m = k;
    const [, c] = aberto[m]; aberto[m] = aberto[aberto.length - 1]; aberto.pop();
    if (c === A) break; if (fechado[c]) continue; fechado[c] = 1;
    const ci = c % NX, cj = Math.floor(c / NX);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
      const n = nj * NX + ni; if (!livre[n] || (di && dj && (!livre[cj * NX + ni] || !livre[nj * NX + ci]))) continue;
      const ng = g[c] + (di && dj ? 1.414 : 1); if (ng < g[n]) { g[n] = ng; de[n] = c; aberto.push([ng + h(n), n]); }
    }
  }
  if (de[A] < 0 && A !== S) return [[x1, z1]].filter(() => false); // sem caminho: fica parado
  const cel = []; for (let k = A; k !== -1 && k !== S; k = de[k]) cel.push(centro(k % NX, Math.floor(k / NX))); cel.reverse();
  cel.push([x1, z1]);
  // puxa o fio: pula pontos enquanto houver linha de visão
  const out = []; let ax = x0, az = z0, k = 0;
  while (k < cel.length) { let f = k; while (f + 1 < cel.length && visivel(ax, az, ...cel[f + 1])) f++; out.push(cel[f]); [ax, az] = cel[f]; k = f + 1; }
  return out;
}
