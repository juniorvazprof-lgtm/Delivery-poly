// Testes do sistema de idiomas: `node --test tests/i18n.test.mjs`
import test from 'node:test';
import assert from 'node:assert/strict';

import en from '../js/lang/en.js';
import pt from '../js/lang/pt.js';
import { ITENS } from '../js/itens.js';
import { t, idioma, setIdioma, lista } from '../js/i18n.js';

const DICS = { en, pt };

// Todas as strings de um dicionário, achatando os arrays de falas.
function todasAsStrings(dic) {
  const saida = [];
  for (const valor of Object.values(dic)) {
    if (Array.isArray(valor)) saida.push(...valor);
    else saida.push(valor);
  }
  return saida;
}

test('idioma padrão segue navigator.language', () => {
  const nav = String(globalThis.navigator?.language || '').toLowerCase();
  assert.equal(idioma(), nav.startsWith('pt') ? 'pt' : 'en');
});

test('en e pt têm exatamente o mesmo conjunto de chaves', () => {
  const kEn = Object.keys(en).sort();
  const kPt = Object.keys(pt).sort();
  assert.deepEqual(kPt, kEn);
});

test('nenhuma string vazia e arrays de 4 a 8 itens', () => {
  for (const [cod, dic] of Object.entries(DICS)) {
    for (const [chave, valor] of Object.entries(dic)) {
      if (Array.isArray(valor)) {
        assert.ok(valor.length >= 4 && valor.length <= 8, `${cod}.${chave}: array com ${valor.length}`);
        for (const fala of valor) {
          assert.equal(typeof fala, 'string', `${cod}.${chave}: fala não é string`);
          assert.ok(fala.trim().length > 0, `${cod}.${chave}: fala vazia`);
        }
      } else {
        assert.equal(typeof valor, 'string', `${cod}.${chave}: valor não é string`);
        assert.ok(valor.trim().length > 0, `${cod}.${chave}: string vazia`);
      }
    }
  }
});

test('descrições de item têm no máximo 70 caracteres', () => {
  for (const [cod, dic] of Object.entries(DICS)) {
    for (const chave of Object.keys(dic)) {
      if (!chave.endsWith('.desc')) continue;
      assert.ok(dic[chave].length <= 70, `${cod}.${chave} tem ${dic[chave].length} caracteres`);
    }
  }
});

test('todo id de ITENS tem nome e descrição nos dois idiomas', () => {
  for (const cod of ['en', 'pt']) {
    const dic = DICS[cod];
    for (const id of Object.keys(ITENS)) {
      for (const chave of [`item.${id}`, `item.${id}.desc`]) {
        assert.ok(Object.hasOwn(dic, chave), `${cod}: falta ${chave}`);
        assert.ok(dic[chave].trim().length > 0, `${cod}: ${chave} vazia`);
      }
    }
  }
});

test('t substitui variáveis e respeita o idioma atual', () => {
  setIdioma('en');
  assert.equal(t('ui.dia', { n: 3 }), 'Day 3');
  setIdioma('pt');
  assert.equal(t('ui.dia', { n: 3 }), 'Dia 3');
  assert.equal(t('ui.pegou', { qtd: 2, item: 'Shells' }), '+2 Shells');
});

test('setIdioma("pt") muda t()', () => {
  setIdioma('en');
  const antes = t('ui.comecar');
  setIdioma('pt');
  assert.equal(idioma(), 'pt');
  assert.notEqual(t('ui.comecar'), antes);
  assert.equal(t('ui.comecar'), 'Começar');
  setIdioma('en');
});

test('idioma inválido é ignorado', () => {
  setIdioma('en');
  setIdioma('xx');
  assert.equal(idioma(), 'en');
});

test('chave inexistente devolve a própria chave', () => {
  setIdioma('en');
  assert.equal(t('nao.existe'), 'nao.existe');
  setIdioma('pt');
  assert.equal(t('nao.existe'), 'nao.existe');
  setIdioma('en');
});

test('lista() devolve arrays de falas e [] para chaves sem lista', () => {
  setIdioma('en');
  const dicas = lista('fala.dicas');
  assert.ok(Array.isArray(dicas) && dicas.length >= 4);
  assert.deepEqual(lista('ui.titulo'), []);
  setIdioma('pt');
  assert.ok(lista('fala.morte').length >= 4);
  assert.deepEqual(lista('nao.existe'), []);
  setIdioma('en');
});

test('nenhum texto fala de dinheiro, contrato, extração, zumbi ou Kátia', () => {
  const proibidos = [
    'sats',
    'satoshi',
    'kátia',
    'katia',
    'zumbi',
    'zombie',
    'contrato',
    'contract',
    'extração',
    'extracao',
    'extraction',
  ];
  for (const [cod, dic] of Object.entries(DICS)) {
    for (const texto of todasAsStrings(dic)) {
      const baixo = texto.toLowerCase();
      for (const proibido of proibidos) {
        assert.ok(!baixo.includes(proibido), `${cod}: "${texto}" menciona "${proibido}"`);
      }
    }
  }
});
