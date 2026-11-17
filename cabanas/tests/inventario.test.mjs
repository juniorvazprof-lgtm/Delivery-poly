// Testes da lógica pura do inventário: node --test tests/inventario.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

import { ITENS, RECEITAS } from '../js/itens.js';
import {
  criarInventario,
  adicionar,
  remover,
  contar,
  combinar,
  mover,
  serializar,
  desserializar,
} from '../js/inventario.js';

test('criarInventario devolve 8 espaços vazios por padrão', () => {
  const inv = criarInventario();
  assert.equal(inv.espacos, 8);
  assert.equal(inv.slots.length, 8);
  assert.ok(inv.slots.every((s) => s === null));
  assert.equal(criarInventario(24).slots.length, 24);
});

test('ITENS tem os itens mínimos e a receita de curativo', () => {
  for (const id of [
    'espingarda',
    'pistola',
    'cartuchos',
    'balas',
    'pilha',
    'vela',
    'pano',
    'alcool',
    'curativo',
    'kit',
    'fosforo',
    'chave_barracao',
    'chave_motel7',
    'bilhete',
  ]) {
    assert.ok(ITENS[id], `falta o item ${id}`);
    assert.equal(ITENS[id].nome, `item.${id}`);
    assert.equal(ITENS[id].desc, `item.${id}.desc`);
    assert.equal([...ITENS[id].icone].length, 1);
    assert.ok(ITENS[id].pilha >= 1);
  }
  assert.equal(ITENS.espingarda.espacos, 2);
  assert.equal(ITENS.cartuchos.arma, 'espingarda');
  assert.equal(ITENS.balas.arma, 'pistola');
  assert.equal(ITENS.curativo.cura, 35);
  assert.equal(RECEITAS.length, 1);
  assert.deepEqual(
    { a: RECEITAS[0].a, b: RECEITAS[0].b, resultado: RECEITAS[0].resultado },
    { a: 'pano', b: 'alcool', resultado: 'curativo' },
  );
});

test('empilha até o limite e transborda para outro slot', () => {
  const inv = criarInventario(8);
  assert.equal(adicionar(inv, 'cartuchos', 10), 0);
  assert.deepEqual(inv.slots[0], { id: 'cartuchos', qtd: 8 }); // pilha máxima
  assert.deepEqual(inv.slots[1], { id: 'cartuchos', qtd: 2 }); // transbordou
  assert.equal(contar(inv, 'cartuchos'), 10);

  // completa a pilha incompleta antes de abrir outro slot
  const inv2 = criarInventario(8);
  adicionar(inv2, 'pano', 3); // slot 0 cheio
  adicionar(inv2, 'pano', 1); // slot 1 com 1
  remover(inv2, 'pano', 1); // tira do menor (slot 1) -> fica 3
  assert.equal(contar(inv2, 'pano'), 3);
  assert.equal(inv2.slots[1], null);
});

test('devolve a sobra quando o inventário enche', () => {
  const inv = criarInventario(1);
  assert.equal(adicionar(inv, 'cartuchos', 10), 2); // só cabem 8
  assert.deepEqual(inv.slots[0], { id: 'cartuchos', qtd: 8 });

  const cheio = criarInventario(2);
  assert.equal(adicionar(cheio, 'kit', 1), 0);
  assert.equal(adicionar(cheio, 'bilhete', 1), 0);
  assert.equal(adicionar(cheio, 'pano', 1), 1); // nenhum espaço livre
  assert.equal(contar(cheio, 'pano'), 0);

  assert.equal(adicionar(criarInventario(8), 'item_inexistente', 3), 3);
});

test('espingarda ocupa 2 espaços e não cabe sem dois livres consecutivos', () => {
  const inv = criarInventario(3);
  adicionar(inv, 'pano', 1); // slot 0 ocupado
  adicionar(inv, 'espingarda', 1); // precisa de 1 e 2
  assert.equal(inv.slots[0].id, 'pano');
  assert.deepEqual(inv.slots[1], { id: 'espingarda', qtd: 1 });
  assert.deepEqual(inv.slots[2], { ref: 1 });

  // sem dois espaços seguidos: não cabe
  const apertado = criarInventario(3);
  adicionar(apertado, 'pano', 1); // 0
  adicionar(apertado, 'kit', 1); // 1
  adicionar(apertado, 'bilhete', 1); // 2
  remover(apertado, 'kit', 1); // libera o 1, sobra 0 ocupado e 2 ocupado
  assert.equal(adicionar(apertado, 'espingarda', 1), 1);
  assert.equal(contar(apertado, 'espingarda'), 0);

  // e cabe quando os dois seguidos estão livres
  remover(apertado, 'pano', 1);
  remover(apertado, 'bilhete', 1);
  assert.equal(adicionar(apertado, 'espingarda', 1), 0);
  assert.deepEqual(apertado.slots[0], { id: 'espingarda', qtd: 1 });
  assert.deepEqual(apertado.slots[1], { ref: 0 });
});

test('remover tira das pilhas menores primeiro e limpa slots', () => {
  const inv = criarInventario(8);
  adicionar(inv, 'pano', 5); // slot 0: 3, slot 1: 2
  assert.equal(contar(inv, 'pano'), 5);
  assert.deepEqual(inv.slots[0], { id: 'pano', qtd: 3 });
  assert.deepEqual(inv.slots[1], { id: 'pano', qtd: 2 });

  assert.equal(remover(inv, 'pano', 4), 4); // 2 do slot menor + 2 do maior
  assert.equal(contar(inv, 'pano'), 1);
  assert.equal(inv.slots[1], null); // slots vazios limpos
  assert.deepEqual(inv.slots[0], { id: 'pano', qtd: 1 });

  assert.equal(remover(inv, 'pano', 99), 1); // só havia 1
  assert.equal(inv.slots[0], null);
  assert.equal(remover(inv, 'pano', 1), 0); // nada para remover

  // remover item de 2 espaços limpa o ref
  const inv2 = criarInventario(4);
  adicionar(inv2, 'espingarda', 1);
  assert.deepEqual(inv2.slots[1], { ref: 0 });
  assert.equal(remover(inv2, 'espingarda', 1), 1);
  assert.equal(inv2.slots[0], null);
  assert.equal(inv2.slots[1], null);
});

test('combinar pano + alcool gera curativo (em qualquer ordem)', () => {
  const inv = criarInventario(8);
  adicionar(inv, 'pano', 1); // 0
  adicionar(inv, 'alcool', 1); // 1
  assert.equal(combinar(inv, 0, 1), 'curativo');
  assert.equal(contar(inv, 'pano'), 0);
  assert.equal(contar(inv, 'alcool'), 0);
  assert.equal(contar(inv, 'curativo'), 1);

  const inv2 = criarInventario(8);
  adicionar(inv2, 'alcool', 1); // 0
  adicionar(inv2, 'pano', 1); // 1
  assert.equal(combinar(inv2, 0, 1), 'curativo');
  assert.equal(contar(inv2, 'curativo'), 1);
});

test('combinar sem receita devolve null e não altera nada', () => {
  const inv = criarInventario(8);
  adicionar(inv, 'pano', 2); // 0
  adicionar(inv, 'vela', 1); // 1
  adicionar(inv, 'fosforo', 1); // 2
  const antes = serializar(inv);

  assert.equal(combinar(inv, 0, 1), null); // pano + vela: sem receita
  assert.equal(combinar(inv, 1, 2), null); // vela + fosforo: fora desta etapa
  assert.equal(combinar(inv, 0, 0), null); // mesmo slot
  assert.equal(combinar(inv, 0, 5), null); // slot vazio
  assert.deepEqual(serializar(inv), antes);
  assert.equal(contar(inv, 'pano'), 2); // nada foi consumido
});

test('mover leva o slot inteiro para o baú (24 espaços)', () => {
  const mochila = criarInventario(8);
  const bau = criarInventario(24);
  adicionar(mochila, 'cartuchos', 10); // 0: 8, 1: 2
  adicionar(mochila, 'espingarda', 1); // 2 e 3 (ref)
  assert.deepEqual(mochila.slots[3], { ref: 2 });

  assert.equal(mover(mochila, 0, bau), true);
  assert.equal(contar(mochila, 'cartuchos'), 2);
  assert.equal(contar(bau, 'cartuchos'), 8);
  assert.equal(mochila.slots[0], null);

  // mover pelo slot de referência resolve o item de 2 espaços
  assert.equal(mover(mochila, 3, bau), true);
  assert.equal(contar(mochila, 'espingarda'), 0);
  assert.equal(contar(bau, 'espingarda'), 1);
  assert.deepEqual(bau.slots[0], { id: 'cartuchos', qtd: 8 });
  assert.deepEqual(bau.slots[1], { id: 'espingarda', qtd: 1 });
  assert.deepEqual(bau.slots[2], { ref: 1 });

  // mover slot vazio devolve false
  assert.equal(mover(mochila, 7, bau), false);

  // baú cheio: move só o que coube e devolve false
  const cheio = criarInventario(1);
  adicionar(cheio, 'balas', 15);
  const origem = criarInventario(8);
  adicionar(origem, 'balas', 15);
  assert.equal(mover(origem, 0, cheio), false);
  assert.equal(contar(cheio, 'balas'), 15);
  assert.equal(contar(origem, 'balas'), 15); // nada mudou
});

test('serializar -> desserializar preserva o inventário', () => {
  const inv = criarInventario(8);
  adicionar(inv, 'espingarda', 1); // 0 e 1 (ref)
  adicionar(inv, 'cartuchos', 10); // 2: 8, 3: 2
  adicionar(inv, 'kit', 1); // 4
  adicionar(inv, 'alcool', 2); // 5
  const salvo = serializar(inv);

  assert.equal(salvo.espacos, 8);
  assert.equal(salvo.slots.length, 8);
  assert.deepEqual(salvo.slots[0], { id: 'espingarda', qtd: 1 });
  assert.equal(salvo.slots[1], null); // ref não é serializado
  assert.deepEqual(salvo.slots[3], { id: 'cartuchos', qtd: 2 });

  const voltou = desserializar(salvo, salvo.espacos);
  assert.deepEqual(voltou.slots[0], { id: 'espingarda', qtd: 1 });
  assert.deepEqual(voltou.slots[1], { ref: 0 }); // ref recriado
  assert.deepEqual(serializar(voltou), salvo); // ida e volta igual
  assert.equal(contar(voltou, 'cartuchos'), 10);

  // também funciona sem passar espaços (usa o do objeto salvo)
  assert.deepEqual(serializar(desserializar(salvo)), salvo);

  // baú de 24 ida e volta
  const bau = criarInventario(24);
  adicionar(bau, 'balas', 30);
  const salvoBau = serializar(bau);
  assert.equal(salvoBau.espacos, 24);
  assert.deepEqual(serializar(desserializar(salvoBau, 24)), salvoBau);
});

test('desserializar lixo não lança erro e descarta inválidos', () => {
  assert.doesNotThrow(() => desserializar(null, 8));
  assert.doesNotThrow(() => desserializar(undefined));
  assert.doesNotThrow(() => desserializar('abc', 8));
  assert.doesNotThrow(() => desserializar(42, 8));
  assert.doesNotThrow(() => desserializar({}, 8));
  assert.doesNotThrow(() => desserializar({ slots: 'nada' }, 8));
  assert.doesNotThrow(() => desserializar({ slots: [null, 5, 'x', [], { id: 'pilha' }] }, 8));

  for (const lixo of [null, undefined, 'abc', 42, {}, { slots: 'nada' }]) {
    const inv = desserializar(lixo, 8);
    assert.equal(inv.espacos, 8);
    assert.equal(inv.slots.length, 8);
    assert.ok(inv.slots.every((s) => s === null));
  }

  const inv = desserializar({
    espacos: 8,
    slots: [{ id: 'x', qtd: 5 }, { id: 'pilha', qtd: 999 }, { id: 'pilha', qtd: -1 }],
  });
  assert.ok(inv.slots.every((s) => s === null)); // todos inválidos, nada lançou erro

  // id válido, quantidade inválida: descarta só o slot ruim
  const misto = desserializar(
    { slots: [{ id: 'pano', qtd: 2 }, { id: 'kit', qtd: 1.5 }, { id: 'vela', qtd: 3 }, { id: 'balas', qtd: 16 }] },
    4,
  );
  assert.deepEqual(misto.slots[0], { id: 'pano', qtd: 2 });
  assert.equal(misto.slots[1], null); // qtd fracionária
  assert.deepEqual(misto.slots[2], { id: 'vela', qtd: 3 });
  assert.equal(misto.slots[3], null); // acima da pilha (15)

  // item de 2 espaços só cabe se o seguinte estiver livre
  const semEspaco = desserializar({ slots: [{ id: 'pano', qtd: 1 }, { id: 'espingarda', qtd: 1 }] }, 2);
  assert.deepEqual(semEspaco.slots[0], { id: 'pano', qtd: 1 });
  assert.equal(semEspaco.slots[1], null); // espingarda descartada, slot seguinte ocupado

  const comEspaco = desserializar({ slots: [{ id: 'pano', qtd: 1 }, { id: 'espingarda', qtd: 1 }, null] }, 3);
  assert.deepEqual(comEspaco.slots[1], { id: 'espingarda', qtd: 1 });
  assert.deepEqual(comEspaco.slots[2], { ref: 1 });

  // serializado antigo com ref explícito também é aceito (ref é descartado)
  const antigo = desserializar({ slots: [{ id: 'espingarda', qtd: 1 }, { ref: 0 }] }, 2);
  assert.deepEqual(antigo.slots[0], { id: 'espingarda', qtd: 1 });
  assert.deepEqual(antigo.slots[1], { ref: 0 });
});
