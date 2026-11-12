/* Folhas */
import { html, raw, setHTML, type SafeHtml } from "../utils/html";
import { byId, q, qMaybe } from "../utils/dom";
import { store } from "../core/state";
import { renderYou, youEl } from "../features/profile/profile";

export const veil=byId("veil"),sheet=byId("sheet");
export function openSheet(content:SafeHtml,label:string,cb?:()=>void){setHTML(sheet, html`${raw('<div class="grab" aria-hidden="true"></div>')}${content}`);sheet.setAttribute("aria-label",label);sheet.scrollTop=0;
  store.onClose=cb||null;veil.classList.add("open");sheet.classList.add("open");document.body.classList.remove("focus");
  setTimeout(()=>qMaybe(sheet, "button")?.focus({preventScroll:true}),300);bindDrag()}
export function closeSheet(){if(!sheet.classList.contains("open"))return;veil.classList.remove("open");sheet.classList.remove("open");sheet.style.transform="";
  if(youEl.classList.contains("open"))setTimeout(renderYou,60);const cb=store.onClose;store.onClose=null;cb&&cb()}
export function bindDrag(){const g=q(sheet, ".grab");let y0:number|null=null,dy=0;
  g.onpointerdown=e=>{y0=e.clientY;dy=0;sheet.classList.add("drag");g.setPointerCapture(e.pointerId)};
  g.onpointermove=e=>{if(y0===null)return;dy=Math.max(0,e.clientY-y0);sheet.style.transform=`translateY(${dy}px)`};
  g.onpointerup=()=>{sheet.classList.remove("drag");sheet.style.transform="";if(dy>90)closeSheet();y0=null}}
