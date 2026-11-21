export default function criar(ctx) {
  const { THREE } = ctx;
  const g = new THREE.Group();
  const rnd = ctx.rnd(1337);

  // ---------- MATERIAIS BASE ----------
  const matAzul = new THREE.MeshStandardMaterial({ color: 0x0a1a2e, metalness: 0.7, roughness: 0.35 });
  const matAzulEsc = new THREE.MeshStandardMaterial({ color: 0x061020, metalness: 0.8, roughness: 0.4 });
  const matVerm = new THREE.MeshStandardMaterial({ color: 0x2a0508, metalness: 0.6, roughness: 0.4 });
  const matPreto = new THREE.MeshStandardMaterial({ color: 0x05070c, metalness: 0.5, roughness: 0.6 });

  const lineAzul = new THREE.LineBasicMaterial({ color: 0x2fa8ff });
  const lineVerm = new THREE.LineBasicMaterial({ color: 0xff2b3d });
  const lineBranco = new THREE.LineBasicMaterial({ color: 0xf2f4f8 });

  function arestas(geo, mat) {
    const e = new THREE.EdgesGeometry(geo, 20);
    return new THREE.LineSegments(e, mat);
  }

  // ---------- PRÉDIO DE BANCO ----------
  const predio = new THREE.Group();
  predio.position.set(0, 0, 0);

  // base / degraus
  const degraus = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const w = 3.6 - i * 0.5;
    const h = 0.18;
    const d = 1.2 - i * 0.15;
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, matAzulEsc);
    m.position.set(0, h / 2 + i * h, 0.6 - i * 0.15);
    degraus.add(m);
    const l = arestas(geo, lineAzul);
    l.position.copy(m.position);
    degraus.add(l);
  }
  predio.add(degraus);

  // corpo principal
  const corpoGeo = new THREE.BoxGeometry(3.0, 1.6, 1.6);
  const corpo = new THREE.Mesh(corpoGeo, matAzul);
  corpo.position.set(0, 0.54 + 0.8, 0);
  predio.add(corpo);
  const corpoL = arestas(corpoGeo, lineAzul);
  corpoL.position.copy(corpo.position);
  predio.add(corpoL);

  // colunas
  const colunas = new THREE.Group();
  const nCol = 5;
  for (let i = 0; i < nCol; i++) {
    const x = -1.2 + (i / (nCol - 1)) * 2.4;
    const cg = new THREE.CylinderGeometry(0.1, 0.1, 1.4, 8);
    const cm = new THREE.Mesh(cg, matAzul);
    cm.position.set(x, 0.54 + 0.7, 0.85);
    colunas.add(cm);
    const cl = arestas(cg, lineAzul);
    cl.position.copy(cm.position);
    colunas.add(cl);
  }
  predio.add(colunas);

  // frontão triangular
  const frontShape = new THREE.Shape();
  frontShape.moveTo(-1.6, 0);
  frontShape.lineTo(1.6, 0);
  frontShape.lineTo(0, 0.7);
  frontShape.lineTo(-1.6, 0);
  const frontGeo = new THREE.ExtrudeGeometry(frontShape, { depth: 0.3, bevelEnabled: false });
  const front = new THREE.Mesh(frontGeo, matAzul);
  front.position.set(0, 0.54 + 1.4, 0.65);
  predio.add(front);
  const frontL = arestas(frontGeo, lineAzul);
  frontL.position.copy(front.position);
  predio.add(frontL);

  // porta
  const portaGeo = new THREE.BoxGeometry(0.5, 0.9, 0.05);
  const porta = new THREE.Mesh(portaGeo, new THREE.MeshBasicMaterial({ color: 0x2fa8ff }));
  porta.position.set(0, 0.54 + 0.45, 0.81);
  predio.add(porta);

  g.add(predio);

  // ---------- CELULAR ----------
  const celular = new THREE.Group();
  const celGeo = new ctx.RoundedBoxGeometry(1.0, 1.9, 0.08, 4, 0.08);
  const celMesh = new THREE.Mesh(celGeo, matPreto);
  celular.add(celMesh);
  const celL = arestas(celGeo, lineAzul);
  celular.add(celL);

  // tela canvas
  const { canvas: celCanvas, g2d: celG2d, tex: celTex } = ctx.telaCanvas(256, 512);
  const telaGeo = new THREE.PlaneGeometry(0.9, 1.75);
  const telaMat = new THREE.MeshBasicMaterial({ map: celTex });
  const telaMesh = new THREE.Mesh(telaGeo, telaMat);
  telaMesh.position.z = 0.045;
  celular.add(telaMesh);

  celular.position.set(0, 2.0, 1.5);
  celular.rotation.set(-0.1, 0, 0);
  g.add(celular);

  let celVisivel = false;
  let celEntrada = 0;

  // ---------- CAIXA ELETRÔNICO ----------
  const caixa = new THREE.Group();
  const caixaGeo = new THREE.BoxGeometry(1.4, 2.4, 0.9);
  const caixaMesh = new THREE.Mesh(caixaGeo, matAzulEsc);
  caixa.add(caixaMesh);
  const caixaL = arestas(caixaGeo, lineVerm);
  caixa.add(caixaL);

  // tela do caixa
  const { canvas: caixaCanvas, g2d: caixaG2d, tex: caixaTex } = ctx.telaCanvas(256, 192);
  const caixaTelaGeo = new THREE.PlaneGeometry(1.0, 0.75);
  const caixaTelaMat = new THREE.MeshBasicMaterial({ map: caixaTex });
  const caixaTela = new THREE.Mesh(caixaTelaGeo, caixaTelaMat);
  caixaTela.position.set(0, 0.55, 0.46);
  caixa.add(caixaTela);

  // teclado
  const tecGeo = new THREE.BoxGeometry(0.7, 0.35, 0.05);
  const tec = new THREE.Mesh(tecGeo, matPreto);
  tec.position.set(0, -0.05, 0.46);
  caixa.add(tec);
  const tecL = arestas(tecGeo, lineAzul);
  tecL.position.copy(tec.position);
  caixa.add(tecL);

  // boca de saída
  const bocaGeo = new THREE.BoxGeometry(0.5, 0.06, 0.05);
  const boca = new THREE.Mesh(bocaGeo, new THREE.MeshBasicMaterial({ color: 0xff2b3d }));
  boca.position.set(0, -0.55, 0.46);
  caixa.add(boca);

  // giroflex
  const giroGroup = new THREE.Group();
  const giroGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8);
  const giroMesh = new THREE.Mesh(giroGeo, new THREE.MeshBasicMaterial({ color: 0xff2b3d }));
  giroGroup.add(giroMesh);
  const giroLuz = new THREE.PointLight(0xff2b3d, 0, 6);
  giroGroup.add(giroLuz);
  giroGroup.position.set(0, 1.35, 0);
  caixa.add(giroGroup);

  caixa.position.set(0, 1.3, 0);
  caixa.visible = false;
  g.add(caixa);

  let caixaVisivel = false;
  let caixaEntrada = 0;

  // ---------- UPDATE ----------
  return {
    grupo: g,
    update(t, k, dur) {
      // reset
      ctx.fx.bloom = 1.0;

      // ---------- PRÉDIO: surge do chão em 22.32 ----------
      const tPredio = 22.32;
      const pPredio = ctx.clamp01((t - tPredio) / 0.5);
      const ePredio = ctx.ease(pPredio);
      predio.scale.y = ePredio;
      predio.position.y = 0;
      if (pPredio > 0 && pPredio < 0.15) {
        ctx.fx.shake = Math.max(ctx.fx.shake, 0.3 * (1 - pPredio / 0.15));
      }

      // ---------- CELULAR: entra em 23.52 ----------
      const tCel = 23.52;
      if (t >= tCel && t < 24.85) {
        celVisivel = true;
        celEntrada = ctx.clamp01((t - tCel) / 0.35);
        const eCel = ctx.ease(celEntrada);
        celular.visible = true;
        celular.position.set(0, 2.0 + (1 - eCel) * -1.5, 1.5);
        celular.scale.setScalar(0.85 + 0.15 * eCel);
        celular.rotation.y = Math.sin(t * 0.8) * 0.15;
        celular.rotation.x = -0.1 + Math.sin(t * 1.2) * 0.05;
      } else {
        celular.visible = false;
      }

      // desenhar tela do celular
      if (celular.visible) {
        const erroAtivo = t >= 23.98;
        celG2d.fillStyle = '#05070c';
        celG2d.fillRect(0, 0, 256, 512);

        // ícone de banco
        celG2d.fillStyle = erroAtivo ? '#ff2b3d' : '#2fa8ff';
        celG2d.beginPath();
        celG2d.moveTo(128, 100);
        celG2d.lineTo(180, 140);
        celG2d.lineTo(180, 200);
        celG2d.lineTo(76, 200);
        celG2d.lineTo(76, 140);
        celG2d.closePath();
        celG2d.fill();
        celG2d.fillStyle = '#05070c';
        celG2d.fillRect(100, 160, 56, 40);

        if (!erroAtivo) {
          // spinner
          const ang = t * 6;
          celG2d.strokeStyle = '#2fa8ff';
          celG2d.lineWidth = 8;
          celG2d.beginPath();
          celG2d.arc(128, 320, 40, ang, ang + Math.PI * 1.4);
          celG2d.stroke();
          celG2d.fillStyle = '#f2f4f8';
          celG2d.font = '24px Archivo';
          celG2d.textAlign = 'center';
          celG2d.fillText('CARREGANDO', 128, 420);
        } else {
          // ERRO
          celG2d.fillStyle = '#ff2b3d';
          celG2d.font = 'bold 52px Anton';
          celG2d.textAlign = 'center';
          celG2d.fillText('ERRO', 128, 340);
          // rachaduras
          celG2d.strokeStyle = '#f2f4f8';
          celG2d.lineWidth = 2;
          const r2 = ctx.rnd(99);
          for (let i = 0; i < 7; i++) {
            celG2d.beginPath();
            let x = 128 + (r2() - 0.5) * 40;
            let y = 300 + (r2() - 0.5) * 40;
            celG2d.moveTo(x, y);
            for (let j = 0; j < 4; j++) {
              x += (r2() - 0.5) * 80;
              y += (r2() - 0.5) * 80;
              celG2d.lineTo(x, y);
            }
            celG2d.stroke();
          }
        }
        celTex.needsUpdate = true;

        if (t >= 23.98 && t < 24.15) {
          ctx.fx.gl = Math.max(ctx.fx.gl, 0.6 * (1 - (t - 23.98) / 0.17));
          ctx.fx.shake = Math.max(ctx.fx.shake, 0.4);
        }
      }

      // ---------- CAIXA: entra em 24.80 ----------
      const tCaixa = 24.80;
      if (t >= tCaixa) {
        caixaVisivel = true;
        caixaEntrada = ctx.clamp01((t - tCaixa) / 0.45);
        const eCaixa = ctx.ease(caixaEntrada);
        caixa.visible = true;
        caixa.position.set(0, 1.3, (1 - eCaixa) * -3.0);
        caixa.rotation.y = Math.sin(t * 0.5) * 0.08;
      } else {
        caixa.visible = false;
      }

      // desenhar tela do caixa
      if (caixa.visible) {
        const indisponivel = t >= 25.76;
        caixaG2d.fillStyle = '#05070c';
        caixaG2d.fillRect(0, 0, 256, 192);

        if (!indisponivel) {
          caixaG2d.fillStyle = '#2fa8ff';
          caixaG2d.font = 'bold 28px Archivo';
          caixaG2d.textAlign = 'center';
          caixaG2d.fillText('BANCO 24H', 128, 90);
          caixaG2d.fillStyle = '#f2f4f8';
          caixaG2d.font = '18px Archivo';
          caixaG2d.fillText('INSIRA O CARTÃO', 128, 130);
        } else {
          const pisca = Math.sin(t * 12) > 0;
          if (pisca) {
            caixaG2d.fillStyle = '#ff2b3d';
            caixaG2d.font = 'bold 26px Anton';
            caixaG2d.textAlign = 'center';
            caixaG2d.fillText('INDISPONÍVEL', 128, 100);
          }
          caixaG2d.fillStyle = '#ff2b3d';
          caixaG2d.font = '16px Archivo';
          caixaG2d.fillText('SISTEMA OFFLINE', 128, 140);
        }
        caixaTex.needsUpdate = true;

        // giroflex girando
        if (indisponivel) {
          const ang = t * 8;
          giroGroup.rotation.y = ang;
          giroLuz.intensity = 4 + Math.sin(t * 10) * 2;
          giroLuz.position.set(Math.sin(ang) * 0.3, 0, Math.cos(ang) * 0.3);

          // boca tenta abrir
          const tentativa = Math.sin(t * 6) * 0.5 + 0.5;
          boca.position.z = 0.46 + tentativa * 0.04;
          boca.scale.y = 1 + tentativa * 0.5;
        } else {
          giroLuz.intensity = 0;
        }

        // evento 26.34
        if (t >= 26.34 && t < 26.55) {
          const p = (t - 26.34) / 0.21;
          ctx.fx.shake = Math.max(ctx.fx.shake, 1.0 * (1 - p));
          ctx.fx.red = Math.max(ctx.fx.red, 0.4 * (1 - p));
          ctx.fx.flash = Math.max(ctx.fx.flash, 0.3 * (1 - p));
        }
      }

      // ---------- CÂMERA ----------
      // começa baixa olhando prédio de baixo, depois dolly in
      const camK = ctx.clamp01(k / dur);
      const camY = 0.8 + camK * 1.2;
      const camZ = 9.0 - camK * 3.5;
      const camX = Math.sin(k * 0.4) * 0.6;

      // foco: prédio no início, celular no meio, caixa no fim
      let lookY = 1.2;
      let lookZ = 0;
      if (t >= 23.52 && t < 24.85) {
        lookY = 2.0;
        lookZ = 1.5;
      } else if (t >= 24.80) {
        lookY = 1.5;
        lookZ = 0;
      }

      ctx.cam.position.set(camX, camY, camZ);
      ctx.cam.lookAt(0, lookY, lookZ);
    }
  };
}