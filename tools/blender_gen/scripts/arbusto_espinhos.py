# Revisado à mão: arbusto de folhas pontudas com frutinhas amarelas.
FOLHA, FOLHA2, FRUTA = '#6f8a5a', '#83a06a', '#ffd23f'
prim('ico', 'espinhos_corpo', loc=(0, 0, 0.42), scale=(0.55, 0.55, 0.42), radius=1, subdivisions=1, color=FOLHA)
prim('ico', 'espinhos_topo', loc=(0.12, -0.05, 0.72), scale=(0.33, 0.33, 0.25), radius=1, subdivisions=1, color=FOLHA2)
# folhas pontudas espetadas para fora, em três anéis
for ring, (z, r, n, tilt) in enumerate([(0.25, 0.5, 9, 1.35), (0.52, 0.5, 9, 1.0), (0.78, 0.3, 6, 0.55)]):
    for i in range(n):
        a = i * 2 * math.pi / n + ring * 0.35
        d = Vector((math.cos(a) * math.sin(tilt), math.sin(a) * math.sin(tilt), math.cos(tilt)))
        rot = d.to_track_quat('Z', 'Y').to_euler()
        prim('cone', f'espinho_{ring}_{i}', loc=(math.cos(a) * r, math.sin(a) * r, z), rot=rot,
             radius1=0.07, radius2=0, depth=0.34, vertices=4, color=FOLHA2 if i % 2 else FOLHA)
for i, (a, z) in enumerate([(0.3, 0.55), (1.6, 0.35), (2.7, 0.62), (3.9, 0.4), (5.1, 0.58), (4.5, 0.8)]):
    prim('ico', f'fruta_{i}', loc=(math.cos(a) * 0.5, math.sin(a) * 0.5, z), radius=0.07, subdivisions=1, color=FRUTA)
