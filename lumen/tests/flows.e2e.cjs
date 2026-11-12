/**
 * Roteiro de ponta a ponta por todas as telas, no build de produção (com CSP).
 *   npm run test:flows
 * Em cada passo confere: erros de script, violações da CSP e HTML aparecendo como texto
 * (sinal de que algum markup foi escapado por engano).
 */
const { chromium, devices } = require("playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const DIST = path.resolve(__dirname, "..", "dist");
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  const p = path.join(DIST, rel);
  if (!p.startsWith(DIST) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});

async function main() {
  await new Promise(r => server.listen(4610, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const p = await ctx.newPage();
  const problems = [];
  p.on("pageerror", e => problems.push("erro: " + e.message));
  p.on("console", m => { if (m.type() === "error" || /Content Security|Refused/.test(m.text())) problems.push("console: " + m.text().slice(0, 160)); });
  const escapedCheck = async name => {
    const bad = await p.evaluate(() => {
      const m = document.body.innerText.match(/<\/?(span|svg|b|em|div|p|path|button|small|i)\b[^\n]{0,40}|&lt;|&amp;|&quot;/);
      return m ? m[0] : null;
    });
    if (bad) problems.push(`HTML aparecendo como texto em "${name}": ${bad}`);
  };
  const step = async (name, fn) => {
    try { await fn(); await escapedCheck(name); console.log("✓", name); }
    catch (e) { problems.push(`${name}: ${e.message.split("\n")[0]}`); console.log("✗", name); }
  };
  const tap = (sel, timeout = 8000) => p.tap(sel, { timeout });
  const wait = ms => p.waitForTimeout(ms);

  await p.goto("http://localhost:4610/");
  await wait(1400);
  await step("primeiro acesso", async () => { await tap(".chip[data-t=ansiedade]"); await tap("#go"); await wait(600); });
  await step("curtir e salvar", async () => { await tap(".card.active .heart"); await tap(".card.active .save"); await wait(400); });
  await step("rolar o feed", async () => { for (let i = 0; i < 4; i++) { await p.evaluate(() => document.getElementById("feed").scrollBy(0, innerHeight)); await wait(450); } });
  await step("menu do versículo e filtro", async () => { await tap(".card.active .more"); await wait(500); await tap(".opt[data-a=tema]"); await wait(800); });
  await step("ler o capítulo", async () => { await tap(".card.active .read"); await wait(1200); await tap("#rClose"); await wait(500); });
  await step("compartilhar", async () => { await tap(".card.active .send"); await wait(1500); await p.evaluate(() => document.getElementById("veil").click()); await wait(500); });
  await step("oração guiada", async () => {
    await p.evaluate(() => document.getElementById("feed").scrollTo(0, 0)); await wait(700);
    await tap(".card.active .pray-btn"); await wait(600);
    for (let i = 0; i < 4; i++) { await tap("#pyNext"); await wait(450); }
    await tap("#pyDone"); await wait(500);
  });
  await step("ouvir: prévia, ranking, tocando agora e fila", async () => {
    await tap("#bnav [data-tab=listen]"); await wait(700); await tap("#prevM"); await wait(400);
    await tap(".mtabs [data-v=rank]"); await wait(300); await tap("#playTop"); await wait(800);
    await tap("#mInfo"); await wait(800); await tap("#qBtn"); await wait(500);
    await p.evaluate(() => document.getElementById("veil").click()); await wait(400); await tap("#npClose"); await wait(400);
  });
  await step("criar playlist", async () => { await tap(".mtabs [data-v=lib]"); await wait(300); await tap("#newPl"); await wait(500); await tap('[data-n="Domingo"]'); await tap("#plOk"); await wait(700); });
  await step("premium e púlpito", async () => { await tap("#bnav [data-tab=premium]"); await wait(700); await tap(".tool2[data-t=pulpito]"); await wait(800); });
  await step("modo pregar", async () => {
    await tap("#goPreach"); await wait(700); await tap("#prNext"); await wait(500); await tap("#prX"); await wait(400);
    await tap(".pcard"); await wait(600); await p.evaluate(() => document.getElementById("veil").click()); await wait(400); await tap("#smClose"); await wait(400);
  });
  await step("aba você e sobre a bíblia", async () => { await tap("#bnav [data-tab=you]"); await wait(700); await tap("#aboutBible"); await wait(500); });

  await browser.close();
  server.close();
  if (problems.length) { console.log("\nProblemas:\n- " + problems.join("\n- ")); process.exit(1); }
  console.log("\nTodas as telas funcionaram sem erros, sem violações de CSP e sem HTML aparecendo como texto");
}

main().catch(e => { console.error(e); server.close(); process.exit(1); });
