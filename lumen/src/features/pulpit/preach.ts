/* Modo Pregar */
import { escapeHtml, html, raw, setHTML, type SafeHtml } from "../../utils/html";
import type { Passage, PreachState, Sermon, SermonPart } from "../../types";
import { byId, byIdMaybe, qa } from "../../utils/dom";
import { store } from "../../core/state";
import { S } from "../../services/storage";
import { vibrate } from "../../ui/effects";
import { IP } from "../../ui/icons";
import { mmss } from "../../utils/format";

export const prEl=byId("preach");
/** Bloco da passagem bíblica para ler em voz alta. */
export const pblock=(p:Passage|undefined|null):SafeHtml=>p?html`<div class="ptext"><small>Leia em voz alta</small><q>${p.texto}</q><b>${p.ref}</b></div>`:html``;
/** Texto falado com as indicações de palco "(pausa)" destacadas. O texto é escapado antes de marcar. */
export const cueify=(t:string):SafeHtml=>raw(escapeHtml(t).replace(/\(([^()]{1,60})\)/g,'<span class="cue">($1)</span>'));
export function partHTML(s:Sermon,part:SermonPart):SafeHtml{
  const p=part.ref?s.passagens.find(x=>x.ref===part.ref):undefined;let used=false;
  const paras=String(part.fala).split(/\n+/).map(t=>t.trim()).filter(Boolean).map(t=>{
    if(/\[LEITURA\]/i.test(t)){used=true;
      const pieces=t.split(/\[LEITURA\]/i).map(x=>x.trim()?html`<p>${cueify(x)}</p>`:html``);
      return pieces.flatMap((x,k)=>k?[pblock(p),x]:[x])}
    return [html`<p>${cueify(t)}</p>`]});
  return html`${p&&!used?pblock(p):""}${paras}`}
/** Abre o modo Pregar: uma parte por tela, relógio e letra ajustável. */
export function startPreach(s:Sermon){const fs=S.get<number>("lumen.fs",1.35);const pr:PreachState={s,i:0,el:s.partes.map(()=>0),last:Date.now(),run:true,fs:fs>=1&&fs<=2.2?fs:1.35};store.PR=pr;
  prEl.style.setProperty("--fs",pr.fs+"rem");renderPreach();prEl.classList.add("open");
  try{navigator.wakeLock?.request("screen").then(w=>store.wake=w).catch(()=>{})}catch{}
  clearInterval(pr.iv);pr.iv=window.setInterval(tickPreach,500)}
export function closePreach(){if(!store.PR)return;clearInterval(store.PR.iv);store.PR=null;prEl.classList.remove("open");try{store.wake?.release()}catch{}store.wake=null}
export function tickPreach(){if(!store.PR||!store.PR.run||store.PR.i>=store.PR.s.partes.length){if(store.PR)store.PR.last=Date.now();return}const n=Date.now();store.PR.el[store.PR.i]+=(n-store.PR.last)/1000;store.PR.last=n;paintClock()}
export function paintClock(){const PR=store.PR;if(!PR)return;const s=PR.s,part=s.partes[PR.i];if(!part)return;
  qa(prEl, ".segs i b").forEach((b,k)=>b.style.width=Math.min(1,PR.el[k]/(s.partes[k].min*60))*100+"%");
  const tot=PR.el.reduce((a,b)=>a+b,0),plan=s.partes.reduce((a,b)=>a+ +b.min,0);
  const c=byIdMaybe("prClock");if(c){setHTML(c, html`${mmss(PR.el[PR.i])} <span data-style="color:#9A95A3">/ ${part.min}:00</span><small>Total ${mmss(tot)} de ${plan}:00${PR.run?"":" · pausado"}</small>`);c.classList.toggle("paused",!PR.run)}}
export function renderPreach(){const PR=store.PR;if(!PR)return;const s=PR.s,n=s.partes.length,done=PR.i>=n,part=s.partes[Math.min(PR.i,n-1)];
  setHTML(prEl, html`<div class="ph"><button class="x" id="prX" aria-label="Sair do modo pregar"><svg viewBox="0 0 24 24">${raw(IP.close)}</svg></button>
    <div class="t"><small>${done?"Fim":`Parte ${PR.i+1} de ${n}`}</small><b>${done?s.titulo:part.nome}</b></div>
    <div class="fsz"><button id="fsM" aria-label="Diminuir letra">A−</button><button id="fsP" aria-label="Aumentar letra">A+</button></div></div>
   <div class="segs">${s.partes.map((r,k)=>html`<i class="${k===PR.i?"cur":""}" data-style="--w:${r.min}"><b></b></i>`)}</div>
   <div class="pbody" id="pBody">${done?html`<div class="pend"><div class="ok"><svg viewBox="0 0 24 24">${raw(IP.check)}</svg></div><h3>Amém</h3>
      <p>Você pregou por ${mmss(PR.el.reduce((a,b)=>a+b,0))}.</p><button class="primary" id="pBack">Voltar ao Púlpito</button></div>`
    :html`<div class="pin">${partHTML(s,part)}</div>`}</div>
   ${done?"":html`<div class="pfoot"><button class="pnav" id="prPrev" aria-label="Parte anterior" ${PR.i?"":"disabled"}><svg viewBox="0 0 24 24">${raw(IP.back)}</svg></button>
    <button class="clock" id="prClock" aria-label="Pausar ou continuar o tempo"></button>
    <button class="pnav nx" id="prNext" aria-label="${PR.i<n-1?"Próxima parte":"Concluir"}"><svg viewBox="0 0 24 24">${PR.i<n-1?raw(IP.chev):raw(IP.check)}</svg></button></div>`}`);
  byId("prX").onclick=closePreach;
  byId("fsM").onclick=()=>setFs(-.1);byId("fsP").onclick=()=>setFs(.1);
  const b=byIdMaybe("pBack");if(b)b.onclick=closePreach;
  if(!done){byId("prPrev").onclick=()=>goPart(-1);byId("prNext").onclick=()=>goPart(1);
    byId("prClock").onclick=()=>{PR.run=!PR.run;PR.last=Date.now();paintClock()};paintClock();
    const body=byId("pBody");let x0:number|null=null,y0=0;
    body.onpointerdown=e=>{x0=e.clientX;y0=e.clientY};
    body.onpointerup=e=>{if(x0===null)return;const dx=e.clientX-x0,dy=e.clientY-y0;x0=null;if(Math.abs(dx)>70&&Math.abs(dy)<50)goPart(dx<0?1:-1)}}}
/* Teclado no modo Pregar (registrado quando o módulo carrega) */
document.addEventListener("keydown",e=>{if(!store.PR)return;if(e.key==="ArrowRight")goPart(1);else if(e.key==="ArrowLeft")goPart(-1);else if(e.key==="Escape")closePreach()});
export function goPart(d:number){if(!store.PR)return;const n=store.PR.s.partes.length,j=store.PR.i+d;if(j<0||j>n)return;store.PR.i=j;store.PR.last=Date.now();vibrate(6);renderPreach()}
export function setFs(d:number){const PR=store.PR;if(!PR)return;PR.fs=Math.max(1,Math.min(2.2,+(PR.fs+d).toFixed(2)));S.set("lumen.fs",PR.fs);prEl.style.setProperty("--fs",PR.fs+"rem")}
