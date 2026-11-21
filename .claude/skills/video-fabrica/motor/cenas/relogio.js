// Painel de relógio "TEMPO DESDE O ATAQUE 00:10:00" com globo vermelho e túnel de grade. Bom como separador de capítulos.
// params: { rotulo:'TEMPO DESDE O ATAQUE', h:0, m:10, s:0, contaRapido:true }
export default function criar(ctx, p) {
  const T = ctx.THREE, g = new T.Group();
  const pts = []; for (let i = 0; i < 2600; i++) { const y = 1 - (i / 2599) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996; pts.push(new T.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr).multiplyScalar(3)); }
  const globo = new T.Points(new T.BufferGeometry().setFromPoints(pts), new T.PointsMaterial({ color: '#ff2b3d', size: .055 })); globo.position.y = -1.6; g.add(globo);
  const grade = new T.GridHelper(80, 60, '#ff2b3d', '#5a0d16'); grade.position.y = -3; g.add(grade); const grade2 = grade.clone(); grade2.position.y = 3.4; g.add(grade2);
  const tc = ctx.telaCanvas(1024, 400), tx = tc.g2d;
  const painel = new T.Mesh(new T.PlaneGeometry(5.2, 2.03), new T.MeshBasicMaterial({ map: tc.tex, transparent: true, depthWrite: false })); g.add(painel);
  const pad = n => String(n).padStart(2, '0');
  return { grupo: g, update(t, k) {
    globo.rotation.y = t * .6; grade.position.z = (t * 6) % 1.33; grade2.position.z = grade.position.z;
    ctx.cam.position.set(Math.sin(t * .8) * .6, 0, T.MathUtils.lerp(5, 15, ctx.ease(k / .5))); ctx.cam.lookAt(0, 0, 0);
    painel.position.set(ctx.cam.position.x * .9, 3.0, ctx.cam.position.z - 13); painel.lookAt(ctx.cam.position);
    const s = (p.s || 0) + (p.contaRapido === false ? Math.floor(k) : Math.floor(k * 14));
    tx.clearRect(0, 0, 1024, 400); tx.textAlign = 'center';
    tx.fillStyle = '#ffb3ba'; tx.font = '44px Archivo'; tx.fillText((p.rotulo || 'TEMPO DESDE O ATAQUE').split('').join(String.fromCharCode(8202)), 512, 90);
    tx.fillStyle = '#ff2b3d'; tx.shadowColor = '#ff2b3d'; tx.shadowBlur = 40; tx.font = '170px Archivo';
    tx.fillText(`${pad(p.h || 0)}:${pad(p.m ?? 1)}:${pad(Math.min(59, s))}`, 512, 300); tx.shadowBlur = 0; tc.tex.needsUpdate = true;
    const sc = k < .15 ? 3 - 2 * ctx.ease(k / .15) : 1; painel.scale.setScalar(sc);
    const fx = ctx.fx; fx.shake = k < .25 ? 1 - k * 4 : 0; fx.gl = k < .2 ? .7 - k * 3 : 0; fx.red = .25; fx.flash = Math.max(0, .7 - k * 6);
  } };
}
