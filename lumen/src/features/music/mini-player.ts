/* Mini player */
import { setHTML } from "../../utils/html";
import { byId } from "../../utils/dom";
import { store } from "../../core/state";
import { albumOf, coverStyle } from "./catalog";
import { Q, T } from "./library";
import { I, P, PREVIEW, elapsed } from "./playback";

export const mini=byId("mini");
export function updateMini(){const tr=P.tr,on=P.mode==="player"&&!!tr&&!store.npOpen;mini.classList.toggle("on",!!on);document.body.classList.toggle("has-mini",!!on);
  if(!tr||P.mode!=="player")return;const al=albumOf(tr),nx=Q.ids[Q.i+1]?T(Q.ids[Q.i+1]):null;byId("mCov").style.cssText=coverStyle(al);
  byId("mT").textContent=tr.t;byId("mA").textContent=P.gated?al.name+" · prévia":nx?"A seguir: "+nx.t:al.name;
  setHTML(byId("mPP"), P.playing?I.pause:I.play);
  byId("mBar").style.width=Math.min(1,P.gated?elapsed()/PREVIEW:elapsed()/tr.dur)*100+"%"}
