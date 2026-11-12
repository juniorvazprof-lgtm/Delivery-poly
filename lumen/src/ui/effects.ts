/* Efeitos */
import type { SafeHtml } from "../utils/html";
import type { Verse } from "../types";
import { byId } from "../utils/dom";
import { store } from "../core/state";
import { html, setHTML } from "../utils/html";
import { HEART } from "./icons";

/** Coração que sobe no ponto do toque duplo. */
export function heartAt(x:number,y:number){const h=document.createElement("div");h.className="halo";h.style.left=x+"px";h.style.top=y+"px";
  const b=document.createElement("div");b.className="big";b.style.left=x+"px";b.style.top=y+"px";b.style.setProperty("--r",(Math.random()*24-12)+"deg");
  setHTML(b, html`<svg viewBox="0 0 26 26"><path d="${HEART}"/></svg>`);document.body.append(h,b);setTimeout(()=>{h.remove();b.remove()},1000)}
export function vibrate(ms:number){try{navigator.vibrate&&navigator.vibrate(ms)}catch{}}
/** Aviso rápido. Texto puro é escapado; para destacar trechos use toast(html`... <em>${x}</em>`). */
export function toast(h:string|SafeHtml){const t=byId("toast");setHTML(t,html`<span>${h}</span>`);t.classList.add("show");clearTimeout(store.tt);store.tt=window.setTimeout(()=>t.classList.remove("show"),2300)}
export function copy(v:Verse,msg?:string){const s=`“${v.x}” — ${v.r}`;
  try{navigator.clipboard.writeText(s).then(()=>toast(msg||"Versículo copiado"),()=>toast("Não deu para copiar neste navegador"))}catch{toast("Não deu para copiar neste navegador")}}
/** Cores da luz de fundo do feed. */
export function setLight(v:{h:[string,string]}){const r=document.documentElement.style;r.setProperty("--glow-a",v.h[0]);r.setProperty("--glow-b",v.h[1])}
