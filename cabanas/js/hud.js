// Interface: objetivo, vida, munição, bateria, sinalizadores, saque e ganância, seta para a extração, rádio e a tela de fim.
import { CFG } from './config.js';
import { btcFmt, satsFmt } from './sats.js';
import { SOM } from './sons.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function criarHud() {
  let radioT = 0, ganhoT = 0;
  const h = {
    fim(r) {
      const t = $('telaFim');
      t.innerHTML = r.venceu ? `<div class="papel ok"><small>Extração concluída</small><h1>Pagamento recebido</h1><p class="brief">“${esc(r.frase)}”</p>
        <dl><dt>Contrato</dt><dd>${satsFmt(r.contrato)}</dd><dt>Saque</dt><dd>${satsFmt(r.saque)}${r.mult > 1 ? ` <b class="mult">×${r.mult.toFixed(2).replace('.', ',')}</b>` : ''}${r.carteiras ? ` · ${r.carteiras} carteira(s) fria(s)` : ''}</dd>
        <dt>Total</dt><dd class="sats">${satsFmt(r.total)}<br><span>${btcFmt(r.total)}</span></dd><dt>Abates</dt><dd>${r.abates} em ${mmss(r.tempo)}</dd></dl>
        <p class="carteira">Carteira: <b>${satsFmt(r.carteira)}</b></p><button id="denovo" class="btn">Voltar ao refúgio</button></div>`
        : `<div class="papel mal"><small>Você caiu</small><h1>Saque perdido</h1><p class="brief">“${esc(r.frase)}”</p>
        <dl><dt>Perdido</dt><dd class="sats">${satsFmt(r.perdido)}</dd><dt>Abates</dt><dd>${r.abates} em ${mmss(r.tempo)}</dd></dl>
        <p class="regra">Seu equipamento fica. Só o saque desta missão foi perdido.</p>
        <p class="carteira">Carteira: <b>${satsFmt(r.carteira)}</b></p><button id="denovo" class="btn">Voltar ao refúgio</button></div>`;
      setTimeout(() => { t.hidden = false; document.body.classList.add('emTela'); }, r.venceu ? 1400 : 1100);
    },
    somBotao() { const b = $('somBtn'); const pinta = () => (b.textContent = SOM.ligado ? '🔊' : '🔇'); pinta(); b.onclick = () => { SOM.iniciar(); SOM.alternar(); pinta(); }; addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm') setTimeout(pinta); }); },
    aoRecomecar(fn) { document.addEventListener('click', e => { if (e.target.id === 'denovo') { $('telaFim').hidden = true; fn(); } }); },
    radio(txt, seg = 3.5, quem = 'Kátia') { const r = $('radio'); r.textContent = txt; r.dataset.quem = quem; r.classList.add('on'); radioT = seg; },
    ganho(tipo, sats, municao = 0) {
      const g = $('ganho'); g.textContent = tipo === 'municao' ? `+${municao}` : `+${satsFmt(sats)}${tipo === 'carteira' ? ' · carteira fria!' : ''}${municao ? ` · +${municao}` : ''}`;
      g.className = 'on ' + tipo; ganhoT = 1.6;
    },
    progresso(frac, txt) { const b = $('hold'); if (frac < 0) { b.hidden = true; b.classList.remove('busca'); return; } b.hidden = false; b.classList.add('busca'); b.classList.remove('fora'); $('holdFill').style.width = Math.min(1, frac) * 100 + '%'; $('holdTxt').textContent = txt; },
    segurar(frac, dentro, total = CFG.extracao.segurar) { $('hold').classList.remove('busca'); const b = $('hold'); b.hidden = false; b.classList.toggle('fora', !dentro); $('holdFill').style.width = frac * 100 + '%';
      $('holdTxt').textContent = dentro ? `Segure o ponto · ${Math.ceil(total * (1 - frac))} s` : 'Volte ao sinal de extração'; },
    quadro(dt, { m, heroi, arma, sinal, render, mundo }) {
      $('hpfill').style.width = Math.max(0, heroi.vida) / CFG.heroi.vida * 100 + '%';
      $('obj').textContent = m.estado === 'objetivo' ? (m.C.id === 'limpeza' ? `☠ ${m.abates}/${m.C.objetivo}` : `HD · ${m.vasculhadas.size}/${mundo.caixas.length} cabanas`)
        : m.estado === 'ganancia' ? `Ganância ×${m.mult.toFixed(2).replace('.', ',')}` : m.estado === 'extracao' ? 'Extração!' : '';
      // bateria da lanterna (barra no botão) e sinalizadores
      const lamp = $('lamp'), bat = Math.max(0, heroi.bateria);
      $('batFill').style.width = bat * 100 + '%'; lamp.classList.toggle('fraca', bat < CFG.lanterna.fraca); lamp.classList.toggle('sem', bat <= 0 && heroi.pilhas <= 0);
      $('pilhas').textContent = heroi.pilhas ? `+${heroi.pilhas}` : '';
      $('flare').querySelector('b').textContent = heroi.sinalizadores; $('flare').disabled = heroi.sinalizadores <= 0;
      $('furtivo').hidden = !heroi.devagar;
      $('ammo').innerHTML = `<small>${arma.cfg.nome}</small>` + (arma.recarregando > 0 ? `<b class="rec">↻</b> | ${arma.reserva}` : `<b>${arma.pente}</b> | ${arma.reserva}`);
      $('ammo').classList.toggle('vazio', arma.pente === 0 && arma.reserva === 0);
      $('loot').textContent = m.saque ? `Saque: ${satsFmt(m.saque)}${m.mult > 1 ? ` ×${m.mult.toFixed(2).replace('.', ',')}` : ''}` : '';
      if (m.estado !== 'extracao' && !$('hold').classList.contains('busca')) $('hold').hidden = true;
      // seta na borda da tela apontando para o sinal de extração
      const seta = $('seta');
      if (m.estado === 'extracao' || m.estado === 'ganancia') {
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
