// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Filtro por tema */
import { store } from "../../core/state";
import { feed, io, more, recent } from "./feed";
import { toast } from "../../ui/effects";

export const fBtn=document.getElementById("filter");
export function setFilter(t){store.filterTag=t;recent.length=0;
  fBtn.querySelector("span").textContent=t?"Só "+t:"";fBtn.classList.toggle("on",!!t);
  const i=[...feed.children].indexOf(store.active);[...feed.children].slice(i+1).forEach(c=>{io.unobserve(c);c.remove()});more(4);
  if(t){toast(`Mostrando versículos sobre <em>${t}</em>`);setTimeout(()=>feed.children[i+1]?.scrollIntoView({behavior:"smooth"}),250)}}
