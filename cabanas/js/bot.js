// Bot de teste: joga a missão sozinho para medir duração e dificuldade (?bot=1).
// Joga como um jogador mediano: chega perto, atira, recua quando cercado, busca munição e corre para a extração.
const YAW = Math.PI / 4, R = [Math.cos(YAW), -Math.sin(YAW)], F = [-Math.sin(YAW), -Math.cos(YAW)];

export function criarBot({ heroi, combate, missao, mundo, entrada }) {
  const st = { vidaMin: 100, tiros: 0, caixas: 0, preso: 0, desvio: 0, ultimo: [0, 0], fim: null, tLimpeza: 0 };
  entrada.id = 'bot';
  const ir = (dx, dz) => { const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; entrada.x = dx * R[0] + dz * R[1]; entrada.z = -(dx * F[0] + dz * F[1]); };
  return {
    st,
    passo(dt) {
      entrada.atirando = false; entrada.x = entrada.z = 0;
      if (missao.estado !== 'limpeza' && missao.estado !== 'extracao') {
        if (!st.fim && (missao.estado === 'pago' || missao.estado === 'caido')) st.fim = { estado: missao.estado, tempo: missao.tempo, tLimpeza: st.tLimpeza, abates: missao.abates, saque: missao.saque, vidaMin: st.vidaMin, municao: combate.arma.pente + combate.arma.reserva, caixas: mundo.caixas.filter(c => c.aberta).length };
        return;
      }
      const p = heroi.g.position; st.vidaMin = Math.min(st.vidaMin, heroi.vida);
      if (missao.estado === 'limpeza') st.tLimpeza = missao.tempo;
      let alvo = null, dAlvo = 1e9;
      for (const z of combate.zumbis) { if (z.morto) continue; const d = z.g.position.distanceTo(p); if (d < dAlvo) { dAlvo = d; alvo = z; } }
      const mun = combate.arma.pente + combate.arma.reserva;
      let mx = 0, mz = 0;
      if (missao.estado === 'extracao') {
        const s = mundo.sinal.position, d = s.distanceTo(p);
        if (d > 1.2) { mx = s.x - p.x; mz = s.z - p.z; }
        if (alvo && dAlvo < 1.6 && d < 2.5) { mx = p.x - alvo.g.position.x; mz = p.z - alvo.g.position.z; }   // dentro do círculo, recua um pouco
      } else {
        const caixa = mundo.caixas.filter(c => !c.aberta).sort((a, b) => a.g.position.distanceTo(p) - b.g.position.distanceTo(p))[0];
        const saque = combate.saques.find(s => s.g.position.distanceTo(p) < 7);
        if (mun < 10 && caixa) { mx = caixa.g.position.x - p.x; mz = caixa.g.position.z - p.z; }
        else if (alvo && dAlvo < 2.4) { mx = p.x - alvo.g.position.x; mz = p.z - alvo.g.position.z; }          // recua
        else if (saque && (!alvo || dAlvo > 6)) { mx = saque.g.position.x - p.x; mz = saque.g.position.z - p.z; }
        else if (alvo && dAlvo > 6) { mx = alvo.g.position.x - p.x; mz = alvo.g.position.z - p.z; }
        else if (!alvo) { mx = -p.x; mz = -p.z; }
      }
      // destrava: se ficou parado querendo andar, contorna pelo lado
      const moveu = Math.hypot(p.x - st.ultimo[0], p.z - st.ultimo[1]); st.ultimo = [p.x, p.z];
      if ((mx || mz) && moveu < 0.01) st.preso += dt; else st.preso = Math.max(0, st.preso - dt);
      if (st.preso > 0.4) st.desvio = 1.2;
      if (st.desvio > 0) { st.desvio -= dt; [mx, mz] = [-mz, mx]; }
      if (mx || mz) ir(mx, mz);
      if (alvo && dAlvo < 8.5) { entrada.atirando = true; if (combate.arma.espera <= 0 && combate.arma.pente > 0) st.tiros++; }
    },
  };
}
