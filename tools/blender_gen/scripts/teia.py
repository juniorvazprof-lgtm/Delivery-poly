# Claude: teia entre dois galhos, com aranha no centro
for s in (-1, 1):
    prim('cylinder', f'galho_{s}', loc=(s * 0.6, 0, 0.7), rot=(0, s * 0.12, 0), radius=0.035, depth=1.45, vertices=5, color='#7a5236')
c = (0, 0, 0.85)
for i in range(8):  # raios
    a = i * math.pi / 4
    prim('cylinder', f'raio_{i}', loc=(c[0] + math.cos(a) * 0.27, 0, c[2] + math.sin(a) * 0.27), rot=(0, -a + math.pi / 2, 0), radius=0.004, depth=0.54, vertices=3, color='#f4f4ff')
for i, r in enumerate([0.12, 0.22, 0.32, 0.42]):  # espirais
    prim('torus', f'anel_{i}', loc=c, rot=(math.pi / 2, 0, 0), major_radius=r, minor_radius=0.004, major_segments=8, minor_segments=3, color='#f4f4ff')
prim('ico', 'aranha', loc=(0, -0.02, 0.85), radius=0.04, subdivisions=1, color='#1a1a1a')
