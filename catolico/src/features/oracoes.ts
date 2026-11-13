/* Aba Orações: as orações tradicionais em grupos; toque para rezar. */
import { html, setHTML } from "../utils/html";
import { IC } from "../ui/icons";
import { ORACOES } from "../data/oracoes";
import { lerOracao } from "./hoje";

export function renderOracoes(el: HTMLElement): void {
  const grupos = [...new Set(ORACOES.map(o => o.grupo))];
  setHTML(el, html`<div class="pagina"><div class="kicker">Orações</div><h1>Para rezar</h1>
    ${grupos.map(g => html`<div class="label">${g}</div><div class="lista">${ORACOES.filter(o => o.grupo === g).map(o =>
      html`<button class="item" data-o="${o.id}">${IC("candle")}<span><b>${o.nome}</b><small>${o.texto.replace(/\n/g, " ").slice(0, 64)}…</small></span>${IC("chev")}</button>`)}</div>`)}
    <p class="fine">Textos provisórios, em revisão.</p></div>`);
  el.querySelectorAll<HTMLButtonElement>("[data-o]").forEach(b => b.onclick = () => lerOracao(b.dataset.o || ""));
}
