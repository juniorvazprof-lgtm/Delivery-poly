// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Mini player */
import { store } from "../../core/state";
import { albumOf, coverStyle } from "./catalog";
import { Q, T } from "./library";
import { I, P, PREVIEW, elapsed } from "./playback";

export const mini=document.getElementById("mini");
export function updateMini(){const on=P.mode==="player"&&P.tr&&!store.npOpen;mini.classList.toggle("on",!!on);document.body.classList.toggle("has-mini",!!on);
  if(!P.tr||P.mode!=="player")return;const al=albumOf(P.tr),nx=Q.ids[Q.i+1]?T(Q.ids[Q.i+1]):null;document.getElementById("mCov").setAttribute("style",coverStyle(al));
  document.getElementById("mT").textContent=P.tr.t;document.getElementById("mA").textContent=P.gated?al.name+" · prévia":nx?"A seguir: "+nx.t:al.name;
  document.getElementById("mPP").innerHTML=P.playing?I.pause:I.play;
  document.getElementById("mBar").style.width=Math.min(1,P.gated?elapsed()/PREVIEW:elapsed()/P.tr.dur)*100+"%"}
