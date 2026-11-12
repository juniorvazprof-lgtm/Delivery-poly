/**
 * Testes de segurança de ponta a ponta (Playwright).
 *   npm run test:security
 * Sobe o build de produção (com CSP) e o servidor de desenvolvimento (para testar módulos isolados).
 * Requer o Playwright com o Chromium instalado (npx playwright install chromium, se ainda não tiver).
 */
const { chromium, devices } = require("playwright");
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const EVIL = `<img src=x onerror="window.__pwned=(window.__pwned||0)+1">`;
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✓" : "✗"} ${msg}`); if (!cond) failures++; };

function serveDist(port) {
  const types = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript" };
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split("?")[0]);
    if (rel.endsWith("/")) rel += "index.html";
    const p = path.join(DIST, rel);
    if (!p.startsWith(DIST) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

function startDev(port) {
  const p = spawn("npx", ["vite", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "pipe", detached: true });
  return new Promise((resolve, reject) => {
    p.stdout.on("data", d => { if (String(d).includes("Local")) resolve(p); });
    setTimeout(() => reject(new Error("vite dev não iniciou")), 20000);
  });
}

async function main() {
  const dist = await serveDist(4600);
  const dev = await startDev(4601);
  const browser = await chromium.launch();
  try {
    /* 1. Build de produção com CSP: sem violações e telas funcionando */
    {
      const ctx = await browser.newContext({ ...devices["iPhone 13"] });
      const page = await ctx.newPage();
      const problems = [];
      page.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text()); });
      page.on("pageerror", e => problems.push(e.message));
      await page.goto("http://localhost:4600/");
      await page.waitForTimeout(1500);
      ok(!!(await page.$("meta[http-equiv='Content-Security-Policy']")), "build de produção tem CSP");
      await page.tap("#skip");
      await page.waitForTimeout(400);
      await page.tap(".card.active .read");
      await page.waitForTimeout(1200);
      ok((await page.$$eval("#rPage .vv", n => n.length)) > 0, "leitura do capítulo funciona com a CSP ativa");
      const before = problems.length;
      // Simula um ataque: um <script> inserido na página. Com a CSP, ele não pode rodar.
      await page.evaluate(() => { const s = document.createElement("script"); s.textContent = "window.__injected = 1"; document.body.append(s); });
      await page.waitForTimeout(300);
      ok(!(await page.evaluate(() => window.__injected)), "script injetado na página é bloqueado pela CSP");
      const csp = await page.$eval("meta[http-equiv='Content-Security-Policy']", m => m.content);
      ok(!/unsafe-inline|unsafe-eval/.test(csp), "CSP sem 'unsafe-inline' nem 'unsafe-eval'");
      // Simula um estilo injetado por atributo: a CSP precisa bloquear.
      await page.evaluate(() => { const d = document.createElement("div"); d.id = "evilStyle"; d.innerHTML = '<span style="display:block;width:123px">x</span>'; document.body.append(d); });
      ok((await page.$eval("#evilStyle span", s => getComputedStyle(s).width)) !== "123px", "atributo style injetado é bloqueado pela CSP");
      const applied = await page.evaluate(() => {
        const bq = document.querySelector(".card blockquote"), disc = document.querySelector(".card .disc");
        return { font: bq ? parseFloat(getComputedStyle(bq).fontSize) : 0, cover: disc ? getComputedStyle(disc).getPropertyValue("--c1").trim() : "" };
      });
      ok(applied.font > 20 && /^#[0-9a-f]{6}$/i.test(applied.cover), `estilos dinâmicos aplicados por código mesmo sem 'unsafe-inline' (letra ${applied.font}px, capa ${applied.cover})`);
      const legit = problems.slice(0, before);
      ok(legit.length === 0, "nenhuma violação de CSP nem erro no uso normal" + (legit.length ? `: ${legit.join(" | ")}` : ""));
      await ctx.close();
    }

    /* 2. Nome de playlist digitado com código */
    {
      const ctx = await browser.newContext({ ...devices["iPhone 13"] });
      const page = await ctx.newPage();
      await page.goto("http://localhost:4600/");
      await page.waitForTimeout(1200);
      await page.tap("#skip");
      await page.tap("#bnav [data-tab=listen]");
      await page.waitForTimeout(600);
      await page.tap("#prevM");
      await page.tap(".mtabs [data-v=lib]");
      await page.tap("#newPl");
      await page.waitForTimeout(500);
      await page.fill("#plName", EVIL);
      await page.tap("#plOk");
      await page.waitForTimeout(800);
      ok(!(await page.evaluate(() => window.__pwned)), "nome de playlist com <img onerror> não executa código");
      ok((await page.$$("#pPage img")).length === 0, "nome de playlist aparece como texto, sem criar elementos");
      await ctx.close();
    }

    /* 3. Dados adulterados no armazenamento do aparelho */
    {
      const ctx = await browser.newContext({ ...devices["iPhone 13"] });
      await ctx.addInitScript(evil => {
        localStorage.setItem("lumen.onb", "1");
        localStorage.setItem("lumen.pls", JSON.stringify([
          { id: "pl1", name: evil, c: ["red;background:url(x)", "#fff\" onmouseover=\"alert(1)"], ids: ["t1", "nao-existe", evil] },
          { id: "\"><svg onload=alert(1)>", name: "x", c: ["#000000", "#000000"], ids: [] },
        ]));
        localStorage.setItem("lumen.saved2", JSON.stringify(["João 3:16", evil, { x: 1 }]));
        localStorage.setItem("lumen.taste", '{"paz":5,"__proto__":{"polluted":1},"<b>":9,"amor":"muito"}');
        localStorage.setItem("lumen.prayAt", JSON.stringify("07:00\"><img src=x onerror=alert(1)>"));
        localStorage.setItem("lumen.streak", "{isto não é json");
      }, EVIL);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto("http://localhost:4600/");
      await page.waitForTimeout(1500);
      await page.tap("#bnav [data-tab=listen]");
      await page.waitForTimeout(500);
      await page.tap("#prevM");
      await page.tap(".mtabs [data-v=lib]");
      await page.waitForTimeout(500);
      const rows = await page.$$eval("#pPage [data-pl]", n => n.map(x => ({ id: x.dataset.pl, style: x.querySelector(".cover") ? x.querySelector(".cover").getAttribute("style") : "" })));
      ok(rows.length === 1 && rows[0].id === "pl1", "playlist com id inválido descartada");
      ok(!!rows[0] && !/red|url|onmouseover/.test(rows[0].style), "cores adulteradas trocadas por cores padrão");
      await page.tap("#bnav [data-tab=you]");
      await page.waitForTimeout(600);
      ok((await page.$$eval("#yPage .saved-item", n => n.length)) === 1, "salvos: só referências que existem na Bíblia do app");
      ok(!(await page.evaluate(() => window.__pwned || ({}).polluted)), "nenhum código executado e nenhum protótipo poluído");
      ok(errors.length === 0, "app abre normalmente com dados corrompidos" + (errors.length ? `: ${errors.join(" | ")}` : ""));
      await ctx.close();
    }

    /* 4. Resposta maliciosa da IA no Púlpito (módulos testados no servidor de desenvolvimento) */
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto("http://localhost:4601/");
      await page.waitForTimeout(1500);
      const r = await page.evaluate(async evil => {
        const { parseSermon } = await import("/src/security/sermon-schema.ts");
        const { sermonHTML } = await import("/src/features/pulpit/pulpit.ts");
        const { escapeHtml, html } = await import("/src/utils/html.ts");
        const answer = {
          titulo: evil + "Título", ideia_central: "x".repeat(5000), extra: evil,
          passagens: [
            { ref: "João 3:16", texto: evil, quem: evil, para_quem: "a", quando: "b", explicacao: "c", palavras: [{ p: evil, s: "s" }], lembrar: "d" },
            { ref: "<script>alert(1)</script>", texto: "z" },
          ],
          partes: [{ nome: evil, min: 9999, ref: "João 3:16", fala: "Olá‮ invertido " + evil }],
        };
        const s = parseSermon(answer, 15);
        const host = document.createElement("div");
        host.innerHTML = sermonHTML({ ...s, ia: true }).value;
        document.body.append(host);
        await new Promise(res => setTimeout(res, 300));
        return {
          passagens: s.passagens.length, ideia: s.ideia_central.length, min: s.partes[0].min,
          rtl: s.partes[0].fala.includes("‮"), extra: "extra" in s,
          imgs: host.querySelectorAll("img").length, pwned: !!window.__pwned,
          esc: escapeHtml(`<a href="x" onclick='y'>`), nested: html`<b>${[html`<i>${"<x>"}</i>`]}</b>`.value,
        };
      }, EVIL);
      ok(r.passagens === 1, "referência bíblica inválida vinda da IA é descartada");
      ok(r.ideia <= 300 && r.min <= 30, "textos e números da IA limitados");
      ok(!r.rtl && !r.extra, "caracteres de controle e campos desconhecidos removidos");
      ok(r.imgs === 0 && !r.pwned, "HTML vindo da IA é mostrado como texto");
      ok(r.esc === "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;", "escapeHtml cobre aspas simples e duplas");
      ok(r.nested === "<b><i>&lt;x&gt;</i></b>", "html`` aninhado escapa só os dados");
      await ctx.close();
    }
  } finally {
    await browser.close();
    dist.close();
    try { process.kill(-dev.pid); } catch { dev.kill(); } // encerra o npx e o vite
  }
  console.log(failures ? `\n${failures} teste(s) falharam` : "\nTodos os testes de segurança passaram");
  process.exit(failures ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
