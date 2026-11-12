// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Card de anúncio no feed */
import { goTab } from "../../app/navigation";
import { store } from "../../core/state";
import { toast } from "../../ui/effects";

export const ADS=[{brand:"Livraria Exemplo",big:"Bíblia de Estudo",head:"Bíblias de estudo com 20% de desconto",body:"Capa dura, letra grande e comentários em cada capítulo.",cta:"Ver ofertas",c:["#E8C9A9","#9C6B4A"]},
 {brand:"Conferência Exemplo",big:"Conferência 2027",head:"Três dias de louvor e palavra em São Paulo",body:"Ingressos do primeiro lote com preço especial.",cta:"Garantir ingresso",c:["#9FA9D8","#3E3A6E"]},
 {brand:"Camisetas Exemplo",big:"Coleção Salmos",head:"Camisetas de algodão com versículos",body:"Estampas minimalistas. Frete grátis acima de R$ 150.",cta:"Conhecer coleção",c:["#C8DDA9","#4E6B4A"]}];
export function makeAd(){const a=ADS[store.adI++%ADS.length],c=document.createElement("section");c.className="card ad";c._h=a.c;
  c.innerHTML=`<div class="inner ad-in"><div class="adtop"><span class="spon">Patrocinado</span><span class="ex">anúncio de exemplo</span></div>
   <div class="admedia" style="--a:${a.c[0]};--b:${a.c[1]}">${a.big}</div><b class="adbrand">${a.brand}</b><h3>${a.head}</h3><p>${a.body}</p>
   <button class="primary adcta">${a.cta}</button><button class="link noads">Remover anúncios com o Premium</button></div>`;
  c.querySelector(".adcta").onclick=()=>toast("Aqui abriria o site do anunciante");c.querySelector(".noads").onclick=()=>goTab("premium");return c}
