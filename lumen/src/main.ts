/* Ponto de entrada: inicializa as telas e liga os eventos, na mesma ordem do protótipo. */
import { FEATURES } from "./config/features";
import { startOffline } from "./services/offline";
import type { FeedCard, SampleFn } from "./types";
import { raw, setHTML } from "./utils/html";
import { byId, qa } from "./utils/dom";
import { html } from "./utils/html";
import "./styles/index.css";
import { bnav, goTab } from "./app/navigation";
import { store } from "./core/state";
import { closeReader } from "./features/bible/reader";
import { dailyVerse, dayKey } from "./features/daily/daily";
import { makeCard } from "./features/feed/card";
import { feed, io, more, recent } from "./features/feed/feed";
import { fBtn, setFilter } from "./features/feed/filter";
import { adv } from "./features/monetization/rewarded-ad";
import { tick } from "./features/music/clock";
import { Q, closeNP, openNP, renderLib } from "./features/music/library";
import { updateMini } from "./features/music/mini-player";
import { P, feedSound, pause, resume, snd, updateBody } from "./features/music/playback";
import { onboarding } from "./features/onboarding/onboarding";
import { closePray } from "./features/prayer/prayer";
import { S } from "./services/storage";
import { setLight, toast, vibrate } from "./ui/effects";
import { IC, IP } from "./ui/icons";
import { closeSheet, veil } from "./ui/sheet";
import { soon } from "./ui/soon";
import "./features/search/search";

fBtn.onclick=()=>{setFilter(null);toast("Voltando ao seu feed")};
veil.onclick=closeSheet;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
(function(){const t=dayKey(new Date()),y=dayKey(new Date(Date.now()-864e5));
  if(store.streak.last!==t){store.streak.n=store.streak.last===y?store.streak.n+1:1;store.streak.last=t;S.set("lumen.streak",store.streak)}})();
byId("rClose").onclick=closeReader;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeReader()});
qa(bnav, "button").forEach(b=>b.onclick=()=>{vibrate(4);goTab(b.dataset.tab||"feed")});
{const deepIds=["search","reader","pray","serm","np"],mo=new MutationObserver(()=>document.body.classList.toggle("deep",deepIds.some(id=>byId(id).classList.contains("open"))));
  deepIds.forEach(id=>mo.observe(byId(id),{attributes:true,attributeFilter:["class"]}))}
snd.onclick=()=>{store.soundOn=!store.soundOn;S.set("lumen.sound",store.soundOn);S.set("lumen.sndUsed",1);
  if(store.soundOn){if(P.mode==="player"&&P.tr)resume();else feedSound(store.active);toast(html`Trilha de demonstração · <em>louvores originais em breve</em>`)}else pause();updateBody()};
document.addEventListener("pointerdown",()=>{if(store.soundOn&&!P.playing&&P.mode!=="player")feedSound(store.active)},{once:true});
byId("pPrem").onclick=()=>goTab("premium");
byId("npClose").onclick=closeNP;
byId("mInfo").onclick=()=>openNP();
byId("mPP").onclick=()=>{P.playing?pause():resume()};
byId("mX").onclick=()=>{pause();P.mode=null;P.tr=null;Q.ids=[];updateMini();if(store.playerOpen)renderLib();if(store.soundOn)feedSound(store.active)};
document.addEventListener("keydown",e=>{if(e.key!=="Escape"||adv.classList.contains("open"))return;
  });
byId("pyClose").onclick=closePray;
byId("pyBell").onclick=()=>soon("Lembretes");
// Na prévia publicada no Claude, a página pode pedir ao Claude (Púlpito com IA). No app instalado isso não existe.
(window as Window & {claude?:{use?:(n:string)=>Promise<SampleFn|null>}}).claude?.use?.("sample").then(s=>{store.SAMPLE=s}).catch(()=>{});
byId("smClose").onclick=()=>{store.smCtl?.abort();byId("serm").classList.remove("open")};
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;closePray();byId("serm").classList.remove("open")});
{const d=dailyVerse();recent.push(d.r);const c=makeCard(d,true,true);feed.appendChild(c);io.observe(c)}
more(4);
requestAnimationFrame(()=>{const f=feed.firstElementChild as FeedCard|null;if(!f||!f._v)return;f.classList.add("active");store.active=f;store.since=Date.now();setLight(f._v)});
if(!S.get<number>("lumen.onb",0))setTimeout(onboarding,900);
updateBody();
startOffline();
setInterval(tick,500);
// sem louvores reais ainda: esconde a música e põe a aba Buscar no lugar de Ouvir
if(!FEATURES.music){document.body.classList.add("nomusic");const b=bnav.querySelector<HTMLButtonElement>('[data-tab="listen"]');
  if(b){b.dataset.tab="search";setHTML(b,html`<span class="ni" data-i="search"></span>Buscar`);b.onclick=()=>{vibrate(4);byId("findBtn").click()}}}
qa(document, "[data-i]").forEach(el=>el.outerHTML=html`<svg viewBox="0 0 24 24" aria-hidden="true">${raw(IP[el.dataset.i||""]||"")}</svg>`.value);
[["fClose","back"],["rClose","back"],["pyClose","back"],["smClose","back"],["pyBell","bell"],["mX","close"],["npClose","back"]].forEach(([id,n])=>setHTML(byId(id), html`<svg viewBox="0 0 24 24">${raw(IP[n])}</svg>`));
byId("pPrem").insertAdjacentHTML("afterbegin",IC("star").value);
