# Claude: caramujo com concha espiral
prim('cube', 'corpo', loc=(0, -0.02, 0.05), scale=(0.07, 0.2, 0.05), color='#d8c8a0')
for s in (-1, 1):
    prim('cylinder', f'antena_{s}', loc=(s * 0.03, -0.2, 0.13), rot=(0.5, s * 0.3, 0), radius=0.008, depth=0.12, vertices=4, color='#d8c8a0')
for i in range(4):
    r = 0.13 - i * 0.03
    prim('torus', f'concha_{i}', loc=(0, 0.06, 0.15 + i * 0.03), rot=(math.pi / 2, 0, 0), scale=(1, 1, 1),
         major_radius=r, minor_radius=0.045 - i * 0.008, major_segments=10, minor_segments=5, color='#c2703d' if i % 2 else '#e0a060')
