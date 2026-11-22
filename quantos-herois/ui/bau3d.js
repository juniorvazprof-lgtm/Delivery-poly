import * as THREE from 'three';

const COR_MADEIRA = '#8a5a35';
const COR_MADEIRA_ESCURA = '#6b4426';
const COR_DOURADO = '#f0c34a';
const COR_DOURADO_ESCURO = '#c99a2e';
const COR_FECHADURA_BURACO = '#2a1a0a';

const CORES_RARIDADE = {
  comum: 0xdfe9ff,
  rara: 0xb07cff,
  epica: 0xffd24a,
};

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function criarBau3d(container, opcoes = {}) {
  const raridade = opcoes.raridade || 'comum';
  const corBrilho = CORES_RARIDADE[raridade] || CORES_RARIDADE.comum;

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;';
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(2.6, 2.2, 4.2);
  camera.lookAt(0, 0.45, 0);

  const hemi = new THREE.HemisphereLight(0xfff2d8, 0x4a3520, 1.1);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffe6b8, 1.6);
  dir.position.set(3, 5, 4);
  scene.add(dir);

  const dir2 = new THREE.DirectionalLight(0xffd9a0, 0.5);
  dir2.position.set(-3, 2, -2);
  scene.add(dir2);

  const grupoRaiz = new THREE.Group();
  grupoRaiz.rotation.y = THREE.MathUtils.degToRad(-20);
  scene.add(grupoRaiz);

  const grupoFlutuante = new THREE.Group();
  grupoRaiz.add(grupoFlutuante);

  const grupoCorpo = new THREE.Group();
  grupoFlutuante.add(grupoCorpo);

  const disposables = { geometries: [], materials: [] };

  function matToon(color, extra = {}) {
    const m = new THREE.MeshToonMaterial({ color, ...extra });
    disposables.materials.push(m);
    return m;
  }

  function geo(g) {
    disposables.geometries.push(g);
    return g;
  }

  const matMadeira = matToon(COR_MADEIRA);
  const matMadeiraEscura = matToon(COR_MADEIRA_ESCURA);
  const matDourado = matToon(COR_DOURADO);
  const matDouradoEscuro = matToon(COR_DOURADO_ESCURO);
  const matBuraco = matToon(COR_FECHADURA_BURACO);

  // Dimensões do baú
  const LARG = 1.6;
  const PROF = 1.0;
  const ALT_CORPO = 0.75;

  // ---- Corpo (base) ----
  const corpoBase = new THREE.Mesh(
    geo(new THREE.BoxGeometry(LARG, ALT_CORPO, PROF)),
    matMadeira
  );
  corpoBase.position.y = ALT_CORPO / 2;
  grupoCorpo.add(corpoBase);

  // Tábuas verticais na frente e atrás (finas caixas lado a lado)
  const numTabuas = 6;
  const largTabua = LARG / numTabuas;
  for (let i = 0; i < numTabuas; i++) {
    const x = -LARG / 2 + largTabua * (i + 0.5);
    const tabuaF = new THREE.Mesh(
      geo(new THREE.BoxGeometry(largTabua * 0.92, ALT_CORPO * 0.94, 0.04)),
      matMadeiraEscura
    );
    tabuaF.position.set(x, ALT_CORPO / 2, PROF / 2 + 0.02);
    grupoCorpo.add(tabuaF);

    const tabuaT = new THREE.Mesh(
      geo(new THREE.BoxGeometry(largTabua * 0.92, ALT_CORPO * 0.94, 0.04)),
      matMadeiraEscura
    );
    tabuaT.position.set(x, ALT_CORPO / 2, -PROF / 2 - 0.02);
    grupoCorpo.add(tabuaT);
  }

  // Tábuas nas laterais
  const numTabuasLat = 4;
  const largTabuaLat = PROF / numTabuasLat;
  for (let i = 0; i < numTabuasLat; i++) {
    const z = -PROF / 2 + largTabuaLat * (i + 0.5);
    const tabuaL = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.04, ALT_CORPO * 0.94, largTabuaLat * 0.92)),
      matMadeiraEscura
    );
    tabuaL.position.set(LARG / 2 + 0.02, ALT_CORPO / 2, z);
    grupoCorpo.add(tabuaL);

    const tabuaR = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.04, ALT_CORPO * 0.94, largTabuaLat * 0.92)),
      matMadeiraEscura
    );
    tabuaR.position.set(-LARG / 2 - 0.02, ALT_CORPO / 2, z);
    grupoCorpo.add(tabuaR);
  }

  // Cintas douradas verticais (cantoneiras) no corpo
  const cintaEspessura = 0.08;
  const cintasX = [-LARG / 2 + 0.12, LARG / 2 - 0.12];
  for (const cx of cintasX) {
    const cintaF = new THREE.Mesh(
      geo(new THREE.BoxGeometry(cintaEspessura, ALT_CORPO + 0.02, 0.06)),
      matDourado
    );
    cintaF.position.set(cx, ALT_CORPO / 2, PROF / 2 + 0.05);
    grupoCorpo.add(cintaF);

    const cintaT = new THREE.Mesh(
      geo(new THREE.BoxGeometry(cintaEspessura, ALT_CORPO + 0.02, 0.06)),
      matDourado
    );
    cintaT.position.set(cx, ALT_CORPO / 2, -PROF / 2 - 0.05);
    grupoCorpo.add(cintaT);

    const cantaL = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.06, ALT_CORPO + 0.02, cintaEspessura)),
      matDourado
    );
    cantaL.position.set(LARG / 2 + 0.05, ALT_CORPO / 2, cx * (PROF / LARG));
    grupoCorpo.add(cantaL);

    const cantaR = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.06, ALT_CORPO + 0.02, cintaEspessura)),
      matDourado
    );
    cantaR.position.set(-LARG / 2 - 0.05, ALT_CORPO / 2, cx * (PROF / LARG));
    grupoCorpo.add(cantaR);
  }

  // Cinta horizontal dourada na base do corpo
  const cintaBase = new THREE.Mesh(
    geo(new THREE.BoxGeometry(LARG + 0.12, 0.08, PROF + 0.12)),
    matDouradoEscuro
  );
  cintaBase.position.y = 0.06;
  grupoCorpo.add(cintaBase);

  // Cinta horizontal dourada no topo do corpo
  const cintaTopo = new THREE.Mesh(
    geo(new THREE.BoxGeometry(LARG + 0.12, 0.08, PROF + 0.12)),
    matDourado
  );
  cintaTopo.position.y = ALT_CORPO - 0.04;
  grupoCorpo.add(cintaTopo);

  // ---- Fechadura frontal ----
  const grupoFechadura = new THREE.Group();
  grupoFechadura.position.set(0, ALT_CORPO * 0.55, PROF / 2 + 0.06);
  grupoCorpo.add(grupoFechadura);

  const placaFechadura = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.22, 0.26, 0.05)),
    matDourado
  );
  grupoFechadura.add(placaFechadura);

  const buracoFechadura = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12)),
    matBuraco
  );
  buracoFechadura.rotation.x = Math.PI / 2;
  buracoFechadura.position.set(0, 0.02, 0.03);
  grupoFechadura.add(buracoFechadura);

  const buracoBaixo = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.03, 0.06, 0.06)),
    matBuraco
  );
  buracoBaixo.position.set(0, -0.06, 0.03);
  grupoFechadura.add(buracoBaixo);

  // Brilho na fechadura (pulsante no idle)
  const matBrilhoFechadura = new THREE.MeshBasicMaterial({
    color: corBrilho,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.materials.push(matBrilhoFechadura);
  const brilhoFechadura = new THREE.Mesh(
    geo(new THREE.SphereGeometry(0.09, 16, 16)),
    matBrilhoFechadura
  );
  brilhoFechadura.position.set(0, 0.02, 0.06);
  grupoFechadura.add(brilhoFechadura);

  // ---- Tampa (meio cilindro deitado) ----
  const pivotTampa = new THREE.Group();
  pivotTampa.position.set(0, ALT_CORPO, -PROF / 2);
  grupoCorpo.add(pivotTampa);

  const grupoTampa = new THREE.Group();
  pivotTampa.add(grupoTampa);

  const raioTampa = PROF / 2;
  const comprimentoTampa = LARG;

  const geoTampaCil = geo(
    new THREE.CylinderGeometry(raioTampa, raioTampa, comprimentoTampa, 24, 1, false, 0, Math.PI)
  );
  const tampaCil = new THREE.Mesh(geoTampaCil, matMadeira);
  tampaCil.rotation.z = Math.PI / 2;
  tampaCil.rotation.y = Math.PI / 2;
  tampaCil.position.set(0, 0, raioTampa);
  grupoTampa.add(tampaCil);

  // Tábuas na tampa (arcos)
  const numTabuasTampa = 6;
  const largTabuaTampa = comprimentoTampa / numTabuasTampa;
  for (let i = 0; i < numTabuasTampa; i++) {
    const x = -comprimentoTampa / 2 + largTabuaTampa * (i + 0.5);
    const arco = new THREE.Mesh(
      geo(
        new THREE.CylinderGeometry(
          raioTampa + 0.01,
          raioTampa + 0.01,
          largTabuaTampa * 0.9,
          24,
          1,
          false,
          0,
          Math.PI
        )
      ),
      matMadeiraEscura
    );
    arco.rotation.z = Math.PI / 2;
    arco.rotation.y = Math.PI / 2;
    arco.position.set(x, 0, raioTampa);
    grupoTampa.add(arco);
  }

  // Cintas douradas na tampa
  for (const cx of cintasX) {
    const cintaTampa = new THREE.Mesh(
      geo(
        new THREE.CylinderGeometry(
          raioTampa + 0.03,
          raioTampa + 0.03,
          cintaEspessura,
          24,
          1,
          false,
          0,
          Math.PI
        )
      ),
      matDourado
    );
    cintaTampa.rotation.z = Math.PI / 2;
    cintaTampa.rotation.y = Math.PI / 2;
    cintaTampa.position.set(cx, 0, raioTampa);
    grupoTampa.add(cintaTampa);
  }

  // Fechadura na tampa (parte de cima)
  const placaTampa = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.22, 0.12, 0.06)),
    matDourado
  );
  placaTampa.position.set(0, 0.02, raioTampa * 2 + 0.02);
  grupoTampa.add(placaTampa);

  // ---- Sombra suave no chão ----
  const matSombra = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  disposables.materials.push(matSombra);
  const sombra = new THREE.Mesh(
    geo(new THREE.CircleGeometry(1.1, 32)),
    matSombra
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.001;
  grupoRaiz.add(sombra);

  // ---- Feixe de luz (inicialmente invisível) ----
  const matFeixe = new THREE.MeshBasicMaterial({
    color: corBrilho,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.materials.push(matFeixe);
  const geoFeixe = geo(new THREE.ConeGeometry(0.55, 2.2, 20, 1, true));
  const feixe = new THREE.Mesh(geoFeixe, matFeixe);
  feixe.position.set(0, ALT_CORPO + 1.0, 0);
  feixe.visible = false;
  grupoFlutuante.add(feixe);

  // ---- Partículas e moedas (criadas na abertura) ----
  let particulas = null;
  let moedas = null;

  function criarParticulas() {
    const grupo = new THREE.Group();
    const geoP = geo(new THREE.SphereGeometry(0.035, 8, 8));
    const matP = new THREE.MeshBasicMaterial({
      color: corBrilho,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposables.materials.push(matP);

    const itens = [];
    for (let i = 0; i < 30; i++) {
      const m = new THREE.Mesh(geoP, matP.clone());
      disposables.materials.push(m.material);
      m.material.opacity = 0;
      const ang = Math.random() * Math.PI * 2;
      const raio = Math.random() * 0.35;
      m.position.set(
        Math.cos(ang) * raio,
        ALT_CORPO + 0.1 + Math.random() * 0.2,
        Math.sin(ang) * raio
      );
      m.userData = {
        vx: (Math.random() - 0.5) * 1.2,
        vy: 1.2 + Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 1.2,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.4,
        delay: Math.random() * 0.15,
      };
      grupo.add(m);
      itens.push(m);
    }
    grupo.userData.itens = itens;
    return grupo;
  }

  function criarMoedas() {
    const grupo = new THREE.Group();
    const geoM = geo(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 16));
    const matM = matToon(COR_DOURADO);
    const itens = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(geoM, matM);
      m.rotation.x = Math.PI / 2;
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      m.position.set(0, ALT_CORPO + 0.15, 0);
      m.userData = {
        vx: Math.cos(ang) * (1.2 + Math.random() * 0.8),
        vy: 2.2 + Math.random() * 1.0,
        vz: Math.sin(ang) * (1.2 + Math.random() * 0.8),
        rot: (Math.random() - 0.5) * 8,
        life: 0,
        maxLife: 1.2,
      };
      grupo.add(m);
      itens.push(m);
    }
    grupo.userData.itens = itens;
    return grupo;
  }

  // ---- Estado ----
  let rafId = 0;
  let rodando = true;
  let tempoInicio = performance.now();
  let estado = 'idle'; // 'idle' | 'abrindo' | 'aberto'
  let tempoAbertura = 0;
  let aberturaResolvida = false;
  let resolverAbertura = null;
  let aberturaPromise = null;

  const duracaoAbertura = prefersReduced ? 0.2 : 1.6;
  const duracaoTremor = prefersReduced ? 0 : 0.8;
  const inicioTampa = prefersReduced ? 0 : 0.8;
  const fimTampa = prefersReduced ? 0.2 : 1.25;
  const inicioLuz = prefersReduced ? 0 : 0.8;
  const tempoResolve = prefersReduced ? 0.2 : 1.4;

  function atualizarTamanho() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(() => atualizarTamanho());
  ro.observe(container);
  atualizarTamanho();

  function abrir() {
    if (aberturaPromise) return aberturaPromise;
    aberturaPromise = new Promise((resolve) => {
      resolverAbertura = resolve;
      estado = 'abrindo';
      tempoAbertura = 0;
      aberturaResolvida = false;
      if (!prefersReduced) {
        particulas = criarParticulas();
        grupoFlutuante.add(particulas);
        moedas = criarMoedas();
        grupoFlutuante.add(moedas);
      }
      feixe.visible = true;
      feixe.scale.set(0.01, 0.01, 0.01);
      matFeixe.opacity = 0;
    });
    return aberturaPromise;
  }

  function destruir() {
    rodando = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    ro.disconnect();
    if (resolverAbertura && !aberturaResolvida) {
      aberturaResolvida = true;
      resolverAbertura();
    }
    for (const g of disposables.geometries) {
      try { g.dispose(); } catch (e) {}
    }
    for (const m of disposables.materials) {
      try { m.dispose(); } catch (e) {}
    }
    scene.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mm) => mm.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    renderer.dispose();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  function animar(agora) {
    if (!rodando) return;
    rafId = requestAnimationFrame(animar);

    const t = (agora - tempoInicio) / 1000;

    // ---- Idle: flutuação ----
    let flutuacaoY = 0;
    if (estado === 'idle') {
      flutuacaoY = Math.sin(t * 2.0) * 0.025;
      grupoFlutuante.position.y = flutuacaoY;
      // brilho pulsante na fechadura
      matBrilhoFechadura.opacity = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(t * 3.0));
      brilhoFechadura.scale.setScalar(0.9 + 0.15 * Math.sin(t * 3.0));
      // sombra acompanha
      sombra.scale.setScalar(1 - flutuacaoY * 0.6);
      matSombra.opacity = 0.28 - flutuacaoY * 0.4;
    } else if (estado === 'abrindo' || estado === 'aberto') {
      // mantém leve flutuação
      flutuacaoY = Math.sin(t * 2.0) * 0.015;
      grupoFlutuante.position.y = flutuacaoY;
      sombra.scale.setScalar(1 - flutuacaoY * 0.6);
    }

    if (estado === 'abrindo') {
      tempoAbertura += 1 / 60;
      // usa tempo real para melhor precisão
      const dt = 1 / 60;
      const ta = tempoAbertura;

      // ---- Fase 1: tremor ----
      if (!prefersReduced && ta < duracaoTremor) {
        const p = ta / duracaoTremor;
        const forca = 0.02 + p * 0.06;
        const freq = 30 + p * 20;
        const tremor = Math.sin(ta * freq) * forca;
        grupoCorpo.rotation.z = tremor;
        const squash = 1 + Math.sin(ta * freq * 0.5) * (0.02 + p * 0.03);
        grupoCorpo.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
        // pulinho no corpo
        grupoCorpo.position.y = Math.abs(Math.sin(ta * freq * 0.5)) * 0.02 * p;
      } else {
        grupoCorpo.rotation.z *= 0.85;
        grupoCorpo.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
        grupoCorpo.position.y *= 0.85;
      }

      // ---- Fase 2: tampa abre ----
      if (ta >= inicioTampa) {
        const p = clamp01((ta - inicioTampa) / (fimTampa - inicioTampa));
        const eased = easeOutBack(p);
        const angulo = THREE.MathUtils.degToRad(110) * eased;
        pivotTampa.rotation.x = -angulo;

        // pulinho do corpo no início da abertura
        if (p < 0.4) {
          const pp = p / 0.4;
          grupoCorpo.position.y += Math.sin(pp * Math.PI) * 0.06;
        }
      }

      // ---- Fase 3: luz, partículas, moedas ----
      if (ta >= inicioLuz) {
        const p = clamp01((ta - inicioLuz) / 0.6);
        const eased = easeOutCubic(p);
        feixe.visible = true;
        feixe.scale.set(
          0.3 + eased * 0.9,
          0.3 + eased * 1.0,
          0.3 + eased * 0.9
        );
        matFeixe.opacity = 0.55 * eased;

        // partículas
        if (particulas) {
          const itens = particulas.userData.itens;
          for (const m of itens) {
            const d = m.userData;
            d.life += dt;
            if (d.life < d.delay) {
              m.material.opacity = 0;
              continue;
            }
            const lt = d.life - d.delay;
            if (lt > d.maxLife) {
              m.material.opacity = 0;
              continue;
            }
            m.position.x += d.vx * dt;
            m.position.y += d.vy * dt;
            m.position.z += d.vz * dt;
            d.vy -= 1.8 * dt;
            const fade = 1 - lt / d.maxLife;
            m.material.opacity = fade;
            m.scale.setScalar(0.6 + fade * 0.8);
          }
        }

        // moedas
        if (moedas) {
          const itens = moedas.userData.itens;
          for (const m of itens) {
            const d = m.userData;
            d.life += dt;
            if (d.life > d.maxLife) {
              m.visible = false;
              continue;
            }
            m.position.x += d.vx * dt;
            m.position.y += d.vy * dt;
            m.position.z += d.vz * dt;
            d.vy -= 6.0 * dt;
            m.rotation.z += d.rot * dt;
            m.rotation.x += d.rot * 0.5 * dt;
            const fade = 1 - d.life / d.maxLife;
            m.scale.setScalar(Math.max(0.01, fade));
          }
        }
      }

      // resolve a promise
      if (!aberturaResolvida && ta >= tempoResolve) {
        aberturaResolvida = true;
        estado = 'aberto';
        if (resolverAbertura) resolverAbertura();
      }
    } else if (estado === 'aberto') {
      // feixe pulsando suavemente
      const pulso = 0.5 + 0.5 * Math.sin(t * 2.5);
      matFeixe.opacity = 0.35 + pulso * 0.25;
      feixe.scale.set(
        1.0 + pulso * 0.08,
        1.0 + pulso * 0.1,
        1.0 + pulso * 0.08
      );
      // brilho da fechadura continua
      matBrilhoFechadura.opacity = 0.15 + 0.1 * pulso;
    }

    renderer.render(scene, camera);
  }

  rafId = requestAnimationFrame(animar);

  return {
    abrir,
    destruir,
  };
}