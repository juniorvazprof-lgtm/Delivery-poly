// Celular 3D flutuando com tela de alerta piscando.
// params: { linhas:['SEM','CONEXÃO'], sub:'ERRO 0x000F · REDE', icone:'wifi'|'alerta'|'cadeado', cor:'#ff2b3d' }
export default function criar(ctx, p) {
  const T = ctx.THREE, g = new T.Group(), cor = p.cor || '#ff2b3d';
  const cel = new T.Group(); g.add(cel);
  cel.add(new T.Mesh(new ctx.RoundedBoxGeometry(2.2, 4.4, .28, 8, .25), new T.MeshStandardMaterial({ color: '#0c0f16', metalness: .9, roughness: .25 })));
  const tc = ctx.telaCanvas(440, 880), tx = tc.g2d;
  const tela = new T.Mesh(new T.PlaneGeometry(2, 4), new T.MeshBasicMaterial({ map: tc.tex, color: '#b8b8b8' })); tela.position.z = .15; cel.add(tela);
  const lk = new T.PointLight(cor, 4, 12); lk.position.set(0, 0, 2.5); cel.add(lk);
  const linhas = p.linhas || ['SEM', 'CONEXÃO'];
  function desenha(t) {
    tx.fillStyle = Math.floor(t * 12) % 2 ? '#2a0004' : '#140002'; tx.fillRect(0, 0, 440, 880);
    tx.strokeStyle = 'rgba(255,43,61,.25)'; tx.lineWidth = 2; for (let y = 0; y < 880; y += 6) { tx.beginPath(); tx.moveTo(0, y); tx.lineTo(440, y); tx.stroke(); }
    tx.lineCap = 'round'; tx.strokeStyle = cor; tx.fillStyle = cor; tx.lineWidth = 26;
    const ic = p.icone || 'wifi';
    if (ic === 'wifi') { for (let i = 0; i < 3; i++) { tx.beginPath(); tx.arc(220, 420, 60 + i * 55, -Math.PI * .78, -Math.PI * .22); tx.stroke(); }
      tx.beginPath(); tx.arc(220, 420, 16, 0, 7); tx.fill(); tx.lineWidth = 30; tx.strokeStyle = '#fff'; tx.beginPath(); tx.moveTo(90, 180); tx.lineTo(350, 480); tx.stroke(); }
    else if (ic === 'alerta') { tx.beginPath(); tx.moveTo(220, 170); tx.lineTo(380, 460); tx.lineTo(60, 460); tx.closePath(); tx.stroke(); tx.font = '200px Archivo'; tx.textAlign = 'center'; tx.fillText('!', 220, 445); }
    else { tx.strokeRect(120, 300, 200, 170); tx.beginPath(); tx.arc(220, 300, 70, Math.PI, 0); tx.stroke(); }
    tx.fillStyle = '#fff'; tx.textAlign = 'center'; linhas.forEach((l, i) => { let f = 64; tx.font = f + 'px Archivo'; while (tx.measureText(l).width > 400 && f > 26) { f -= 2; tx.font = f + 'px Archivo'; } tx.fillText(l, 220, 620 + i * 75); });
    tx.fillStyle = '#ff8a95'; { let f = 28; tx.font = f + 'px Archivo'; while (tx.measureText(p.sub ?? '').width > 410 && f > 16) { f -= 1; tx.font = f + 'px Archivo'; } } tx.fillText(p.sub ?? '', 220, 620 + linhas.length * 75 + 10);
    for (let i = 0; i < 4; i++) { const y = (Math.sin(t * 37 + i * 9) * .5 + .5) * 860; tx.drawImage(tc.canvas, 0, y, 440, 14, Math.sin(t * 91 + i) * 40, y, 440, 14); }
    tc.tex.needsUpdate = true;
  }
  return { grupo: g, update(t, k) {
    desenha(t);
    cel.rotation.set(-.25 + Math.sin(t * 2) * .05, -.6 + ctx.ease(k / 1.2) * .75, .12 - ctx.ease(k / .8) * .12);
    cel.position.set(0, 1.9 + Math.sin(t * 3) * .08, 0);
    ctx.cam.position.set(0, 0, 13 + (1 - ctx.ease(k / .35)) * 8 - k * 1.2); ctx.cam.lookAt(0, 0, 0);
    lk.intensity = 4 + Math.sin(t * 20) * 2; const fx = ctx.fx; fx.bloom = .45;
    fx.gl = Math.max(0, .6 - k * 3) + (Math.floor(t * 8) % 5 === 0 ? .25 : 0); fx.ab = .004 + fx.gl * .01; fx.flash = Math.max(0, .5 - k * 4);
  } };
}
