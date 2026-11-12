/* Oração do dia */
import type { PrayerStep, Verse } from "../../types";
import { raw, setHTML } from "../../utils/html";
import { byId, byIdMaybe, qa } from "../../utils/dom";
import { html } from "../../utils/html";
import { store } from "../../core/state";
import { V } from "../../data/verses";
import { S } from "../../services/storage";
import { heartAt, toast, vibrate } from "../../ui/effects";
import { IC } from "../../ui/icons";
import { closeSheet, openSheet, sheet } from "../../ui/sheet";
import { SB, soon } from "../../ui/soon";

export const prayEl=byId("pray"),pyPage=byId("pyPage");
/** Um versículo curtido que combine com os temas (ou, na falta, um do feed). */
export function pickLiked(tags:string[],used:string[]):Verse{const L=V.filter(v=>store.liked.has(v.r)&&!used.includes(v.r));
  return L.find(v=>v.t.some(t=>tags.includes(t)))||L[0]||V.find(v=>v.t.some(t=>tags.includes(t))&&!used.includes(v.r))||V[0]}
/** Oração guiada. Se vier um versículo (o do dia), ela começa por ele. */
export function openPray(dv?:Verse|null){if(!dv||!dv.x)dv=null;const used:string[]=dv?[dv.r]:[];const mk=(k:string,title:string,tags:string[],prompt:string):PrayerStep=>{const v=pickLiked(tags,used);used.push(v.r);return{k,title,v,prompt}};
  store.pSteps=[dv?{k:"Ouça",title:"Comece com a palavra de hoje",v:dv,prompt:"Leia devagar, duas vezes. Que palavra chamou sua atenção? Fale com Deus sobre ela."}:mk("Agradeça","Comece agradecendo",["gratidão","alegria","amor","graça"],"Agradeça a Deus por algo de hoje, por menor que pareça. Fale com suas palavras."),
    mk("Entregue","Entregue o que pesa",["ansiedade","paz","descanso","cuidado"],"Conte a Deus o que está pesando no seu coração e deixe isso com ele."),
    mk("Peça","Peça direção",["força","coragem","fé","confiança","esperança","propósito"],"Peça força e direção para o que vem pela frente, para você e para quem você ama.")];
  store.pStep=0;renderPray();prayEl.classList.add("open");document.body.classList.remove("focus")}
export function renderPray(){const n=store.pSteps.length+2,mine=V.some(v=>store.liked.has(v.r));
  let body;
  if(store.pStep===0)body=html`<div class="step"><span class="k">Antes de começar</span><h3>Respire fundo e acalme o coração</h3><div class="breath">respire</div>
     <p class="prompt">${mine?"Hoje você vai orar com versículos que você curtiu.":"Curta versículos no feed para que suas orações usem as palavras que mais tocam você."}</p>
     <button class="primary" id="pyNext">Começar a oração</button></div>`;
  else if(store.pStep<=store.pSteps.length){const s=store.pSteps[store.pStep-1];
    body=html`<div class="step"><span class="k">${store.pStep} de ${store.pSteps.length} · ${s.k}</span><h3>${s.title}</h3>
     <blockquote>“${s.v.x}”<cite><b>${s.v.r}</b>${store.liked.has(s.v.r)?" · você curtiu":""}</cite></blockquote>
     <p class="prompt">${s.prompt}</p><button class="primary" id="pyNext">${store.pStep<store.pSteps.length?"Continuar":"Concluir"}</button></div>`}
  else{const c=S.get("lumen.prayCount",0)+1;S.set("lumen.prayCount",c);
    body=html`<div class="step" data-style="text-align:center;align-items:center"><div class="crown heartc">${IC("heart")}</div><h3>Amém</h3>
     <p class="prompt">Esta foi sua ${c}ª oração no Lumen.${store.prayAt?` Amanhã às ${store.prayAt} tem mais.`:""}</p>
     <button class="sec" id="pyTime" data-style="width:100%">${SB} Lembrar todo dia</button><button class="primary" id="pyDone" data-style="width:100%">Voltar ao feed</button></div>`;
    setTimeout(()=>heartAt(innerWidth/2,innerHeight*.35),300)}
  setHTML(pyPage, html`<div class="dots">${Array.from({length:n},(_,i)=>html`<i class="${i<=store.pStep?"on":""}"></i>`)}</div>${body}`);
  const nx=byIdMaybe("pyNext");if(nx)nx.onclick=()=>{store.pStep++;vibrate(6);renderPray()};
  const dn=byIdMaybe("pyDone");if(dn)dn.onclick=closePray;
  const tm=byIdMaybe("pyTime");if(tm)tm.onclick=()=>soon("Lembretes")}
export function closePray(){prayEl.classList.remove("open")}
export function openPrayTime(){const T=["06:00","07:00","12:00","18:00","21:00","22:00"];let pick=store.prayAt||"07:00";
  const v=V.find(x=>store.liked.has(x.r))||V[0];
  openSheet(html`<h2>Hora da sua oração</h2><p class="sub">Todo dia, no horário escolhido, você recebe um convite para orar com um versículo que você curtiu.</p>
   <div class="notif"><span class="ic">${IC("candle")}</span><div><b>Hora da sua oração</b> <small id="nT">${pick}</small><p>“${v.x.length>70?v.x.slice(0,70)+"…":v.x}” ${v.r}</p></div></div>
   <div class="times">${T.map(t=>html`<button class="chip ${t===pick?"on":""}" data-t="${t}">${t}</button>`)}</div>
   <button class="primary" id="okP">Ativar oração diária</button>${store.prayAt?raw('<button class="ghost" id="offP">Desativar</button>'):""}`,"Horário da oração");
  qa(sheet, ".times .chip").forEach(b=>b.onclick=()=>{pick=b.dataset.t||pick;byId("nT").textContent=pick;qa(sheet, ".times .chip").forEach(x=>x.classList.toggle("on",x===b))});
  byId("okP").onclick=async()=>{try{if("Notification"in window)await Notification.requestPermission()}catch{}
    store.prayAt=pick;S.set("lumen.prayAt",pick);closeSheet();toast(html`Oração diária às <em>${pick}</em>`);if(prayEl.classList.contains("open"))renderPray()};
  const off=byIdMaybe("offP");if(off)off.onclick=()=>{store.prayAt=null;S.set("lumen.prayAt",null);closeSheet();toast("Oração diária desativada")}}
