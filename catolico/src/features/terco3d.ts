/* Terço em 3D (Three.js, carregado só ao abrir o terço).
   Montagem fiel a um terço real: crucifixo, conta grande, 3 contas pequenas, conta grande, medalha e o laço
   com 5 dezenas (50 contas pequenas e 4 grandes). A câmera desliza com suavidade até a conta atual,
   que brilha num pulso lento, no ritmo de uma respiração calma (cerca de 6 por minuto). */
import {
  AmbientLight, BoxGeometry, CatmullRomCurve3, Color, CylinderGeometry, DirectionalLight, Group, LineCurve3, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, PointLight, Scene, SphereGeometry, TubeGeometry, Vector3, WebGLRenderer,
} from "three";
import type { Passo } from "../data/terco";

export interface Terco3D { focar(i: number): void; concluir(): void; destruir(): void }
type Peca = { pos: Vector3; mesh?: Mesh; tipo: "cruz" | "grande" | "pequena" | "medalha" | "espaco" };

/** Posições: o laço é uma curva fechada levemente ondulada em profundidade; o pingente desce da medalha. */
function montarPecas(): { pecas: Peca[]; laco: CatmullRomCurve3; medalha: Vector3; cruz: Vector3 } {
  const pts: Vector3[] = [];
  for (let k = 0; k < 40; k++) {
    const a = -Math.PI / 2 + (k / 40) * Math.PI * 2;
    const r = 1 + .08 * Math.cos(a + Math.PI / 2); // um pouco de "gota"
    pts.push(new Vector3(Math.cos(a) * 2.6 * r, Math.sin(a) * 3.1 * r + .4, Math.sin(2 * a) * .55));
  }
  const laco = new CatmullRomCurve3(pts, true, "centripetal");
  const medalha = laco.getPointAt(0).clone();
  // laço a partir da medalha: [medalha] 10 · G · 10 · G · 10 · G · 10 · G · 10 [volta à medalha]
  const seq: Peca["tipo"][] = [];
  for (let d = 0; d < 5; d++) { if (d) seq.push("grande"); for (let k = 0; k < 10; k++) seq.push("pequena"); }
  const tam = (t: Peca["tipo"]) => (t === "grande" ? 1.7 : 1);
  const total = 1.8 + seq.reduce((s, t) => s + tam(t), 0) + 1.8;
  let u = 1.8 / 2; const lacoPecas: Peca[] = [];
  for (const t of seq) { u += tam(t) / 2; lacoPecas.push({ tipo: t, pos: laco.getPointAt((u + .4) / total % 1) }); u += tam(t) / 2; }
  // pingente (de cima para baixo): G(B) · 3 pequenas · G(A) · crucifixo
  const p = (y: number) => new Vector3(medalha.x, medalha.y - y, medalha.z + .05);
  const B = p(.75), s1 = p(1.2), s2 = p(1.55), s3 = p(1.9), A = p(2.4), cruz = p(3.25);
  const pecas: Peca[] = [{ tipo: "cruz", pos: cruz }, { tipo: "grande", pos: A }, { tipo: "pequena", pos: s3 }, { tipo: "pequena", pos: s2 },
    { tipo: "pequena", pos: s1 }, { tipo: "grande", pos: B }, { tipo: "medalha", pos: medalha }, ...lacoPecas];
  return { pecas, laco, medalha, cruz };
}

/** Para cada passo do terço, a peça onde a pessoa está (índice em `pecas`). Glória e "Ó meu Jesus" ficam no espaço após a 10ª conta. */
export function mapaDePassos(passos: Passo[]): number[] {
  // índices: 0 cruz, 1 A, 2-4 três pequenas (de baixo para cima), 5 B, 6 medalha, 7.. laço
  const inicioDezena = (d: number) => 7 + (d - 1) * 11; // primeira Ave-Maria da dezena d
  return passos.map(p => {
    if (p.tipo === "misterio") return p.dezena === 1 ? 5 : inicioDezena(p.dezena) - 1;
    if (!p.dezena) return p.id === "sinal" || p.id === "credo" ? 0 : p.id === "painosso" ? 1 : p.id === "avemaria" ? 1 + (p.conta || 1) : p.id === "gloria" ? 5 : 6;
    if (p.id === "painosso") return p.dezena === 1 ? 5 : inicioDezena(p.dezena) - 1;
    if (p.id === "avemaria") return inicioDezena(p.dezena) + (p.conta || 1) - 1;
    return -(inicioDezena(p.dezena) + 9); // glória / Ó meu Jesus: o espaço depois da 10ª conta (negativo = espaço)
  });
}

export function criarTerco3D(host: HTMLElement): Terco3D {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const scene = new Scene(), cam = new PerspectiveCamera(38, 1, .1, 100), grupo = new Group(); scene.add(grupo);
  scene.add(new AmbientLight(0xfff4e6, .55));
  const sol = new DirectionalLight(0xfff0d8, 1.4); sol.position.set(3, 5, 6); scene.add(sol);
  const contra = new DirectionalLight(0xb8c8ff, .5); contra.position.set(-4, -2, -5); scene.add(contra);
  const halo = new PointLight(0xffd27a, 0, 3.2, 1.6); scene.add(halo);

  const { pecas, laco, medalha, cruz } = montarPecas();
  const ouro = new MeshStandardMaterial({ color: 0xd4ae5a, metalness: .55, roughness: .3, emissive: new Color(0x4a3410), emissiveIntensity: .6 });
  const corrente = new TubeGeometry(laco, 400, .018, 6, true);
  grupo.add(new Mesh(corrente, ouro));
  grupo.add(new Mesh(new TubeGeometry(new LineCurve3(medalha, cruz), 20, .018, 6, false), ouro));
  const contaPeq = new SphereGeometry(.11, 24, 16), contaGr = new SphereGeometry(.17, 28, 20);
  const matConta = () => new MeshPhysicalMaterial({ color: 0xeee3d3, roughness: .28, clearcoat: 1, clearcoatRoughness: .2, sheen: .4, emissive: new Color(0xffc86b), emissiveIntensity: 0 });
  for (const p of pecas) {
    if (p.tipo === "pequena" || p.tipo === "grande") { p.mesh = new Mesh(p.tipo === "grande" ? contaGr : contaPeq, matConta()); p.mesh.position.copy(p.pos); grupo.add(p.mesh); }
    else if (p.tipo === "medalha") { p.mesh = new Mesh(new CylinderGeometry(.22, .22, .05, 32), ouro.clone()); p.mesh.rotation.x = Math.PI / 2; p.mesh.position.copy(p.pos); grupo.add(p.mesh); }
    else if (p.tipo === "cruz") {
      const c = new Group(), m = ouro.clone(); m.emissive = new Color(0xffc86b); m.emissiveIntensity = 0;
      const v = new Mesh(new BoxGeometry(.075, .62, .06), m), h = new Mesh(new BoxGeometry(.38, .075, .06), m); h.position.y = .12; c.add(v, h);
      c.position.copy(p.pos); grupo.add(c); p.mesh = v;
    }
  }
  const mat = (i: number) => (pecas[i]?.mesh?.material as MeshStandardMaterial | undefined);

  // câmera: segue o alvo com amortecimento (sem cortes)
  const alvo = new Vector3(), olhar = new Vector3(), camPos = new Vector3(0, 0, 12), desejada = new Vector3(0, 0, 12);
  let atual = -1, feitas = new Set<number>(), fim = false, raf = 0, t0 = performance.now(), ult = t0;
  const pos = (i: number) => (i >= 0 ? pecas[i].pos : pecas[-i].pos.clone().lerp(pecas[Math.min(pecas.length - 1, -i + 1)]?.pos ?? medalha, .5));

  function focar(i: number): void {
    atual = i; const idx = Math.abs(i);
    for (let k = 7; k < pecas.length; k++) if (k < idx || (i < 0 && k === idx)) feitas.add(k);
    for (let k = 0; k < Math.min(idx, 7); k++) feitas.add(k);
    const p = pos(i); alvo.copy(p);
    // de frente para a conta, um pouco afastado, olhando de leve de cima: mostra a conta e as vizinhas
    const fora = new Vector3(p.x, p.y - .4, 0).normalize().multiplyScalar(.9);
    desejada.set(p.x * .55 + fora.x, p.y * .55 + fora.y + .5, 4.6 + p.z);
  }
  function concluir(): void { fim = true; pecas.forEach((_, k) => feitas.add(k)); alvo.set(0, -2.5, 0); desejada.set(0, -2.6, 14); }

  function tamanho(): void { const w = host.clientWidth || 1, h = host.clientHeight || 1; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  const ro = new ResizeObserver(tamanho); ro.observe(host); tamanho();

  function quadro(agora: number): void {
    raf = requestAnimationFrame(quadro);
    if (document.hidden) return;
    const dt = Math.min(.05, (agora - ult) / 1000); ult = agora; const t = (agora - t0) / 1000;
    const k = 1 - Math.exp(-dt * 3.2); // ~0,9 s para chegar
    camPos.lerp(desejada, k); olhar.lerp(alvo, k); cam.position.copy(camPos); cam.lookAt(olhar);
    grupo.rotation.y = Math.sin(t * .11) * .12; grupo.rotation.x = Math.sin(t * .07) * .04;
    const resp = .5 - .5 * Math.cos((t / 10) * Math.PI * 2); // respiração: 10 s por ciclo
    pecas.forEach((p, i) => {
      const m = mat(i); if (!m || p.tipo === "medalha") return;
      const base = p.tipo === "cruz" ? .12 : 0;
      const alvoE = base + (i === Math.abs(atual) && atual >= 0 && !fim ? .35 + .65 * resp : feitas.has(i) ? (fim ? .55 + .2 * resp : .22) : 0);
      m.emissiveIntensity += (alvoE - m.emissiveIntensity) * Math.min(1, dt * 4);
      if (p.mesh && p.tipo !== "cruz") { const s = i === Math.abs(atual) && !fim ? 1.18 + .06 * resp : 1; p.mesh.scale.setScalar(p.mesh.scale.x + (s - p.mesh.scale.x) * Math.min(1, dt * 5)); }
    });
    const hp = pos(atual < 0 && atual !== -1 ? atual : Math.max(0, atual)).clone().applyEuler(grupo.rotation);
    halo.position.lerp(hp.add(new Vector3(0, 0, .45)), k); halo.intensity = fim ? 0 : .6 + 1.4 * resp;
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(quadro);

  return {
    focar, concluir,
    destruir() {
      cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse(o => { const m = o as Mesh; if (m.geometry) m.geometry.dispose(); const mt = m.material as MeshStandardMaterial | undefined; mt?.dispose?.(); });
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
