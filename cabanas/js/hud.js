// Interface: vida, munição, bateria, velas, relógio do dia, aviso de abrigo, rádio, avisos e as telas de abrigo e de morte.
// Todos os textos vêm do i18n (inglês por padrão, português opcional). O DOM é montado sem innerHTML com dados.
import { CFG } from './config.js';
import { SOM } from './sons.js';
import { t, lista } from './i18n.js';

const $ = id => document.getElementById(id);
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function botao(txt, fn, cls = 'btn') { const b = el('button', cls, txt); b.onclick = fn; return b; }

export function criarHud() {
  let radioT = 0, ganhoT = 0, avisoT = 0;
  const h = {
    t,
    /** Uma fala sorteada de uma lista do dicionário. */
    fala(chave) { const l = lista(chave); return l.length ? l[Math.floor(Math.random() * l.length)] : ''; },
    /** Tela de morte: voltar ao último abrigo ou recomeçar. */
    fim(r) {
      const tela = $('telaFim'); tela.textContent = '';
      const p = el('div', 'papel mal'); tela.append(p);
      p.append(el('small', '', 'Pine Hollow'), el('h1', '', t('ui.morte.titulo')), el('p', 'brief', `“${h.fala('fala.morte')}”`));
      const dl = el('dl'); dl.append(el('dt', '', t('ui.morte.tempo')), el('dd', '', mmss(r.tempo)), el('dt', '', t('ui.morte.abates')), el('dd', '', String(r.abates))); p.append(dl);
      const carregar = botao(t('ui.morte.voltar'), () => fechar('carregar')); carregar.id = 'denovo';
      p.append(carregar, botao(t('ui.morte.recomecar'), () => fechar('titulo'), 'btn sec'));
      const fechar = acao => { tela.hidden = true; document.body.classList.remove('emTela'); h._recomecar?.(acao); };
      setTimeout(() => { tela.hidden = false; document.body.classList.add('emTela'); }, 1100);
    },
    aoRecomecar(fn) { h._recomecar = fn; },
    /** Painel do abrigo: acender a vela (salvar), baú, dormir até o amanhecer, sair. */
    abrigo({ nome, noite, salvar, bau, dormir, fechar }) {
      const tela = $('telaAbrigo'); tela.textContent = '';
      const p = el('div', 'papel abrigo'); tela.append(p);
      p.append(el('small', '', t('ui.abrigo.entrar')), el('h1', '', nome), el('p', 'brief', t('ui.abrigo.seguro')));
      const sair = () => { tela.hidden = true; fechar(); };
      p.append(botao(`🕯 ${t('ui.abrigo.salvar')}`, salvar), botao(`▦ ${t('ui.abrigo.bau')}`, bau),
        botao(`☾ ${t('ui.abrigo.dormir')}`, () => { dormir(); sair(); }), botao(t('ui.abrigo.fechar'), sair, 'btn sec'));
      tela.hidden = false;
    },
    somBotao() { const b = $('somBtn'); const pinta = () => (b.textContent = SOM.ligado ? '🔊' : '🔇'); pinta(); b.onclick = () => { SOM.iniciar(); SOM.alternar(); pinta(); }; addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm') setTimeout(pinta); }); },
    /** Fala no rodapé de cima; `quem` é uma chave do dicionário (quem.voce, quem.radio). */
    radio(txt, seg = 3.5, quem = 'quem.radio') { const r = $('radio'); r.textContent = txt; r.dataset.quem = t(quem); r.classList.toggle('pensamento', quem === 'quem.voce'); r.classList.add('on'); radioT = seg; },
    /** Aviso rápido no centro ("+6 Shells", "Game saved."). */
    ganho(txt) { const g = $('ganho'); g.textContent = txt; g.className = 'on'; ganhoT = 1.6; },
    /** Legenda grande e lenta (o sino, o amanhecer). */
    aviso(txt, seg = 3) { const a = $('aviso'); a.textContent = txt; a.classList.add('on'); avisoT = seg; },
    quadro(dt, { heroi, arma, ciclo, abrigo }) {
      $('hpfill').style.width = Math.max(0, heroi.vida) / CFG.heroi.vida * 100 + '%';
      const lamp = $('lamp'), bat = Math.max(0, heroi.bateria);
      $('batFill').style.width = bat * 100 + '%'; lamp.classList.toggle('fraca', bat < CFG.lanterna.fraca); lamp.classList.toggle('sem', bat <= 0 && heroi.pilhas <= 0);
      $('pilhas').textContent = heroi.pilhas ? `+${heroi.pilhas}` : '';
      $('flare').querySelector('b').textContent = heroi.sinalizadores; $('flare').disabled = heroi.sinalizadores <= 0;
      $('fire').textContent = t('ui.atirar'); $('lamp').querySelector('span').lastChild.textContent = t('ui.lanterna');
      $('furtivo').hidden = !heroi.devagar; $('furtivo').textContent = t('ui.silencio');
      const am = $('ammo'); am.textContent = '';
      am.append(el('small', '', t(`arma.${arma.atual}`)), arma.recarregando > 0 ? el('b', 'rec', '↻') : el('b', '', String(arma.pente)), document.createTextNode(` | ${arma.reserva}`));
      am.classList.toggle('vazio', arma.pente === 0 && arma.reserva === 0);
      // relógio: dia e hora, sol ou lua
      $('relogio').textContent = `${ciclo.noite ? '☾' : '☀'} ${t('ui.dia', { n: ciclo.dia })} · ${ciclo.relogio()}`;
      $('relogio').classList.toggle('noite', ciclo.noite);
      const r = $('rest'); r.hidden = !abrigo; if (abrigo) r.textContent = `🕯 ${t('ui.abrigo.entrar')}`;
      if (radioT > 0 && (radioT -= dt) <= 0) $('radio').classList.remove('on');
      if (ganhoT > 0 && (ganhoT -= dt) <= 0) $('ganho').className = '';
      if (avisoT > 0 && (avisoT -= dt) <= 0) $('aviso').classList.remove('on');
    },
  };
  return h;
}
