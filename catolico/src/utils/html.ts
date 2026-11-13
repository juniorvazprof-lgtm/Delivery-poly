import { applyDataStyles } from "./dom";

/**
 * HTML seguro por padrão.
 *
 *   html`<b>${nomeDigitado}</b>`        → o texto é escapado
 *   html`<ul>${itens.map(i => html`<li>${i}</li>`)}</ul>`   → listas de html seguro entram sem escapar
 *   html`${raw(IC("heart"))}`           → só para markup fixo do próprio app (ícones, constantes)
 *
 * Use setHTML(el, html`...`) em vez de el.innerHTML = `...` sempre que a tela mostrar
 * dados que vieram de fora: IA, texto digitado, dados salvos no aparelho, arquivos baixados.
 */
export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string { return this.value; }
}

const MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };

/** Escapa texto para uso em conteúdo e em atributos entre aspas. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"'`]/g, c => MAP[c]);
}

/** Marca markup fixo e confiável (do próprio código) para entrar sem escape. Nunca use com dados de fora. */
export function raw(markup: string): SafeHtml { return new SafeHtml(markup); }

function part(v: unknown): string {
  if (v instanceof SafeHtml) return v.value;
  if (Array.isArray(v)) return v.map(part).join("");
  if (v === null || v === undefined || v === false) return "";
  return escapeHtml(v);
}

/** Template que escapa toda interpolação, exceto SafeHtml (e listas de SafeHtml). */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/**
 * Insere html seguro em um elemento. Aceita só SafeHtml, para o compilador barrar strings soltas.
 * Depois aplica os estilos marcados com data-style (a CSP do app não permite o atributo style).
 */
export function setHTML(el: Element | null, content: SafeHtml): void {
  if (!el) return;
  el.innerHTML = content.value;
  applyDataStyles(el);
}
