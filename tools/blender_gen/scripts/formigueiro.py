# Claude: formigueiro com formiguinhas
prim('cone', 'monte', loc=(0, 0, 0.28), radius1=0.6, radius2=0.12, depth=0.56, vertices=8, color='#a0714a')
prim('cylinder', 'buraco', loc=(0, 0, 0.56), radius=0.08, depth=0.02, vertices=6, color='#2a1a10')
for i in range(10):
    a = i * 0.9; r = 0.25 + (i % 4) * 0.13
    z = max(0.03, 0.56 * (1 - r / 0.6))
    prim('ico', f'formiga_{i}', loc=(math.cos(a) * r, math.sin(a) * r, z + 0.02), scale=(1, 1.8, 0.8), radius=0.025, subdivisions=1, color='#1a0d08')
