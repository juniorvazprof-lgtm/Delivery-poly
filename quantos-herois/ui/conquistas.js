const CHAVE = 'qh_conquistas_v1';
const PREFIXO = 'cq-';

export const CONQUISTAS = [
  { id: 'solo', icone: '🦸', nome: 'Um Contra Todos', desc: 'Vença uma batalha enviando apenas 1 herói.' },
  { id: 'intacto', icone: '🛡️', nome: 'Sem Baixas', desc: 'Vença uma batalha sem perder nenhum herói.' },
  { id: 'tres_estrelas', icone: '⭐', nome: 'Primeira Estrela', desc: 'Consiga 3 estrelas em uma batalha pela primeira vez.' },
  { id: 'tres_seguidas', icone: '🌟', nome: 'Sequência Brilhante', desc: 'Consiga 3 estrelas em 3 batalhas seguidas.' },
  { id: 'chefe', icone: '👹', nome: 'Matador de Chefes', desc: 'Vença o chefe da rodada 10.' },
  { id: 'jornada', icone: '🏆', nome: 'Jornada Completa', desc: 'Vença a rodada 10 e complete a jornada.' },
  { id: 'rapido', icone: '⚡', nome: 'Relâmpago', desc: 'Vença uma batalha em menos de 8 segundos.' },
  { id: 'rico', icone: '💰', nome: 'Bolso Cheio', desc: 'Junte 200 de ouro de uma vez.' },
  { id: 'baus', icone: '🎁', nome: 'Caçador de Baús', desc: 'Abra 5 baús em uma mesma jornada.' },
  { id: 'evolucao', icone: '🔮', nome: 'Evolução', desc: 'Evolua um herói.' },
  { id: 'classes', icone: '🎭', nome: 'Time Variado', desc: 'Tenha 5 classes diferentes no elenco.' },
  { id: 'volta', icone: '💪', nome: 'A Volta Por Cima', desc: 'Vença logo após uma derrota.' },
  { id: 'trombeta', icone: '📯', nome: 'Trombeta da Ressurreição', desc: 'Use a Trombeta da Ressurreição.' },
  { id: 'diario', icone: '📅', nome: 'Desafio do Dia', desc: 'Conclua o desafio do dia.' },
];

const MAPA = {};
for (const c of CONQUISTAS) MAPA[c.id] = c;

let memoria = null;
let fila = [];
let processando = false;

function carregar() {
  if (memoria) return memoria;
  memoria = {};
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        for (const k in obj) {
          if (MAPA[k] && typeof obj[k] === 'number') memoria[k] = obj[k];
        }
      }
    }
  } catch (e) {}
  return memoria;
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(memoria || {}));
  } catch (e) {}
}

function desbloquear(id) {
  const m = carregar();
  if (m[id]) return false;
  m[id] = Date.now();
  salvar();
  return true;
}

function somaMortos(mortos) {
  if (!mortos) return 0;
  let s = 0;
  for (const k in mortos) s += Number(mortos[k]) || 0;
  return s;
}

function contarClasses(elenco) {
  if (!elenco) return 0;
  let n = 0;
  for (const k in elenco) if (Number(elenco[k]) > 0) n++;
  return n;
}

export function avaliar(evento, dados) {
  const novas = [];
  const d = dados || {};
  const run = d.run || {};
  const rel = d.relatorio || {};

  const tentar = (id, cond) => {
    if (cond && desbloquear(id)) {
      const c = MAPA[id];
      if (c) novas.push(c);
    }
  };

  if (evento === 'batalha') {
    const vitoria = !!rel.vitoria;
    const estrelas = Number(rel.estrelas) || 0;
    const enviados = d.enviados || {};
    let totalEnviados = 0;
    for (const k in enviados) totalEnviados += Number(enviados[k]) || 0;

    if (vitoria) {
      tentar('solo', totalEnviados === 1);
      tentar('intacto', somaMortos(rel.mortos) === 0);
      tentar('tres_estrelas', estrelas >= 3);
      tentar('rapido', Number(rel.tempo) < 8);
      if (Number(run.rodada) === 10) {
        tentar('chefe', true);
        tentar('jornada', true);
      }
      const hist = Array.isArray(run.historico) ? run.historico : [];
      if (hist.length >= 2) {
        const a = hist[hist.length - 1];
        const b = hist[hist.length - 2];
        const c = hist[hist.length - 3];
        if (a && b && c && Number(a.estrelas) >= 3 && Number(b.estrelas) >= 3 && Number(c.estrelas) >= 3) {
          tentar('tres_seguidas', true);
        }
      }
      if (hist.length >= 1) {
        const ultima = hist[hist.length - 1];
        if (ultima && ultima.vitoria === false) {
          tentar('volta', true);
        }
      }
    }

    if (Number(run.ouro) >= 200) tentar('rico', true);
    if (contarClasses(run.elenco) >= 5) tentar('classes', true);
  } else if (evento === 'bau') {
    try {
      run.bausAbertos = (Number(run.bausAbertos) || 0) + 1;
    } catch (e) {}
    if (Number(run.bausAbertos) >= 5) tentar('baus', true);
  } else if (evento === 'evoluir') {
    tentar('evolucao', true);
  } else if (evento === 'trombeta') {
    tentar('trombeta', true);
  } else if (evento === 'fimJornada') {
    if (d.vitoriaFinal) {
      tentar('jornada', true);
      tentar('chefe', true);
    }
    if (d.diario) tentar('diario', true);
  }

  return novas;
}

export function estado() {
  const m = carregar();
  const desbloqueadas = {};
  let feitas = 0;
  for (const c of CONQUISTAS) {
    if (m[c.id]) {
      desbloqueadas[c.id] = m[c.id];
      feitas++;
    }
  }
  return { desbloqueadas, total: CONQUISTAS.length, feitas };
}

function injetarEstilo() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PREFIXO + 'style')) return;
  const st = document.createElement('style');
  st.id = PREFIXO + 'style';
  st.textContent = `
.${PREFIXO}wrap{position:fixed;top:calc(env(safe-area-inset-top,0px) + 12px);left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;}
.${PREFIXO}toast{background:#fff4dc;border:3px solid #2a1a12;border-radius:14px;box-shadow:0 4px 0 #2a1a12;padding:10px 16px;display:flex;align-items:center;gap:10px;font-family:system-ui,-apple-system,sans-serif;color:#2a1a12;max-width:90vw;opacity:0;transform:translateY(-120%);transition:transform 300ms ease,opacity 300ms ease;}
.${PREFIXO}toast.${PREFIXO}in{opacity:1;transform:translateY(0);}
.${PREFIXO}ico{font-size:32px;line-height:1;}
.${PREFIXO}txt{display:flex;flex-direction:column;line-height:1.15;}
.${PREFIXO}small{font-size:11px;text-transform:uppercase;letter-spacing:.5px;opacity:.75;}
.${PREFIXO}nome{font-weight:700;font-size:15px;}
@media (prefers-reduced-motion: reduce){.${PREFIXO}toast{transition:none;transform:none;opacity:1;}}
.${PREFIXO}painel{font-family:system-ui,-apple-system,sans-serif;color:#2a1a12;background:#fdf6e8;border:3px solid #2a1a12;border-radius:16px;padding:14px;box-shadow:0 4px 0 #2a1a12;}
.${PREFIXO}titulo{font-weight:800;font-size:18px;margin:0 0 12px;}
.${PREFIXO}grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;}
.${PREFIXO}card{background:#fff4dc;border:3px solid #2a1a12;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:4px;box-shadow:0 3px 0 #2a1a12;}
.${PREFIXO}card.${PREFIXO}bloq{background:#e6e0d4;color:#8a8175;box-shadow:0 3px 0 #b8b0a2;border-color:#8a8175;}
.${PREFIXO}card.${PREFIXO}bloq .${PREFIXO}cardIco{filter:grayscale(1);opacity:.5;}
.${PREFIXO}cardIco{font-size:26px;line-height:1;}
.${PREFIXO}cardNome{font-weight:700;font-size:13px;}
.${PREFIXO}cardDesc{font-size:11px;line-height:1.25;opacity:.85;}
`;
  document.head.appendChild(st);
}

function obterWrap(container) {
  if (!container) return null;
  let wrap = container.querySelector('.' + PREFIXO + 'wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = PREFIXO + 'wrap';
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(wrap);
  }
  return wrap;
}

function processarFila() {
  if (processando) return;
  if (!fila.length) return;
  processando = true;
  const item = fila.shift();
  const { wrap, conquista } = item;
  const toast = document.createElement('div');
  toast.className = PREFIXO + 'toast';
  const ico = document.createElement('div');
  ico.className = PREFIXO + 'ico';
  ico.textContent = conquista.icone;
  const txt = document.createElement('div');
  txt.className = PREFIXO + 'txt';
  const small = document.createElement('div');
  small.className = PREFIXO + 'small';
  small.textContent = 'Conquista!';
  const nome = document.createElement('div');
  nome.className = PREFIXO + 'nome';
  nome.textContent = conquista.nome;
  txt.appendChild(small);
  txt.appendChild(nome);
  toast.appendChild(ico);
  toast.appendChild(txt);
  wrap.appendChild(toast);

  const reduzido = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduzido) {
    toast.classList.add(PREFIXO + 'in');
  } else {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add(PREFIXO + 'in'));
    });
  }

  setTimeout(() => {
    if (!reduzido) toast.classList.remove(PREFIXO + 'in');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      processando = false;
      processarFila();
    }, reduzido ? 0 : 320);
  }, 2600);
}

export function mostrarToast(container, conquista) {
  if (!container || !conquista) return;
  injetarEstilo();
  const wrap = obterWrap(container);
  if (!wrap) return;
  fila.push({ wrap, conquista });
  if (!processando) {
    setTimeout(processarFila, 0);
  }
}

export function painelConquistas(container) {
  injetarEstilo();
  const m = carregar();
  const painel = document.createElement('div');
  painel.className = PREFIXO + 'painel';

  let feitas = 0;
  for (const c of CONQUISTAS) if (m[c.id]) feitas++;

  const titulo = document.createElement('div');
  titulo.className = PREFIXO + 'titulo';
  titulo.textContent = 'Conquistas ' + feitas + '/' + CONQUISTAS.length;
  painel.appendChild(titulo);

  const grade = document.createElement('div');
  grade.className = PREFIXO + 'grade';

  for (const c of CONQUISTAS) {
    const desbloqueada = !!m[c.id];
    const card = document.createElement('div');
    card.className = PREFIXO + 'card' + (desbloqueada ? '' : ' ' + PREFIXO + 'bloq');

    const ico = document.createElement('div');
    ico.className = PREFIXO + 'cardIco';
    ico.textContent = desbloqueada ? c.icone : '❓';

    const nome = document.createElement('div');
    nome.className = PREFIXO + 'cardNome';
    nome.textContent = desbloqueada ? c.nome : '???';

    const desc = document.createElement('div');
    desc.className = PREFIXO + 'cardDesc';
    desc.textContent = desbloqueada ? c.desc : 'Conquista bloqueada.';

    card.appendChild(ico);
    card.appendChild(nome);
    card.appendChild(desc);
    grade.appendChild(card);
  }

  painel.appendChild(grade);

  if (container && container.appendChild) {
    container.appendChild(painel);
  }
  return painel;
}