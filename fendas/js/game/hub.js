// Hub do menu inicial: Mago 3D girando num pedestal, espaços de equipamento, selos de aviso e a última Fenda.
import * as T from '../lib/three.js';
import { buildModel } from '../engine/voxel.js';
import { MAGE } from './world.js';
import { M } from './meta.js';
import { SLOTS, RARITIES, openGear } from './gear.js';
import { RIFTS } from '../data/rifts.js';

const $ = id => document.getElementById(id);
const canvas = $('hero'), renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0, 0);
const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
cam.position.set(0, 1.5, 6.4); cam.lookAt(0, 0.7, 0);
scene.add(new T.HemisphereLight('#d8ccff', '#1a1028', 2.2));
const key = new T.DirectionalLight('#fff0d8', 2.4); key.position.set(-2, 4, 3); scene.add(key);
const rim = new T.DirectionalLight('#5ff2ff', 1.6); rim.position.set(2, 2, -3); scene.add(rim);
const mage = buildModel({ ...MAGE, scale: 1.35 }); scene.add(mage);
// pedestal: disco escuro + anel que brilha na cor do melhor item equipado
const ped = new T.Mesh(new T.CylinderGeometry(1.05, 1.15, 0.16, 32), new T.MeshToonMaterial({ color: '#1c1636' })); ped.position.y = -0.08; scene.add(ped);
const ring = new T.Mesh(new T.TorusGeometry(1.1, 0.035, 8, 48), new T.MeshBasicMaterial({ color: '#5ff2ff' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
const halo = new T.Mesh(new T.CircleGeometry(1.6, 40), new T.MeshBasicMaterial({ color: '#5ff2ff', transparent: true, opacity: 0.16, depthWrite: false })); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.005; scene.add(halo);
const ORDER = Object.keys(RARITIES);

function size() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
addEventListener('resize', size);
function loop(now) {
  requestAnimationFrame(loop);
  if ($('startscreen').hidden) return;   // só desenha com o hub aberto
  const t = now / 1000; mage.rotation.y = t * 0.6; mage.position.y = Math.sin(t * 2) * 0.03;
  ring.scale.setScalar(1 + Math.sin(t * 3) * 0.02); halo.material.opacity = 0.13 + Math.sin(t * 2) * 0.04;
  renderer.render(scene, cam);
}

export function refreshHub() {
  size();
  const s = M.stats; $('hub-rec').textContent = `${s.runs} partidas · ${s.wins} vitórias · recorde ${Math.floor(s.bestTime / 60)}:${String(Math.floor(s.bestTime % 60)).padStart(2, '0')}`;
  // espaços de equipamento com durabilidade
  let best = -1;
  $('hub-slots').innerHTML = Object.entries(SLOTS).map(([k, sl]) => { const it = M.equip?.[k];
    if (!it) return `<button class="hslot empty" data-slot="${k}"><i>${sl.glyph}</i></button>`;
    best = Math.max(best, ORDER.indexOf(it.rarity)); const c = RARITIES[it.rarity].color;
    return `<button class="hslot" data-slot="${k}" style="--c:${c}"><i>${sl.glyph}</i><span class="durbar"><i style="width:${it.dur / it.max * 100}%;${it.dur <= 1 ? 'background:var(--red)' : ''}"></i></span></button>`; }).join('');
  $('hub-slots').querySelectorAll('button').forEach(b => b.onclick = openGear);
  const col = best >= 0 ? RARITIES[ORDER[best]].color : '#5ff2ff'; ring.material.color.set(col); halo.material.color.set(col);
  // selo: itens no cofre
  const n = M.stash?.length || 0, bd = $('hub-gear-badge'); bd.hidden = !n; bd.textContent = n;
  // última Fenda
  const R = RIFTS[M.lastRift], hr = $('hub-rift');
  hr.style.setProperty('--c', R ? R.color : ''); hr.querySelector('b').textContent = R ? R.name : 'Escolha no mapa';
  hr.querySelector('.danger').textContent = R ? '◆'.repeat(R.danger) + '◇'.repeat(3 - R.danger) : '';
}
requestAnimationFrame(loop);
