# Escrito à mão: bola de praia com gomos coloridos.
prim('sphere', 'bola', loc=(0, 0, 0.35), radius=0.35, segments=8, ring_count=6, color='#ff4f8b')
for i, (c, a) in enumerate([('#fff35c', 0), ('#4fb3ff', math.pi / 3), ('#fff35c', 2 * math.pi / 3)]):
    prim('torus', f'gomo_{i}', loc=(0, 0, 0.35), rot=(math.pi / 2, 0, a),
         major_radius=0.35, minor_radius=0.045, major_segments=12, minor_segments=4, color=c)
prim('cylinder', 'tampa', loc=(0, 0, 0.7), radius=0.07, depth=0.03, vertices=8, color='#ffffff')
