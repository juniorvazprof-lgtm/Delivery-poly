# Claude: tronco caído com musgo e um cogumelinho
prim('cylinder', 'tronco', loc=(0, 0, 0.33), rot=(math.pi / 2, 0, 0), radius=0.33, depth=2.4, vertices=8, color='#7a5236')
for s in (-1, 1):
    prim('cylinder', f'anel_{s}', loc=(0, s * 1.205, 0.33), rot=(math.pi / 2, 0, 0), radius=0.27, depth=0.02, vertices=8, color='#c79a6a')
for i, (y, x, sc) in enumerate([(-0.7, 0.05, 0.42), (0.1, -0.08, 0.5), (0.8, 0.1, 0.38)]):
    prim('ico', f'musgo_{i}', loc=(x, y, 0.58), scale=(sc, sc * 1.4, 0.18), radius=1, subdivisions=1, color='#5f9a3e')
prim('cylinder', 'galho', loc=(0.3, 0.4, 0.5), rot=(0, 1.0, 0.3), radius=0.05, depth=0.5, vertices=5, color='#7a5236')
