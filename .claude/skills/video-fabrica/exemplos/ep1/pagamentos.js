export default function criar(ctx) {
  const T = ctx.THREE;
  const g = new T.Group();
  const C = ctx.cores;

  // ---------- helpers ----------
  const rnd = ctx.rnd(1337);
  const matNeon = (cor) => new T.MeshBasicMaterial({ color: cor });
  const matDark = (cor = 0x0a0f1a, rough = 0.35, metal = 0.85) =>
    new T.MeshStandardMaterial({ color: cor, roughness: rough, metalness: metal });

  // ---------- câmera base ----------
  const lookBase = new T.Vector3(0, 0.9, 0);

  // =========================================================
  // 1) BARRA DE PROGRESSO "PROCESSANDO..."
  // =========================================================
  const painel = new T.Group();
  painel.position.set(0, 1.35, 0);
  g.add(painel);

  const fundo = new T.Mesh(
    new ctx.RoundedBoxGeometry(4.2, 1.5, 0.18, 4, 0.12),
    matDark(0x0b1220, 0.5, 0.6)
  );
  painel.add(fundo);

  const moldura = new T.Mesh(
    new ctx.RoundedBoxGeometry(4.3, 1.6, 0.1, 4, 0.14),
    matNeon(C.azul)
  );
  moldura.position.z = -0.06;
  painel.add(moldura);

  const placaProc = ctx.textoPlano('PROCESSANDO...', {
    tamanho: 72, cor: '#2fa8ff', fonte: 'Anton', largura: 3.4
  });
  placaProc.position.set(0, 0.42, 0.12);
  painel.add(placaProc);

  const trilha = new T.Mesh(
    new ctx.RoundedBoxGeometry(3.4, 0.34, 0.08, 3, 0.06),
    new T.MeshBasicMaterial({ color: 0x0a1a2a })
  );
  trilha.position.set(0, -0.35, 0.1);
  painel.add(trilha);

  const fill = new T.Mesh(
    new ctx.RoundedBoxGeometry(3.4, 0.34, 0.1, 3, 0.06),
    matNeon(C.azul)
  );
  fill.position.set(-1.7, -0.35, 0.12);
  fill.geometry.translate(1.7, 0, 0);
  fill.scale.x = 0.001;
  painel.add(fill);

  const luzPainel = new T.PointLight(0x2fa8ff, 3, 8);
  luzPainel.position.set(0, 1.35, 1.2);
  g.add(luzPainel);

  // =========================================================
  // 2) LOSANGO PIX
  // =========================================================
  const pix = new T.Group();
  pix.position.set(-1.6, 1.5, 0.4);
  g.add(pix);

  const octa = new T.Mesh(
    new T.OctahedronGeometry(0.62, 0),
    new T.MeshStandardMaterial({
      color: 0x0a2a24, roughness: 0.25, metalness: 0.9,
      emissive: 0x25d366, emissiveIntensity: 0.9
    })
  );
  octa.scale.set(1, 1.35, 0.35);
  pix.add(octa);

  const octaEdge = new T.Mesh(
    new T.OctahedronGeometry(0.66, 0),
    matNeon(C.verde)
  );
  octaEdge.scale.set(1, 1.35, 0.32);
  octaEdge.material.transparent = true;
  octaEdge.material.opacity = 0.35;
  pix.add(octaEdge);

  const luzPix = new T.PointLight(0x25d366, 2.5, 6);
  luzPix.position.set(-1.6, 1.5, 1);
  g.add(luzPix);

  // =========================================================
  // 3) CARTÃO DE CRÉDITO
  // =========================================================
  const cartao = new T.Group();
  cartao.position.set(1.5, 1.55, 0.2);
  g.add(cartao);

  const corpoCartao = new T.Mesh(
    new ctx.RoundedBoxGeometry(3.2, 2.0, 0.08, 4, 0.1),
    matDark(0x101826, 0.3, 0.9)
  );
  cartao.add(corpoCartao);

  const faixa = new T.Mesh(
    new T.BoxGeometry(3.2, 0.28, 0.02),
    new T.MeshStandardMaterial({ color: 0x05070c, roughness: 0.6, metalness: 0.4 })
  );
  faixa.position.set(0, 0.55, 0.05);
  cartao.add(faixa);

  const chip = new T.Mesh(
    new T.BoxGeometry(0.42, 0.32, 0.03),
    new T.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.3, metalness: 1 })
  );
  chip.position.set(-1.1, 0.05, 0.06);
  cartao.add(chip);

  const cvNum = ctx.telaCanvas(512, 128);
  cvNum.g2d.fillStyle = '#0a0f18';
  cvNum.g2d.fillRect(0, 0, 512, 128);
  cvNum.g2d.fillStyle = '#f2f4f8';
  cvNum.g2d.font = '52px Archivo';
  cvNum.g2d.textBaseline = 'middle';
  cvNum.g2d.fillText('••••  ••••  ••••  4021', 20, 70);
  cvNum.tex.needsUpdate = true;
  const numMesh = new T.Mesh(
    new T.PlaneGeometry(2.6, 0.65),
    new T.MeshBasicMaterial({ map: cvNum.tex, transparent: true })
  );
  numMesh.position.set(0, -0.55, 0.05);
  cartao.add(numMesh);

  const bordaCartao = new T.Mesh(
    new ctx.RoundedBoxGeometry(3.28, 2.08, 0.04, 4, 0.11),
    matNeon(C.azul)
  );
  bordaCartao.position.z = -0.05;
  bordaCartao.material.transparent = true;
  bordaCartao.material.opacity = 0.5;
  cartao.add(bordaCartao);

  // =========================================================
  // 4) MAQUININHA
  // =========================================================
  const maq = new T.Group();
  maq.position.set(0, 1.35, 1.2);
  g.add(maq);

  const corpoMaq = new T.Mesh(
    new ctx.RoundedBoxGeometry(1.9, 2.6, 0.55, 4, 0.18),
    matDark(0x0c1420, 0.4, 0.7)
  );
  maq.add(corpoMaq);

  const cvTela = ctx.telaCanvas(256, 160);
  const desenhaTela = (txt, cor) => {
    const d = cvTela.g2d;
    d.fillStyle = '#02060c';
    d.fillRect(0, 0, 256, 160);
    d.fillStyle = cor;
    d.font = '30px Anton';
    d.textAlign = 'center';
    d.textBaseline = 'middle';
    const linhas = txt.split('\n');
    linhas.forEach((l, i) => d.fillText(l, 128, 80 + (i - (linhas.length - 1) / 2) * 38));
    cvTela.tex.needsUpdate = true;
  };
  desenhaTela('PROCESSANDO', '#2fa8ff');

  const tela = new T.Mesh(
    new T.PlaneGeometry(1.5, 0.95),
    new T.MeshBasicMaterial({ map: cvTela.tex })
  );
  tela.position.set(0, 0.7, 0.29);
  maq.add(tela);

  const teclado = new T.Group();
  teclado.position.set(0, -0.55, 0.29);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const b = new T.Mesh(
        new T.SphereGeometry(0.11, 10, 10),
        new T.MeshStandardMaterial({ color: 0x1a2535, roughness: 0.4, metalness: 0.7 })
      );
      b.position.set((j - 1) * 0.42, (i - 1) * 0.32, 0);
      teclado.add(b);
    }
  }
  maq.add(teclado);

  const bordaMaq = new T.Mesh(
    new ctx.RoundedBoxGeometry(1.98, 2.68, 0.5, 4, 0.19),
    matNeon(C.azul)
  );
  bordaMaq.position.z = -0.03;
  bordaMaq.material.transparent = true;
  bordaMaq.material.opacity = 0.35;
  maq.add(bordaMaq);

  // =========================================================
  // 5) SELO "SEM CONEXÃO"
  // =========================================================
  const selo = new T.Group();
  selo.position.set(0, 1.5, 2.2);
  g.add(selo);

  const seloBg = new T.Mesh(
    new ctx.RoundedBoxGeometry(3.6, 1.1, 0.12, 4, 0.1),
    new T.MeshStandardMaterial({ color: 0x3a0008, roughness: 0.4, metalness: 0.5, emissive: 0xff2b3d, emissiveIntensity: 0.4 })
  );
  selo.add(seloBg);

  const seloTxt = ctx.textoPlano('SEM CONEXÃO', {
    tamanho: 96, cor: '#ff2b3d', fonte: 'Anton', largura: 3.2
  });
  seloTxt.position.z = 0.08;
  selo.add(seloTxt);

  const bordaSelo = new T.Mesh(
    new ctx.RoundedBoxGeometry(3.7, 1.2, 0.06, 4, 0.1),
    matNeon(C.verm)
  );
  bordaSelo.position.z = -0.04;
  selo.add(bordaSelo);

  selo.scale.setScalar(0.001);
  selo.rotation.z = -0.15;

  // =========================================================
  // 6) CHUVA DE CÉDULAS (visível, grande, sempre na metade de cima)
  // =========================================================
  const notas = [];
  const notaGroup = new T.Group();
  g.add(notaGroup);

  const cvNota = ctx.telaCanvas(256, 128);
  {
    const d = cvNota.g2d;
    d.fillStyle = '#0f5c2e';
    d.fillRect(0, 0, 256, 128);
    d.fillStyle = '#25d366';
    d.fillRect(8, 8, 240, 112);
    d.fillStyle = '#0a3a1c';
    d.font = 'bold 44px Archivo';
    d.textAlign = 'center';
    d.textBaseline = 'middle';
    d.fillText('R$ 100', 128, 64);
    d.font = '18px Archivo';
    d.fillText('BANCO CENTRAL', 128, 100);
    cvNota.tex.needsUpdate = true;
  }
  const notaMat = new T.MeshBasicMaterial({ map: cvNota.tex, side: T.DoubleSide });

  const N_NOTAS = 30;
  for (let i = 0; i < N_NOTAS; i++) {
    const m = new T.Mesh(new T.PlaneGeometry(1.6, 0.75), notaMat);
    const s1 = rnd();
    const s2 = rnd();
    const s3 = rnd();
    const s4 = rnd();
    m.userData = {
      x: (s1 - 0.5) * 3.6,
      z: (s2 - 0.5) * 3.5 - 0.5,
      y0: 3.2 + s3 * 2.5,
      vel: 1.4 + s1 * 1.4,
      rot: s2 * Math.PI * 2,
      rotSpd: (s3 - 0.5) * 4,
      delay: s4 * 0.5
    };
    m.visible = false;
    notaGroup.add(m);
    notas.push(m);
  }

  // =========================================================
  // UPDATE
  // =========================================================
  return {
    grupo: g,
    update(t, k, dur) {
      const kTrava = k >= 0.69 ? 1 : 0;
      const kPix = ctx.clamp01((k - 1.59) / 0.25);
      const kCartao = ctx.clamp01((k - 2.25) / 0.3);
      const kMaq = ctx.clamp01((k - 2.79) / 0.3);
      const kFalha = ctx.clamp01((k - 4.15) / 0.3);
      const kSelo = ctx.clamp01((k - 4.49) / 0.22);
      const kCai = ctx.clamp01((k - 5.49) / 0.5);
      const kExplosao = ctx.clamp01((k - 6.09) / 0.35);

      // ---------- câmera ----------
      const aprox = ctx.ease(ctx.clamp01(k / dur));
      const z = 12.5 - aprox * 2.2;
      const sway = Math.sin(t * 0.7) * 0.15;
      const swayY = Math.cos(t * 0.55) * 0.08;
      ctx.cam.position.set(sway, 0.6 + swayY, z);
      ctx.cam.lookAt(lookBase.x, lookBase.y, lookBase.z);

      // ---------- PAINEL ----------
      const procAtivo = k < 4.15;
      painel.visible = procAtivo;
      if (procAtivo) {
        const popIn = ctx.ease(ctx.clamp01(k / 0.25));
        const s = popIn < 1 ? 0.7 + popIn * 0.45 : 1;
        painel.scale.setScalar(s);

        let prog;
        if (k < 0.69) {
          prog = ctx.ease(ctx.clamp01(k / 0.69)) * 0.7;
        } else {
          prog = 0.7;
        }
        fill.scale.x = Math.max(0.001, prog);

        const travaMix = kTrava;
        const corFill = new T.Color(C.azul).lerp(new T.Color(C.verm), travaMix);
        fill.material.color.copy(corFill);
        const corTxt = new T.Color('#2fa8ff').lerp(new T.Color('#ff2b3d'), travaMix);
        placaProc.material.color.copy(corTxt);
        luzPainel.color.copy(corFill);

        if (k >= 0.69 && k < 1.05) {
          const gk = 1 - ctx.clamp01((k - 0.69) / 0.36);
          ctx.fx.shake = Math.max(ctx.fx.shake, 0.9 * gk);
          ctx.fx.gl = Math.max(ctx.fx.gl, 0.7 * gk);
          ctx.fx.ab = 0.02 * gk;
          painel.position.x = (Math.sin(t * 60) * 0.06) * gk;
        } else {
          painel.position.x = 0;
        }
        if (k >= 0.69) {
          const p = ctx.pulso(t, 3);
          fill.material.color.lerp(new T.Color('#ff2b3d'), p * 0.3);
        }
      }

      // ---------- PIX ----------
      pix.visible = k >= 1.59 && k < 5.49;
      if (pix.visible) {
        const pop = kPix < 1 ? 0.6 + ctx.ease(kPix) * 0.55 : 1;
        pix.scale.setScalar(pop);
        pix.rotation.y = t * 1.4;
        pix.rotation.x = Math.sin(t * 0.9) * 0.15;
        const falha = kFalha;
        const cor = new T.Color(0x25d366).lerp(new T.Color(0x552222), falha);
        octa.material.emissive.copy(cor);
        octaEdge.material.color.copy(cor);
        luzPix.color.copy(cor);
        luzPix.intensity = 2.5 * (1 - falha * 0.6);
        if (kCai > 0) {
          pix.position.y = 1.5 - kCai * 6;
          pix.position.x = -1.6 - kCai * 2;
          pix.rotation.z = kCai * 3;
        }
      }

      // ---------- CARTÃO ----------
      cartao.visible = k >= 2.25 && k < 5.49;
      if (cartao.visible) {
        const pop = kCartao < 1 ? 0.5 + ctx.ease(kCartao) * 0.65 : 1;
        cartao.scale.setScalar(pop);
        cartao.rotation.y = -0.6 + Math.sin(t * 0.8) * 0.25;
        cartao.rotation.x = Math.sin(t * 0.6) * 0.1;
        cartao.rotation.z = Math.sin(t * 0.5) * 0.05;
        const falha = kFalha;
        bordaCartao.material.color.copy(new T.Color(C.azul).lerp(new T.Color(C.verm), falha));
        corpoCartao.material.color.copy(new T.Color(0x101826).lerp(new T.Color(0x1a0a0a), falha));
        if (kCai > 0) {
          cartao.position.y = 1.55 - kCai * 6;
          cartao.position.x = 1.5 + kCai * 2;
          cartao.rotation.z = -kCai * 3;
        }
      }

      // ---------- MAQUININHA ----------
      maq.visible = k >= 2.79 && k < 5.49;
      if (maq.visible) {
        const pop = kMaq < 1 ? 0.5 + ctx.ease(kMaq) * 0.65 : 1;
        maq.scale.setScalar(pop);
        maq.rotation.y = Math.sin(t * 0.7) * 0.15;
        if (k >= 4.49) {
          const pisca = Math.floor(t * 4) % 2 === 0;
          desenhaTela('TRANSAÇÃO\nNEGADA', pisca ? '#ff2b3d' : '#550000');
        } else if (k >= 4.15) {
          desenhaTela('ERRO', '#ff2b3d');
        } else {
          desenhaTela('PROCESSANDO', '#2fa8ff');
        }
        const falha = kFalha;
        bordaMaq.material.color.copy(new T.Color(C.azul).lerp(new T.Color(C.verm), falha));
        if (kCai > 0) {
          maq.position.y = 1.35 - kCai * 6;
          maq.position.z = 1.2 + kCai * 3;
          maq.rotation.x = kCai * 2;
        }
      }

      // ---------- SELO ----------
      if (kSelo > 0 && k < 6.0) {
        const pop = kSelo < 1 ? 0.3 + ctx.ease(kSelo) * 0.9 : 1;
        selo.scale.setScalar(pop);
        selo.rotation.z = -0.15 + Math.sin(t * 2) * 0.03;
        if (kSelo > 0.5 && kSelo < 1) {
          const imp = 1 - (kSelo - 0.5) / 0.5;
          ctx.fx.shake = Math.max(ctx.fx.shake, 1.2 * imp);
          ctx.fx.flash = Math.max(ctx.fx.flash, 0.6 * imp);
          ctx.fx.gl = Math.max(ctx.fx.gl, 0.5 * imp);
        }
        if (kCai > 0) {
          selo.scale.setScalar(pop * (1 - kCai));
        }
      } else {
        selo.scale.setScalar(0.001);
      }

      // ---------- CHUVA DE NOTAS ----------
      const chuvaAtiva = k >= 5.49;
      notaGroup.visible = chuvaAtiva;
      if (chuvaAtiva) {
        const kChuva = k - 5.49;
        for (let i = 0; i < notas.length; i++) {
          const m = notas[i];
          const u = m.userData;
          const local = kChuva - u.delay;
          if (local < 0) { m.visible = false; continue; }
          m.visible = true;
          // queda: de y0 (~6..9) até -3
          const y = u.y0 - local * u.vel * 2.2;
          m.position.set(u.x, y, u.z);
          m.rotation.y = u.rot + local * u.rotSpd;
          m.rotation.x = Math.sin(local * 2 + u.rot) * 0.6;
          m.rotation.z = Math.cos(local * 1.5 + u.rot) * 0.4;
          // explosão em 19.94: espalha
          if (kExplosao > 0) {
            const e = ctx.ease(kExplosao);
            const dirX = u.x > 0 ? 1 : -1;
            m.position.x = u.x + dirX * e * 0.8 + Math.sin(u.rot + t) * e * 0.5;
            m.position.y = y + e * 2.5;
            m.position.z = u.z + e * 2;
            m.rotation.y += e * 4;
          }
          // fade final
          if (k > 6.9) {
            m.visible = k < 7.15;
          }
        }
        if (kExplosao > 0) {
          ctx.fx.red = Math.max(ctx.fx.red, 0.3 * (1 - kExplosao));
          ctx.fx.flash = Math.max(ctx.fx.flash, 0.4 * (1 - kExplosao));
          ctx.fx.bloom = 1.0;
        }
      }

      // ---------- FX globais ----------
      if (k >= 0.69 && k < 1.05) {
        ctx.fx.red = Math.max(ctx.fx.red, 0.25 * (1 - ctx.clamp01((k - 0.69) / 0.36)));
      }
      if (k >= 4.15 && k < 5.49) {
        const f = 1 - ctx.clamp01((k - 4.15) / 1.34);
        ctx.fx.red = Math.max(ctx.fx.red, 0.35 * f);
      }
    }
  };
}