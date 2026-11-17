// Bot de teste: joga a sessão sozinho (?bot=1) caçando zumbis e buscando munição nas caixas.
// ?duracao=N: quantos segundos de sobrevivência contam como "sobreviveu" (padrão 120).
const YAW = Math.PI / 4, R = [Math.cos(YAW), -Math.sin(YAW)], F = [-Math.sin(YAW), -Math.cos(YAW)];

export function criarBot({ heroi, combate, missao, mundo, entrada }) {
  const DURACAO = Number(new URLSearchParams(location.search).get('duracao')) || 120;
  const st = { sinalizadores: 0, vidaMin: 100, tiros: 0, preso: 0, desvio: 0, ultimo: [0, 0], fim: null };
  entrada.id = 'bot';
  const ir = (dx, dz) => { const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; entrada.x = dx * R[0] + dz * R[1]; entrada.z = -(dx * F[0] + dz * F[1]); };
  /** Fecha a medição da sessão: caído ou tempo de sobrevivência cumprido. */
  const fechar = estado => {
    const municao = Object.values(combate.arma.muni).map(m => m.pente + m.reserva).join('/');
    st.fim = { estado, tempo: Math.round(missao.tempo), abates: missao.abates, vidaMin: Math.round(st.vidaMin), municao };
  };
  return {
    st,
    passo(dt) {
      entrada.x = entrada.z = 0; if (!st.segurando) entrada.atirando = false;
      if (st.fim) return;
      if (!missao.ativo) { if (missao.estado === 'caido') fechar('caido'); return; }
      if (missao.tempo >= DURACAO) { fechar('sobreviveu'); return; }
      const p = heroi.g.position; st.vidaMin = Math.min(st.vidaMin, heroi.vida);
      let alvo = null, dAlvo = 1e9;
      for (const z of combate.zumbis) { if (z.morto) continue; const d = z.g.position.distanceTo(p) + (z.visivel ? 0 : 4); if (d < dAlvo) { dAlvo = d; alvo = z; } }
      if (alvo) dAlvo = alvo.g.position.distanceTo(p);
      // troca de arma quando a atual secou e a outra tem bala
      const A = combate.arma, outra = A.atual === 'espingarda' ? 'pistola' : 'espingarda';
      if (A.pente + A.reserva === 0 && A.muni[outra].pente + A.muni[outra].reserva > 0) combate.trocar(outra);
      const mun = Object.values(combate.arma.muni).reduce((t, m) => t + m.pente + m.reserva, 0) / 2;
      const caixa = mundo.caixas.filter(c => !c.aberta).sort((a, b) => a.g.position.distanceTo(p) - b.g.position.distanceTo(p))[0];
      const saque = combate.saques.find(s => s.g.position.distanceTo(p) < 7);
      let mx = 0, mz = 0;
      if (caixa && mun < 14) { mx = caixa.g.position.x - p.x; mz = caixa.g.position.z - p.z; }         // munição baixa: vai na caixa
      else if (alvo && !alvo.visivel && dAlvo < 9) { mx = alvo.g.position.x - p.x; mz = alvo.g.position.z - p.z; }   // vira a lanterna para o barulho
      else if (alvo && dAlvo < 2.4) { mx = p.x - alvo.g.position.x; mz = p.z - alvo.g.position.z; }    // recua
      else if (saque && (!alvo || dAlvo > 6)) { mx = saque.g.position.x - p.x; mz = saque.g.position.z - p.z; }
      else if (alvo && dAlvo > 6) { mx = alvo.g.position.x - p.x; mz = alvo.g.position.z - p.z; }
      else if (!alvo) { mx = -p.x; mz = -p.z; }                                                        // sem alvo: volta para o centro
      // destrava: se ficou parado querendo andar, contorna pelo lado
      const moveu = Math.hypot(p.x - st.ultimo[0], p.z - st.ultimo[1]); st.ultimo = [p.x, p.z];
      if ((mx || mz) && moveu < 0.01) st.preso += dt; else st.preso = Math.max(0, st.preso - dt);
      if (st.preso > 0.4) st.desvio = 1.2;
      if (st.desvio > 0) { st.desvio -= dt; [mx, mz] = [-mz, mx]; }
      if (mx || mz) ir(mx, mz);
      // cercado: joga um sinalizador para longe e deixa a horda ir até ele
      const cerco = combate.zumbis.filter(z => !z.morto && z.g.position.distanceTo(p) < 6).length;
      if (cerco >= 5 && heroi.sinalizadores > 0 && (st.sinT = (st.sinT || 0) - dt) <= 0) { entrada.sinalizador++; st.sinalizadores++; st.sinT = 8; }
      // mira: segura o botão até a mira fechar (mais rápido se a criatura estiver perto) e solta para atirar
      const f = heroi.frente(), vx = alvo ? alvo.g.position.x - p.x : 0, vz = alvo ? alvo.g.position.z - p.z : 0;
      const de_frente = alvo && (vx * f.x + vz * f.z) / (Math.hypot(vx, vz) || 1) > Math.cos(0.45);
      if (alvo && alvo.visivel && dAlvo < 8.5 && !de_frente && !st.segurando) ir(vx, vz);   // vira para a criatura antes de mirar
      const quer = alvo && alvo.visivel && dAlvo < 8.5 && (de_frente || st.segurando), pronto = combate.mira >= (dAlvo < 2.5 ? 0.25 : 0.75);
      if (quer && !(st.segurando && pronto)) { entrada.atirando = true; st.segurando = true; entrada.x = entrada.z = 0; } else { if (st.segurando) st.tiros++; st.segurando = false; }
    },
  };
}
