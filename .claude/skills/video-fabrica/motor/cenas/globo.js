// Globo de pontos com arcos de ataque convergindo para um alvo; em `impacto` a onda vermelha toma o globo.
// params: { alvo:[lon,lat]=Brasília, impacto:t_abs (opcional), arcos:26, vermelho:false (já começa todo vermelho) }
export default function criar(ctx, p) {
  const T = ctx.THREE, g = new T.Group(), rnd = ctx.rnd(7);
  const VERM = new T.Color('#ff2b3d'), AZUL = new T.Color('#2fa8ff');
  const N = 3200, pos = new Float32Array(N * 3), cor = new Float32Array(N * 3), base = [];
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996;
    const v = new T.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr).multiplyScalar(3); pos.set([v.x, v.y, v.z], i * 3); base.push(v); }
  const gp = new T.BufferGeometry(); gp.setAttribute('position', new T.BufferAttribute(pos, 3)); gp.setAttribute('color', new T.BufferAttribute(cor, 3));
  const globo = new T.Group(); g.add(globo);
  globo.add(new T.Points(gp, new T.PointsMaterial({ size: .055, vertexColors: true })));
  globo.add(new T.Mesh(new T.SphereGeometry(2.96, 48, 48), new T.MeshBasicMaterial({ color: '#020814' })));
  globo.add(new T.Mesh(new T.SphereGeometry(3.25, 48, 48), new T.MeshBasicMaterial({ color: '#1a6cff', transparent: true, opacity: .08, side: T.BackSide })));
  const [lon, lat] = p.alvo || [-47.9, -15.8];
  const alvo = new T.Vector3().setFromSphericalCoords(3, T.MathUtils.degToRad(90 - lat), T.MathUtils.degToRad(lon + 90));
  const anel = new T.Mesh(new T.RingGeometry(.15, .22, 48), new T.MeshBasicMaterial({ color: VERM, transparent: true, side: T.DoubleSide }));
  anel.position.copy(alvo).multiplyScalar(1.01); anel.lookAt(0, 0, 0); globo.add(anel);
  const arcos = [];
  for (let i = 0; i < (p.arcos ?? 26); i++) {
    const a = new T.Vector3().setFromSphericalCoords(3, Math.acos(2 * rnd() - 1), rnd() * 6.28);
    const m = a.clone().add(alvo).multiplyScalar(.5); m.setLength(3 + a.distanceTo(alvo) * .55);
    const pts = new T.QuadraticBezierCurve3(a, m, alvo).getPoints(80);
    const ge = new T.BufferGeometry().setFromPoints(pts); ge.setDrawRange(0, 0);
    globo.add(new T.Line(ge, new T.LineBasicMaterial({ color: VERM })));
    const cab = new T.Mesh(new T.SphereGeometry(.05, 10, 10), new T.MeshBasicMaterial({ color: '#ffd0d4' })); globo.add(cab);
    arcos.push({ ge, cab, pts, ini: .2 + rnd() * 1.3, dur: .45 + rnd() * .35 });
  }
  // orientar o alvo para a câmera
  globo.rotation.y = -Math.atan2(alvo.x, alvo.z) ; globo.rotation.x = .25;
  const r0 = globo.rotation.y;
  return { grupo: g, update(t, k, dur) {
    globo.position.y = 2.2; globo.rotation.y = r0 - .5 + k * .3;
    const z = T.MathUtils.lerp(30, 19, ctx.ease(k / Math.min(dur, 2))); ctx.cam.position.set(0, -1.5, z); ctx.cam.lookAt(0, -1.5, 0);
    for (const a of arcos) { const q = ctx.clamp01((k - a.ini) / a.dur), n = Math.floor(q * 80);
      a.ge.setDrawRange(Math.max(0, n - 35), Math.min(35, n)); a.cab.visible = q > 0 && q < 1; a.cab.position.copy(a.pts[Math.min(80, n)]); }
    anel.scale.setScalar(1 + ((t * 2) % 1) * 2.5); anel.material.opacity = 1 - ((t * 2) % 1);
    const ti = p.impacto ?? 1e9, ki = t - ti, raio = p.vermelho ? 99 : (ki > 0 ? ki * 7 : -1);
    for (let i = 0; i < N; i++) { const d = base[i].distanceTo(alvo), c = d < raio ? VERM : AZUL, pis = d < raio && ((i + Math.floor(t * 20)) % 7 === 0) ? .2 : 1;
      cor[i * 3] = c.r * pis; cor[i * 3 + 1] = c.g * pis; cor[i * 3 + 2] = c.b * pis; }
    gp.attributes.color.needsUpdate = true;
    if (ki > 0 && ki < 1.2) { const fx = ctx.fx; fx.shake = Math.max(0, 1 - ki * 1.4); fx.gl = Math.max(0, .9 - ki * 1.1);
      fx.red = Math.min(.8, ki * 3) * (1 - Math.max(0, ki - .8) * 2); fx.ab = .002 + fx.shake * .02; fx.flash = Math.max(0, .85 - ki * 5);
      ctx.cam.position.z -= ctx.ease(ki / .4) * 3.5; }
  } };
}
