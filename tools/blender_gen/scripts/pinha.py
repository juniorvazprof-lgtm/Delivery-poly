# Claude: pinha caída
for i in range(4):
    z = 0.06 + i * 0.08; r = 0.13 - i * 0.025
    for k in range(6):
        a = k * math.pi / 3 + i * 0.5
        prim('cone', f'escama_{i}_{k}', loc=(math.cos(a) * r * 0.6, math.sin(a) * r * 0.6, z), rot=(math.cos(a) * 0.9, -math.sin(a) * 0.9, 0) if False else (0, 0, 0),
             radius1=0.06, radius2=0.01, depth=0.1, vertices=4, color='#7a4a2a' if (i + k) % 2 else '#8f5a33')
prim('cone', 'ponta', loc=(0, 0, 0.36), radius1=0.05, radius2=0, depth=0.08, vertices=5, color='#6b4024')
