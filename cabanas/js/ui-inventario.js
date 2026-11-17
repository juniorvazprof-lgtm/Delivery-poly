// Tela do inventário (8 espaços) e do baú (24 espaços). Só interface:
// a lógica vem de inventario.js; itens e textos de itens.js / i18n.js.
import { t } from './i18n.js';
import { ITENS } from './itens.js';
import { combinar as combinarLogica, mover as moverLogica, remover as removerLogica } from './inventario.js';

// Cor de fundo da célula por tipo de item (papel/pixel).
const CORES = {
  arma: '#c99a5c',
  municao: '#d8c38f',
  cura: '#e8b0a0',
  luz: '#f3e6c4',
  material: '#c5d3e8',
  chave: '#a8cf78',
  doc: '#fffbe6',
};

const COR_PADRAO = '#e9d9b0';
const MSG_MS = 2500;

// estado da tela aberta: { ctx, sel, selBau, comb, msg, timer }
let estado = null;
let raiz = null;

// ---------- utilidades ----------

function ehRef(slot) {
  return !!slot && typeof slot === 'object' && slot.ref !== undefined;
}

function nomeDe(id) {
  const it = ITENS[id];
  return it ? t(it.nome) : String(id);
}

function descDe(id) {
  const it = ITENS[id];
  return it ? t(it.desc) : '';
}

function el(tag, classe, texto) {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texto !== undefined) n.textContent = texto;
  return n;
}

// botão no estilo papel; acao vira data-acao (usado pelos testes)
function botao(texto, acao, aoClicar) {
  const b = el('button', 'inv-btn', texto);
  b.type = 'button';
  b.dataset.acao = acao;
  b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    aoClicar();
  });
  return b;
}

// ---------- estado público ----------

export const inventarioAberto = () => !!(raiz && !raiz.hidden);

// ---------- raiz / abertura / fechamento ----------

function criarRaiz() {
  let sec = document.getElementById('telaInv');
  if (!sec) {
    sec = el('section', 'inv-tela');
    sec.id = 'telaInv';
    sec.hidden = true;
    document.body.appendChild(sec);
  }
  return sec;
}

function aoTecla(ev) {
  if (!estado) return;
  if (ev.key === 'Escape' || ev.key === 'Esc') {
    ev.preventDefault();
    fecharInventario();
  }
}

export function abrirInventario(ctx) {
  if (!ctx || !ctx.inv || !Array.isArray(ctx.inv.slots)) return;
  if (estado) fecharInventario();
  estado = { ctx, sel: null, selBau: null, comb: null, msg: '', timer: 0 };
  raiz = criarRaiz();
  raiz.hidden = false;
  raiz.classList.add('inv-aberto');
  document.addEventListener('keydown', aoTecla);
  render();
}

export function fecharInventario() {
  document.removeEventListener('keydown', aoTecla);
  const cb = estado && estado.ctx ? estado.ctx.aoFechar : null;
  if (estado && estado.timer) clearTimeout(estado.timer);
  estado = null;
  if (raiz) {
    raiz.hidden = true;
    raiz.classList.remove('inv-aberto');
    raiz.replaceChildren();
  }
  if (typeof cb === 'function') {
    try {
      cb();
    } catch {
      // callback do jogo quebrou: não derruba a tela
    }
  }
}

// ---------- mensagens ----------

function mensagem(txt) {
  if (!estado) return;
  estado.msg = String(txt || '');
  if (estado.timer) clearTimeout(estado.timer);
  if (estado.msg) {
    estado.timer = setTimeout(() => {
      if (!estado) return;
      estado.msg = '';
      estado.timer = 0;
      render();
    }, MSG_MS);
  }
}

// ---------- ações ----------

function tocarSlot(i) {
  const ctx = estado.ctx;
  const slot = ctx.inv.slots[i];
  if (!slot || ehRef(slot)) return;

  // modo combinar: o próximo item tocado é o par
  if (estado.comb !== null) {
    const alvo = estado.comb;
    estado.comb = null;
    if (alvo === i) {
      estado.sel = i;
      render();
      return;
    }
    const res = combinarLogica(ctx.inv, alvo, i);
    if (res) {
      estado.sel = null;
      mensagem(t('ui.inv.combinou', { item: nomeDe(res) }));
    } else {
      estado.sel = i;
      mensagem(t('ui.inv.nada'));
    }
    render();
    return;
  }

  estado.selBau = null;
  estado.sel = estado.sel === i ? null : i;
  render();
}

function tocarBau(i) {
  const ctx = estado.ctx;
  if (!ctx.bau) return;
  const slot = ctx.bau.slots[i];
  if (!slot || ehRef(slot)) return;
  estado.comb = null;
  estado.sel = null;
  estado.selBau = estado.selBau === i ? null : i;
  render();
}

function equiparItem(id) {
  const ctx = estado.ctx;
  if (typeof ctx.equipar === 'function') ctx.equipar(id);
  mensagem(nomeDe(id));
  render();
}

function usarItem(i) {
  const ctx = estado.ctx;
  let r = null;
  if (typeof ctx.usar === 'function') r = ctx.usar(i);
  if (typeof r === 'string' && r) mensagem(r);
  render();
}

function largarItem(i) {
  const ctx = estado.ctx;
  const slot = ctx.inv.slots[i];
  if (!slot || ehRef(slot)) return;
  const it = ITENS[slot.id];
  if (!it || it.tipo === 'chave' || it.tipo === 'doc') return; // não pode largar
  removerLogica(ctx.inv, slot.id, Math.max(1, Math.floor(Number(slot.qtd)) || 1));
  estado.sel = null;
  estado.comb = null;
  render();
}

function guardarItem(i) {
  const ctx = estado.ctx;
  if (!ctx.bau) return;
  const tudo = moverLogica(ctx.inv, i, ctx.bau);
  estado.sel = null;
  estado.comb = null;
  if (!tudo) mensagem(t('ui.inv.cheio'));
  render();
}

function pegarDoBau(i) {
  const ctx = estado.ctx;
  if (!ctx.bau) return;
  const tudo = moverLogica(ctx.bau, i, ctx.inv);
  estado.selBau = null;
  if (!tudo) mensagem(t('ui.inv.cheio'));
  render();
}

// ---------- células ----------

function celulaVazia() {
  const cel = el('div', 'inv-celula inv-vazia');
  cel.appendChild(el('span', 'inv-vazio-txt', t('ui.inv.vazio')));
  return cel;
}

function celulaItem(inv, i, slot, tipo) {
  const ctx = estado.ctx;
  const it = ITENS[slot.id];
  const cel = el('div', 'inv-celula inv-item');
  cel.dataset.slot = String(i);
  cel.dataset.id = slot.id;
  cel.dataset.tipo = (it && it.tipo) || 'material';
  cel.style.background = CORES[(it && it.tipo) || ''] || COR_PADRAO;

  if (it && it.espacos > 1) {
    cel.classList.add('inv-celula-dupla');
    cel.style.gridColumn = 'span 2'; // item de 2 espaços ocupa 2 colunas
  }
  if (tipo === 'inv' && estado.sel === i) cel.classList.add('inv-selecionado');
  if (tipo === 'bau' && estado.selBau === i) cel.classList.add('inv-selecionado');
  if (tipo === 'inv' && estado.comb === i) cel.classList.add('inv-combinando');

  cel.appendChild(el('span', 'inv-icone', (it && it.icone) || '?'));

  const qtd = Math.floor(Number(slot.qtd)) || 0;
  if (qtd > 1) cel.appendChild(el('span', 'inv-qtd', String(qtd)));

  cel.appendChild(el('span', 'inv-nome', nomeDe(slot.id)));

  // marca da arma equipada
  if (tipo === 'inv' && it && it.tipo === 'arma' && ctx.equipada === slot.id) {
    const marca = el('span', 'inv-marca', '▶');
    marca.title = t('ui.inv.equipar');
    cel.appendChild(marca);
  }

  cel.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (tipo === 'bau') tocarBau(i);
    else tocarSlot(i);
  });
  return cel;
}

function criarGrade(inv, tipo) {
  const grade = el('div', 'inv-grade ' + (tipo === 'bau' ? 'inv-grade-bau' : 'inv-grade-inv'));
  grade.dataset.grade = tipo;
  for (let i = 0; i < inv.espacos; i++) {
    const slot = inv.slots[i];
    if (slot && ehRef(slot)) {
      // 2º espaço de um item duplo: não é desenhado
      const ref = el('div', 'inv-celula inv-celula-ref');
      ref.dataset.slot = String(i);
      ref.hidden = true;
      grade.appendChild(ref);
      continue;
    }
    if (!slot) {
      grade.appendChild(celulaVazia());
      continue;
    }
    grade.appendChild(celulaItem(inv, i, slot, tipo));
  }
  return grade;
}

// ---------- detalhe do item selecionado ----------

function blocoTexto(id) {
  const cx = el('div', 'inv-info');
  cx.appendChild(el('strong', 'inv-info-nome', nomeDe(id)));
  cx.appendChild(el('p', 'inv-info-desc', descDe(id)));
  return cx;
}

function detalheInventario() {
  const ctx = estado.ctx;
  const cx = el('div', 'inv-detalhe');
  const i = estado.sel;
  const slot = i === null ? null : ctx.inv.slots[i];
  if (!slot || ehRef(slot)) return cx;

  const it = ITENS[slot.id];
  const tipo = it ? it.tipo : 'material';
  cx.appendChild(blocoTexto(slot.id));

  const acoes = el('div', 'inv-acoes');

  if (tipo === 'arma') {
    acoes.appendChild(botao(t('ui.inv.equipar'), 'equipar', () => equiparItem(slot.id)));
  }
  if (tipo === 'cura' || tipo === 'luz') {
    acoes.appendChild(botao(t('ui.inv.usar'), 'usar', () => usarItem(i)));
  }
  acoes.appendChild(
    botao(t('ui.inv.combinar'), 'combinar', () => {
      estado.comb = i;
      estado.sel = i;
      render();
    }),
  );
  if (tipo !== 'chave' && tipo !== 'doc') {
    acoes.appendChild(botao(t('ui.inv.largar'), 'largar', () => largarItem(i)));
  }
  if (ctx.bau) {
    acoes.appendChild(botao(t('ui.inv.guardar'), 'guardar', () => guardarItem(i)));
  }

  cx.appendChild(acoes);
  return cx;
}

function detalheBau() {
  const ctx = estado.ctx;
  const cx = el('div', 'inv-detalhe inv-detalhe-bau');
  const i = estado.selBau;
  const slot = i === null || !ctx.bau ? null : ctx.bau.slots[i];
  if (!slot || ehRef(slot)) return cx;

  cx.appendChild(blocoTexto(slot.id));
  const acoes = el('div', 'inv-acoes');
  acoes.appendChild(botao(t('ui.inv.pegar'), 'pegar', () => pegarDoBau(i)));
  cx.appendChild(acoes);
  return cx;
}

// ---------- desenho ----------

function render() {
  if (!estado || !raiz) return;
  const ctx = estado.ctx;

  raiz.onclick = (ev) => {
    if (ev.target === raiz) fecharInventario(); // tocou fora do painel
  };

  const painel = el('div', 'inv-painel');
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-label', t('ui.inv.titulo'));

  const topo = el('div', 'inv-topo');
  topo.appendChild(el('h2', 'inv-titulo', t('ui.inv.titulo')));
  topo.appendChild(botao('×', 'fechar', () => fecharInventario()));
  painel.appendChild(topo);

  painel.appendChild(criarGrade(ctx.inv, 'inv'));
  painel.appendChild(detalheInventario());

  if (ctx.bau) {
    const secao = el('div', 'inv-secao-bau');
    secao.appendChild(el('h3', 'inv-subtitulo', t('ui.abrigo.bau')));
    secao.appendChild(criarGrade(ctx.bau, 'bau'));
    secao.appendChild(detalheBau());
    painel.appendChild(secao);
  }

  painel.appendChild(el('div', 'inv-msg', estado.msg || ''));

  raiz.replaceChildren(painel);
}

// redesenha se o idioma mudar com a tela aberta
if (typeof globalThis.addEventListener === 'function') {
  globalThis.addEventListener('idioma', () => {
    if (estado) render();
  });
}
