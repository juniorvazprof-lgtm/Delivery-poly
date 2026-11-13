/* Lumen Católico · ponto de entrada: monta as abas Hoje, Terço, Orações e Você. */
import "./styles/index.css";
import { html, raw, setHTML } from "./utils/html";
import { byId, qa } from "./utils/dom";
import { IP } from "./ui/icons";
import { closeSheet, setLight, vibrate } from "./ui/ui";
import { LUZ } from "./core/liturgia";
import { infoDoDia } from "./core/dia";
import { renderHoje } from "./features/hoje";
import { renderTerco, sairDoTerco } from "./features/terco";
import { renderOracoes } from "./features/oracoes";
import { renderVoce } from "./features/voce";

export type Aba = "hoje" | "terco" | "oracoes" | "voce";
const app = byId("app"), nav = byId("bnav");
const TELAS: Record<Aba, (el: HTMLElement) => void> = { hoje: renderHoje, terco: renderTerco, oracoes: renderOracoes, voce: renderVoce };

export function ir(aba: Aba): void {
  sairDoTerco(); closeSheet();
  qa(nav, "button").forEach(b => { const on = b.dataset.tab === aba; b.classList.toggle("on", on); b.setAttribute("aria-current", on ? "page" : "false"); });
  app.dataset.aba = aba; app.scrollTop = 0; TELAS[aba](app);
}
qa(nav, "button").forEach(b => b.onclick = () => { vibrate(4); ir((b.dataset.tab as Aba) || "hoje"); });
byId("veil").onclick = closeSheet;
addEventListener("cat:ir", e => ir((e as CustomEvent<Aba>).detail));
addEventListener("cat:fechar", closeSheet);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

// a luz de fundo segue a cor litúrgica do dia
setLight(LUZ[infoDoDia(new Date()).cor]);
qa(document, "[data-i]").forEach(el => el.outerHTML = html`<svg viewBox="0 0 24 24" aria-hidden="true">${raw(IP[el.dataset.i || ""] || "")}</svg>`.value);
setHTML(app, html``);
ir("hoje");
