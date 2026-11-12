/* Aba Você */
import { raw } from "../utils/html";
import { byId, byIdMaybe } from "../utils/dom";
import { html } from "../utils/html";
import { store } from "../core/state";
import { renderLib } from "../features/music/library";
import { S } from "../services/storage";
import { toast } from "./effects";
import { closeSheet, openSheet } from "./sheet";

/** Selo "Em breve". */
export const SB=raw('<span class="soonb">Em breve</span>');
export const SOONS: Record<string, string> = {
 "Louvores":"Louvores originais para ouvir no feed e no player, com playlists e ranking. Por enquanto você pode ver uma prévia com faixas de demonstração.",
 "Lumen Premium":"Pregação com IA, louvores sem limite e app sem anúncios. As assinaturas ainda não estão abertas.",
 "Pregação com IA":"Escolha o tema e o Púlpito escreve uma pregação completa, com passagens e contexto. Enquanto isso, use o exemplo pronto e o modo Pregar.",
 "Ouvir em voz alta":"Os versículos lidos em voz calma, para ouvir no ônibus ou antes de dormir.",
 "Lembretes":"Notificações no horário que você escolher, com o versículo do dia e o convite para orar."};
/** Aviso de função em breve, com "Me avise". */
export function soon(name:string){const w=S.get<string[]>("lumen.notify",[]),on=w.includes(name);
  openSheet(html`<div data-style="margin:2px 0 10px"><span class="soonb big">Em breve</span></div><h2>${name}</h2><p class="sub">${SOONS[name]||""}</p>
   <button class="primary" id="ntf" ${on?"disabled":""}>${on?"Você será avisado":"Me avise quando chegar"}</button>
   ${name==="Louvores"?raw('<button class="ghost" id="prev">Ver prévia do player</button>'):""}`,"Em breve");
  byId("ntf").onclick=()=>{S.set("lumen.notify",[...new Set([...w,name])]);closeSheet();toast(html`Combinado. <em>Vamos te avisar</em>`)};
  const pv=byIdMaybe("prev");if(pv)pv.onclick=()=>{closeSheet();store.musicPreview=true;renderLib()}}
