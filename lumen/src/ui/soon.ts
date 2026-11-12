// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Aba Você */
import { store } from "../core/state";
import { renderLib } from "../features/music/library";
import { S } from "../services/storage";
import { toast } from "./effects";
import { closeSheet, openSheet } from "./sheet";

export const SB='<span class="soonb">Em breve</span>';
export const SOONS={
 "Louvores":"Louvores originais para ouvir no feed e no player, com playlists e ranking. Por enquanto você pode ver uma prévia com faixas de demonstração.",
 "Lumen Premium":"Pregação com IA, louvores sem limite e app sem anúncios. As assinaturas ainda não estão abertas.",
 "Pregação com IA":"Escolha o tema e o Púlpito escreve uma pregação completa, com passagens e contexto. Enquanto isso, use o exemplo pronto e o modo Pregar.",
 "Ouvir em voz alta":"Os versículos lidos em voz calma, para ouvir no ônibus ou antes de dormir.",
 "Lembretes":"Notificações no horário que você escolher, com o versículo do dia e o convite para orar."};
export function soon(name){const w=S.get("lumen.notify",[]),on=w.includes(name);
  openSheet(`<div style="margin:2px 0 10px"><span class="soonb big">Em breve</span></div><h2>${name}</h2><p class="sub">${SOONS[name]||""}</p>
   <button class="primary" id="ntf" ${on?"disabled":""}>${on?"Você será avisado":"Me avise quando chegar"}</button>
   ${name==="Louvores"?'<button class="ghost" id="prev">Ver prévia do player</button>':""}`,"Em breve");
  document.getElementById("ntf").onclick=()=>{S.set("lumen.notify",[...new Set([...w,name])]);closeSheet();toast("Combinado. <em>Vamos te avisar</em>")};
  const pv=document.getElementById("prev");if(pv)pv.onclick=()=>{closeSheet();store.musicPreview=true;renderLib()}}
