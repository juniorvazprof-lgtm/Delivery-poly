/* Terço guiado: uma oração por tela, as contas acendendo a cada Ave-Maria.
   Toque (ou deslize para a esquerda) para avançar no seu ritmo; deslize para a direita para voltar. */
import { html, raw, setHTML } from "../utils/html";
import { byId } from "../utils/dom";
import { IP } from "../ui/icons";
import { registrarTerco, toast, vibrate } from "../ui/ui";
import { CONJUNTOS, conjuntoDoDia, passosDoTerco, type Conjunto, type Passo } from "../data/terco";
import { oracao } from "../data/oracoes";
import { irPara } from "./hoje";

let conj: Conjunto = conjuntoDoDia(new Date()), passos: Passo[] = [], i = -1, tela: HTMLElement | null = null;
const words = (t: string) => t.split(" ").map((w, k) => html`<span class="w" data-style="--i:${k}">${w}</span> `);

export function sairDoTerco(): void { document.body.classList.remove("rezando"); tela = null; }

export function renderTerco(el: HTMLElement): void {
  tela = el; i = -1; document.body.classList.remove("rezando");
  setHTML(el, html`<div class="pagina">
    <div class="kicker">Terço guiado</div><h1>Rezar o terço</h1>
    <p class="lead">Toque na tela para passar para a próxima oração, no seu ritmo. As contas mostram onde você está.</p>
    <div class="conjs">${CONJUNTOS.map(c => html`<button class="conj ${c.id === conj.id ? "on" : ""}" data-c="${c.id}"><b>${c.nome}</b>
      <small>${c.id === conjuntoDoDia(new Date()).id ? "Os de hoje" : c.misterios.map(m => m.titulo.split(" ").slice(0, 3).join(" ")).join(" · ")}</small></button>`)}</div>
    <button class="primary" id="comecar">${raw(`<svg viewBox="0 0 24 24" class="ico">${IP.rosary}</svg>`)}Começar</button>
    <p class="fine">Mistérios com a referência bíblica. O texto da Bíblia entra quando tivermos uma tradução católica em domínio público.</p></div>`);
  el.querySelectorAll<HTMLButtonElement>("[data-c]").forEach(b => b.onclick = () => { conj = CONJUNTOS.find(c => c.id === b.dataset.c) || conj; vibrate(5); renderTerco(el); });
  byId("comecar").onclick = () => { passos = passosDoTerco(conj); document.body.classList.add("rezando"); mostrar(0); };
}

function mostrar(n: number): void {
  if (!tela) return;
  i = Math.max(0, Math.min(n, passos.length));
  if (i === passos.length) { fim(); return; }
  const p = passos[i], dezena = "dezena" in p ? p.dezena : undefined;
  const corpo = p.tipo === "misterio"
    ? html`<div class="mist-tela"><small>${p.dezena}º mistério · ${conj.nome.replace("Mistérios ", "")}</small><h2>${words(p.misterio.titulo)}</h2>
        <p class="ref">${p.misterio.ref}</p><p class="fruto">Fruto do mistério: ${p.misterio.fruto}</p></div>`
    : html`<div class="ora-tela"><small>${p.titulo}${p.conta ? ` · ${p.conta} de ${p.total}` : ""}</small><p>${words(oracao(p.id).texto.replace(/\n/g, " "))}</p></div>`;
  const contas = dezena ? Array.from({ length: 10 }, (_, k) => {
    const atual = p.tipo === "oracao" && p.id === "avemaria" ? (p.conta || 0) : p.tipo === "oracao" && (p.id === "gloria" || p.id === "fatima") ? 10 : 0;
    return html`<i class="${k < atual ? "on" : ""} ${k === atual - 1 ? "cur" : ""}"></i>`;
  }) : [];
  setHTML(tela, html`<div class="reza" id="reza">
    <div class="reza-top"><button class="x" id="sair" aria-label="Sair do terço">${raw(`<svg viewBox="0 0 24 24">${IP.close}</svg>`)}</button>
      <div class="dezenas">${[1, 2, 3, 4, 5].map(k => html`<i class="${dezena && k < dezena ? "feita" : ""} ${k === dezena ? "atual" : ""}"></i>`)}</div>
      <span class="passo">${i + 1}/${passos.length}</span></div>
    <div class="reza-corpo" id="corpo">${corpo}</div>
    ${contas.length ? html`<div class="contas">${contas}</div>` : html`<div class="contas vazia"></div>`}
    <p class="toque">toque para continuar</p></div>`);
  byId("sair").onclick = e => { e.stopPropagation(); renderTerco(tela!); };
  let x0: number | null = null;
  const r = byId("reza");
  r.onpointerdown = e => { x0 = e.clientX; };
  r.onpointerup = e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if ((e.target as Element).closest("#sair")) return;
    vibrate(p.tipo === "oracao" && p.id === "avemaria" ? 6 : 14); mostrar(dx > 60 ? i - 1 : i + 1); };
}

function fim(): void {
  if (!tela) return;
  const prog = registrarTerco(); document.body.classList.remove("rezando");
  setHTML(tela, html`<div class="pagina fim"><div class="gok">${raw(`<svg viewBox="0 0 24 24">${IP.check}</svg>`)}</div>
    <h1>Amém</h1><p class="lead">Você rezou o terço com os ${conj.nome.toLowerCase()}.</p>
    <p class="meta">${prog.seguidos > 1 ? `${prog.seguidos} dias seguidos rezando` : "Que tal voltar amanhã?"} · ${prog.tercos} ${prog.tercos === 1 ? "terço" : "terços"} no total</p>
    <button class="primary" id="voltar">Voltar para Hoje</button></div>`);
  toast("Terço concluído"); vibrate(20);
  byId("voltar").onclick = () => irPara("hoje");
}
