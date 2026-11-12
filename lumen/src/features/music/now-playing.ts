/* Tocando agora */
import { html, raw, setHTML } from "../../utils/html";
import { byId, byIdMaybe, qMaybe, qa } from "../../utils/dom";
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

export function renderNP(){if(!store.npOpen)return;const tr=P.tr;if(!tr)return;const al=albumOf(tr),lk=store.songLikes.includes(tr.id),nx=Q.ids[Q.i+1]?T(Q.ids[Q.i+1]):null;
  byId("npSrc").textContent=Q.src?"Tocando de "+Q.src:"Tocando agora";
  setHTML(npPage, html`<div class="now">
    <div class="cover lg cur" data-style="${coverStyle(al)}"><small>Lumen Originals</small>${al.name}</div>
    <div class="ttlrow"><div class="ttl"><h3>${tr.t}</h3><p>${al.name} · ${tr.ref}</p></div><button class="hb big ${lk?"on":""}" data-h="${tr.id}" id="npLike" aria-label="Curtir música">${IC("heart")}</button></div>
    <div class="bar" id="pBar"><i></i></div><div class="t2"><span id="pE">0:00</span><span id="pD">${mmss(tr.dur)}</span></div>
    <div class="ctrls"><button id="pShuf" class="tog ${Q.shuffle?"on":""}" aria-label="Aleatório" aria-pressed="${Q.shuffle}"><svg viewBox="0 0 24 24"><path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.6 0 2.6-1.6 3.5-3.4M13 10.4c.9-1.8 1.9-3.4 3.5-3.4H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/></svg></button>
     <button id="pPrev" aria-label="Anterior">${I.prev}</button><button class="pp" id="pPP" aria-label="Tocar ou pausar">${P.playing?I.pause:I.play}</button><button id="pNext" aria-label="Próxima">${I.next}</button>
     <button id="pRep" class="tog ${Q.repeat!=="off"?"on":""}" aria-label="Repetir: ${Q.repeat==="one"?"esta música":Q.repeat==="all"?"tudo":"desligado"}"><svg viewBox="0 0 24 24"><path d="M5 11V9.5A2.5 2.5 0 0 1 7.5 7H19M16.5 4.5 19 7l-2.5 2.5M19 13v1.5a2.5 2.5 0 0 1-2.5 2.5H5M7.5 19.5 5 17l2.5-2.5"/></svg>${Q.repeat==="one"?raw('<em>1</em>'):""}</button></div>
    <button class="pill" id="pill"></button>
    <div class="lyrics" aria-label="Letra"><div id="ly">${tr.ly.map(l=>html`<p>${l}</p>`)}</div></div>
    <button class="qbtn" id="qBtn">${IC("disc")}<span><small>A seguir</small><b>${nx?nx.t:"Nada na fila"}</b></span><em>Fila · ${Math.max(0,Q.ids.length-Q.i-1)}</em></button></div>`);
  const $=(id:string)=>byId(id);
  $("pPP").onclick=()=>{P.playing?pause():resume();renderNP()};$("pNext").onclick=()=>nextTrack(true);$("pPrev").onclick=prevTrack;
  $("pShuf").onclick=()=>{Q.shuffle=!Q.shuffle;if(Q.shuffle){const rest=shuffleArr(Q.ids.slice(Q.i+1));Q.ids=[...Q.ids.slice(0,Q.i+1),...rest]}vibrate(5);toast(Q.shuffle?"Aleatório ligado":"Aleatório desligado");renderNP()};
  $("pRep").onclick=()=>{const nextRep={off:"all",all:"one",one:"off"} as const;Q.repeat=nextRep[Q.repeat];vibrate(5);toast({all:"Repetir tudo",one:"Repetir esta música",off:"Repetir desligado"}[Q.repeat]);renderNP()};
  $("npLike").onclick=e=>toggleSongLike(tr.id,e.currentTarget as HTMLElement);
  $("pill").onclick=()=>{if(!store.premium&&rewardsLeft()>0)rewardSheet();else if(!store.premium)goTab("premium")};
  $("qBtn").onclick=openQueue;refreshPlayer()}
export function openQueue(){const cur=P.tr;if(!cur)return;const up=Q.ids.filter((id,k)=>k>Q.i&&!!T(id));const TT=(id:string)=>T(id)!;
  openSheet(html`<h2>Fila</h2><p class="sub">${Q.src?"Tocando de "+Q.src:"Sua sequência"}</p>
   <div class="label">Tocando agora</div><div class="qrow cur">${cov(albumOf(cur),"sm")}<span class="tt"><b>${cur.t}</b><small>${albumOf(cur).name}</small></span></div>
   <div class="label" data-style="margin-top:16px">A seguir</div>
   ${up.length?html`<div class="qlist">${up.map((id,k)=>html`<div class="qrow" data-t="${id}"><span class="grip" aria-label="Arrastar"><svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg></span>${cov(albumOf(TT(id)),"sm")}<span class="tt"><b>${TT(id).t}</b><small>${albumOf(TT(id)).name}</small></span><button class="rm" data-k="${k}" aria-label="Tirar da fila"><svg viewBox="0 0 24 24">${raw(IP.close)}</svg></button></div>`)}</div>`
     :html`<div class="empty">A fila está vazia. Use <b>⋯ → Adicionar à fila</b> em qualquer música.</div>`}`,"Fila");
  qa(sheet, ".qrow .rm").forEach(b=>b.onclick=()=>{Q.ids.splice(Q.i+1+Number(b.dataset.k),1);openQueue();renderNP()});
  const ql=qMaybe(sheet, ".qlist");if(ql)enableDrag(ql,ids=>{Q.ids=[...Q.ids.slice(0,Q.i+1),...ids];renderNP()})}
export function renderPlayer(){if(store.playerOpen)renderLib();renderNP();updateMini()}
export function refreshPlayer(){
  if(store.npOpen&&P.tr){const tr=P.tr,e=elapsed(),gated=P.gated,bar=byIdMaybe("pBar");
    if(bar){bar.classList.toggle("gated",gated);(bar.firstElementChild as HTMLElement).style.width=Math.min(1,gated?e/PREVIEW:e/tr.dur)*100+"%";
      byId("pE").textContent=mmss(e);byId("pD").textContent=gated?"0:30 · prévia":mmss(tr.dur);
      setHTML(byId("pPP"), P.playing?I.pause:I.play);
      const li=Math.min(tr.ly.length-1,Math.floor(e/(tr.dur/tr.ly.length)));
      byId("ly").style.transform=`translateY(${(1-li)*2.2}em)`;
      qa(document, "#ly p").forEach((p,k)=>p.classList.toggle("on",k===li));
      setHTML(byId("pill"), store.musicPreview?html`Prévia · <b>louvores originais em breve</b>`:store.premium?html`Premium · <b>ouça sem limites</b>`:canFull()?html`Grátis por mais <b>${mmss((store.rewardUntil-Date.now())/1000)}</b>${rewardsLeft()>0?raw(" · <b>+15 min ›</b>"):""}`:html`Prévias de 30 s · <b>Ouvir 15 min grátis ›</b>`)}}}
