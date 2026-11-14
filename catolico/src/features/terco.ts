/* Terço guiado sem texto na tela: o terço em 3D mostra onde você está e, embaixo, só o nome da oração.
   Toque para avançar; deslize para a direita para voltar; segure o dedo para ver o texto da oração.
   Animações lentas e a luz que vai entardecendo ao longo das dezenas ajudam a respirar devagar. */
import { html, raw, setHTML } from "../utils/html";
import { byId } from "../utils/dom";
import { IP } from "../ui/icons";
import { registrarTerco, toast, vibrate } from "../ui/ui";
import { CONJUNTOS, conjuntoDoDia, passosDoTerco, type Conjunto, type Passo } from "../data/terco";
import { oracao } from "../data/oracoes";
import { S } from "../services/storage";
import { abaixar } from "../ui/musica";
import { irPara } from "./hoje";
import type { Terco3D } from "./terco3d";

let auto = false, comTexto = false, timer = 0;
let conj: Conjunto = conjuntoDoDia(new Date()), passos: Passo[] = [], mapa: number[] = [], i = -1, tela: HTMLElement | null = null;
let t3d: Terco3D | null = null, sessao = 0;

function limpar(): void { clearTimeout(timer); t3d?.destruir(); t3d = null; sessao++; document.body.classList.remove("rezando"); abaixar(1); }
export function sairDoTerco(): void { limpar(); tela = null; }

export function renderTerco(el: HTMLElement): void {
  limpar(); tela = el; i = -1;
  auto = S.get<boolean>("cat.auto", false) === true; comTexto = S.get<boolean>("cat.tercoTexto", false) === true;
  setHTML(el, html`<div class="pagina">
    <div class="kicker">Terço guiado</div><h1>Rezar o terço</h1>
    <p class="lead">Acompanhe as contas do terço. Toque para passar à próxima oração, no seu ritmo, e respire devagar.</p>
    <div class="conjs">${CONJUNTOS.map(c => html`<button class="conj ${c.id === conj.id ? "on" : ""}" data-c="${c.id}"><b>${c.nome}</b>
      <small>${c.id === conjuntoDoDia(new Date()).id ? "Os de hoje" : c.misterios.map(m => m.titulo.split(" ").slice(0, 3).join(" ")).join(" · ")}</small></button>`)}</div>
    <label class="auto"><span>Avançar sozinho<br><small class="fine">No ritmo de uma oração falada; toque para pausar</small></span><input type="checkbox" id="auto" ${auto ? "checked" : ""}></label>
    <label class="auto"><span>Mostrar o texto das orações<br><small class="fine">Para quem ainda está aprendendo. Segurar o dedo na tela também mostra.</small></span><input type="checkbox" id="comTexto" ${comTexto ? "checked" : ""}></label>
    <button class="primary" id="comecar">${raw(`<svg viewBox="0 0 24 24" class="ico">${IP.rosary}</svg>`)}Começar</button>
    <p class="fine">Mistérios com a referência bíblica. Use fones para ouvir a música ambiente.</p></div>`);
  el.querySelectorAll<HTMLButtonElement>("[data-c]").forEach(b => b.onclick = () => { conj = CONJUNTOS.find(c => c.id === b.dataset.c) || conj; vibrate(5); renderTerco(el); });
  byId<HTMLInputElement>("auto").onchange = e => { auto = (e.target as HTMLInputElement).checked; S.set("cat.auto", auto); };
  byId<HTMLInputElement>("comTexto").onchange = e => { comTexto = (e.target as HTMLInputElement).checked; S.set("cat.tercoTexto", comTexto); };
  byId("comecar").onclick = () => comecar();
}

function comecar(): void {
  if (!tela) return;
  passos = passosDoTerco(conj); document.body.classList.add("rezando"); abaixar(.55);
  setHTML(tela, html`<div class="reza3d" id="reza">
    <div class="t3d" id="t3d"></div>
    <div class="reza-top"><button class="x" id="sair" aria-label="Sair do terço">${raw(`<svg viewBox="0 0 24 24">${IP.close}</svg>`)}</button>
      <div class="dezenas">${[1, 2, 3, 4, 5].map(k => html`<i data-d="${k}"></i>`)}</div><span class="passo" id="passoN"></span></div>
    <div class="reza-corpo3d" id="corpo"><div class="nome" id="nome"></div><div class="sub" id="sub"></div><div class="texto" id="texto"></div></div>
    <p class="toque" id="toque"></p></div>`);
  byId("sair").onclick = e => { e.stopPropagation(); renderTerco(tela!); };
  const s = ++sessao;
  void import("./terco3d").then(m => {
    if (s !== sessao) return; mapa = m.mapaDePassos(passos);
    try { t3d = m.criarTerco3D(byId("t3d")); if (i >= 0) t3d.focar(mapa[i]); } catch { byId("reza").classList.add("sem3d"); }
  }).catch(() => byId("reza").classList.add("sem3d"));
  gestos(); mostrar(0);
}

/** Toque = avançar; deslizar para a direita = voltar; segurar = ver o texto. */
function gestos(): void {
  const r = byId("reza"); let x0: number | null = null, segurou = false, tSeg = 0;
  r.onpointerdown = e => { if ((e.target as Element).closest("#sair")) return; x0 = e.clientX; segurou = false;
    tSeg = window.setTimeout(() => { segurou = true; r.classList.add("vendo-texto"); vibrate(4); }, 450); };
  const soltar = (e: PointerEvent) => {
    clearTimeout(tSeg); r.classList.remove("vendo-texto"); if (x0 === null) return; const dx = e.clientX - x0; x0 = null;
    if (segurou || (e.target as Element).closest("#sair")) return;
    if (auto && Math.abs(dx) <= 60) { auto = false; clearTimeout(timer); byId("toque").textContent = "pausado · toque para continuar"; toast("Pausado. Siga no seu ritmo"); return; }
    const p = passos[i]; vibrate(p?.tipo === "oracao" && p.id === "avemaria" ? 6 : 14); mostrar(dx > 60 ? i - 1 : i + 1);
  };
  r.onpointerup = soltar; r.onpointercancel = () => { clearTimeout(tSeg); r.classList.remove("vendo-texto"); x0 = null; };
}

function mostrar(n: number): void {
  clearTimeout(timer); if (!tela) return;
  i = Math.max(0, Math.min(n, passos.length));
  if (i === passos.length) { fim(); return; }
  const p = passos[i], dezena = "dezena" in p ? p.dezena : undefined;
  const nome = p.tipo === "misterio" ? p.misterio.titulo : p.titulo.replace(/ pela (fé|esperança|caridade)$/, "");
  const sub = p.tipo === "misterio" ? html`${p.dezena}º mistério ${conj.nome.replace("Mistérios ", "").toLowerCase().replace(/s$/, "")} · ${p.misterio.ref}<br><em>Fruto: ${p.misterio.fruto}</em>`
    : p.conta ? html`${p.conta} de ${p.total}${p.total === 3 ? ` · pela ${["fé", "esperança", "caridade"][p.conta - 1]}` : ""}` : dezena ? html`${dezena}ª dezena` : html`Abertura`;
  const corpo = byId("corpo");
  corpo.classList.remove("entra"); void corpo.offsetWidth; corpo.classList.add("entra");
  corpo.classList.toggle("misterio", p.tipo === "misterio");
  setHTML(byId("nome"), html`${nome}`); setHTML(byId("sub"), sub);
  setHTML(byId("texto"), p.tipo === "misterio" ? html`<div class="respira"><i></i><span>respire devagar</span></div>` : html`${oracao(p.id).texto.replace(/\n/g, " ")}`);
  byId("reza").classList.toggle("com-texto", comTexto && p.tipo === "oracao");
  byId("passoN").textContent = `${i + 1}/${passos.length}`;
  byId("toque").textContent = auto ? "avançando sozinho · toque para pausar" : "toque para continuar · segure para ver o texto";
  byId("reza").querySelectorAll<HTMLElement>("[data-d]").forEach(x => { const k = Number(x.dataset.d); x.className = dezena && k < dezena ? "feita" : k === dezena ? "atual" : ""; });
  // a luz entardece ao longo das cinco dezenas
  byId("reza").style.setProperty("--dusk", String(Math.min(1, i / passos.length) * .55));
  if (t3d && mapa.length) t3d.focar(mapa[i]);
  if (auto) { const t = p.tipo === "misterio" ? p.misterio.titulo + " " + p.misterio.fruto + " respire" : oracao(p.id).texto;
    timer = window.setTimeout(() => mostrar(i + 1), Math.max(p.tipo === "misterio" ? 9000 : 3500, t.split(" ").length * 430)); }
}

function fim(): void {
  if (!tela) return;
  const prog = registrarTerco(); clearTimeout(timer); document.body.classList.remove("rezando"); abaixar(1);
  t3d?.concluir(); byId("corpo").remove(); byId("toque").remove(); byId("reza").classList.add("concluido");
  const box = document.createElement("div"); box.className = "fim3d";
  setHTML(box, html`<h1>Amém</h1><p class="lead">Você rezou o terço com os ${conj.nome.toLowerCase()}.</p>
    <p class="meta">${prog.seguidos > 1 ? `${prog.seguidos} dias seguidos rezando` : "Que tal voltar amanhã?"} · ${prog.tercos} ${prog.tercos === 1 ? "terço" : "terços"} no total</p>
    <button class="primary" id="voltar">Voltar para Hoje</button>`);
  byId("reza").appendChild(box);
  toast("Terço concluído"); vibrate(20);
  const v = byId<HTMLButtonElement>("voltar"); v.disabled = true; setTimeout(() => { v.disabled = false; }, 1200); // evita o toque final "atravessar"
  v.onclick = () => irPara("hoje");
}
