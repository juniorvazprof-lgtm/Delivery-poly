// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Modo Pregar */
import { store } from "../../core/state";
import { S } from "../../services/storage";
import { vibrate } from "../../ui/effects";
import { IP } from "../../ui/icons";
import { mmss } from "../../utils/format";
import { esc } from "../../utils/text";

export const prEl=document.getElementById("preach");
export const pblock=p=>p?`<div class="ptext"><small>Leia em voz alta</small><q>${esc(p.texto)}</q><b>${esc(p.ref)}</b></div>`:"";
export const cueify=t=>t.replace(/\(([^()]{1,60})\)/g,'<span class="cue">($1)</span>');
export function partHTML(s,part){const p=part.ref&&s.passagens.find(x=>x.ref===part.ref);let used=false;
  const html=String(part.fala).split(/\n+/).map(t=>t.trim()).filter(Boolean).map(t=>{
    if(/\[LEITURA\]/i.test(t)){used=true;return t.split(/\[LEITURA\]/i).map(x=>x.trim()?`<p>${cueify(esc(x))}</p>`:"").join(pblock(p))}
    return `<p>${cueify(esc(t))}</p>`}).join("");
  return (p&&!used?pblock(p):"")+html}
export function startPreach(s){store.PR={s,i:0,el:s.partes.map(()=>0),last:Date.now(),run:true,fs:S.get("lumen.fs",1.35)};
  prEl.style.setProperty("--fs",store.PR.fs+"rem");renderPreach();prEl.classList.add("open");
  try{navigator.wakeLock?.request("screen").then(w=>store.wake=w).catch(()=>{})}catch{}
  clearInterval(store.PR.iv);store.PR.iv=setInterval(tickPreach,500)}
export function closePreach(){if(!store.PR)return;clearInterval(store.PR.iv);store.PR=null;prEl.classList.remove("open");try{store.wake?.release()}catch{}store.wake=null}
export function tickPreach(){if(!store.PR||!store.PR.run||store.PR.i>=store.PR.s.partes.length){if(store.PR)store.PR.last=Date.now();return}const n=Date.now();store.PR.el[store.PR.i]+=(n-store.PR.last)/1000;store.PR.last=n;paintClock()}
export function paintClock(){const s=store.PR.s,part=s.partes[store.PR.i];if(!part)return;
  prEl.querySelectorAll(".segs i b").forEach((b,k)=>b.style.width=Math.min(1,store.PR.el[k]/(s.partes[k].min*60))*100+"%");
  const tot=store.PR.el.reduce((a,b)=>a+b,0),plan=s.partes.reduce((a,b)=>a+ +b.min,0);
  const c=document.getElementById("prClock");if(c){c.innerHTML=`${mmss(store.PR.el[store.PR.i])} <span style="color:#9A95A3">/ ${part.min}:00</span><small>Total ${mmss(tot)} de ${plan}:00${store.PR.run?"":" · pausado"}</small>`;c.classList.toggle("paused",!store.PR.run)}}
export function renderPreach(){const s=store.PR.s,n=s.partes.length,done=store.PR.i>=n,part=s.partes[Math.min(store.PR.i,n-1)];
  prEl.innerHTML=`<div class="ph"><button class="x" id="prX" aria-label="Sair do modo pregar"><svg viewBox="0 0 24 24">${IP.close}</svg></button>
    <div class="t"><small>${done?"Fim":`Parte ${store.PR.i+1} de ${n}`}</small><b>${esc(done?s.titulo:part.nome)}</b></div>
    <div class="fsz"><button id="fsM" aria-label="Diminuir letra">A−</button><button id="fsP" aria-label="Aumentar letra">A+</button></div></div>
   <div class="segs">${s.partes.map((r,k)=>`<i class="${k===store.PR.i?"cur":""}" style="--w:${r.min}"><b></b></i>`).join("")}</div>
   <div class="pbody" id="pBody">${done?`<div class="pend"><div class="ok"><svg viewBox="0 0 24 24">${IP.check}</svg></div><h3>Amém</h3>
      <p>Você pregou por ${mmss(store.PR.el.reduce((a,b)=>a+b,0))}.</p><button class="primary" id="pBack">Voltar ao Púlpito</button></div>`
    :`<div class="pin">${partHTML(s,part)}</div>`}</div>
   ${done?"":`<div class="pfoot"><button class="pnav" id="prPrev" aria-label="Parte anterior" ${store.PR.i?"":"disabled"}><svg viewBox="0 0 24 24">${IP.back}</svg></button>
    <button class="clock" id="prClock" aria-label="Pausar ou continuar o tempo"></button>
    <button class="pnav nx" id="prNext" aria-label="${store.PR.i<n-1?"Próxima parte":"Concluir"}"><svg viewBox="0 0 24 24">${store.PR.i<n-1?IP.chev:IP.check}</svg></button></div>`}`;
  document.getElementById("prX").onclick=closePreach;
  document.getElementById("fsM").onclick=()=>setFs(-.1);document.getElementById("fsP").onclick=()=>setFs(.1);
  const b=document.getElementById("pBack");if(b)b.onclick=closePreach;
  if(!done){document.getElementById("prPrev").onclick=()=>goPart(-1);document.getElementById("prNext").onclick=()=>goPart(1);
    document.getElementById("prClock").onclick=()=>{store.PR.run=!store.PR.run;store.PR.last=Date.now();paintClock()};paintClock();
    const body=document.getElementById("pBody");let x0=null,y0=0;
    body.onpointerdown=e=>{x0=e.clientX;y0=e.clientY};
    body.onpointerup=e=>{if(x0===null)return;const dx=e.clientX-x0,dy=e.clientY-y0;x0=null;if(Math.abs(dx)>70&&Math.abs(dy)<50)goPart(dx<0?1:-1)}}}
export function goPart(d){if(!store.PR)return;const n=store.PR.s.partes.length,j=store.PR.i+d;if(j<0||j>n)return;store.PR.i=j;store.PR.last=Date.now();vibrate(6);renderPreach()}
export function setFs(d){store.PR.fs=Math.max(1,Math.min(2.2,+(store.PR.fs+d).toFixed(2)));S.set("lumen.fs",store.PR.fs);prEl.style.setProperty("--fs",store.PR.fs+"rem")}
