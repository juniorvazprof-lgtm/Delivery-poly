// Escritório de Agentes IA · MVP: cena, 10 bonecos, etiquetas IA/ROTEIRO, balões, bots andando, cenário offline e controles.
import * as T from './three.module.js';
import { criarEscritorio } from './scene/office.js';
import { AGENTES, criarAgente } from './scene/agentModel.js';
import { criarRotulos } from './ui/rotulos.js';
import { criarRelogio } from './engine/clock.js';
import { criarDiretor } from './engine/director.js';
import { criarControles, setStatusModo } from './ui/controls.js';

const carregar = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
const [falas, lanchonete] = await Promise.all([carregar('src/data/botLines.json'), carregar('src/data/scenarios/lanchonete.json')]);
const CENARIOS = { lanchonete };

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
  $('gEtapa').textContent = `ETAPA ${i + 1} de ${total}`; $('gBarra').style.width = `${((i + 1) / total) * 100}%`;
  $('gNome').textContent = e.id.replace(/^\d+-/, '').replace(/-/g, ' ').toUpperCase();
  $('gQuem').textContent = ''; const b = document.createElement('b'); b.textContent = ag.nome; const t = document.createElement('span');
  t.className = `mini ${ag.tipo}`; t.textContent = ag.tipo === 'ia' ? 'IA' : 'ROTEIRO'; if (ag.tipo === 'ia') t.style.background = ag.cor; $('gQuem').append(b, ' ', t);
  $('gExplica').textContent = `“${e.explicacao || ''}”`; $('gPergunta').textContent = e.perguntaPublico || '';
  $('gPensa').textContent = `> ${e.pensamento}`;
}

// ---------- relógio, diretor e controles ----------
const relogio = criarRelogio();
let diretor = criarDiretor({ agentes, rotulos, falas, escritorio, relogio, aoEtapa: mostrarEtapa });
let cenarioAtual = 'lanchonete';
diretor.montar(CENARIOS[cenarioAtual]);
const ctrl = criarControles(relogio, {
  proxima: () => diretor.proxima(), anterior: () => diretor.anterior(),
  reiniciar: () => { diretor = criarDiretor({ agentes, rotulos, falas, escritorio, relogio, aoEtapa: mostrarEtapa }); diretor.montar(CENARIOS[cenarioAtual]); },
  cenario: id => { if (!CENARIOS[id]) { aviso('Esse cenário entra na próxima versão.'); return; } cenarioAtual = id; diretor.montar(CENARIOS[id]); },
  modo: m => { if (m === 'online') { aviso('Modo online entra na próxima versão (por enquanto, só offline).'); setStatusModo('falha'); } else setStatusModo('offline'); },
  seguir: v => { seguir = v; },
});
if (!ctrl.elemento.isConnected) document.body.append(ctrl.elemento);
function aviso(txt) { const a = $('aviso'); a.textContent = txt; a.hidden = false; relogio.depois(3, () => { a.hidden = true; }); }
{ const gu = $('guia'), bt = $('gToggle'); if (innerHeight <= 520) gu.classList.add('recolhido');
  const marca = () => { bt.textContent = gu.classList.contains('recolhido') ? '▸' : '▾'; }; marca();
  bt.addEventListener('click', () => { gu.classList.toggle('recolhido'); marca(); }); }
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'g') girar = !girar; });

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
  rotulos.atualizar(cam, innerWidth, innerHeight, relogio.tempo);
}
requestAnimationFrame(quadro);
window.__escritorio = { relogio, agentes, get diretor() { return diretor; } };
