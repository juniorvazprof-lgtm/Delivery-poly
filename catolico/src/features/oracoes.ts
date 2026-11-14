/* Aba Orações: cartões agrupados pelo momento do dia, com favoritas no topo; toque para rezar. */
import { html, setHTML } from "../utils/html";
import { IC } from "../ui/icons";
import { simbolo, type Simbolo } from "../ui/simbolos";
import { ORACOES } from "../data/oracoes";
import { favoritas, salvar } from "../core/estado";
import { vibrate } from "../ui/ui";
import { lerOracao } from "./hoje";
import { renderCatecismo, totalLidas } from "./catecismo";

const MOMENTOS: { nome: string; ids: string[] }[] = [
  { nome: "Essenciais", ids: ["sinal", "painosso", "avemaria", "gloria", "credo"] },
  { nome: "Ao longo do dia", ids: ["angelus", "reginacaeli", "anjo", "miguel"] },
  { nome: "Com Nossa Senhora", ids: ["salve", "lembrai", "fatima"] },
  { nome: "À noite", ids: ["contricao"] },
];
const SIMB: Record<string, Simbolo> = { sinal: "cruz", credo: "luz", painosso: "pomba", avemaria: "maria", gloria: "estrela", fatima: "maria", contricao: "coracao",
  salve: "maria", angelus: "vela", reginacaeli: "maria", lembrai: "lirio", anjo: "asas", miguel: "asas" };

export function renderOracoes(el: HTMLElement): void {
  const cartao = (id: string) => { const o = ORACOES.find(x => x.id === id); if (!o) return "";
    return html`<div class="ocard-w"><button class="ocard" data-o="${o.id}">${simbolo(SIMB[o.id] || "vela")}<b>${o.nome}</b></button>
      <button class="fav ${favoritas.has(o.id) ? "on" : ""}" data-f="${o.id}" aria-label="Favoritar ${o.nome}">${IC("star")}</button></div>`; };
  const favs = [...favoritas].filter(id => ORACOES.some(o => o.id === id));
  setHTML(el, html`<div class="pagina"><div class="kicker">Orações</div><h1>Para rezar</h1>
    <button class="catbtn" id="abrirCat">${simbolo("livro")}<span><b>Catecismo de São Pio X</b><small>430 perguntas e respostas da fé${totalLidas() ? ` · você leu ${totalLidas()}` : ""}</small></span></button>
    ${favs.length ? html`<div class="label">Suas favoritas</div><div class="ocards">${favs.map(cartao)}</div>` : ""}
    ${MOMENTOS.map(m => html`<div class="label">${m.nome}</div><div class="ocards">${m.ids.map(cartao)}</div>`)}
    <p class="fine">Toque na estrela para guardar uma oração no topo. Textos provisórios, em revisão.</p></div>`);
  const ab = el.querySelector<HTMLButtonElement>("#abrirCat"); if (ab) ab.onclick = () => { void renderCatecismo(el); el.scrollTop = 0; };
  el.querySelectorAll<HTMLButtonElement>("[data-o]").forEach(b => b.onclick = () => lerOracao(b.dataset.o || ""));
  el.querySelectorAll<HTMLButtonElement>("[data-f]").forEach(b => b.onclick = () => {
    const id = b.dataset.f || ""; favoritas.has(id) ? favoritas.delete(id) : favoritas.add(id); salvar(); vibrate(6); renderOracoes(el); });
}
