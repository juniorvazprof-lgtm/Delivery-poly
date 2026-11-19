// Quiz final: "quem era IA e quem era roteiro?". Texto sempre via textContent.
const EXPLICA = { ia: 'Pensa e decide sozinho, por isso o balão de IA pode mudar a cada vez.', bot: 'Só repete um roteiro pronto: sempre faz e diz o que foi combinado.' };

export function criarQuiz(agentes) {
  const raiz = document.createElement('div'); raiz.id = 'quiz'; raiz.hidden = true;
  raiz.innerHTML = '<div class="q-caixa" role="dialog" aria-modal="true" aria-label="Quiz"><h2></h2><p class="q-nome"></p><div class="q-botoes"><button type="button" data-r="ia">🤖 IA</button><button type="button" data-r="bot">📜 ROTEIRO</button></div><p class="q-fb" aria-live="polite"></p><div class="q-rodape"><button type="button" class="q-prox">Próxima</button><button type="button" class="q-fechar">Fechar</button></div></div>';
  document.body.append(raiz);
  const $ = s => raiz.querySelector(s); let fila = [], k = 0, pontos = 0, respondeu = false;
  const embaralhar = l => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function mostrar() {
    if (k >= fila.length) { $('h2').textContent = `Você acertou ${pontos} de ${fila.length}! 🎉`; $('.q-nome').textContent = ''; $('.q-botoes').hidden = true; $('.q-fb').textContent = 'Repare: a IA pensa e decide; o roteiro só segue o que foi escrito.'; $('.q-prox').textContent = 'Jogar de novo'; $('.q-prox').dataset.novo = '1'; return; }
    respondeu = false; $('.q-botoes').hidden = false; $('.q-prox').dataset.novo = ''; $('.q-prox').textContent = 'Próxima'; $('.q-prox').hidden = true;
    $('h2').textContent = `Quem é este personagem? (${k + 1}/${fila.length})`; $('.q-nome').textContent = fila[k].def.nome; $('.q-fb').textContent = '';
  }
  function abrir() { fila = embaralhar(agentes); k = 0; pontos = 0; raiz.hidden = false; mostrar(); $('.q-botoes button').focus(); }
  raiz.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.r && !respondeu) {
      respondeu = true; const certo = fila[k].def.tipo === b.dataset.r; if (certo) pontos++;
      $('.q-fb').textContent = `${certo ? '✅ Acertou!' : '❌ Quase!'} ${fila[k].def.nome} é ${fila[k].def.tipo === 'ia' ? 'IA' : 'ROTEIRO'}. ${EXPLICA[fila[k].def.tipo]}`; $('.q-prox').hidden = false; $('.q-prox').focus();
    } else if (b.classList.contains('q-prox')) { if (b.dataset.novo) abrir(); else { k++; mostrar(); } }
    else if (b.classList.contains('q-fechar')) raiz.hidden = true;
  });
  addEventListener('keydown', e => { if (!raiz.hidden && e.key === 'Escape') raiz.hidden = true; });
  return { abrir, get aberto() { return !raiz.hidden; } };
}
