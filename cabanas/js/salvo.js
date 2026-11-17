// Salvamento nos abrigos (ao acender a vela). Tudo o que volta do aparelho é validado:
// um salvamento corrompido ou adulterado nunca quebra o jogo, só cai para valores seguros.
import { serializar, desserializar } from './inventario.js';

const CHAVE = 'cabanas.salvo', VERSAO = 1;
const num = (v, min, max, padrao) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : padrao);
const txt = (v, ok, padrao) => (typeof v === 'string' && ok.includes(v) ? v : padrao);

/** Grava o estado do jogo. `abrigos` é a lista de ids válidos. */
export function salvar(e) {
  const dados = { v: VERSAO, hora: e.hora, dia: e.dia, pos: e.pos, vida: e.vida, bateria: e.bateria, abrigo: e.abrigo,
    inventario: serializar(e.inventario), bau: serializar(e.bau), flags: e.flags || {} };
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); return true; } catch { return false; }
}

/** Lê e valida o salvamento; devolve null se não houver ou se for de outra versão. */
export function carregar(abrigos, espacos = 8, espacosBau = 24) {
  let d; try { d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { return null; }
  if (!d || typeof d !== 'object' || d.v !== VERSAO) return null;
  const pos = Array.isArray(d.pos) && d.pos.length === 2 ? [num(d.pos[0], -40, 40, 0), num(d.pos[1], -40, 40, 0)] : [0, 0];
  const flags = {};
  if (d.flags && typeof d.flags === 'object') for (const [k, v] of Object.entries(d.flags).slice(0, 200)) if (/^[a-z0-9_]{1,40}$/.test(k) && (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)))) flags[k] = v;
  return {
    hora: num(d.hora, 0, 23.99, 7), dia: Math.floor(num(d.dia, 1, 999, 1)), pos, vida: num(d.vida, 1, 100, 100), bateria: num(d.bateria, 0, 1, 1),
    abrigo: txt(d.abrigo, abrigos, abrigos[0]), inventario: desserializar(d.inventario, espacos), bau: desserializar(d.bau, espacosBau), flags,
  };
}
export const temSalvo = () => { try { return !!localStorage.getItem(CHAVE); } catch { return false; } };
export const apagarSalvo = () => { try { localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } };
