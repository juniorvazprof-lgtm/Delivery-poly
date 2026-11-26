# Claude: samambaia com folhas arqueadas (cada folha = 3 segmentos que descem)
for i in range(8):
    a = i * 0.785
    d = Vector((math.cos(a), math.sin(a), 0))
    pts = [Vector((0, 0, 0.1)), d * 0.3 + Vector((0, 0, 0.6)), d * 0.6 + Vector((0, 0, 0.75)), d * 0.8 + Vector((0, 0, 0.45))]
    for k in range(3):
        p0, p1 = pts[k], pts[k + 1]; m = (p0 + p1) / 2; v = p1 - p0
        prim('cube', f'folha_{i}_{k}', loc=m, rot=v.to_track_quat('Z', 'X').to_euler(), scale=(0.11 - k * 0.025, 0.012, v.length / 2), color='#3f8f45' if (i + k) % 2 else '#4fa552')
