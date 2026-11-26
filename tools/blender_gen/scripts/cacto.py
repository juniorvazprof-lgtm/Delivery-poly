# Claude: cacto com dois braços e uma flor rosa
V, V2 = '#4f8a4a', '#5fa055'
prim('cylinder', 'tronco', loc=(0, 0, 0.7), radius=0.17, depth=1.4, vertices=8, color=V)
prim('ico', 'topo', loc=(0, 0, 1.4), scale=(1, 1, 0.7), radius=0.17, subdivisions=1, color=V)
for s, h, l in [(1, 0.6, 0.45), (-1, 0.85, 0.35)]:
    prim('cylinder', f'braco_h_{s}', loc=(s * 0.26, 0, h), rot=(0, math.pi / 2, 0), radius=0.1, depth=0.25, vertices=7, color=V2)
    prim('cylinder', f'braco_v_{s}', loc=(s * 0.36, 0, h + l / 2), radius=0.1, depth=l, vertices=7, color=V2)
    prim('ico', f'braco_topo_{s}', loc=(s * 0.36, 0, h + l), scale=(1, 1, 0.7), radius=0.1, subdivisions=1, color=V2)
for i in range(5):
    prim('cone', f'petala_{i}', loc=(math.cos(i * 1.256) * 0.06, math.sin(i * 1.256) * 0.06, 1.55), rot=(math.sin(i * 1.256) * -0.9, math.cos(i * 1.256) * 0.9, 0), radius1=0.05, radius2=0, depth=0.12, vertices=4, color='#ff7eb3')
prim('ico', 'miolo', loc=(0, 0, 1.54), radius=0.04, subdivisions=1, color='#ffe14d')
