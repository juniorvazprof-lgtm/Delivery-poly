/* TOPO */
import type { FeedCard } from "../../types";
import { byId, qa } from "../../utils/dom";
import { ADS_ON } from "../../config/features";
import { store } from "../../core/state";
import { makeCard } from "./card";
import { bump, pick } from "./recommend";
import { makeAd } from "../monetization/ads";
import { feedSound } from "../music/playback";
import { setLight } from "../../ui/effects";

/** Referências mostradas por último (para não repetir logo). */
export const recent:string[]=[];
export const feed=byId("feed");
/** Observa qual card está na tela: marca como ativo, mede o tempo de leitura e carrega mais. */
export const io=new IntersectionObserver(es=>es.forEach(e=>{
  const card=e.target as FeedCard;
  if(!e.isIntersecting||e.intersectionRatio<.6||card===store.active)return;
  if(store.active){const dt=Date.now()-store.since;if(store.active._v){if(dt>5000)bump(store.active._v,1);else if(dt<900)bump(store.active._v,-1)}store.active.classList.remove("active")}
  store.active=card;store.since=Date.now();card.classList.add("active");const h=card._v?.h||card._h;if(h)setLight({h});feedSound(card);
  const idx=[...feed.children].indexOf(card);
  if(idx>0)qa(feed, ".hint").forEach(h=>{h.style.opacity="0";setTimeout(()=>h.remove(),400)});
  if(idx>=feed.children.length-2)more(4);
}),{root:feed,threshold:[.6]});
/** Acrescenta n cards ao fim do feed. */
export function more(n:number){for(let i=0;i<n;i++){
  if(ADS_ON&&!store.premium&&store.made>=10&&store.sinceAd>=8&&store.adsShown<6){const a=makeAd();feed.appendChild(a);io.observe(a);store.sinceAd=0;store.adsShown++;continue}
  const c=makeCard(pick(),!feed.children.length);feed.appendChild(c);io.observe(c);store.made++;store.sinceAd++}
  trimFeed()}

/** Quantos cards ficam na memória, no máximo. Os que ficaram bem para trás são removidos. */
export const MAX_CARDS=24, KEEP_BEHIND=6;
/**
 * Remove os cards antigos acima da tela, para o feed não crescer sem limite na memória.
 * Como cada card ocupa a altura inteira da tela, a rolagem é ajustada na mesma medida
 * e a pessoa não percebe nenhum salto.
 */
export function trimFeed(){
  if(feed.children.length<=MAX_CARDS||!store.active)return;
  const idx=[...feed.children].indexOf(store.active);
  const remove=Math.min(idx-KEEP_BEHIND,feed.children.length-MAX_CARDS);
  if(remove<=0)return;
  const h=feed.clientHeight;
  for(let i=0;i<remove;i++){const c=feed.firstElementChild;if(!c)break;io.unobserve(c);c.remove()}
  feed.scrollTop-=remove*h}
