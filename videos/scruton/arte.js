const { chromium } = require('playwright'); const path=require('path'),fs=require('fs');
const tipos={'.html':'text/html','.woff2':'font/woff2'}; const D=__dirname;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.route('http://a.local/**',r=>{const f=path.join(D,'..',decodeURIComponent(new URL(r.request().url()).pathname));fs.existsSync(f)?r.fulfill({path:f,contentType:tipos[path.extname(f)]||'text/plain'}):r.fulfill({status:404,body:''})});
await p.goto('http://a.local/ed/arte.html');await p.evaluate(()=>document.fonts.ready);
const ws=['POR','QUE','DEUS','PERMITE','O','SOFRIMENTO?'];
for(let n=1;n<=ws.length;n++){await p.evaluate(([ws,n])=>{document.getElementById('hook').innerHTML=ws.map((w,i)=>`<span class="${i>=n?'h':''} ${w.startsWith('SOFR')?'o':''}">${w}</span>`).join(' ')},[ws,n]);
 await p.locator('#hook').screenshot({path:`${D}/hook${n}.png`,omitBackground:true});}
const L=JSON.parse(fs.readFileSync(D+'/../legendas.json'));const ouro=/(sofrimento|pecado|tentação|caímos|reerguer|cruz)/gi;
fs.mkdirSync(D+'/leg',{recursive:true});
for(let i=0;i<L.length;i++){await p.evaluate(t=>{document.getElementById('leg').innerHTML=t},L[i].pt.replace(ouro,'<span class="o">$1</span>'));await p.locator('#leg').screenshot({path:`${D}/leg/${i}.png`,omitBackground:true});}
for(const id of ['cruz','frase','logo','selo']) await p.locator('#'+id).screenshot({path:`${D}/${id}.png`,omitBackground:true});
await b.close();console.log('ok');})();
