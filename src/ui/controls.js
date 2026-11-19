// Barra de controles do aluno-apresentador (rodapé fixo).
// Só createElement/textContent — nada de innerHTML com dados.

const VELOCIDADES = [0.25, 0.5, 1, 2];
const ROTULOS_VELOCIDADE = {
  0.25: '0,25×',
  0.5: '0,5×',
  1: '1×',
  2: '2×',
};
const CENARIOS = [
  ['lanchonete', 'Lanchonete'],
  ['petshop', 'Pet Shop'],
  ['escola', 'Escola'],
  ['banda', 'Banda'],
];
const CLASSES_STATUS = {
  offline: 'ctrl-bolinha-offline',
  online: 'ctrl-bolinha-online',
  falha: 'ctrl-bolinha-falha',
};

// Todas as bolinhas de status criadas (para setStatusModo atualizar todas).
const bolinhas = new Set();

function aplicarStatus(bolinha, estado) {
  bolinha.classList.remove(
    CLASSES_STATUS.offline,
    CLASSES_STATUS.online,
    CLASSES_STATUS.falha
  );
  bolinha.classList.add(CLASSES_STATUS[estado] || CLASSES_STATUS.desconhecido);
  bolinha.dataset.status = estado;
  const titulos = { offline: 'Offline', online: 'Online', falha: 'Falha na conexão' };
  bolinha.title = titulos[estado] || 'Status';
}

/** Atualiza a bolinha de status: 'offline' | 'online' | 'falha' (outro = cinza). */
export function setStatusModo(estado) {
  for (const bolinha of bolinhas) aplicarStatus(bolinha, estado);
}

function criarBotao(rotulo, titulo, aoClicar, classes = []) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = ['ctrl-btn', ...classes].join(' ');
  botao.textContent = rotulo;
  if (titulo) botao.title = titulo;
  botao.addEventListener('click', (ev) => {
    ev.preventDefault();
    aoClicar();
  });
  return botao;
}

function criarSeletor(opcoes, aoMudar) {
  const select = document.createElement('select');
  select.className = 'ctrl-select';
  for (const [valor, rotulo] of opcoes) {
    const opcao = document.createElement('option');
    opcao.value = valor;
    opcao.textContent = rotulo;
    select.append(opcao);
  }
  select.addEventListener('change', () => aoMudar(select.value));
  return select;
}

// Teclado não deve roubar teclas quando o aluno está digitando/escolhendo.
function focoEmCampo(alvo) {
  if (!alvo || !alvo.tagName) return false;
  const tag = alvo.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'select' ||
    tag === 'textarea' ||
    alvo.isContentEditable === true
  );
}

export function criarControles(relogio, acoes = {}) {
  const chamar = (nome, ...args) => {
    const fn = acoes[nome];
    if (typeof fn === 'function') fn(...args);
  };

  const raiz = document.createElement('div');
  raiz.id = 'controles';
  raiz.className = 'ctrl-barra';
  raiz.setAttribute('role', 'toolbar');
  raiz.setAttribute('aria-label', 'Controles da simulação');

  // ⏯ Play / Pausa
  const btnPlay = criarBotao('⏯ Play', 'Play / Pausa (Espaço)', () => {
    relogio.alternar();
  }, ['ctrl-btn-play']);
  btnPlay.setAttribute('aria-pressed', 'false');

  // Velocidades
  const grupoVel = document.createElement('div');
  grupoVel.className = 'ctrl-grupo';
  const botoesVel = new Map();
  for (const v of VELOCIDADES) {
    const botao = criarBotao(
      ROTULOS_VELOCIDADE[v],
      `Velocidade ${ROTULOS_VELOCIDADE[v]}`,
      () => relogio.setVelocidade(v),
      ['ctrl-btn-vel']
    );
    botao.dataset.velocidade = String(v);
    botoesVel.set(v, botao);
    grupoVel.append(botao);
  }

  // Etapas
  const btnAnterior = criarBotao('⏮ Anterior', 'Etapa anterior (←)', () => chamar('anterior'));
  const btnProxima = criarBotao('⏭ Próxima', 'Próxima etapa (→)', () => chamar('proxima'));
  const btnReiniciar = criarBotao('🔄 Reiniciar', 'Reiniciar cenário (R)', () => chamar('reiniciar'));

  // Cenário
  const rotuloCenario = document.createElement('label');
  rotuloCenario.className = 'ctrl-campo';
  const iconeCenario = document.createElement('span');
  iconeCenario.className = 'ctrl-icone';
  iconeCenario.textContent = '📂';
  const selCenario = criarSeletor(CENARIOS, (valor) => chamar('cenario', valor));
  rotuloCenario.append(iconeCenario, selCenario);

  // Modo + bolinha de status
  const rotuloModo = document.createElement('label');
  rotuloModo.className = 'ctrl-campo';
  const iconeModo = document.createElement('span');
  iconeModo.className = 'ctrl-icone';
  iconeModo.textContent = '🌐';
  const selModo = criarSeletor(
    [
      ['offline', 'Offline'],
      ['online', 'Online'],
    ],
    (valor) => {
      setStatusModo(valor === 'online' ? 'online' : 'offline');
      chamar('modo', valor);
    }
  );
  const bolinha = document.createElement('span');
  bolinha.className = 'ctrl-bolinha';
  bolinha.setAttribute('aria-hidden', 'true');
  aplicarStatus(bolinha, 'offline');
  bolinhas.add(bolinha);
  rotuloModo.append(iconeModo, selModo, bolinha);

  // Seguir agente ativo
  const rotuloSeguir = document.createElement('label');
  rotuloSeguir.className = 'ctrl-campo ctrl-toggle';
  const checkSeguir = document.createElement('input');
  checkSeguir.type = 'checkbox';
  checkSeguir.className = 'ctrl-check';
  checkSeguir.id = 'ctrl-seguir';
  const textoSeguir = document.createElement('span');
  textoSeguir.textContent = '🎥 Seguir agente ativo';
  checkSeguir.addEventListener('change', () => chamar('seguir', checkSeguir.checked));
  rotuloSeguir.append(checkSeguir, textoSeguir);

  raiz.append(
    btnPlay,
    grupoVel,
    btnAnterior,
    btnProxima,
    btnReiniciar,
    rotuloCenario,
    rotuloModo,
    rotuloSeguir
  );

  // Sincroniza a aparência com o estado do relógio.
  function sincronizar(estado = relogio) {
    const pausado = Boolean(estado.pausado);
    btnPlay.textContent = pausado ? '▶ Continuar' : '⏸ Pausar';
    btnPlay.setAttribute('aria-pressed', String(pausado));
    btnPlay.classList.toggle('ctrl-pausado', pausado);
    for (const [v, botao] of botoesVel) {
      const ativo = v === estado.velocidade;
      botao.classList.toggle('ctrl-ativo', ativo);
      botao.setAttribute('aria-pressed', String(ativo));
    }
  }

  const pararDeOuvir = relogio.aoMudar ? relogio.aoMudar(() => sincronizar()) : () => {};
  sincronizar();

  // Atalhos de teclado.
  function aoTecla(ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (focoEmCampo(ev.target)) return;
    const tecla = ev.key;
    if (tecla === ' ' || tecla === 'Spacebar' || ev.code === 'Space') {
      ev.preventDefault();
      relogio.alternar();
      return;
    }
    if (tecla >= '1' && tecla <= '4') {
      ev.preventDefault();
      relogio.setVelocidade(VELOCIDADES[Number(tecla) - 1]);
      return;
    }
    if (tecla === 'ArrowRight') {
      ev.preventDefault();
      chamar('proxima');
      return;
    }
    if (tecla === 'ArrowLeft') {
      ev.preventDefault();
      chamar('anterior');
      return;
    }
    if (tecla === 'r' || tecla === 'R') {
      ev.preventDefault();
      chamar('reiniciar');
    }
  }

  document.addEventListener('keydown', aoTecla);

  function destruir() {
    document.removeEventListener('keydown', aoTecla);
    pararDeOuvir();
    bolinhas.delete(bolinha);
    if (raiz.parentNode) raiz.parentNode.removeChild(raiz);
  }

  return {
    elemento: raiz,
    botoes: { play: btnPlay, anterior: btnAnterior, proxima: btnProxima, reiniciar: btnReiniciar },
    seletores: { cenario: selCenario, modo: selModo },
    seguir: checkSeguir,
    bolinha,
    sincronizar,
    setStatusModo,
    destruir,
  };
}
