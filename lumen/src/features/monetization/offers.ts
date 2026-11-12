/* Ofertas: prévia, recompensa, tempo esgotado */
import { html } from "../../utils/html";
import { byId, byIdMaybe } from "../../utils/dom";
import { store } from "../../core/state";
import { watchAd } from "./rewarded-ad";
import { renderPlayer } from "../music/now-playing";
import { MAX_REWARDS, P, REWARD_MIN, rewardsLeft } from "../music/playback";
import { openPremium } from "../premium/premium";
import { closeSheet, openSheet } from "../../ui/sheet";

export function offerHTML(){const left=rewardsLeft();
  return html`${(left>0?html`<button class="primary" id="oAd">▶ Assistir anúncio e ouvir ${REWARD_MIN} min grátis</button>
     <p class="fine">Você pode fazer isso mais ${left} ${left>1?"vezes":"vez"} hoje.</p>`
   :html`<p class="sub">Você já usou os ${MAX_REWARDS} anúncios de hoje. Amanhã tem mais.</p>`)}${html`<button class="${left>0?"sec":"primary"}" id="oPrem" data-style="width:100%;margin-top:${left>0?14:0}px">Testar o Premium por 7 dias</button>`}`}
export function bindOffer(){const a=byIdMaybe("oAd");if(a)a.onclick=watchAd;byId("oPrem").onclick=()=>{closeSheet();openPremium()}}
/** Oferta quando a prévia acaba ou o tempo grátis termina. */
export function gate(kind:"preview"|"expired"){const tr=P.tr;if(!tr)return;
  const h=kind==="expired"?["Seu tempo grátis acabou","Deixamos a música terminar para não cortar no meio. Quer continuar ouvindo?"]
    :[`Gostou de “${tr.t}”?`,"Essa foi uma prévia de 30 segundos. Escolha como continuar ouvindo o louvor completo."];
  openSheet(html`<h2>${h[0]}</h2><p class="sub">${h[1]}</p>${offerHTML()}`,"Continuar ouvindo");bindOffer();if(store.playerOpen)renderPlayer()}
export function extendSheet(){openSheet(html`<h2>Faltam 3 minutos</h2><p class="sub">Assista a mais um anúncio e some <b>+${REWARD_MIN} min</b> ao seu tempo, sem parar a música.</p>${offerHTML()}`,"Ganhar mais tempo");bindOffer()}
export function rewardSheet(){openSheet(html`<h2>Ouça ${REWARD_MIN} minutos de louvor grátis</h2><p class="sub">Assista a um anúncio curto e todos os álbuns ficam liberados, completos, por ${REWARD_MIN} minutos.</p>${offerHTML()}`,"Ouvir grátis");bindOffer()}
