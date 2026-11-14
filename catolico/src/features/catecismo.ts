/* Catecismo de São Pio X (1912) em perguntas e respostas: pergunta do dia, cartões do feed e leitura por capítulos.
   Onde o ensino ou a disciplina mudou, a pergunta traz a nota "O que a Igreja ensina hoje" (com os números do CIC)
   e não aparece no feed. O arquivo é carregado só quando preciso. */
import { html, setHTML } from "../utils/html";
import { byId } from "../utils/dom";
import { S } from "../services/storage";
import { vibrate } from "../ui/ui";
import { simbolo } from "../ui/simbolos";
import type { Cartao } from "../data/cartoes";
import { chipsCIC } from "../ui/chips";
import { numerosCIC } from "../core/cic";
import type { DiaLiturgico } from "../core/liturgia";

export interface Nota { perguntas: number[]; tema: string; tipo: string; texto: string; cic: string; outras: string }
export interface Pergunta { n: number; c: number; p: string; r: string; s?: string; d?: number; ne?: string }
export interface Catecismo { fonte: string; capitulos: { nome: string; parte: string; tema: string }[]; notas: Nota[]; perguntas: Pergunta[] }

let dados: Promise<Catecismo> | null = null;
export const carregarCatecismo = (): Promise<Catecismo> => (dados ??= import("../data/catecismo.json").then(m => m.default as Catecismo));

const lidas = new Set((S.get<unknown[]>("cat.catLidas", []) || []).filter((x): x is number => Number.isInteger(x) && (x as number) > 0 && (x as number) < 500));
export const totalLidas = () => lidas.size;
export function marcarLida(n: number): void { if (lidas.has(n)) return; lidas.add(n); S.set("cat.catLidas", [...lidas]); }

/** Cartão do feed para uma pergunta (só as que não precisam de nota). */
export const cartaoCatecismo = (C: Catecismo, q: Pergunta, rotulo = "Catecismo"): Cartao => ({
  id: `cat:${q.n}`, tipo: "catecismo", tema: C.capitulos[q.c].tema, simbolo: "livro", rotulo, titulo: q.p, texto: q.r,
  de: `Catecismo de São Pio X, pergunta ${q.n}` });
export const perguntasDoFeed = (C: Catecismo): Pergunta[] => C.perguntas.filter(q => q.d === undefined && !q.ne && q.r.length < 420);

/** Pergunta do dia: ligada ao tempo ou à festa quando possível; nos outros dias, varia pela data. */
export function perguntaDoDia(C: Catecismo, d: Date, L: DiaLiturgico, titulo: string): Pergunta {
  const t = titulo.toLowerCase();
  const cap = /batismo do senhor/.test(t) ? "Batismo" : /corpo e sangue|eucaristia/.test(t) ? "Eucaristia e Missa" : /pentecostes/.test(t) ? "Crisma"
    : /trindade/.test(t) ? "Deus uno e trino" : /sagrada família/.test(t) ? "Matrimônio" : /fiéis defuntos|todos os santos/.test(t) ? "Ressurreição e vida eterna"
    : /cristo rei/.test(t) ? "A volta de Jesus e o juízo"
    : L.tempo === "Quaresma" ? "Confissão" : L.tempo === "Páscoa" ? "Ressurreição e vida eterna" : L.tempo === "Advento" ? "A volta de Jesus e o juízo"
    : L.tempo === "Natal" ? "Encarnação, Paixão e Morte de Jesus" : null;
  const ok = perguntasDoFeed(C), ci = cap ? C.capitulos.findIndex(c => c.nome === cap) : -1;
  const lista = ci >= 0 ? ok.filter(q => q.c === ci) : ok;
  const dia = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  return (lista.length ? lista : ok)[(dia * 7919) % (lista.length || ok.length)];
}

const notaHtml = (C: Catecismo, q: Pergunta) => {
  const n = q.d !== undefined ? C.notas[q.d] : null;
  return html`${n ? html`<div class="nota-hoje"><b>O que a Igreja ensina hoje</b><p>${n.texto}</p>
      <small>Aprofunde no texto oficial do Catecismo da Igreja Católica${n.outras ? ` · ${n.outras}` : ""}</small>${chipsCIC(numerosCIC(n.cic))}</div>` : ""}
    ${q.ne ? html`<p class="fine">Nota de edições posteriores: ${q.ne}</p>` : ""}`;
};

/** Tela de leitura: capítulos com progresso; dentro, as perguntas abrem a resposta ao toque. */
export async function renderCatecismo(el: HTMLElement, cap?: number): Promise<void> {
  const C = await carregarCatecismo();
  if (cap === undefined) {
    const partes = [...new Set(C.capitulos.map(c => c.parte))];
    setHTML(el, html`<div class="pagina"><button class="link voltar" id="catVoltar">‹ Orações</button>
      <div class="kicker">Catecismo de São Pio X</div><h1>Perguntas e respostas da fé</h1>
      <div class="progresso"><i data-style="--p:${(100 * lidas.size / C.perguntas.length).toFixed(1)}%"></i></div>
      <p class="meta">Você leu ${lidas.size} de ${C.perguntas.length} perguntas</p>
      ${partes.map(p => html`<div class="label">${p}</div><div class="lista">${C.capitulos.map((c, i) => c.parte !== p ? "" : (() => {
        const qs = C.perguntas.filter(q => q.c === i), feitas = qs.filter(q => lidas.has(q.n)).length;
        return html`<button class="item" data-cap="${i}">${simbolo("livro")}<span><b>${c.nome}</b><small>${feitas}/${qs.length} lidas</small></span></button>`; })())}</div>`)}
      <p class="fine">${C.fonte} Algumas regras de disciplina (jejum, abstinência, indulgências) mudaram desde 1912: as perguntas afetadas trazem uma nota.</p></div>`);
    byId("catVoltar").onclick = () => dispatchEvent(new CustomEvent("cat:ir", { detail: "oracoes" }));
    el.querySelectorAll<HTMLButtonElement>("[data-cap]").forEach(b => b.onclick = () => { void renderCatecismo(el, Number(b.dataset.cap)); el.scrollTop = 0; });
    return;
  }
  const qs = C.perguntas.filter(q => q.c === cap); let sub = "";
  setHTML(el, html`<div class="pagina"><button class="link voltar" id="catVoltar">‹ Capítulos</button>
    <div class="kicker">${C.capitulos[cap].parte}</div><h1>${C.capitulos[cap].nome}</h1>
    <div class="qas">${qs.map(q => { const h = q.s && q.s !== sub ? html`<div class="label">${q.s}</div>` : ""; sub = q.s || sub;
      return html`${h}<details class="qa ${lidas.has(q.n) ? "lida" : ""} ${q.d !== undefined ? "com-nota" : ""}" data-n="${q.n}"><summary><span class="num">${q.n}</span>${q.p}</summary>
        <p class="resp">${q.r}</p>${notaHtml(C, q)}</details>`; })}</div>
    ${cap + 1 < C.capitulos.length ? html`<button class="primary" id="catProx">Próximo: ${C.capitulos[cap + 1].nome}</button>` : ""}</div>`);
  byId("catVoltar").onclick = () => { void renderCatecismo(el); el.scrollTop = 0; };
  el.querySelectorAll<HTMLDetailsElement>("details.qa").forEach(d => d.ontoggle = () => { if (d.open) { marcarLida(Number(d.dataset.n)); d.classList.add("lida"); vibrate(3); } });
  const prox = document.getElementById("catProx"); if (prox) prox.onclick = () => { void renderCatecismo(el, cap + 1); el.scrollTop = 0; };
}
