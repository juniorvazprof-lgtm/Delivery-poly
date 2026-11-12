/* Primeiro acesso: humor */
import { html } from "../../utils/html";
import { byId, qa } from "../../utils/dom";
import { persist } from "../../core/persist";
import { store } from "../../core/state";
import { MOODS } from "../../data/themes";
import { feed, io, more } from "../feed/feed";
import { S } from "../../services/storage";
import { toast, vibrate } from "../../ui/effects";
import { closeSheet, openSheet, sheet } from "../../ui/sheet";

export function onboarding(){
  const sel=new Set<string>();
  openSheet(html`<h2>Como está seu coração hoje?</h2><p class="sub">Escolha até três. Vamos começar o seu feed por aí.</p>
   <div class="chips">${MOODS.map(([l,t])=>html`<button class="chip" data-t="${t}" aria-pressed="false">${l}</button>`)}</div>
   <button class="primary" id="go" disabled>Começar</button><button class="ghost" id="skip">Pular</button>`,"Como você está",()=>S.set("lumen.onb",1));
  const go=byId<HTMLButtonElement>("go");
  qa(sheet, ".chip").forEach(b=>b.onclick=()=>{const t=b.dataset.t||"";
    if(sel.has(t))sel.delete(t);else if(sel.size<3)sel.add(t);else{toast("Escolha até três");return}
    b.classList.toggle("on",sel.has(t));b.setAttribute("aria-pressed",String(sel.has(t)));vibrate(5);go.disabled=!sel.size});
  go.onclick=()=>{sel.forEach(t=>store.taste[t]=Math.max(store.taste[t]||0,8));sel.forEach(t=>store.announced.add(t));persist();closeSheet();
    const i=store.active?[...feed.children].indexOf(store.active):-1;[...feed.children].slice(i+1).forEach(c=>{io.unobserve(c);c.remove()});more(4);
    toast("Pronto. Seu feed começa agora")};
  byId("skip").onclick=closeSheet;
}
