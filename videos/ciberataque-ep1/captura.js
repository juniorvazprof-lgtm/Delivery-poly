const { chromium } = require('playwright'); const path=require('path'),fs=require('fs');
const RAIZ=__dirname, FPS=60, OUT=process.argv[2]||'f', SO=process.env.SO, DUR=+(process.env.DUR||5);
const tipos={'.html':'text/html','.js':'application/javascript','.ttf':'font/ttf'};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:720,height:1280},deviceScaleFactor:1.5});
await p.route('http://c.local/**',r=>{const f=path.join(RAIZ,decodeURIComponent(new URL(r.request().url()).pathname));fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f,contentType:tipos[path.extname(f)]||'text/plain'}):r.fulfill({status:404,body:''})});
const erros=[];p.on('pageerror',e=>erros.push(e.message));p.on('console',m=>{if(m.type()==='error')erros.push(m.text())});
await p.goto('http://c.local/cena.html');await p.waitForFunction(()=>window.pronto,null,{timeout:60000}).catch(()=>{});
fs.mkdirSync(OUT,{recursive:true});
const qs=SO?SO.split(',').map(Number):[...Array(Math.round(DUR*FPS)).keys()];
const t0=Date.now();
for(const i of qs){await p.evaluate(t=>seek(t),i/FPS);await p.screenshot({path:`${OUT}/f${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:92,scale:'device'});}
console.log('erros',JSON.stringify(erros),'ms/quadro',(Date.now()-t0)/qs.length|0);await b.close();})();
