// Título gigante neon que bate na tela (cartela de impacto), com anéis girando atrás.
// params: { linhas:['REGRA','Nº 1'], cores:['#ffffff','#ff2b3d'], tamanho:1 }
export default function criar(ctx, p) {
  const T = ctx.THREE, g = new T.Group(), linhas = p.linhas || ['TÍTULO'], cores = p.cores || ['#ffffff', '#ff2b3d'];
  const placas = linhas.map((l, i) => { const m = ctx.textoPlano(l, { tamanho: 160, fonte: 'Anton', cor: cores[i % cores.length], largura: Math.min(5.2, .62 * l.length + 1.2) * (p.tamanho || 1) });
    m.position.y = 3.2 - i * 1.6; g.add(m); return m; });
  const aneis = []; for (let i = 0; i < 5; i++) { const a = new T.Mesh(new T.TorusGeometry(2.6 + i * .7, .03, 8, 96), new T.MeshBasicMaterial({ color: i % 2 ? '#2fa8ff' : '#ff2b3d', transparent: true, opacity: .45 }));
    a.position.set(0, 2.4, -3 - i); g.add(a); aneis.push(a); }
  return { grupo: g, update(t, k) {
    ctx.cam.position.set(0, 0, 13 - k * .6); ctx.cam.lookAt(0, .4, 0);
    placas.forEach((m, i) => { const q = ctx.clamp01((k - i * .18) / .22); const s = q < 1 ? 3.2 - 2.2 * ctx.ease(q) : 1 + Math.sin(t * 4) * .015; m.scale.setScalar(s); m.material.opacity = q; });
    aneis.forEach((a, i) => { a.rotation.z = t * (.3 + i * .1) * (i % 2 ? 1 : -1); a.rotation.x = Math.sin(t + i) * .2; });
    const fx = ctx.fx, kk = k - .2; fx.bloom = .7; if (kk > 0 && kk < .5) { fx.shake = 1 - kk * 2; fx.flash = Math.max(0, .5 - kk * 3); fx.ab = .015; }
  } };
}
