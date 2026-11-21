const { chromium } = require('playwright'); const path=require('path'),fs=require('fs');
const RAIZ=__dirname, FPS=+(process.env.FPS||60), OUT=process.argv[2]||'f60', SO=process.env.SO;
const tipos={'.html':'text/html','.js':'application/javascript','.ttf':'font/ttf'};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1.5});
await p.route('http://c.local/**',r=>{const f=path.join(RAIZ,decodeURIComponent(new URL(r.request().url()).pathname));fs.existsSync(f)?r.fulfill({path:f,contentType:tipos[path.extname(f)]||'text/plain'}):r.fulfill({status:404,body:''})});
const erros=[];p.on('pageerror',e=>erros.push(e.message));
await p.goto('http://c.local/cena.html');await p.waitForFunction(()=>window.pronto);await p.waitForTimeout(300);
fs.mkdirSync(OUT,{recursive:true});
const quadros=SO?SO.split(',').map(Number):[...Array(Math.round(10*FPS)).keys()];
for(const i of quadros){await p.evaluate(t=>seek(t),i/FPS);await p.screenshot({path:`${OUT}/f${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:92});}
console.log('erros',JSON.stringify(erros));await b.close();})();
