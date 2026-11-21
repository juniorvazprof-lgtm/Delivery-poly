export default function criar(ctx) {
  const T = ctx.THREE;
  const g = new T.Group();
  const C = ctx.cores;
  const rnd = ctx.rnd(1337);

  // ---------- chão ----------
  const chaoMat = new T.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.9, metalness: 0.2 });
  const chao = new T.Mesh(new T.PlaneGeometry(80, 80), chaoMat);
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.02;
  g.add(chao);

  const grid = new T.GridHelper(80, 80, 0x1a2a3a, 0x0e1822);
  grid.position.y = 0;
  g.add(grid);

  // ---------- praça: blocos de fundo ----------
  const blocoMat = new T.MeshStandardMaterial({ color: 0x0c1420, roughness: 0.8, metalness: 0.3 });
  for (let i = 0; i < 10; i++) {
    const w = 1.5 + rnd() * 2;
    const h = 2 + rnd() * 4;
    const d = 1.5 + rnd() * 2;
    const b = new T.Mesh(new T.BoxGeometry(w, h, d), blocoMat);
    const ang = (i / 10) * Math.PI * 2;
    b.position.set(Math.cos(ang) * 16, h / 2, Math.sin(ang) * 16 - 6);
    g.add(b);
  }

  // ---------- MERCADO (esquerda/fundo) ----------
  const mercado = new T.Group();
  mercado.position.set(-3.6, 0, -7);
  const fachadaMat = new T.MeshStandardMaterial({ color: 0x101a26, roughness: 0.6, metalness: 0.5 });
  const fachada = new T.Mesh(new T.BoxGeometry(6, 3.2, 1.2), fachadaMat);
  fachada.position.y = 1.6;
  mercado.add(fachada);
  const letreiroM = ctx.textoPlano('MERCADO', { tamanho: 96, cor: C.vermel, fonte: 'Anton', largura: 4.2 });
  letreiroM.position.set(0, 3.4, 0.65);
  mercado.add(letreiroM);
  const neonM = new T.Mesh(new T.PlaneGeometry(4.4, 0.9), new T.MeshBasicMaterial({ color: C.vermel, transparent: true, opacity: 0.35 }));
  neonM.position.set(0, 3.4, 0.6);
  mercado.add(neonM);
  const porta = new T.Mesh(new T.PlaneGeometry(1.6, 2), new T.MeshBasicMaterial({ color: 0x1a3a5a }));
  porta.position.set(0, 1, 0.61);
  mercado.add(porta);
  const carrinho = new T.Group();
  const carMat = new T.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.8, roughness: 0.3 });
  const cbase = new T.Mesh(new T.BoxGeometry(0.5, 0.35, 0.4), carMat);
  cbase.position.y = 0.35;
  carrinho.add(cbase);
  for (let i = 0; i < 4; i++) {
    const w = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.05, 8), carMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(i < 2 ? -0.2 : 0.2, 0.06, i % 2 ? -0.15 : 0.15);
    carrinho.add(w);
  }
  carrinho.position.set(-3.2, 0, 0.8);
  mercado.add(carrinho);
  g.add(mercado);

  // ---------- POSTO (direita) ----------
  const posto = new T.Group();
  posto.position.set(3.6, 0, -7);
  const pilarMat = new T.MeshStandardMaterial({ color: 0x1a2430, metalness: 0.6, roughness: 0.4 });
  for (const x of [-1.6, 1.6]) {
    const p = new T.Mesh(new T.BoxGeometry(0.25, 3, 0.25), pilarMat);
    p.position.set(x, 1.5, 0);
    posto.add(p);
  }
  const cobertura = new T.Mesh(new T.BoxGeometry(4.2, 0.25, 2.4), pilarMat);
  cobertura.position.y = 3.1;
  posto.add(cobertura);
  const letreiroP = ctx.textoPlano('POSTO', { tamanho: 96, cor: C.azul, fonte: 'Anton', largura: 2.6 });
  letreiroP.position.set(0, 3.6, 0.4);
  posto.add(letreiroP);
  const neonP = new T.Mesh(new T.PlaneGeometry(2.8, 0.7), new T.MeshBasicMaterial({ color: C.azul, transparent: true, opacity: 0.35 }));
  neonP.position.set(0, 3.6, 0.35);
  posto.add(neonP);
  const bombaMat = new T.MeshStandardMaterial({ color: 0x223040, metalness: 0.7, roughness: 0.3 });
  for (const x of [-0.8, 0.8]) {
    const b = new T.Mesh(new T.BoxGeometry(0.4, 0.9, 0.35), bombaMat);
    b.position.set(x, 0.45, 0.3);
    posto.add(b);
    const tela = new T.Mesh(new T.PlaneGeometry(0.25, 0.2), new T.MeshBasicMaterial({ color: C.azul }));
    tela.position.set(x, 0.7, 0.48);
    posto.add(tela);
  }
  g.add(posto);

  // ---------- PESSOAS (2x maiores) ----------
  const N = 40;
  const pessoas = [];
  const coresP = [0x556677, 0x667788, 0x445566, 0x778899, 0x334455, 0x8899aa];
  const luzP = new T.PointLight('#9fc4ff', 3, 0, 0); luzP.position.set(0, 7, -2); g.add(luzP);
  const corpoGeo = new T.CapsuleGeometry(0.26, 0.7, 4, 8);
  const cabecaGeo = new T.SphereGeometry(0.22, 8, 6);
  const celGeo = new T.PlaneGeometry(0.12, 0.2);

  const posIni = [];
  for (let i = 0; i < N; i++) {
    const ang = rnd() * Math.PI * 2;
    const r = 1.2 + rnd() * 3.5;
    posIni.push(new T.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r - 1));
  }

  const posCorre = [];
  for (let i = 0; i < N; i++) {
    const vaiMercado = i % 2 === 0;
    const alvo = vaiMercado ? mercado.position : posto.position;
    const jx = (rnd() - 0.5) * 2.5;
    const jz = (rnd() - 0.5) * 1.5;
    posCorre.push(new T.Vector3(alvo.x + jx, 0, alvo.z + 2.2 + jz));
  }

  const posFila = [];
  for (let i = 0; i < N; i++) {
    const vaiMercado = i % 2 === 0;
    const base = vaiMercado ? mercado.position : posto.position;
    const idx = Math.floor(i / 2);
    const lado = vaiMercado ? -1 : 1;
    const fx = base.x * 0.7 + Math.sin(idx * 0.9) * 0.45;
    const fz = base.z + 1.8 + idx * 0.42;
    posFila.push(new T.Vector3(fx, 0, fz));
  }

  for (let i = 0; i < N; i++) {
    const grp = new T.Group();
    const cor = coresP[Math.floor(rnd() * coresP.length)];
    const mat = new T.MeshStandardMaterial({ color: cor, roughness: 0.7, metalness: 0.2 });
    const corpo = new T.Mesh(corpoGeo, mat);
    corpo.position.y = 0.8;
    grp.add(corpo);
    const cabeca = new T.Mesh(cabecaGeo, mat);
    cabeca.position.y = 1.44;
    grp.add(cabeca);
    let cel = null;
    if (rnd() < 0.4) {
      cel = new T.Mesh(celGeo, new T.MeshBasicMaterial({ color: C.azul }));
      cel.position.set(0.24, 0.9, 0.3);
      cel.rotation.x = -0.3;
      grp.add(cel);
    }
    const excl = ctx.textoPlano('!', { tamanho: 128, cor: C.vermel, fonte: 'Anton', largura: 0.7 });
    excl.position.set(0, 2.3, 0);
    excl.scale.set(0.001, 0.001, 0.001);
    grp.add(excl);

    grp.position.copy(posIni[i]);
    grp.userData = { cel, excl, cabeca, corpo, baseY: 0, fase: rnd() * Math.PI * 2 };
    g.add(grp);
    pessoas.push(grp);
  }

  // ---------- update ----------
  return {
    grupo: g,
    update(t, k, dur) {
      const tEntendem = 36.54 - 35.9;
      const tCorrem = 37.86 - 35.9;
      const tPosto = 38.84 - 35.9;
      const tFilas = 40.16 - 35.9;
      const tComecam = 40.58 - 35.9;

      // câmera: alta, olhando para baixo (~35°), sobe no final
      const camT = ctx.clamp01(k / dur);
      const camY = 7 + camT * 4;
      const camZ = 13 + camT * 2;
      const orbit = Math.sin(t * 0.3) * 0.5;
      ctx.cam.position.set(orbit, camY, camZ);
      ctx.cam.lookAt(0, -1.2, -4.5);

      // pessoas
      for (let i = 0; i < N; i++) {
        const p = pessoas[i];
        const ud = p.userData;

        let pos = posIni[i].clone();
        let correndo = false;
        let naFila = false;

        if (k > tCorrem) {
          const a = ctx.ease(ctx.clamp01((k - tCorrem) / 1.2));
          pos.lerp(posCorre[i], a);
          correndo = a > 0.05 && a < 0.95;
        }
        if (k > tFilas) {
          const a = ctx.ease(ctx.clamp01((k - tFilas) / 1.2));
          const pc = posCorre[i].clone();
          pc.lerp(posFila[i], a);
          pos.copy(pc);
          naFila = a > 0.5;
          correndo = a < 0.5;
        }

        let yOff = 0;
        let tilt = 0;
        if (correndo) {
          const vel = 8 + i * 0.1;
          yOff = Math.abs(Math.sin(t * vel + ud.fase)) * 0.18;
          tilt = Math.sin(t * vel + ud.fase) * 0.15;
        }
        p.position.set(pos.x, yOff, pos.z);
        p.rotation.x = tilt;

        if (k > tEntendem) {
          const a = ctx.ease(ctx.clamp01((k - tEntendem) / 0.3));
          ud.cabeca.rotation.y = a * Math.PI * 0.5;
          const pop = ctx.clamp01((k - tEntendem) / 0.2);
          let s = 0;
          if (pop < 0.6) s = pop / 0.6 * 1.15;
          else s = 1.15 - (pop - 0.6) / 0.4 * 0.15;
          if (i % 3 === 0) {
            ud.excl.scale.set(s, s, s);
            ud.excl.position.y = 2.3 + Math.sin(t * 4 + i) * 0.08;
          }
        }

        if (ud.cel) {
          const b = 0.5 + 0.5 * Math.sin(t * 3 + i);
          ud.cel.material.color.setRGB(0.18 * b, 0.65 * b, 1.0 * b);
        }

        if (correndo) {
          p.rotation.x = 0.25 + tilt;
        } else if (naFila) {
          p.rotation.x = 0;
        }
      }

      // fx
      if (k > tEntendem && k < tEntendem + 0.15) {
        ctx.fx.shake = Math.max(ctx.fx.shake, 0.2);
      }
      if (k > tCorrem && k < tCorrem + 0.1) {
        ctx.fx.flash = Math.max(ctx.fx.flash, 0.15);
      }
      if (k > tPosto && k < tPosto + 0.1) {
        ctx.fx.flash = Math.max(ctx.fx.flash, 0.12);
      }
      if (k > tComecam) {
        const a = ctx.clamp01((k - tComecam) / 0.3);
        ctx.fx.shake = Math.max(ctx.fx.shake, 0.5 * (1 - a * 0.5));
        ctx.fx.red = Math.max(ctx.fx.red, 0.25 * (1 - a * 0.3));
        ctx.fx.ab = 0.02;
      }
      if (k > tFilas && k < tFilas + 0.2) {
        ctx.fx.shake = Math.max(ctx.fx.shake, 0.15);
      }

      ctx.fx.bloom = 0.9;
    }
  };
}