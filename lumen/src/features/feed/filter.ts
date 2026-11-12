/* Filtro por tema */
import { byId, q } from "../../utils/dom";
import { html } from "../../utils/html";
import { store } from "../../core/state";
import { feed, io, more, recent } from "./feed";
import { toast } from "../../ui/effects";

export const fBtn=byId("filter");
/** Mostra só versículos de um tema (ou volta ao feed normal com null). */
export function setFilter(t:string|null){store.filterTag=t;recent.length=0;
  q(fBtn, "span").textContent=t?"Só "+t:"";fBtn.classList.toggle("on",!!t);
  const i=store.active?[...feed.children].indexOf(store.active):-1;[...feed.children].slice(i+1).forEach(c=>{io.unobserve(c);c.remove()});more(4);
  if(t){toast(html`Mostrando versículos sobre <em>${t}</em>`);setTimeout(()=>feed.children[i+1]?.scrollIntoView({behavior:"smooth"}),250)}}
