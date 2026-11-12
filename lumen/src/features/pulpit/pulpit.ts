/* Púlpito: preparar e pregar */
import type { Passage, Sermon } from "../../types";
import { byId, byIdMaybe, q, qMaybe, qa } from "../../utils/dom";
import { store } from "../../core/state";
import { NEAR } from "../../data/themes";
import { EXAMPLE } from "./example";
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
export const SM:{tema:string;ocasiao:string;dur:number;ref:string}={tema:"esperança",ocasiao:"Culto de domingo",dur:15,ref:""};
export const OCAS=["Culto de domingo","Jovens","Célula","Crianças","Culto de oração"];
export function openSerm(){if(!store.sermon)store.sermon=EXAMPLE;renderSerm();smEl.classList.add("open");document.body.classList.remove("focus")}
export function chipRow<K extends "tema"|"ocasiao"|"dur">(key:K,label:string,opts:(string|number)[],fmt?:(o:any)=>string){return html`<div class="label">${label}</div><div class="chips">${opts.map(o=>html`<button class="chip ${SM[key]===o?"on":""}" data-k="${key}" data-v="${o}">${fmt?fmt(o):o}</button>`)}</div>`}
export function renderSerm(){
  setHTML(smPage, html`<div class="sw"><div id="smOut">${store.sermon?sermonHTML(store.sermon):""}</div>
   <details class="newsm" ${store.sermon?"":"open"}><summary>Montar uma nova pregação ${IC("chev")}</summary>
   ${chipRow("tema","Tema",Object.keys(NEAR),cap)}
   <div class="label">Passagem principal <span data-style="text-transform:none;letter-spacing:0;font-weight:500">(opcional)</span></div>
   <input id="smRef" class="field" placeholder="Ex.: Salmos 23 ou João 15:1-5" value="${SM.ref}" autocomplete="off">
   ${chipRow("ocasiao","Para quem",OCAS)}${chipRow("dur","Duração",[15,30,45],d=>d+" min")}
   <button class="primary" id="smGo">${store.premium?"Gerar pregação com IA":html`${SB} Gerar com IA`}</button></details></div>`);
  qa(smPage, ".chip").forEach(b=>b.onclick=()=>{const k=b.dataset.k,v=b.dataset.v||"";if(k==="dur")SM.dur=Number(v)||15;else if(k==="tema"||k==="ocasiao")SM[k]=v;
    qa(smPage, `.chip[data-k="${k}"]`).forEach(x=>x.classList.toggle("on",x===b))});
  byId<HTMLInputElement>("smRef").oninput=e=>SM.ref=cleanText((e.target as HTMLInputElement).value,60);
  byId("smGo").onclick=generate;bindSermon()}
export function sermPrompt(){const n=SM.dur<=15?3:SM.dur<=30?4:5,wpm=SM.dur<=15?120:105;
  return `Escreva uma pregação de ${SM.dur} minutos, pronta para ser LIDA em voz alta no celular, em português do Brasil. Para: ${SM.ocasiao}. Tema: ${SM.tema}.${SM.ref?` Passagem principal escolhida: ${SM.ref} (use como a primeira passagem).`:""}

COMO ESCREVER A FALA
- Escreva como o próprio pregador falando com a igreja, em primeira pessoa ("eu", "a gente", "você"). Tom caloroso, simples e direto, como uma conversa.
- Frases curtas. Palavras do dia a dia. Uma criança de 10 a 12 anos precisa entender tudo. Se aparecer uma palavra difícil, explique logo em seguida.
- Cada ponto segue esta ordem: apresentar a passagem com 1 ou 2 frases de contexto, ler a passagem, explicar o que ela quer dizer, dar um exemplo da vida real (família, escola, trabalho) e dizer o que fazer nesta semana.
- Onde a passagem deve ser lida, escreva [LEITURA] sozinho num parágrafo. Não repita o texto bíblico na fala.
- Indicações para o pregador ficam entre parênteses, bem curtas: (pausa), (pergunte e espere), (leia devagar), (olhe para a igreja). No máximo duas por parte.
- Separe parágrafos com \\n\\n. Parágrafos de 1 a 3 frases.
- Tamanho: cerca de ${wpm} palavras por minuto da parte. A leitura e as pausas contam no tempo.

PARTES (nesta ordem): "Abertura"; ${n} pontos, cada um com nome curto (2 a 4 palavras); "Desafio da semana"; "Oração final". A soma de "min" deve ser exatamente ${SM.dur}.

PASSAGENS: ${n}, uma por ponto. "ref" no formato "Livro capítulo:versículo" ou "Livro capítulo:início-fim", com o nome do livro por extenso em português (ex.: "Salmos 23:1", "1 Pedro 5:7"). "texto": o versículo, fiel à Almeida. O app substitui pelo texto oficial da Bíblia Livre. Não invente versículos.
Para cada passagem, explique como um professor conversando com uma criança de 10 a 12 anos (1 a 3 frases em cada campo). Não invente fatos históricos; se a autoria for incerta, escreva "a tradição diz que".

Responda SOMENTE com um objeto JSON neste formato:
{"titulo":"","ideia_central":"uma frase","passagens":[{"ref":"Livro 1:2","texto":"","quem":"","para_quem":"","quando":"","explicacao":"","palavras":[{"p":"","s":""}],"lembrar":""}],"partes":[{"nome":"","min":2,"ref":"Livro 1:2 ou vazio","fala":""}]}`}
export async function generate(){
  if(!store.premium){soon("Pregação com IA");return}
  const out=byId("smOut");q<HTMLDetailsElement>(document, ".newsm").open=false;smPage.scrollTo({top:0,behavior:"smooth"});
  if(!store.SAMPLE){setHTML(out,html`<p class="disclaim">A geração com IA funciona com o protótipo aberto no Claude. Abaixo está o exemplo pronto.</p>${sermonHTML(EXAMPLE)}`);store.sermon=EXAMPLE;bindSermon();return}
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
    store.sermon={...r,tema:SM.tema,ocasiao:SM.ocasiao,minutos:SM.dur,ia:true};setHTML(out,sermonHTML(store.sermon));bindSermon()}
  catch(e){const code=(e as {code?:string})?.code||"";const msgs:Record<string,string>={cancelled:"Geração interrompida.",not_granted:"Você não permitiu o uso do Claude nesta página.",rate_limited:"Muitos pedidos seguidos. Espere um pouco e tente de novo.",
      invalid_json:"A resposta veio incompleta. Tente gerar de novo, ou escolha uma duração menor.",refused:"Não foi possível gerar com esse pedido. Tente outro tema ou passagem."};const msg=msgs[code]||"Algo deu errado. Tente de novo em instantes.";
    setHTML(out,html`<p class="disclaim">${msg}</p>${store.sermon?sermonHTML(store.sermon):""}`);bindSermon()}
  finally{clearInterval(iv);btn.disabled=false}}
export const firstLine=(f:string)=>String(f).replace(/\[LEITURA\]/gi,"").replace(/\([^)]*\)/g,"").split(/\n+/).map(x=>x.trim()).filter(Boolean)[0]||"";
export function sermonHTML(s:Sermon):SafeHtml{const ps=s.passagens||[],C=["#F2C879","#9EC5E8","#E8A9A9","#A9D3C7","#C9B6E8"];
  return html`<div class="outline">${s.ia?"":html`<span class="ex-tag">Exemplo pronto</span>`}<h3>${s.titulo}</h3>
   <p class="meta">${s.ocasiao||""} · ${s.minutos||""} min · tema ${s.tema||""}</p>
   <div class="big-idea"><small>A ideia em uma frase</small>${s.ideia_central}</div>
   <button class="primary go-preach" id="goPreach">${IC("play")}Começar a pregar</button>
   <p class="fine">Texto pronto para ler, uma parte por tela, com letra grande.</p>
   <div class="label" data-style="margin-top:24px">Passagens · toque para entender o contexto</div>
   <div class="pcards">${ps.map((p,i)=>html`<button class="pcard" data-i="${i}" data-style="--c1:${C[i%5]}"><span class="pn">${i+1}</span><b>${p.ref}</b><span class="pt">${String(p.texto).slice(0,90)}${String(p.texto).length>90?"…":""}</span><span class="go">${p.conferir?"Confira na sua Bíblia ›":"Entender o contexto ›"}</span></button>`)}</div>
   <div class="label" data-style="margin-top:24px">Como a pregação está dividida</div>
   <ol class="tl">${(s.partes||[]).map(r=>html`<li><div class="tm">${r.min} min</div><div><b>${r.nome}</b><p>${firstLine(r.fala)}</p></div></li>`)}</ol>
   <div class="row" data-style="margin-top:8px"><button class="sec" id="smCopy">Copiar texto</button><button class="sec" id="smNew">Nova pregação</button></div>
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
  return [s.titulo,s.ideia_central,"",...s.partes.map(r=>`${r.nome.toUpperCase()} (${r.min} min)\n`+String(r.fala).replace(/\[LEITURA\]/gi,()=>{const p=P(r.ref);return p?`“${p.texto}” (${r.ref})`:""}))].join("\n\n")}
export function bindSermon(){const s=qMaybe(document, ".outline");if(!s)return;const cur=store.sermon||EXAMPLE;
  qa(s, ".pcard").forEach(b=>b.onclick=()=>openPassage(cur.passagens[Number(b.dataset.i)]));
  byId("goPreach").onclick=()=>startPreach(cur);
  byId("smCopy").onclick=()=>clip(plainSermon(cur),"Pregação copiada");
  byId("smNew").onclick=()=>{const d=q<HTMLDetailsElement>(document, ".newsm");d.open=true;d.scrollIntoView({behavior:"smooth"})}}
