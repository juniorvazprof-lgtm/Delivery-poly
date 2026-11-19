// Etiquetas "IA" / "ROTEIRO" e balões de fala em HTML, posicionados sobre a cabeça de cada boneco.
// São camadas 2D: nítidas e legíveis de qualquer ângulo da câmera. Texto sempre via textContent.
import * as T from '../three.module.js';

export function criarRotulos(camada) {
  const itens = new Map(), v = new T.Vector3();
  return {
    adicionar(a) {
      const raiz = document.createElement('div'); raiz.className = 'rotulo';
      const etq = document.createElement('div'); etq.className = `etiqueta ${a.def.tipo}`;
      const tipo = document.createElement('b'); tipo.textContent = a.def.tipo === 'ia' ? 'IA' : 'ROTEIRO';
      const nome = document.createElement('span'); nome.textContent = a.def.nome;
      if (a.def.tipo === 'ia') etq.style.setProperty('--cor', a.def.cor);
      etq.append(tipo, nome);
      const balao = document.createElement('div'); balao.className = 'balao'; balao.hidden = true;
      raiz.append(balao, etq); camada.append(raiz);
      itens.set(a, { raiz, balao, ate: 0 });
    },
    /** Mostra uma fala por `seg` segundos de simulação; `pensando` mostra os três pontinhos antes do texto. */
    falar(a, texto, seg, agora, pensando = false) {
      const it = itens.get(a); if (!it) return;
      it.balao.textContent = ''; it.balao.classList.toggle('pensando', pensando); it.balao.classList.toggle('ia', a.def.tipo === 'ia');
      if (pensando) { for (let i = 0; i < 3; i++) it.balao.append(document.createElement('i')); }
      else it.balao.textContent = texto;
      it.balao.hidden = false; it.ate = agora + seg;
    },
    /** Há algum balão visível agora? */
    ocupado(agora) { for (const it of itens.values()) if (!it.balao.hidden && agora < it.ate) return true; return false; },
    atualizar(camera, larg, alt, agora) {
      for (const [a, it] of itens) {
        v.copy(a.g.position); v.y += 2.35; v.project(camera);
        const vis = v.z < 1;
        it.raiz.style.display = vis ? '' : 'none';
        it.raiz.style.transform = `translate(${((v.x + 1) / 2 * larg).toFixed(1)}px, ${((1 - v.y) / 2 * alt).toFixed(1)}px)`;
        it.raiz.style.zIndex = String(Math.round((1 - v.z) * 1000));
        if (!it.balao.hidden && agora >= it.ate) it.balao.hidden = true;
      }
    },
  };
}
