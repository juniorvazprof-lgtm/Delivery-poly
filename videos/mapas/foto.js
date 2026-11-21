const { chromium } = require('playwright'); const path=require('path'),fs=require('fs');
const tipos={'.html':'text/html','.js':'application/javascript','.ttf':'font/ttf','.json':'application/json'};
const casos=[['1','cyber',1080,1920],['4','cyber',1080,1920],['2','cyber',1080,1920],['3','vox',1080,1920],['5','vox',1920,1080],['5','cyber',1920,1080]];
(async()=>{const b=await chromium.launch();
for(const [c,e,w,h] of casos){const p=await b.newPage({viewport:{width:w,height:h}});
await p.route('http://m.local/**',r=>{const f=path.join(__dirname,decodeURIComponent(new URL(r.request().url()).pathname));fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f,contentType:tipos[path.extname(f)]||'text/plain'}):r.fulfill({status:404,body:''})});
const er=[];p.on('pageerror',x=>er.push(x.message));
await p.goto(`http://m.local/mapa.html?cena=${c}&estilo=${e}&w=${w}&h=${h}`);await p.waitForFunction(()=>window.pronto,null,{timeout:30000}).catch(()=>er.push('timeout'));
await p.screenshot({path:`/home/user/Delivery-poly/videos/mapas/mapa-${c}-${e}.png`});console.log(c,e,er.join(';'));await p.close();}
await b.close();})();
