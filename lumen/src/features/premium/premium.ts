/* Seja Premium */
import { raw, setHTML } from "../../utils/html";
import { byId, byIdMaybe, qa } from "../../utils/dom";
import { html } from "../../utils/html";
import { setTab } from "../../app/navigation";
import { store } from "../../core/state";
import { feed, io } from "../feed/feed";
import { playerEl } from "../music/library";
import { updateMini } from "../music/mini-player";
import { renderPlayer } from "../music/now-playing";
import { P } from "../music/playback";
import { closeYou, renderYou, youEl } from "../profile/profile";
import { loadPulpit } from "../../app/lazy";
import { S } from "../../services/storage";
import { toast, vibrate } from "../../ui/effects";
import { IC } from "../../ui/icons";
import { closeSheet } from "../../ui/sheet";
import { SB, soon } from "../../ui/soon";

export const premEl=byId("prem"),prPage=byId("prPage");
export const PLANS=[{id:"anual",n:"Anual",d:"R$ 7,49 por mês · economize 50%",p:"R$ 89,90",u:"por ano",badge:"Mais escolhido"},
 {id:"mensal",n:"Mensal",d:"Cancele quando quiser",p:"R$ 14,90",u:"por mês"},{id:"familia",n:"Família",d:"Até 5 pessoas",p:"R$ 129,90",u:"por ano"}];
export const PERKS=[["Louvores completos, sem limite","Todos os álbuns, offline e com a tela desligada"],["Sem anúncios","O feed fica só com a Palavra"],
 ["Bíblia narrada e modo dormir","Versículos em voz calma com trilha suave"],["Planos de leitura e explicações","Contexto e aplicação de cada versículo"],
 ["Temas visuais exclusivos","Para o feed e para as imagens que você compartilha"],["Imagens sem marca d’água","E mais modelos para Stories"],["Púlpito com IA","Pregações com passagens, contexto e roteiro"]];
export function openPremium(){closeSheet();closeYou();if(store.playerOpen){store.playerOpen=false;playerEl.classList.remove("open");updateMini()}renderPremium();premEl.classList.add("open");setTab("premium")}
export function closePremium(){if(!premEl.classList.contains("open"))return;premEl.classList.remove("open");setTab(store.playerOpen?"listen":"feed")}
export const TOOLS=[{id:"pulpito",ic:"pulpit",n:"Púlpito",d:"Exemplo pronto e modo Pregar já disponíveis. Pregação com IA em breve.",go:()=>{loadPulpit().then(m=>m.openSerm())}},
 {id:"louvor",ic:"note",n:"Louvores sem limite",d:"Todos os álbuns completos, sem anúncio.",soon:"Louvores"},
 {id:"semads",ic:"noads",n:"Sem anúncios",d:"O feed fica só com a Palavra.",soon:"Lumen Premium"}];
export const SOON="Em breve: Bíblia narrada, planos de leitura e novos temas visuais.";
export function renderPremium(){const sel=PLANS.find(p=>p.id===store.plan);
  const tool=(t:typeof TOOLS[number])=>html`<button class="tool2" data-t="${t.id}">${IC(t.ic)}<div><b>${t.n}</b><small>${t.d}</small></div>${t.soon?raw('<span class="soonb">Em breve</span>'):IC("chev")}</button>`;
  setHTML(prPage, store.premium?html`<div class="pw">
    <button class="tool2 hero" data-t="pulpito">${IC("pulpit")}<b>Preparar uma pregação</b><small>Texto pronto para ler, uma parte por tela, com o contexto de cada passagem.</small><span class="primary" data-style="display:block;text-align:center">Abrir o Púlpito</span></button>
    <div class="tools2">${TOOLS.slice(1).map(tool)}</div><p class="soonline">${SOON}</p>
    <button class="ghost" id="prOff">Voltar ao plano grátis (demonstração)</button></div>`
   :html`<div class="pw"><div class="crown">${IC("star")}</div><h3>Lumen Premium</h3><p class="lead">Vá mais fundo na Palavra, sem interrupções.</p>
    <div class="tools2">${TOOLS.map(tool)}</div><p class="soonline">${SOON}</p>
    <div class="seg">${PLANS.map(p=>html`<button class="${p.id===store.plan?"on":""}" data-p="${p.id}" aria-pressed="${p.id===store.plan}">${p.id==="anual"?raw("<em>-50%</em>"):""}<span>${p.n}</span><strong>${p.p}</strong><small>${p.u}</small></button>`)}</div>
    <button class="primary" id="prGo">${SB} Me avise quando abrir</button>
    <p class="fine">Assinaturas em breve. Preços previstos, com 7 dias grátis para testar.</p></div>`);
  qa(prPage, ".tool2").forEach(b=>b.onclick=()=>{const t=TOOLS.find(x=>x.id===b.dataset.t);if(t&&t.go)t.go();else if(t)soon(t.soon)});
  qa(prPage, ".seg button").forEach(b=>b.onclick=()=>{store.plan=b.dataset.p||store.plan;vibrate(5);renderPremium()});
  const go=byIdMaybe("prGo");if(go)go.onclick=()=>soon("Lumen Premium");
  const off=byIdMaybe("prOff");if(off)off.onclick=()=>setPremium(false)}
export function setPremium(on:boolean){store.premium=on;S.set("lumen.prem",on);renderPremium();if(byId("serm").classList.contains("open"))loadPulpit().then(m=>m.renderSerm());
  if(youEl.classList.contains("open"))renderYou();
  if(on){qa(feed, ".card.ad").forEach(c=>{if(c!==store.active){io.unobserve(c);c.remove()}});P.gated=false;toast(html`Premium ativado <em>(demonstração)</em>`)}
  else toast("Você voltou ao plano grátis");
  if(store.playerOpen)renderPlayer();updateMini()}
