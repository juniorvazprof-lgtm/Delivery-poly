import { escapeHtml } from "./html";

/** Primeira letra maiúscula. */
export const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** Escapa texto para HTML. Prefira o template html`` de utils/html.ts em código novo. */
export const esc = (s: unknown): string => escapeHtml(s);

/** Remove caracteres de controle e limita o tamanho de um texto vindo de fora. */
export function cleanText(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .trim()
    .slice(0, max);
}

/**
 * Texto para os cards do feed: palavras em CAIXA ALTA (ex.: SENHOR) viram "Senhor",
 * e a frase começa com maiúscula, assim como o início após ponto final, ! ou ?.
 */
export function softCase(t: string): string {
  const s = t.replace(/\p{Lu}{2,}/gu, w => w[0] + w.slice(1).toLocaleLowerCase("pt-BR"));
  return s.replace(/(^|[.!?]\s+)([«“"'(]?)(\p{Ll})/gu, (_m, a: string, b: string, c: string) => a + b + c.toLocaleUpperCase("pt-BR"));
}
