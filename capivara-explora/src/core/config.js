// Configuração, estado salvo (localStorage), utilidades e gerador aleatório com semente.
// (módulo 1/20 da Capivara Explora)

// ---------------------------------------------------------------------
// 1. CONFIGURAÇÃO E PERSISTÊNCIA
// ---------------------------------------------------------------------
const DAY_LEN = 240;            // 1 dia = 4 minutos (segundos de jogo)
const HALF = 60;                // mundo 120x120 m, de -60 a 60 (gerado por semente)
const LIM = HALF - 4;           // área útil (borda de segurança)
const PERCEPTION_RADIUS = 15;
const MIN_CALL_INTERVAL = 4000; // ms entre chamadas à IA
const CALL_TIMEOUT = 10000;     // ms
const SAVE_KEY = 'capivara_explora_v1';
const CFG_KEY = 'capivara_explora_cfg';
const ACOES = ['ir_para', 'comer', 'beber', 'nadar', 'dormir', 'cheirar', 'sentar', 'investigar', 'fugir', 'vagar', 'necessidades', 'pegar', 'fotografar', 'pesquisar'];

// Cérebros: 'deepseek' (padrão), 'gemini' ou 'offline'. Cada provedor tem sua chave e modelo.
const cfg = Object.assign({ mode: 'deepseek', keys: { deepseek: '', gemini: '' },
  models: { deepseek: 'deepseek-flash', gemini: 'gemini-2.5-flash' } }, safeJSON(lsGet(CFG_KEY)) || {});
const PROVIDERS = { deepseek: 'DeepSeek', gemini: 'Gemini' };
const hasBrain = () => cfg.mode !== 'offline' && !!cfg.keys[cfg.mode];

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }

const defaultState = () => ({
  stats: { fome: 30, sede: 30, energia: 80, humor: 70 },
  day: 1, clock: 0.29,            // 0 = meia-noite, 0.5 = meio-dia
  aprendizados: [],               // memória de longo prazo (texto)
  descobertas: [],                // chaves "acao:tipo" ou "ver:tipo"
  log: [],
});
const state = Object.assign(defaultState(), safeJSON(lsGet(SAVE_KEY)) || {});
state.stats.frio ??= 10;       // temperatura: 0 = confortável, 100 = congelando
state.mapa ||= {};             // mapa mental: id → {t, x, z} de lugares já vistos
state.crencas ||= {};          // confiança: "acao:tipo" → {bom, ruim}
state.diario ||= [];           // diário escrito ao anoitecer
state.diaryDay ||= 0;
state.stats.bexiga ??= 10;     // vontade de fazer cocô/xixi (0-100)
state.stats.tedio ??= 20;      // tédio: sobe ao repetir, desce ao explorar coisas novas
state.trilhas ||= {};
state.pesquisas ||= [];        // o que leu no computador: {q, titulo, resumo}
state.temCamera ||= false;     // pegou a GoPro?          // desgaste do chão: "i,j" → passagens
// gerador aleatório com semente fixa: os objetos espalhados ficam sempre no mesmo lugar (o mapa mental continua válido)
// mundo novo = semente nova; um save antigo (sem semente) era do mapa fixo, então o mapa mental e as trilhas são zerados
const nextSeed = +lsGet('capivara_explora_seed_next');
if (!state.seed) { state.seed = nextSeed || (Math.random() * 1e9) | 0; state.mapa = {}; state.trilhas = {}; }
try { localStorage.removeItem('capivara_explora_seed_next'); } catch {}
let seed = state.seed;
const srand = (a, b) => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return a + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (b - a); };
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, log: state.log.slice(-30) }));
  } catch {}
}
setInterval(save, 8000);

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function smooth(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

// atalhos de interface e regras simples usados em vários módulos
const $ = id => document.getElementById(id);
const icon = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isNight = () => state.clock < 0.24 || state.clock > 0.8;
function periodName() {
  const h = state.clock * 24;
  return h < 5 ? 'madrugada' : h < 12 ? 'manhã' : h < 18 ? 'tarde' : h < 20 ? 'entardecer' : 'noite';
}
const pendingNotes = [];
const confianca = c => (c.bom + 1) / (c.bom + c.ruim + 2);   // 0..1, começa em 0,5 (incerteza)
const ruim = (a, t) => { const c = state.crencas[a + ':' + t]; return c && confianca(c) < 0.4; };
const bom = (a, t) => { const c = state.crencas[a + ':' + t]; return c && confianca(c) > 0.6; };

export { $, ACOES, CALL_TIMEOUT, CFG_KEY, DAY_LEN, HALF, LIM, MIN_CALL_INTERVAL, PERCEPTION_RADIUS, PROVIDERS, SAVE_KEY, bom, cfg, clamp, confianca, esc, hasBrain, icon, isNight, lerp, lsGet, pendingNotes, periodName, pick, rand, ruim, safeJSON, save, smooth, srand, state };
