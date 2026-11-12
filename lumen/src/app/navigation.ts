/* Navegação inferior */
import { byId, qa } from "../utils/dom";
import { store } from "../core/state";
import { closeReader } from "../features/bible/reader";
import { openPlayer, playerEl } from "../features/music/library";
import { updateMini } from "../features/music/mini-player";
import { closePray } from "../features/prayer/prayer";
import { openPremium, premEl } from "../features/premium/premium";
import { closeYou, openYou } from "../features/profile/profile";
import { smEl } from "../features/pulpit/pulpit";
import { closeSheet } from "../ui/sheet";

export const bnav=byId("bnav");
export type Tab = "feed" | "listen" | "premium" | "you" | "saved";
export function setTab(n:Tab|string){qa(bnav, "button").forEach(b=>{const on=b.dataset.tab===n;b.classList.toggle("on",on);b.setAttribute("aria-current",on?"page":"false")})}
export function goTab(n:Tab|string){closeSheet();
  if(n!=="listen"&&store.playerOpen){store.playerOpen=false;playerEl.classList.remove("open");updateMini()}
  if(n!=="premium")premEl.classList.remove("open");
  if(n!=="you")closeYou();
  if(n==="listen"&&!store.playerOpen)openPlayer();if(n==="premium")openPremium();if(n==="you")openYou();
  if(n==="feed"){closeReader();closePray();smEl.classList.remove("open")}
  setTab(n)}
