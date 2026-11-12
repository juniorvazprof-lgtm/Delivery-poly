// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Versículo do dia */
import { html } from "../../utils/html";
import { store } from "../../core/state";
import { V } from "../../data/verses";
import { feed } from "../feed/feed";
import { S } from "../../services/storage";
import { toast, vibrate } from "../../ui/effects";
import { closeSheet, openSheet, sheet } from "../../ui/sheet";

export const dayKey=d=>d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
export const todayLabel=()=>new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
export function dailyVerse(){const d=new Date(),n=Math.floor(new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()/864e5);return V[(n*7)%V.length]}
export function openRemind(){
  const T=["06:00","07:00","08:00","12:00","18:00","21:00"];let pick=store.remind||"07:00";
  openSheet(`<h2>Um versículo todo dia</h2><p class="sub">Escolha o horário. Você recebe uma notificação curta com a palavra do dia.</p>
   <div class="times">${T.map(t=>`<button class="chip ${t===pick?"on":""}" data-t="${t}">${t}</button>`).join("")}</div>
   <button class="primary" id="okR">Ativar lembrete</button>${store.remind?'<button class="ghost" id="offR">Desativar</button>':""}`,"Lembrete diário");
  sheet.querySelectorAll(".times .chip").forEach(b=>b.onclick=()=>{pick=b.dataset.t;sheet.querySelectorAll(".times .chip").forEach(x=>x.classList.toggle("on",x===b));vibrate(5)});
  document.getElementById("okR").onclick=async()=>{try{if("Notification"in window)await Notification.requestPermission()}catch{}
    store.remind=pick;S.set("lumen.remind",store.remind);closeSheet();refreshRemind();toast(html`Combinado. Todo dia às <em>${pick}</em>`)};
  const off=document.getElementById("offR");if(off)off.onclick=()=>{store.remind=null;S.set("lumen.remind",null);closeSheet();refreshRemind();toast("Lembrete desativado")};
}
export function refreshRemind(){const b=feed.querySelector(".daily .remind:not(.pray-btn)");if(!b)return;b.classList.toggle("on",!!store.remind);
  b.lastChild.textContent=store.remind?"Lembrete às "+store.remind:"Receber todo dia"}
