// node captura.js JOB SAIDA FPS ESCALA   (env: QUADROS=1,2,3 | INI/FIM ; DIAG=t1,t2 imprime diagnóstico)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const [job, saida, fps = '30', escala = '1.5'] = process.argv.slice(2);
const tipos = { '.html': 'text/html', '.js': 'application/javascript', '.ttf': 'font/ttf', '.json': 'application/json' };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: +escala });
  await p.route('http://f.local/**', r => {
    let u = decodeURIComponent(new URL(r.request().url()).pathname);
    const f = u.startsWith('/job/') ? path.join(job, u.slice(5)) : path.join(__dirname, u);
    fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f, contentType: tipos[path.extname(f)] || 'text/plain' }) : r.fulfill({ status: 404, body: '' });
  });
  const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto('http://f.local/motor.html?plano=/job/plano.json&job=/job&gl=' + (process.env.GL || '1.5'));
  await p.waitForFunction(() => window.pronto, null, { timeout: 120000 });
  fs.mkdirSync(saida, { recursive: true });
  const F = +fps, dur = await p.evaluate(() => 0) ;
  let qs = process.env.QUADROS ? process.env.QUADROS.split(',').map(Number) : null;
  if (!qs) { const plano = JSON.parse(fs.readFileSync(path.join(job, 'plano.json'))); const tot = Math.ceil(plano.dur * F) + 1;
    const ini = +(process.env.INI || 0), fim = process.env.FIM ? +process.env.FIM : tot; qs = []; for (let i = ini; i < Math.min(fim, tot); i++) qs.push(i); }
  for (const i of qs) { await p.evaluate(t => seek(t), i / F); await p.screenshot({ path: `${saida}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
  for (const t of (process.env.DIAG || '').split(',').filter(Boolean)) console.log(`DIAG ${t}\n` + await p.evaluate(t => diag(t), +t) + '\nFIMDIAG');
  console.log('ERROS ' + JSON.stringify(erros)); await b.close();
})();
