export default function criar(ctx) {
  const T = ctx.THREE;
  const g = new T.Group();
  const C = ctx.cores;
  const rnd = ctx.rnd(1337);

  // ---------- Cidade ----------
  const N = 7;
  const passo = 2.2;
  const offset = (N - 1) * passo * 0.5;

  const predios = [];
  const janelas = [];
  const janelaGeo = new T.PlaneGeometry(0.14, 0.18);

  const matAresta = new T.LineBasicMaterial({ color: 0x2f7dff, transparent: true, opacity: 0.75 });
  const matPredio = new T.MeshStandardMaterial({ color: 0x0a1220, metalness: 0.7, roughness: 0.55 });
  const matPredio2 = new T.MeshStandardMaterial({ color: 0x0d1626, metalness: 0.6, roughness: 0.6 });

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const cx = i * passo - offset;
      const cz = j * passo - offset;
      const dist = Math.sqrt(cx * cx + cz * cz);
      const h = 0.6 + rnd() * 2.4 + Math.max(0, 1.8 - dist * 0.25);
      const w = 0.9 + rnd() * 0.4;
      const d = 0.9 + rnd() * 0.4;
      const geo = new ctx.RoundedBoxGeometry(w, h, d, 2, 0.05);
      const m = new T.Mesh(geo, rnd() > 0.5 ? matPredio : matPredio2);
      m.add(new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w, h, d)), matAresta));
      m.position.set(cx, h * 0.5, cz);
      g.add(m);
      predios.push({ mesh: m, cx, cz, h });

      const cor = rnd() > 0.35 ? 0xffe14a : 0x2fa8ff;
      const linhas = Math.max(2, Math.floor(h / 0.35));
      const cols = 3;
      for (let f = 0; f < 4; f++) {
        for (let ly = 0; ly < linhas; ly++) {
          for (let lx = 0; lx < cols; lx++) {
            if (rnd() > 0.55) continue;
            const jm = new T.Mesh(janelaGeo, new T.MeshBasicMaterial({ color: cor }));
            const y = 0.18 + ly * (h - 0.3) / linhas;
            const px = (lx - (cols - 1) / 2) * (w / cols) * 0.9;
            const ang = f * Math.PI / 2;
            jm.position.set(cx, y, cz);
            if (f === 0) { jm.position.z = cz + d * 0.5 + 0.01; jm.position.x = cx + px; }
            if (f === 2) { jm.position.z = cz - d * 0.5 - 0.01; jm.position.x = cx - px; }
            if (f === 1) { jm.position.x = cx + w * 0.5 + 0.01; jm.position.z = cz - px; }
            if (f === 3) { jm.position.x = cx - w * 0.5 - 0.01; jm.position.z = cz + px; }
            jm.rotation.y = ang;
            g.add(jm);
            janelas.push({ mesh: jm, cx, cz, cor });
          }
        }
      }
    }
  }

  // ruas neon
  const matRua = new T.MeshBasicMaterial({ color: C.azul });
  for (let i = 0; i <= N; i++) {
    const p = i * passo - offset - passo * 0.5;
    const linha1 = new T.Mesh(new T.PlaneGeometry(N * passo + 0.5, 0.04), matRua);
    linha1.rotation.x = -Math.PI / 2;
    linha1.position.set(0, 0.01, p);
    g.add(linha1);
    const linha2 = new T.Mesh(new T.PlaneGeometry(0.04, N * passo + 0.5), matRua);
    linha2.rotation.x = -Math.PI / 2;
    linha2.position.set(p, 0.01, 0);
    g.add(linha2);
  }

  const chao = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshStandardMaterial({ color: 0x05070d, metalness: 0.3, roughness: 0.9 }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.01;
  g.add(chao);

  // ---------- Pino GPS ----------
  const pino = new T.Group();
  const esfera = new T.Mesh(new T.SphereGeometry(0.35, 20, 16), new T.MeshStandardMaterial({ color: C.verm, metalness: 0.4, roughness: 0.3, emissive: 0x330008 }));
  esfera.position.y = 0.55;
  const cone = new T.Mesh(new T.ConeGeometry(0.32, 0.7, 16), new T.MeshStandardMaterial({ color: C.verm, metalness: 0.4, roughness: 0.3, emissive: 0x330008 }));
  cone.position.y = 0.05;
  cone.rotation.x = Math.PI;
  pino.add(esfera, cone);
  pino.position.set(0, 8, 0);
  pino.scale.setScalar(0.001);
  g.add(pino);

  const anel = new T.Mesh(new T.RingGeometry(0.6, 0.75, 32), new T.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.8, side: T.DoubleSide }));
  anel.rotation.x = -Math.PI / 2;
  anel.position.y = 0.02;
  anel.scale.setScalar(0.001);
  g.add(anel);

  // ---------- Semáforos ----------
  // Posicionados próximos ao centro, agrupados, para o close
  const semaG = new T.Group(); semaG.position.set(0, 0, 9); semaG.scale.setScalar(2.2); g.add(semaG);
  const semaforos = [];
  const posSema = [[-0.9, 0, 0.9], [0.9, 0, 0.9], [0, 0, -0.9]];
  for (let s = 0; s < 3; s++) {
    const sg = new T.Group();
    const caixa = new T.Mesh(new ctx.RoundedBoxGeometry(0.35, 0.9, 0.25, 2, 0.04), new T.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.8, roughness: 0.3 }));
    caixa.position.y = 0.45;
    sg.add(caixa);
    const luzes = [];
    const cores = [0xff2b3d, 0xffe14a, 0x25d366];
    for (let l = 0; l < 3; l++) {
      const luz = new T.Mesh(new T.SphereGeometry(0.09, 12, 10), new T.MeshBasicMaterial({ color: cores[l] }));
      luz.position.set(0, 0.75 - l * 0.28, 0.14);
      sg.add(luz);
      luzes.push(luz);
    }
    const poste = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.2, 8), new T.MeshStandardMaterial({ color: 0x111111 }));
    poste.position.y = -0.6;
    sg.add(poste);
    sg.position.set(posSema[s][0], 0, posSema[s][2]);
    sg.scale.setScalar(0.001);
    semaG.add(sg);
    semaforos.push({ grupo: sg, luzes });
  }

  // ---------- Caixas de entrega ----------
  const entregas = [];
  const posEnt = [[-2.2, 0, 0], [2.2, 0, 0], [0, 0, 2.2]];
  for (let e = 0; e < 3; e++) {
    const eg = new T.Group();
    const cubo = new T.Mesh(new ctx.RoundedBoxGeometry(0.5, 0.5, 0.5, 2, 0.04), new T.MeshStandardMaterial({ color: 0x8b5a2b, metalness: 0.2, roughness: 0.8 }));
    cubo.position.y = 0.25;
    eg.add(cubo);
    const fita = new T.Mesh(new T.BoxGeometry(0.52, 0.12, 0.52), new T.MeshStandardMaterial({ color: 0xd4a373 }));
    fita.position.y = 0.25;
    eg.add(fita);
    eg.position.set(posEnt[e][0], 0, posEnt[e][2]);
    eg.scale.setScalar(0.001);
    g.add(eg);
    entregas.push(eg);
  }

  const ampulheta = new T.Group();
  const topo = new T.Mesh(new T.ConeGeometry(0.25, 0.35, 12), new T.MeshBasicMaterial({ color: C.amarelo }));
  topo.position.y = 0.2;
  topo.rotation.x = Math.PI;
  const base = new T.Mesh(new T.ConeGeometry(0.25, 0.35, 12), new T.MeshBasicMaterial({ color: C.amarelo }));
  base.position.y = -0.2;
  ampulheta.add(topo, base);
  ampulheta.position.set(0, 2.2, 0);
  ampulheta.scale.setScalar(0.001);
  g.add(ampulheta);

  // ---------- Carrinhos ----------
  const carrinhos = [];
  for (let c = 0; c < 10; c++) {
    const cor = [0x2fa8ff, 0xffe14a, 0xf2f4f8, 0x25d366][c % 4];
    const car = new T.Mesh(new ctx.RoundedBoxGeometry(0.22, 0.14, 0.4, 1, 0.03), new T.MeshStandardMaterial({ color: cor, metalness: 0.5, roughness: 0.4 }));
    const eixo = c % 2;
    const linha = Math.floor(c / 2) - 2;
    const pos = linha * passo;
    car.position.set(eixo ? pos : -offset + 0.5, 0.07, eixo ? -offset + 0.5 : pos);
    car.userData = { eixo, pos, vel: 0.6 + rnd() * 0.4, fase: rnd() * 10 };
    g.add(car);
    carrinhos.push(car);
  }

  const luzVerm = new T.PointLight(0xff2b3d, 0, 20);
  luzVerm.position.set(0, 3, 0);
  g.add(luzVerm);

  // ---------- update ----------
  return {
    grupo: g,
    update(t, k, dur) {
      // ===== Câmera =====
      // Plano geral aéreo orbitando devagar
      const orb = 0.35 + k * 0.08;
      const raioGeral = 13.5;
      const camYGeral = 10.5;

      // Close nos semáforos: câmera baixa perto do grupo central
      // Alvo: centro dos semáforos em y~0.5, z~0.9
      const alvoSema = new T.Vector3(0, 1.4, 9);

      // Fatores de mistura
      // close começa em k=2.56 (30.56) e termina em k=3.64 (31.64)
      const closeIn = ctx.clamp01((k - 2.45) / 0.35);
      const closeOut = ctx.clamp01((k - 3.55) / 0.35);
      const closeW = closeIn * (1 - closeOut);

      // posição geral
      const gx = Math.cos(orb) * raioGeral;
      const gz = Math.sin(orb) * raioGeral;
      const gy = camYGeral + Math.sin(k * 0.7) * 0.6;

      // posição close: câmera na frente dos semáforos, olhando para eles
      // semáforos em z=0.9 (frente) e z=-0.9 (atrás). Câmera vem de +z
      const cx = 0.0 + Math.sin(k * 1.5) * 0.15;
      const cy = 2.6;
      const cz = 16.5;

      const camX = gx * (1 - closeW) + cx * closeW;
      const camY = gy * (1 - closeW) + cy * closeW;
      const camZ = gz * (1 - closeW) + cz * closeW;

      // lookAt: geral olha para o centro da cidade (y=0.8 para subir o assunto)
      // close olha para os semáforos
      const lookGeral = new T.Vector3(0, 0.8, 0);
      const lx = lookGeral.x * (1 - closeW) + alvoSema.x * closeW;
      const ly = lookGeral.y * (1 - closeW) + alvoSema.y * closeW;
      const lz = lookGeral.z * (1 - closeW) + alvoSema.z * closeW;

      matAresta.color.set(k > 4.5 ? 0xff2b3d : 0x2f7dff);
      ctx.cam.position.set(camX, camY, camZ);
      ctx.cam.lookAt(lx, ly, lz);

      // ---- apagão em 28.90 (k=0.90) ----
      const apagaoT = 0.90;
      const raioApagao = Math.max(0, (k - apagaoT) * 6);
      for (let i = 0; i < janelas.length; i++) {
        const j = janelas[i];
        const d = Math.sqrt(j.cx * j.cx + j.cz * j.cz);
        const apagou = k > apagaoT && d < raioApagao;
        j.mesh.visible = !apagou;
      }
      if (k > apagaoT && k < apagaoT + 0.3) {
        ctx.fx.shake = Math.max(ctx.fx.shake, 0.8 * (1 - (k - apagaoT) / 0.3));
      }

      // ---- pino GPS em 29.64 (k=1.64) ----
      const pinoT = 1.64;
      if (k > pinoT) {
        const kp = k - pinoT;
        const queda = Math.min(1, kp / 0.5);
        const y = 8 - ctx.ease(queda) * 7.6;
        let yFinal = y;
        if (kp > 0.5) {
          const b = kp - 0.5;
          yFinal = 0.4 + Math.abs(Math.sin(b * 8)) * 0.6 * Math.exp(-b * 4);
        }
        pino.position.set(0, yFinal, 0);
        const pop = ctx.clamp01(kp / 0.15);
        pino.scale.setScalar(pop * (1 + 0.15 * Math.sin(kp * 20) * Math.exp(-kp * 3)));
        pino.rotation.y = kp * 3;
        if (kp < 0.1) ctx.fx.shake = Math.max(ctx.fx.shake, 0.4);
        if (kp > 0.5) {
          anel.scale.setScalar(1 + (kp - 0.5) * 2);
          anel.material.opacity = Math.max(0, 0.8 - (kp - 0.5) * 0.8);
        }
      }

      // ---- semáforos em 30.56 (k=2.56) ----
      const semT = 2.56;
      for (let s = 0; s < semaforos.length; s++) {
        const sg = semaforos[s];
        if (k > semT) {
          const ks = k - semT;
          const pop = ctx.clamp01(ks / 0.2);
          sg.grupo.scale.setScalar(pop * (1 + 0.15 * Math.sin(ks * 15) * Math.exp(-ks * 4)));
          const ciclo = Math.floor(ks * 8) % 3;
          for (let l = 0; l < 3; l++) {
            sg.luzes[l].material.color.setHex(l === ciclo ? [0xff2b3d, 0xffe14a, 0x25d366][l] : 0x111111);
          }
          if (ks > 0.7) {
            const pisca = Math.sin(ks * 20) > 0;
            for (let l = 0; l < 3; l++) {
              sg.luzes[l].material.color.setHex(l === 1 && pisca ? 0xffe14a : 0x111111);
            }
          }
          if (ks > 1.1) {
            for (let l = 0; l < 3; l++) sg.luzes[l].material.color.setHex(0x111111);
          }
        }
      }

      // ---- entregas em 31.64 (k=3.64) ----
      const entT = 3.64;
      for (let e = 0; e < entregas.length; e++) {
        const eg = entregas[e];
        if (k > entT) {
          const ke = k - entT;
          const pop = ctx.clamp01(ke / 0.2);
          eg.scale.setScalar(pop * (1 + 0.15 * Math.sin(ke * 15) * Math.exp(-ke * 4)));
        }
      }
      if (k > entT) {
        const ke = k - entT;
        const pop = ctx.clamp01(ke / 0.2);
        ampulheta.scale.setScalar(pop);
        ampulheta.rotation.y = ke * 2;
        ampulheta.position.y = 2.2 + Math.sin(ke * 3) * 0.1;
      }

      // ---- carrinhos param em 32.58 (k=4.58) ----
      const travaT = 4.58;
      for (let c = 0; c < carrinhos.length; c++) {
        const car = carrinhos[c];
        const u = car.userData;
        let pos;
        if (k < travaT) {
          pos = ((u.pos + k * u.vel + u.fase) % (N * passo)) - offset;
        } else {
          pos = ((u.pos + travaT * u.vel + u.fase) % (N * passo)) - offset;
        }
        if (u.eixo) {
          car.position.z = pos;
        } else {
          car.position.x = pos;
        }
      }

      // ---- tudo vermelho em 32.58 ----
      if (k > travaT) {
        const kr = ctx.clamp01((k - travaT) / 0.8);
        luzVerm.intensity = kr * 6;
        ctx.fx.red = Math.max(ctx.fx.red, kr * 0.6);
      }

      // ---- congelamento em 33.52 (k=5.52) ----
      const congelaT = 5.52;
      if (k > congelaT) {
        const kc = k - congelaT;
        ctx.fx.gl = Math.max(ctx.fx.gl, 0.8 * Math.exp(-kc * 2));
        ctx.fx.flash = Math.max(ctx.fx.flash, Math.exp(-kc * 3));
        ctx.fx.shake = Math.max(ctx.fx.shake, 0.6 * Math.exp(-kc * 2));
        ctx.fx.ab = 0.02;
      }

      ctx.fx.bloom = 0.7;
    }
  };
}