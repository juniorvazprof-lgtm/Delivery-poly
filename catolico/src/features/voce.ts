/* Aba Você: progresso guardado só no aparelho e informações sobre os textos. */
import { html, setHTML } from "../utils/html";
import { byId } from "../utils/dom";
import { openSheet, progresso, toast } from "../ui/ui";
import { alternarAlcancada, curtidos, intencoes, novaIntencao, removerIntencao, salvos } from "../core/estado";

export function renderVoce(el: HTMLElement): void {
  const p = progresso();
  setHTML(el, html`<div class="pagina"><div class="kicker">Você</div><h1>Sua caminhada</h1>
    <div class="stats"><div><b>${p.seguidos}</b><small>${p.seguidos === 1 ? "dia" : "dias seguidos"}</small></div><div><b>${p.tercos}</b><small>terços</small></div><div><b>${p.oracoes}</b><small>orações</small></div><div><b>${curtidos.size}</b><small>améns</small></div></div>
    <div class="label">Intenções de oração</div>
    <form class="intencao-form" id="intForm"><input id="intTxt" maxlength="160" placeholder="Por quem ou pelo que você quer rezar?" aria-label="Nova intenção"><button class="pill" type="submit">Pôr</button></form>
    <div class="intencoes">${intencoes.length ? intencoes.map(i => html`<div class="intencao ${i.alcancada ? "ok" : ""}"><span>${i.texto}</span>
      <button data-ok="${i.id}">${i.alcancada ? "Desfazer" : "Graça alcançada"}</button><button data-rm="${i.id}" aria-label="Remover">×</button></div>`)
      : html`<p class="fine">Suas intenções ficam só neste aparelho. Lembre delas no terço.</p>`}</div>
    <div class="label">Salvos</div>
    ${salvos.length ? salvos.slice(0, 30).map(s => html`<button class="salvo" data-s="${s.id}"><small>${s.tipo === "sabia" ? "Você sabia?" : s.titulo}</small><span>${s.tipo === "sabia" ? s.titulo : s.texto.slice(0, 120) + (s.texto.length > 120 ? "…" : "")}</span></button>`)
      : html`<p class="fine">Toque em Salvar num cartão do Hoje para guardar aqui.</p>`}
    <div class="label">Em breve</div>
    <div class="lista"><div class="item off"><span><b>Lembretes do Ângelus e do terço</b><small>Às 6h, 12h e 18h, ou no horário que você escolher</small></span></div>
          <div class="item off"><span><b>Novenas e Terço da Misericórdia</b><small>Com acompanhamento dos dias</small></span></div></div>
    <button class="link sobre" id="sobre">Sobre os textos deste app</button></div>`);
  byId("intForm").onsubmit = e => { e.preventDefault(); const t = byId<HTMLInputElement>("intTxt").value; if (!t.trim()) return; novaIntencao(t); toast("Intenção guardada"); renderVoce(el); };
  el.querySelectorAll<HTMLButtonElement>("[data-ok]").forEach(b => b.onclick = () => { alternarAlcancada(b.dataset.ok || ""); renderVoce(el); });
  el.querySelectorAll<HTMLButtonElement>("[data-rm]").forEach(b => b.onclick = () => { removerIntencao(b.dataset.rm || ""); renderVoce(el); });
  el.querySelectorAll<HTMLButtonElement>("[data-s]").forEach(b => b.onclick = () => { const s = salvos.find(x => x.id === b.dataset.s); if (!s) return;
    openSheet(html`<h2>${s.titulo}</h2><div class="oracao"><p>${s.texto}</p></div><p class="fine">${s.de}</p>`, s.titulo); });
  byId("sobre").onclick = () => openSheet(html`<h2>Sobre os textos</h2><p class="sub">Versão de teste.</p>
    <div class="about-b"><p>As orações estão nas formas tradicionais rezadas no Brasil e passarão por revisão de um sacerdote antes do lançamento.</p>
    <p>A oração do dia e as descrições dos santos foram escritas pela equipe, em linguagem simples.</p>
    <p>O calendário litúrgico (tempos, cores, ciclos A/B/C) é calculado pelo próprio app. Algumas solenidades são celebradas no Brasil no domingo seguinte.</p>
    <p>Os mistérios do terço trazem só a referência bíblica. O texto da Bíblia entrará quando houver uma tradução católica em domínio público ou licenciada.</p>
    <p>Algumas orações trazem também a forma antiga, de livros em domínio público (1778 e 1880), com a ortografia atualizada.</p>
    <p>Calendário litúrgico, festas e santos do dia: projeto ambo-liturgical-calendars (licença MIT, © 2026 Igor Aguiar), derivado do romcal (MIT).</p>
    <p>Evangelho do dia (prévia): Bíblia do Pe. Antônio Pereira de Figueiredo, edição de 1950; será trocada pela edição de 1891, em domínio público, revisada.</p>
    <p>Catecismo de São Pio X (1912): texto italiano em domínio público (publicado pela Congregação para o Clero em clerus.org), com tradução própria do app, ainda em revisão. Onde o ensino ou a disciplina mudou, a pergunta traz uma nota com os números do Catecismo da Igreja Católica; as perguntas sobre a Concordata italiana de 1929 foram retiradas.</p>
    <p>Quiz e explicações sobre os sacramentos: texto próprio do app. Os botões "CIC" levam ao texto oficial do Catecismo da Igreja Católica no site do Vaticano; o app não reproduz o texto do Catecismo.</p>
    <p>Seu progresso fica guardado só neste aparelho.</p></div>`, "Sobre os textos");
}
