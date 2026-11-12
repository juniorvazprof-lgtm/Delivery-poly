/* Personalização */
import type { Verse } from "../../types";
import { html } from "../../utils/html";
import { persist } from "../../core/persist";
import { store } from "../../core/state";
import { NEAR } from "../../data/themes";
import { V } from "../../data/verses";
import { recent } from "./feed";
import { toast } from "../../ui/effects";

/** Ajusta o gosto da pessoa pelos temas do versículo (curtir +3, salvar +4, enviar +5…). */
export function bump(v:Verse,w:number){v.t.forEach((t,i)=>{store.taste[t]=Math.min(40,Math.max(-5,(store.taste[t]||0)+w*(i?.6:1)))});
  if(w>0){const t=v.t[0];if(store.taste[t]>=6&&!store.announced.has(t)){store.announced.add(t);toast(html`Mais versículos sobre <em>${t}</em> para você`)}}persist()}
export const score=(v:Verse)=>v.t.reduce((s:number,t,i)=>s+Math.max(0,store.taste[t]||0)*(i?.6:1),0);
/** Próximo versículo do feed: 70% dos temas favoritos, 20% de temas vizinhos, 10% de descoberta. */
export function pick():Verse{
  const tag=store.filterTag;
  let base=tag?V.filter(v=>(v.t as string[]).includes(tag)):V;
  let pool=base.filter(v=>!recent.includes(v.r)); if(!pool.length){pool=base;recent.length=0}
  let list=pool;
  if(!tag){const r=Math.random(),top=Object.entries(store.taste).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
    if(top.length&&r<.7)list=pool.filter(v=>score(v)>0);
    else if(top.length&&r<.9){const near=new Set(top.slice(0,3).flatMap(t=>NEAR[t]||[]));list=pool.filter(v=>v.t.some(t=>near.has(t)))}
    if(!list.length)list=pool}
  const w=list.map(v=>1+score(v));let n=Math.random()*w.reduce((a,b)=>a+b,0);
  const v=list.find((_,i)=>(n-=w[i])<=0)||list[0];
  recent.push(v.r);if(recent.length>Math.min(14,base.length-1))recent.shift();return v;
}
