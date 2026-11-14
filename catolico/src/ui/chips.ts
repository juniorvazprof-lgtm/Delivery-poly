/* Chips "CIC 1213": levam ao texto oficial do Catecismo no vatican.va (o app não reproduz o texto). */
import { html } from "../utils/html";
import { linkCIC } from "../core/cic";
export const chipsCIC = (ns: number[]) => ns.length ? html`<div class="chips-cic"><span>📖 Aprofunde no texto oficial:</span>${ns.map(n => {
  const u = linkCIC(n); return u ? html`<a class="cic" href="${u}" target="_blank" rel="noopener noreferrer" title="Abrir o Catecismo no vatican.va (procure o n. ${n})">CIC ${n}</a>` : ""; })}</div>` : "";
