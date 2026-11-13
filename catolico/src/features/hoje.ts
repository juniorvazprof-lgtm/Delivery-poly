/* Aba Hoje: um cartão por tela (como o feed do Lumen): o dia litúrgico e o santo, a oração do dia,
   o terço de hoje, o Ângelus e jaculatórias. */
import { html, setHTML } from "../utils/html";
import { byId } from "../utils/dom";
import { IC } from "../ui/icons";
import { openSheet, registrarOracao, toast, vibrate } from "../ui/ui";
import { diaLiturgico, NOME_COR } from "../core/liturgia";
import { santoDoDia, DEVOCOES } from "../data/santos";
import { conjuntoDoDia } from "../data/terco";
import { JACULATORIAS, oracao } from "../data/oracoes";

/** Pede ao app para trocar de aba (evita importação circular com main.ts). */
export const irPara = (aba: string) => dispatchEvent(new CustomEvent("cat:ir", { detail: aba }));
const hojeLabel = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

/** Mostra uma oração completa numa folha, com as linhas separadas. */
export function lerOracao(id: string): void {
  const o = oracao(id);
  openSheet(html`<h2>${o.nome}</h2>${o.nota ? html`<p class="sub">${o.nota}</p>` : ""}
    <div class="oracao">${o.texto.split("\n").map(l => html`<p>${l}</p>`)}</div>
    <button class="primary" id="amem">Amém</button>`, o.nome);
  byId("amem").onclick = () => { registrarOracao(); vibrate(10); toast("Amém"); dispatchEvent(new CustomEvent("cat:fechar")); };
}

export function renderHoje(el: HTMLElement): void {
  const d = new Date(), L = diaLiturgico(d), santo = santoDoDia(d), dev = DEVOCOES[d.getDay()], terco = conjuntoDoDia(d);
  const pascal = L.tempo === "Páscoa";
  setHTML(el, html`<div class="feed">
   <section class="card hoje">
     <div class="kicker"><i class="cor ${L.cor}"></i>${hojeLabel(d)}</div>
     <h1>${L.titulo}</h1>
     <p class="meta">${L.tempo} · cor litúrgica ${NOME_COR[L.cor].toLowerCase()} · ano ${L.ciclo} (domingos) e ${L.ano} (semana)</p>
     ${santo ? html`<div class="santo"><small>Santo do dia</small><b>${santo.nome}</b><p>${santo.sobre}</p>${santo.padroeiro ? html`<em>Padroeiro ${santo.padroeiro}</em>` : ""}</div>`
       : html`<div class="santo vazio"><small>Santo do dia</small><p>O calendário completo dos santos chega em breve.</p></div>`}
     <div class="hint">deslize ↑</div>
   </section>
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
  byId("angelus").onclick = () => lerOracao(pascal ? "reginacaeli" : "angelus");
}
