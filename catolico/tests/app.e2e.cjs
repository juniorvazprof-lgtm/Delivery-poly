// Teste de ponta a ponta: abas, terço completo do início ao fim, orações e ausência de erros.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium, devices } = require("playwright");
const ROOT = path.join(__dirname, "..", "dist"), TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise(r => server.listen(4620, r));
  const b = await chromium.launch(), p = await b.newPage({ ...devices["iPhone 13"] }), errs = [];
  p.on("pageerror", e => errs.push(e.message)); p.on("console", m => m.type() === "error" && errs.push(m.text()));
  let falhas = 0; const ok = (c, n) => { console.log((c ? "✓ " : "✗ ") + n); if (!c) falhas++; };
  await p.goto("http://localhost:4620/"); await p.waitForTimeout(1000);
  ok(/semana|Natal|Páscoa|Advento|Quaresma|Santo|Domingo|Pentecostes|Cinzas/.test(await p.textContent("#app")), "Hoje mostra o dia litúrgico");
  await p.waitForTimeout(800);
  const ev = await p.$("#evTxt"); ok(!!ev && (await ev.textContent()).length > 40, "Evangelho do dia carregado no cartão");
  if (ev) { await p.evaluate(() => document.getElementById("evLer").click()); await p.waitForTimeout(500);
    ok((await p.$$("#sheet .evangelho p")).length > 3, "Evangelho completo abre com os versículos");
    await p.evaluate(() => document.getElementById("veil").click()); await p.waitForTimeout(400); }
  await p.tap("#rezei"); ok((await p.textContent("#toast")).includes("Amém"), "oração do dia registra");
  await p.tap("#bnav [data-tab=terco]"); await p.tap("#comecar"); let n = 0;
  while (await p.$("#corpo") && n < 100) { await p.tap("#corpo"); n++; }
  ok(n === 78, `terço completo em 78 passos (${n})`);
  ok((await p.textContent("#app")).includes("Amém"), "tela final do terço");
  await p.tap("#bnav [data-tab=oracoes]"); await p.tap("[data-o=avemaria]"); await p.waitForTimeout(500);
  ok((await p.textContent("#sheet")).includes("cheia de graça"), "oração abre e mostra o texto");
  await p.evaluate(() => document.querySelector("#sheet .antiga summary").click()); await p.waitForTimeout(200);
  ok((await p.textContent("#sheet .antiga")).includes("1778"), "forma antiga da oração com a fonte");
  await p.tap("#amem"); await p.tap("#bnav [data-tab=voce]"); await p.waitForTimeout(300);
  ok(/1\s*terços?/.test(await p.textContent(".stats")), "Você mostra o terço rezado");
  ok(errs.length === 0, "sem erros de script" + (errs.length ? ": " + errs.join(" | ") : ""));
  await b.close(); server.close(); if (falhas) process.exit(1); console.log("\nTudo certo");
})();
