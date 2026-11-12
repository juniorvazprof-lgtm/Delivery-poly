// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Aba Você */
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

export const youEl=document.getElementById("you"),yPage=document.getElementById("yPage");
export function openYou(){renderYou();youEl.classList.add("open");document.body.classList.remove("focus")}
export function closeYou(){youEl.classList.remove("open")}
export function renderYou(){
  const list=store.saved.map(byRef).filter(Boolean);
  const top=Object.entries(store.taste).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,4),max=top[0]?.[1]||1;
  yPage.innerHTML=`<div class="sw">
   <div class="stats"><div><b>${store.streak.n}</b><small>${store.streak.n===1?"dia":"dias seguidos"}</small></div><div><b>${S.get("lumen.prayCount",0)}</b><small>orações</small></div><div><b>${list.length}</b><small>salvos</small></div></div>
   <div class="group"><div class="label">Rotina</div>
    <button class="ri" data-a="pray">${IC("candle")}Orar agora<span class="v">${IC("chev")}</span></button>
    <button class="ri" data-a="prayAt">${IC("bell")}Horário da oração<span class="v">${SB}</span></button>
    <button class="ri" data-a="remind">${IC("book")}Lembrete do versículo do dia<span class="v">${SB}</span></button>
    <button class="ri" data-a="nav">${IC("home")}Barra de navegação<span class="v">${document.body.classList.contains("navtop")?"Em cima":"Embaixo"}${IC("chev")}</span></button>
    <button class="ri" data-a="mood">${IC("mood")}Como estou me sentindo<span class="v">${IC("chev")}</span></button></div>
   ${top.length?`<div class="group"><div class="label">O que tem tocado você</div><div class="taste">${top.map(([t,s])=>`<div>${t}<span><i style="width:${Math.max(8,s/max*100)}%"></i></span></div>`).join("")}</div></div>`:""}
   <div class="group"><div class="label">Salvos</div>
    ${list.length?list.map(v=>`<div class="saved-item"><div><q>${v.x}</q><small>${v.r}</small></div><button class="rm" data-r="${v.r}" aria-label="Remover ${v.r}">${IP.close?`<svg viewBox="0 0 24 24">${IP.close}</svg>`:""}</button></div>`).join("")
      :'<div class="empty">Toque em <b>Salvar</b> num versículo para guardá-lo aqui.</div>'}</div>
   <div class="group"><div class="label">Plano</div>
    <button class="ri" data-a="prem">${IC("star")}Lumen Premium<span class="v">${store.premium?"Ativo":"Grátis"}${IC("chev")}</span></button></div>
   <button class="link about" id="aboutBible">${IC("book")}Sobre a Bíblia e as fontes</button></div>`;
  document.getElementById("aboutBible").onclick=openAboutBible;
  yPage.querySelectorAll(".ri").forEach(b=>b.onclick=()=>{const a=b.dataset.a;
    if(a==="nav"){const top=!document.body.classList.contains("navtop");document.body.classList.toggle("navtop",top);S.set("lumen.navpos",top?"top":"bottom");renderYou();toast(top?"Barra em cima":"Barra embaixo")}else if(a==="pray")openPray();else if(a==="prayAt"||a==="remind")soon("Lembretes");else if(a==="mood")onboarding();else goTab("premium")});
  yPage.querySelectorAll(".rm").forEach(b=>b.onclick=()=>{store.saved=store.saved.filter(r=>r!==b.dataset.r);persist();syncCards();
    const it=b.closest(".saved-item");it.style.transition=".35s";it.style.opacity="0";it.style.transform="translateX(30px)";setTimeout(renderYou,300)});
}
