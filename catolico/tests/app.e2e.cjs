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
  // feed misturado, trilho, compartilhar, salvos, favoritas e intenções
  await p.tap("#bnav [data-tab=hoje]"); await p.waitForTimeout(500);
  ok(await p.$(".card.onb") !== null, "primeira visita pergunta o que a pessoa busca");
  await p.evaluate(() => { document.querySelector(".chip").click(); document.getElementById("onbOk").click(); });
  const n0 = (await p.$$("#feed [data-card]")).length; ok(n0 >= 10, `feed com cartões misturados (${n0})`);
  await p.evaluate(() => { const f = document.getElementById("feed"); f.scrollTop = f.scrollHeight; }); await p.waitForTimeout(700);
  const n1 = (await p.$$("#feed [data-card]")).length; ok(n1 > n0, `feed infinito carrega mais (${n0}→${n1})`);
  const mix = await p.evaluate(() => [...document.querySelectorAll("#feed [data-card]")].filter(c => /^(jac|sab|mis|san|ora|cat):/.test(c.dataset.card)).length);
  ok(mix >= 6, "cartões de vários tipos no feed");
  await p.evaluate(() => document.querySelector('#feed .t-sabia [data-a=salvar], #feed .t-jac [data-a=salvar], #feed .t-sant [data-a=salvar]').click());
  await p.evaluate(() => document.querySelector('#feed [data-card^="dia:"] [data-a=amem]').click());
  ok(await p.$('#feed [data-card^="dia:"] [data-a=amem].on') !== null, "Amém marca o cartão");
  await p.evaluate(() => document.querySelector('#feed [data-card^="dia:"] [data-a=enviar]').click()); await p.waitForTimeout(1500);
  const img = await p.$eval("#sheet .shot img", i => i.naturalWidth).catch(() => 0); ok(img === 1080, "imagem para compartilhar 1080×1920");
  await p.evaluate(() => document.getElementById("veil").click());
  await p.tap("#bnav [data-tab=oracoes]"); await p.tap("[data-f=salve]"); ok((await p.$$(".ocards")).length === 5, "favorita aparece no topo das orações");
  await p.tap("#bnav [data-tab=voce]"); await p.fill("#intTxt", "Pela saúde da família"); await p.tap("#intForm button");
  ok((await p.textContent(".intencoes")).includes("saúde"), "intenção de oração guardada");
  ok((await p.$$(".salvo")).length === 1, "cartão salvo aparece em Você");
  // catecismo: pergunta do dia, revelar resposta, leitura por capítulos com nota
  await p.tap("#bnav [data-tab=hoje]"); await p.waitForTimeout(800);
  ok(await p.$(".card.pdia") !== null, "pergunta do dia no Hoje");
  await p.evaluate(() => document.querySelector(".card.pdia [data-rev]").click());
  ok(await p.$eval(".card.pdia .resp-cat", e => !e.hidden && e.textContent.length > 10), "toque revela a resposta");
  await p.tap("#bnav [data-tab=oracoes]"); await p.tap("#abrirCat"); await p.waitForTimeout(400);
  ok(/Você leu 1 de 430/.test(await p.textContent("#app")), "catecismo mostra o progresso");
  await p.evaluate(() => [...document.querySelectorAll("[data-cap]")].find(b => b.textContent.includes("A Igreja e a comunhão")).click()); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('details.qa[data-n="125"] summary').click());
  ok((await p.textContent('details.qa[data-n="125"]')).includes("O que a Igreja ensina hoje"), "pergunta com divergência traz a nota do CIC");
  // quiz dos sacramentos com chips do CIC
  await p.tap("#bnav [data-tab=hoje]"); await p.waitForTimeout(500);
  for (let k = 0; k < 40 && !(await p.$(".card.t-quiz")); k++) { await p.evaluate(() => { const f = document.getElementById("feed"); f.scrollTop = f.scrollHeight; }); await p.waitForTimeout(250); }
  ok(await p.$(".card.t-quiz") !== null, "quiz aparece no feed");
  await p.evaluate(() => document.querySelector(".card.t-quiz [data-op]").click());
  ok(await p.$eval(".card.t-quiz", s => s.classList.contains("respondido") && !!s.querySelector(".op.certa") && !s.querySelector(".feedback").hidden), "quiz mostra a certa e a explicação");
  ok(/vatican\.va\/archive\/cathechism_po\/index_new\/p2s/.test(await p.$eval(".card.t-quiz .feedback a.cic", a => a.href)), "chip CIC leva à página oficial");
  ok(errs.length === 0, "sem erros de script" + (errs.length ? ": " + errs.join(" | ") : ""));
  await b.close(); server.close(); if (falhas) process.exit(1); console.log("\nTudo certo");
})();
