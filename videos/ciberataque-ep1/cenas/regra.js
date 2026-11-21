export default function criar(ctx) {
  const T = ctx.THREE;
  const g = new T.Group();
  const C = ctx.cores;
  const rnd = ctx.rnd(1337);

  // ---------- TÚNEL DE ANÉIS ----------
  const tuneis = [];
  const N_ANEIS = 14;
  const anelGeo = new T.TorusGeometry(1.9, 0.045, 8, 40);
  const anelMat = new T.MeshBasicMaterial({
    color: C.verm, transparent: true, opacity: 0.5, depthWrite: false
  });
  const anelMatB = new T.MeshBasicMaterial({
    color: C.azul, transparent: true, opacity: 0.4, depthWrite: false
  });
  for (let i = 0; i < N_ANEIS; i++) {
    const m = new T.Mesh(anelGeo, i % 3 === 0 ? anelMatB : anelMat);
    m.position.set(0, 0, -i * 2.2);
    m.rotation.z = i * 0.35;
    g.add(m);
    tuneis.push(m);
  }

  // ---------- ESCUDO ----------
  const shape = new T.Shape();
  shape.moveTo(0, 1.15);
  shape.lineTo(0.95, 0.85);
  shape.lineTo(0.95, -0.15);
  shape.quadraticCurveTo(0.95, -0.95, 0, -1.35);
  shape.quadraticCurveTo(-0.95, -0.95, -0.95, -0.15);
  shape.lineTo(-0.95, 0.85);
  shape.lineTo(0, 1.15);
  const escGeo = new T.ExtrudeGeometry(shape, {
    depth: 0.22, bevelEnabled: true, bevelThickness: 0.06,
    bevelSize: 0.06, bevelSegments: 3, curveSegments: 12
  });
  escGeo.center();
  const escMat = new T.MeshStandardMaterial({
    color: 0x1a0a10, emissive: 0x551018, emissiveIntensity: 0.5,
    metalness: 0.85, roughness: 0.35
  });
  const escudo = new T.Mesh(escGeo, escMat);
  escudo.scale.setScalar(0.001);
  g.add(escudo);

  // borda neon do escudo
  const bordaGeo = new T.TorusGeometry(1.05, 0.035, 8, 48);
  const bordaMat = new T.MeshBasicMaterial({ color: C.verm });
  const borda = new T.Mesh(bordaGeo, bordaMat);
  borda.scale.set(1, 1.15, 1);
  borda.position.z = 0.14;
  escudo.add(borda);

  // "Nº 1" em canvas
  const tela1 = ctx.telaCanvas(512, 512);
  const g2 = tela1.g2d;
  g2.clearRect(0, 0, 512, 512);
  g2.fillStyle = C.verm;
  g2.font = 'bold 90px Archivo';
  g2.textAlign = 'center';
  g2.textBaseline = 'middle';
  g2.fillText('Nº', 256, 190);
  g2.font = 'bold 220px Anton';
  g2.fillStyle = C.branco;
  g2.fillText('1', 256, 340);
  tela1.tex.needsUpdate = true;
  const placa1 = new T.Mesh(
    new T.PlaneGeometry(1.5, 1.5),
    new T.MeshBasicMaterial({ map: tela1.tex, transparent: true })
  );
  placa1.position.z = 0.4;
  escudo.add(placa1);

  // luz do escudo (suave)
  const luzEsc = new T.PointLight(C.verm, 2.5, 10, 2);
  luzEsc.position.set(0, 0.4, 1.2);
  escudo.add(luzEsc);

  // ---------- WI-FI + AMPULHETA (atrás do escudo) ----------
  const fundoGrupo = new T.Group();
  fundoGrupo.position.set(0, 0, -2.2);
  g.add(fundoGrupo);

  // ícone wifi: 3 arcos
  const wifiMat = new T.MeshStandardMaterial({
    color: 0x2a2f38, emissive: 0x555a66, emissiveIntensity: 0.4,
    metalness: 0.6, roughness: 0.5
  });
  const wifi = new T.Group();
  for (let i = 0; i < 3; i++) {
    const r = 0.35 + i * 0.32;
    const arc = new T.Mesh(
      new T.TorusGeometry(r, 0.05, 6, 24, Math.PI),
      wifiMat
    );
    arc.rotation.z = Math.PI;
    arc.position.y = 0.55;
    wifi.add(arc);
  }
  const dot = new T.Mesh(new T.SphereGeometry(0.09, 10, 10), wifiMat);
  dot.position.y = 0.55;
  wifi.add(dot);
  wifi.position.set(0, 0.55, 0);
  fundoGrupo.add(wifi);

  // ampulheta: dois cones unidos
  const ampMat = new T.MeshStandardMaterial({
    color: 0x1a1f28, emissive: 0x3a4250, emissiveIntensity: 0.5,
    metalness: 0.8, roughness: 0.35
  });
  const ampulheta = new T.Group();
  const coneTop = new T.Mesh(new T.ConeGeometry(0.42, 0.55, 16, 1, true), ampMat);
  coneTop.position.y = 0.28;
  coneTop.rotation.x = Math.PI;
  const coneBot = new T.Mesh(new T.ConeGeometry(0.42, 0.55, 16, 1, true), ampMat);
  coneBot.position.y = -0.28;
  const areia = new T.Mesh(
    new T.ConeGeometry(0.3, 0.35, 12),
    new T.MeshBasicMaterial({ color: C.amarelo })
  );
  areia.position.y = -0.32;
  ampulheta.add(coneTop, coneBot, areia);
  ampulheta.position.y = -0.55;
  fundoGrupo.add(ampulheta);

  // ---------- X VERMELHO ----------
  const xGrupo = new T.Group();
  const xMat = new T.MeshBasicMaterial({ color: C.verm });
  const barraGeo = new T.BoxGeometry(2.4, 0.22, 0.12);
  const b1 = new T.Mesh(barraGeo, xMat);
  b1.rotation.z = Math.PI / 4;
  const b2 = new T.Mesh(barraGeo, xMat);
  b2.rotation.z = -Math.PI / 4;
  xGrupo.add(b1, b2);
  xGrupo.position.set(0, 0, 0.6);
  xGrupo.scale.setScalar(0.001);
  fundoGrupo.add(xGrupo);

  // luz ambiente da cena
  const luzFundo = new T.PointLight(C.azul, 1.5, 10, 2);
  luzFundo.position.set(0, 0, -1);
  fundoGrupo.add(luzFundo);

  // ---------- UPDATE ----------
  return {
    grupo: g,
    update(t, k, dur) {
      const tImpacto = 43.0;
      const tFim = 44.66;
      const kImp = tImpacto - 41.5; // 1.5
      const kFim = tFim - 41.5;     // 3.16

      // avanço em z: acelera até impacto, depois trava
      let avanco;
      if (k < kImp) {
        const p = ctx.ease(k / kImp);
        avanco = -p * 22;
      } else {
        avanco = -22;
      }

      // câmera dentro do túnel
      const camZ = 6 + avanco;
      const camY = 0.9 + Math.sin(k * 0.9) * 0.15;
      const camX = Math.sin(k * 0.6) * 0.25;
      ctx.cam.position.set(camX, camY, camZ);
      ctx.cam.lookAt(0, 0.5, camZ - 6);

      // anéis: reposiciona em loop conforme avanço (determinístico)
      const baseZ = -((k * 6) % 2.2);
      const parado = k >= kImp;
      for (let i = 0; i < tuneis.length; i++) {
        const m = tuneis[i];
        let z = -i * 2.2 + baseZ;
        while (z > 6) z -= N_ANEIS * 2.2;
        // após impacto, empurra anéis para trás da câmera (fora do caminho)
        if (parado) {
          // anéis ficam todos atrás da câmera (z < camZ - 3)
          const alvoZ = camZ - 10 - i * 1.5;
          z = alvoZ;
        }
        m.position.z = z;
        m.rotation.z = i * 0.35 + k * 0.4;
        const dist = Math.abs(z - camZ);
        const vis = ctx.clamp01(1 - dist / 26);
        m.scale.setScalar(0.6 + vis * 0.5);
        // esconde anéis que estão na frente do escudo após impacto
        if (parado && z > camZ - 3) {
          m.visible = false;
        } else {
          m.visible = true;
        }
      }

      // ---- escudo: pop em 42.10, vem à frente, para em 43.0 ----
      const kPop = 42.10 - 41.5; // 0.6
      const kChega = 43.0 - 41.5; // 1.5
      let escScale = 0.001;
      let escZ = -14;
      if (k >= kPop) {
        const p = ctx.clamp01((k - kPop) / 0.25);
        let s;
        if (p < 0.6) s = (p / 0.6) * 1.15;
        else s = 1.15 - ((p - 0.6) / 0.4) * 0.15;
        escScale = s;
        const q = ctx.ease(ctx.clamp01((k - kPop) / (kChega - kPop)));
        escZ = -14 + q * 16.2;
      }
      escudo.scale.setScalar(escScale);
      escZ = Math.min(escZ, camZ - 6.5) ; if (k >= kPop) escZ = (camZ - 6.5) - (1 - ctx.ease(ctx.clamp01((k - kPop) / 0.6))) * 14;
      escudo.position.set(0, 1.9, escZ);
      fundoGrupo.position.set(0, 1.2, camZ - 9.5);
      escudo.rotation.y = Math.sin(k * 0.8) * 0.15;
      escudo.rotation.x = Math.sin(k * 0.5) * 0.05;

      // brilho do escudo pulsa (suave)
      escMat.emissiveIntensity = 0.5 + ctx.pulso(t, 2.5) * 0.3;
      bordaMat.color.setHex(k >= kFim ? 0xffffff : 0xff2b3d);

      // ---- impacto em 43.0 ----
      if (k >= kChega && k < kChega + 0.35) {
        const d = (k - kChega) / 0.35;
        ctx.fx.flash = Math.max(ctx.fx.flash, 0.8 * (1 - d));
        ctx.fx.shake = Math.max(ctx.fx.shake, 1.2 * (1 - d));
        ctx.fx.ab = 0.02 * (1 - d);
      }

      // ---- fundo: wifi + ampulheta aparecem em 44.2 ----
      const kFundo = 44.2 - 41.5; // 2.7
      let fundoScale = 0.001;
      if (k >= kFundo) {
        const p = ctx.clamp01((k - kFundo) / 0.25);
        let s;
        if (p < 0.6) s = (p / 0.6) * 1.15;
        else s = 1.15 - ((p - 0.6) / 0.4) * 0.15;
        fundoScale = s;
      }
      fundoGrupo.scale.setScalar(fundoScale);
      ampulheta.rotation.y = k * 2.2;
      ampulheta.rotation.z = Math.sin(k * 1.5) * 0.2;
      wifiMat.emissiveIntensity = 0.4 + ctx.pulso(t, 3) * 0.3;

      // ---- X em 44.66 ----
      const kX = 44.66 - 41.5; // 3.16
      if (k >= kX) {
        const p = ctx.clamp01((k - kX) / 0.18);
        let s;
        if (p < 0.6) s = (p / 0.6) * 1.15;
        else s = 1.15 - ((p - 0.6) / 0.4) * 0.15;
        xGrupo.scale.setScalar(s);
        ctx.fx.red = Math.max(ctx.fx.red, 0.35);
        if (k < kX + 0.2) {
          ctx.fx.shake = Math.max(ctx.fx.shake, 0.6 * (1 - (k - kX) / 0.2));
        }
      } else {
        xGrupo.scale.setScalar(0.001);
      }

      // bloom controlado para não estourar
      ctx.fx.bloom = 0.5;
    }
  };
}