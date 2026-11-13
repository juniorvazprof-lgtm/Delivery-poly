/* Aba Você: progresso guardado só no aparelho e informações sobre os textos. */
import { html, setHTML } from "../utils/html";
import { byId } from "../utils/dom";
import { openSheet, progresso } from "../ui/ui";

export function renderVoce(el: HTMLElement): void {
  const p = progresso();
  setHTML(el, html`<div class="pagina"><div class="kicker">Você</div><h1>Sua caminhada</h1>
    <div class="stats"><div><b>${p.seguidos}</b><small>${p.seguidos === 1 ? "dia" : "dias seguidos"}</small></div><div><b>${p.tercos}</b><small>terços</small></div><div><b>${p.oracoes}</b><small>orações</small></div></div>
    <div class="label">Em breve</div>
    <div class="lista"><div class="item off"><span><b>Lembretes do Ângelus e do terço</b><small>Às 6h, 12h e 18h, ou no horário que você escolher</small></span></div>
     <div class="item off"><span><b>Evangelho do dia</b><small>Quando tivermos uma tradução católica em domínio público</small></span></div>
     <div class="item off"><span><b>Novenas e Terço da Misericórdia</b><small>Com acompanhamento dos dias</small></span></div></div>
    <button class="link sobre" id="sobre">Sobre os textos deste app</button></div>`);
  byId("sobre").onclick = () => openSheet(html`<h2>Sobre os textos</h2><p class="sub">Versão de teste.</p>
    <div class="about-b"><p>As orações estão nas formas tradicionais rezadas no Brasil e passarão por revisão de um sacerdote antes do lançamento.</p>
    <p>A oração do dia e as descrições dos santos foram escritas pela equipe, em linguagem simples.</p>
    <p>O calendário litúrgico (tempos, cores, ciclos A/B/C) é calculado pelo próprio app. Algumas solenidades são celebradas no Brasil no domingo seguinte.</p>
    <p>Os mistérios do terço trazem só a referência bíblica. O texto da Bíblia entrará quando houver uma tradução católica em domínio público ou licenciada.</p>
    <p>Seu progresso fica guardado só neste aparelho.</p></div>`, "Sobre os textos");
}
