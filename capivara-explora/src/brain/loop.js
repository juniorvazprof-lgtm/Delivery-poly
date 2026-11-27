// Memória, diário e o LOOP DE IA.
// (módulo 17/20 da Capivara Explora)
import { G, H } from '../core/runtime.js';
import { MIN_CALL_INTERVAL, PROVIDERS, cfg, clamp, hasBrain, pendingNotes, save, state } from '../core/config.js';
import { TYPES } from '../world/types.js';
import { objects } from '../world/objects.js';
import { capy } from '../capy/capybara.js';
import { buildPerception } from './perception.js';
import { FORMATO, PERSONALIDADE, callAI, memory, normalizeDecision, offlineBrain } from './brain.js';
import { executeAction, updateBelief, writeDiary } from './actions.js';
import { endClip, startClip } from '../features/vlog.js';

// ---------------------------------------------------------------------
// 5d. MEMÓRIA: aprendizados + resumo quando passar de 20
// ---------------------------------------------------------------------
async function maybeSummarizeMemory() {
  if (state.aprendizados.length <= 20) return;
  let novo = null;
  if (hasBrain()) {
    try {
      const r = await callAI('Você resume a memória de uma capivara exploradora. Responda JSON: {"aprendizados":["..."]}',
        `Resuma estes aprendizados em no máximo 10 itens curtos, juntando repetidos e mantendo os mais úteis (o que é bom, o que é perigoso, onde ficam as coisas):\n- ${state.aprendizados.join('\n- ')}`);
      if (Array.isArray(r.aprendizados)) novo = r.aprendizados.slice(0, 10).map(String);
    } catch {}
  }
  state.aprendizados = novo || [...new Set(state.aprendizados)].slice(-10);
  H.renderMemory();
}

// ---------------------------------------------------------------------
// 5e. O LOOP DE IA
//   Uma única corrotina async: nunca há duas chamadas ao mesmo tempo,
//   porque cada ciclo espera (await) a resposta E a execução da ação
//   antes de começar o próximo.
//
//   ┌─> monta PERCEPÇÃO (só descrições visuais, distância, direção, clima, status)
//   │   monta PROMPT (personalidade + percepção + memória + último resultado + últimas 5 ações)
//   │   chama o cérebro (DeepSeek ou Gemini, timeout 10 s; falhou → offline nesse ciclo)
//   │   VALIDA a resposta (ação/alvo inválidos → vagar)
//   │   mostra o pensamento no log e o emoji sobre a cabeça
//   │   EXECUTA a ação → efeitos ocultos → texto do resultado
//   │   guarda resultado + histórico + aprendizado
//   └── espera o intervalo mínimo de 4 s desde a última chamada
// ---------------------------------------------------------------------
let brainStatus = '', brainState = 'off';   // ok | falha | off (indicador no canto do mundo)
// Traduz erros de API para português
function apiErro(e) {
  const m = String(e?.message || e);
  if (e?.name === 'AbortError') return 'sem resposta em 10 s';
  if (/HTTP 40[13]/.test(m)) return 'chave recusada (inválida ou sem permissão)';
  if (/HTTP 402/.test(m)) return 'conta sem saldo';
  if (/HTTP 429/.test(m)) return 'limite de uso atingido, tente mais tarde';
  if (/HTTP 404/.test(m)) return 'modelo não encontrado (confira o nome)';
  if (/HTTP 400/.test(m)) return 'pedido recusado (confira o nome do modelo)';
  if (/HTTP 5/.test(m)) return 'o servidor da IA está com problema';
  if (e instanceof SyntaxError) return 'respondeu, mas não em JSON';
  if (e instanceof TypeError) return 'não conectou: sem internet ou bloqueado pelo navegador (no claude.ai as APIs são bloqueadas)';
  return m;
}
async function aiLoop() {
  let lastCall = 0;
  while (true) {
    while (G.paused) await new Promise(r => setTimeout(r, 200));
    const wait = MIN_CALL_INTERVAL - (performance.now() - lastCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    while (G.paused) await new Promise(r => setTimeout(r, 200));

    // 0) DIÁRIO: ao anoitecer, escreve um resumo do dia (antes da próxima decisão)
    if (G.pendingDiary) { G.pendingDiary = false; await writeDiary(); }

    // desmaio (saúde zerada): dorme no lugar e acorda fraca
    if (G.desmaiada) {
      H.showThought({ pensamento: 'Tudo ficou escuro. Não consigo mais ficar em pé.', emoji: '😴', acao: 'dormir', alvo: null }, 'offline');
      await executeAction({ acao: 'dormir', alvo: null });
      state.stats.saude = Math.max(state.stats.saude, 30); G.desmaiada = false; capy.anim = 'idle';
      memory.lastResult = 'Você desmaiou e acordou fraca, com a saúde baixa. Precisa se cuidar: comer, beber e dormir num lugar protegido.';
      continue;
    }
    state.ciclo++;
    // 1) PERCEPÇÃO
    const perc = buildPerception();
    if (pendingNotes.length) { memory.lastResult += ' ' + pendingNotes.join(' '); pendingNotes.length = 0; }
    const prompt = [
      'PERCEPÇÃO:', perc.texto, '',
      'MEMÓRIA (o que você já aprendeu):', state.aprendizados.length ? state.aprendizados.map(a => '- ' + a).join('\n') : '- (ainda nada, tudo é novidade)', '',
      'RESULTADO DA ÚLTIMA AÇÃO:', memory.lastResult, '',
      'SUAS ÚLTIMAS AÇÕES:', memory.history.length ? memory.history.slice(-5).map((h, i) => `${i + 1}. ${h}`).join('\n') : '(nenhuma)', '',
      'Decida sua próxima ação. Responda só com o JSON.',
    ].join('\n');

    // 2) CÉREBRO
    lastCall = performance.now();
    let raw, fonte = 'offline';
    if (hasBrain()) {
      const nome = PROVIDERS[cfg.mode];
      try { raw = await callAI(PERSONALIDADE + '\n' + FORMATO, prompt); fonte = 'ia'; brainStatus = `🟢 ${nome} respondeu`; brainState = 'ok'; }
      catch (e) { raw = offlineBrain(perc); brainStatus = `🟠 ${nome} falhou: ${apiErro(e)}. Usei o cérebro offline.`; brainState = 'falha'; }
    } else { raw = offlineBrain(perc); brainState = 'off'; brainStatus = cfg.mode === 'offline' ? '⚪ Cérebro offline' : `⚪ Sem chave do ${PROVIDERS[cfg.mode]} — cérebro offline`; }

    // 3) VALIDAÇÃO
    const dec = normalizeDecision(raw, perc);
    if (G.gameTime < G.sickUntil) dec.emoji = '🤢'; // enjoo força o emoji
    if (dec.aprendizado && !state.aprendizados.includes(dec.aprendizado)) state.aprendizados.push(dec.aprendizado);
    H.showThought(dec, fonte);

    const eraNova = dec.alvo && !state.descobertas.some(d => d.startsWith(dec.acao + ':' + (objects.find(o => o.id === dec.alvo)?.type) + '|'));
    // 4) EXECUÇÃO + efeitos ocultos
    let resultado;
    // rede de segurança do vlog: muito tempo sem gravar + algo inédito = a câmera grava sozinha
    if (!dec.gravar && state.temCamera && eraNova && state.ciclo - state.ultimoClipe > 6) dec.gravar = true;
    const gravando = dec.gravar && startClip(dec.narracao || dec.pensamento);
    if (gravando) state.ultimoClipe = state.ciclo;
    try { resultado = await executeAction(dec); } catch (e) { console.error(e); resultado = 'Você se distraiu.'; }
    if (gravando) { endClip(resultado); H.discover('gravar:vlog', 'gravar o próprio vlog'); }
    capy.anim = 'idle'; capy.swim = false;
    if (G.lastOutcome) { const note = updateBelief(G.lastOutcome); if (note) resultado += ' ' + note; G.lastOutcome = null; }
    memory.lastResult = resultado;
    const alvoNome = dec.alvo ? (TYPES[objects.find(o => o.id === dec.alvo)?.type]?.nome || dec.alvo) : '';
    memory.history.push(`${dec.acao}${alvoNome ? ' → ' + alvoNome : ''}: ${resultado}`);
    memory.history = memory.history.slice(-5);
    const tipoAlvo = objects.find(o => o.id === dec.alvo)?.type || (dec.alvo || '').replace(/_\d+$/, '');
    const chave = dec.acao + ':' + tipoAlvo;
    const repetiu = memory.keys.slice(-4).filter(k => k === chave).length;
    const nova = eraNova;
    state.stats.tedio = clamp(state.stats.tedio + (repetiu >= 2 ? 15 : repetiu ? 6 : nova ? -30 : dec.acao === 'vagar' ? -6 : -8));
    memory.keys.push(chave); memory.keys = memory.keys.slice(-8);
    await maybeSummarizeMemory();
    H.renderMemory(); save();
  }
}

export { aiLoop, apiErro, brainState, brainStatus };
