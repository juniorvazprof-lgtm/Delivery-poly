// Interface: objetivo, vida, munição, saque, seta para a extração, rádio e as telas de contrato e de fim.
import { CFG } from './config.js';
import { TEXTOS, sortear } from './textos.js';
import { btcFmt, satsFmt } from './sats.js';
import { SOM } from './sons.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function criarHud() {
  let radioT = 0, ganhoT = 0;
  const h = {
    contrato(carteira, aceitar) {
      const C = CFG.contrato;
      $('telaContrato').innerHTML = `<div class="papel">
        <small>Quadro de contratos · Posto 9</small>
        <h1>${esc(C.area)}</h1>
        <p class="brief">“${esc(sortear(TEXTOS.briefing))}”</p>
        <dl><dt>Tipo</dt><dd>${esc(C.tipo)}</dd><dt>Objetivo</dt><dd>Abater ${C.objetivo} zumbis e extrair</dd><dt>Risco</dt><dd class="risco">${esc(C.risco)}</dd>
        <dt>Pagamento</dt><dd class="sats">${satsFmt(C.pagamento)}<br><span>${btcFmt(C.pagamento)}</span></dd></dl>
        <p class="regra">O saque que você pegar só é pago se você chegar à extração.</p>
        <button id="aceitar" class="btn">Aceitar contrato</button>
        <p class="carteira">Sua carteira: <b>${satsFmt(carteira.sats)}</b> · ${carteira.contratos} contrato(s) cumprido(s)</p></div>`;
      $('telaContrato').hidden = false; $('telaFim').hidden = true; document.body.classList.add('emTela');
      $('aceitar').onclick = () => { SOM.iniciar(); $('telaContrato').hidden = true; document.body.classList.remove('emTela'); aceitar(); };
    },
    fim(r) {
      const t = $('telaFim');
      t.innerHTML = r.venceu ? `<div class="papel ok"><small>Extração concluída</small><h1>Pagamento recebido</h1><p class="brief">“${esc(r.frase)}”</p>
        <dl><dt>Contrato</dt><dd>${satsFmt(r.contrato)}</dd><dt>Saque</dt><dd>${satsFmt(r.saque)}${r.carteiras ? ` · ${r.carteiras} carteira(s) fria(s)` : ''}</dd>
        <dt>Total</dt><dd class="sats">${satsFmt(r.total)}<br><span>${btcFmt(r.total)}</span></dd><dt>Abates</dt><dd>${r.abates} em ${mmss(r.tempo)}</dd></dl>
        <p class="carteira">Carteira: <b>${satsFmt(r.carteira)}</b></p><button id="denovo" class="btn">Novo contrato</button></div>`
        : `<div class="papel mal"><small>Você caiu</small><h1>Saque perdido</h1><p class="brief">“${esc(r.frase)}”</p>
        <dl><dt>Perdido</dt><dd class="sats">${satsFmt(r.perdido)}</dd><dt>Abates</dt><dd>${r.abates} em ${mmss(r.tempo)}</dd></dl>
        <p class="regra">Seu equipamento fica. Só o saque desta missão foi perdido.</p>
        <p class="carteira">Carteira: <b>${satsFmt(r.carteira)}</b></p><button id="denovo" class="btn">Tentar de novo</button></div>`;
      setTimeout(() => { t.hidden = false; document.body.classList.add('emTela'); }, r.venceu ? 1400 : 1100);
    },
    somBotao() { const b = $('somBtn'); const pinta = () => (b.textContent = SOM.ligado ? '🔊' : '🔇'); pinta(); b.onclick = () => { SOM.iniciar(); SOM.alternar(); pinta(); }; addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm') setTimeout(pinta); }); },
    aoRecomecar(fn) { document.addEventListener('click', e => { if (e.target.id === 'denovo') { $('telaFim').hidden = true; fn(); } }); },
    radio(txt, seg = 3.5) { const r = $('radio'); r.textContent = txt; r.classList.add('on'); radioT = seg; },
    ganho(tipo, sats, municao = 0) {
      const g = $('ganho'); g.textContent = tipo === 'municao' ? `+${municao}` : `+${satsFmt(sats)}${tipo === 'carteira' ? ' · carteira fria!' : ''}${municao ? ` · +${municao}` : ''}`;
      g.className = 'on ' + tipo; ganhoT = 1.6;
    },
    segurar(frac, dentro) { const b = $('hold'); b.hidden = false; b.classList.toggle('fora', !dentro); $('holdFill').style.width = frac * 100 + '%';
      $('holdTxt').textContent = dentro ? `Segure o ponto · ${Math.ceil(CFG.extracao.segurar * (1 - frac))} s` : 'Volte ao sinal de extração'; },
    quadro(dt, { m, heroi, arma, sinal, render }) {
      $('hpfill').style.width = Math.max(0, heroi.vida) / CFG.heroi.vida * 100 + '%';
      $('obj').textContent = m.estado === 'limpeza' ? `☠ ${m.abates}/${CFG.contrato.objetivo}` : m.estado === 'extracao' ? 'Extração!' : '';
      $('ammo').innerHTML = `<small>${arma.cfg.nome}</small>` + (arma.recarregando > 0 ? `<b class="rec">↻</b> | ${arma.reserva}` : `<b>${arma.pente}</b> | ${arma.reserva}`);
      $('ammo').classList.toggle('vazio', arma.pente === 0 && arma.reserva === 0);
      $('loot').textContent = m.saque ? `Saque: ${satsFmt(m.saque)}` : '';
      if (m.estado !== 'extracao') $('hold').hidden = true;
      // seta na borda da tela apontando para o sinal de extração
      const seta = $('seta');
      if (m.estado === 'extracao') {
        const [x, y] = render.naTela(sinal.position.clone().setY(0.5)), cx = innerWidth / 2, cy = innerHeight / 2, dx = x - cx, dy = y - cy;
        const dentroTela = x > 40 && x < innerWidth - 40 && y > 70 && y < innerHeight - 160;
        const k = Math.min((innerWidth / 2 - 36) / Math.abs(dx || 1), (innerHeight / 2 - 90) / Math.abs(dy || 1), 1);
        seta.hidden = false; seta.style.transform = `translate(${dentroTela ? x : cx + dx * k}px, ${dentroTela ? y - 34 : cy + dy * k}px) rotate(${Math.atan2(dy, dx)}rad)`;
        seta.classList.toggle('perto', dentroTela);
        $('dist').textContent = `${Math.round(heroi.g.position.distanceTo(sinal.position))} m`;
      } else seta.hidden = true;
      if (radioT > 0 && (radioT -= dt) <= 0) $('radio').classList.remove('on');
      if (ganhoT > 0 && (ganhoT -= dt) <= 0) $('ganho').className = '';
    },
  };
  return h;
}
