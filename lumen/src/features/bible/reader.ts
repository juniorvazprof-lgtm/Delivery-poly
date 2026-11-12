// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Ler capítulo */
import { loadBook, parseRef } from "../../services/bible";
import { esc } from "../../utils/text";

export const reader=document.getElementById("reader"),rPage=document.getElementById("rPage");
export async function openReader(v){
  const p=parseRef(v.r);document.getElementById("rTitle").innerHTML=`${p.book} ${p.ch}`;
  rPage.innerHTML=`<article>${Array.from({length:8},(_,i)=>`<div class="skel" style="width:${70+((i*37)%30)}%"></div>`).join("")}</article>`;
  reader.classList.add("open");document.body.classList.remove("focus");
  try{const b=await loadBook(p.ab),c=b.capitulos[p.ch-1];
    rPage.innerHTML=`<article>${c.map((t,k)=>`<span class="vv" data-n="${k+1}"><sup>${k+1}</sup>${esc(t)}</span> `).join("")}</article>`}
  catch{rPage.innerHTML=`<article><span class="vv" data-n="${p.a}"><sup>${p.a}</sup>${esc(v.x)}</span>
      <div class="note">Não foi possível abrir o capítulo agora. No app instalado, a Bíblia inteira fica guardada no celular e funciona sem internet.</div></article>`}
  const hits=[...rPage.querySelectorAll(".vv")].filter(s=>+s.dataset.n>=p.a&&+s.dataset.n<=p.b);
  setTimeout(()=>{hits[0]?.scrollIntoView({block:"center",behavior:"smooth"});hits.forEach(h=>h.classList.add("hl"))},450);
}
export function closeReader(){reader.classList.remove("open")}
