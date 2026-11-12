// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Tocando agora */
import { goTab } from "../../app/navigation";
import { store } from "../../core/state";
import { rewardSheet } from "../monetization/offers";
import { albumOf, coverStyle } from "./catalog";
import { Q, T, cov, nextTrack, npPage, prevTrack, renderLib, shuffleArr, toggleSongLike } from "./library";
import { updateMini } from "./mini-player";
import { I, P, PREVIEW, canFull, elapsed, pause, resume, rewardsLeft } from "./playback";
import { enableDrag } from "../../ui/drag";
import { toast, vibrate } from "../../ui/effects";
import { IC, IP } from "../../ui/icons";
import { openSheet, sheet } from "../../ui/sheet";
import { mmss } from "../../utils/format";
import { esc } from "../../utils/text";

export function renderNP(){if(!store.npOpen)return;const tr=P.tr;if(!tr)return;const al=albumOf(tr),lk=store.songLikes.includes(tr.id),nx=Q.ids[Q.i+1]?T(Q.ids[Q.i+1]):null;
  document.getElementById("npSrc").textContent=Q.src?"Tocando de "+Q.src:"Tocando agora";
  npPage.innerHTML=`<div class="now">
    <div class="cover lg cur" style="${coverStyle(al)}"><small>Lumen Originals</small>${al.name}</div>
    <div class="ttlrow"><div class="ttl"><h3>${tr.t}</h3><p>${al.name} · ${tr.ref}</p></div><button class="hb big ${lk?"on":""}" data-h="${tr.id}" id="npLike" aria-label="Curtir música">${IC("heart")}</button></div>
    <div class="bar" id="pBar"><i></i></div><div class="t2"><span id="pE">0:00</span><span id="pD">${mmss(tr.dur)}</span></div>
    <div class="ctrls"><button id="pShuf" class="tog ${Q.shuffle?"on":""}" aria-label="Aleatório" aria-pressed="${Q.shuffle}"><svg viewBox="0 0 24 24"><path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.6 0 2.6-1.6 3.5-3.4M13 10.4c.9-1.8 1.9-3.4 3.5-3.4H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/></svg></button>
     <button id="pPrev" aria-label="Anterior">${I.prev}</button><button class="pp" id="pPP" aria-label="Tocar ou pausar">${P.playing?I.pause:I.play}</button><button id="pNext" aria-label="Próxima">${I.next}</button>
     <button id="pRep" class="tog ${Q.repeat!=="off"?"on":""}" aria-label="Repetir: ${Q.repeat==="one"?"esta música":Q.repeat==="all"?"tudo":"desligado"}"><svg viewBox="0 0 24 24"><path d="M5 11V9.5A2.5 2.5 0 0 1 7.5 7H19M16.5 4.5 19 7l-2.5 2.5M19 13v1.5a2.5 2.5 0 0 1-2.5 2.5H5M7.5 19.5 5 17l2.5-2.5"/></svg>${Q.repeat==="one"?'<em>1</em>':""}</button></div>
    <button class="pill" id="pill"></button>
    <div class="lyrics" aria-label="Letra"><div id="ly">${tr.ly.map(l=>`<p>${l}</p>`).join("")}</div></div>
    <button class="qbtn" id="qBtn">${IC("disc")}<span><small>A seguir</small><b>${nx?nx.t:"Nada na fila"}</b></span><em>Fila · ${Math.max(0,Q.ids.length-Q.i-1)}</em></button></div>`;
  const $=id=>document.getElementById(id);
  $("pPP").onclick=()=>{P.playing?pause():resume();renderNP()};$("pNext").onclick=()=>nextTrack(true);$("pPrev").onclick=prevTrack;
  $("pShuf").onclick=()=>{Q.shuffle=!Q.shuffle;if(Q.shuffle){const rest=shuffleArr(Q.ids.slice(Q.i+1));Q.ids=[...Q.ids.slice(0,Q.i+1),...rest]}vibrate(5);toast(Q.shuffle?"Aleatório ligado":"Aleatório desligado");renderNP()};
  $("pRep").onclick=()=>{Q.repeat={off:"all",all:"one",one:"off"}[Q.repeat];vibrate(5);toast({all:"Repetir tudo",one:"Repetir esta música",off:"Repetir desligado"}[Q.repeat]);renderNP()};
  $("npLike").onclick=e=>toggleSongLike(tr.id,e.currentTarget);
  $("pill").onclick=()=>{if(!store.premium&&rewardsLeft()>0)rewardSheet();else if(!store.premium)goTab("premium")};
  $("qBtn").onclick=openQueue;refreshPlayer()}
export function openQueue(){const up=Q.ids.slice(Q.i+1);
  openSheet(`<h2>Fila</h2><p class="sub">${Q.src?"Tocando de "+esc(Q.src):"Sua sequência"}</p>
   <div class="label">Tocando agora</div><div class="qrow cur">${cov(albumOf(P.tr),"sm")}<span class="tt"><b>${P.tr.t}</b><small>${albumOf(P.tr).name}</small></span></div>
   <div class="label" style="margin-top:16px">A seguir</div>
   ${up.length?`<div class="qlist">${up.map((id,k)=>`<div class="qrow" data-t="${id}"><span class="grip" aria-label="Arrastar"><svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg></span>${cov(albumOf(T(id)),"sm")}<span class="tt"><b>${T(id).t}</b><small>${albumOf(T(id)).name}</small></span><button class="rm" data-k="${k}" aria-label="Tirar da fila"><svg viewBox="0 0 24 24">${IP.close}</svg></button></div>`).join("")}</div>`
     :`<div class="empty">A fila está vazia. Use <b>⋯ → Adicionar à fila</b> em qualquer música.</div>`}`,"Fila");
  sheet.querySelectorAll(".qrow .rm").forEach(b=>b.onclick=()=>{Q.ids.splice(Q.i+1+ +b.dataset.k,1);openQueue();renderNP()});
  const ql=sheet.querySelector(".qlist");if(ql)enableDrag(ql,ids=>{Q.ids=[...Q.ids.slice(0,Q.i+1),...ids];renderNP()})}
export function renderPlayer(){if(store.playerOpen)renderLib();renderNP();updateMini()}
export function refreshPlayer(){
  if(store.npOpen&&P.tr){const tr=P.tr,e=elapsed(),gated=P.gated,bar=document.getElementById("pBar");
    if(bar){bar.classList.toggle("gated",gated);bar.firstChild.style.width=Math.min(1,gated?e/PREVIEW:e/tr.dur)*100+"%";
      document.getElementById("pE").textContent=mmss(e);document.getElementById("pD").textContent=gated?"0:30 · prévia":mmss(tr.dur);
      document.getElementById("pPP").innerHTML=P.playing?I.pause:I.play;
      const li=Math.min(tr.ly.length-1,Math.floor(e/(tr.dur/tr.ly.length)));
      document.getElementById("ly").style.transform=`translateY(${(1-li)*2.2}em)`;
      document.querySelectorAll("#ly p").forEach((p,k)=>p.classList.toggle("on",k===li));
      document.getElementById("pill").innerHTML=store.musicPreview?"Prévia · <b>louvores originais em breve</b>":store.premium?"Premium · <b>ouça sem limites</b>":canFull()?`Grátis por mais <b>${mmss((store.rewardUntil-Date.now())/1000)}</b>${rewardsLeft()>0?" · <b>+15 min ›</b>":""}`:`Prévias de 30 s · <b>Ouvir 15 min grátis ›</b>`}}}
