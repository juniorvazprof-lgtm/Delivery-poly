// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* TOPO */
import { ADS_ON } from "../../config/features";
import { store } from "../../core/state";
import { makeCard } from "./card";
import { bump, pick } from "./recommend";
import { makeAd } from "../monetization/ads";
import { feedSound } from "../music/playback";
import { setLight } from "../../ui/effects";

export const recent=[];
export const feed=document.getElementById("feed");
export const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting||e.intersectionRatio<.6||e.target===store.active)return;
  if(store.active){const dt=Date.now()-store.since;if(store.active._v){if(dt>5000)bump(store.active._v,1);else if(dt<900)bump(store.active._v,-1)}store.active.classList.remove("active")}
  store.active=e.target;store.since=Date.now();store.active.classList.add("active");setLight(store.active._v||{h:store.active._h});feedSound(store.active);
  const idx=[...feed.children].indexOf(store.active);
  if(idx>0)feed.querySelectorAll(".hint").forEach(h=>{h.style.opacity=0;setTimeout(()=>h.remove(),400)});
  if(idx>=feed.children.length-2)more(4);
}),{root:feed,threshold:[.6]});
export function more(n){for(let i=0;i<n;i++){
  if(ADS_ON&&!store.premium&&store.made>=10&&store.sinceAd>=8&&store.adsShown<6){const a=makeAd();feed.appendChild(a);io.observe(a);store.sinceAd=0;store.adsShown++;continue}
  const c=makeCard(pick(),!feed.children.length);feed.appendChild(c);io.observe(c);store.made++;store.sinceAd++}}
