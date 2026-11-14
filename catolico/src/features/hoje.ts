/* Aba Hoje: um cartão por tela (como o feed do Lumen): o dia litúrgico e o santo, a oração do dia,
   o terço de hoje, o Ângelus e jaculatórias. */
import { html, setHTML } from "../utils/html";
import { byId } from "../utils/dom";
import { IC } from "../ui/icons";
import { openSheet, registrarOracao, toast, vibrate } from "../ui/ui";
import { NOME_COR } from "../core/liturgia";
import { infoDoDia, textoDe, type Ref } from "../core/dia";
import { S } from "../services/storage";
import { dayKey } from "../ui/ui";
import { simbolo, simboloDoSanto } from "../ui/simbolos";
import { POOL, type Cartao } from "../data/cartoes";
import { alternarSalvo, curtidos, gosto, marcarGosto, salvar, salvos } from "../core/estado";
import { compartilhar } from "./compartilhar";
import { DEVOCOES } from "../data/santos";
import { conjuntoDoDia } from "../data/terco";
import { oracao } from "../data/oracoes";
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

const ESTILO: Record<string, string> = { jaculatoria: "jac", sabia: "sabia", misterio: "mist", santo: "sant", oracao: "ora" };
const curto = (t: string, n = 220) => t.length > n ? t.slice(0, t.lastIndexOf(" ", n)) + "…" : t;
let mapa = new Map<string, Cartao>();

/** Escolhe o próximo cartão do conjunto misturado: sem repetir na sessão, com peso pelo gosto de cada tema. */
const vistos = new Set<string>();
function proximo(): Cartao {
  let livres = POOL.filter(c => !vistos.has(c.id));
  if (!livres.length) { vistos.clear(); livres = POOL; }
  const peso = (c: Cartao) => Math.max(.3, 1 + (gosto[c.tema] || 0) / 4) * (c.tipo === "santo" ? .35 : 1);
  let r = Math.random() * livres.reduce((a, c) => a + peso(c), 0);
  for (const c of livres) { r -= peso(c); if (r <= 0) { vistos.add(c.id); return c; } }
  const c = livres[0]; vistos.add(c.id); return c;
}
const trilho = (c: Cartao) => html`<div class="trilho" data-id="${c.id}">
  <button data-a="amem" class="${curtidos.has(c.id) ? "on" : ""}" aria-label="Amém">${IC("heart")}<small>Amém</small></button>
  <button data-a="salvar" class="${salvos.some(s => s.id === c.id) ? "on" : ""}" aria-label="Salvar">${IC("save")}<small>Salvar</small></button>
  <button data-a="enviar" aria-label="Enviar">${IC("send")}<small>Enviar</small></button></div>`;
function cartaoMisto(c: Cartao) {
  mapa.set(c.id, c);
  const longo = c.texto.length > 230;
  return html`<section class="card t-${ESTILO[c.tipo] || "x"}" data-card="${c.id}">
    ${simbolo(c.simbolo, "grande")}
    <div class="kicker">${c.rotulo}</div>
    ${c.titulo ? html`<h2>${c.titulo}</h2>` : ""}
    ${c.tipo === "jaculatoria" ? html`<blockquote>${c.texto}</blockquote><cite>${c.de}</cite>` : html`<p class="lead txt">${curto(c.texto)}</p>`}
    ${longo ? html`<button class="link mais" data-mais="${c.id}">Ler tudo</button>` : ""}
    ${c.tipo === "misterio" ? html`<p class="fine">${c.de}</p>` : ""}
    ${c.acao?.aba ? html`<button class="pill" data-ir="${c.acao.aba}">${IC("rosary")}${c.acao.rotulo}</button>` : ""}
    ${trilho(c)}</section>`;
}
function maisCartoes(feed: HTMLElement, n: number): void {
  const tmp = document.createElement("div"); setHTML(tmp, html`${Array.from({ length: n }, () => cartaoMisto(proximo()))}`);
  const sentinela = feed.querySelector(".sentinela");
  [...tmp.children].forEach(ch => feed.insertBefore(ch, sentinela));
}

/** Onboarding: na primeira visita, pergunta o que a pessoa busca e dá um peso inicial aos temas. */
const BUSCAS: { rotulo: string; temas: string[] }[] = [
  { rotulo: "Rezar mais", temas: ["oracoes", "jaculatoria", "terco"] }, { rotulo: "Entender a fé", temas: ["liturgia", "sacramentos", "missa", "simbolos"] },
  { rotulo: "Conhecer os santos", temas: ["santos"] }, { rotulo: "Nossa Senhora", temas: ["maria", "terco"] }, { rotulo: "A Bíblia", temas: ["biblia", "ano"] },
];
function onboarding(feed: HTMLElement): void {
  if (S.get("cat.onb", false)) return;
  const el = document.createElement("section"); el.className = "card onb";
  setHTML(el, html`${simbolo("luz", "grande")}<div class="kicker">Bem-vindo</div><h2>O que você busca hoje?</h2>
    <p class="lead">Escolha quantos quiser. O seu feed vai se ajustar ao que você mais gosta.</p>
    <div class="chips">${BUSCAS.map((b, i) => html`<button class="chip" data-b="${i}">${b.rotulo}</button>`)}</div>
    <button class="primary" id="onbOk">Continuar</button>`);
  feed.insertBefore(el, feed.children[1] || null);
  el.querySelectorAll<HTMLButtonElement>("[data-b]").forEach(b => b.onclick = () => { b.classList.toggle("on"); vibrate(4); });
  byId("onbOk").onclick = () => {
    el.querySelectorAll<HTMLButtonElement>(".chip.on").forEach(b => BUSCAS[Number(b.dataset.b)].temas.forEach(t => marcarGosto(t, 6)));
    S.set("cat.onb", true); toast("Pronto. Deslize para continuar"); el.querySelector(".chips")?.classList.add("feito");
    feed.scrollBy({ top: feed.clientHeight, behavior: "smooth" });
  };
}

function acao(c: Cartao, a: string, btn: HTMLElement | null): void {
  if (a === "amem") {
    const on = !curtidos.has(c.id); on ? curtidos.add(c.id) : curtidos.delete(c.id); if (on) marcarGosto(c.tema, 3); else salvar();
    btn?.classList.toggle("on", on); if (on) { vibrate(8); registrarOracao(); }
  } else if (a === "salvar") {
    const on = alternarSalvo({ id: c.id, tipo: c.tipo, titulo: c.titulo || c.rotulo, texto: c.texto, de: c.de });
    if (on) marcarGosto(c.tema, 4); btn?.classList.toggle("on", on); toast(on ? "Salvo em Você" : "Removido dos salvos");
  } else if (a === "enviar") { marcarGosto(c.tema, 5); void compartilhar(c); }
}

export function renderHoje(el: HTMLElement): void {
  const d = new Date(), I = infoDoDia(d), L = I.lit, santo = I.sobre, dev = DEVOCOES[d.getDay()], terco = conjuntoDoDia(d);
  const pascal = L.tempo === "Páscoa", hoje = dayKey(d);
  mapa = new Map(); vistos.clear();
  const cDia: Cartao = { id: `dia:${hoje}`, tipo: "dia", tema: "santos", simbolo: simboloDoSanto(I.titulo, I.cor), rotulo: hojeLabel(d), titulo: I.titulo,
    texto: santo ? santo.sobre : `${L.tempo} · cor ${NOME_COR[I.cor].toLowerCase()}`, de: "Lumen Católico" };
  const cOra: Cartao = { id: `od:${d.getDay()}`, tipo: "oracaodia", tema: "oracoes", simbolo: "vela", rotulo: "Oração do dia", titulo: dev.tema, texto: dev.oracao, de: "Lumen Católico" };
  const cTer: Cartao = { id: `ter:${terco.id}`, tipo: "misterio", tema: "terco", simbolo: "terco", rotulo: "Terço de hoje", titulo: terco.nome, texto: terco.misterios.map(m => m.titulo).join(" · "), de: "Lumen Católico" };
  const cAng: Cartao = { id: pascal ? "ora:reginacaeli" : "ora:angelus", tipo: "oracao", tema: "oracoes", simbolo: "maria", rotulo: pascal ? "Tempo pascal" : "6h · 12h · 18h",
    titulo: pascal ? "Rainha do Céu" : "Ângelus", texto: oracao(pascal ? "reginacaeli" : "angelus").texto.replace(/\n/g, " "), de: "Oração tradicional" };
  const cEv: Cartao | null = I.evangelho ? { id: `ev:${hoje}`, tipo: "evangelho", tema: "biblia", simbolo: "livro", rotulo: "Evangelho do dia", titulo: I.evangelho.texto, texto: "", de: I.evangelho.texto } : null;
  [cDia, cOra, cTer, cAng, ...(cEv ? [cEv] : [])].forEach(c => mapa.set(c.id, c));
  setHTML(el, html`<div class="feed" id="feed">
   <section class="card hoje" data-card="${cDia.id}">
     ${simbolo(cDia.simbolo, "grande")}
     <div class="kicker"><i class="cor ${I.cor}"></i>${hojeLabel(d)}</div>
     <h1>${I.titulo}</h1>
     <p class="meta">${I.grau && I.grau !== "Féria" ? `${I.grau} · ` : ""}${L.tempo} · cor ${NOME_COR[I.cor].toLowerCase()} · ano ${L.ciclo}/${L.ano}</p>
     ${I.preceito ? html`<p class="preceito">Dia santo de preceito: participe da Missa</p>` : ""}
     ${I.santos.length ? html`<div class="santo"><small>Santo do dia</small>${I.santos.filter(x => x.nome !== I.titulo).map(x => html`<b>${x.nome}</b>`)}
         ${santo ? html`<p>${santo.sobre}</p>${santo.padroeiro ? html`<em>Padroeiro ${santo.padroeiro}</em>` : ""}` : ""}<em>${I.santos.map(x => x.grau).filter(Boolean)[0] || ""}</em></div>`
       : santo ? html`<div class="santo"><small>Hoje</small><p>${santo.sobre}</p></div>` : ""}
     ${trilho(cDia)}
     <div class="hint">deslize ↑</div>
   </section>
   ${cEv && I.evangelho ? html`<section class="card t-ev" data-card="${cEv.id}">
     ${simbolo("livro", "grande")}
     <div class="kicker">Evangelho do dia</div>
     <h2>${I.evangelho.texto}</h2>
     <blockquote class="ev" id="evTxt">…</blockquote>
     <button class="pill" id="evLer">Ler o Evangelho completo</button>
     <p class="fine prev">Prévia: texto da Bíblia do Pe. Figueiredo (ed. 1950) até concluirmos a revisão da edição de 1891.</p>
     ${trilho(cEv)}
   </section>` : ""}
   <section class="card t-ora" data-card="${cOra.id}">
     ${simbolo("vela", "grande")}
     <div class="kicker">Oração do dia</div>
     <h2>${dev.tema}</h2>
     <blockquote>${dev.oracao}</blockquote>
     <button class="pill" id="rezei">${IC("candle")}Rezei esta oração</button>
     ${trilho(cOra)}
   </section>
   <section class="card t-mist" data-card="${cTer.id}">
     ${simbolo("terco", "grande")}
     <div class="kicker">Terço de hoje</div>
     <h2>${terco.nome}</h2>
     <ol class="mist">${terco.misterios.map(m => html`<li>${m.titulo}</li>`)}</ol>
     <button class="primary" id="rezarTerco">${IC("rosary")}Rezar o terço</button>
     ${trilho(cTer)}
   </section>
   <section class="card t-ora" data-card="${cAng.id}">
     ${simbolo("maria", "grande")}
     <div class="kicker">${cAng.rotulo}</div>
     <h2>${cAng.titulo}</h2>
     <p class="lead">${pascal ? "No tempo da Páscoa, a Igreja saúda Maria com a alegria da ressurreição." : "Três vezes ao dia, a Igreja para um instante e lembra que Deus se fez homem."}</p>
     <button class="pill" id="angelus">${IC("candle")}Rezar agora</button>
     ${trilho(cAng)}
   </section>
   <div class="sentinela"></div>
  </div>`);
  const feed = byId("feed");
  maisCartoes(feed, 6); onboarding(feed);
  byId("rezei").onclick = () => { registrarOracao(); vibrate(10); toast("Amém. Bom dia com Deus"); };
  byId("rezarTerco").onclick = () => irPara("terco");
  if (I.evangelho && cEv) carregarEvangelho(I.evangelho, cEv);
  byId("angelus").onclick = () => lerOracao(pascal ? "reginacaeli" : "angelus");
  // ações delegadas: trilho, "ler tudo", atalhos para abas e toque duplo = Amém
  feed.onclick = e => {
    const t = e.target as HTMLElement, b = t.closest<HTMLElement>("[data-a]");
    if (b) { const c = mapa.get(b.closest<HTMLElement>(".trilho")?.dataset.id || ""); if (c) acao(c, b.dataset.a || "", b); return; }
    const m = t.closest<HTMLElement>("[data-mais]"); if (m) { const c = mapa.get(m.dataset.mais || ""); if (c) openSheet(html`<div class="kicker">${c.rotulo}</div><h2>${c.titulo || ""}</h2><div class="oracao"><p>${c.texto}</p></div>`, c.titulo || c.rotulo); return; }
    const ir = t.closest<HTMLElement>("[data-ir]"); if (ir) irPara(ir.dataset.ir || "hoje");
  };
  feed.ondblclick = e => {
    const t = e.target as HTMLElement; if (t.closest("button,a,details")) return;
    const sec = t.closest<HTMLElement>("[data-card]"), c = mapa.get(sec?.dataset.card || ""); if (!sec || !c) return;
    const btn = sec.querySelector<HTMLElement>('[data-a="amem"]'); if (!curtidos.has(c.id)) acao(c, "amem", btn);
    const f = document.createElement("div"); f.className = "amem-voo"; setHTML(f, simbolo("coracao")); sec.appendChild(f); setTimeout(() => f.remove(), 900);
  };
  const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) maisCartoes(feed, 4); }, { root: feed, rootMargin: "0px 0px 200% 0px" });
  io.observe(feed.querySelector(".sentinela")!);
}

/** Mostra o começo do Evangelho no cartão e o texto completo numa folha. */
async function carregarEvangelho(r: Ref, c: Cartao): Promise<void> {
  const el = document.getElementById("evTxt"), btn = document.getElementById("evLer"); if (!el || !btn) return;
  try {
    const vs = await textoDe(r), corrido = vs.map(v => v.t).join(" "); c.texto = curto(corrido, 420);
    el.textContent = corrido.length > 260 ? corrido.slice(0, corrido.lastIndexOf(" ", 260)) + "…" : corrido;
    btn.onclick = () => openSheet(html`<h2>${r.texto}</h2><p class="sub">Evangelho do dia · prévia</p>
      <div class="oracao evangelho">${vs.map(v => html`<p><sup>${v.n}</sup>${v.t}</p>`)}</div>
      <p class="fine">Pe. Antônio Pereira de Figueiredo, edição de 1950 (prévia). Trechos marcados com […] estão em revisão.</p>`, "Evangelho do dia");
  } catch { el.textContent = "Não foi possível abrir o Evangelho agora."; }
}
