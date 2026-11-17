// Bot de teste: joga N missões aceleradas e mede duração, vida mínima, munição e resultado.
// Uso: node tests/bot.cjs [missoes=4] [rapido=8]
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, ".."), TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
const N = Number(process.argv[2]) || 4, RAPIDO = Number(process.argv[3]) || 8;
(async () => {
  await new Promise(r => server.listen(4630, r));
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 420, height: 860 } }), erros = [];
  p.on("pageerror", e => erros.push(e.message)); p.on("console", m => m.type() === "error" && erros.push(m.text()));
  const res = [];
  for (let i = 0; i < N; i++) {
    await p.goto(`http://localhost:4630/?bot=1&rapido=${RAPIDO}`);
    await p.waitForFunction(() => window.__jogo?.bot?.st.fim, null, { timeout: 240000 }).catch(() => {});
    const r = await p.evaluate(() => ({ ...(window.__jogo.bot.st.fim || { estado: "travou", tempo: window.__jogo.missao.tempo, abates: window.__jogo.missao.abates }), tiros: window.__jogo.bot.st.tiros }));
    res.push(r); console.log(`missão ${i + 1}: ${r.estado} · ${(r.tempo / 60).toFixed(1)} min (limpeza ${((r.tLimpeza || 0) / 60).toFixed(1)}) · abates ${r.abates} · vida mín ${r.vidaMin} · munição sobrando ${r.municao} · caixas ${r.caixas} · saque ${r.saque} · tiros ${r.tiros}`);
  }
  const pagos = res.filter(r => r.estado === "pago");
  console.log(`\nextrações: ${pagos.length}/${N} · tempo médio ${(res.reduce((s, r) => s + r.tempo, 0) / N / 60).toFixed(1)} min`);
  console.log(erros.length ? "ERROS: " + [...new Set(erros)].join(" | ") : "sem erros de script");
  await b.close(); server.close(); if (erros.length || res.some(r => r.estado === "travou")) process.exit(1);
})();
