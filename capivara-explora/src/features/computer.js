// Computador: pesquisa na Wikipédia e enciclopédia offline.
// (módulo 14/20 da Capivara Explora)
import { G, H } from '../core/runtime.js';
import { pick, state } from '../core/config.js';
import { pc } from '../world/objects.js';
import { capy } from '../capy/capybara.js';
import { gameWait } from '../world/simulation.js';
import { memory } from '../brain/brain.js';
import { applyDeltas, approachPoint, faceTowards, walkTo } from '../brain/actions.js';

// ---------------------------------------------------------------------
// COMPUTADOR: pesquisa na Wikipédia (sem chave, funciona no navegador).
// Sem internet (ou no artifact do claude.ai), usa uma pequena enciclopédia embutida.
// ---------------------------------------------------------------------
const ENCICLOPEDIA = [
  [['capivara'], 'Capivara', 'A capivara é o maior roedor do mundo. Vive perto de rios e lagos, nada muito bem e passa boa parte do dia descansando e pastando.'],
  [['jacaré', 'dentes', 'água'], 'Jacaré', 'Jacarés são répteis que vivem em rios, lagos e brejos. Ficam quase submersos, com só os olhos e as narinas para fora, esperando presas que chegam para beber.'],
  [['formiga', 'montinho', 'pontinhos'], 'Formiga', 'Formigas vivem em colônias organizadas. Algumas espécies picam e soltam ácido fórmico para defender o ninho.'],
  [['teia', 'aranha', 'fios'], 'Teia de aranha', 'A teia é feita de seda produzida pela própria aranha. O fio é muito fino, mas proporcionalmente mais resistente que o aço.'],
  [['caramujo', 'espiral', 'concha'], 'Caramujo', 'Caramujos são moluscos que carregam uma concha em espiral. Recolhem-se nela quando se sentem ameaçados.'],
  [['cogumelo', 'chapéu', 'pintas'], 'Amanita muscaria', 'É um cogumelo de chapéu vermelho com pintas brancas. É bonito, mas venenoso: causa enjoo e mal-estar se for comido.'],
  [['trevo', 'três folhas'], 'Trevo', 'O trevo é uma planta baixa de folhas divididas em três. É comida apreciada por muitos herbívoros.'],
  [['amora', 'roxa'], 'Amora', 'A amora é um fruto pequeno, escuro e doce, formado por várias bolinhas unidas.'],
  [['pinha', 'escamas'], 'Pinha', 'A pinha é a estrutura onde ficam as sementes do pinheiro. É dura e lenhosa.'],
  [['ninho', 'pássaro', 'ovo'], 'Ninho', 'Pássaros constroem ninhos com gravetos e folhas para chocar os ovos. Os pais defendem o ninho de qualquer bicho que se aproxima.'],
  [['noite', 'escuro', 'estrela', 'céu'], 'Noite', 'A noite acontece quando o lado da Terra onde estamos fica de costas para o Sol. Sem a luz dele, dá para ver as estrelas.'],
  [['chuva', 'nuvem'], 'Chuva', 'A chuva é água que evapora, forma nuvens e volta a cair quando as gotas ficam pesadas.'],
  [['vaga-lume', 'luzinha', 'luz'], 'Vaga-lume', 'Vaga-lumes produzem luz no próprio corpo para se comunicar, principalmente para encontrar parceiros à noite.'],
  [['foto', 'imagem', 'câmera'], 'Fotografia', 'Fotografia é guardar a luz de um momento. A primeira foto conhecida foi feita em 1826 e precisou de horas de exposição.'],
  [['sol', 'pôr', 'tarde'], 'Pôr do sol', 'No fim da tarde a luz do Sol atravessa mais ar até chegar aos olhos, e por isso o céu fica laranja e vermelho.'],
  [['cacto', 'espinho'], 'Cactaceae', 'Cactos guardam água dentro do caule grosso e têm espinhos no lugar das folhas, o que os protege de bichos com sede.'],
  [['taboa', 'espiga', 'brejo'], 'Taboa', 'A taboa cresce em brejos e beiras de lagoa. Tem folhas longas e uma espiga marrom; sua base é macia e comestível.'],
  [['samambaia'], 'Samambaia', 'Samambaias são plantas antigas, que existem há mais de 300 milhões de anos. Gostam de sombra e umidade.'],
  [['cristal', 'quartzo', 'pedra transparente'], 'Quartzo', 'O quartzo é um mineral transparente que se forma em cristais de seis lados. Quando a luz o atravessa, pode se separar em cores.'],
  [['lagoa', 'poça'], 'Lagoa', 'Lagoas são corpos de água rasos e parados, cheios de plantas e pequenos animais.'],
  [['frio', 'temperatura'], 'Hipotermia', 'Animais perdem calor mais rápido quando estão molhados ou no vento. Abrigar-se e ficar seco ajuda a manter a temperatura.'],
];
const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Uma chamada só: busca + resumo (as 2 primeiras frases do artigo). Funciona direto do navegador (origin=*).
const WIKI = q => `https://pt.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(q)}&prop=extracts&exintro=1&explaintext=1&exsentences=2`;
const STOP = new Set('a o as os um uma de do da dos das e é em no na nos nas por para que qual quais como porque por que se sobre com sem ao à isso isto este esta esse essa meu minha'.split(' '));
// palavras-chave: as últimas costumam ser o assunto ("... por que tem dentes o jacaré" -> "jacare")
const palavras = q => q.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(norm(w)));
async function buscaWiki(q, signal) {
  const j = await fetch(WIKI(q), { signal }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  const pg = Object.values(j?.query?.pages || {})[0];
  return pg ? { titulo: pg.title, resumo: (pg.extract || '').replace(/\s+/g, ' ').slice(0, 340), fonte: 'Wikipédia' } : null;
}
async function pesquisarWeb(q) {
  const ctrl = new AbortController(), tm = setTimeout(() => ctrl.abort(), 9000);
  try {
    // 1) a frase como ela escreveu; 2) só as palavras-chave (frases longas costumam não achar nada)
    let r = await buscaWiki(q, ctrl.signal);
    const ws = palavras(q);
    const tentativas = [ws.slice(-2).join(' '), ws.slice(-1)[0], [...ws].sort((a, b) => b.length - a.length)[0]].filter((t, i, a) => t && t !== q.toLowerCase() && a.indexOf(t) === i);
    for (const t of tentativas) { if (r) break; r = await buscaWiki(t, ctrl.signal); }
    if (r) return r;
    return { titulo: null, resumo: '', fonte: 'Wikipédia' };
  } catch (e) {
    console.warn('Wikipédia indisponível, usando a enciclopédia embutida:', e?.message);
    const nq = norm(q), hit = ENCICLOPEDIA.find(([ks]) => ks.some(k => nq.includes(norm(k))));
    return hit ? { titulo: hit[1], resumo: hit[2], fonte: 'memória da caixinha (sem internet)' } : { titulo: null, resumo: '', fonte: 'sem internet' };
  } finally { clearTimeout(tm); }
}
// o que ela pesquisaria sozinha (modo offline): coisas que viveu ou que a intrigam
const PERGUNTAS = { jacare: 'jacaré', formigueiro: 'formiga', teia: 'teia de aranha', caramujo: 'caramujo', cogumelo_vermelho: 'cogumelo vermelho com pintas brancas',
  trevo: 'trevo', arbusto_amoras: 'amora', cacto: 'cacto', taboa: 'taboa', samambaia: 'samambaia', pedra_brilhante: 'cristal de quartzo', lagoa: 'lagoa', pinha: 'pinha', ninho: 'ninho de pássaro', lago: 'por que a água do lago é calma' };
const CURIOSIDADES = ['capivara', 'por que fica escuro à noite', 'de onde vem a chuva', 'por que o céu fica laranja no fim da tarde', 'vaga-lume', 'como guardar imagens'];
function perguntaOffline() {
  const vividos = [...new Set(memory.keys.map(k => k.split(':')[1]))].filter(t => PERGUNTAS[t] && !state.pesquisas.some(p => p.q === PERGUNTAS[t]));
  const pool = vividos.length ? vividos.map(t => PERGUNTAS[t]) : CURIOSIDADES.filter(q => !state.pesquisas.some(p => p.q === q));
  return pick(pool.length ? pool : CURIOSIDADES);
}
async function doPesquisa(dec) {
  await walkTo(approachPoint(pc));
  faceTowards(pc.pos);
  capy.anim = 'digitar'; capy.animT = 0;
  const q = dec.pesquisa || perguntaOffline();
  const [r] = await Promise.all([pesquisarWeb(q), gameWait(3)]);
  state.pesquisas.push({ q, titulo: r.titulo, resumo: r.resumo }); state.pesquisas = state.pesquisas.slice(-12);
  // entrada estilo terminal no log
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  state.log.push({ t: `Dia ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} · caixinha-brilhante`, pc: true, acao: 'pesquisar',
    pensamento: `> ${q}\n${r.titulo ? `[${r.titulo}] ${r.resumo}` : 'Nenhum resultado.'}\n(${r.fonte})` });
  H.renderLog(true);
  H.discover('pesquisar:computador', 'perguntar à caixinha brilhante');
  G.lastOutcome = { key: 'pesquisar:computador', d: { humor: r.titulo ? 6 : 0 }, };
  applyDeltas({ humor: r.titulo ? +6 : 0, tedio: r.titulo ? -20 : -5 });
  return r.titulo ? `Você perguntou à caixinha brilhante "${q}" e ela mostrou: ${r.titulo}. ${r.resumo}` : `Você perguntou à caixinha brilhante "${q}", mas ela não mostrou nada.`;
}

// acesso tardio para módulos carregados antes deste
Object.defineProperties(H, {
  doPesquisa: { get: () => doPesquisa },
});
