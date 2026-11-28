import * as THREE from 'three';

/** Celular/tablet: toque como entrada principal. Usado para aliviar sombras e resolução. */
export const IS_MOBILE = matchMedia('(pointer: coarse)').matches;

export interface GameScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  enter(): void;
  exit(): void;
  update(dt: number, t: number): void;
  resize(w: number, h: number): void;
}

/** Dono do renderer e do loop; troca a cena ativa (Explorar ↔ Batalha). */
export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  private active: GameScene | null = null;
  private clock = new THREE.Clock();

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  switchTo(s: GameScene): void {
    this.active?.exit();
    this.active = s;
    s.enter();
    this.onResize();
  }

  private onResize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.active?.resize(w, h);
  }

  private tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.active) return;
    this.active.update(dt, this.clock.elapsedTime);
    this.renderer.render(this.active.scene, this.active.camera);
  }
}
