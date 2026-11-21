export default function criar(ctx) {
  const T = ctx.THREE;
  const g = new T.Group();
  const C = ctx.cores;

  // ---------- helpers ----------
  const matDark = (cor = 0x11151f, rough = 0.35, metal = 0.9) =>
    new T.MeshStandardMaterial({ color: cor, roughness: rough, metalness: metal });

  const pop = (obj, k, t0, dur = 0.22) => {
    const x = ctx.clamp01((k - t0) / dur);
    const s = x <= 0 ? 0.0001 : (x < 0.7 ? (x / 0.7) * 1.15 : 1.15 - ((x - 0.7) / 0.3) * 0.15);
    obj.scale.setScalar(Math.max(0.0001, s));
    obj.visible = k >= t0;
  };

  // ---------- Wi-Fi icon ----------
  const wifi = new T.Group();
  g.add(wifi);
  const wifiBaseY = 1.55;
  wifi.position.set(0, wifiBaseY, 0);

  const dotMat = new T.MeshBasicMaterial({ color: C.azul });

  const arcs = [];
  const arcDefs = [
    { r: 1.35, tube: 0.11, arc: Math.PI * 0.9 },
    { r: 0.95, tube: 0.10, arc: Math.PI * 0.9 },
    { r: 0.55, tube: 0.09, arc: Math.PI * 0.9 },
  ];
  arcDefs.forEach((d) => {
    const geo = new T.TorusGeometry(d.r, d.tube, 10, 40, d.arc);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: C.azul }));
    // open downward: arc centered at top
    m.rotation.z = Math.PI / 2 + (Math.PI - d.arc) / 2;
    m.position.y = 0;
    wifi.add(m);
    arcs.push(m);
  });

  const dot = new T.Mesh(new T.SphereGeometry(0.16, 16, 16), dotMat);
  dot.position.set(0, -0.05, 0);
  wifi.add(dot);

  // X mark
  const xGroup = new T.Group();
  xGroup.position.set(0, wifiBaseY, 0.05);
  xGroup.visible = false;
  g.add(xGroup);
  const xMat = new T.MeshBasicMaterial({ color: C.verm });
  const barGeo = new T.BoxGeometry(2.6, 0.28, 0.18);
  const b1 = new T.Mesh(barGeo, xMat);
  b1.rotation.z = Math.PI / 4;
  const b2 = new T.Mesh(barGeo, xMat);
  b2.rotation.z = -Math.PI / 4;
  xGroup.add(b1, b2);

  // ---------- App icons ----------
  const apps = new T.Group();
  g.add(apps);
  const appY = 1.55;
  const appZ = -1.2;
  const appSpacing = 1.55;

  // WhatsApp
  const waGroup = new T.Group();
  waGroup.position.set(-appSpacing, appY, appZ);
  apps.add(waGroup);
  const waBox = new T.Mesh(new ctx.RoundedBoxGeometry(1.3, 1.3, 0.22, 4, 0.22),
    new T.MeshStandardMaterial({ color: 0x25d366, roughness: 0.4, metalness: 0.3 }));
  waGroup.add(waBox);
  const bubble = new T.Mesh(new T.SphereGeometry(0.32, 16, 16),
    new T.MeshBasicMaterial({ color: 0xffffff }));
  bubble.scale.set(1, 0.9, 0.4);
  bubble.position.set(0, 0.05, 0.14);
  waGroup.add(bubble);
  const tail = new T.Mesh(new T.ConeGeometry(0.12, 0.22, 4),
    new T.MeshBasicMaterial({ color: 0xffffff }));
  tail.position.set(-0.18, -0.18, 0.14);
  tail.rotation.z = Math.PI * 0.8;
  waGroup.add(tail);

  // Instagram (canvas gradient)
  const igGroup = new T.Group();
  igGroup.position.set(0, appY, appZ);
  apps.add(igGroup);
  const igCanvas = ctx.telaCanvas(256, 256);
  const gc = igCanvas.g2d;
  const grad = gc.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#833ab4');
  grad.addColorStop(0.5, '#fd1d1d');
  grad.addColorStop(1, '#fcb045');
  gc.fillStyle = grad;
  gc.fillRect(0, 0, 256, 256);
  gc.strokeStyle = '#ffffff';
  gc.lineWidth = 18;
  gc.beginPath();
  const rr = 40, x0 = 48, y0 = 48, w = 160, h = 160;
  gc.moveTo(x0 + rr, y0);
  gc.lineTo(x0 + w - rr, y0);
  gc.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr);
  gc.lineTo(x0 + w, y0 + h - rr);
  gc.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rr, y0 + h);
  gc.lineTo(x0 + rr, y0 + h);
  gc.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rr);
  gc.lineTo(x0, y0 + rr);
  gc.quadraticCurveTo(x0, y0, x0 + rr, y0);
  gc.stroke();
  gc.beginPath();
  gc.arc(128, 128, 42, 0, Math.PI * 2);
  gc.stroke();
  gc.beginPath();
  gc.arc(178, 78, 12, 0, Math.PI * 2);
  gc.fillStyle = '#ffffff';
  gc.fill();
  igCanvas.tex.needsUpdate = true;
  const igBox = new T.Mesh(new ctx.RoundedBoxGeometry(1.3, 1.3, 0.22, 4, 0.22),
    new T.MeshStandardMaterial({ map: igCanvas.tex, roughness: 0.4, metalness: 0.3 }));
  igGroup.add(igBox);

  // Sites (globe + www)
  const stGroup = new T.Group();
  stGroup.position.set(appSpacing, appY, appZ);
  apps.add(stGroup);
  const stBox = new T.Mesh(new ctx.RoundedBoxGeometry(1.3, 1.3, 0.22, 4, 0.22),
    new T.MeshStandardMaterial({ color: 0x2fa8ff, roughness: 0.4, metalness: 0.3 }));
  stGroup.add(stBox);
  const globe = new T.Mesh(new T.SphereGeometry(0.34, 16, 12),
    new T.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
  globe.position.z = 0.14;
  stGroup.add(globe);
  const www = ctx.textoPlano('www', { tamanho: 96, cor: '#ffffff', fonte: 'Archivo', largura: 0.9 });
  www.position.set(0, -0.42, 0.14);
  stGroup.add(www);

  // X marks on apps
  const appXs = [];
  [waGroup, igGroup, stGroup].forEach((grp) => {
    const xg = new T.Group();
    xg.position.set(0, 0, 0.18);
    xg.visible = false;
    const xm = new T.MeshBasicMaterial({ color: C.verm });
    const bg = new T.BoxGeometry(1.1, 0.16, 0.1);
    const x1 = new T.Mesh(bg, xm); x1.rotation.z = Math.PI / 4;
    const x2 = new T.Mesh(bg, xm); x2.rotation.z = -Math.PI / 4;
    xg.add(x1, x2);
    grp.add(xg);
    appXs.push(xg);
  });

  // ---------- Router ----------
  // Roteador na METADE DE CIMA da tela, grande (~60% da largura visível).
  // Com câmera a ~12u, largura visível ~4.8u → largura do roteador ~2.9u.
  const router = new T.Group();
  const routerBaseY = 1.35;   // centro do roteador no alto da tela
  const routerZ = 0.4;
  router.position.set(0, routerBaseY - 1.6, routerZ);
  g.add(router);

  const body = new T.Mesh(new ctx.RoundedBoxGeometry(2.9, 0.85, 1.3, 4, 0.14),
    matDark(0x0a0e16, 0.5, 0.8));
  router.add(body);

  const antMat = matDark(0x1a1f2a, 0.4, 0.9);
  const ant1 = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.3, 8), antMat);
  ant1.position.set(-1.05, 1.0, -0.35);
  ant1.rotation.z = 0.25;
  const ant2 = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.3, 8), antMat);
  ant2.position.set(1.05, 1.0, -0.35);
  ant2.rotation.z = -0.25;
  router.add(ant1, ant2);

  const leds = [];
  for (let i = 0; i < 4; i++) {
    const led = new T.Mesh(new T.SphereGeometry(0.07, 8, 8),
      new T.MeshBasicMaterial({ color: C.verde }));
    led.position.set(-0.9 + i * 0.6, 0.12, 0.66);
    router.add(led);
    leds.push(led);
  }

  // Restart icon (acima do roteador, ainda na metade de cima)
  const restart = new T.Group();
  restart.position.set(0, 1.15, 0.4);
  restart.visible = false;
  router.add(restart);
  const rMat = new T.MeshBasicMaterial({ color: C.amarelo });
  const rTorus = new T.Mesh(new T.TorusGeometry(0.5, 0.08, 8, 32, Math.PI * 1.6), rMat);
  rTorus.rotation.z = Math.PI * 0.2;
  restart.add(rTorus);
  const rCone = new T.Mesh(new T.ConeGeometry(0.16, 0.32, 4), rMat);
  rCone.position.set(0.5, 0.22, 0);
  rCone.rotation.z = -Math.PI * 0.5;
  restart.add(rCone);

  // X do restart (criado uma vez, escondido)
  const restartX = new T.Group();
  restartX.visible = false;
  {
    const xm = new T.MeshBasicMaterial({ color: C.verm });
    const bg = new T.BoxGeometry(1.0, 0.18, 0.1);
    const x1 = new T.Mesh(bg, xm); x1.rotation.z = Math.PI / 4;
    const x2 = new T.Mesh(bg, xm); x2.rotation.z = -Math.PI / 4;
    restartX.add(x1, x2);
  }
  restart.add(restartX);

  // ---------- update ----------
  return {
    grupo: g,
    update(t, k, dur) {
      // câmera: começa perto (z≈9) e afasta devagar, leve órbita
      const camZ = 9 + k * 0.55;
      const camY = 1.0 + Math.sin(k * 0.35) * 0.15;
      const camX = Math.sin(k * 0.25) * 0.6;
      ctx.cam.position.set(camX, camY, camZ);
      ctx.cam.lookAt(0, 1.2, 0);

      // Wi-Fi intro
      pop(wifi, k, 0.0, 0.3);

      // arcos apagam um a um em 5.92 (k=0.97)
      const arcOffT = 0.97;
      arcs.forEach((a, i) => {
        const off = arcOffT + i * 0.1;
        if (k >= off) {
          a.material.color.set(C.verm);
          a.material.opacity = 0.25;
          a.material.transparent = true;
        } else {
          a.material.color.set(C.azul);
          a.material.opacity = 1;
          a.material.transparent = false;
        }
      });
      if (k >= arcOffT) {
        dot.material.color.set(C.verm);
      } else {
        dot.material.color.set(C.azul);
      }

      // X strike em 5.92+0.28 (k=1.25)
      const xT = 1.25;
      if (k >= xT) {
        xGroup.visible = true;
        const xp = ctx.clamp01((k - xT) / 0.18);
        const s = xp < 0.7 ? (xp / 0.7) * 1.2 : 1.2 - ((xp - 0.7) / 0.3) * 0.2;
        xGroup.scale.setScalar(Math.max(0.001, s));
        if (k < xT + 0.35) {
          ctx.fx.shake = Math.max(ctx.fx.shake, 1.0 * (1 - (k - xT) / 0.35));
          ctx.fx.gl = Math.max(ctx.fx.gl, 0.8 * (1 - (k - xT) / 0.35));
          ctx.fx.ab = 0.02;
        }
      } else {
        xGroup.visible = false;
      }

      // Wi-Fi sai para trás
      const wifiOut = ctx.clamp01((k - 1.6) / 0.5);
      wifi.position.z = -wifiOut * 4;
      wifi.position.y = wifiBaseY + wifiOut * 1.5;
      wifi.visible = k < 2.2;
      xGroup.position.z = 0.05 - wifiOut * 4;
      xGroup.position.y = wifiBaseY + wifiOut * 1.5;
      xGroup.visible = xGroup.visible && k < 2.2;

      // Apps pop
      pop(waGroup, k, 2.01, 0.22);
      pop(igGroup, k, 2.73, 0.22);
      pop(stGroup, k, 3.55, 0.22);

      // Apps desaturam + X + shake + queda em 8.88 (k=3.93)
      const failT = 3.93;
      const fail = k >= failT;
      const failP = ctx.clamp01((k - failT) / 0.4);
      if (fail) {
        [waBox, igBox, stBox].forEach((bx) => {
          bx.material.color.setRGB(0.35, 0.35, 0.38);
          if (bx.material.map) bx.material.map = null;
        });
        appXs.forEach((xg, i) => {
          xg.visible = true;
          const s = ctx.clamp01((k - failT - i * 0.05) / 0.15);
          xg.scale.setScalar(Math.max(0.001, s * 1.1));
        });
        const shakeAmt = Math.max(0, 1 - (k - failT) / 0.5);
        ctx.fx.shake = Math.max(ctx.fx.shake, 0.6 * shakeAmt);
        ctx.fx.red = Math.max(ctx.fx.red, 0.3 * shakeAmt);
        if (k < failT + 0.15) ctx.fx.flash = Math.max(ctx.fx.flash, 0.4);
        const fallRot = failP * 0.5;
        waGroup.rotation.z = -fallRot;
        igGroup.rotation.z = fallRot * 0.5;
        stGroup.rotation.z = fallRot;
        waGroup.position.y = appY - failP * 0.4;
        igGroup.position.y = appY - failP * 0.5;
        stGroup.position.y = appY - failP * 0.4;
      }

      // Roteador entra em 10.26 (k=5.31) — agora no alto da tela
      const rIn = ctx.clamp01((k - 5.31) / 0.5);
      router.position.y = (routerBaseY - 1.6) + rIn * 1.6;
      router.visible = k >= 5.31;
      router.scale.setScalar(Math.max(0.001, rIn < 0.7 ? (rIn / 0.7) * 1.1 : 1.1 - ((rIn - 0.7) / 0.3) * 0.1));

      // Restart icon aparece em 10.92 (k=5.97)
      const rsIn = ctx.clamp01((k - 5.97) / 0.3);
      restart.visible = k >= 5.97;
      restart.scale.setScalar(Math.max(0.001, rsIn));

      // LEDs piscam vermelho
      if (k >= 5.97) {
        leds.forEach((led, i) => {
          const blink = Math.sin(k * 8 + i * 1.3) > 0;
          led.material.color.set(blink ? C.verm : 0x330000);
        });
      } else {
        leds.forEach((led) => led.material.color.set(C.verde));
      }

      // Restart trava em 11.66 (k=6.71)
      const lockT = 6.71;
      if (k >= lockT) {
        rMat.color.set(C.verm);
        rTorus.visible = false;
        rCone.visible = false;
        restartX.visible = true;
        restart.rotation.z = 0;
        const shakeAmt = Math.max(0, 1 - (k - lockT) / 0.4);
        ctx.fx.shake = Math.max(ctx.fx.shake, 0.8 * shakeAmt);
        ctx.fx.gl = Math.max(ctx.fx.gl, 0.5 * shakeAmt);
      } else {
        rTorus.visible = true;
        rCone.visible = true;
        restartX.visible = false;
        restart.rotation.z = k * 3.5;
      }
    }
  };
}