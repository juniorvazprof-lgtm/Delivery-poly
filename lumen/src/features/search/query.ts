/* Interpretação de referências digitadas na busca ("joão 3:16", "jo 3 16", "sl 23"). Sem DOM, para poder testar. */
import { BOOKS } from "../../services/bible";

/** minúsculas, sem acento e com espaços simples */
export const norm = (s: string): string => s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export const NAMES = [...new Set(Object.keys(BOOKS).filter(n => !["Lamentações de Jeremias", "Cantares", "Oséias", "Miquéias"].includes(n)))];
/** nome/abreviação → nome do livro. Com acento primeiro (Jó ≠ Jo de João). */
const EXACT = new Map<string, string>(), PLAIN = new Map<string, string>();
for (const [name, ab] of Object.entries(BOOKS)) {
  const canon = NAMES.find(n => BOOKS[n] === ab) || name;
  for (const k of [name, ab]) {
    const low = k.toLocaleLowerCase("pt-BR").replace(/\s+/g, "");
    if (!EXACT.has(low)) EXACT.set(low, canon);
    const pl = norm(k).replace(/\s/g, "");
    if (!PLAIN.has(pl) || ab === "Jo") PLAIN.set(pl, canon);
  }
}
/** Encontra o livro pelo que a pessoa digitou ("joao", "1co", "salm"). */
export function findBook(t: string): string | null {
  const low = t.toLocaleLowerCase("pt-BR").replace(/[\s.]+/g, "");
  if (!low) return null;
  const hit = EXACT.get(low) || PLAIN.get(norm(low));
  if (hit) return hit;
  const pre = NAMES.filter(n => norm(n).replace(/\s/g, "").startsWith(norm(low)));
  return pre.length >= 1 && norm(low).length >= 3 ? pre[0] : null;
}

export interface RefQuery { book: string; ch: number; a?: number; b?: number }
/** "joão 3:16", "jo 3 16", "sl 23", "1 co 13:4-7" → referência; null se não for uma. */
export function parseQuery(q: string): RefQuery | null {
  const m = q.trim().match(/^((?:[1-3]\s*)?[\p{L}.\s]+?)\s*(\d{1,3})(?:\s*[:.,\s]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/u);
  if (!m) return null;
  const book = findBook(m[1]);
  if (!book) return null;
  const ch = +m[2], a = m[3] ? +m[3] : undefined, b = m[4] ? +m[4] : a;
  if (ch < 1 || (a !== undefined && (a < 1 || (b ?? a) < a || (b ?? a) - a > 40))) return null;
  return { book, ch, a, b };
}

