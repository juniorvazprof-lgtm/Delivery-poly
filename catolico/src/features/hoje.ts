/* Aba Hoje: um cartão por tela (como o feed do Lumen): o dia litúrgico e o santo, a oração do dia,
   o terço de hoje, o Ângelus e jaculatórias. */
import { html, setHTML } from "../utils/html";
import { byId } from "../utils/dom";
import { IC } from "../ui/icons";
import { openSheet, registrarOracao, toast, vibrate } from "../ui/ui";
import { NOME_COR } from "../core/liturgia";
import { infoDoDia, textoDe, type Ref } from "../core/dia";
import { DEVOCOES } from "../data/santos";
import { conjuntoDoDia } from "../data/terco";
import { JACULATORIAS, oracao } from "../data/oracoes";
import antigas from "../data/oracoes-antigas.json";
const ANTIGAS = antigas as Record<string, { texto: string; fonte: string }>;

/** Pede ao app para trocar de aba (evita importação circular com main.ts). */
export const irPara = (aba: string) => dispatchEvent(new CustomEvent("cat:ir", { detail: aba }));
const hojeLabel = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

/** Mostra uma oração completa numa folha, com as linhas separadas. */
export function lerOracao(id: string): void {
  const o = oracao(id);
  openSheet(html`<h2>${o.nome}</h2>${o.nota ? html`<p class="sub">${o.nota}</p>` : ""}
    <div class="oracao">${o.texto.split("\n").map(l => html`<p>${l}</p>`)}</div>
    <button class="primary" id="amem">Amém</button>
    ${ANTIGAS[id] ? html`<details class="antiga"><summary>Ver a forma antiga · ${ANTIGAS[id].fonte}</summary>
      <p>${ANTIGAS[id].texto}</p><p class="fine">Texto em domínio público, com a ortografia atualizada.</p></details>` : ""}`, o.nome);
  byId("amem").onclick = () => { registrarOracao(); vibrate(10); toast("Amém"); dispatchEvent(new CustomEvent("cat:fechar")); };
}

export function renderHoje(el: HTMLElement): void {
  const d = new Date(), I = infoDoDia(d), L = I.lit, santo = I.sobre, dev = DEVOCOES[d.getDay()], terco = conjuntoDoDia(d);
  const pascal = L.tempo === "Páscoa";
  setHTML(el, html`<div class="feed">
   <section class="card hoje">
     <div class="kicker"><i class="cor ${I.cor}"></i>${hojeLabel(d)}</div>
     <h1>${I.titulo}</h1>
     <p class="meta">${I.grau && I.grau !== "Féria" ? `${I.grau} · ` : ""}${L.tempo} · cor ${NOME_COR[I.cor].toLowerCase()} · ano ${L.ciclo}/${L.ano}</p>
     ${I.preceito ? html`<p class="preceito">Dia santo de preceito: participe da Missa</p>` : ""}
     ${I.santos.length ? html`<div class="santo"><small>Santo do dia</small>${I.santos.filter(x => x.nome !== I.titulo).map(x => html`<b>${x.nome}</b>`)}
         ${santo ? html`<p>${santo.sobre}</p>${santo.padroeiro ? html`<em>Padroeiro ${santo.padroeiro}</em>` : ""}` : ""}<em>${I.santos.map(x => x.grau).filter(Boolean)[0] || ""}</em></div>`
       : santo ? html`<div class="santo"><small>Hoje</small><p>${santo.sobre}</p></div>` : ""}
     <div class="hint">deslize ↑</div>
   </section>
   ${I.evangelho ? html`<section class="card">
     <div class="kicker">Evangelho do dia</div>
     <h2>${I.evangelho.texto}</h2>
     <blockquote class="ev" id="evTxt">…</blockquote>
     <button class="pill" id="evLer">Ler o Evangelho completo</button>
     <p class="fine prev">Prévia: texto da Bíblia do Pe. Figueiredo (ed. 1950) até concluirmos a revisão da edição de 1891.</p>
   </section>` : ""}
   <section class="card">
     <div class="kicker">Oração do dia</div>
     <h2>${dev.tema}</h2>
     <blockquote>${dev.oracao}</blockquote>
     <button class="pill" id="rezei">${IC("candle")}Rezei esta oração</button>
   </section>
   <section class="card">
     <div class="kicker">Terço de hoje</div>
     <h2>${terco.nome}</h2>
     <ol class="mist">${terco.misterios.map(m => html`<li>${m.titulo}</li>`)}</ol>
     <button class="primary" id="rezarTerco">${IC("rosary")}Rezar o terço</button>
   </section>
   <section class="card">
     <div class="kicker">${pascal ? "Tempo pascal" : "6h · 12h · 18h"}</div>
     <h2>${pascal ? "Rainha do Céu" : "Ângelus"}</h2>
     <p class="lead">${pascal ? "No tempo da Páscoa, a Igreja saúda Maria com a alegria da ressurreição." : "Três vezes ao dia, a Igreja para um instante e lembra que Deus se fez homem."}</p>
     <button class="pill" id="angelus">${IC("candle")}Rezar agora</button>
   </section>
   ${JACULATORIAS.map(j => html`<section class="card jac"><blockquote>${j.texto}</blockquote><cite>${j.de}</cite></section>`)}
  </div>`);
  byId("rezei").onclick = () => { registrarOracao(); vibrate(10); toast("Amém. Bom dia com Deus"); };
  byId("rezarTerco").onclick = () => irPara("terco");
  if (I.evangelho) carregarEvangelho(I.evangelho);
  byId("angelus").onclick = () => lerOracao(pascal ? "reginacaeli" : "angelus");
}

/** Mostra o começo do Evangelho no cartão e o texto completo numa folha. */
async function carregarEvangelho(r: Ref): Promise<void> {
  const el = document.getElementById("evTxt"), btn = document.getElementById("evLer"); if (!el || !btn) return;
  try {
    const vs = await textoDe(r), corrido = vs.map(v => v.t).join(" ");
    el.textContent = corrido.length > 260 ? corrido.slice(0, corrido.lastIndexOf(" ", 260)) + "…" : corrido;
    btn.onclick = () => openSheet(html`<h2>${r.texto}</h2><p class="sub">Evangelho do dia · prévia</p>
      <div class="oracao evangelho">${vs.map(v => html`<p><sup>${v.n}</sup>${v.t}</p>`)}</div>
      <p class="fine">Pe. Antônio Pereira de Figueiredo, edição de 1950 (prévia). Trechos marcados com […] estão em revisão.</p>`, "Evangelho do dia");
  } catch { el.textContent = "Não foi possível abrir o Evangelho agora."; }
}
