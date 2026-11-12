import type { BibleBook, BibleRef } from "../types";

/** Nome do livro (como aparece nas referências) → abreviação usada nos arquivos. */
export const BOOKS: Record<string, string> = {"Gênesis": "Gn", "Êxodo": "Êx", "Levítico": "Lv", "Números": "Nm", "Deuteronômio": "Dt", "Josué": "Js", "Juízes": "Jz", "Rute": "Rt", "1 Samuel": "1Sm", "2 Samuel": "2Sm", "1 Reis": "1Rs", "2 Reis": "2Rs", "1 Crônicas": "1Cr", "2 Crônicas": "2Cr", "Esdras": "Ed", "Neemias": "Ne", "Ester": "Et", "Jó": "Jó", "Salmos": "Sl", "Provérbios": "Pv", "Eclesiastes": "Ec", "Cânticos": "Ct", "Isaías": "Is", "Jeremias": "Jr", "Lamentações": "Lm", "Ezequiel": "Ez", "Daniel": "Dn", "Oseias": "Os", "Joel": "Jl", "Amós": "Am", "Obadias": "Ob", "Jonas": "Jn", "Miqueias": "Mq", "Naum": "Na", "Habacuque": "Hc", "Sofonias": "Sf", "Ageu": "Ag", "Zacarias": "Zc", "Malaquias": "Ml", "Mateus": "Mt", "Marcos": "Mc", "Lucas": "Lc", "João": "Jo", "Atos": "At", "Romanos": "Rm", "1 Coríntios": "1Co", "2 Coríntios": "2Co", "Gálatas": "Gl", "Efésios": "Ef", "Filipenses": "Fp", "Colossenses": "Cl", "1 Tessalonicenses": "1Ts", "2 Tessalonicenses": "2Ts", "1 Timóteo": "1Tm", "2 Timóteo": "2Tm", "Tito": "Tt", "Filemom": "Fm", "Hebreus": "Hb", "Tiago": "Tg", "1 Pedro": "1Pe", "2 Pedro": "2Pe", "1 João": "1Jo", "2 João": "2Jo", "3 João": "3Jo", "Judas": "Jd", "Apocalipse": "Ap", "Lamentações de Jeremias": "Lm", "Cantares": "Ct", "Oséias": "Os", "Miquéias": "Mq"};

export const BIBLE_CREDIT = "Bíblia Livre (BLIVRE), © Diego Santos, Mario Sérgio e Marco Teles, 2018. Licença CC BY 4.0 Brasil.";

/** Abreviações válidas. Só elas podem virar caminho de arquivo. */
const VALID = new Set(Object.values(BOOKS));
/** Arquivos sem acento no nome. */
const FILE: Record<string, string> = { "Jó": "Job", "Êx": "Ex" };
const cache = new Map<string, BibleBook>();

/** Interpreta "Livro 1:2" ou "Livro 1:2-5". Devolve null se não for uma referência válida. */
export function parseRef(r: unknown): BibleRef | null {
  const m = String(r ?? "").trim().slice(0, 60).match(/^(.+?)\s(\d{1,3}):(\d{1,3})(?:\s?[-–]\s?(\d{1,3}))?$/);
  if (!m) return null;
  const a = +m[3], b = +(m[4] || m[3]);
  if (a < 1 || b < a || b - a > 40) return null;
  return { book: m[1], ab: BOOKS[m[1]], ch: +m[2], a, b };
}

/** Carrega um livro da Bíblia (um arquivo por livro), com cache e validação do conteúdo. */
export async function loadBook(ab: string): Promise<BibleBook> {
  const hit = cache.get(ab);
  if (hit) return hit;
  if (!VALID.has(ab)) throw new Error("livro desconhecido");
  const res = await fetch(`biblia/blivre/${FILE[ab] || ab}.json`);
  if (!res.ok) throw new Error("falha ao carregar o livro");
  const data = (await res.json()) as unknown;
  if (!isBook(data)) throw new Error("arquivo do livro inválido");
  cache.set(ab, data);
  return data;
}

function isBook(d: unknown): d is BibleBook {
  const b = d as BibleBook;
  return !!b && typeof b.livro === "string" && Array.isArray(b.capitulos) &&
    b.capitulos.every(c => Array.isArray(c) && c.every(v => typeof v === "string"));
}

/** Texto de uma referência, ou null se não existir. */
export async function lookupRef(ref: unknown): Promise<string | null> {
  const p = parseRef(ref);
  if (!p || !p.ab) return null;
  try {
    const book = await loadBook(p.ab), chapter = book.capitulos[p.ch - 1];
    if (!chapter) return null;
    const verses = chapter.slice(p.a - 1, p.b);
    return verses.length === p.b - p.a + 1 ? verses.join(" ") : null;
  } catch { return null; }
}
