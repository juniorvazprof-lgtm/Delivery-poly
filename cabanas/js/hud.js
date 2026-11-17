// Interface: vida, munição, bateria, sinalizadores, rádio, aviso de ganho e a tela de morte.
import { CFG } from './config.js';
import { SOM } from './sons.js';

const $ = id => document.getElementById(id);
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function criarHud() {
  let radioT = 0, ganhoT = 0;
  const h = {
    /** Tela de morte: só o tempo e os abates da sessão. */
    fim(r) {
      const t = $('telaFim');
      t.innerHTML = `<div class="papel mal"><small>Fim da linha</small><h1>You died</h1>
        <dl><dt>Tempo</dt><dd>${mmss(r.tempo)}</dd><dt>Abates</dt><dd>${r.abates}</dd></dl>
        <button id="denovo" class="btn">Try again</button></div>`;
      setTimeout(() => { t.hidden = false; document.body.classList.add('emTela'); }, 1100);
    },
    somBotao() { const b = $('somBtn'); const pinta = () => (b.textContent = SOM.ligado ? '🔊' : '🔇'); pinta(); b.onclick = () => { SOM.iniciar(); SOM.alternar(); pinta(); }; addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm') setTimeout(pinta); }); },
    aoRecomecar(fn) { document.addEventListener('click', e => { if (e.target.id === 'denovo') { $('telaFim').hidden = true; fn(); } }); },
    radio(txt, seg = 3.5, quem = 'Kátia') { const r = $('radio'); r.textContent = txt; r.dataset.quem = quem; r.classList.add('on'); radioT = seg; },
    /** Aviso rápido no centro da tela ("+8 cartuchos · +14 balas", "pilha nova"). */
    ganho(txt) { const g = $('ganho'); g.textContent = txt; g.className = 'on'; ganhoT = 1.6; },
    /** Barra de progresso (hoje só usada por telas antigas; some se a barra não existir). */
    progresso(frac, txt) {
      const b = $('hold'); if (!b) return;
      if (frac < 0) { b.hidden = true; return; }
      b.hidden = false; $('holdFill').style.width = Math.min(1, frac) * 100 + '%'; $('holdTxt').textContent = txt;
    },
    quadro(dt, { heroi, arma }) {
      $('hpfill').style.width = Math.max(0, heroi.vida) / CFG.heroi.vida * 100 + '%';
      // bateria da lanterna (barra no botão) e sinalizadores
      const lamp = $('lamp'), bat = Math.max(0, heroi.bateria);
      $('batFill').style.width = bat * 100 + '%'; lamp.classList.toggle('fraca', bat < CFG.lanterna.fraca); lamp.classList.toggle('sem', bat <= 0 && heroi.pilhas <= 0);
      $('pilhas').textContent = heroi.pilhas ? `+${heroi.pilhas}` : '';
      $('flare').querySelector('b').textContent = heroi.sinalizadores; $('flare').disabled = heroi.sinalizadores <= 0;
      $('furtivo').hidden = !heroi.devagar;
      $('ammo').innerHTML = `<small>${arma.cfg.nome}</small>` + (arma.recarregando > 0 ? `<b class="rec">↻</b> | ${arma.reserva}` : `<b>${arma.pente}</b> | ${arma.reserva}`);
      $('ammo').classList.toggle('vazio', arma.pente === 0 && arma.reserva === 0);
      if (radioT > 0 && (radioT -= dt) <= 0) $('radio').classList.remove('on');
      if (ganhoT > 0 && (ganhoT -= dt) <= 0) $('ganho').className = '';
    },
  };
  return h;
}
