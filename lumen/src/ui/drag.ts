/* Arrastar para reordenar */
import { qa } from "../utils/dom";
import { vibrate } from "./effects";

/** Permite reordenar as linhas de uma lista arrastando pela alça (.grip). */
export function enableDrag(L:HTMLElement,done:(ids:string[])=>void){qa(L, ".grip").forEach(g=>{
  g.onpointerdown=e=>{e.preventDefault();const row=g.closest<HTMLElement>(".trow,.qrow");if(!row)return;row.classList.add("dragging");g.setPointerCapture(e.pointerId);vibrate(10);
    g.onpointermove=ev=>{const rows=[...L.children].filter(r=>r!==row);let placed=false;
      for(const r of rows){const b=r.getBoundingClientRect();if(ev.clientY<b.top+b.height/2){if(row.nextSibling!==r){L.insertBefore(row,r);vibrate(4)}placed=true;break}}
      if(!placed&&L.lastElementChild!==row){L.appendChild(row);vibrate(4)}};
    g.onpointerup=g.onpointercancel=()=>{g.onpointermove=null;row.classList.remove("dragging");done([...L.children].map(r=>(r as HTMLElement).dataset.t||""))}}})}
