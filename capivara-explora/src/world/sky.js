// Chuva, estrelas e vaga-lumes.
// (módulo 4/20 da Capivara Explora)
import * as THREE from 'three';
import { rand } from '../core/config.js';
import { scene } from '../engine/scene.js';

// --- Chuva (um único Points, barato) ---
const RAIN_N = 900;
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(RAIN_N * 3).map((_, i) =>
  i % 3 === 1 ? rand(0, 14) : rand(-15, 15)), 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xbfe4ff, size: 0.09, transparent: true, opacity: 0.7 }));
rain.visible = false;
scene.add(rain);

// --- Noite: estrelas e vaga-lumes (dois Points baratos) ---
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(
  Array.from({ length: 500 }, () => { const a = rand(0, 6.28), e = rand(0.15, 1.45), r = 90; return [Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r]; }).flat(), 3)),
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0, fog: false, depthWrite: false }));
scene.add(stars);
const FLY_N = 45;
const flies = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(
  Array.from({ length: FLY_N * 3 }, (_, i) => i % 3 === 1 ? rand(0.4, 2) : rand(-12, 12)), 3)),
  new THREE.PointsMaterial({ color: 0xfff27a, size: 0.16, transparent: true, opacity: 0, depthWrite: false }));
scene.add(flies);

export { FLY_N, RAIN_N, flies, rain, rainGeo, stars };
