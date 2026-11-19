import test from 'node:test';
import assert from 'node:assert/strict';
import { criarRelogio } from '../src/engine/clock.js';

test('avancar com velocidade 2 dobra o tempo', () => {
  const relogio = criarRelogio();
  relogio.setVelocidade(2);
  assert.equal(relogio.avancar(0.05), 0.1);
  relogio.avancar(0.05);
  assert.ok(Math.abs(relogio.tempo - 0.2) < 1e-9);
});

test('pausado devolve 0 e não dispara agendamentos', () => {
  const relogio = criarRelogio();
  let chamou = 0;
  relogio.depois(0.5, () => chamou++);
  relogio.pausar();
  assert.equal(relogio.avancar(0.1), 0);
  relogio.avancar(100);
  assert.equal(relogio.tempo, 0);
  assert.equal(chamou, 0);
  relogio.continuar();
  relogio.avancar(0.1);
  assert.ok(relogio.tempo > 0);
});

test('depois(3) dispara só quando o tempo chega a 3 s', () => {
  const relogio = criarRelogio();
  let disparouEm = null;
  relogio.depois(3, (t) => {
    disparouEm = t;
  });

  for (let i = 0; i < 29; i++) relogio.avancar(0.1); // tempo = 2.9
  assert.equal(disparouEm, null);
  for (let i = 0; i < 10; i++) relogio.avancar(0.1); // passa de 3
  assert.notEqual(disparouEm, null);
  assert.ok(disparouEm >= 3);
});

test('vários agendamentos disparam na ordem do tempo', () => {
  const relogio = criarRelogio();
  const ordem = [];
  relogio.depois(0.5, () => ordem.push('b'));
  relogio.depois(0.2, () => ordem.push('a'));
  relogio.depois(0.8, () => ordem.push('c'));
  for (let i = 0; i < 10; i++) relogio.avancar(0.1);
  assert.deepEqual(ordem, ['a', 'b', 'c']);
});

test('cancelar impede o disparo', () => {
  const relogio = criarRelogio();
  let chamou = 0;
  const id = relogio.depois(0.3, () => chamou++);
  const outro = relogio.depois(0.3, () => chamou++);
  assert.equal(relogio.cancelar(id), true);
  for (let i = 0; i < 10; i++) relogio.avancar(0.1);
  assert.equal(chamou, 1);
  assert.equal(relogio.cancelar(outro), false); // já disparou
  assert.equal(relogio.cancelar(999), false);
});

test('setVelocidade ignora valores inválidos', () => {
  const relogio = criarRelogio();
  assert.equal(relogio.velocidade, 1);
  for (const v of [0.25, 0.5, 1, 2]) assert.equal(relogio.setVelocidade(v), v);
  for (const v of [0, 3, -1, '2', null, undefined, NaN, 1.5]) {
    relogio.setVelocidade(v);
    assert.equal(relogio.velocidade, 2, `ignorou ${String(v)}`);
  }
});

test('dtReal grande é limitado a 0.1', () => {
  const relogio = criarRelogio();
  assert.equal(relogio.avancar(5), 0.1);
  assert.ok(Math.abs(relogio.tempo - 0.1) < 1e-9);
  relogio.setVelocidade(2);
  assert.equal(relogio.avancar(1000), 0.2);
});

test('alternar e aoMudar avisam os ouvintes', () => {
  const relogio = criarRelogio();
  const eventos = [];
  const sair = relogio.aoMudar((e) => eventos.push(`${e.pausado ? 'pausado' : 'rodando'}:${e.velocidade}`));
  relogio.alternar();
  relogio.setVelocidade(0.5);
  assert.deepEqual(eventos, ['pausado:1', 'pausado:0.5']);
  sair();
  relogio.continuar();
  assert.equal(eventos.length, 2);
});
