// Importa as fontes do pacote "app-catolico" para dados enxutos do app.
// Uso: node fontes/importar.mjs <pasta app-catolico>
// Gera: src/data/calendario.json (Ambo 2026-2027), src/data/santos-brasil.json, public/biblia/fig1950/{mt,mc,lc,jo}.json
import fs from "node:fs"; import path from "node:path";
const SRC = process.argv[2]; if (!SRC) { console.error("informe a pasta app-catolico"); process.exit(1); }
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const rd = p => JSON.parse(fs.readFileSync(path.join(SRC, p), "utf8"));
const COR = { green: "verde", white: "branco", violet: "roxo", red: "vermelho", rose: "rosa", black: "roxo", gold: "branco" };

// 1) Calendário: por data, só o que o app mostra (título, grau, cor, preceito, referência do Evangelho)
const cal = {};
for (const ano of [2026, 2027]) for (const d of rd(`04-santos-por-dia/fonte-ambo-liturgical-calendars/ordinary_brazil_${ano}.json`).days) {
  const ev = d.readings.find(r => r.id === "gospel");
  cal[d.date] = { t: d.celebration.title["pt-BR"], g: d.celebration.rank.name["pt-BR"], c: COR[d.celebration.color] || "verde",
    p: d.status?.code === "holy-day-of-obligation" ? 1 : 0, ev: ev ? ev.citation : "", s: d.season?.code || "", w: d.season?.week ?? null };
}
fs.writeFileSync(path.join(OUT, "src/data/calendario.json"), JSON.stringify({ fonte: "ambo-liturgical-calendars (MIT, © 2026 Igor Aguiar), derivado do romcal (MIT)", dias: cal }));

// 2) Santos de data fixa
const santos = {};
for (const e of rd("04-santos-por-dia/santos-por-dia.json").entradas) {
  const k = `${String(e.mes).padStart(2, "0")}-${String(e.dia).padStart(2, "0")}`; (santos[k] ||= []).push({ nome: e.nome_pt, grau: e.grau, cor: COR[e.cor] || "branco" });
}
fs.writeFileSync(path.join(OUT, "src/data/santos-brasil.json"), JSON.stringify({ fonte: "ambo-liturgical-calendars (MIT, © 2026 Igor Aguiar), derivado do romcal (MIT)", santos }));

// 3) Evangelhos (prévia, edição de 1950): só o texto, sem notas; versículos grudados são separados pelo número no texto
const dir = path.join(OUT, "public/biblia/fig1950"); fs.mkdirSync(dir, { recursive: true });
let lacunas = 0, separados = 0;
for (const [arq, ab] of [["mateus", "mt"], ["marcos", "mc"], ["lucas", "lc"], ["joao", "jo"]]) {
  const B = rd(`01-biblia-figueiredo/json-ronaldomelofz/livros/${arq}.json`);
  const caps = B.capitulos.map(c => {
    const vs = {}; for (const v of c.versiculos) vs[v.n] = String(v.t).replace(/\s+/g, " ").trim();
    const max = Math.max(...Object.keys(vs).map(Number));
    for (let n = 2; n <= max; n++) if (!(n in vs) && vs[n - 1]) {           // tenta separar "... 4 E Arão gerou ..." do versículo anterior
      const m = vs[n - 1].match(new RegExp(`^(.*?)\\s*\\|?\\s+${n}\\s+(\\S.*)$`));
      if (m) { vs[n - 1] = m[1].replace(/[|\s]+$/, ""); vs[n] = m[2]; separados++; }
    }
    return Array.from({ length: max }, (_, i) => { const t = vs[i + 1]; if (!t) lacunas++; return (t || "").replace(/\s*\|\s*$/, ""); });
  });
  fs.writeFileSync(path.join(dir, ab + ".json"), JSON.stringify({ livro: B.nome, edicao: "Figueiredo, ed. 1950 (prévia; direitos da revisão não confirmados)", c: caps }));
}
console.log(`calendário: ${Object.keys(cal).length} dias · santos: ${Object.keys(santos).length} datas · Evangelhos: ${separados} versículos separados, ${lacunas} lacunas`);
