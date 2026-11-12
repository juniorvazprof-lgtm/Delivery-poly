// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Card */
import { persist } from "../../core/persist";
import { store } from "../../core/state";
import { openReader } from "../bible/reader";
import { todayLabel } from "../daily/daily";
import { feed } from "./feed";
import { setFilter } from "./filter";
import { bump } from "./recommend";
import { openMenu } from "./verse-menu";
import { albumOf, trackFor } from "../music/catalog";
import { openPlayer } from "../music/library";
import { openPray } from "../prayer/prayer";
import { openShare } from "../share/share";
import { heartAt, toast, vibrate } from "../../ui/effects";
import { IC, ICON } from "../../ui/icons";

export function makeCard(v,first,daily){
  const c=document.createElement("section");c.className="card"+(daily?" daily":"");c._v=v;
  const words=v.x.split(" "),len=v.x.length;
  const size=len<60?"clamp(2rem,8.4vw,3.2rem)":len<110?"clamp(1.6rem,6.6vw,2.6rem)":"clamp(1.35rem,5.4vw,2.1rem)";
  const tr=trackFor(v);const isL=store.liked.has(v.r),isS=store.saved.includes(v.r);
  c.innerHTML=`<div class="inner" style="--n:${words.length}">
    ${daily?`<div class="daily-badge"><i></i>Versículo do dia</div><p class="daily-meta">${todayLabel()}${store.streak.n>1?` · <span class="streak">${store.streak.n} dias seguidos</span>`:""}</p>`:""}
    <button class="theme" aria-label="Ver só versículos sobre ${v.t[0]}">${v.t[0]}</button>
    <blockquote style="font-size:${size}">${words.map((w,i)=>`<span class="w" style="--i:${i}">${w}</span>`).join(" ")}</blockquote>
    <cite><b>${v.r}</b> · <button class="read">Ler capítulo ›</button></cite>
    ${daily?`<button class="remind pray-btn">${IC("candle")}Orar com este versículo</button>`:""}</div>
   <div class="rail">
    <button class="act heart ${isL?"on":""}" aria-pressed="${isL}" aria-label="Curtir">${ICON.heart}<span>Amém</span></button>
    <button class="act save ${isS?"on":""}" aria-pressed="${isS}" aria-label="Salvar">${ICON.save}<span>Salvar</span></button>
    <div class="sep"></div>
    <button class="act send" aria-label="Enviar">${ICON.send}<span>Enviar</span></button>
    <button class="act more" aria-label="Mais opções">${ICON.more}<span>Mais</span></button>
    <button class="disc" style="--c1:${albumOf(tr).colors[0]};--c2:${albumOf(tr).colors[1]}" aria-label="Ouvir ${tr.t}"></button>
   </div><div class="music"><span class="eq"><i></i><i></i><i></i></span><b>${tr.t} · ${albumOf(tr).name}</b></div>${first?'<div class="hint">deslize ↑<small>toque duas vezes para curtir</small></div>':""}`;
  c.querySelector(".heart").onclick=()=>toggleLike(c);
  c.querySelector(".save").onclick=()=>toggleSave(c);
  c.querySelector(".send").onclick=()=>{openShare(v);bump(v,5)};
  c.querySelector(".read").onclick=()=>openReader(v);
  c.querySelector(".disc").onclick=()=>openPlayer(tr,true);
  if(daily)c.querySelector(".pray-btn").onclick=()=>openPray(v);
  c.querySelector(".more").onclick=()=>openMenu(v);
  c.querySelector(".theme").onclick=()=>setFilter(v.t[0]);
  // gestos: toque simples = modo foco, toque duplo = curtir, segurar = menu
  let last=0,timer=null,single=null,sx=0,sy=0,moved=false,held=false;
  c.addEventListener("contextmenu",e=>e.preventDefault());
  c.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;sx=e.clientX;sy=e.clientY;moved=false;held=false;
    timer=setTimeout(()=>{held=true;vibrate(12);openMenu(v)},550)});
  c.addEventListener("pointermove",e=>{if(Math.hypot(e.clientX-sx,e.clientY-sy)>10){moved=true;clearTimeout(timer)}});
  c.addEventListener("pointercancel",()=>{moved=true;clearTimeout(timer)});
  c.addEventListener("pointerup",e=>{clearTimeout(timer);if(e.target.closest("button")||moved||held)return;
    const n=Date.now();
    if(n-last<300){clearTimeout(single);last=0;heartAt(e.clientX,e.clientY);if(!store.liked.has(v.r))toggleLike(c)}
    else{last=n;single=setTimeout(()=>{if(document.body.classList.contains("focus"))document.body.classList.remove("focus")},300)}});
  return c;
}
export function sparks(btn){for(let i=0;i<8;i++){const s=document.createElement("i");s.className="spark";s.style.setProperty("--a",i*45+"deg");btn.appendChild(s);setTimeout(()=>s.remove(),650)}}
export function toggleLike(c){const v=c._v,b=c.querySelector(".heart");
  if(store.liked.has(v.r)){store.liked.delete(v.r);b.classList.remove("on","pop");bump(v,-3)}
  else{store.liked.add(v.r);b.classList.remove("pop");void b.offsetWidth;b.classList.add("on","pop");sparks(b);vibrate(10);bump(v,3)}
  b.setAttribute("aria-pressed",store.liked.has(v.r));persist()}
export function toggleSave(c,silent){const v=c._v,b=c.querySelector(".save");
  if(store.saved.includes(v.r)){store.saved=store.saved.filter(r=>r!==v.r);b.classList.remove("on");if(!silent)toast("Removido dos Salvos")}
  else{store.saved.unshift(v.r);b.classList.add("on");bump(v,4);vibrate(8);toast("Guardado em Salvos")}
  b.setAttribute("aria-pressed",store.saved.includes(v.r));persist()}
export function syncCards(){feed.querySelectorAll(".card:not(.ad)").forEach(c=>{const r=c._v.r;
  c.querySelector(".heart").classList.toggle("on",store.liked.has(r));c.querySelector(".save").classList.toggle("on",store.saved.includes(r))})}
