// mesma regra do campo "exibir" original: primeira letra maiúscula e pontuação final para leitura isolada
export function exibir(t) {
  let s = t.replace(/^[\s"“'(]+/, "");
  s = s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);
  s = s.replace(/[\s,;:—–-]+$/, "");
  if (!/[.!?…"”)]$/.test(s)) s += ".";
  return s;
}

