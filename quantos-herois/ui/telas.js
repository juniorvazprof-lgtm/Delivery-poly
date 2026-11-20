import { HEROIS } from '../data/herois.js';
const EMOJI_INIMIGO = { goblin:'👺', slime:'🟢', slimeMedio:'🟢', slimePequeno:'🟢', reiSlime:'👑' };
const NOME_INIMIGO = { goblin:'Goblin', slime:'Slime', slimeMedio:'Slime Médio', slimePequeno:'Slime Pequeno', reiSlime:'Rei Slime' };
const EMOJI_CLASSE = { guerreiro:'⚔️', guardiao:'🛡️', piromante:'🔥', arqueiro:'🏹', clerigo:'✨' };

function el(tag, attrs, ...filhos){
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs){
    if (k === 'class') e.className = attrs[k];
    else if (k === 'style') e.style.cssText = attrs[k];
    else if (k.startsWith('on') && typeof attrs[k]) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
    else if (k === 'text') e.textContent = attrs[k];
    else if (k === 'html') e.innerHTML = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  for (const f of filhos){
    if (f == null) continue;
    if (typeof f === 'string' || typeof f === 'number') e.appendChild(document.createTextNode(String(f)));
    else e.appendChild(f);
  }
  return e;
}

function limpar(app){ while (app.firstChild) app.removeChild(app.firstChild); }

function barraTopo({ rodada, vida, vidaMax, ouro }){
  const barra = el('div', { class:'barra-topo' });
  if (rodada != null) barra.appendChild(el('div', { class:'chip rodada' }, `Rodada ${rodada}/10`));
  if (vida != null) barra.appendChild(el('div', { class:'chip vida' }, el('span', { class:'coracao' }, '♥'), ` ${vida}/${vidaMax}`));
  if (ouro != null) barra.appendChild(el('div', { class:'chip ouro' }, '🪙 ', String(ouro)));
  return barra;
}

function ilustracaoHerois(){
  return el('div', { class:'ilustracao', html:`
<svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b3b8c"/>
      <stop offset="1" stop-color="#2a1a12"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="400" height="320" rx="16" fill="url(#bg)" stroke="#2a1a12" stroke-width="6"/>
  <circle cx="200" cy="60" r="30" fill="#e3a92b" opacity="0.15"/>
  <circle cx="200" cy="60" r="18" fill="#e3a92b" opacity="0.3"/>
  <!-- Guerreiro -->
  <g transform="translate(80,180)">
    <ellipse cx="0" cy="70" rx="40" ry="8" fill="#000" opacity="0.4"/>
    <rect x="-22" y="20" width="44" height="50" rx="8" fill="#8e2b2b" stroke="#2a1a12" stroke-width="4"/>
    <circle cx="0" cy="0" r="26" fill="#f3e2b8" stroke="#2a1a12" stroke-width="4"/>
    <path d="M-26 -6 Q0 -40 26 -6 L26 4 Q0 -14 -26 4 Z" fill="#e3a92b" stroke="#2a1a12" stroke-width="4"/>
    <circle cx="-8" cy="2" r="3" fill="#2a1a12"/>
    <circle cx="8" cy="2" r="3" fill="#2a1a12"/>
    <path d="M-6 12 Q0 16 6 12" stroke="#2a1a12" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="26" y="10" width="6" height="40" fill="#c0c0c0" stroke="#2a1a12" stroke-width="3"/>
    <rect x="20" y="6" width="18" height="10" fill="#e3a92b" stroke="#2a1a12" stroke-width="3"/>
  </g>
  <!-- Guardião -->
  <g transform="translate(200,190)">
    <ellipse cx="0" cy="70" rx="40" ry="8" fill="#000" opacity="0.4"/>
    <rect x="-24" y="20" width="48" height="50" rx="8" fill="#4f9d4a" stroke="#2a1a12" stroke-width="4"/>
    <circle cx="0" cy="0" r="26" fill="#f3e2b8" stroke="#2a1a12" stroke-width="4"/>
    <path d="M-26 -6 Q0 -34 26 -6 L26 4 Q0 -14 -26 4 Z" fill="#c0c0c0" stroke="#2a1a12" stroke-width="4"/>
    <circle cx="-8" cy="2" r="3" fill="#2a1a12"/>
    <circle cx="8" cy="2" r="3" fill="#2a1a12"/>
    <path d="M-6 12 Q0 16 6 12" stroke="#2a1a12" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M-40 10 Q-40 -20 -30 -20 L-30 40 Q-40 40 -40 10 Z" fill="#e3a92b" stroke="#2a1a12" stroke-width="4"/>
  </g>
  <!-- Piromante -->
  <g transform="translate(320,180)">
    <ellipse cx="0" cy="70" rx="40" ry="8" fill="#000" opacity="0.4"/>
    <rect x="-22" y="20" width="44" height="50" rx="8" fill="#5b3b8c" stroke="#2a1a12" stroke-width="4"/>
    <circle cx="0" cy="0" r="26" fill="#f3e2b8" stroke="#2a1a12" stroke-width="4"/>
    <path d="M-30 -4 L0 -50 L30 -4 Z" fill="#5b3b8c" stroke="#2a1a12" stroke-width="4"/>
    <circle cx="-8" cy="2" r="3" fill="#2a1a12"/>
    <circle cx="8" cy="2" r="3" fill="#2a1a12"/>
    <path d="M-6 12 Q0 16 6 12" stroke="#2a1a12" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="30" r="10" fill="#d94a3a" stroke="#2a1a12" stroke-width="3"/>
    <circle cx="30" cy="30" r="4" fill="#e3a92b"/>
  </g>
</svg>` });
}

export function telaMenu(app, { temRun, aoNova, aoContinuar, aoComoJogar, aoRecordes }){
  limpar(app);
  const tela = el('div', { class:'tela' });
  const grid = el('div', { class:'menu-inicial' });
  const esq = el('div', { class:'menu-esq' });
  esq.appendChild(el('h1', { class:'menu-titulo' }, 'Quantos Heróis?'));
  esq.appendChild(el('div', { class:'menu-sub' }, 'Monte seu time. Arrisque menos. Ganhe mais.'));
  const botoes = el('div', { class:'menu-botoes' });
  botoes.appendChild(el('button', { class:'grande principal', onclick: aoNova }, 'Nova jornada'));
  if (temRun) botoes.appendChild(el('button', { class:'grande secundario', onclick: aoContinuar }, 'Continuar'));
  botoes.appendChild(el('button', { class:'secundario', onclick: aoComoJogar }, 'Como jogar'));
  botoes.appendChild(el('button', { class:'secundario', onclick: aoRecordes }, 'Melhores jornadas'));
  esq.appendChild(botoes);
  grid.appendChild(esq);
  const dir = el('div', { class:'menu-dir' });
  dir.appendChild(ilustracaoHerois());
  grid.appendChild(dir);
  tela.appendChild(grid);
  app.appendChild(tela);
}

export function telaDesafio(app, { run, opcoes, aoEscolher, aoVoltar }){
  limpar(app);
  const tela = el('div', { class:'tela' });
  tela.appendChild(barraTopo({ rodada: run.rodada, vida: run.baseVida, vidaMax: run.baseVidaMax, ouro: run.ouro }));
  const cont = el('div', { class:'conteudo' });
  const cartoes = el('div', { class:'cartoes' });
  for (const op of opcoes){
    const c = el('div', { class:'cartao', onclick: () => aoEscolher(op) });
    if (op.id === 'perigosa') c.appendChild(el('div', { class:'selo-perigoso' }, 'PERIGOSO'));
    if (op.id === 'chefe') c.appendChild(el('div', { class:'selo-perigoso selo-chefe' }, 'CHEFE'));
    c.appendChild(el('h3', null, op.titulo));
    const inimigos = el('div', { class:'inimigos' });
    for (const [tipo, qtd] of op.inimigos){
      inimigos.appendChild(el('span', { class:'inimigo-tag' }, `${EMOJI_INIMIGO[tipo] || '👾'} ${NOME_INIMIGO[tipo] || tipo} ×${qtd}`));
    }
    c.appendChild(inimigos);
    const meta = el('div', { class:'meta' });
    meta.appendChild(el('span', { class:'ideal' }, `Ideal: ${op.ideal} heróis`));
    meta.appendChild(el('span', { class:'premio' }, `Prêmio: ${op.premioBase} 🪙`));
    c.appendChild(meta);
    cartoes.appendChild(c);
  }
  cont.appendChild(cartoes);
  tela.appendChild(cont);
  const rodape = el('div', { class:'rodape-time' });
  rodape.appendChild(el('button', { class:'secundario', onclick: aoVoltar }, 'Voltar'));
  tela.appendChild(rodape);
  app.appendChild(tela);
}

export function telaTime(app, { run, opcao, disponiveis, estrelasCalc, custoSoldo, validar, aoMudar, aoLutar, aoVoltar, aoToggleChama }){
  limpar(app);
  const tela = el('div', { class:'tela' });
  tela.appendChild(barraTopo({ rodada: run.rodada, vida: run.baseVida, vidaMax: run.baseVidaMax, ouro: run.ouro }));
  const cont = el('div', { class:'conteudo' });
  const grid = el('div', { class:'escolha-time' });
  const painelIni = el('div', { class:'painel-inimigos' });
  painelIni.appendChild(el('h3', null, opcao.titulo));
  for (const [tipo, qtd] of opcao.inimigos){
    painelIni.appendChild(el('span', { class:'inimigo-tag' }, `${EMOJI_INIMIGO[tipo] || '👾'} ${NOME_INIMIGO[tipo] || tipo} ×${qtd}`));
  }
  painelIni.appendChild(el('div', { style:'margin-top:auto;font-size:.85rem;opacity:.85;font-weight:700;' }, `Ideal: ${opcao.ideal} heróis`));
  grid.appendChild(painelIni);

  const painelTime = el('div', { class:'painel-time' });
  const enviados = {};
  for (const classe in disponiveis){
    const info = disponiveis[classe];
    enviados[classe] = 0;
    const linha = el('div', { class:'linha-classe' });
    const infoDiv = el('div', { class:'info' });
    infoDiv.appendChild(el('div', { class:'nome' }, `${EMOJI_CLASSE[classe] || '🛡️'} ${info.nome}`));
    infoDiv.appendChild(el('div', { class:'papel' }, info.papel));
    const disp = el('div', { class:'disp' });
    disp.appendChild(document.createTextNode(`Disponíveis: ${info.disponiveis}/${info.total}`));
    if (info.desmaiados && info.desmaiados.length){
      disp.appendChild(document.createTextNode(' '));
      disp.appendChild(el('span', { class:'dorme' }, `💤 ${info.desmaiados.map(d => `volta na rodada ${d.volta}`).join(', ')}`));
    }
    infoDiv.appendChild(disp);
    linha.appendChild(infoDiv);
    const espaco = el('div');
    linha.appendChild(espaco);
    const contador = el('div', { class:'contador' });
    const btnMenos = el('button', { class:'secundario', onclick: () => { if (enviados[classe] > 0){ enviados[classe]--; atualizar(); } } }, '−');
    const valor = el('div', { class:'valor' }, '0');
    const btnMais = el('button', { class:'principal', onclick: () => { if (enviados[classe] < info.disponiveis){ enviados[classe]++; atualizar(); } } }, '+');
    const btnMax = el('button', { class:'secundario mini', 'aria-label': `Mandar todos os ${info.nome} disponíveis`, onclick: () => { enviados[classe] = info.disponiveis; atualizar(); } }, 'Máx');
    contador.appendChild(btnMenos);
    contador.appendChild(valor);
    contador.appendChild(btnMais);
    contador.appendChild(btnMax);
    linha.appendChild(contador);
    painelTime.appendChild(linha);
    linha._atualizar = () => { valor.textContent = String(enviados[classe]); };
  }
  grid.appendChild(painelTime);
  cont.appendChild(grid);
  tela.appendChild(cont);

  const rodape = el('div', { class:'rodape-time' });
  const statTotal = el('div', { class:'stat' });
  statTotal.appendChild(el('div', { class:'rotulo' }, 'Enviados'));
  const valTotal = el('div', { class:'valor' }, '0');
  statTotal.appendChild(valTotal);
  rodape.appendChild(statTotal);
  const statEstrelas = el('div', { class:'stat' });
  statEstrelas.appendChild(el('div', { class:'rotulo' }, 'Estrelas previstas'));
  const valEstrelas = el('div', { class:'estrelas' });
  statEstrelas.appendChild(valEstrelas);
  rodape.appendChild(statEstrelas);
  const statSoldo = el('div', { class:'stat' });
  statSoldo.appendChild(el('div', { class:'rotulo' }, 'Soldo'));
  const valSoldo = el('div', { class:'valor' }, '0 🪙');
  statSoldo.appendChild(valSoldo);
  rodape.appendChild(statSoldo);

  const acoes = el('div', { class:'acoes' });
  if (run.reliquias && run.reliquias.includes('chamaConcentrada')){
    const inter = el('div', { class:'interruptor' + (run.chamaLigada ? ' ligado' : ''), onclick: () => { aoToggleChama(); } });
    inter.appendChild(el('div', { class:'bolinha' }));
    inter.appendChild(el('span', null, 'Chama Concentrada'));
    acoes.appendChild(inter);
  }
  const motivo = el('div', { class:'motivo' }, '');
  acoes.appendChild(motivo);
  const btnTodos = el('button', { class:'secundario', onclick: () => { for (const c in disponiveis) enviados[c] = disponiveis[c].disponiveis; atualizar(); } }, 'Todos no máx');
  const btnZerar = el('button', { class:'secundario', onclick: () => { for (const c in enviados) enviados[c] = 0; atualizar(); } }, 'Zerar');
  acoes.appendChild(btnTodos);
  acoes.appendChild(btnZerar);
  const btnVoltar = el('button', { class:'secundario', onclick: aoVoltar }, 'Voltar');
  acoes.appendChild(btnVoltar);
  const btnLutar = el('button', { class:'grande principal', onclick: () => aoLutar(enviados) }, 'LUTAR!');
  acoes.appendChild(btnLutar);
  rodape.appendChild(acoes);
  tela.appendChild(rodape);
  app.appendChild(tela);

  function atualizar(){
    let total = 0;
    for (const c in enviados) total += enviados[c];
    for (const linha of painelTime.children) if (linha._atualizar) linha._atualizar();
    valTotal.textContent = String(total);
    const est = estrelasCalc(opcao, enviados);
    valEstrelas.innerHTML = '';
    for (let i = 0; i < 3; i++){
      valEstrelas.appendChild(el('span', { class: i < est ? '' : 'off' }, '★'));
    }
    const soldo = custoSoldo(enviados); // a função espera o objeto {classe: n}
    valSoldo.textContent = `${soldo} 🪙`;
    const v = validar(opcao, enviados);
    btnLutar.disabled = !v.ok;
    motivo.textContent = v.ok ? '' : v.motivo;
    aoMudar(enviados);
  }
  atualizar();
}

export function telaBatalha(app, { run, cfg, aoFim, aoConsumivel, aoSair }){
  limpar(app);
  const tela = el('div', { class:'tela tela-batalha' });
  const canvas = el('canvas');
  tela.appendChild(canvas);
  const hud = el('div', { class:'hud-batalha' });

  const topo = el('div', { class:'hud-topo' });
  const barraH = el('div', { class:'barra-forca herois' });
  const prefH = el('div', { class:'preench' });
  barraH.appendChild(prefH);
  const tempo = el('div', { class:'hud-tempo' }, '0.0s');
  const barraV = el('div', { class:'barra-forca viloes' });
  const prefV = el('div', { class:'preench' });
  barraV.appendChild(prefV);
  topo.appendChild(barraH);
  topo.appendChild(tempo);
  topo.appendChild(barraV);
  hud.appendChild(topo);

  const pote = el('div', { class:'hud-pote', id:'hud-pote' });
  pote.appendChild(el('span', { class:'moeda' }, '🪙'));
  const poteVal = el('span', null, '0');
  pote.appendChild(poteVal);
  hud.appendChild(pote);

  const painelHerois = el('div', { class:'hud-painel-herois' });
  hud.appendChild(painelHerois);

  const reliquias = el('div', { class:'hud-reliquias' });
  if (run.reliquias) for (const id of run.reliquias){
    reliquias.appendChild(el('div', { class:'rel', title: id }, '✦'));
  }
  hud.appendChild(reliquias);

  const rodape = el('div', { class:'hud-rodape' });
  const grupoVel = el('div', { class:'grupo' });
  const btn05 = el('button', { class:'secundario', onclick: () => setVel(0.5) }, '0,5x');
  const btn1 = el('button', { class:'principal ativo', onclick: () => setVel(1) }, '1x');
  const btn2 = el('button', { class:'secundario', onclick: () => setVel(2) }, '2x');
  const btnPausa = el('button', { class:'secundario', onclick: () => pausar() }, '⏸');
  grupoVel.appendChild(btn05); grupoVel.appendChild(btn1); grupoVel.appendChild(btn2); grupoVel.appendChild(btnPausa);
  rodape.appendChild(grupoVel);

  const grupoCons = el('div', { class:'grupo' });
  const btnTonico = el('button', { class:'consumivel arcano', onclick: () => usarCons('tonicoCura') }, 'Tônico');
  const qtdTonico = el('span', { class:'qtd' }, String(run.inventario.tonicoCura || 0));
  btnTonico.appendChild(qtdTonico);
  const btnMeteoro = el('button', { class:'consumivel arcano', onclick: () => usarCons('pergaminhoMeteoro') }, 'Meteoro');
  const qtdMeteoro = el('span', { class:'qtd' }, String(run.inventario.pergaminhoMeteoro || 0));
  btnMeteoro.appendChild(qtdMeteoro);
  grupoCons.appendChild(btnTonico); grupoCons.appendChild(btnMeteoro);
  rodape.appendChild(grupoCons);
  hud.appendChild(rodape);
  tela.appendChild(hud);
  app.appendChild(tela);

  let visual = null;
  let poteAcumulado = 0;
  let pausado = false;
  let velocidade = 1;

  function setVel(v){
    velocidade = v;
    if (visual) visual.setVelocidade(v);
    btn05.className = 'secundario' + (v === 0.5 ? ' ativo' : '');
    btn1.className = 'principal' + (v === 1 ? ' ativo' : '');
    btn2.className = 'secundario' + (v === 2 ? ' ativo' : '');
  }
  function pausar(){
    pausado = !pausado;
    if (visual){ if (pausado) visual.pausar(); else visual.iniciar(); }
    btnPausa.textContent = pausado ? '▶' : '⏸';
  }
  function usarCons(id){
    if (aoConsumivel(id)){
      if (id === 'tonicoCura'){ btnTonico.disabled = true; qtdTonico.textContent = String(Math.max(0, (run.inventario.tonicoCura || 0))); }
      if (id === 'pergaminhoMeteoro'){ btnMeteoro.disabled = true; qtdMeteoro.textContent = String(Math.max(0, (run.inventario.pergaminhoMeteoro || 0))); }
    }
  }

  if ((run.inventario.tonicoCura || 0) <= 0) btnTonico.disabled = true;
  if ((run.inventario.pergaminhoMeteoro || 0) <= 0) btnMeteoro.disabled = true;

  return {
    canvas,
    iniciarVisual(criarVisualFn, b){
      visual = criarVisualFn(canvas, b, {
        velocidade,
        aoFim: (res) => aoFim(res),
        aoMoeda: (valor) => {
          poteAcumulado += valor;
          // abaixo de 10 mostra uma casa decimal, para cada moedinha fazer o número subir
          poteVal.textContent = poteAcumulado < 10 ? poteAcumulado.toFixed(1).replace('.', ',') : String(Math.floor(poteAcumulado));
          pote.classList.add('pulo');
          setTimeout(() => pote.classList.remove('pulo'), 120);
          const flut = el('div', { class:'mais-flutuante', style:`right:${20 + Math.random()*40}px;top:${60 + Math.random()*40}px;` }, "+🪙");
          hud.appendChild(flut);
          setTimeout(() => flut.remove(), 1000);
        },
        alvoMoeda: () => {
          const r = pote.getBoundingClientRect();
          const cr = canvas.getBoundingClientRect();
          return { x: r.left - cr.left + r.width/2, y: r.top - cr.top + r.height/2 };
        }
      });
      visual.iniciar();
      loopHud(b);
    },
    destruir(){ if (visual) visual.destruir(); }
  };

  function loopHud(b){
    let ativo = true;
    function frame(){
      if (!ativo) return;
      if (visual){
        const f = visual.forca();
        prefH.style.width = `${Math.round(f.herois * 100)}%`;
        prefV.style.width = `${Math.round(f.viloes * 100)}%`;
        tempo.textContent = `${(b.t || 0).toFixed(1)}s`;
        atualizarPainelHerois(b);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return () => { ativo = false; };
  }

  function atualizarPainelHerois(b){
    const porClasse = {};
    for (const u of b.unidades){
      if (u.lado !== 'h') continue;
      if (!porClasse[u.tipo]) porClasse[u.tipo] = { vivos: 0, total: 0, unidades: [] };
      porClasse[u.tipo].total++;
      porClasse[u.tipo].unidades.push(u);
      if (!u.morto) porClasse[u.tipo].vivos++;
    }
    painelHerois.innerHTML = '';
    for (const classe in porClasse){
      const info = porClasse[classe];
      const linha = el('div', { class:'hud-linha-classe' });
      const topo = el('div', { class:'topo' });
      topo.appendChild(el('span', { class:'nome' }, `${EMOJI_CLASSE[classe] || '🛡️'} ${HEROIS[classe]?.nome || classe}`));
      topo.appendChild(el('span', null, `${info.vivos}/${info.total}`));
      linha.appendChild(topo);
      const barras = el('div', { class:'hud-mini-barras' });
      for (const u of info.unidades){
        barras.appendChild(el('div', { class:'mini-barra' + (u.morto ? ' morta' : '') }));
      }
      linha.appendChild(barras);
      painelHerois.appendChild(linha);
    }
  }
}

export function telaResultado(app, { relatorio, aoContinuar }){
  limpar(app);
  const tela = el('div', { class:'tela' });
  const cont = el('div', { class:'resultado' });
  const chuva = el('div', { class:'chuva-moedas' });
  cont.appendChild(chuva);

  cont.appendChild(el('h1', { class:'titulo-contorno' }, relatorio.vitoria ? 'Vitória!' : 'Derrota...'));
  if (!relatorio.vitoria) cont.appendChild(el('div', { class:'subtitulo' }, `Faltaram ~${relatorio.faltaram} heróis!`));

  const estrelas = el('div', { class:'estrelas-grandes' });
  for (let i = 0; i < 3; i++){
    const e = el('span', { class:'estrela' }, '★');
    estrelas.appendChild(e);
    if (relatorio.vitoria && i < relatorio.estrelas) setTimeout(() => e.classList.add('acesa'), 300 + i * 350);
  }
  cont.appendChild(estrelas);

  const conta = el('div', { class:'conta-pote' });
  const linha1 = el('div', null, relatorio.vitoria
    ? `Pote ${relatorio.pote} + Prêmio ${relatorio.premioBase} = ${relatorio.pote + relatorio.premioBase} × ${relatorio.multiplicador.toFixed(1).replace('.', ',')} ★`
    : `Sem prêmio na derrota: você fica só com o pote (${relatorio.pote})`);
  if (relatorio.soldo) linha1.appendChild(el('div', { style: 'font-size:.85em;opacity:.8' }, `Soldo pago: −${relatorio.soldo} 🪙`));
  conta.appendChild(linha1);
  const total = el('div', { class:'ouro-total' }, '= 0 🪙');
  conta.appendChild(total);
  cont.appendChild(conta);

  if (!relatorio.vitoria) cont.appendChild(el('div', { class:'subtitulo' }, `A base levou ${relatorio.danoBase} de dano`));

  if (relatorio.porClasse){
    const tabela = el('table', { class:'tabela-classe' });
    const thead = el('thead');
    const trh = el('tr');
    for (const h of ['Classe','Enviados','Caídos','Abates','Dano','Cura','Dano recebido']) trh.appendChild(el('th', null, h));
    thead.appendChild(trh);
    tabela.appendChild(thead);
    const tbody = el('tbody');
    for (const classe in relatorio.porClasse){
      const d = relatorio.porClasse[classe];
      const tr = el('tr');
      tr.appendChild(el('td', null, classe));
      tr.appendChild(el('td', null, String(d.enviados)));
      tr.appendChild(el('td', null, String(d.caidos)));
      tr.appendChild(el('td', null, String(d.abates)));
      tr.appendChild(el('td', null, String(Math.round(d.dano))));
      tr.appendChild(el('td', null, String(Math.round(d.cura))));
      tr.appendChild(el('td', null, String(Math.round(d.danoRecebido))));
      tbody.appendChild(tr);
    }
    tabela.appendChild(tbody);
    cont.appendChild(tabela);
  }

  const btn = el('button', { class:'grande principal', onclick: aoContinuar }, 'Continuar');
  cont.appendChild(btn);
  tela.appendChild(cont);
  app.appendChild(tela);

  let atual = 0;
  const alvo = relatorio.ouroGanho;
  const passo = Math.max(1, Math.ceil(alvo / 40));
  const iv = setInterval(() => {
    atual = Math.min(alvo, atual + passo);
    total.textContent = `= ${atual} 🪙`;
    if (atual >= alvo) clearInterval(iv);
  }, 40);

  const nMoedas = relatorio.vitoria ? relatorio.estrelas * 8 : 0;
  for (let i = 0; i < nMoedas; i++){
    setTimeout(() => {
      const m = el('div', { class:'moeda-cai', style:`left:${Math.random()*100}%;animation-delay:${Math.random()*0.3}s;` }, '🪙');
      chuva.appendChild(m);
      setTimeout(() => m.remove(), 2200);
    }, i * 60);
  }
}

export function telaBau(app, { reliquias, aoEscolher, aoPular }){
  limpar(app);
  const tela = el('div', { class:'tela' });
  const cont = el('div', { class:'bau-tela' });
  cont.appendChild(el('h1', { class:'titulo-contorno' }, 'Você achou um baú!'));
  const cartas = el('div', { class:'cartas-bau' });
  for (const rel of reliquias){
    const c = el('div', { class:'carta-reliquia' });
    c.appendChild(el('h3', null, rel.nome));
    c.appendChild(el('div', { class:'classe' }, rel.classe));
    c.appendChild(el('div', { class:'raridade ' + rel.raridade }, rel.raridade.toUpperCase()));
    c.appendChild(el('div', { class:'desc' }, rel.desc));
    c.appendChild(el('button', { class:'principal', onclick: () => aoEscolher(rel.id) }, 'ESCOLHER'));
    cartas.appendChild(c);
  }
  cont.appendChild(cartas);
  cont.appendChild(el('button', { class:'secundario', onclick: aoPular }, 'Deixar para lá'));
  tela.appendChild(cont);
  app.appendChild(tela);
}

export function telaAcampamento(app, { run, disponiveis, precos, aoRecrutar, aoComprarConsumivel, aoComprarReliquia, aoUsarPocao, aoUsarBandagem, aoSeguir, reliquiasInfo, consumiveisInfo }){
  limpar(app);
  const tela = el('div', { class:'tela' });
  tela.appendChild(barraTopo({ rodada: run.rodada, vida: run.baseVida, vidaMax: run.baseVidaMax, ouro: run.ouro }));
  const cont = el('div', { class:'acampamento' });

  const secRec = el('div', { class:'secao' });
  secRec.appendChild(el('h2', null, 'Recrutar'));
  const gradeRec = el('div', { class:'grade-cartas' });
  for (const classe in disponiveis){
    const info = disponiveis[classe];
    const preco = precos[classe];
    const c = el('div', { class:'carta-heroi' });
    c.appendChild(el('h4', null, `${EMOJI_CLASSE[classe] || '🛡️'} ${info.nome}`));
    const atr = el('div', { class:'atributos' });
    atr.appendChild(el('span', null, `❤ ${info.pv}`));
    atr.appendChild(el('span', null, `⚔ ${info.dano}`));
    atr.appendChild(el('span', null, `🎯 ${info.alcance}`));
    c.appendChild(atr);
    c.appendChild(el('div', { class:'preco' }, `${preco} 🪙`));
    const btn = el('button', { class:'principal', onclick: () => aoRecrutar(classe) }, '+1');
    if (run.ouro < preco) btn.disabled = true;
    c.appendChild(btn);
    gradeRec.appendChild(c);
  }
  secRec.appendChild(gradeRec);
  cont.appendChild(secRec);

  if (run.desmaiados && run.desmaiados.length){
    const secEnf = el('div', { class:'secao' });
    secEnf.appendChild(el('h2', null, 'Enfermaria'));
    const lista = el('div', { class:'lista-enfermaria' });
    for (const d of run.desmaiados){
      const linha = el('div', { class:'linha-enfermaria' });
      linha.appendChild(el('span', { class:'nome' }, `${EMOJI_CLASSE[d.classe] || '🛡️'} ${HEROIS[d.classe]?.nome || d.classe}`));
      linha.appendChild(el('span', { class:'volta' }, `💤 volta na rodada ${d.volta}`));
      if ((run.inventario.pocaoRessurreicao || 0) > 0){
        linha.appendChild(el('button', { class:'arcano', onclick: () => aoUsarPocao(d.classe) }, `Poção (${run.inventario.pocaoRessurreicao})`));
      }
      if ((run.inventario.bandagem || 0) > 0){
        linha.appendChild(el('button', { class:'secundario', onclick: () => aoUsarBandagem(d.classe) }, `Bandagem (${run.inventario.bandagem})`));
      }
      lista.appendChild(linha);
    }
    secEnf.appendChild(lista);
    cont.appendChild(secEnf);
  }

  const secMerc = el('div', { class:'secao' });
  secMerc.appendChild(el('h2', null, 'Mercador'));
  const gradeMerc = el('div', { class:'grade-cartas' });
  for (const id in consumiveisInfo){
    const info = consumiveisInfo[id];
    const qtd = run.inventario[id] || 0;
    const c = el('div', { class:'carta-item' });
    c.appendChild(el('h4', null, info.nome));
    c.appendChild(el('div', { class:'desc' }, info.desc));
    const rod = el('div', { class:'rodape-item' });
    rod.appendChild(el('span', { class:'preco' }, `${info.preco} 🪙`));
    rod.appendChild(el('span', { class:'qtd' }, `tem: ${qtd}`));
    c.appendChild(rod);
    const btn = el('button', { class:'principal', onclick: () => aoComprarConsumivel(id) }, 'Comprar');
    if (run.ouro < info.preco) btn.disabled = true;
    c.appendChild(btn);
    gradeMerc.appendChild(c);
  }
  if (run.lojaReliquias && run.lojaReliquias.length){
    for (const id of run.lojaReliquias){
      const rel = reliquiasInfo[id];
      if (!rel) continue;
      const c = el('div', { class:'carta-item' });
      c.appendChild(el('h4', null, rel.nome));
      c.appendChild(el('div', { class:'classe' }, rel.classe));
      c.appendChild(el('div', { class:'raridade ' + rel.raridade }, rel.raridade.toUpperCase()));
      c.appendChild(el('div', { class:'desc' }, rel.desc));
      const rod = el('div', { class:'rodape-item' });
      rod.appendChild(el('span', { class:'preco' }, `${rel.preco} 🪙`));
      c.appendChild(rod);
      const btn = el('button', { class:'arcano', onclick: () => aoComprarReliquia(id) }, 'Comprar');
      if (run.ouro < rel.preco) btn.disabled = true;
      c.appendChild(btn);
      gradeMerc.appendChild(c);
    }
  }
  secMerc.appendChild(gradeMerc);
  cont.appendChild(secMerc);

  if (run.reliquias && run.reliquias.length){
    const secRel = el('div', { class:'secao' });
    secRel.appendChild(el('h2', null, 'Suas relíquias'));
    const lista = el('div', { class:'reliquias-lista' });
    for (const id of run.reliquias){
      const rel = reliquiasInfo[id];
      if (rel) lista.appendChild(el('span', { class:'rel-tag' }, rel.nome));
    }
    secRel.appendChild(lista);
    cont.appendChild(secRel);
  }

  const secProx = el('div', { class:'secao', style:'display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap;' });
  secProx.appendChild(el('h2', { style:'margin:0;border:none;padding:0;' }, `Próximo desafio: Rodada ${run.rodada}`));
  secProx.appendChild(el('button', { class:'grande principal', onclick: aoSeguir }, 'Seguir viagem'));
  cont.appendChild(secProx);

  tela.appendChild(cont);
  app.appendChild(tela);
}

export function telaFim(app, { run, pontuacao, recordes, aoNova, aoMenu }){
  limpar(app);
  const tela = el('div', { class:'tela' });
  const cont = el('div', { class:'fim-jornada' });
  const vitoria = run.fim === 'vitoria';
  cont.appendChild(el('h1', { class:'titulo-contorno' }, vitoria ? 'Jornada Completa!' : 'Fim da Jornada'));
  cont.appendChild(el('div', { class:'subtitulo', style:'color:var(--pergaminho);font-family:var(--fonte-titulo);font-size:1.3rem;' }, `Rodada alcançada: ${Math.min(run.rodada, 10)}/10`));
  cont.appendChild(el('div', { class:'pontuacao-grande' }, `${pontuacao} pts`));

  if (run.historico && run.historico.length){
    const tabela = el('table', { class:'tabela-classe' });
    const thead = el('thead');
    const trh = el('tr');
    for (const h of ['Rodada','Estrelas','Ouro','Base']) trh.appendChild(el('th', null, h));
    thead.appendChild(trh);
    tabela.appendChild(thead);
    const tbody = el('tbody');
    for (const h of run.historico){
      const tr = el('tr');
      tr.appendChild(el('td', null, String(h.rodada || h.n || '—')));
      tr.appendChild(el('td', null, '★'.repeat(h.estrelas || 0) || '—'));
      tr.appendChild(el('td', null, String(h.ouroGanho != null ? h.ouroGanho : (h.ouro || '—'))));
      tr.appendChild(el('td', null, String(h.baseVida != null ? h.baseVida : '—')));
      tbody.appendChild(tr);
    }
    tabela.appendChild(tbody);
    cont.appendChild(tabela);
  }

  if (recordes && recordes.length){
    const lista = el('div', { class:'lista-recordes' });
    lista.appendChild(el('h3', { style:'color:var(--vinho);margin-bottom:.4rem;' }, 'Melhores jornadas'));
    recordes.slice(0, 5).forEach((r, i) => {
      const linha = el('div', { class:'rec' });
      linha.appendChild(el('span', { class:'pos' }, `${i + 1}º`));
      linha.appendChild(el('span', null, `${r.pontuacao} pts — Rodada ${r.rodada}`));
      lista.appendChild(linha);
    });
    cont.appendChild(lista);
  }

  const acoes = el('div', { style:'display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;' });
  acoes.appendChild(el('button', { class:'grande principal', onclick: aoNova }, 'Nova jornada'));
  acoes.appendChild(el('button', { class:'grande secundario', onclick: aoMenu }, 'Menu'));
  cont.appendChild(acoes);

  tela.appendChild(cont);
  app.appendChild(tela);
}

export function modalComoJogar(app, { aoFechar }){
  const paginas = [
    { titulo:'Escolha quantos mandar', texto:'Em cada rodada, escolha entre as opções de desafio e decida quantos heróis enviar. Menos heróis = mais estrelas e mais ouro! Mas cuidado: se perder, a base leva dano.' },
    { titulo:'Heróis caídos desmaiam', texto:'Heróis que caem em batalha ficam desmaiados por 2 rodadas. Você pode resgatá-los na Enfermaria com Poção de Ressurreição ou Bandagem. Também há um soldo a pagar por herói enviado.' },
    { titulo:'Baús e relíquias', texto:'Nas rodadas 3, 6 e 9 há chance de baú com relíquias raras. A Chama Concentrada pode ser ligada/desligada antes de cada batalha. Use o Mercador para comprar consumíveis e relíquias.' }
  ];
  let pagina = 0;
  const fundo = el('div', { class:'modal-fundo' });
  const modal = el('div', { class:'modal' });
  const topo = el('div', { class:'modal-topo' });
  const titulo = el('h2', null, paginas[0].titulo);
  topo.appendChild(titulo);
  topo.appendChild(el('button', { class:'icone secundario', onclick: () => { fundo.remove(); aoFechar(); } }, '✕'));
  modal.appendChild(topo);
  const corpo = el('div', { class:'modal-corpo' });
  modal.appendChild(corpo);
  const rodape = el('div', { class:'modal-rodape' });
  const btnAnt = el('button', { class:'secundario', onclick: () => { if (pagina > 0){ pagina--; render(); } } }, 'Anterior');
  const paginasDiv = el('div', { class:'paginas' });
  const btnProx = el('button', { class:'principal', onclick: () => { if (pagina < paginas.length - 1){ pagina++; render(); } else { fundo.remove(); aoFechar(); } } }, 'Próximo');
  rodape.appendChild(btnAnt);
  rodape.appendChild(paginasDiv);
  rodape.appendChild(btnProx);
  modal.appendChild(rodape);
  fundo.appendChild(modal);
  app.appendChild(fundo);

  function render(){
    titulo.textContent = paginas[pagina].titulo;
    corpo.innerHTML = '';
    corpo.appendChild(el('p', null, paginas[pagina].texto));
    paginasDiv.innerHTML = '';
    for (let i = 0; i < paginas.length; i++){
      paginasDiv.appendChild(el('div', { class:'pt' + (i === pagina ? ' ativo' : '') }));
    }
    btnAnt.disabled = pagina === 0;
    btnProx.textContent = pagina === paginas.length - 1 ? 'Entendi!' : 'Próximo';
  }
  render();
}

export function modalRecordes(app, { recordes, aoFechar }){
  const fundo = el('div', { class:'modal-fundo' });
  const modal = el('div', { class:'modal' });
  const topo = el('div', { class:'modal-topo' });
  topo.appendChild(el('h2', null, 'Melhores jornadas'));
  topo.appendChild(el('button', { class:'icone secundario', onclick: () => { fundo.remove(); aoFechar(); } }, '✕'));
  modal.appendChild(topo);
  const corpo = el('div', { class:'modal-corpo' });
  if (!recordes || !recordes.length){
    corpo.appendChild(el('p', null, 'Nenhuma jornada registrada ainda. Jogue para entrar no top 5!'));
  } else {
    const lista = el('div', { class:'lista-recordes' });
    recordes.slice(0, 5).forEach((r, i) => {
      const linha = el('div', { class:'rec' });
      linha.appendChild(el('span', { class:'pos' }, `${i + 1}º`));
      linha.appendChild(el('span', null, `${r.pontuacao} pts — Rodada ${r.rodada}`));
      lista.appendChild(linha);
    });
    corpo.appendChild(lista);
  }
  modal.appendChild(corpo);
  fundo.appendChild(modal);
  app.appendChild(fundo);
}
