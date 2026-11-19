import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { validarCenario, limparCenario, limparHtml } from '../src/engine/validate.js';
const ler = n => JSON.parse(readFileSync(new URL(`../src/data/scenarios/${n}.json`, import.meta.url)));
test('os 4 cenários incluídos são válidos', () => { for (const n of ['lanchonete', 'petshop', 'escola', 'banda']) assert.equal(validarCenario(ler(n)), null, n); });
test('rejeita agente desconhecido, poucas etapas e falta de entrega', () => {
  const c = ler('banda'); c.etapas[2].agente = 'hacker'; assert.match(validarCenario(c), /agente/);
  const d = ler('banda'); d.etapas = d.etapas.slice(0, 5); assert.match(validarCenario(d), /etapas/);
  const e = ler('banda'); e.etapas.at(-1).id = '12-fim'; assert.match(validarCenario(e), /entrega/);
});
test('limpa scripts, onclick e javascript:', () => {
  const h = limparHtml(`<a href="javascript:x()" onclick="y()">oi</a><script>alert(1)</script><img src=x onerror=z()>`);
  assert.doesNotMatch(h, /script|onclick|onerror|javascript:/i);
  const c = ler('escola'); c.htmlFinal += '<script>1</script>'; assert.doesNotMatch(limparCenario(c).htmlFinal, /<script/);
});
