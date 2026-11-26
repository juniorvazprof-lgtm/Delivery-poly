# Claude: ninho de gravetos com ovinhos
prim('torus', 'ninho', loc=(0, 0, 0.12), major_radius=0.26, minor_radius=0.1, major_segments=10, minor_segments=5, color='#9a7046')
prim('cylinder', 'fundo', loc=(0, 0, 0.04), radius=0.25, depth=0.06, vertices=10, color='#7d5a38')
for i in range(8):
    a = i * 0.8
    prim('cylinder', f'graveto_{i}', loc=(math.cos(a) * 0.3, math.sin(a) * 0.3, 0.18), rot=(0.4 * math.sin(a), 0.4 * math.cos(a), a), radius=0.012, depth=0.3, vertices=4, color='#6b4c2e')
for i, a in enumerate([0.3, 2.4, 4.3]):
    prim('ico', f'ovo_{i}', loc=(math.cos(a) * 0.08, math.sin(a) * 0.08, 0.12), scale=(1, 1, 1.3), radius=0.055, subdivisions=1, color='#9fd8ef')
