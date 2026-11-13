/**
 * Acesso ao DOM com tipos.
 *
 * byId e q: o elemento precisa existir. Se não existir, o erro diz qual faltou (em vez de um
 * "cannot read properties of null" sem pista). Para elementos opcionais, use byIdMaybe e qMaybe.
 */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
}

export function byIdMaybe<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function q<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`Elemento "${selector}" não encontrado`);
  return el as T;
}

export function qMaybe<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T | null {
  return root.querySelector(selector) as T | null;
}

export function qa<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll(selector)) as T[];
}

/** Elemento mais próximo (subindo na árvore) a partir do alvo de um evento. */
export function closestFrom<T extends HTMLElement = HTMLElement>(target: EventTarget | null, selector: string): T | null {
  return target instanceof Element ? (target.closest(selector) as T | null) : null;
}

/**
 * Aplica estilos declarados como data-style="--c1:#fff;--c2:#000".
 * A política de segurança (CSP) do app não permite o atributo style no HTML; definir estilos
 * por código (CSSOM) é permitido. Só propriedades da lista abaixo são aceitas, e valores com
 * url(), expression() ou caracteres de marcação são descartados.
 */
const SAFE_PROPS = /^(--[a-z0-9-]+|width|height|margin(-top|-bottom)?|text-align|align-items|max-width|text-transform|letter-spacing|font-weight|font-size|display|border-radius|background|color|border-color)$/;
export function applyDataStyles(root: ParentNode): void {
  for (const el of qa(root, "[data-style]")) {
    for (const decl of (el.dataset.style || "").split(";")) {
      const i = decl.indexOf(":");
      if (i < 0) continue;
      const prop = decl.slice(0, i).trim(), value = decl.slice(i + 1).trim();
      if (SAFE_PROPS.test(prop) && !/url\(|expression\(|[<>{}]/i.test(value)) el.style.setProperty(prop, value);
    }
    el.removeAttribute("data-style");
  }
}
