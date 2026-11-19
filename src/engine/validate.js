// Valida e limpa um cenário (vindo de arquivo ou gerado por IA) antes de tocá-lo. Usado no navegador e no servidor.
export const AGENTES_OK = ['cliente', 'gerente', 'designer', 'programador', 'revisor'];
const txt = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;

export function validarCenario(c) {
  if (!c || typeof c !== 'object') return 'não é um objeto';
  if (!txt(c.nome, 80) || !txt(c.pedido, 300)) return 'nome ou pedido inválido';
  if (!txt(c.htmlFinal, 30000)) return 'htmlFinal inválido';
  if (!Array.isArray(c.etapas) || c.etapas.length < 8 || c.etapas.length > 20) return 'número de etapas inválido';
  for (const [k, e] of c.etapas.entries()) {
    if (!e || !txt(e.id, 60) || !AGENTES_OK.includes(e.agente)) return `etapa ${k + 1}: id ou agente inválido`;
    if (typeof e.duracao !== 'number' || e.duracao < 2 || e.duracao > 15) return `etapa ${k + 1}: duração inválida`;
    if (!txt(e.explicacao, 300) || !txt(e.pensamento, 400)) return `etapa ${k + 1}: textos inválidos`;
    if (typeof e.saida !== 'object' || e.saida === null) return `etapa ${k + 1}: sem saída`;
    if (e.saida.html !== undefined && !txt(e.saida.html, 8000)) return `etapa ${k + 1}: html grande demais`;
  }
  if (!c.etapas.at(-1).id.includes('entrega')) return 'a última etapa precisa ser a entrega';
  return null;
}

/** Remove o que poderia executar código (scripts, onclick=, javascript:) e limita tamanhos. */
export const limparHtml = h => String(h)
  .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<\/?(iframe|object|embed|link|meta)[^>]*>/gi, (m) => /meta/i.test(m) ? m : '')
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript:/gi, '');

export function limparCenario(c) {
  const o = JSON.parse(JSON.stringify(c)); o.htmlFinal = limparHtml(o.htmlFinal);
  for (const e of o.etapas) if (e.saida.html) e.saida.html = limparHtml(e.saida.html);
  return o;
}
