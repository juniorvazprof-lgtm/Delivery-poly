// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Efeitos */
import { store } from "../core/state";
import { HEART } from "./icons";

export function heartAt(x,y){const h=document.createElement("div");h.className="halo";h.style.left=x+"px";h.style.top=y+"px";
  const b=document.createElement("div");b.className="big";b.style.left=x+"px";b.style.top=y+"px";b.style.setProperty("--r",(Math.random()*24-12)+"deg");
  b.innerHTML=`<svg viewBox="0 0 26 26"><path d="${HEART}"/></svg>`;document.body.append(h,b);setTimeout(()=>{h.remove();b.remove()},1000)}
export function vibrate(ms){try{navigator.vibrate&&navigator.vibrate(ms)}catch{}}
export function toast(h){const t=document.getElementById("toast");t.innerHTML=`<span>${h}</span>`;t.classList.add("show");clearTimeout(store.tt);store.tt=setTimeout(()=>t.classList.remove("show"),2300)}
export function copy(v,msg){const s=`“${v.x}” — ${v.r}`;
  try{navigator.clipboard.writeText(s).then(()=>toast(msg||"Versículo copiado"),()=>toast("Não deu para copiar neste navegador"))}catch{toast("Não deu para copiar neste navegador")}}
export function setLight(v){const r=document.documentElement.style;r.setProperty("--glow-a",v.h[0]);r.setProperty("--glow-b",v.h[1])}
