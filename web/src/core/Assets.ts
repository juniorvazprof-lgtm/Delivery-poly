import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const cache = new Map<string, THREE.Object3D>();

export async function loadModels(names: string[]): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(names.map(async (n) => {
    const g = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${n}.glb`);
    g.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.flatShading = true;
        if (mat.transparent) m.castShadow = false;
      }
    });
    cache.set(n, g.scene);
  }));
}

/** Clona o modelo com materiais próprios (para poder piscar/tingir cada unidade). */
export function spawnModel(name: string): THREE.Group {
  const src = cache.get(name);
  if (!src) throw new Error(`Modelo não carregado: ${name}`);
  const c = src.clone(true);
  c.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.material = (m.material as THREE.Material).clone();
  });
  const g = new THREE.Group();
  g.add(c);
  return g;
}
