const { chromium } = require('playwright'); const path=require('path'),fs=require('fs');
const tipos={'.html':'text/html','.woff2':'font/woff2'};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:720,height:400},deviceScaleFactor:1});
await p.route('http://a.local/**',r=>{const f=path.join(__dirname,decodeURIComponent(new URL(r.request().url()).pathname));fs.existsSync(f)?r.fulfill({path:f,contentType:tipos[path.extname(f)]||'text/plain'}):r.fulfill({status:404,body:''})});
await p.goto('http://a.local/arte.html');await p.evaluate(()=>window.pronto);
await p.locator('#logo').screenshot({path:'logo.png',omitBackground:true});
const L=JSON.parse(fs.readFileSync('legendas.json'));fs.mkdirSync('leg',{recursive:true});
for(let i=0;i<L.length;i++){await p.evaluate(t=>{document.getElementById('leg').textContent=t},L[i].pt);await p.locator('#leg').screenshot({path:`leg/${i}.png`,omitBackground:true});}
await b.close();console.log('ok',L.length);})();
