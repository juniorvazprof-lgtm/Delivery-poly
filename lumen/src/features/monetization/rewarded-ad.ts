// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Anúncio com recompensa (simulado) */
import { html } from "../../utils/html";
import { store } from "../../core/state";
import { TR } from "../music/catalog";
import { openNP, playQueue } from "../music/library";
import { renderPlayer } from "../music/now-playing";
import { P, REWARD_MIN, pause, play, resume, rewardsLeft } from "../music/playback";
import { S } from "../../services/storage";
import { toast, vibrate } from "../../ui/effects";
import { closeSheet } from "../../ui/sheet";

export const adv=document.getElementById("adv");
export function watchAd(){if(rewardsLeft()<=0)return;closeSheet();const was=P.playing||adv._was;adv._was=false;pause();
  const D=6;let t0=Date.now();adv.classList.add("open");
  document.getElementById("advBody").innerHTML=`<div class="advmedia">Conferência Exemplo 2027</div><p>Três dias de louvor e palavra em São Paulo. Anúncio de exemplo.</p>`;
  document.getElementById("advFoot").innerHTML=`<div class="rbar"><i id="rb"></i></div><div class="rlabel">Sua recompensa: ${REWARD_MIN} min de louvor completo</div>`;
  const cd=document.getElementById("cd");
  const iv=setInterval(()=>{const p=Math.min(1,(Date.now()-t0)/(D*1000));document.getElementById("rb").style.width=p*100+"%";cd.textContent=Math.ceil(D*(1-p))||"✓";
    if(p<1)return;clearInterval(iv);vibrate(15);
    store.rw.n++;S.set("lumen.rw",store.rw);store.rewardUntil=Math.max(Date.now(),store.rewardUntil)+REWARD_MIN*60000;S.set("lumen.rwu",store.rewardUntil);store.warned=false;
    document.getElementById("advBody").innerHTML=`<div class="done"><div class="ok">✓</div><h3>Você tem ${Math.round((store.rewardUntil-Date.now())/60000)} minutos</h3><p>Louvor completo e sem interrupções até ${new Date(store.rewardUntil).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}.</p></div>`;
    const more=rewardsLeft();
    document.getElementById("advFoot").innerHTML=`<button class="primary" id="advGo">Ouvir agora</button>`+(more>0?`<button class="sec" id="advMore" style="background:transparent;color:#F1ECE2;border-color:rgba(255,255,255,.2)">Ver mais 1 anúncio · +${REWARD_MIN} min <small>(${more} ${more>1?"restantes":"restante"})</small></button>`:"");
    const m=document.getElementById("advMore");if(m)m.onclick=()=>{adv._was=was;watchAd()};
    document.getElementById("advGo").onclick=()=>{adv.classList.remove("open");
      if(P.tr&&P.mode==="player")play(P.tr,"player",P.offset);else if(was)resume();
      if(!(P.mode==="player"&&P.tr))playQueue(TR.filter(t=>t.al==="quietude").map(t=>t.id),0,"Quietude");else renderPlayer();openNP();
      toast(html`Louvor liberado <em>sem interrupções</em>`)}},100)}
