// GoPro: fotos do ponto de vista da capivara.
// (módulo 15/20 da Capivara Explora)
import * as THREE from 'three';
import { G, H } from '../core/runtime.js';
import { $, lsGet, pick, safeJSON, state } from '../core/config.js';
import { canvas, renderer, scene } from '../engine/scene.js';
import { MK, objects } from '../world/objects.js';
import { capy } from '../capy/capybara.js';
import { gameWait } from '../world/simulation.js';
import { distTo } from '../brain/perception.js';
import { cap, nomeDe } from '../brain/brain.js';
import { applyDeltas, approachPoint, faceTowards, walkTo } from '../brain/actions.js';

// ---------------------------------------------------------------------
// CÂMERA (GoPro na cabeça): renderiza o ponto de vista dela e guarda a foto
// ---------------------------------------------------------------------
const FOTO_KEY = 'capivara_explora_fotos';
let fotos = safeJSON(lsGet(FOTO_KEY)) || [];
const goproCam = new THREE.PerspectiveCamera(80, 4 / 3, 0.1, 150);
const photoCanvas = document.createElement('canvas'); photoCanvas.width = 400; photoCanvas.height = 300;
const MANUAL_TXT = 'MANUAL DA CÂMERA\n1. Aperte o botão para guardar uma imagem do que está à sua frente.\n2. Segure o botão para filmar o que você faz; fale com quem vai assistir.\n3. Guarde as primeiras vezes, a luz do fim da tarde, a água, os bichos e os lugares novos.\n4. Registre o caminho: uma imagem ou um vídeo a cada poucos passos.';
function attachGoPro(o) {
  if (o) {   // leu o manual que veio junto: aparece no log
    const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
    state.log.push({ t: `Dia ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} · papel da câmera`, manual: true, acao: 'ler', pensamento: MANUAL_TXT });
    H.renderLog(true);
  }
  state.temCamera = true;
  if (o) { const i = objects.indexOf(o); if (i >= 0) objects.splice(i, 1); scene.remove(o.mesh); delete state.mapa[o.id]; }
  const g = MK.gopro(); g.scale.setScalar(1.3);
  g.position.set(0, 0.27, 0.12);       // em cima da cabeça, lente para frente
  g.traverse(m => m.layers.set(1));    // só a câmera principal vê a GoPro; a própria GoPro não aparece no vlog
  capy.parts.head.add(g);
  G.gopro = null;
}
function takePhoto(alvoPos, legenda) {
  const head = capy.parts.head.getWorldPosition(new THREE.Vector3());
  const fwd = new THREE.Vector3(Math.sin(capy.yaw), 0, Math.cos(capy.yaw));
  goproCam.position.copy(head).addScaledVector(fwd, 0.55).add(new THREE.Vector3(0, 0.3, 0));
  goproCam.lookAt(alvoPos || goproCam.position.clone().addScaledVector(fwd, 10).add(new THREE.Vector3(0, 1.2, 0)));
  goproCam.aspect = canvas.width / canvas.height; goproCam.updateProjectionMatrix();
  renderer.render(scene, goproCam);   // lê o canvas logo em seguida, no mesmo quadro
  const cw = canvas.width, ch = canvas.height, sw = Math.min(cw, ch * 4 / 3), sh = sw * 3 / 4;
  photoCanvas.getContext('2d').drawImage(canvas, (cw - sw) / 2, (ch - sh) / 2, sw, sh, 0, 0, 400, 300);
  const h = Math.floor(state.clock * 24), m = Math.floor((state.clock * 24 % 1) * 60);
  fotos.push({ url: photoCanvas.toDataURL('image/jpeg', 0.72), legenda, t: `Dia ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` });
  for (;;) { try { localStorage.setItem(FOTO_KEY, JSON.stringify(fotos.slice(-24))); break; } catch { if (fotos.length <= 1) break; fotos.shift(); } }
  fotos = fotos.slice(-24);
  const fl = $('flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
  H.sfx('clique'); state.ultimaFoto = state.ciclo; H.renderPhotos();
}
const LEGENDAS = ['{N}, do jeito que eu vi hoje.', '{N}. Quero lembrar disso.', 'Encontrei {n} e precisei guardar.', '{N} sob esta luz.'];
async function doFoto(dec, o) {
  let alvoPos = null, nome = 'a paisagem';
  if (o) {
    nome = nomeDe(o.type);
    alvoPos = o.pos.clone().add(new THREE.Vector3(0, 0.4, 0));
    const dist = distTo(o);
    if (dist > 6 || dist < 2) {   // enquadra: nem longe demais nem colado
      const dir = capy.pos.clone().sub(alvoPos).setY(0).normalize();
      await walkTo((o.radius ? approachPoint(o) : alvoPos.clone().addScaledVector(dir, 3.2 + (o.block || 0))).setY(0));
    }
    faceTowards(alvoPos);
  }
  capy.anim = 'curiosa'; capy.animT = 0; H.showEmoji('📸');
  await gameWait(1.2);
  const legenda = dec.legenda || cap(pick(LEGENDAS).replace('{N}', cap(nome)).replace('{n}', nome));
  takePhoto(alvoPos, legenda);
  H.discover('fotografar:' + (o?.type || 'paisagem'), 'guardar uma imagem');
  applyDeltas({ humor: +4, tedio: -10 });
  return `Você apertou o botão e guardou uma imagem de ${nome}. "${legenda}"`;
}

// acesso tardio para módulos carregados antes deste
Object.defineProperties(H, {
  attachGoPro: { get: () => attachGoPro },
  doFoto: { get: () => doFoto },
});
export { attachGoPro, fotos };
