// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Ouvir: biblioteca, ranking, playlists e fila */
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
import { esc } from "../../utils/text";

export const saveMusic=()=>{S.set("lumen.songLikes",store.songLikes);S.set("lumen.pls",store.pls);S.set("lumen.plays",store.plays);S.set("lumen.recentS",store.recentS)};
export const T=id=>TR.find(t=>t.id===id);
export const PLC=[["#F2C879","#D9676F"],["#9EC5E8","#4B4785"],["#C8DDA9","#5E8C6A"],["#F2B8C6","#8E6AA8"],["#F7D9A0","#9C6B4A"]];
export const Q={ids:[],i:0,shuffle:false,repeat:"off",src:""};
export const playerEl=document.getElementById("player"),pPage=document.getElementById("pPage"),npEl=document.getElementById("np"),npPage=document.getElementById("npPage");
export const baseCount=(t,r)=>{const h=hsh(t.id+r);return r==="week"?120+h%880:2400+h%9600};
export function ranking(r){const now=TR.map(t=>({t,n:baseCount(t,r)+(store.plays[t.id]||0)})).sort((a,b)=>b.n-a.n);
  return now.slice(0,10).map((x,i)=>{const h=hsh(x.t.id+"mv"+r)%9,mv=store.plays[x.t.id]?Math.max(1,h%4):h<3?0:h<6?h-2:-(h-5);return {...x,pos:i+1,mv:i===0&&mv>0?0:mv}})}
export function shuffleArr(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
export function playQueue(ids,i=0,src=""){ids=ids.filter(T);if(!ids.length)return;const first=ids[i];
  Q.ids=Q.shuffle?[first,...shuffleArr(ids.filter((_,k)=>k!==i))]:ids.slice();Q.i=Q.shuffle?0:i;Q.src=src;startCur()}
export function startCur(){const t=T(Q.ids[Q.i]);if(!t)return;play(t,"player",0);
  store.plays[t.id]=(store.plays[t.id]||0)+1;store.recentS=[t.id,...store.recentS.filter(x=>x!==t.id)].slice(0,12);saveMusic();renderPlayer()}
export function nextTrack(manual){if(!Q.ids.length)return;
  if(Q.repeat==="one"&&!manual){startCur();return}
  if(Q.i+1>=Q.ids.length){if(Q.repeat==="all"||manual){Q.i=0;startCur()}else{pause();P.offset=0;renderPlayer()}return}
  Q.i++;startCur()}
export function prevTrack(){if(elapsed()>3||Q.i===0){play(P.tr,"player",0);renderPlayer();return}Q.i--;startCur()}
export function playNextId(id){if(!Q.ids.length||P.mode!=="player"){playQueue([id],0,"");return}Q.ids.splice(Q.i+1,0,id);toast("Toca a seguir");renderPlayer()}
export function addQueue(id){if(!Q.ids.length||P.mode!=="player"){playQueue([id],0,"");return}Q.ids.push(id);toast("Adicionada à fila");renderPlayer()}
export function toggleSongLike(id,btn){const on=!store.songLikes.includes(id);store.songLikes=on?[id,...store.songLikes]:store.songLikes.filter(x=>x!==id);saveMusic();
  if(btn){btn.classList.toggle("on",on);if(on){btn.classList.remove("pop");void btn.offsetWidth;btn.classList.add("pop");vibrate(8)}}
  toast(on?"Adicionada às <em>Curtidas</em>":"Removida das Curtidas");
  document.querySelectorAll(`.hb[data-h="${id}"]`).forEach(b=>b.classList.toggle("on",on))}
export function openPlayer(tr,autoplay){premEl.classList.remove("open");closeYou();store.playerOpen=true;setTab("listen");document.body.classList.remove("focus");
  if(tr&&autoplay&&store.musicPreview){const l=TR.filter(t=>t.al===tr.al);playQueue(l.map(t=>t.id),l.indexOf(tr),albumOf(tr).name);openNP()}
  renderLib();playerEl.classList.add("open");updateMini()}
export function closePlayer(){if(!store.playerOpen)return;store.playerOpen=false;playerEl.classList.remove("open");setTab("feed");updateMini()}
export function openNP(){if(!P.tr||P.mode!=="player"){const r=store.recentS[0]||"t4";playQueue([r],0,"")}store.npOpen=true;renderNP();npEl.classList.add("open");updateMini()}
export function closeNP(){store.npOpen=false;npEl.classList.remove("open");updateMini()}
export const cov=(al,cls="")=>`<span class="cover ${cls}" style="${coverStyle(al)}"></span>`;
export const isCur=id=>P.mode==="player"&&P.tr&&P.tr.id===id;
export function trow(t,k,o={}){const al=albumOf(t),lk=store.songLikes.includes(t.id);
  return `<div class="trow ${isCur(t.id)?"on":""}" data-t="${t.id}">
   ${o.grip?`<span class="grip" aria-label="Arrastar para reordenar"><svg viewBox="0 0 24 24"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg></span>`:""}
   ${o.rank?`<span class="rk"><b>${o.rank.pos}</b><i class="${o.rank.mv>0?"up":o.rank.mv<0?"dn":""}">${o.rank.mv>0?"▲"+o.rank.mv:o.rank.mv<0?"▼"+(-o.rank.mv):"–"}</i></span>`:""}
   <button class="tplay" data-k="${k}">${cov(al,"sm")}<span class="tt"><b>${isCur(t.id)?'<span class="eq"><i></i><i></i><i></i></span>':""}${t.t}</b><small>${o.rank?fmtN(o.rank.n)+" reproduções":al.name+" · "+mmss(t.dur)}</small></span></button>
   <button class="hb ${lk?"on":""}" data-h="${t.id}" aria-label="Curtir música">${IC("heart")}</button>
   <button class="mb" data-m="${t.id}" aria-label="Mais opções">${IC("more")}</button></div>`}
export function list(ids,key,src,o={}){store.ctx[key]={ids,src};return `<div class="tlist" data-ctx="${key}">${ids.map(T).filter(Boolean).map((t,k)=>trow(t,k,typeof o==="function"?o(t,k):o)).join("")}</div>`}
export function bindLists(root){
  root.querySelectorAll(".tlist").forEach(L=>{const c=store.ctx[L.dataset.ctx];
    L.querySelectorAll(".tplay").forEach(b=>b.onclick=()=>{playQueue(c.ids,+b.dataset.k,c.src);if(!canFull())toast("Prévia de 30 s · <em>ouça completo com anúncio ou Premium</em>")});
    L.querySelectorAll(".hb").forEach(b=>b.onclick=()=>toggleSongLike(b.dataset.h,b));
    L.querySelectorAll(".mb").forEach(b=>b.onclick=()=>songMenu(b.dataset.m,c))})}
export function renderLib(){store.ctx={};document.getElementById("pPrem").hidden=true;
  if(!store.musicPreview){pPage.innerHTML=`<div class="sw soonpage"><div class="albums" aria-hidden="true">${ALBUMS.slice(0,3).map(a=>`<span class="cover" style="${coverStyle(a)}">${a.name}</span>`).join("")}</div>
    ${SB}<h3>Louvores originais</h3><p class="lead">${SOONS.Louvores}</p>
    <button class="primary" id="ntfM">${S.get("lumen.notify",[]).includes("Louvores")?"Você será avisado":"Me avise quando chegar"}</button><button class="ghost" id="prevM">Ver prévia do player</button></div>`;
    document.getElementById("ntfM").onclick=()=>{S.set("lumen.notify",[...new Set([...S.get("lumen.notify",[]),"Louvores"])]);toast("Combinado. <em>Vamos te avisar</em>");renderLib()};
    document.getElementById("prevM").onclick=()=>{store.musicPreview=true;renderLib()};return}
  let h="";const d=store.LV.det;
  if(d){const back=`<button class="backrow" id="libBack">${IC("back")}Voltar</button>`;
    if(d.type==="album"){const al=ALBUMS.find(a=>a.id===d.id),ids=TR.filter(t=>t.al===al.id).map(t=>t.id);
      h=back+head(al.name,`Álbum · ${ids.length} faixas`,cov(al,"md"),ids,al.name)+list(ids,"det",al.name)}
    else if(d.type==="liked"){h=back+head("Curtidas",`${store.songLikes.length} ${store.songLikes.length===1?"música":"músicas"}`,`<span class="cover md likedc">${IC("heart")}</span>`,store.songLikes,"Curtidas")+
      (store.songLikes.length?list(store.songLikes,"det","Curtidas"):`<div class="empty">Toque no coração de uma música e ela aparece aqui.</div>`)}
    else if(d.type==="mood"){const ids=moodIds(d.id);h=back+head("Para "+d.id,"Seleção feita a partir do que você curte no feed",cov({colors:moodColors(d.id)},"md"),ids,"Para "+d.id)+list(ids,"det","Para "+d.id)}
    else if(d.type==="pl"){const p=store.pls.find(x=>x.id===d.id);if(!p){store.LV.det=null;return renderLib()}
      h=back+head(p.name,`Playlist · ${p.ids.length} ${p.ids.length===1?"música":"músicas"}`,cov({colors:p.c},"md"),p.ids,p.name,true)+
      (p.ids.length?list(p.ids,"det",p.name,{grip:true})+`<p class="fine">Arraste <b>⋮⋮</b> para mudar a ordem.</p>`:`<div class="empty">Use <b>⋯</b> em qualquer música e escolha <b>Adicionar à playlist</b>.</div>`)}}
  else{h=`<div class="mtabs" role="tablist">${[["home","Início"],["rank","Ranking"],["lib","Biblioteca"]].map(([k,n])=>`<button role="tab" data-v="${k}" class="${store.LV.tab===k?"on":""}" aria-selected="${store.LV.tab===k}">${n}</button>`).join("")}</div>`;
    if(store.LV.tab==="home"){const last=(P.mode==="player"&&P.tr)?P.tr:T(store.recentS[0]||"");
      if(last){const al=albumOf(last);h+=`<button class="cont" id="cont">${cov(al,"md")}<span><small>Continuar ouvindo</small><b>${last.t}</b><em>${al.name}</em></span><span class="pbig">${isCur(last.id)&&P.playing?I.pause:I.play}</span></button>`}
      h+=`<div class="label">Álbuns do Lumen</div><div class="albums">${ALBUMS.map(a=>`<button data-a="${a.id}"><span class="cover" style="${coverStyle(a)}">${a.name}</span><span>${TR.filter(t=>t.al===a.id).length} faixas</span></button>`).join("")}</div>
       <div class="label" style="margin-top:22px">Para o seu momento</div><div class="moods">${moods().map(m=>`<button data-mood="${m}"><span class="cover" style="${coverStyle({colors:moodColors(m)})}">Para ${m}</span></button>`).join("")}</div>`}
    else if(store.LV.tab==="rank"){const R=ranking(store.LV.range);
      h+=`<div class="rkhead"><div class="chips">${[["week","Esta semana"],["all","Sempre"]].map(([k,n])=>`<button class="chip ${store.LV.range===k?"on":""}" data-r="${k}">${n}</button>`).join("")}</div>
       <button class="primary playall" id="playTop">${IC("play")}Tocar o Top 10</button></div>
       ${list(R.map(x=>x.t.id),"rank","Top 10",(t,k)=>({rank:R[k]}))}<p class="fine">Números de exemplo da comunidade, somados ao que você ouve.</p>`}
    else{h+=`<button class="librow" id="goLiked"><span class="cover sm likedc">${IC("heart")}</span><span class="tt"><b>Curtidas</b><small>${store.songLikes.length} ${store.songLikes.length===1?"música":"músicas"}</small></span>${IC("chev")}</button>
       ${store.pls.map(p=>`<button class="librow" data-pl="${p.id}">${cov({colors:p.c},"sm")}<span class="tt"><b>${esc(p.name)}</b><small>Playlist · ${p.ids.length}</small></span>${IC("chev")}</button>`).join("")}
       <button class="librow add" id="newPl"><span class="cover sm addc">+</span><span class="tt"><b>Nova playlist</b><small>Dê um nome e adicione músicas</small></span></button>
       ${store.recentS.length?`<div class="label" style="margin-top:24px">Ouvidas recentemente</div>`+list(store.recentS.slice(0,8),"rec","Recentes"):""}`}}
  pPage.innerHTML=`<div class="sw ouvir"><div class="prevbar">${SB} Prévia com faixas de demonstração</div>${h}</div>`;bindLists(pPage);
  const $=id=>document.getElementById(id);
  pPage.querySelectorAll(".mtabs button").forEach(b=>b.onclick=()=>{store.LV.tab=b.dataset.v;vibrate(4);renderLib()});
  pPage.querySelectorAll(".albums button").forEach(b=>b.onclick=()=>{store.LV.det={type:"album",id:b.dataset.a};renderLib();pPage.scrollTop=0});
  pPage.querySelectorAll(".moods button").forEach(b=>b.onclick=()=>{store.LV.det={type:"mood",id:b.dataset.mood};renderLib();pPage.scrollTop=0});
  pPage.querySelectorAll("[data-pl]").forEach(b=>b.onclick=()=>{store.LV.det={type:"pl",id:b.dataset.pl};renderLib();pPage.scrollTop=0});
  pPage.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{store.LV.range=b.dataset.r;renderLib()});
  if($("libBack"))$("libBack").onclick=()=>{store.LV.det=null;renderLib()};
  if($("goLiked"))$("goLiked").onclick=()=>{store.LV.det={type:"liked"};renderLib();pPage.scrollTop=0};
  if($("newPl"))$("newPl").onclick=()=>newPlaylist();
  if($("playTop"))$("playTop").onclick=()=>playQueue(store.ctx.rank.ids,0,"Top 10");
  if($("cont"))$("cont").onclick=()=>{const t=(P.mode==="player"&&P.tr)||T(store.recentS[0]);if(isCur(t.id))openNP();else{playQueue([t.id],0,"");openNP()}};
  pPage.querySelectorAll("[data-hp]").forEach(b=>b.onclick=()=>{const c=store.ctx.det;if(!c.ids.length)return;
    if(b.dataset.hp==="shuffle"){Q.shuffle=true;playQueue(c.ids,Math.random()*c.ids.length|0,c.src)}else{Q.shuffle=false;playQueue(c.ids,0,c.src)}});
  const pm=$("plMenu");if(pm)pm.onclick=()=>plMenu(store.LV.det.id);
  const dl=pPage.querySelector('.tlist[data-ctx="det"]');if(dl&&store.LV.det.type==="pl")enableDrag(dl,ids=>{const p=store.pls.find(x=>x.id===store.LV.det.id);p.ids=ids;saveMusic();renderLib()})}
export function head(title,sub,cover,ids,src,isPl){return `<div class="dhead">${cover}<div class="dt"><h3>${esc(title)}</h3><p>${sub}</p></div></div>
  <div class="dact"><button class="primary" data-hp="play" ${ids.length?"":"disabled"}>${IC("play")}Tocar</button><button class="sec" data-hp="shuffle" ${ids.length?"":"disabled"}>Aleatório</button>${isPl?`<button class="mb big" id="plMenu" aria-label="Opções da playlist">${IC("more")}</button>`:""}</div>`}
export function moods(){const top=Object.entries(store.taste).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);return [...new Set([...top,"paz","gratidão","coragem","descanso"])].slice(0,4)}
export function moodIds(m){const al=ALBUMS.filter(a=>a.tags.includes(m)||a.tags.some(t=>(NEAR[m]||[]).includes(t)));return TR.filter(t=>al.some(a=>a.id===t.al)).sort((a,b)=>hsh(a.id+m)%97-hsh(b.id+m)%97).slice(0,8).map(t=>t.id)}
export function moodColors(m){const al=ALBUMS.find(a=>a.tags.includes(m))||ALBUMS[1];return [al.colors[1],al.colors[0]]}
export function songMenu(id,c){const t=T(id),lk=store.songLikes.includes(id),inPl=store.LV.det&&store.LV.det.type==="pl"&&c===store.ctx.det;
  openSheet(`<div class="shead">${cov(albumOf(t),"sm")}<div><h2>${t.t}</h2><p class="sub" style="margin:0">${albumOf(t).name}</p></div></div>
   <button class="opt" data-a="next">${IC("send")}<div>Tocar a seguir</div></button>
   <button class="opt" data-a="queue">${IC("disc")}<div>Adicionar à fila</div></button>
   <button class="opt" data-a="pl">${IC("note")}<div>Adicionar à playlist</div></button>
   <button class="opt" data-a="like">${IC("heart")}<div>${lk?"Remover das Curtidas":"Curtir"}</div></button>
   <button class="opt" data-a="album">${IC("book")}<div>Ver o álbum ${albumOf(t).name}</div></button>
   ${inPl?`<button class="opt" data-a="rm">${IC("less")}<div>Remover desta playlist</div></button>`:""}`,"Opções da música");
  sheet.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{const a=b.dataset.a;closeSheet();
    if(a==="next")playNextId(id);else if(a==="queue")addQueue(id);else if(a==="like")toggleSongLike(id);
    else if(a==="pl")setTimeout(()=>pickPlaylist(id),280);
    else if(a==="album"){closeNP();if(!store.playerOpen)openPlayer();store.LV.det={type:"album",id:t.al};renderLib()}
    else if(a==="rm"){const p=store.pls.find(x=>x.id===store.LV.det.id);p.ids=p.ids.filter(x=>x!==id);saveMusic();renderLib();toast("Removida da playlist")}})}
export function pickPlaylist(id){
  openSheet(`<h2>Adicionar à playlist</h2><p class="sub">${T(id).t}</p>
   <button class="librow add" id="pkNew"><span class="cover sm addc">+</span><span class="tt"><b>Nova playlist</b></span></button>
   ${store.pls.map(p=>`<button class="librow" data-pk="${p.id}">${cov({colors:p.c},"sm")}<span class="tt"><b>${esc(p.name)}</b><small>${p.ids.includes(id)?"Já está aqui":p.ids.length+" músicas"}</small></span></button>`).join("")}`,"Escolher playlist");
  document.getElementById("pkNew").onclick=()=>{closeSheet();setTimeout(()=>newPlaylist(id),280)};
  sheet.querySelectorAll("[data-pk]").forEach(b=>b.onclick=()=>{const p=store.pls.find(x=>x.id===b.dataset.pk);
    if(!p.ids.includes(id))p.ids.push(id);saveMusic();closeSheet();toast(`Adicionada a <em>${esc(p.name)}</em>`);if(store.playerOpen)renderLib()})}
export function newPlaylist(withId){
  openSheet(`<h2>Nova playlist</h2><p class="sub">Escolha um nome. Você pode mudar depois.</p>
   <input id="plName" class="field" maxlength="40" placeholder="Ex.: Para orar de manhã" autocomplete="off">
   <div class="chips">${["Para orar de manhã","Domingo","Para dormir","Família"].map(n=>`<button class="chip" data-n="${n}">${n}</button>`).join("")}</div>
   <button class="primary" id="plOk" disabled>Criar playlist</button>`,"Nova playlist");
  const inp=document.getElementById("plName"),ok=document.getElementById("plOk");setTimeout(()=>inp.focus(),350);
  inp.oninput=()=>ok.disabled=!inp.value.trim();
  sheet.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{inp.value=b.dataset.n;ok.disabled=false});
  ok.onclick=()=>{const p={id:"pl"+Date.now(),name:inp.value.trim().slice(0,40),c:PLC[store.pls.length%PLC.length],ids:withId?[withId]:[]};store.pls.push(p);saveMusic();closeSheet();
    toast(`Playlist <em>${esc(p.name)}</em> criada`);if(store.playerOpen){store.LV.det={type:"pl",id:p.id};renderLib()}}}
export function plMenu(pid){const p=store.pls.find(x=>x.id===pid);
  openSheet(`<h2>${esc(p.name)}</h2><p class="sub">Playlist · ${p.ids.length} músicas</p>
   <input id="plRen" class="field" maxlength="40" value="${esc(p.name)}" aria-label="Nome da playlist"><button class="sec" id="plSave" style="width:100%">Salvar nome</button>
   <button class="ghost" id="plDel" style="color:var(--heart);margin-top:8px">Excluir playlist</button>`,"Opções da playlist");
  document.getElementById("plSave").onclick=()=>{const v=document.getElementById("plRen").value.trim();if(v){p.name=v.slice(0,40);saveMusic()}closeSheet();renderLib()};
  document.getElementById("plDel").onclick=e=>{const b=e.currentTarget;if(!b.dataset.sure){b.dataset.sure=1;b.textContent="Toque de novo para excluir";return}
    store.pls=store.pls.filter(x=>x.id!==pid);saveMusic();closeSheet();store.LV.det=null;renderLib();toast("Playlist excluída")}}
