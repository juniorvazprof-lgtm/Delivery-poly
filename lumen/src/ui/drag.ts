// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Arrastar para reordenar */
import { vibrate } from "./effects";

export function enableDrag(L,done){L.querySelectorAll(".grip").forEach(g=>{
  g.onpointerdown=e=>{e.preventDefault();const row=g.closest(".trow,.qrow");row.classList.add("dragging");g.setPointerCapture(e.pointerId);vibrate(10);
    g.onpointermove=ev=>{const rows=[...L.children].filter(r=>r!==row);let placed=false;
      for(const r of rows){const b=r.getBoundingClientRect();if(ev.clientY<b.top+b.height/2){if(row.nextSibling!==r){L.insertBefore(row,r);vibrate(4)}placed=true;break}}
      if(!placed&&L.lastElementChild!==row){L.appendChild(row);vibrate(4)}};
    g.onpointerup=g.onpointercancel=()=>{g.onpointermove=null;row.classList.remove("dragging");done([...L.children].map(r=>r.dataset.t))}}})}
