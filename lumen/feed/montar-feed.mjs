// Monta src/data/versiculos-feed.json a partir das referências em feed/candidatos/*.json.
// O texto de TODO versículo vem dos arquivos da BLIVRE em public/biblia; nada é escrito à mão.
// Uso: node feed/montar-feed.mjs [--seco]   (--seco: só relata, não grava)
import fs from "node:fs";
import path from "node:path";
import { exibir } from "./exibir.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BIB = path.join(ROOT, "public/biblia");
const FEED = path.join(ROOT, "src/data/versiculos-feed.json");
const CAND = path.join(ROOT, "feed/candidatos");
const MAX_CHARS = 250;   // o maior versículo atual do feed tem 250 caracteres e cabe numa tela

const TEMAS = ["ansiedade", "cuidado", "oração", "paz", "descanso", "confiança", "coragem", "força", "esperança", "propósito", "graça", "amor", "fé", "gratidão", "alegria"];
// paleta de cada tema (as mesmas cores já usadas nos 88 versículos originais)
const CORES = {
  ansiedade: ["#9EC5E8", "#C9B6E8", "#D6C3E8"], cuidado: ["#C9B6E8", "#B5C7E8", "#C8DDA9", "#9EC5E8"], oração: ["#9EC5E8", "#A9D3C7", "#F2C879"],
  paz: ["#A9D3C7", "#D6C3E8", "#B5C7E8"], descanso: ["#D6C3E8", "#E8DDC4", "#C8DDA9", "#E8C9A9"], confiança: ["#F2C879", "#B5C7E8", "#C8DDA9", "#A9D3C7"],
  coragem: ["#E89A9A", "#F2C879", "#E8C9A9"], força: ["#F2B879", "#F2C879", "#E89A9A"], esperança: ["#E89A9A", "#C9B6E8", "#A9D3C7", "#F2B879"],
  propósito: ["#F2C879", "#E8C9A9", "#B5C7E8", "#F7D9A0"], graça: ["#F2C879", "#E8C9A9", "#D6C3E8", "#F2B8C6"], amor: ["#F2B8C6", "#E8C9A9"],
  fé: ["#D6C3E8", "#B5C7E8", "#C8DDA9", "#E8C9A9"], gratidão: ["#F2C879", "#A9D3C7", "#F2B8C6", "#F7D9A0"], alegria: ["#A9D3C7", "#F7D9A0", "#F2B8C6", "#F2C879"],
};

const livros = JSON.parse(fs.readFileSync(path.join(BIB, "livros.json"), "utf8")).livros;
const byAbrev = new Map(livros.map(l => [l.abrev, l]));
const cache = new Map();
const livro = l => { if (!cache.has(l.abrev)) cache.set(l.abrev, JSON.parse(fs.readFileSync(path.join(BIB, l.arquivo), "utf8"))); return cache.get(l.abrev); };
// gradiente de 2 cores do fundo do card: uma do tema principal e outra do segundo tema (ou do mesmo)
const gradiente = (temas, ref) => { const a = CORES[temas[0]], b = CORES[temas[1] || temas[0]], i = hash(ref) % a.length; let j = hash(ref + 'b') % b.length;
  if (b[j] === a[i]) j = (j + 1) % b.length; return [a[i], b[j]]; };
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// "Sl 23:1", "Fp 4:6-7", "1Pe 5:7"
function parseRef(ref) {
  const m = /^\s*(\S+)\s+(\d+):(\d+)(?:-(\d+))?\s*$/.exec(ref);
  if (!m) return { erro: "formato inválido" };
  const l = byAbrev.get(m[1]); if (!l) return { erro: `livro desconhecido "${m[1]}"` };
  const cap = +m[2], de = +m[3], ate = m[4] ? +m[4] : de;
  if (ate < de || ate - de > 2) return { erro: "intervalo inválido (máx. 3 versículos)" };
  const caps = livro(l).capitulos;
  if (cap < 1 || cap > caps.length) return { erro: `capítulo ${cap} não existe` };
  const vs = caps[cap - 1]; if (ate > vs.length) return { erro: `versículo ${ate} não existe (capítulo tem ${vs.length})` };
  const texto = vs.slice(de - 1, ate).join(" ").replace(/\s+/g, " ").trim();
  if (!texto) return { erro: "texto vazio na BLIVRE" };
  return { l, cap, de, ate, texto, ref: `${l.nome} ${cap}:${de}${ate > de ? "-" + ate : ""}` };
}
const atual = JSON.parse(fs.readFileSync(FEED, "utf8"));
const usados = new Set();   // "Sl|23|1" de cada versículo já presente
const marca = (abrev, cap, de, ate) => { for (let v = de; v <= ate; v++) usados.add(`${abrev}|${cap}|${v}`); };
const colide = (abrev, cap, de, ate) => { for (let v = de; v <= ate; v++) if (usados.has(`${abrev}|${cap}|${v}`)) return true; return false; };
for (const v of atual.versiculos) marca(v.abrev, v.cap, v.de, v.ate);

const excluir = new Set(fs.readFileSync(path.join(ROOT, "feed/excluir.txt"), "utf8").split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#")));
const novos = [], rejeitados = [];
for (const f of fs.readdirSync(CAND).filter(f => f.endsWith(".json")).sort()) {
  let lista; try { lista = JSON.parse(fs.readFileSync(path.join(CAND, f), "utf8")); } catch (e) { rejeitados.push(`${f}: JSON inválido (${e.message})`); continue; }
  for (const c of lista) {
    const p = parseRef(String(c.ref || ""));
    if (p.erro) { rejeitados.push(`${f} ${c.ref}: ${p.erro}`); continue; }
    const temas = (Array.isArray(c.temas) ? c.temas : []).filter(t => TEMAS.includes(t)).slice(0, 2);
    if (!temas.length) { rejeitados.push(`${f} ${c.ref}: sem tema válido`); continue; }
    if (excluir.has(p.ref)) { rejeitados.push(`${f} ${c.ref}: excluído na revisão`); continue; }
    if (colide(p.l.abrev, p.cap, p.de, p.ate)) { rejeitados.push(`${f} ${c.ref}: repetido`); continue; }
    const ex = exibir(p.texto);
    if (ex.length > MAX_CHARS) { rejeitados.push(`${f} ${c.ref}: longo demais (${ex.length} caracteres)`); continue; }
    marca(p.l.abrev, p.cap, p.de, p.ate);
    novos.push({ ref: p.ref, abrev: p.l.abrev, cap: p.cap, de: p.de, ate: p.ate, texto: p.texto, temas,
      cores: gradiente(temas, p.ref), exibir: ex });
  }
}

// conferência final de TODOS (originais e novos) contra a BLIVRE
const todos = [...atual.versiculos, ...novos];
let falhas = 0;
for (const v of todos) {
  const l = byAbrev.get(v.abrev), txt = l && livro(l).capitulos[v.cap - 1]?.slice(v.de - 1, v.ate).join(" ").replace(/\s+/g, " ").trim();
  if (txt !== v.texto) { falhas++; console.error("TEXTO DIFERENTE DA BLIVRE:", v.ref); }
}
const porTema = Object.fromEntries(TEMAS.map(t => [t, todos.filter(v => v.temas[0] === t).length]));
console.log(`originais ${atual.versiculos.length} · novos ${novos.length} · total ${todos.length} · rejeitados ${rejeitados.length} · divergências ${falhas}`);
console.log("por tema principal:", porTema);
fs.writeFileSync(path.join(ROOT, "feed/rejeitados.txt"), rejeitados.join("\n") + "\n");
fs.writeFileSync(path.join(ROOT, "feed/revisao.tsv"), "ref\ttemas\ttexto\n" + novos.map(v => `${v.ref}\t${v.temas.join(",")}\t${v.exibir}`).join("\n") + "\n");
if (falhas) process.exit(1);
if (!process.argv.includes("--seco")) { fs.writeFileSync(FEED, JSON.stringify({ ...atual, versiculos: todos }, null, 1) + "\n"); console.log("gravado:", path.relative(ROOT, FEED)); }
