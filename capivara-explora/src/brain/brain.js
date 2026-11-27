// Cérebro: personalidade, validação, DeepSeek/Gemini e cérebro offline.
// (módulo 12/20 da Capivara Explora)
import { G } from '../core/runtime.js';
import { ACOES, CALL_TIMEOUT, bom, cfg, isNight, pick, ruim, state } from '../core/config.js';
import { TYPES } from '../world/types.js';
import { jac, objects, pc } from '../world/objects.js';
import { raining } from '../world/simulation.js';

// ---------------------------------------------------------------------
// 5b. CÉREBRO
// ---------------------------------------------------------------------
const PERSONALIDADE = `Você é uma capivara jovem que acabou de despertar num mundo que não conhece. Você não sabe o nome de nada: não sabe o que é "árvore", "cogumelo" ou "lago". Quando encontra algo novo, descreve o que vê, cheira e sente, ou inventa um nome simples para ele (por exemplo "bolinhas-roxas", "pedra-de-sentar", "água-que-corre") e passa a usar sempre esse mesmo nome. Você aprende experimentando: forma hipóteses ("talvez isto seja comida"), testa e tira conclusões do resultado ("as bolinhas-roxas matam a fome; vou lembrar disso"). Na maior parte do tempo seus pensamentos são observações curtas e práticas; só às vezes, sem exagero, faz uma reflexão serena sobre o que descobriu. Ama água e não tem pressa. Gosta de céu, luz, plantas, bichos pequenos e de entender por que as coisas são como são; quando encontra algo que a intriga, quer saber mais. Fale em português brasileiro, simples, sem piadas, sem gírias e sem emojis no texto. Você NÃO sabe o que é seguro ou perigoso: só sabe o que está na sua memória. Não repita frases.`;
const FORMATO = `
A cada turno você recebe sua percepção e decide UMA ação. Responda SOMENTE com JSON neste formato:
{"pensamento":"1-2 frases em 1ª pessoa: o que observa, a hipótese que vai testar ou o que concluiu, usando os nomes que você inventou; sem emojis","emoji":"exatamente um destes: 🙂 😌 😋 🤔 😮 😟 😴 🤢 😱 💧 🥶 🥱 😣 📸 💻 🤕","acao":"ir_para | comer | beber | nadar | dormir | cheirar | sentar | investigar | fugir | vagar | necessidades | pegar | fotografar | pesquisar","alvo":"id de um objeto visível ou null","aprendizado":"conclusão curta sobre a última experiência, usando seus nomes inventados (ex: \"as bolinhas-roxas são doces e matam a fome\"), ou null"}
Regras: "acao" deve ser exatamente uma das opções. "alvo" deve ser um id exatamente como aparece na percepção (ou null para vagar/fugir/dormir no lugar). Só registre "aprendizado" quando a última ação realmente te ensinou algo novo.
Campos extras (inclua sempre, use null quando não se aplicam): "pesquisa": 1 a 3 palavras-chave do que você quer saber (só com acao "pesquisar"); "destino": id de uma região nova (só com acao "explorar"); "legenda": uma frase curta para a imagem (só com acao "fotografar", alvo = o que você quer guardar, ou null para a paisagem). Fotografe só o que realmente chama sua atenção ou você gosta.
Se você tem a câmera na cabeça, também pode gravar vídeo para o seu vlog: "gravar": true grava a ação que você vai fazer agora, do seu ponto de vista, e "narracao" é a frase curta que você diz para a câmera enquanto grava. Grave com frequência os momentos que valem a pena mostrar (algo novo, bonito, arriscado ou engraçado); no resto, "gravar": false e "narracao": null.
Explorar: você vive num mundo grande. Quando estiver entediada, sem nada novo por perto ou curiosa, use "explorar" para viajar até uma região onde nunca esteve.`;

const EMOJIS = ['🙂', '😌', '😋', '🤔', '😮', '😟', '😴', '🤢', '😱', '💧', '🥶', '🥱', '😣', '📸', '💻', '🎥', '🤕'];
const memory = { keys: [], lastResult: 'Você acabou de acordar. Tudo é novo.', history: [] };

// Validação: ação fora da lista, alvo inexistente ou JSON quebrado → "vagar"
function normalizeDecision(raw, perc) {
  const ok = raw && typeof raw === 'object';
  const r = ok ? raw : {};
  let acao = ACOES.includes(r.acao) ? r.acao : 'vagar';
  let alvo = typeof r.alvo === 'string' && objects.some(o => o.id === r.alvo) ? r.alvo : null;
  const precisaAlvo = ['ir_para', 'comer', 'beber', 'nadar', 'cheirar', 'sentar', 'investigar', 'pegar'];
  if (acao === 'pesquisar') alvo = pc.id;                                 // sempre no computador
  if (acao === 'fotografar' && !state.temCamera) acao = 'vagar';          // sem câmera não dá
  if (precisaAlvo.includes(acao) && !alvo) {
    // tenta achar algo visível adequado; senão, vaga
    const cand = perc.visiveis.find(({ o }) => TYPES[o.type].efeitos[acao]);
    if (cand && acao !== 'ir_para') alvo = cand.o.id; else acao = 'vagar';
  }
  return {
    pensamento: String(r.pensamento || 'Vou caminhar um pouco e observar.').slice(0, 220),
    emoji: EMOJIS.includes(r.emoji) ? r.emoji : '🤔',
    acao, alvo,
    aprendizado: r.aprendizado && r.aprendizado !== 'null' ? String(r.aprendizado).slice(0, 160) : null,
    pesquisa: typeof r.pesquisa === 'string' && r.pesquisa !== 'null' ? r.pesquisa.slice(0, 80) : null,
    legenda: typeof r.legenda === 'string' && r.legenda !== 'null' ? r.legenda.slice(0, 120) : null,
    gravar: !!r.gravar && state.temCamera,
    narracao: typeof r.narracao === 'string' && r.narracao !== 'null' ? r.narracao.slice(0, 140) : null,
    destino: typeof r.destino === 'string' && /^\d+,\d+$/.test(r.destino) ? r.destino : null,
  };
}

// --- Chamada à IA: escolhe o provedor configurado. Sempre devolve o JSON já parseado. ---
function callAI(system, user) { return cfg.mode === 'gemini' ? callGemini(system, user) : callDeepSeek(system, user); }
const parseJSONText = txt => JSON.parse(String(txt).replace(/^```(json)?|```$/g, '').trim());

// --- DeepSeek (API compatível com OpenAI, modo JSON, sem "thinking" para responder rápido) ---
async function callDeepSeek(system, user, timeoutMs = CALL_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.keys.deepseek },
      body: JSON.stringify({
        model: cfg.models.deepseek, temperature: 1.1, max_tokens: 600,
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return parseJSONText(data?.choices?.[0]?.message?.content || '');
  } finally { clearTimeout(timer); }
}

// --- Gemini ---
async function callGemini(system, user, timeoutMs = CALL_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const generationConfig = { responseMimeType: 'application/json', temperature: 1.0, maxOutputTokens: 600 };
    if (/2\.5/.test(cfg.models.gemini)) generationConfig.thinkingConfig = { thinkingBudget: 0 }; // resposta rápida
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.models.gemini)}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.keys.gemini },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig,
      }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    return parseJSONText(txt);
  } finally { clearTimeout(timer); }
}

// --- Cérebro offline: escolhas aleatórias coerentes com os status ---
let lastOfflineThought = '';
const offlineBad = new Set(); // tipos que deram ruim (aprendizado offline simples)
// Nomes que a capivara inventa para o que não conhece (offline). Ficam salvos para ela usar sempre o mesmo.
const NOMES = {
  arvore_frutas: ['árvore-de-bolinhas-vermelhas', 'planta-alta-de-frutinhas'], arvore: ['gigante-verde', 'planta-que-faz-sombra'],
  arbusto_amoras: ['bolinhas-roxas', 'moita-roxa'], capim_alto: ['folhas-macias', 'capim-de-cócegas'],
  arbusto_espinhos: ['moita-pontuda', 'folhas-que-espetam'], arbusto_bagas_brancas: ['pérolas-de-moita', 'bolinhas-brancas'],
  cogumelo_vermelho: ['chapéu-vermelho-pintado', 'guarda-chuva-vermelho'], cogumelo_marrom: ['chapéu-marrom', 'guarda-chuva-de-terra'],
  lago: ['água-grande', 'espelho-de-água'], riacho: ['água-que-corre', 'fio-de-água'], fonte: ['água-que-cai', 'bacia-de-pedras'],
  pedra: ['pedra-de-sentar', 'rocha-morna'], caverna: ['buraco-escuro', 'casa-de-pedra'], abrigo: ['telhado-de-galhos', 'cabana-de-folhas'],
  flores: ['cores-que-cheiram', 'pontinhos-coloridos'], passaro: ['bicho-que-voa', 'pena-azul'], pinha: ['pedra-de-escamas', 'casca-dura'], formigueiro: ['montinho-que-anda', 'morro-de-pontinhos'],
  tronco_musgo: ['tronco-macio', 'madeira-verde'], caramujo: ['casinha-espiral', 'bolinha-lenta'], ninho: ['bolinhas-azuis', 'cesto-de-gravetos'],
  teia: ['fios-brilhantes', 'rede-de-luz'], trevo: ['folhas-redondas', 'tapete-de-três'], grama_seca: ['palha-amarela', 'capim-velho'],
  grama_baixa: ['chão-verde', 'grama-curta'], computador: ['caixinha-brilhante', 'pedra-que-responde'], lagoa: ['água-pequena', 'poça-grande'], taboa: ['salsicha-do-brejo', 'capim-de-espiga'],
  cacto: ['planta-que-espeta', 'pote-de-espinhos'], samambaia: ['folha-que-curva', 'cortina-verde'], pedra_brilhante: ['pedra-de-luz', 'gelo-que-não-derrete'], gopro: ['olho-de-guardar', 'coisinha-de-clique'], coco: ['meu-cheiro', 'bolinhas-marrons'], jacare: ['boca-de-dentes', 'tronco-que-morde'],
  melancia: ['bola-listrada'], bola: ['coisa-que-rola'], caixa: ['caixa-com-laço'],
};
state.nomes ||= {};
const cap = t => t.replace(/(^|[.!?] )(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
// conclusões que o cérebro offline tira de experiências boas
const LICAO = { comer: '{n} mata a fome. Vou lembrar disso.', beber: '{n} mata a sede.', nadar: 'Dentro de {n} o corpo fica leve e o humor melhora.',
  dormir: 'Dormir em {n} devolve as forças.', sentar: 'Ficar perto de {n} acalma.', cheirar: '{n} tem um cheiro bom.', investigar: '{n} é interessante de perto.' };
const nomeDe = t => state.nomes[t] ||= pick(NOMES[t] || ['coisa-nova']);
// [pensamento quando ainda não conhece, pensamento quando já conhece, emoji]; {n} = nome inventado
const FRASES = {
  comer: [['Não sei se isto aqui se come. Vou chamar de {n} e provar um pedaço pequeno.', 'Vou comer {n} de novo. Quero ver se acontece o mesmo da outra vez.', '🤔'],
          ['A barriga pede algo. {n} tem cara de comida, mas só provando para saber.', 'Já conheço {n}. Hora de comer.', '😋']],
  beber: [['Isto parece água. Vou chamar de {n} e testar com a língua.', 'A sede voltou. {n} me ajudou antes.', '💧']],
  nadar: [['E se eu entrar em {n}? Vou testar com o corpo inteiro.', 'Quero voltar para dentro de {n}. Lá o corpo fica leve.', '😌']],
  dormir: [['O corpo está pesado. Talvez {n} seja um bom lugar para descansar.', 'Vou dormir em {n}. Da outra vez funcionou.', '😴']],
  cheirar: [['Que cheiro tem {n}? O focinho vai me contar.', 'Vou cheirar {n} de novo para comparar.', '🤔']],
  sentar: [['Vou sentar perto de {n} e só observar por um tempo.', 'Volto para {n}. Daqui o mundo parece mais calmo.', '😌']],
  investigar: [['Nunca vi isto. Vou chamar de {n} e olhar de perto.', 'Ainda não entendi tudo sobre {n}. Vou olhar de novo.', '😮']],
  vagar: [['Já vi demais por aqui. Quero saber o que existe do outro lado.', 'Fazer sempre as mesmas coisas cansa. Vou procurar algo novo.', '🥱'],
          ['Vou andar um pouco para ver o que existe além daqui.', 'Caminhar também é uma forma de aprender o lugar.', '🙂'],
          ['Ainda há cantos que eu não conheço.', 'O dia mudou de cor desde que acordei. Será que ele também está indo a algum lugar?', '🙂']],
  explorar: [['Já conheço bem este canto. Lá longe deve haver coisas que eu nunca vi.', 'Vou atravessar o mapa até onde ainda não estive.', '🙂'],
             ['O mundo é maior do que este pedaço. Vou descobrir o que existe do outro lado.', 'Hora de uma viagem longa.', '🤔']],
  pegar: [['Uma coisinha preta com um olho de vidro. Vou levar comigo e descobrir para que serve.', 'Vou pegar isto.', '🤔']],
  pesquisar: [['A caixinha brilhante responde quando eu pergunto. Tenho uma dúvida.', 'Vou perguntar à caixinha sobre algo que vi hoje.', '💻'],
              ['Fico pensando no que encontrei. A caixinha talvez saiba.', 'Quero entender melhor uma coisa. Vou até a caixinha.', '💻']],
  fotografar: [['Isto aqui merece ser guardado. Vou apertar o botão.', 'Quero lembrar de {n} exatamente assim.', '📸'],
               ['A luz está bonita agora. Clique.', '{N} chamou minha atenção. Vou guardar uma imagem.', '📸']],
  necessidades: [['A barriga está pesada. Preciso de um canto tranquilo, de preferência perto da água.', 'Hora de encontrar um canto. O corpo avisa e eu obedeço.', '😣']],
  fugir: [['Algo aqui não parece seguro. Melhor me afastar e pensar depois.', 'Prefiro manter distância.', '😟']],
};
const NARR = {
  novo: ['Gravando. Encontrei {n} e nunca tentei {acao}. Vamos ver o que acontece.', 'Olha isso aqui: {n}. Vou testar com cuidado.', 'Primeira vez com {n}. Fica comigo.'],
  lindo: ['O céu está mudando de cor. Queria que alguém visse isso comigo.', 'Fim de tarde. A luz fica dourada em tudo.'],
  nadar: ['Hora do mergulho. Segura firme, câmera.', 'Vou entrar na água. É aqui que eu fico leve.'],
  jac: ['Estou filmando de longe. Aquele é o {n}. Não chego perto.'],
  explorar: ['Partiu viagem. Vou até onde eu nunca fui.', 'Lugar novo à vista. Vem comigo.'],
  pc: ['Vou perguntar uma coisa para a caixinha brilhante. Vem comigo.', 'Tenho uma dúvida. A caixinha deve saber.'],
};
const VERBO = { explorar: 'explorar', comer: 'comer', beber: 'beber', cheirar: 'cheirar', sentar: 'sentar', investigar: 'olhar de perto', nadar: 'nadar', pegar: 'pegar', ir_para: 'chegar perto' };
function offlineBrain(perc) {
  const s = state.stats, vis = perc.visiveis.map(v => v.o);
  // candidatos: o que vê + o que lembra (mapa mental); prefere o que já deu certo e evita o que deu errado
  const lembrados = perc.lembrados.map(l => objects.find(o => o.id === l.id)).filter(Boolean);
  const medoJac = state.crencas['perto:jacare']?.ruim > 0;            // já levou susto do jacaré
  const jacPerto = vis.includes(jac) && medoJac;
  const ok = (acao, o) => TYPES[o.type].efeitos[acao] && !ruim(acao, o.type) && o.porcoes !== 0 && !(o.type === 'lago' && jacPerto);
  const find = (acao, types) => {
    const c = [...vis, ...lembrados].filter(o => types.includes(o.type) && ok(acao, o));
    if (medoJac) c.sort((a, b) => (a.type === 'lago') - (b.type === 'lago'));   // água sem jacaré primeiro
    return c.find(o => bom(acao, o.type) && !(medoJac && o.type === 'lago')) || c[0];
  };
  let acao = 'vagar', alvo = null, opts = [];
  const pcVisto = vis.includes(pc) || state.mapa[pc.id];
  const sabePc = state.descobertas.some(d => d.startsWith('investigar:computador|'));
  // algo marcante acabou de acontecer: ela quer entender (vai perguntar à caixinha)
  const intrigada = /saltou da água|enjoo|picaram|picadas|não sobrou|contradiz|rasante|sono pesado/.test(memory.lastResult);
  const viuGoPro = G.gopro && (vis.includes(G.gopro) || state.mapa[G.gopro.id]);
  // momentos "fotogênicos": pôr do sol, algo que ela gosta à vista, ou algo que acabou de descobrir
  const lindo = state.clock > 0.7 && state.clock < 0.78 && !raining;
  const gosto = vis.find(o => o !== jac && Object.keys(TYPES[o.type].efeitos).some(a => bom(a, o.type)));
  if (s.bexiga > 75) acao = 'necessidades';
  else if (viuGoPro && Math.random() < 0.5) { acao = vis.includes(G.gopro) && Math.random() < 0.7 ? 'pegar' : 'investigar'; alvo = G.gopro.id; }
  else if (pcVisto && !sabePc && Math.random() < 0.4) { acao = 'investigar'; alvo = pc.id; }
  else if (pcVisto && sabePc && (s.tedio > 45 || Math.random() < (intrigada ? 0.6 : 0.2))) { acao = 'pesquisar'; alvo = pc.id; }
  else if ((s.tedio > 50 && Math.random() < 0.6) || Math.random() < 0.1) acao = 'explorar';   // viagem longa para uma região nova
  else if (state.temCamera && (lindo || gosto || (vis.includes(jac) && jac.mode === 'sol')) && Math.random() < 0.3) {
    acao = 'fotografar'; alvo = lindo ? null : vis.includes(jac) && jac.mode === 'sol' ? jac.id : gosto.id;
  }
  else if (acao !== 'vagar') {}
  else if (s.frio > 65 && (alvo = find(isNight() || raining ? 'dormir' : 'sentar', ['abrigo', 'caverna', 'pedra'])?.id)) acao = isNight() || raining ? 'dormir' : 'sentar';
  else if (s.energia < 25) { const c = find('dormir', ['abrigo', 'caverna']); acao = 'dormir'; alvo = c ? c.id : null; }
  else if (s.sede > 55 && (alvo = find('beber', ['lago', 'lagoa', 'riacho', 'fonte'])?.id)) acao = 'beber';
  else if (s.fome > 55 && (alvo = find('comer', ['arvore_frutas', 'cogumelo_marrom', 'cogumelo_vermelho', 'melancia', 'arbusto_amoras', 'capim_alto', 'arbusto_espinhos', 'arbusto_bagas_brancas'])?.id)) acao = 'comer';
  else {
    for (const o of vis) for (const a of Object.keys(TYPES[o.type].efeitos)) if (ok(a, o) && !(o === jac && medoJac) && !(medoJac && o.type === 'lago' && a === 'nadar' && Math.random() < 0.8)) opts.push([a, o.id]);
    // entediada: prefere o que nunca experimentou; se não houver, vai explorar longe
    if (s.tedio > 55) { const novas = opts.filter(([a, id]) => !state.crencas[a + ':' + objects.find(o => o.id === id)?.type]); opts = novas.length ? novas : [['vagar', null]]; }
    opts.push(['vagar', null], ['vagar', null]);
    if (s.humor < 50 && s.frio < 50 && !medoJac && find('nadar', ['lago', 'lagoa'])) opts.push(['nadar', find('nadar', ['lago', 'lagoa']).id], ['nadar', find('nadar', ['lago', 'lagoa']).id]);
    if (jacPerto) opts.push(['fugir', jac.id]);
    [acao, alvo] = pick(opts);
  }
  if (acao === 'dormir' && !alvo && s.energia > 25) acao = 'vagar';
  const alvoTipo = alvo && objects.find(o => o.id === alvo)?.type;
  const [novo, visto, emoji] = pick(FRASES[acao] || FRASES.vagar);
  const conhece = alvoTipo && state.descobertas.some(d => d.startsWith(acao + ':' + alvoTipo + '|'));
  // sem alvo, as duas frases servem; nunca repete o pensamento anterior
  const opcoes = (FRASES[acao] || FRASES.vagar).flatMap(([nv, vs]) => !alvoTipo ? [nv, vs] : [conhece ? vs : nv])
    .map(t => cap(t.replaceAll('{N}', cap(alvoTipo ? nomeDe(alvoTipo) : 'isto')).replaceAll('{n}', alvoTipo ? nomeDe(alvoTipo) : 'isto')));
  if (acao === 'vagar') { const ent = s.tedio > 55; opcoes.splice(0, opcoes.length, ...(ent ? FRASES.vagar[0].slice(0, 2) : FRASES.vagar.slice(1).flatMap(f => f.slice(0, 2)))); }
  const pensamento = pick(opcoes.filter(t => t !== lastOfflineThought).length ? opcoes.filter(t => t !== lastOfflineThought) : opcoes);
  lastOfflineThought = pensamento;
  let aprendizado = null;
  const last = memory.history.at(-1) || '';
  const lastTipo = Object.keys(TYPES).find(t => last.includes(TYPES[t].nome));
  if (lastTipo && /fome diminuiu|matou|encheu|sede passou|Geladinha|limpa, fria|maravilhosa|reparador|Recuperou/.test(memory.lastResult) && Math.random() < 0.6)
    aprendizado = cap(LICAO[last.split(' ')[0].replace(':', '')]?.replaceAll('{n}', nomeDe(lastTipo)) || `${nomeDe(lastTipo)} parece bom. Vou lembrar.`);
  if (/não sobrou nada/.test(memory.lastResult) && lastTipo) aprendizado = cap(`${nomeDe(lastTipo)} acaba quando como muito. Preciso esperar crescer de novo ou procurar outro.`);
  if (/saltou da água/.test(memory.lastResult)) aprendizado = cap(`Existe um bicho de dentes escondido em ${nomeDe('lago')}. Vou chamar de ${nomeDe('jacare')}. Preciso olhar antes de chegar perto.`);
  if (G.lastContradiction) {
    const [a, t] = G.lastContradiction.key.split(':');
    aprendizado = G.lastContradiction.res === 'ruim'
      ? cap(`Pensei que ${a} ${nomeDe(t)} era sempre bom, mas desta vez fez mal. Nem tudo se repete igual.`)
      : cap(`${nomeDe(t)} já me fez mal, mas desta vez foi bom. Talvez dependa de algo que ainda não entendi.`);
    G.lastContradiction = null;
  }
  if (/enjoo/.test(memory.lastResult)) { aprendizado = `Comer ${nomeDe('cogumelo_vermelho')} me deixou enjoada. Não vou repetir.`; offlineBad.add('cogumelo_vermelho'); }
  if (/furaram|espetou/.test(memory.lastResult)) { aprendizado = cap(`${nomeDe('arbusto_espinhos')} machuca o focinho. As frutinhas amarelas não compensam.`); offlineBad.add('arbusto_espinhos'); }
  if (/sonolência/.test(memory.lastResult)) { aprendizado = cap(`${nomeDe('arbusto_bagas_brancas')} dá um sono pesado.`); offlineBad.add('arbusto_bagas_brancas'); }
  // vlog: ela grava momentos novos, bonitos, na água, de longe do jacaré ou no computador
  let gravar = false, narracao = null;
  if (state.temCamera && !['dormir', 'necessidades', 'fotografar'].includes(acao)) {
    const motivo = lindo ? 'lindo' : acao === 'nadar' ? 'nadar' : alvo === jac.id ? 'jac' : acao === 'pesquisar' ? 'pc' : acao === 'explorar' ? 'explorar' : alvoTipo && !conhece ? 'novo' : null;
    if (motivo && Math.random() < 0.55) {
      gravar = true;
      const nome = alvoTipo ? nomeDe(alvoTipo) : 'isto';
      narracao = cap(pick(NARR[motivo]).replaceAll('{n}', nome).replaceAll('{acao}', VERBO[acao] || acao));
    }
  }
  return { pensamento, emoji: acao === 'vagar' && s.tedio > 55 ? '🥱' : emoji, acao, alvo, aprendizado, gravar, narracao };
}

export { FORMATO, PERSONALIDADE, callAI, cap, memory, nomeDe, normalizeDecision, offlineBrain };
