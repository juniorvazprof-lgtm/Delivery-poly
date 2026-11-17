// Refúgio: carteira, inventário guardado no aparelho, quadro de contratos e a loja do Seu Bento.
import { CFG } from './config.js';
import { TEXTOS, sortear } from './textos.js';
import { btcFmt, satsFmt } from './sats.js';
import { SOM } from './sons.js';

const ler = (k, padrao) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : padrao; } catch { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };
const n = (v, max = 1e9) => (Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : 0);

export function lerCarteira() { const c = ler('cabanas.carteira', {}); return { sats: n(c.sats), contratos: n(c.contratos), mortes: n(c.mortes) }; }
export const gravarCarteira = c => gravar('cabanas.carteira', c);
export function lerInventario() { const i = ler('cabanas.inventario', {}); return { pilhas: n(i.pilhas, 99), sinalizadores: n(i.sinalizadores, 99), cartuchos: n(i.cartuchos, 99), pentes: n(i.pentes, 99) }; }
export const gravarInventario = i => gravar('cabanas.inventario', i);

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CAMPO = { pilha: 'pilhas', sinalizador: 'sinalizadores', cartuchos: 'cartuchos', pente: 'pentes' };
const ICONE = { pilha: '▮', sinalizador: '✦', cartuchos: '⁞', pente: '▤' };

/** Mostra o refúgio; `escolher(contrato, inventario, carteira)` é chamado ao aceitar um contrato. */
export function mostrarRefugio(escolher) {
  const tela = $('telaContrato'), carteira = lerCarteira(), inv = lerInventario(), boas = sortear(TEXTOS.loja.boas_vindas);
  const desenhar = () => {
    tela.innerHTML = `<div class="papel refugio">
      <small>Refúgio · Posto 9</small><h1>Carteira: ${satsFmt(carteira.sats)}</h1><p class="btc">${btcFmt(carteira.sats)} · ${carteira.contratos} contrato(s) cumprido(s)</p>
      <div class="secao">Quadro de contratos</div>
      ${Object.values(CFG.contratos).map(c => `<button class="contrato" data-c="${c.id}"><b>${esc(c.tipo)} · ${esc(c.area)}</b><span>${esc(c.descricao(c.objetivo))}</span>
        <em>Risco ${esc(c.risco)} · <strong>${satsFmt(c.pagamento)}</strong></em></button>`).join('')}
      <div class="secao">Loja do Seu Bento</div><p class="bento">“${esc(boas)}”</p>
      <div class="loja">${Object.entries(CFG.loja).map(([k, it]) => `<button class="item" data-k="${k}" ${carteira.sats < it.preco ? 'disabled' : ''}>
        <i>${ICONE[k]}</i><b>${esc(it.nome)}</b><span>${esc(TEXTOS.loja.itens[k])}</span><em>${satsFmt(it.preco)} · você tem ${inv[CAMPO[k]]}</em></button>`).join('')}</div>
      <p class="regra">Todo contrato sai com 1 sinalizador de graça. Pilhas e sinalizadores que sobrarem voltam para cá.</p></div>`;
    tela.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const it = CFG.loja[b.dataset.k]; if (carteira.sats < it.preco) return;
      carteira.sats -= it.preco; inv[CAMPO[b.dataset.k]]++; gravarCarteira(carteira); gravarInventario(inv); SOM.iniciar(); SOM.moeda(); desenhar();
    });
    tela.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { SOM.iniciar(); briefing(CFG.contratos[b.dataset.c]); });
  };
  const briefing = c => {
    tela.innerHTML = `<div class="papel">
      <small>Quadro de contratos · Posto 9</small><h1>${esc(c.area)}</h1>
      <p class="brief">“${esc(sortear(c.id === 'recuperacao' ? TEXTOS.recuperacao : TEXTOS.briefing))}”</p>
      <dl><dt>Tipo</dt><dd>${esc(c.tipo)}</dd><dt>Objetivo</dt><dd>${esc(c.descricao(c.objetivo))}</dd><dt>Risco</dt><dd class="risco">${esc(c.risco)}</dd>
      <dt>Pagamento</dt><dd class="sats">${satsFmt(c.pagamento)}<br><span>${btcFmt(c.pagamento)}</span></dd>
      <dt>Levando</dt><dd>${inv.pilhas} pilha(s) extra · ${inv.sinalizadores + CFG.kit.sinalizadores} sinalizador(es)${inv.cartuchos ? ` · +${inv.cartuchos * 12} cartuchos` : ''}${inv.pentes ? ` · +${inv.pentes * 24} balas` : ''}</dd></dl>
      <p class="regra">Cumprido o objetivo, o sinal de extração acende. Quanto mais você demorar para entrar nele, mais o saque vale, e mais zumbis chegam.</p>
      <button id="aceitar" class="btn">Aceitar contrato</button><button id="voltarRef" class="btn sec">Voltar ao refúgio</button></div>`;
    $('aceitar').onclick = () => { tela.hidden = true; document.body.classList.remove('emTela'); escolher(c, inv, carteira); };
    $('voltarRef').onclick = desenhar;
  };
  desenhar(); tela.hidden = false; $('telaFim').hidden = true; document.body.classList.add('emTela');
  return { briefing };
}
