// Cliente do modo online: pergunta ao servidor se há IA disponível e pede um cenário novo para o pedido digitado.
export async function servidorOnline() {
  try { const r = await fetch('/api/saude', { signal: AbortSignal.timeout(2500) }); const j = await r.json(); return Boolean(j.ok && j.chave); } catch { return false; }
}
export async function gerarCenario(pedido) {
  const r = await fetch('/api/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedido }), signal: AbortSignal.timeout(110000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || `erro ${r.status}`);
  return j;
}
