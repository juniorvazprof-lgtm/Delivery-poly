/* Ouvir: biblioteca, ranking, playlists e fila */
import type { Album, LibraryView, Queue, Track } from "../../types";
import type { SafeHtml } from "../../utils/html";
import { cleanText } from "../../utils/text";
import { raw, setHTML } from "../../utils/html";
import { byId, byIdMaybe, qMaybe, qa } from "../../utils/dom";
import { html } from "../../utils/html";
import { setTab } from "../../app/navigation";
import { store } from "../../core/state";
import { NEAR } from "../../data/themes";
import { ALBUMS, TR, albumOf, coverStyle } from "./catalog";
import { updateMini } from "./mini-player";
import { renderNP, renderPlayer } from "./now-playing";
import { I, P, canFull, elapsed, pause, play } from "./playback";
import { premEl } from "../premium/premium";
import { closeYou } from "../profile/profile";
import { S } from "../../services/storage";
import { enableDrag } from "../../ui/drag";
import { toast, vibrate } from "../../ui/effects";
import { IC } from "../../ui/icons";
import { closeSheet, openSheet, sheet } from "../../ui/sheet";
import { SB, SOONS } from "../../ui/soon";
import { fmtN, hsh, mmss } from "../../utils/format";

export const saveMusic=()=>{S.set("lumen.songLikes",store.songLikes);S.set("lumen.pls",store.pls);S.set("lumen.plays",store.plays);S.set("lumen.recentS",store.recentS)};
/** Faixa pelo id. */
export const T=(id:string):Track|undefined=>TR.find(t=>t.id===id);
/** Faixa pelo id, quando o id já foi validado. */
const TT=(id:string):Track=>{const t=T(id);if(!t)throw new Error(`faixa ${id} não existe`);return t};
export const PLC:[string,string][]=[["#F2C879","#D9676F"],["#9EC5E8","#4B4785"],["#C8DDA9","#5E8C6A"],["#F2B8C6","#8E6AA8"],["#F7D9A0","#9C6B4A"]];
export const Q:Queue={ids:[],i:0,shuffle:false,repeat:"off",src:""};
export const playerEl=byId("player"),pPage=byId("pPage"),npEl=byId("np"),npPage=byId("npPage");
type Range=LibraryView["range"];
/** Reproduções de exemplo da comunidade (determinísticas por faixa). */
export const baseCount=(t:Track,r:Range)=>{const h=hsh(t.id+r);return r==="week"?120+h%880:2400+h%9600};
export interface RankRow{t:Track;n:number;pos:number;mv:number}
export function ranking(r:Range):RankRow[]{const now=TR.map(t=>({t,n:baseCount(t,r)+(store.plays[t.id]||0)})).sort((a,b)=>b.n-a.n);
  return now.slice(0,10).map((x,i)=>{const h=hsh(x.t.id+"mv"+r)%9,mv=store.plays[x.t.id]?Math.max(1,h%4):h<3?0:h<6?h-2:-(h-5);return {...x,pos:i+1,mv:i===0&&mv>0?0:mv}})}
export function shuffleArr<X>(a:X[]):X[]{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
/** Toca uma lista a partir da posição i, montando a fila. */
export function playQueue(ids:string[],i=0,src=""){ids=ids.filter(id=>!!T(id));if(!ids.length)return;const first=ids[i];
  Q.ids=Q.shuffle?[first,...shuffleArr(ids.filter((_,k)=>k!==i))]:ids.slice();Q.i=Q.shuffle?0:i;Q.src=src;startCur()}
export function startCur(){const t=T(Q.ids[Q.i]);if(!t)return;play(t,"player",0);
  store.plays[t.id]=(store.plays[t.id]||0)+1;store.recentS=[t.id,...store.recentS.filter(x=>x!==t.id)].slice(0,12);saveMusic();renderPlayer()}
export function nextTrack(manual:boolean){if(!Q.ids.length)return;
  if(Q.repeat==="one"&&!manual){startCur();return}
  if(Q.i+1>=Q.ids.length){if(Q.repeat==="all"||manual){Q.i=0;startCur()}else{pause();P.offset=0;renderPlayer()}return}
  Q.i++;startCur()}
export function prevTrack(){if(elapsed()>3||Q.i===0){if(P.tr)play(P.tr,"player",0);renderPlayer();return}Q.i--;startCur()}
export function playNextId(id:string){if(!Q.ids.length||P.mode!=="player"){playQueue([id],0,"");return}Q.ids.splice(Q.i+1,0,id);toast("Toca a seguir");renderPlayer()}
export function addQueue(id:string){if(!Q.ids.length||P.mode!=="player"){playQueue([id],0,"");return}Q.ids.push(id);toast("Adicionada à fila");renderPlayer()}
export function toggleSongLike(id:string,btn?:HTMLElement){const on=!store.songLikes.includes(id);store.songLikes=on?[id,...store.songLikes]:store.songLikes.filter(x=>x!==id);saveMusic();
  if(btn){btn.classList.toggle("on",on);if(on){btn.classList.remove("pop");void btn.offsetWidth;btn.classList.add("pop");vibrate(8)}}
  toast(on?html`Adicionada às <em>Curtidas</em>`:"Removida das Curtidas");
  qa(document, `.hb[data-h="${id}"]`).forEach(b=>b.classList.toggle("on",on))}
export function openPlayer(tr?:Track,autoplay?:boolean){premEl.classList.remove("open");closeYou();store.playerOpen=true;setTab("listen");document.body.classList.remove("focus");
  if(tr&&autoplay&&store.musicPreview){const l=TR.filter(t=>t.al===tr.al);playQueue(l.map(t=>t.id),l.indexOf(tr),albumOf(tr).name);openNP()}
  renderLib();playerEl.classList.add("open");updateMini()}
export function closePlayer(){if(!store.playerOpen)return;store.playerOpen=false;playerEl.classList.remove("open");setTab("feed");updateMini()}
export function openNP(){if(!P.tr||P.mode!=="player"){const r=store.recentS[0]||"t4";playQueue([r],0,"")}store.npOpen=true;renderNP();npEl.classList.add("open");updateMini()}
export function closeNP(){store.npOpen=false;npEl.classList.remove("open");updateMini()}
export const cov=(al:{colors:[string,string]},cls="")=>html`<span class="cover ${cls}" data-style="${coverStyle(al)}"></span>`;
export const isCur=(id:string)=>P.mode==="player"&&!!P.tr&&P.tr.id===id;
export interface RowOpts{grip?:boolean;rank?:RankRow}
export function trow(t:Track,k:number,o:RowOpts={}):SafeHtml{const al=albumOf(t),lk=store.songLikes.includes(t.id);
  return html`<div class="trow ${isCur(t.id)?"on":""}" data-t="${t.id}">
   ${o.grip?html`<span class="grip" aria-label="Arrastar para reordenar"><svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg></span>`:""}
   ${o.rank?html`<span class="rk"><b>${o.rank.pos}</b><i class="${o.rank.mv>0?"up":o.rank.mv<0?"dn":""}">${o.rank.mv>0?"▲"+o.rank.mv:o.rank.mv<0?"▼"+(-o.rank.mv):"–"}</i></span>`:""}
   <button class="tplay" data-k="${k}">${cov(al,"sm")}<span class="tt"><b>${isCur(t.id)?raw('<span class="eq"><i></i><i></i><i></i></span>'):""}${t.t}</b><small>${o.rank?fmtN(o.rank.n)+" reproduções":al.name+" · "+mmss(t.dur)}</small></span></button>
   <button class="hb ${lk?"on":""}" data-h="${t.id}" aria-label="Curtir música">${IC("heart")}</button>
   <button class="mb" data-m="${t.id}" aria-label="Mais opções">${IC("more")}</button></div>`}
export function list(ids:string[],key:string,src:string,o:RowOpts|((t:Track,k:number)=>RowOpts)={}):SafeHtml{store.ctx[key]={ids,src};return html`<div class="tlist" data-ctx="${key}">${ids.map(TT).map((t,k)=>trow(t,k,typeof o==="function"?o(t,k):o))}</div>`}
export function bindLists(root:ParentNode){
  qa(root, ".tlist").forEach(L=>{const c=store.ctx[L.dataset.ctx||""];if(!c)return;
    qa(L, ".tplay").forEach(b=>b.onclick=()=>{playQueue(c.ids,Number(b.dataset.k),c.src);if(!canFull())toast(html`Prévia de 30 s · <em>ouça completo com anúncio ou Premium</em>`)});
    qa(L, ".hb").forEach(b=>b.onclick=()=>toggleSongLike(b.dataset.h||"",b));
    qa(L, ".mb").forEach(b=>b.onclick=()=>songMenu(b.dataset.m||"",c))})}
/** Tela "em breve" da aba Ouvir (antes da prévia). */
function soonView():SafeHtml{
  const asked=S.get<string[]>("lumen.notify",[]).includes("Louvores");
  return html`<div class="sw soonpage"><div class="albums" aria-hidden="true">${ALBUMS.slice(0,3).map(a=>html`<span class="cover" data-style="${coverStyle(a)}">${a.name}</span>`)}</div>
    ${SB}<h3>Louvores originais</h3><p class="lead">${SOONS.Louvores}</p>
    <button class="primary" id="ntfM">${asked?"Você será avisado":"Me avise quando chegar"}</button><button class="ghost" id="prevM">Ver prévia do player</button></div>`}

const plural=(n:number,one:string,many:string)=>`${n} ${n===1?one:many}`;

/** Detalhe de um álbum, das curtidas, de uma seleção ou de uma playlist. */
function detailView(d:NonNullable<LibraryView["det"]>):SafeHtml{
  const back=html`<button class="backrow" id="libBack">${IC("back")}Voltar</button>`;
  if(d.type==="album"){const al=ALBUMS.find(a=>a.id===d.id)||ALBUMS[0],ids=TR.filter(t=>t.al===al.id).map(t=>t.id);
    return html`${back}${head(al.name,`Álbum · ${ids.length} faixas`,cov(al,"md"),ids,al.name)}${list(ids,"det",al.name)}`}
  if(d.type==="liked"){const ids=store.songLikes;
    return html`${back}${head("Curtidas",plural(ids.length,"música","músicas"),html`<span class="cover md likedc">${IC("heart")}</span>`,ids,"Curtidas")}${
      ids.length?list(ids,"det","Curtidas"):html`<div class="empty">Toque no coração de uma música e ela aparece aqui.</div>`}`}
  if(d.type==="mood"){const m=d.id||"paz",ids=moodIds(m);
    return html`${back}${head("Para "+m,"Seleção feita a partir do que você curte no feed",cov({colors:moodColors(m)},"md"),ids,"Para "+m)}${list(ids,"det","Para "+m)}`}
  const p=store.pls.find(x=>x.id===d.id);
  if(!p)return html``;
  return html`${back}${head(p.name,"Playlist · "+plural(p.ids.length,"música","músicas"),cov({colors:p.c},"md"),p.ids,p.name,true)}${
    p.ids.length?html`${list(p.ids,"det",p.name,{grip:true})}<p class="fine">Arraste <b>⋮⋮</b> para mudar a ordem.</p>`
      :html`<div class="empty">Use <b>⋯</b> em qualquer música e escolha <b>Adicionar à playlist</b>.</div>`}`}

function homeTab():SafeHtml{
  const last=(P.mode==="player"&&P.tr)?P.tr:T(store.recentS[0]||"");
  const cont=last?(al=>html`<button class="cont" id="cont">${cov(al,"md")}<span><small>Continuar ouvindo</small><b>${last.t}</b><em>${al.name}</em></span><span class="pbig">${isCur(last.id)&&P.playing?I.pause:I.play}</span></button>`)(albumOf(last)):"";
  return html`${cont}<div class="label">Álbuns do Lumen</div><div class="albums">${ALBUMS.map(a=>html`<button data-a="${a.id}"><span class="cover" data-style="${coverStyle(a)}">${a.name}</span><span>${TR.filter(t=>t.al===a.id).length} faixas</span></button>`)}</div>
    <div class="label" data-style="margin-top:22px">Para o seu momento</div><div class="moods">${moods().map(m=>html`<button data-mood="${m}"><span class="cover" data-style="${coverStyle({colors:moodColors(m)})}">Para ${m}</span></button>`)}</div>`}

function rankTab():SafeHtml{
  const R=ranking(store.LV.range);
  return html`<div class="rkhead"><div class="chips">${([["week","Esta semana"],["all","Sempre"]] as const).map(([k,n])=>html`<button class="chip ${store.LV.range===k?"on":""}" data-r="${k}">${n}</button>`)}</div>
    <button class="primary playall" id="playTop">${IC("play")}Tocar o Top 10</button></div>
    ${list(R.map(x=>x.t.id),"rank","Top 10",(_t,k)=>({rank:R[k]}))}<p class="fine">Números de exemplo da comunidade, somados ao que você ouve.</p>`}

function libTab():SafeHtml{
  return html`<button class="librow" id="goLiked"><span class="cover sm likedc">${IC("heart")}</span><span class="tt"><b>Curtidas</b><small>${plural(store.songLikes.length,"música","músicas")}</small></span>${IC("chev")}</button>
    ${store.pls.map(p=>html`<button class="librow" data-pl="${p.id}">${cov({colors:p.c},"sm")}<span class="tt"><b>${p.name}</b><small>Playlist · ${p.ids.length}</small></span>${IC("chev")}</button>`)}
    <button class="librow add" id="newPl"><span class="cover sm addc">+</span><span class="tt"><b>Nova playlist</b><small>Dê um nome e adicione músicas</small></span></button>
    ${store.recentS.length?html`<div class="label" data-style="margin-top:24px">Ouvidas recentemente</div>${list(store.recentS.slice(0,8),"rec","Recentes")}`:""}`}

const TABS=[["home","Início"],["rank","Ranking"],["lib","Biblioteca"]] as const;

/** Desenha a aba Ouvir conforme o estado em store.LV. */
export function renderLib(){store.ctx={};byId("pPrem").hidden=true;
  if(!store.musicPreview){setHTML(pPage,soonView());
    byId("ntfM").onclick=()=>{S.set("lumen.notify",[...new Set([...S.get<string[]>("lumen.notify",[]),"Louvores"])]);toast(html`Combinado. <em>Vamos te avisar</em>`);renderLib()};
    byId("prevM").onclick=()=>{store.musicPreview=true;renderLib()};return}
  const d=store.LV.det;
  if(d&&d.type==="pl"&&!store.pls.some(x=>x.id===d.id)){store.LV.det=null;return renderLib()}
  const body=d?detailView(d):html`<div class="mtabs" role="tablist">${TABS.map(([k,n])=>html`<button role="tab" data-v="${k}" class="${store.LV.tab===k?"on":""}" aria-selected="${store.LV.tab===k}">${n}</button>`)}</div>${
    store.LV.tab==="home"?homeTab():store.LV.tab==="rank"?rankTab():libTab()}`;
  setHTML(pPage, html`<div class="sw ouvir"><div class="prevbar">${SB} Prévia com faixas de demonstração</div>${body}</div>`);bindLists(pPage);
  bindLib()}

/** Liga os eventos da aba Ouvir. Elementos opcionais usam byIdMaybe. */
function bindLib(){
  const on=(id:string,fn:()=>void)=>{const el=byIdMaybe(id);if(el)el.onclick=fn};
  const toTop=()=>{renderLib();pPage.scrollTop=0};
  qa(pPage, ".mtabs button").forEach(b=>b.onclick=()=>{store.LV.tab=(b.dataset.v as LibraryView["tab"])||"home";vibrate(4);renderLib()});
  qa(pPage, ".albums button").forEach(b=>b.onclick=()=>{store.LV.det={type:"album",id:b.dataset.a};toTop()});
  qa(pPage, ".moods button").forEach(b=>b.onclick=()=>{store.LV.det={type:"mood",id:b.dataset.mood};toTop()});
  qa(pPage, "[data-pl]").forEach(b=>b.onclick=()=>{store.LV.det={type:"pl",id:b.dataset.pl};toTop()});
  qa(pPage, "[data-r]").forEach(b=>b.onclick=()=>{store.LV.range=b.dataset.r==="all"?"all":"week";renderLib()});
  on("libBack",()=>{store.LV.det=null;renderLib()});
  on("goLiked",()=>{store.LV.det={type:"liked"};toTop()});
  on("newPl",()=>newPlaylist());
  on("playTop",()=>{const r=store.ctx.rank;if(r)playQueue(r.ids,0,"Top 10")});
  on("cont",()=>{const t=(P.mode==="player"&&P.tr)||T(store.recentS[0]||"");if(!t)return;if(isCur(t.id))openNP();else{playQueue([t.id],0,"");openNP()}});
  qa(pPage, "[data-hp]").forEach(b=>b.onclick=()=>{const c=store.ctx.det;if(!c||!c.ids.length)return;
    if(b.dataset.hp==="shuffle"){Q.shuffle=true;playQueue(c.ids,Math.random()*c.ids.length|0,c.src)}else{Q.shuffle=false;playQueue(c.ids,0,c.src)}});
  const det=store.LV.det;
  on("plMenu",()=>{if(det?.id)plMenu(det.id)});
  const dl=qMaybe(pPage, '.tlist[data-ctx="det"]');
  if(dl&&det?.type==="pl")enableDrag(dl,ids=>{const p=store.pls.find(x=>x.id===det.id);if(!p)return;p.ids=ids;saveMusic();renderLib()})}
export function head(title:string,sub:string,cover:SafeHtml,ids:string[],src:string,isPl?:boolean):SafeHtml{return html`<div class="dhead">${cover}<div class="dt"><h3>${title}</h3><p>${sub}</p></div></div>
  <div class="dact"><button class="primary" data-hp="play" ${ids.length?"":"disabled"}>${IC("play")}Tocar</button><button class="sec" data-hp="shuffle" ${ids.length?"":"disabled"}>Aleatório</button>${isPl?html`<button class="mb big" id="plMenu" aria-label="Opções da playlist">${IC("more")}</button>`:""}</div>`}
export function moods():string[]{const top=Object.entries(store.taste).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);return [...new Set([...top,"paz","gratidão","coragem","descanso"])].slice(0,4)}
export function moodIds(m:string):string[]{const near:string[]=NEAR[m]||[],al=ALBUMS.filter(a=>(a.tags as string[]).includes(m)||a.tags.some(t=>near.includes(t)));return TR.filter(t=>al.some(a=>a.id===t.al)).sort((a,b)=>hsh(a.id+m)%97-hsh(b.id+m)%97).slice(0,8).map(t=>t.id)}
export function moodColors(m:string):[string,string]{const al=ALBUMS.find(a=>(a.tags as string[]).includes(m))||ALBUMS[1];return [al.colors[1],al.colors[0]]}
export function songMenu(id:string,c?:{ids:string[];src:string}){const t=TT(id),lk=store.songLikes.includes(id),inPl=store.LV.det&&store.LV.det.type==="pl"&&c===store.ctx.det;
  openSheet(html`<div class="shead">${cov(albumOf(t),"sm")}<div><h2>${t.t}</h2><p class="sub" data-style="margin:0">${albumOf(t).name}</p></div></div>
   <button class="opt" data-a="next">${IC("send")}<div>Tocar a seguir</div></button>
   <button class="opt" data-a="queue">${IC("disc")}<div>Adicionar à fila</div></button>
   <button class="opt" data-a="pl">${IC("note")}<div>Adicionar à playlist</div></button>
   <button class="opt" data-a="like">${IC("heart")}<div>${lk?"Remover das Curtidas":"Curtir"}</div></button>
   <button class="opt" data-a="album">${IC("book")}<div>Ver o álbum ${albumOf(t).name}</div></button>
   ${inPl?html`<button class="opt" data-a="rm">${IC("less")}<div>Remover desta playlist</div></button>`:""}`,"Opções da música");
  qa(sheet, ".opt").forEach(b=>b.onclick=()=>{const a=b.dataset.a;closeSheet();
    if(a==="next")playNextId(id);else if(a==="queue")addQueue(id);else if(a==="like")toggleSongLike(id);
    else if(a==="pl")setTimeout(()=>pickPlaylist(id),280);
    else if(a==="album"){closeNP();if(!store.playerOpen)openPlayer();store.LV.det={type:"album",id:t.al};renderLib()}
    else if(a==="rm"){const p=store.pls.find(x=>x.id===store.LV.det?.id);if(!p)return;p.ids=p.ids.filter(x=>x!==id);saveMusic();renderLib();toast("Removida da playlist")}})}
export function pickPlaylist(id:string){
  openSheet(html`<h2>Adicionar à playlist</h2><p class="sub">${TT(id).t}</p>
   <button class="librow add" id="pkNew"><span class="cover sm addc">+</span><span class="tt"><b>Nova playlist</b></span></button>
   ${store.pls.map(p=>html`<button class="librow" data-pk="${p.id}">${cov({colors:p.c},"sm")}<span class="tt"><b>${p.name}</b><small>${p.ids.includes(id)?"Já está aqui":p.ids.length+" músicas"}</small></span></button>`)}`,"Escolher playlist");
  byId("pkNew").onclick=()=>{closeSheet();setTimeout(()=>newPlaylist(id),280)};
  qa(sheet, "[data-pk]").forEach(b=>b.onclick=()=>{const p=store.pls.find(x=>x.id===b.dataset.pk);if(!p)return;
    if(!p.ids.includes(id))p.ids.push(id);saveMusic();closeSheet();toast(html`Adicionada a <em>${(p.name)}</em>`);if(store.playerOpen)renderLib()})}
export function newPlaylist(withId?:string){
  openSheet(html`<h2>Nova playlist</h2><p class="sub">Escolha um nome. Você pode mudar depois.</p>
   <input id="plName" class="field" maxlength="40" placeholder="Ex.: Para orar de manhã" autocomplete="off">
   <div class="chips">${["Para orar de manhã","Domingo","Para dormir","Família"].map(n=>html`<button class="chip" data-n="${n}">${n}</button>`)}</div>
   <button class="primary" id="plOk" disabled>Criar playlist</button>`,"Nova playlist");
  const inp=byId<HTMLInputElement>("plName"),ok=byId<HTMLButtonElement>("plOk");setTimeout(()=>inp.focus(),350);
  inp.oninput=()=>ok.disabled=!inp.value.trim();
  qa(sheet, "[data-n]").forEach(b=>b.onclick=()=>{inp.value=b.dataset.n||"";ok.disabled=false});
  ok.onclick=()=>{const p={id:"pl"+Date.now(),name:cleanText(inp.value,40)||"Playlist",c:PLC[store.pls.length%PLC.length],ids:withId?[withId]:[]};store.pls.push(p);saveMusic();closeSheet();
    toast(html`Playlist <em>${(p.name)}</em> criada`);if(store.playerOpen){store.LV.det={type:"pl",id:p.id};renderLib()}}}
export function plMenu(pid:string){const p=store.pls.find(x=>x.id===pid);if(!p)return;
  openSheet(html`<h2>${p.name}</h2><p class="sub">Playlist · ${p.ids.length} músicas</p>
   <input id="plRen" class="field" maxlength="40" value="${p.name}" aria-label="Nome da playlist"><button class="sec" id="plSave" data-style="width:100%">Salvar nome</button>
   <button class="ghost" id="plDel" data-style="color:var(--heart);margin-top:8px">Excluir playlist</button>`,"Opções da playlist");
  byId("plSave").onclick=()=>{const v=cleanText(byId<HTMLInputElement>("plRen").value,40);if(v){p.name=v;saveMusic()}closeSheet();renderLib()};
  byId("plDel").onclick=e=>{const b=e.currentTarget as HTMLElement;if(!b.dataset.sure){b.dataset.sure="1";b.textContent="Toque de novo para excluir";return}
    store.pls=store.pls.filter(x=>x.id!==pid);saveMusic();closeSheet();store.LV.det=null;renderLib();toast("Playlist excluída")}}
