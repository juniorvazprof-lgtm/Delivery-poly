// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Estado de reprodução, Premium e recompensas */
import { store } from "../../core/state";
import { dayKey } from "../daily/daily";
import { trackFor } from "./catalog";
import { updateMini } from "./mini-player";
import { refreshPlayer } from "./now-playing";
import { startVoice, stopVoice } from "../../services/audio-engine";
import { S } from "../../services/storage";
import { IC } from "../../ui/icons";

export const MAX_REWARDS=3,REWARD_MIN=15,PREVIEW=30;
export const canFull=()=>store.premium||store.musicPreview||Date.now()<store.rewardUntil;
export function rewardsLeft(){const d=dayKey(new Date());if(store.rw.day!==d)store.rw={day:d,n:0};return MAX_REWARDS-store.rw.n}
export const P={tr:null,mode:null,voice:null,start:0,offset:0,playing:false,gated:false};
export const elapsed=()=>P.playing?P.offset+(Date.now()-P.start)/1000:P.offset;
export function play(tr,mode,offset=0){stopVoice(P.voice);Object.assign(P,{tr,mode,offset,start:Date.now(),playing:true,gated:mode==="player"&&!canFull()});
  if(P.gated)P.offset=Math.min(offset,PREVIEW-1);P.voice=startVoice(tr,P.offset);updateBody()}
export function pause(){if(!P.playing)return;P.offset=elapsed();P.playing=false;stopVoice(P.voice,.5);P.voice=null;updateBody()}
export const resume=()=>play(P.tr,P.mode,P.offset);
export const I={play:'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',pause:'<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
 prev:'<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM9.5 12 18 5v14z"/></svg>',next:'<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM6 5l8.5 7L6 19z"/></svg>',
 on:IC("soundOn"),off:IC("soundOff")};
export const snd=document.getElementById("snd");
export function updateBody(){document.body.classList.toggle("playing",P.playing);document.body.classList.toggle("sound",store.soundOn);
  snd.innerHTML=store.soundOn?I.on:I.off;snd.classList.toggle("on",store.soundOn);snd.setAttribute("aria-label",store.soundOn?"Desligar trilha":"Ligar trilha");
  snd.classList.toggle("nudge",!S.get("lumen.sndUsed",0));updateMini();if(store.playerOpen)refreshPlayer()}
export function feedSound(card){if(!store.soundOn||P.mode==="player")return;
  if(!card||!card._v){if(P.playing)pause();return}
  const tr=trackFor(card._v);if(P.playing&&P.tr===tr)return;play(tr,"feed",Math.random()*60)}
