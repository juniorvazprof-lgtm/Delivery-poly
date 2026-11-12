// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Folhas */
import { store } from "../core/state";
import { renderYou, youEl } from "../features/profile/profile";

export const veil=document.getElementById("veil"),sheet=document.getElementById("sheet");
export function openSheet(html,label,cb){sheet.innerHTML='<div class="grab" aria-hidden="true"></div>'+html;sheet.setAttribute("aria-label",label);sheet.scrollTop=0;
  store.onClose=cb||null;veil.classList.add("open");sheet.classList.add("open");document.body.classList.remove("focus");
  setTimeout(()=>sheet.querySelector("button")?.focus({preventScroll:true}),300);bindDrag()}
export function closeSheet(){if(!sheet.classList.contains("open"))return;veil.classList.remove("open");sheet.classList.remove("open");sheet.style.transform="";
  if(youEl.classList.contains("open"))setTimeout(renderYou,60);const cb=store.onClose;store.onClose=null;cb&&cb()}
export function bindDrag(){const g=sheet.querySelector(".grab");let y0=null,dy=0;
  g.onpointerdown=e=>{y0=e.clientY;dy=0;sheet.classList.add("drag");g.setPointerCapture(e.pointerId)};
  g.onpointermove=e=>{if(y0===null)return;dy=Math.max(0,e.clientY-y0);sheet.style.transform=`translateY(${dy}px)`};
  g.onpointerup=()=>{sheet.classList.remove("drag");sheet.style.transform="";if(dy>90)closeSheet();y0=null}}
