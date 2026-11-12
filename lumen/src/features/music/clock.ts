// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Relógio: prévia, fim da faixa, tempo grátis */
import { store } from "../../core/state";
import { extendSheet, gate } from "../monetization/offers";
import { nextTrack } from "./library";
import { updateMini } from "./mini-player";
import { refreshPlayer } from "./now-playing";
import { P, PREVIEW, canFull, elapsed, pause, play, rewardsLeft } from "./playback";
import { toast } from "../../ui/effects";
import { sheet } from "../../ui/sheet";

export function tick(){
  if(P.playing&&P.mode==="player"){const e=elapsed();
    if(P.gated&&e>=PREVIEW){pause();P.offset=0;gate("preview")}
    else if(e>=P.tr.dur){if(!canFull()){pause();P.offset=0;gate("expired")}else nextTrack(false)}
    if(!store.premium&&!P.gated){const left=store.rewardUntil-Date.now();if(left>0&&left<180000&&!store.warned){store.warned=true;if(rewardsLeft()>0&&!sheet.classList.contains("open"))extendSheet();else toast("Faltam 3 minutos do seu tempo grátis")}}}
  if(P.playing&&P.mode==="feed"&&elapsed()>P.tr.dur)play(P.tr,"feed",0);
  refreshPlayer();if(P.mode==="player")updateMini()}
