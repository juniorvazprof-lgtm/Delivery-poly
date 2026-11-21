// Mapa real (contornos Natural Earth) desenhado com D3 numa placa; rotas se desenham, pinos caem, país destacado.
// params: { vista:'mundo'|'pais'|'globo', foco:'076' (id ISO numérico do país p/ 'pais'), destaque:['076'],
//   origens:[[lon,lat],...] (rotas até `alvo`), alvo:[lon,lat], pinos:[{lon,lat,nome,lado:1|-1}],
//   etiqueta:'TEXTO NA CAIXA', estilo:'cyber'|'vox', girar:[lon,lat] (centro do globo) }
export default async function criar(ctx, p) {
  const T = ctx.THREE, d3 = ctx.d3, topo = await ctx.dados('world-atlas/countries-50m.json');
  const paises = ctx.topojson.feature(topo, topo.objects.countries).features;
  const W = 1024, H = 1024, tc = ctx.telaCanvas(W, H), c = tc.g2d, g = new T.Group();
  const vox = p.estilo === 'vox';
  const TEMA = vox ? { mar: '#dfe9ec', terra: '#e6dcc6', borda: '#a89c82', dest: '#ff5a36', arco: '#1b1b1b', pino: '#1b1b1b', caixa: '#111' }
                   : { mar: '#050b16', terra: '#0f2240', borda: '#2a62b8', dest: '#ff2b3d', arco: '#ff2b3d', pino: '#ffe14a', caixa: '#ff2b3d' };
  const dest = new Set(p.destaque || ['076']); const alvo = p.alvo || [-47.9, -15.8];
  let proj;
  if (p.vista === 'globo') proj = d3.geoOrthographic().rotate([-(p.girar || alvo)[0], -(p.girar || alvo)[1] + 10]).fitExtent([[40, 40], [W - 40, H - 40]], { type: 'Sphere' });
  else if (p.vista === 'pais') proj = d3.geoMercator().fitExtent([[70, 70], [W - 70, H - 70]], paises.find(f => f.id === (p.foco || '076')));
  else proj = d3.geoNaturalEarth1().rotate([-(alvo[0] + 60), 0]).fitExtent([[-W * .25, 120], [W * 1.25, H - 120]], { type: 'Sphere' });
  const path = d3.geoPath(proj, c);
  const placa = new T.Mesh(new T.PlaneGeometry(5.4, 5.4), new T.MeshBasicMaterial({ map: tc.tex, transparent: true })); placa.position.y = 2.1; g.add(placa);
  const origens = p.origens || [], pinos = p.pinos || [];
  function pinoD(x, y, r, a) { c.globalAlpha = a; c.strokeStyle = TEMA.pino; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r * 1.7, 0, 7); c.stroke();
    c.fillStyle = TEMA.pino; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.globalAlpha = 1; }
  function caixa(x, y, txt, tam, anc) { c.font = `${tam}px Archivo`; const w = c.measureText(txt).width, pd = tam * .3; const x0 = anc === 'end' ? x - w - pd * 2 : anc === 'middle' ? x - w / 2 - pd : x;
    c.fillStyle = TEMA.caixa; c.fillRect(x0, y - tam * .75, w + pd * 2, tam * 1.3); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(txt, x0 + pd, y + tam * .3); }
  function desenha(t, k, dur) {
    c.clearRect(0, 0, W, H);
    c.beginPath(); path({ type: 'Sphere' }); c.fillStyle = TEMA.mar; c.fill();
    c.beginPath(); path(d3.geoGraticule10()); c.strokeStyle = vox ? '#c9d8dc' : '#0c1a33'; c.lineWidth = 1.2; c.stroke();
    for (const f of paises) { c.beginPath(); path(f); const on = dest.has(f.id);
      c.fillStyle = on ? TEMA.dest : TEMA.terra; c.globalAlpha = on ? .75 + .25 * ctx.pulso(t, 1.2) : 1; c.fill(); c.globalAlpha = 1;
      c.strokeStyle = on ? (vox ? '#7a1d0b' : '#ffd0d4') : TEMA.borda; c.lineWidth = on ? 3 : 1; c.stroke(); }
    const a2 = proj(alvo);
    origens.forEach((o, i) => { const q = ctx.clamp01((k - .3 - i * .18) / .6); if (q <= 0) return; const a = proj(o); if (!a || !a2) return;
      const mx = (a[0] + a2[0]) / 2, my = (a[1] + a2[1]) / 2 - Math.hypot(a2[0] - a[0], a2[1] - a[1]) * .3;
      c.strokeStyle = TEMA.arco; c.lineWidth = 6; c.lineCap = 'round'; c.setLineDash(vox ? [16, 10] : []); c.beginPath();
      for (let s = 0; s <= q; s += .02) { const u = 1 - s; const x = u * u * a[0] + 2 * u * s * mx + s * s * a2[0], y = u * u * a[1] + 2 * u * s * my + s * s * a2[1]; s ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke(); c.setLineDash([]); c.fillStyle = TEMA.arco; c.beginPath(); c.arc(a[0], a[1], 10, 0, 7); c.fill(); });
    pinos.forEach((pn, i) => { const q = ctx.clamp01((k - .5 - i * .25) / .25); if (q <= 0) return; const xy = proj([pn.lon, pn.lat]); if (!xy) return;
      pinoD(xy[0], xy[1] - (1 - ctx.ease(q)) * 60, 14, q); if (pn.nome && q > .6) caixa(xy[0] + (pn.lado || 1) * 34, xy[1], pn.nome, 34, (pn.lado || 1) < 0 ? 'end' : 'start'); });
    if (p.etiqueta && k > dur * .55) caixa(W / 2, H - 60, p.etiqueta, 46, 'middle');
    tc.tex.needsUpdate = true;
  }
  return { grupo: g, update(t, k, dur) {
    desenha(t, k, dur);
    ctx.cam.position.set(Math.sin(t * .4) * .3, 0, T.MathUtils.lerp(15.5, 12.5, ctx.ease(k / dur))); ctx.cam.lookAt(0, 0, 0);
    placa.rotation.x = -.08 + Math.sin(t * .5) * .03; ctx.fx.bloom = vox ? .2 : .55;
  } };
}
