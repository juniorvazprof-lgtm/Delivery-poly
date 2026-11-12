// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Personalização */
import { persist } from "../../core/persist";
import { store } from "../../core/state";
import { NEAR } from "../../data/themes";
import { V } from "../../data/verses";
import { recent } from "./feed";
import { toast } from "../../ui/effects";

export function bump(v,w){v.t.forEach((t,i)=>{store.taste[t]=Math.min(40,Math.max(-5,(store.taste[t]||0)+w*(i?.6:1)))});
  if(w>0){const t=v.t[0];if(store.taste[t]>=6&&!store.announced.has(t)){store.announced.add(t);toast(`Mais versículos sobre <em>${t}</em> para você`)}}persist()}
export const score=v=>v.t.reduce((s,t,i)=>s+Math.max(0,store.taste[t]||0)*(i?.6:1),0);
export function pick(){
  let base=store.filterTag?V.filter(v=>v.t.includes(store.filterTag)):V;
  let pool=base.filter(v=>!recent.includes(v.r)); if(!pool.length){pool=base;recent.length=0}
  let list=pool;
  if(!store.filterTag){const r=Math.random(),top=Object.entries(store.taste).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
    if(top.length&&r<.7)list=pool.filter(v=>score(v)>0);
    else if(top.length&&r<.9){const near=new Set(top.slice(0,3).flatMap(t=>NEAR[t]||[]));list=pool.filter(v=>v.t.some(t=>near.has(t)))}
    if(!list.length)list=pool}
  const w=list.map(v=>1+score(v));let n=Math.random()*w.reduce((a,b)=>a+b,0);
  const v=list.find((_,i)=>(n-=w[i])<=0)||list[0];
  recent.push(v.r);if(recent.length>Math.min(14,base.length-1))recent.shift();return v;
}
