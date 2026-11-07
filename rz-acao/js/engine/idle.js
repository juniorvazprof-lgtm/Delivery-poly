// Animação de repouso por espécie (pose/atitude própria) + peças marcadas por tag no modelo voxel.
// tags extras do elenco-piloto: ear/sprout (balançam) · gill (abre/fecha) · plate (eleva) · pillar (sobe em sequência)
// kinds: bob · float · breathe · tremble · flap · echo · glitch. Tags: core · wing · tail · orbit · halo · echo · glitch · tent
export function animateIdle(body, t, ph = 0) {
  if (!body) return;
  const kind = body.userData.idle || 'bob';
  if (kind === 'float') body.position.y = 0.22 + Math.sin(t * 1.6 + ph) * 0.1;
  else if (kind === 'tremble') { body.position.y = Math.abs(Math.sin(t * 3 + ph)) * 0.04; body.position.x = Math.sin(t * 47 + ph) * 0.012 * (Math.sin(t * 0.9 + ph) > 0.4 ? 1 : 0); }
  else if (kind === 'glitch') body.position.y = 0.08 + Math.sin(t * 2 + ph) * 0.05;
  else if (kind === 'breathe') body.position.y = 0;
  else body.position.y = Math.abs(Math.sin(t * 2.4 + ph)) * 0.05;
  for (const me of body.userData.tagged || []) {
    const b = me.userData.base, s = me.userData.bs, tag = me.userData.tag;
    if (tag === 'core') me.scale.copy(s).multiplyScalar(1 + Math.sin(t * (kind === 'breathe' ? 2.2 : 3) + ph) * 0.14);
    else if (tag === 'wing') me.position.y = b.y + Math.sin(t * (kind === 'flap' ? 7 : 3) + ph) * 0.12 * Math.min(1, Math.abs(b.x) * 2);
    else if (tag === 'tail') me.position.x = b.x + Math.sin(t * 3 + ph + b.z * 2) * 0.06;
    else if (tag === 'tent') me.position.x = b.x + Math.sin(t * 2.4 + ph + b.x * 4) * 0.05;
    else if (tag === 'orbit' || tag === 'halo') {
      const a = t * (tag === 'halo' ? 0.9 : 1.4) + ph, c = Math.cos(a), sn = Math.sin(a);
      me.position.x = b.x * c - b.z * sn; me.position.z = b.x * sn + b.z * c;
      me.rotation.y = -a;
    } else if (tag === 'echo') me.position.x = b.x + Math.sin(t * 1.3 + ph) * 0.12;
    else if (tag === 'glitch') {
      const step = Math.floor(t * 6 + ph * 10), j = (step * 9301 + 49297) % 233280 / 233280;
      me.position.set(b.x + (j - 0.5) * 0.18, b.y + ((j * 7) % 1 - 0.5) * 0.18, b.z);
    }
  }
}
