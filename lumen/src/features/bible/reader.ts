/* Ler capítulo */
import type { Verse } from "../../types";
import { html, setHTML } from "../../utils/html";
import { byId, qa } from "../../utils/dom";
import { loadBook, parseRef } from "../../services/bible";

export const reader=byId("reader"),rPage=byId("rPage");
/** Abre o capítulo do versículo, com ele destacado e centralizado. */
export async function openReader(v:Verse){
  const p=parseRef(v.r);if(!p||!p.ab)return;const ab=p.ab;byId("rTitle").textContent=`${p.book} ${p.ch}`;
  setHTML(rPage, html`<article>${Array.from({length:8},(_,i)=>html`<div class="skel" data-style="width:${70+((i*37)%30)}%"></div>`)}</article>`);
  reader.classList.add("open");document.body.classList.remove("focus");
  try{const b=await loadBook(ab),c=b.capitulos[p.ch-1];if(!c)throw new Error("capítulo inexistente");
    setHTML(rPage, html`<article>${c.map((t,k)=>html`<span class="vv" data-n="${k+1}"><sup>${k+1}</sup>${t}</span> `)}</article>`)}
  catch{setHTML(rPage, html`<article><span class="vv" data-n="${p.a}"><sup>${p.a}</sup>${v.x}</span>
      <div class="note">Não foi possível abrir o capítulo agora. No app instalado, a Bíblia inteira fica guardada no celular e funciona sem internet.</div></article>`)}
  const hits=[...qa(rPage, ".vv")].filter(s=>{const n=Number(s.dataset.n);return n>=p.a&&n<=p.b});
  setTimeout(()=>{hits[0]?.scrollIntoView({block:"center",behavior:"smooth"});hits.forEach(h=>h.classList.add("hl"))},450);
}
export function closeReader(){reader.classList.remove("open")}
