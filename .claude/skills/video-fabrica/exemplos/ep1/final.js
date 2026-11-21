export default function criar(ctx) {
  const T = ctx.THREE;
  const g = new T.Group();
  const C = ctx.cores;

  // ---------- PLACA "PARTE 2" ----------
  const placaGroup = new T.Group();
  placaGroup.position.set(0, 2.75, 0);
  g.add(placaGroup);

  const molduraGeo = new ctx.RoundedBoxGeometry(3.4, 1.05, 0.08, 3, 0.06);
  const molduraMat = new T.MeshStandardMaterial({
    color: 0x0a1830, metalness: 0.9, roughness: 0.35,
    emissive: new T.Color(C.azul), emissiveIntensity: 0.25
  });
  const moldura = new T.Mesh(molduraGeo, molduraMat);
  placaGroup.add(moldura);

  const bordaGeo = new T.EdgesGeometry(new T.BoxGeometry(3.4, 1.05, 0.08));
  const bordaMat = new T.LineBasicMaterial({ color: C.azul });
  const borda = new T.LineSegments(bordaGeo, bordaMat);
  placaGroup.add(borda);

  const textoPlaca = ctx.textoPlano('PARTE 2', {
    tamanho: 128, cor: C.azul, fonte: 'Anton', largura: 2.9
  });
  textoPlaca.position.set(0, 0, 0.06);
  placaGroup.add(textoPlaca);

  const faixas = [];
  const nFaixas = 14;
  for (let i = 0; i < nFaixas; i++) {
    const fGeo = new T.PlaneGeometry(3.4, 1.05 / nFaixas);
    const fMat = new T.MeshBasicMaterial({
      color: C.azul, transparent: true, opacity: 0.0,
      blending: T.AdditiveBlending, depthWrite: false
    });
    const f = new T.Mesh(fGeo, fMat);
    f.position.set(0, 0.525 - (i + 0.5) * (1.05 / nFaixas), 0.07);
    placaGroup.add(f);
    faixas.push(f);
  }

  // ---------- RELÓGIO 24:00:00 ----------
  const relogioGroup = new T.Group();
  relogioGroup.position.set(0, 1.1, 0);
  g.add(relogioGroup);

  const telaRel = ctx.telaCanvas(512, 256);
  const relTex = telaRel.tex;
  const relMat = new T.MeshBasicMaterial({ map: relTex, transparent: true });
  const relMesh = new T.Mesh(new T.PlaneGeometry(2.9, 1.45), relMat);
  relogioGroup.add(relMesh);

  const anelGeo = new T.RingGeometry(1.7, 1.86, 64, 1, 0, Math.PI * 2);
  const anelMat = new T.MeshBasicMaterial({
    color: C.verm, transparent: true, opacity: 0.8,
    side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false
  });
  const anel = new T.Mesh(anelGeo, anelMat);
  anel.position.z = -0.02;
  relogioGroup.add(anel);

  const relFundo = new T.Mesh(
    new T.PlaneGeometry(3.1, 1.6),
    new T.MeshBasicMaterial({ color: 0x050a14, transparent: true, opacity: 0.85 })
  );
  relFundo.position.z = -0.05;
  relogioGroup.add(relFundo);

  // ---------- BOTÃO SEGUIR ----------
  const botaoGroup = new T.Group();
  botaoGroup.position.set(0, -0.5, 0);
  g.add(botaoGroup);

  const btnGeo = new ctx.RoundedBoxGeometry(2.4, 0.75, 0.35, 4, 0.14);
  const btnMat = new T.MeshStandardMaterial({
    color: 0x8a0f1a, metalness: 0.6, roughness: 0.3,
    emissive: new T.Color(C.verm), emissiveIntensity: 0.6
  });
  const botao = new T.Mesh(btnGeo, btnMat);
  botaoGroup.add(botao);

  const btnTexto = ctx.textoPlano('SEGUIR', {
    tamanho: 96, cor: '#ffffff', fonte: 'Archivo', largura: 1.6
  });
  btnTexto.position.set(0, 0, 0.2);
  botaoGroup.add(btnTexto);

  const btnGlow = new T.Mesh(
    new T.PlaneGeometry(3.0, 1.1),
    new T.MeshBasicMaterial({
      color: C.verm, transparent: true, opacity: 0.0,
      blending: T.AdditiveBlending, depthWrite: false
    })
  );
  btnGlow.position.z = -0.2;
  botaoGroup.add(btnGlow);

  const cursor = new T.Mesh(
    new T.ConeGeometry(0.12, 0.4, 8),
    new T.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.8, roughness: 0.2,
      emissive: new T.Color(C.branco), emissiveIntensity: 0.4
    })
  );
  cursor.rotation.x = Math.PI / 2;
  cursor.position.set(0.9, -0.4, 1.2);
  g.add(cursor);

  const particulas = [];
  const rnd = ctx.rnd(1337);
  for (let i = 0; i < 24; i++) {
    const p = new T.Mesh(
      new T.SphereGeometry(0.04 + rnd() * 0.04, 6, 6),
      new T.MeshBasicMaterial({
        color: i % 2 === 0 ? C.verm : C.amarelo,
        transparent: true, opacity: 0.0,
        blending: T.AdditiveBlending, depthWrite: false
      })
    );
    p.userData = {
      dir: new T.Vector3((rnd() - 0.5) * 2, (rnd() - 0.5) * 2, (rnd() - 0.5) * 2).normalize(),
      vel: 0.8 + rnd() * 1.2
    };
    p.position.copy(botaoGroup.position);
    g.add(p);
    particulas.push(p);
  }

  const luzBtn = new T.PointLight(C.verm, 0, 8);
  luzBtn.position.set(0, -0.95, 1.5);
  g.add(luzBtn);

  // ---------- ESTADO INICIAL ----------
  placaGroup.scale.set(0.001, 0.001, 0.001);
  relogioGroup.scale.set(0.001, 0.001, 0.001);
  botaoGroup.scale.set(0.001, 0.001, 0.001);

  // ---------- UPDATE ----------
  return {
    grupo: g,
    update(t, k, dur) {
      ctx.fx.shake = 0;
      ctx.fx.gl = 0;
      ctx.fx.red = 0;
      ctx.fx.ab = 0.002;
      ctx.fx.flash = 0;
      ctx.fx.bloom = 0.6;

      // ---------- CÂMERA ----------
      const prog = ctx.clamp01(k / dur);
      let camZ;
      if (prog < 0.7) {
        camZ = 12.5 - prog * 1.8;
      } else {
        camZ = 11.24 + (prog - 0.7) * 3.5;
      }
      const camY = 0.35 + Math.sin(k * 0.6) * 0.05;
      ctx.cam.position.set(Math.sin(k * 0.3) * 0.15, camY, camZ);
      ctx.cam.lookAt(0, 0.35, 0);

      // ---------- PLACA PARTE 2 ----------
      const tPlaca = 45.74;
      const kPlaca = t - tPlaca;
      if (kPlaca >= 0) {
        const pop = ctx.ease(ctx.clamp01(kPlaca / 0.25));
        const sc = pop < 1 ? pop * 1.15 : 1;
        placaGroup.scale.setScalar(sc);

        const revealProg = ctx.clamp01(kPlaca / 0.5);
        for (let i = 0; i < nFaixas; i++) {
          const limiar = i / nFaixas;
          const local = ctx.clamp01((revealProg - limiar) * 4);
          faixas[i].material.opacity = local * 0.6 * (1 - ctx.clamp01((revealProg - limiar - 0.15) * 4));
        }
        bordaMat.color.setStyle(C.azul);
        molduraMat.emissiveIntensity = 0.25 + ctx.pulso(t, 2) * 0.15;
      } else {
        placaGroup.scale.setScalar(0.001);
      }

      // ---------- RELÓGIO ----------
      const tRel = 46.96;
      const kRel = t - tRel;
      if (kRel >= 0) {
        const pop = ctx.ease(ctx.clamp01(kRel / 0.25));
        relogioGroup.scale.setScalar(pop < 1 ? pop * 1.1 : 1);

        const tImpacto = 47.56;
        const kCont = ctx.clamp01((t - tRel) / (tImpacto - tRel));
        const totalSeg = 24 * 3600;
        const restante = Math.max(0, totalSeg * (1 - kCont * 0.999));
        const hh = Math.floor(restante / 3600);
        const mm = Math.floor((restante % 3600) / 60);
        const ss = Math.floor(restante % 60);
        const pad = (n) => String(n).padStart(2, '0');

        const g2d = telaRel.g2d;
        g2d.clearRect(0, 0, 512, 256);
        g2d.fillStyle = 'rgba(5,10,20,0.9)';
        g2d.fillRect(0, 0, 512, 256);
        g2d.font = 'bold 96px Archivo';
        g2d.textAlign = 'center';
        g2d.textBaseline = 'middle';
        g2d.shadowColor = C.verm;
        g2d.shadowBlur = 18;
        g2d.fillStyle = C.verm;
        g2d.fillText(pad(hh) + ':' + pad(mm) + ':' + pad(ss), 256, 128);
        g2d.shadowBlur = 0;
        relTex.needsUpdate = true;

        const theta = Math.PI * 2 * kCont;
        anel.geometry.dispose();
        anel.geometry = new T.RingGeometry(1.7, 1.86, 64, 1, Math.PI / 2, -theta);
        anelMat.opacity = 0.8;

        const kImp = t - tImpacto;
        if (kImp >= 0 && kImp < 0.4) {
          const f = 1 - kImp / 0.4;
          ctx.fx.shake = Math.max(ctx.fx.shake, 0.6 * f);
          ctx.fx.flash = Math.max(ctx.fx.flash, 0.25 * f);
          ctx.fx.ab = 0.002 + 0.015 * f;
          relogioGroup.scale.setScalar(1 + 0.12 * f);
          anelMat.color.setStyle(C.amarelo);
        } else {
          anelMat.color.setStyle(C.verm);
        }
      } else {
        relogioGroup.scale.setScalar(0.001);
      }

      // ---------- BOTÃO SEGUIR ----------
      const tBtn = 48.90;
      const kBtn = t - tBtn;
      if (kBtn >= 0) {
        const pop = ctx.ease(ctx.clamp01(kBtn / 0.25));
        let sc = pop < 1 ? pop * 1.15 : 1;
        const pulso = 1 + ctx.pulso(t, 3) * 0.04;
        botaoGroup.scale.setScalar(sc * pulso);

        btnGlow.material.opacity = 0.12 + ctx.pulso(t, 3) * 0.1;
        luzBtn.intensity = 1.5 + ctx.pulso(t, 3) * 1.5;

        const kCursor = ctx.clamp01((t - 48.9) / 0.5);
        cursor.position.set(
          0.9 - kCursor * 0.9,
          -0.4 + kCursor * 0.05,
          1.2 - kCursor * 0.9
        );
        cursor.rotation.z = kCursor * 0.3;

        const tPress = 49.42;
        const kPress = t - tPress;
        if (kPress >= 0 && kPress < 0.5) {
          const f = 1 - kPress / 0.5;
          const afunda = Math.sin(ctx.clamp01(kPress / 0.15) * Math.PI) * 0.25;
          botao.position.z = -afunda;
          btnTexto.position.z = 0.2 - afunda;
          btnMat.emissiveIntensity = 0.6 + f * 1.2;

          if (kPress < 0.15) {
            ctx.fx.flash = Math.max(ctx.fx.flash, 0.3 * (1 - kPress / 0.15));
            ctx.fx.shake = Math.max(ctx.fx.shake, 0.35 * (1 - kPress / 0.15));
          }

          for (let i = 0; i < particulas.length; i++) {
            const p = particulas[i];
            const d = p.userData.dir;
            const v = p.userData.vel;
            const tt = kPress;
            p.position.set(
              botaoGroup.position.x + d.x * v * tt * 2,
              botaoGroup.position.y + d.y * v * tt * 2,
              botaoGroup.position.z + d.z * v * tt * 2 + 0.3
            );
            p.material.opacity = Math.max(0, 1 - tt / 0.5);
            p.scale.setScalar(1 - tt / 0.5);
          }
        } else {
          botao.position.z = 0;
          btnTexto.position.z = 0.2;
          btnMat.emissiveIntensity = 0.6;
          for (let i = 0; i < particulas.length; i++) {
            particulas[i].material.opacity = 0;
          }
        }
      } else {
        botaoGroup.scale.setScalar(0.001);
        for (let i = 0; i < particulas.length; i++) {
          particulas[i].material.opacity = 0;
        }
      }

      // ---------- FX GLOBAIS ----------
      ctx.fx.ab = Math.max(ctx.fx.ab, 0.003);
      if (t > 49.42) {
        ctx.fx.red = Math.max(ctx.fx.red, 0.12 * (1 - ctx.clamp01((t - 49.42) / 0.6)));
      }
    }
  };
}