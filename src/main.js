// Escritório de Agentes IA · MVP: cena, 10 bonecos, etiquetas IA/ROTEIRO, balões, bots andando, cenário offline e controles.
import * as T from './three.module.js';
import { criarEscritorio } from './scene/office.js';
import { AGENTES, criarAgente } from './scene/agentModel.js';
import { criarRotulos } from './ui/rotulos.js';
import { criarRelogio } from './engine/clock.js';
import { criarDiretor } from './engine/director.js';
import { criarTelao } from './ui/telao.js';
import { criarKanban } from './scene/kanban.js';
import { criarQuiz } from './ui/quiz.js';
import { fonteOnline, gerarCenario } from './ui/online.js';
import { validarCenario, limparCenario } from './engine/validate.js';
import { criarControles, setStatusModo } from './ui/controls.js';

const carregar = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
const NOMES = ['lanchonete', 'petshop', 'escola', 'banda'];
const [falas, ...lista] = await Promise.all([carregar('src/data/botLines.json'), ...NOMES.map(n => carregar(`src/data/scenarios/${n}.json`))]);
const CENARIOS = Object.fromEntries(NOMES.map((n, k) => [n, lista[k]]));

// ---------- cena ----------
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
document.getElementById('cena').append(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#F4EEE4');
scene.add(new T.HemisphereLight('#FFFFFF', '#D8CBB4', 1.6));
const sol = new T.DirectionalLight('#FFF4E0', 1.8); sol.position.set(8, 16, 10); sol.castShadow = true;
Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14 }); sol.shadow.mapSize.set(1536, 1536); scene.add(sol);
const escritorio = criarEscritorio(scene);
// câmera isométrica (ortográfica), com leve rotação opcional e "seguir agente ativo"
const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200), ZOOM = { normal: 11.5, perto: 6.5 };
let zoom = ZOOM.normal, seguir = false, girar = false;
const foco = new T.Vector3(2.2, 0, -1.6), focoAlvo = foco.clone();
function tamanho() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h); const a = w / h;
  Object.assign(cam, { left: -zoom * a, right: zoom * a, top: zoom, bottom: -zoom }); cam.updateProjectionMatrix();
}
addEventListener('resize', tamanho); tamanho();

// ---------- agentes ----------
const rotulos = criarRotulos(document.getElementById('rotulos'));
const agentes = AGENTES.map((d, i) => { const a = criarAgente(d, i); scene.add(a.g); rotulos.adicionar(a); return a; });

// ---------- painel-guia (versão simples do MVP) ----------
const $ = id => document.getElementById(id);
function mostrarEtapa(e, i, total) {
  const ag = AGENTES.find(a => a.id === e.agente);
  telao?.mostrar(CENARIOS[cenarioAtual], i, e, ag); kanban.estado(i);
  $('gEtapa').textContent = `ETAPA ${i + 1} de ${total}`; $('gBarra').style.width = `${((i + 1) / total) * 100}%`;
  $('gNome').textContent = e.id.replace(/^\d+-/, '').replace(/-/g, ' ').replace('codar', 'programar').replace('cardapio', 'cardápio').replace(/ \d$/, '').toUpperCase();
  $('gQuem').textContent = ''; const b = document.createElement('b'); b.textContent = ag.nome; const t = document.createElement('span');
  t.className = `mini ${ag.tipo}`; t.textContent = ag.tipo === 'ia' ? 'IA' : 'ROTEIRO'; if (ag.tipo === 'ia') t.style.background = ag.cor; $('gQuem').append(b, ' ', t);
  $('gExplica').textContent = `“${e.explicacao || ''}”`; $('gPergunta').textContent = e.perguntaPublico || '';
  $('gPensa').textContent = `> ${e.pensamento}`;
}

// ---------- relógio, diretor, controles e extras ----------
const relogio = criarRelogio();
const kanban = criarKanban(scene);
const ORDEM = ['lanchonete', 'petshop', 'escola', 'banda'];
let telao = null, diretor = null, cenarioAtual = 'lanchonete', apresentacao = false;
const quiz = criarQuiz(agentes);
const aviso = txt => { const a = $('aviso'); a.textContent = txt; a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { a.hidden = true; }, 4000); };

/** Troca (ou reinicia) o cenário: encerra o diretor antigo e monta tudo de novo. */
function trocarCenario(id) {
  const c = CENARIOS[id]; if (!c) { aviso('Esse cenário ainda não existe.'); return; }
  diretor?.encerrar(); cenarioAtual = id;
  diretor = criarDiretor({ agentes, rotulos, falas, escritorio, relogio, aoEtapa: mostrarEtapa, aoFim });
  kanban.montar(c); telao.mostrar(c, -1, { id: '0-inicio' }, null); $('bQuiz').classList.remove('novo');
  diretor.montar(c);
}
function aoFim() {
  if (apresentacao) relogio.depois(6, () => { if (apresentacao) { const id = ORDEM[(ORDEM.indexOf(cenarioAtual) + 1) % ORDEM.length]; if (ctrl.seletores.cenario) ctrl.seletores.cenario.value = id; trocarCenario(id); } });
  else $('bQuiz').classList.add('novo');
}
telao = criarTelao({ camada: $('telaoCamada'), telao: escritorio.telao, relogio, acoes: { proxima: () => diretor.proxima(), anterior: () => diretor.anterior() } });

function voltarOffline(falhou) {
  if (ctrl.seletores.modo) ctrl.seletores.modo.value = 'offline';
  setStatusModo(falhou ? 'falha' : 'offline'); if (falhou) setTimeout(() => setStatusModo('offline'), 3000);
}
const SUGESTOES = ['uma padaria de bairro', 'minha loja de skates', 'um canal de games', 'um time de futebol da escola'];
function abrirPedido(fonte) {
  const d = document.createElement('div'); d.id = 'pedido';
  const aviso2 = fonte === 'gemini' ? '🔒 O texto vai para o Google Gemini. Não escreva nomes, telefones ou endereços.' : fonte === 'claude' ? '🔒 O texto vai para o Claude, usando a conta de quem está com a tela aberta. Não escreva nomes, telefones ou endereços.' : '🔒 Não escreva nomes, telefones ou endereços de pessoas: o texto é enviado para um serviço de IA fora do Brasil.';
  d.innerHTML = '<form class="p-caixa"><h2>O que o cliente quer?</h2><p>Escreva o pedido do site. A IA lê só este texto.</p><input id="pedidoTexto" maxlength="140" autocomplete="off" enterkeyhint="send" placeholder="Ex.: um site para a minha banda de forró"><div class="p-chips"></div><p class="p-aviso"></p><p class="p-status" aria-live="polite"></p><div class="p-botoes"><button type="submit">✨ Gerar com IA</button><button type="button" class="p-cancelar">Cancelar</button></div></form>';
  d.querySelector('.p-aviso').textContent = aviso2;
  document.body.append(d); const inp = d.querySelector('input'), st = d.querySelector('.p-status'), chips = d.querySelector('.p-chips'); inp.focus();
  for (const t of SUGESTOES) { const b = document.createElement('button'); b.type = 'button'; b.className = 'p-chip'; b.textContent = t; b.addEventListener('click', () => { inp.value = `um site para ${t.replace(/^(uma?|minha|meu) /, '')}`; inp.focus(); }); chips.append(b); }
  const fechar = () => d.remove();
  d.querySelector('.p-cancelar').addEventListener('click', () => { fechar(); voltarOffline(false); });
  d.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault(); const pedido = inp.value.trim(); if (pedido.length < 3) { st.textContent = 'Escreva um pouco mais.'; return; }
    inp.disabled = true; for (const b of d.querySelectorAll('button')) b.disabled = true; st.textContent = '🤖 Os agentes estão lendo o pedido…';
    try {
      const c = await gerarCenario(pedido, fonte, CENARIOS.lanchonete, p => { st.textContent = `🤖 Os agentes estão escrevendo o roteiro… ${Math.round(p * 100)}%`; });
      const ruim = validarCenario(c); if (ruim) throw new Error('a IA respondeu algo fora do formato, tente de novo');
      CENARIOS.online = limparCenario(c); fechar(); trocarCenario('online'); setStatusModo('online');
    } catch (err) { fechar(); aviso(`Não deu certo (${err.message}). Voltando ao modo offline.`); voltarOffline(true); }
  });
}
async function iniciarOnline() {
  aviso('Procurando a IA…');
  const fonte = await fonteOnline();
  if (!fonte) { aviso('IA indisponível aqui: abra pelo servidor (npm start) ou pelo artefato no Claude. Voltando ao offline.'); voltarOffline(true); return; }
  setStatusModo('online'); abrirPedido(fonte);
}
const ctrl = criarControles(relogio, {
  proxima: () => diretor.proxima(), anterior: () => diretor.anterior(),
  reiniciar: () => trocarCenario(cenarioAtual),
  cenario: id => trocarCenario(id),
  modo: async m => {
    if (m !== 'online') { setStatusModo('offline'); return; }
    iniciarOnline();
  },
  seguir: v => { seguir = v; },
});
if (!ctrl.elemento.isConnected) document.body.append(ctrl.elemento);
trocarCenario(cenarioAtual);

// botões extras
const alternarApresentacao = () => { apresentacao = !apresentacao; $('bApres').setAttribute('aria-pressed', String(apresentacao)); $('bApres').classList.toggle('ligado', apresentacao); aviso(apresentacao ? 'Modo apresentação: os 4 cenários passam sozinhos, em loop.' : 'Modo apresentação desligado.'); };
$('bApres').addEventListener('click', alternarApresentacao);
$('bIA').addEventListener('click', () => { if (!document.getElementById('pedido')) iniciarOnline(); });
$('bQuiz').addEventListener('click', () => { $('bQuiz').classList.remove('novo'); quiz.abrir(); });
$('bSite').addEventListener('click', () => telao.abrirSitePronto(CENARIOS[cenarioAtual]));
$('bBaixar').addEventListener('click', () => {
  const c = CENARIOS[cenarioAtual], url = URL.createObjectURL(new Blob([c.htmlFinal], { type: 'text/html' })), a = document.createElement('a');
  a.href = url; a.download = `site-${c.id}.html`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  aviso('Se o download não começar, use "Site pronto" e copie o código.');
});
{ const gu = $('guia'), bt = $('gToggle'); if (innerHeight <= 520) gu.classList.add('recolhido');
  const marca = () => { bt.textContent = gu.classList.contains('recolhido') ? '▸' : '▾'; }; marca();
  bt.addEventListener('click', () => { gu.classList.toggle('recolhido'); marca(); }); }
addEventListener('keydown', e => { if (e.target.closest?.('input, select, textarea')) return; const t = e.key.toLowerCase(); if (t === 'g') girar = !girar; if (t === 'p') alternarApresentacao(); });

// ---------- laço ----------
let ultimo = performance.now(), ang = Math.PI / 4;
function quadro(agora) {
  requestAnimationFrame(quadro);
  const dtReal = (agora - ultimo) / 1000; ultimo = agora;
  const dt = relogio.avancar(dtReal);
  diretor.passo(dt);
  // câmera: isométrica; seguindo o agente ativo, aproxima e centraliza nele
  const ativo = agentes.find(a => a.ativo);
  const baixo = innerHeight <= 520; focoAlvo.set(baixo ? 3.2 : 2.2, 0, baixo ? -2.2 : -1.6); let zAlvo = baixo ? 10 : ZOOM.normal;
  if (seguir && ativo) { focoAlvo.copy(ativo.g.position); zAlvo = ZOOM.perto; }
  foco.lerp(focoAlvo, 1 - Math.exp(-Math.min(dtReal, 0.1) * 3)); zoom += (zAlvo - zoom) * (1 - Math.exp(-Math.min(dtReal, 0.1) * 3)); tamanho();
  if (girar) ang += dt * 0.05;
  cam.position.set(foco.x + Math.sin(ang) * 30, 24, foco.z + Math.cos(ang) * 30); cam.lookAt(foco);
  renderer.render(scene, cam);
  telao.posicionar(cam, innerWidth, innerHeight); kanban.passo(dt);
  rotulos.atualizar(cam, innerWidth, innerHeight, relogio.tempo);
}
requestAnimationFrame(quadro);
window.__escritorio = { relogio, agentes, get diretor() { return diretor; } };
