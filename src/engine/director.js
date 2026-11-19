// Diretor oculto: não tem corpo. Move os bots, sorteia falas e executa as etapas do cenário (offline nesta versão).
// Todo o tempo passa pelo relógio da simulação: pausar congela bots, agentes e balões.
import { MESAS, PONTOS } from '../scene/office.js';

const sortear = l => l[Math.floor(Math.random() * l.length)];
const perto = ([x, z], r = 0.6) => [x + (Math.random() - 0.5) * r * 2, z + (Math.random() - 0.5) * r * 2];

export function criarDiretor({ agentes, rotulos, falas, escritorio, relogio, aoEtapa }) {
  const porId = Object.fromEntries(agentes.map(a => [a.def.id, a]));
  const bots = agentes.filter(a => a.def.tipo === 'bot' && a.def.id !== 'cliente');
  const destinos = { estagiario: ['gerente', 'designer', 'programador', 'revisor', 'cafe', 'kanban'], suporte: ['suporte', 'cafe', 'suporte'],
    analista: ['analista', 'reuniao', 'analista'], faxineiro: ['cafe', 'reuniao', 'recepcao', 'telao', 'kanban', 'entrada'], recepcionista: ['recepcao'] };
  const lugar = id => MESAS[id] ? [MESAS[id][0], MESAS[id][1] + 1.05] : PONTOS[id];
  let cenario = null, i = -1, fimEtapa = 0;
  const d = {
    get etapa() { return cenario?.etapas[i] || null; },
    get indice() { return i; }, get total() { return cenario?.etapas.length || 0; },
    /** Posiciona todo mundo: IAs nas mesas, bots nos seus lugares, cliente na porta. */
    montar(c) {
      cenario = c; i = -1;
      for (const a of agentes) {
        a.ativo = false; a.acao = 'parado'; a.alvo = null;
        const [x, z] = a.def.id === 'cliente' ? PONTOS.entrada : lugar(MESAS[a.def.id] ? a.def.id : (destinos[a.def.id] || ['cafe'])[0]);
        a.g.position.set(x, 0, z); a.g.rotation.y = Math.PI;
        if (MESAS[a.def.id]) { a.acao = 'digitando'; a.g.rotation.y = Math.PI; }
        a.proximoPasso = relogio.tempo + 1 + Math.random() * 4; a.proximaFala = relogio.tempo + 3 + Math.random() * 6;
      }
      for (const t of Object.values(escritorio.telas)) t.color.set('#1E2333');
      relogio.depois(1.5, () => irPara(0));
    },
    proxima() { if (cenario && i < cenario.etapas.length - 1) irPara(i + 1); },
    anterior() { if (cenario && i > 0) irPara(i - 1); },
    passo(dt) {
      const agora = relogio.tempo;
      // bots: andam entre pontos de interesse e falam de 6 a 12 s
      for (const b of bots) {
        if (b.acao !== 'andando' && agora >= b.proximoPasso) {
          const dest = sortear(destinos[b.def.id] || ['cafe']), [x, z] = perto(lugar(dest), 0.7);
          b.irPara(x, z, MESAS[dest] && dest === b.def.id ? 'digitando' : 'parado'); b.proximoPasso = agora + 5 + Math.random() * 8;
        }
        if (agora >= b.proximaFala) { rotulos.falar(b, sortear([...(falas[b.def.id] || []), ...falas.geral]), 3.2, agora); b.proximaFala = agora + 6 + Math.random() * 6; }
      }
      // IAs paradas na mesa voltam a digitar
      for (const a of agentes) if (a.def.tipo === 'ia' && a.acao === 'parado' && !a.alvo) { const [x, z] = lugar(a.def.id); if (a.g.position.distanceTo({ x, y: 0, z }) < 0.2) a.acao = a.ativo ? 'pensando' : 'digitando'; }
      if (cenario && i >= 0 && agora >= fimEtapa && i < cenario.etapas.length - 1) irPara(i + 1);
      for (const a of agentes) a.animar(dt);
    },
  };
  /** Começa a etapa n: o agente da etapa fica ativo, pensa e depois mostra o que fez. */
  function irPara(n) {
    i = n; const e = cenario.etapas[i], ag = porId[e.agente];
    for (const a of agentes) a.ativo = a === ag;
    for (const [id, t] of Object.entries(escritorio.telas)) t.color.set(id === e.agente ? '#7FB2FF' : '#1E2333');
    fimEtapa = relogio.tempo + e.duracao;
    if (e.agente === 'cliente') { ag.irPara(PONTOS.recepcao[0] - 0.2, PONTOS.recepcao[1] + 1.3, 'parado'); }
    if (e.id.includes('entrega')) { porId.cliente.irPara(MESAS.gerente[0] + 1.2, MESAS.gerente[1] + 1.8, 'parado'); }
    rotulos.falar(ag, '', 1.2, relogio.tempo, true);   // "pensando…" (três pontinhos)
    relogio.depois(1.2, () => { if (cenario.etapas[i] === e) rotulos.falar(ag, textoDa(e), e.duracao - 1.2, relogio.tempo); });
    aoEtapa?.(e, i, cenario.etapas.length);
  }
  function textoDa(e) {
    const s = e.saida || {};
    if (s.texto) return s.texto;
    if (s.tarefas) return `${e.pensamento} ${s.tarefas.map((t, k) => `${k + 1}) ${t}`).join(' ')}`;
    if (s.titulo) return `${e.pensamento} Título: “${s.titulo}”.`;
    if (s.aprovado === false) return `↩️ ${s.correcao}`;
    if (s.aprovado === true) return `✅ ${e.pensamento}`;
    return e.pensamento;
  }
  return d;
}
