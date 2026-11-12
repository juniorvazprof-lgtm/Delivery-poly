/**
 * Offline e desempenho (Playwright, build de produção).
 *   npm run test:offline
 * Confere: service worker ativo, app abrindo sem internet, Bíblia baixada lida sem internet,
 * Púlpito e compartilhar carregados só quando abertos, e feed com limite de cards na memória.
 */
const { chromium, devices } = require("playwright");
const http = require("node:http"), fs = require("node:fs"), path = require("node:path");

const DIST = path.resolve(__dirname, "..", "dist");
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };
const requested = [];
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]); if (rel.endsWith("/")) rel += "index.html";
  requested.push(rel);
  const p = path.join(DIST, rel);
  if (!p.startsWith(DIST) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
let failures = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failures++; };

async function main() {
  await new Promise(r => server.listen(4630, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  await ctx.addInitScript(() => localStorage.setItem("lumen.onb", "1"));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  /* carregamento sob demanda */
  await page.goto("http://localhost:4630/");
  await page.waitForTimeout(1500);
  // Só o que a própria página carregou (o service worker guarda tudo para o modo offline, à parte).
  const lazyBefore = await page.evaluate(() => performance.getEntriesByType("resource").map(e => e.name).filter(n => /assets\/(pulpit|share)-/.test(n)));
  ok(lazyBefore.length === 0, "Púlpito e compartilhar não são baixados ao abrir o app");
  await page.tap(".card.active .send"); await page.waitForTimeout(1800);
  ok(await page.evaluate(() => performance.getEntriesByType("resource").some(e => /assets\/share-/.test(e.name))) && !!(await page.$(".shot img")), "compartilhar é baixado ao tocar em Enviar e gera a imagem");
  await page.evaluate(() => document.getElementById("veil").click()); await page.waitForTimeout(400);
  await page.tap("#bnav [data-tab=premium]"); await page.waitForTimeout(500);
  await page.tap(".tool2[data-t=pulpito]"); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => performance.getEntriesByType("resource").some(e => /assets\/pulpit-/.test(e.name))) && (await page.$eval("#serm", e => e.classList.contains("open"))), "Púlpito é baixado ao ser aberto");
  await page.tap("#smClose"); await page.tap("#bnav [data-tab=feed]"); await page.waitForTimeout(400);

  /* service worker */
  const swReady = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  ok(swReady, "service worker instalado e ativo");
  await page.reload(); await page.waitForTimeout(1500); // a página passa a ser controlada pelo service worker

  /* baixar a Bíblia inteira */
  await page.tap("#bnav [data-tab=you]"); await page.waitForTimeout(800);
  ok(/Baixar/.test(await page.$eval("#offVal", e => e.textContent)), "aba Você oferece baixar a Bíblia");
  await page.tap("#offRow");
  await page.waitForFunction(() => /Guardada/.test(document.getElementById("offVal")?.textContent || ""), null, { timeout: 30000 });
  ok(true, "Bíblia inteira baixada (66 livros)");
  await page.tap("#bnav [data-tab=feed]"); await page.waitForTimeout(400);

  /* sem internet */
  await ctx.setOffline(true);
  await page.reload(); await page.waitForTimeout(2000);
  ok((await page.$$(".card")).length > 0, "sem internet: o app abre e mostra o feed");
  await page.evaluate(() => document.getElementById("feed").scrollBy(0, innerHeight)); await page.waitForTimeout(900);
  await page.tap(".card.active .read"); await page.waitForTimeout(1500);
  ok((await page.$$eval("#rPage .vv", n => n.length)) > 1, "sem internet: lê o capítulo inteiro da Bíblia guardada");
  await page.tap("#rClose"); await page.waitForTimeout(400);
  await page.tap("#bnav [data-tab=premium]"); await page.waitForTimeout(500);
  await page.tap(".tool2[data-t=pulpito]"); await page.waitForTimeout(1200);
  ok(await page.$eval("#serm", e => e.classList.contains("open")), "sem internet: o Púlpito abre (guardado pelo service worker)");
  await page.tap("#smClose"); await page.tap("#bnav [data-tab=feed]");
  await ctx.setOffline(false);

  /* limite de cards no feed */
  await page.reload(); await page.waitForTimeout(1500);
  let maxCards = 0;
  for (let i = 0; i < 45; i++) {
    await page.evaluate(() => document.getElementById("feed").scrollBy(0, innerHeight));
    await page.waitForTimeout(260);
    maxCards = Math.max(maxCards, await page.$$eval("#feed .card", n => n.length));
  }
  const state = await page.evaluate(() => {
    const feed = document.getElementById("feed"), act = feed.querySelector(".card.active");
    const r = act ? act.getBoundingClientRect() : null;
    return { cards: feed.children.length, onScreen: !!r && Math.abs(r.top) < 5 };
  });
  ok(maxCards <= 28, `feed com limite de cards na memória (máximo visto: ${maxCards})`);
  ok(state.onScreen, "o versículo atual continua na tela depois da limpeza (sem salto)");
  ok(errors.length === 0, "sem erros de script" + (errors.length ? ": " + errors.join(" | ") : ""));

  await browser.close(); server.close();
  console.log(failures ? `\n${failures} teste(s) falharam` : "\nOffline e desempenho: tudo certo");
  process.exit(failures ? 1 : 0);
}
main().catch(e => { console.error(e); server.close(); process.exit(1); });
