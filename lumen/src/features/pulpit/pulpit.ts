// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Púlpito: preparar e pregar */
import { store } from "../../core/state";
import { NEAR } from "../../data/themes";
import { EXAMPLE } from "./example";
import { startPreach } from "./preach";
import { lookupRef } from "../../services/bible";
import { IC } from "../../ui/icons";
import { openSheet } from "../../ui/sheet";
import { SB, soon } from "../../ui/soon";
import { clip } from "../../utils/clipboard";
import { cap, esc } from "../../utils/text";

export const smEl=document.getElementById("serm"),smPage=document.getElementById("smPage");
export const SM={tema:"esperança",ocasiao:"Culto de domingo",dur:15,ref:""};
export const OCAS=["Culto de domingo","Jovens","Célula","Crianças","Culto de oração"];
export function openSerm(){if(!store.sermon)store.sermon=EXAMPLE;renderSerm();smEl.classList.add("open");document.body.classList.remove("focus")}
export function chipRow(key,label,opts,fmt){return `<div class="label">${label}</div><div class="chips">${opts.map(o=>`<button class="chip ${SM[key]===o?"on":""}" data-k="${key}" data-v="${o}">${fmt?fmt(o):o}</button>`).join("")}</div>`}
export function renderSerm(){
  smPage.innerHTML=`<div class="sw"><div id="smOut">${store.sermon?sermonHTML(store.sermon):""}</div>
   <details class="newsm" ${store.sermon?"":"open"}><summary>Montar uma nova pregação ${IC("chev")}</summary>
   ${chipRow("tema","Tema",Object.keys(NEAR),cap)}
   <div class="label">Passagem principal <span style="text-transform:none;letter-spacing:0;font-weight:500">(opcional)</span></div>
   <input id="smRef" class="field" placeholder="Ex.: Salmos 23 ou João 15:1-5" value="${esc(SM.ref)}" autocomplete="off">
   ${chipRow("ocasiao","Para quem",OCAS)}${chipRow("dur","Duração",[15,30,45],d=>d+" min")}
   <button class="primary" id="smGo">${store.premium?"Gerar pregação com IA":SB+" Gerar com IA"}</button></details></div>`;
  smPage.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{const k=b.dataset.k;SM[k]=k==="dur"?+b.dataset.v:b.dataset.v;
    smPage.querySelectorAll(`.chip[data-k="${k}"]`).forEach(x=>x.classList.toggle("on",x===b))});
  document.getElementById("smRef").oninput=e=>SM.ref=e.target.value.slice(0,60);
  document.getElementById("smGo").onclick=generate;bindSermon()}
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
  const out=document.getElementById("smOut");document.querySelector(".newsm").open=false;smPage.scrollTo({top:0,behavior:"smooth"});
  if(!store.SAMPLE){out.innerHTML=`<p class="disclaim">A geração com IA funciona com o protótipo aberto no Claude. Abaixo está o exemplo pronto.</p>`+sermonHTML(EXAMPLE);store.sermon=EXAMPLE;bindSermon();return}
  store.smCtl?.abort();store.smCtl=new AbortController();const btn=document.getElementById("smGo");btn.disabled=true;
  const steps=["Escolhendo as passagens…","Buscando o contexto de cada uma…","Escrevendo a fala, parte por parte…","Ajustando ao tempo da pregação…"];let si=0;
  out.innerHTML=`<div class="gen"><div class="breath" style="width:90px;height:90px"></div><b id="genTxt">${steps[0]}</b><small>Pode levar um ou dois minutos.</small><button class="ghost" id="genStop">Parar</button></div>`;
  const iv=setInterval(()=>{si=Math.min(si+1,steps.length-1);const g=document.getElementById("genTxt");if(g)g.textContent=steps[si]},15000);
  document.getElementById("genStop").onclick=()=>store.smCtl.abort();
  try{const r=await store.SAMPLE.json(sermPrompt(),{signal:store.smCtl.signal,cache:false});
    if(!r||!Array.isArray(r.passagens)||!r.passagens.length||!Array.isArray(r.partes)||!r.partes.length)throw{code:"invalid_json"};
    for(const ps of r.passagens){const t=await lookupRef(ps.ref);if(t)ps.texto=t;else ps.conferir=true}
    store.sermon={...r,tema:SM.tema,ocasiao:SM.ocasiao,minutos:SM.dur,ia:true};out.innerHTML=sermonHTML(store.sermon);bindSermon()}
  catch(e){const msg={cancelled:"Geração interrompida.",not_granted:"Você não permitiu o uso do Claude nesta página.",rate_limited:"Muitos pedidos seguidos. Espere um pouco e tente de novo.",
      invalid_json:"A resposta veio incompleta. Tente gerar de novo, ou escolha uma duração menor.",refused:"Não foi possível gerar com esse pedido. Tente outro tema ou passagem."}[e.code]||"Algo deu errado. Tente de novo em instantes.";
    out.innerHTML=`<p class="disclaim">${msg}</p>`+(store.sermon?sermonHTML(store.sermon):"");bindSermon()}
  finally{clearInterval(iv);btn.disabled=false}}
export const firstLine=f=>String(f).replace(/\[LEITURA\]/gi,"").replace(/\([^)]*\)/g,"").split(/\n+/).map(x=>x.trim()).filter(Boolean)[0]||"";
export function sermonHTML(s){const ps=s.passagens||[];
  return `<div class="outline">${s.ia?"":`<span class="ex-tag">Exemplo pronto</span>`}<h3>${esc(s.titulo)}</h3>
   <p class="meta">${esc(s.ocasiao||"")} · ${esc(s.minutos||"")} min · tema ${esc(s.tema||"")}</p>
   <div class="big-idea"><small>A ideia em uma frase</small>${esc(s.ideia_central)}</div>
   <button class="primary go-preach" id="goPreach">${IC("play")}Começar a pregar</button>
   <p class="fine">Texto pronto para ler, uma parte por tela, com letra grande.</p>
   <div class="label" style="margin-top:24px">Passagens · toque para entender o contexto</div>
   <div class="pcards">${ps.map((p,i)=>`<button class="pcard" data-i="${i}" style="--c1:${["#F2C879","#9EC5E8","#E8A9A9","#A9D3C7","#C9B6E8"][i%5]}"><span class="pn">${i+1}</span><b>${esc(p.ref)}</b><span class="pt">${esc(String(p.texto).slice(0,90))}${String(p.texto).length>90?"…":""}</span><span class="go">Entender o contexto ›</span></button>`).join("")}</div>
   <div class="label" style="margin-top:24px">Como a pregação está dividida</div>
   <ol class="tl">${(s.partes||[]).map(r=>`<li><div class="tm">${esc(r.min)} min</div><div><b>${esc(r.nome)}</b><p>${esc(firstLine(r.fala))}</p></div></li>`).join("")}</ol>
   <div class="row" style="margin-top:8px"><button class="sec" id="smCopy">Copiar texto</button><button class="sec" id="smNew">Nova pregação</button></div>
   <p class="disclaim">Este texto é um ponto de partida. Confira as passagens na sua Bíblia, ore e fale com o seu coração.</p></div>`}
export function openPassage(p){
  openSheet(`<div class="pass"><span class="k">Para ler em voz alta</span><h2>${esc(p.ref)}</h2>
   <blockquote class="read-me">“${esc(p.texto)}”</blockquote>
   <div class="ctx"><div>${IC("quill")}<div><b>Quem escreveu</b><p>${esc(p.quem)}</p></div></div>
    <div>${IC("people")}<div><b>Para quem</b><p>${esc(p.para_quem)}</p></div></div>
    <div>${IC("hourglass")}<div><b>O que estava acontecendo</b><p>${esc(p.quando)}</p></div></div></div>
   <div class="label">Explicando de um jeito simples</div><p class="simple">${esc(p.explicacao)}</p>
   ${(p.palavras||[]).length?`<div class="label">${IC("lens")} Palavras difíceis</div><dl class="gloss">${p.palavras.map(w=>`<dt>${esc(w.p)}</dt><dd>${esc(w.s)}</dd>`).join("")}</dl>`:""}
   <div class="keep"><small>Para levar para casa</small>${esc(p.lembrar)}</div>
   <button class="sec" id="psCopy" style="width:100%;margin-top:16px">Copiar texto bíblico</button></div>`,"Contexto da passagem");
  document.getElementById("psCopy").onclick=()=>clip(`${p.texto} (${p.ref})`,"Texto copiado")}
export function plainSermon(s){const P=r=>s.passagens.find(p=>p.ref===r);
  return [s.titulo,s.ideia_central,"",...s.partes.map(r=>`${r.nome.toUpperCase()} (${r.min} min)\n`+String(r.fala).replace(/\[LEITURA\]/gi,P(r.ref)?`“${P(r.ref).texto}” (${r.ref})`:""))].join("\n\n")}
export function bindSermon(){const s=document.querySelector(".outline");if(!s)return;const cur=store.sermon||EXAMPLE;
  s.querySelectorAll(".pcard").forEach(b=>b.onclick=()=>openPassage(cur.passagens[+b.dataset.i]));
  document.getElementById("goPreach").onclick=()=>startPreach(cur);
  document.getElementById("smCopy").onclick=()=>clip(plainSermon(cur),"Pregação copiada");
  document.getElementById("smNew").onclick=()=>{const d=document.querySelector(".newsm");d.open=true;d.scrollIntoView({behavior:"smooth"})}}
