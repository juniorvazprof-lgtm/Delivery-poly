/* Aba Você */
import { bibleCachedCount, canWorkOffline, downloadBible } from "../../services/offline";
import type { Verse } from "../../types";
import { html, raw, setHTML } from "../../utils/html";
import { softCase } from "../../utils/text";
import { byId, byIdMaybe, qa } from "../../utils/dom";
import { goTab } from "../../app/navigation";
import { persist } from "../../core/persist";
import { store } from "../../core/state";
import { byRef } from "../../data/verses";
import { syncCards } from "../feed/card";
import { onboarding } from "../onboarding/onboarding";
import { openPray } from "../prayer/prayer";
import { openAboutBible } from "./about";
import { S } from "../../services/storage";
import { toast } from "../../ui/effects";
import { IC, IP } from "../../ui/icons";
import { SB, soon } from "../../ui/soon";

export const youEl=byId("you"),yPage=byId("yPage");
export function openYou(){renderYou();youEl.classList.add("open");document.body.classList.remove("focus")}
export function closeYou(){youEl.classList.remove("open")}
let myTab:"liked"|"saved"="liked",showAll=false;
export function renderYou(){
  const list=store.saved.map(byRef).filter((v):v is Verse=>!!v);
  const liked=[...store.liked].reverse().map(byRef).filter((v):v is Verse=>!!v);
  const shown=myTab==="liked"?liked:list;
  const top=Object.entries(store.taste).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,4),max=top[0]?.[1]||1;
  setHTML(yPage, html`<div class="sw">
   <div class="stats"><div><b>${store.streak.n}</b><small>${store.streak.n===1?"dia":"dias seguidos"}</small></div><div><b>${S.get("lumen.prayCount",0)}</b><small>orações</small></div><button data-mt="liked"><b>${liked.length}</b><small>curtidos</small></button><button data-mt="saved"><b>${list.length}</b><small>salvos</small></button></div>
   <div class="group" id="myVerses"><div class="mtabs mine"><button data-mt="liked" class="${myTab==="liked"?"on":""}">${IC("heart")}Curtidos</button><button data-mt="saved" class="${myTab==="saved"?"on":""}">${IC("save")}Salvos</button></div>
    ${shown.length?shown.slice(0,showAll?999:5).map(v=>html`<div class="saved-item"><div><q>${softCase(v.x)}</q><small>${v.r}</small></div><button class="rm" data-r="${v.r}" aria-label="Remover ${v.r}"><svg viewBox="0 0 24 24">${raw(IP.close)}</svg></button></div>`)
      :raw(myTab==="liked"?'<div class="empty">Toque duas vezes num versículo ou no <b>coração</b> para curti-lo.</div>':'<div class="empty">Toque em <b>Salvar</b> num versículo para guardá-lo aqui.</div>')}
    ${shown.length>5&&!showAll?html`<button class="link more-mine" id="moreMine">Ver todos (${shown.length})</button>`:""}</div>
   <div class="group"><div class="label">Rotina</div>
    <button class="ri" data-a="pray">${IC("candle")}Orar agora<span class="v">${IC("chev")}</span></button>
    <button class="ri" data-a="prayAt">${IC("bell")}Horário da oração<span class="v">${SB}</span></button>
    <button class="ri" data-a="remind">${IC("book")}Lembrete do versículo do dia<span class="v">${SB}</span></button>
    <button class="ri" data-a="nav">${IC("home")}Barra de navegação<span class="v">${document.body.classList.contains("navtop")?"Em cima":"Embaixo"}${IC("chev")}</span></button>
    ${canWorkOffline()?html`<button class="ri" data-a="offline" id="offRow">${IC("book")}Bíblia sem internet<span class="v" id="offVal">…</span></button>`:""}
    <button class="ri" data-a="mood">${IC("mood")}Como estou me sentindo<span class="v">${IC("chev")}</span></button></div>
   ${top.length?html`<div class="group"><div class="label">O que tem tocado você</div><div class="taste">${top.map(([t,s])=>html`<div>${t}<span><i data-style="width:${Math.max(8,s/max*100)}%"></i></span></div>`)}</div></div>`:""}
   <div class="group"><div class="label">Plano</div>
    <button class="ri" data-a="prem">${IC("star")}Lumen Premium<span class="v">${store.premium?"Ativo":"Grátis"}${IC("chev")}</span></button></div>
   <button class="link about" id="aboutBible">${IC("book")}Sobre a Bíblia e as fontes</button></div>`);
  byId("aboutBible").onclick=openAboutBible;
  if(canWorkOffline())refreshOfflineRow();
  qa(yPage, ".ri").forEach(b=>b.onclick=()=>{const a=b.dataset.a;
    if(a==="offline"){startBibleDownload();return}
    if(a==="nav"){const top=!document.body.classList.contains("navtop");document.body.classList.toggle("navtop",top);S.set("lumen.navpos",top?"top":"bottom");renderYou();toast(top?"Barra em cima":"Barra embaixo")}else if(a==="pray")openPray();else if(a==="prayAt"||a==="remind")soon("Lembretes");else if(a==="mood")onboarding();else goTab("premium")});
  qa(yPage, "[data-mt]").forEach(b=>b.onclick=()=>{myTab=b.dataset.mt==="liked"?"liked":"saved";showAll=false;renderYou();byIdMaybe("myVerses")?.scrollIntoView({behavior:"smooth",block:"start"})});
  byIdMaybe("moreMine")?.addEventListener("click",()=>{showAll=true;renderYou()});
  qa(yPage, ".rm").forEach(b=>b.onclick=()=>{const r=b.dataset.r||"";
    if(myTab==="liked")store.liked.delete(r);else store.saved=store.saved.filter(x=>x!==r);persist();syncCards();
    const it=b.closest<HTMLElement>(".saved-item");if(!it)return;it.style.transition=".35s";it.style.opacity="0";it.style.transform="translateX(30px)";setTimeout(renderYou,300)});
}

/* ---------- Bíblia sem internet ---------- */
let downloading=false;
async function refreshOfflineRow(){
  const v=byIdMaybe("offVal");if(!v||downloading)return;
  const n=await bibleCachedCount();
  v.textContent=n>=66?"Guardada ✓":n>0?`${n} de 66 livros`:"Baixar (4 MB)";
}
async function startBibleDownload(){
  const v=byIdMaybe("offVal");if(!v||downloading)return;
  if(!navigator.onLine){toast("Conecte-se à internet para baixar a Bíblia");return}
  downloading=true;
  try{
    const n=await downloadBible((done,total)=>{const el=byIdMaybe("offVal");if(el)el.textContent=`Baixando… ${Math.round(done/total*100)}%`});
    toast(n>=66?"Bíblia guardada. Agora você lê qualquer capítulo sem internet.":"Parte da Bíblia foi guardada. Tente de novo para completar.");
  }catch{toast("O download parou. Tente de novo com uma conexão melhor.")}
  finally{downloading=false;refreshOfflineRow()}
}
