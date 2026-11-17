// Sistema de idiomas: inglês é o padrão, português é opcional.
// Funciona sem window/localStorage (usa globalThis), para rodar em Node nos testes.
import en from './lang/en.js';
import pt from './lang/pt.js';

const DICIONARIOS = { en, pt };
const CHAVE_SALVA = 'cabanas.idioma';
const PADRAO = 'en';

// localStorage pode não existir (Node, modo privado, cookies bloqueados).
function armazenamento() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

// Padrão pelo navegador: pt se navigator.language começa com 'pt'.
function idiomaDoNavegador() {
  try {
    const lang = String(globalThis.navigator?.language || '').toLowerCase();
    return lang.startsWith('pt') ? 'pt' : PADRAO;
  } catch {
    return PADRAO;
  }
}

function lerSalvo() {
  const ls = armazenamento();
  if (!ls) return null;
  try {
    const cod = ls.getItem(CHAVE_SALVA);
    return cod && DICIONARIOS[cod] ? cod : null;
  } catch {
    return null;
  }
}

function gravar(cod) {
  const ls = armazenamento();
  if (!ls) return;
  try {
    ls.setItem(CHAVE_SALVA, cod);
  } catch {
    // sem espaço: segue sem salvar
  }
}

let atual = lerSalvo() || idiomaDoNavegador();

// Valor cru de uma chave num idioma, ou undefined.
function bruto(chave, cod) {
  const d = DICIONARIOS[cod];
  if (!d) return undefined;
  return Object.prototype.hasOwnProperty.call(d, chave) ? d[chave] : undefined;
}

// Valor no idioma atual, caindo para o inglês.
function valor(chave) {
  const v = bruto(chave, atual);
  return v !== undefined ? v : bruto(chave, PADRAO);
}

export function idioma() {
  return atual;
}

// Troca o idioma (ignora códigos desconhecidos) e avisa quem escuta.
export function setIdioma(cod) {
  if (!DICIONARIOS[cod]) return atual;
  atual = cod;
  gravar(cod);
  try {
    globalThis.dispatchEvent?.(new Event('idioma'));
  } catch {
    // sem Event (ambiente antigo): ignora
  }
  return atual;
}

// Texto traduzido; {nome} é trocado por vars.nome. Chave ausente → a própria chave.
export function t(chave, vars = {}) {
  const v = valor(chave);
  if (typeof v !== 'string') return chave;
  if (!vars) return v;
  return v.replace(/\{(\w+)\}/g, (todo, nome) => {
    const troca = vars[nome];
    return troca === undefined || troca === null ? todo : String(troca);
  });
}

// Listas de falas sorteadas: devolve sempre um array (mesma regra de fallback).
export function lista(chave) {
  const v = bruto(chave, atual);
  if (Array.isArray(v)) return v.slice();
  const base = bruto(chave, PADRAO);
  return Array.isArray(base) ? base.slice() : [];
}
