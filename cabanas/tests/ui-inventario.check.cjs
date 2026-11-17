// Teste de interface do inventário (Playwright). Uso: node tests/ui-inventario.check.cjs
// Sobe um servidor simples em http://127.0.0.1:4640 servindo cabanas/ e abre tests/ui-inventario.html.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORTA = 4640;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function servidor() {
  return http.createServer((req, res) => {
    const rel = decodeURIComponent(String(req.url || '/').split('?')[0]);
    const arq = path.join(ROOT, rel === '/' ? '/index.html' : rel);
    if (!arq.startsWith(ROOT) || !fs.existsSync(arq) || !fs.statSync(arq).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404');
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    fs.createReadStream(arq).pipe(res);
  });
}

// Playwright pode estar instalado globalmente (sem NODE_PATH): procura nos caminhos usuais.
function carregarPlaywright() {
  try {
    return require('playwright');
  } catch {
    // tenta o diretório global
  }
  const candidatos = [
    '/opt/node22/lib/node_modules/playwright',
    '/opt/node-tools/node_modules/playwright',
    '/usr/lib/node_modules/playwright',
    '/usr/local/lib/node_modules/playwright',
  ];
  for (const c of candidatos) {
    try {
      if (fs.existsSync(c)) return require(c);
    } catch {
      // tenta o próximo
    }
  }
  // último recurso: pergunta ao npm onde ficam os módulos globais (cache fora do projeto)
  try {
    const raizGlobal = require('child_process')
      .execSync('npm root -g', { encoding: 'utf8', env: { ...process.env, npm_config_cache: require('os').tmpdir() + '/npm-cache' } })
      .trim();
    if (raizGlobal) return require(path.join(raizGlobal, 'playwright'));
  } catch {
    // sem npm: desiste abaixo
  }
  throw new Error('playwright não encontrado (instale globalmente: npm i -g playwright)');
}

// Navegadores do Playwright podem estar fora do cache padrão (imagem com /opt/pw-browsers).
function configurarNavegadores() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return;
  const padrao = path.join(require('os').homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(padrao)) return;
  const alternativas = ['/opt/pw-browsers', '/ms-playwright', '/usr/share/ms-playwright'];
  const achou = alternativas.find((p) => fs.existsSync(p));
  if (achou) process.env.PLAYWRIGHT_BROWSERS_PATH = achou;
}

function falha(msg) {
  throw new Error(msg);
}

function exige(cond, msg) {
  if (!cond) falha(msg);
}

(async () => {
  configurarNavegadores(); // antes do require: o Playwright lê o env ao carregar
  const { chromium } = carregarPlaywright();
  const srv = servidor();
  let nav = null;
  const erros = [];
  try {
    await new Promise((ok, erro) => {
      srv.once('error', erro);
      srv.listen(PORTA, '127.0.0.1', ok);
    });

    nav = await chromium.launch();
    const pag = await nav.newPage({ viewport: { width: 420, height: 900 } });
    pag.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
    pag.on('console', (m) => {
      if (m.type() === 'error') erros.push('console: ' + m.text());
    });

    await pag.goto(`http://127.0.0.1:${PORTA}/tests/ui-inventario.html`, { waitUntil: 'load' });
    await pag.waitForFunction(() => !!window.__inv && window.__inv.aberto(), null, { timeout: 15000 });
    await pag.waitForSelector('#telaInv .inv-painel');

    // ---- 1) número de células ----
    const celInv = await pag.locator('#telaInv .inv-grade-inv .inv-celula').count();
    const celBau = await pag.locator('#telaInv .inv-grade-bau .inv-celula').count();
    exige(celInv === 8, `inventário deveria ter 8 células, tem ${celInv}`);
    exige(celBau === 24, `baú deveria ter 24 células, tem ${celBau}`);

    // ---- 2) espingarda ocupa 2 colunas ----
    const caixaDupla = await pag.locator('.inv-grade-inv .inv-celula[data-id="espingarda"]').boundingBox();
    const caixaSimples = await pag.locator('.inv-grade-inv .inv-celula[data-id="pistola"]').boundingBox();
    exige(!!caixaDupla && !!caixaSimples, 'não achei as células de espingarda/pistola');
    exige(
      caixaDupla.width > caixaSimples.width * 1.6,
      `espingarda deveria ter 2 colunas (${caixaDupla.width}px vs ${caixaSimples.width}px)`,
    );
    const refVisivel = await pag.evaluate(() => {
      const cel = document.querySelector('.inv-grade-inv .inv-celula[data-slot="1"]');
      if (!cel) return 'sem célula ref';
      return getComputedStyle(cel).display !== 'none';
    });
    exige(refVisivel === false, 'o segundo espaço da espingarda não deveria ser desenhado');

    // em 360px de largura a tela ainda precisa caber
    await pag.setViewportSize({ width: 360, height: 800 });
    const caixaPainel = await pag.locator('#telaInv .inv-painel').boundingBox();
    const caixaEstreita = await pag.locator('.inv-grade-inv .inv-celula[data-id="pistola"]').boundingBox();
    exige(caixaPainel.width <= 360, `o painel estourou a tela estreita (${caixaPainel.width}px)`);
    exige(caixaEstreita.width >= 48, `células pequenas demais em 360px (${caixaEstreita.width}px)`);
    await pag.setViewportSize({ width: 420, height: 900 });

    // ---- 3) combinar pano + alcool → curativo ----
    const idxPano = await pag.evaluate(() => window.__inv.inv.slots.findIndex((s) => s && s.id === 'pano'));
    const idxAlcool = await pag.evaluate(() => window.__inv.inv.slots.findIndex((s) => s && s.id === 'alcool'));
    exige(idxPano >= 0 && idxAlcool >= 0, 'pano e alcool deveriam estar no inventário');

    await pag.locator(`.inv-grade-inv .inv-celula[data-slot="${idxPano}"]`).click();
    await pag.locator('#telaInv .inv-detalhe [data-acao="combinar"]').click();
    await pag.locator(`.inv-grade-inv .inv-celula[data-slot="${idxAlcool}"]`).click();

    const depoisCombinar = await pag.evaluate(() => ({
      curativo: window.__inv.contar(window.__inv.inv, 'curativo'),
      pano: window.__inv.contar(window.__inv.inv, 'pano'),
      alcool: window.__inv.contar(window.__inv.inv, 'alcool'),
      msg: (document.querySelector('#telaInv .inv-msg') || {}).textContent || '',
    }));
    exige(depoisCombinar.curativo === 1, 'combinar pano+alcool deveria criar 1 curativo');
    exige(depoisCombinar.pano === 0 && depoisCombinar.alcool === 0, 'combinar deveria consumir pano e alcool');
    exige(depoisCombinar.msg.length > 0, 'deveria haver mensagem depois de combinar');

    // ---- 4) guardar no baú e pegar de volta ----
    const idxCartuchos = await pag.evaluate(() => window.__inv.inv.slots.findIndex((s) => s && s.id === 'cartuchos'));
    exige(idxCartuchos >= 0, 'cartuchos deveriam estar no inventário');
    await pag.locator(`.inv-grade-inv .inv-celula[data-slot="${idxCartuchos}"]`).click();
    await pag.locator('#telaInv .inv-detalhe [data-acao="guardar"]').click();

    const depoisGuardar = await pag.evaluate(() => ({
      inv: window.__inv.contar(window.__inv.inv, 'cartuchos'),
      bau: window.__inv.contar(window.__inv.bau, 'cartuchos'),
    }));
    exige(depoisGuardar.inv === 0, `cartuchos deveriam sair do inventário (tem ${depoisGuardar.inv})`);
    exige(depoisGuardar.bau === 6, `cartuchos deveriam ir para o baú (tem ${depoisGuardar.bau})`);

    await pag.locator('.inv-grade-bau .inv-celula[data-id="cartuchos"]').click();
    await pag.locator('#telaInv .inv-detalhe-bau [data-acao="pegar"]').click();

    const depoisPegar = await pag.evaluate(() => ({
      inv: window.__inv.contar(window.__inv.inv, 'cartuchos'),
      bau: window.__inv.contar(window.__inv.bau, 'cartuchos'),
      velaBau: window.__inv.contar(window.__inv.bau, 'vela'),
    }));
    exige(depoisPegar.inv === 6, `pegar deveria devolver 6 cartuchos ao inventário (tem ${depoisPegar.inv})`);
    exige(depoisPegar.bau === 0, 'o baú não deveria guardar os cartuchos depois de pegá-los');
    exige(depoisPegar.velaBau === 1, 'a vela deveria continuar no baú');

    // ---- 5) fechar com Escape ----
    await pag.keyboard.press('Escape');
    await pag.waitForFunction(() => window.__inv && window.__inv.aberto() === false, null, { timeout: 5000 });
    const fechou = await pag.evaluate(() => ({
      fechados: window.__inv.fechados,
      escondida: document.querySelector('#telaInv').hidden,
      teclaSolta: true,
    }));
    exige(fechou.fechados === 1, `aoFechar deveria ser chamado uma vez (foi ${fechou.fechados})`);
    exige(fechou.escondida === true, 'a tela deveria ficar escondida depois de fechar');

    // ---- 6) usar item e fechar tocando fora ----
    await pag.evaluate(() => window.__inv.abrir());
    await pag.waitForFunction(() => window.__inv.aberto(), null, { timeout: 5000 });
    const idxCurativo = await pag.evaluate(() => window.__inv.inv.slots.findIndex((s) => s && s.id === 'curativo'));
    exige(idxCurativo >= 0, 'o curativo deveria continuar no inventário');
    await pag.locator(`.inv-grade-inv .inv-celula[data-slot="${idxCurativo}"]`).click();
    await pag.locator('#telaInv .inv-detalhe [data-acao="usar"]').click();
    const usou = await pag.evaluate(() => ({
      usados: window.__inv.usados.length,
      msg: (document.querySelector('#telaInv .inv-msg') || {}).textContent || '',
    }));
    exige(usou.usados === 1, 'usar deveria chamar ctx.usar uma vez');
    exige(usou.msg.length > 0, 'usar deveria mostrar a mensagem devolvida por ctx.usar');

    await pag.mouse.click(4, 4); // toca fora do painel
    await pag.waitForFunction(() => window.__inv.aberto() === false, null, { timeout: 5000 });
    const fechadosTotal = await pag.evaluate(() => window.__inv.fechados);
    exige(fechadosTotal === 2, `tocar fora deveria fechar e chamar aoFechar (total ${fechadosTotal})`);

    // ---- 7) console limpo ----
    exige(erros.length === 0, 'erros no console:\n' + erros.join('\n'));

    console.log('ok');
    return 0;
  } catch (e) {
    console.error('FALHOU: ' + (e && e.message ? e.message : e));
    if (erros.length) console.error(erros.join('\n'));
    return 1;
  } finally {
    if (nav) await nav.close().catch(() => {});
    await new Promise((ok) => srv.close(ok));
  }
})().then((codigo) => {
  process.exitCode = codigo;
  process.exit(codigo);
});
