/**
 * Gera as capturas de tela da página a partir do build do app (lumen/dist).
 *   cd lumen && npm run build && cd ../site && node tools/screenshots.cjs
 */
const { chromium, devices } = require("playwright");
const http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const DIST = path.resolve(__dirname, "../../lumen/dist"), OUT = path.resolve(__dirname, "../img");
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]); if (rel.endsWith("/")) rel += "index.html";
  const p = path.join(DIST, rel); if (!p.startsWith(DIST) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": p.endsWith(".html") ? "text/html; charset=utf-8" : "application/json" }); fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(4620, r));
  const b = await chromium.launch();
  const shot = async (name, dark, fn) => {
    const c = await b.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light" });
    await c.addInitScript(() => localStorage.setItem("lumen.onb", "1"));
    const p = await c.newPage(); await p.goto("http://localhost:4620/"); await p.waitForTimeout(2200);
    await fn(p); await p.screenshot({ path: path.join(OUT, name + ".jpg"), type: "jpeg", quality: 82 }); await c.close();
    console.log("img/" + name + ".jpg");
  };
  await shot("feed", false, async p => { await p.waitForTimeout(800); });
  await shot("feed-escuro", true, async p => { await p.evaluate(() => document.getElementById("feed").scrollBy(0, innerHeight)); await p.waitForTimeout(2400); });
  await shot("oracao", false, async p => { await p.tap(".card.active .pray-btn"); await p.waitForTimeout(700); await p.tap("#pyNext"); await p.waitForTimeout(1200); });
  await shot("capitulo", false, async p => { await p.tap(".card.active .read"); await p.waitForTimeout(2000); });
  await shot("pulpito", false, async p => { await p.tap("#bnav [data-tab=premium]"); await p.waitForTimeout(600); await p.tap(".tool2[data-t=pulpito]"); await p.waitForTimeout(900); });
  await shot("pregar", true, async p => { await p.tap("#bnav [data-tab=premium]"); await p.waitForTimeout(600); await p.tap(".tool2[data-t=pulpito]"); await p.waitForTimeout(700); await p.tap("#goPreach"); await p.waitForTimeout(700); await p.tap("#prNext"); await p.waitForTimeout(900); });
  // imagem de compartilhar, como ela sai do app
  const c = await b.newContext({ ...devices["iPhone 13"] }); await c.addInitScript(() => localStorage.setItem("lumen.onb", "1"));
  const p = await c.newPage(); await p.goto("http://localhost:4620/"); await p.waitForTimeout(1800);
  await p.tap(".card.active .send"); await p.waitForTimeout(2500);
  const src = await p.$eval(".shot img", i => i.src); fs.writeFileSync(path.join(OUT, "compartilhar.png"), Buffer.from(src.split(",")[1], "base64"));
  console.log("img/compartilhar.png");
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
