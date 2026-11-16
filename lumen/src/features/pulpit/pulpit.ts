/* Púlpito: preparar e pregar */
import type { Passage, Sermon } from "../../types";
import { byId, byIdMaybe, q, qMaybe, qa } from "../../utils/dom";
import { store } from "../../core/state";
import { NEAR } from "../../data/themes";
import { EXAMPLE, EXEMPLOS } from "./example";
import { FORMATOS, ROTULO_TIPO, promptMensagem, type Formato, type TipoParte } from "./formatos";
import { startPreach } from "./preach";
import { lookupRef } from "../../services/bible";
import { IC } from "../../ui/icons";
import { openSheet } from "../../ui/sheet";
import { SB, soon } from "../../ui/soon";
import { clip } from "../../utils/clipboard";
import { cap, cleanText } from "../../utils/text";
import { html, setHTML, type SafeHtml } from "../../utils/html";
import { parseSermon } from "../../security/sermon-schema";

export const smEl=byId("serm"),smPage=byId("smPage");
export const SM:{formato:Formato;tema:string;ocasiao:string;dur:number;ref:string}={formato:"pregacao",tema:"esperança",ocasiao:"Culto de domingo",dur:15,ref:""};
export const OCAS=FORMATOS.pregacao.ocasioes;
export function openSerm(){if(!store.sermon)store.sermon=EXAMPLE;renderSerm();smEl.classList.add("open");document.body.classList.remove("focus")}
export function chipRow<K extends "formato"|"tema"|"ocasiao"|"dur">(key:K,label:string,opts:(string|number)[],fmt?:(o:any)=>string){return html`<div class="label">${label}</div><div class="chips">${opts.map(o=>html`<button class="chip ${SM[key]===o?"on":""}" data-k="${key}" data-v="${o}">${fmt?fmt(o):o}</button>`)}</div>`}
export function renderSerm(){
  setHTML(smPage, html`<div class="sw"><div id="smOut">${store.sermon?sermonHTML(store.sermon):""}</div>
   <details class="newsm" ${store.sermon?"":"open"}><summary>Montar uma nova mensagem ${IC("chev")}</summary>
   ${chipRow("formato","Formato",Object.keys(FORMATOS),f=>FORMATOS[f as Formato].nome)}
   <p class="fine fmt-resumo">${FORMATOS[SM.formato].resumo}</p>
   ${chipRow("tema","Tema",Object.keys(NEAR),cap)}
   <div class="label">Texto base <span data-style="text-transform:none;letter-spacing:0;font-weight:500">(opcional)</span></div>
   <input id="smRef" class="field" placeholder="Ex.: Salmos 23 ou João 15:1-5" value="${SM.ref}" autocomplete="off">
   ${chipRow("ocasiao","Para quem",FORMATOS[SM.formato].ocasioes)}${chipRow("dur","Duração",FORMATOS[SM.formato].duracoes,d=>d+" min")}
   <button class="primary" id="smGo">${store.premium?`Gerar ${FORMATOS[SM.formato].nome.toLowerCase()} com IA`:html`${SB} Gerar com IA`}</button></details></div>`);
  qa(smPage, ".chip").forEach(b=>b.onclick=()=>{const k=b.dataset.k,v=b.dataset.v||"";
    if(k==="formato"&&v in FORMATOS){trocarFormato(v as Formato);return}
    if(k==="dur")SM.dur=Number(v)||15;else if(k==="tema"||k==="ocasiao")SM[k]=v;
    qa(smPage, `.chip[data-k="${k}"]`).forEach(x=>x.classList.toggle("on",x===b))});
  byId<HTMLInputElement>("smRef").oninput=e=>SM.ref=cleanText((e.target as HTMLInputElement).value,60);
  byId("smGo").onclick=generate;bindSermon()}
export function sermPrompt(){return promptMensagem({formato:SM.formato,tema:SM.tema,ocasiao:SM.ocasiao,dur:SM.dur,ref:SM.ref})}
/** Troca o formato: ajusta ocasião e duração e, se a tela mostra um exemplo, mostra o exemplo do novo formato. */
export function trocarFormato(f:Formato){const F=FORMATOS[f];SM.formato=f;
  if(!F.ocasioes.includes(SM.ocasiao))SM.ocasiao=F.ocasioes[0];if(!F.duracoes.includes(SM.dur))SM.dur=F.duracoes[0];
  if(!store.sermon||!store.sermon.ia)store.sermon=EXEMPLOS[f];
  const aberto=qMaybe<HTMLDetailsElement>(document,".newsm")?.open;renderSerm();const d=qMaybe<HTMLDetailsElement>(document,".newsm");if(d&&aberto)d.open=true}
export async function generate(){
  if(!store.premium){soon("Pregação com IA");return}
  const out=byId("smOut");q<HTMLDetailsElement>(document, ".newsm").open=false;smPage.scrollTo({top:0,behavior:"smooth"});
  if(!store.SAMPLE){const ex=EXEMPLOS[SM.formato];setHTML(out,html`<p class="disclaim">A geração com IA funciona com o protótipo aberto no Claude. Abaixo está o exemplo pronto.</p>${sermonHTML(ex)}`);store.sermon=ex;bindSermon();return}
  const ctl=new AbortController();store.smCtl?.abort();store.smCtl=ctl;const btn=byId<HTMLButtonElement>("smGo");btn.disabled=true;
  const steps=["Escolhendo as passagens…","Buscando o contexto de cada uma…","Escrevendo a fala, parte por parte…","Ajustando ao tempo da pregação…"];let si=0;
  setHTML(out,html`<div class="gen"><div class="breath" data-style="width:90px;height:90px"></div><b id="genTxt">${steps[0]}</b><small>Pode levar um ou dois minutos.</small><button class="ghost" id="genStop">Parar</button></div>`);
  const iv=setInterval(()=>{si=Math.min(si+1,steps.length-1);const g=byIdMaybe("genTxt");if(g)g.textContent=steps[si]},15000);
  byId("genStop").onclick=()=>ctl.abort();
  try{const answer=await store.SAMPLE.json(sermPrompt(),{signal:ctl.signal,cache:false});
    // A resposta da IA é dado não confiável: validamos o formato e limpamos cada campo antes de mostrar.
    const r=parseSermon(answer,SM.dur);if(!r)throw{code:"invalid_json"};
    // O texto bíblico sempre vem da Bíblia do app, nunca da IA.
    for(const ps of r.passagens){const t=await lookupRef(ps.ref);if(t)ps.texto=t;else ps.conferir=true}
    store.sermon={...r,formato:r.formato||SM.formato,tema:SM.tema,ocasiao:SM.ocasiao,minutos:SM.dur,ia:true};setHTML(out,sermonHTML(store.sermon));bindSermon()}
  catch(e){const code=(e as {code?:string})?.code||"";const msgs:Record<string,string>={cancelled:"Geração interrompida.",not_granted:"Você não permitiu o uso do Claude nesta página.",rate_limited:"Muitos pedidos seguidos. Espere um pouco e tente de novo.",
      invalid_json:"A resposta veio incompleta. Tente gerar de novo, ou escolha uma duração menor.",refused:"Não foi possível gerar com esse pedido. Tente outro tema ou passagem."};const msg=msgs[code]||"Algo deu errado. Tente de novo em instantes.";
    setHTML(out,html`<p class="disclaim">${msg}</p>${store.sermon?sermonHTML(store.sermon):""}`);bindSermon()}
  finally{clearInterval(iv);btn.disabled=false}}
export const firstLine=(f:string)=>{const t=String(f).replace(/\[LEITURA\]/gi,"").replace(/\([^)]*\)/g,"").split(/\n+/).map(x=>x.trim()).filter(Boolean)[0]||"";
  if(t.length<=160)return t;const fr=t.match(/[^.!?]+[.!?]+/g)||[t];let out="";for(const x of fr){if((out+x).length>160&&out)break;out+=x}return out.length>200?out.slice(0,out.lastIndexOf(" ",180))+"…":out.trim()};
export function sermonHTML(s:Sermon):SafeHtml{const ps=s.passagens||[],C=["#F2C879","#9EC5E8","#E8A9A9","#A9D3C7","#C9B6E8"],F=FORMATOS[s.formato||"pregacao"];
  const base=ps.find(p=>p.ref===s.texto_base)||ps[0];let k=0;
  return html`<div class="outline">${s.ia?"":html`<span class="ex-tag">Exemplo pronto · ${F.nome}</span>`}<h3>${s.titulo}</h3>
   <p class="meta">${F.nome} · ${s.ocasiao||""} · ${s.minutos||""} min</p>
   ${base?html`<button class="texto-base pcard" data-i="${ps.indexOf(base)}"><small>Texto base</small><b>${base.ref}</b><span class="pt">${String(base.texto).slice(0,160)}${String(base.texto).length>160?"…":""}</span><span class="go">${base.conferir?"Confira na sua Bíblia ›":"Entender o contexto ›"}</span></button>`:""}
   <div class="big-idea"><small>Tema</small>${s.tema_frase||s.tema||""}</div>
   ${s.ideia_central?html`<p class="ideia"><b>Ideia central:</b> ${s.ideia_central}</p>`:""}
   <button class="primary go-preach" id="goPreach">${IC("play")}${F.acao}</button>
   <p class="fine">Texto pronto para ler, uma parte por tela, com letra grande.</p>
   <div class="label" data-style="margin-top:24px">Esboço</div>
   <ol class="tl esboco">${(s.partes||[]).map(r=>{const t=(r.tipo||"") as TipoParte,rot=t?ROTULO_TIPO[t]+(t==="desenvolvimento"?` ${++k}`:""):"",tit=r.nome.replace(/^Desenvolvimento \d+:\s*/,"");
     return html`<li class="tp-${t||"x"}"><div class="tm">${r.min} min</div><div>${rot?html`<span class="tipo">${rot}</span>`:""}<b>${t==="desenvolvimento"||!rot?tit:""}</b>${r.ref?html`<em class="ref">${r.ref}</em>`:""}<p>${firstLine(r.fala)}</p></div></li>`})}</ol>
   ${ps.length>1?html`<div class="label" data-style="margin-top:24px">Passagens · toque para entender o contexto</div>
   <div class="pcards">${ps.map((p,i)=>p===base?"":html`<button class="pcard" data-i="${i}" data-style="--c1:${C[i%5]}"><span class="pn">${i}</span><b>${p.ref}</b><span class="pt">${String(p.texto).slice(0,90)}${String(p.texto).length>90?"…":""}</span><span class="go">${p.conferir?"Confira na sua Bíblia ›":"Entender o contexto ›"}</span></button>`)}</div>`:""}
   <div class="row" data-style="margin-top:8px"><button class="sec" id="smCopy">Copiar esboço e texto</button><button class="sec" id="smNew">Nova mensagem</button></div>
   <p class="disclaim">Este texto é um ponto de partida. Confira as passagens na sua Bíblia, ore e fale com o seu coração.</p></div>`}
export function openPassage(p:Passage){
  openSheet(html`<div class="pass"><span class="k">Para ler em voz alta</span><h2>${p.ref}</h2>
   <blockquote class="read-me">“${p.texto}”</blockquote>
   <div class="ctx"><div>${IC("quill")}<div><b>Quem escreveu</b><p>${p.quem}</p></div></div>
    <div>${IC("people")}<div><b>Para quem</b><p>${p.para_quem}</p></div></div>
    <div>${IC("hourglass")}<div><b>O que estava acontecendo</b><p>${p.quando}</p></div></div></div>
   <div class="label">Explicando de um jeito simples</div><p class="simple">${p.explicacao}</p>
   ${(p.palavras||[]).length?html`<div class="label">${IC("lens")} Palavras difíceis</div><dl class="gloss">${p.palavras.map(w=>html`<dt>${w.p}</dt><dd>${w.s}</dd>`)}</dl>`:""}
   <div class="keep"><small>Para levar para casa</small>${p.lembrar}</div>
   <button class="sec" id="psCopy" data-style="width:100%;margin-top:16px">Copiar texto bíblico</button></div>`,"Contexto da passagem");
  byId("psCopy").onclick=()=>clip(`${p.texto} (${p.ref})`,"Texto copiado")}
/** Texto corrido da pregação, para copiar. */
export function plainSermon(s:Sermon){const P=(r:string)=>s.passagens.find(p=>p.ref===r);
  const F=FORMATOS[s.formato||"pregacao"];
  return [`${s.titulo}\n${F.nome} · ${s.minutos||""} min`,`TEXTO BASE: ${s.texto_base||s.passagens[0]?.ref||""}${P(s.texto_base||"")?`\n“${P(s.texto_base||"")!.texto}”`:""}`,`TEMA: ${s.tema_frase||s.tema||""}`,`IDEIA CENTRAL: ${s.ideia_central}`,"",...s.partes.map(r=>`${r.nome.toUpperCase()} (${r.min} min)\n`+String(r.fala).replace(/\[LEITURA\]/gi,()=>{const p=P(r.ref);return p?`“${p.texto}” (${r.ref})`:""}))].join("\n\n")}
export function bindSermon(){const s=qMaybe(document, ".outline");if(!s)return;const cur=store.sermon||EXAMPLE;
  qa(s, ".pcard").forEach(b=>b.onclick=()=>openPassage(cur.passagens[Number(b.dataset.i)]));
  byId("goPreach").onclick=()=>startPreach(cur);
  byId("smCopy").onclick=()=>clip(plainSermon(cur),"Pregação copiada");
  byId("smNew").onclick=()=>{const d=q<HTMLDetailsElement>(document, ".newsm");d.open=true;d.scrollIntoView({behavior:"smooth"})}}
