// Renderizador, cena, câmera e as duas luzes.
// (módulo 2/20 da Capivara Explora)
import * as THREE from 'three';

// ---------------------------------------------------------------------
// 2. MUNDO 3D
// ---------------------------------------------------------------------
const canvas = document.getElementById('c');
const stageEl = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fd8ff, 25, 62);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 150);
camera.layers.enable(1);

// Luzes: só 2 (hemisférica + sol com sombra pequena) para rodar bem no celular
const hemi = new THREE.HemisphereLight(0xfff1d6, 0x5a7a3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 1.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
scene.add(sun, sun.target);

export { camera, canvas, hemi, renderer, scene, stageEl, sun };
