# Escrito à mão pelo Claude (sem DeepSeek): jacaré com mandíbula e cauda articuladas.
VERDE, VERDE2, BARRIGA, OLHO = '#3d5a3a', '#4f6e45', '#c9c08a', '#e8d25a'
prim('cube', 'corpo', loc=(0, 0.1, 0.26), scale=(0.36, 0.7, 0.18), color=VERDE)
prim('cube', 'barriga', loc=(0, 0.1, 0.12), scale=(0.32, 0.65, 0.06), color=BARRIGA)
for i in range(5):  # escamas do dorso
    prim('cone', f'escama_{i}', loc=(0, -0.45 + i * 0.25, 0.47), radius1=0.08, radius2=0, depth=0.14, vertices=4, color=VERDE2)
head = empty('head', loc=(0, -0.62, 0.28))
prim('cube', 'cranio', loc=(0, -0.18, 0.04), scale=(0.27, 0.22, 0.12), color=VERDE, parent=head)
prim('cube', 'focinho', loc=(0, -0.62, 0.01), scale=(0.16, 0.3, 0.07), color=VERDE, parent=head)
for s in (-1, 1):
    prim('ico', f'olho_{"l" if s > 0 else "r"}', loc=(s * 0.15, -0.16, 0.2), radius=0.075, subdivisions=1, color=VERDE2, parent=head)
    prim('ico', f'pupila_{"l" if s > 0 else "r"}', loc=(s * 0.17, -0.2, 0.24), radius=0.035, subdivisions=1, color=OLHO, parent=head)
    prim('ico', f'narina_{s}', loc=(s * 0.06, -0.88, 0.09), radius=0.025, subdivisions=1, color='#1a2418', parent=head)
jaw = empty('jaw', loc=(0, -0.05, -0.07), parent=head)
prim('cube', 'mandibula', loc=(0, -0.5, -0.04), scale=(0.15, 0.42, 0.05), color=BARRIGA, parent=jaw)
for i in range(4):
    for s in (-1, 1):
        prim('cone', f'dente_{i}_{s}', loc=(s * 0.13, -0.3 - i * 0.17, 0.02), radius1=0.025, radius2=0, depth=0.06, vertices=4, color='#f4f0e0', parent=jaw)
for n, x, y in [('pata_fl', 0.36, -0.4), ('pata_fr', -0.36, -0.4), ('pata_bl', 0.36, 0.55), ('pata_br', -0.36, 0.55)]:
    prim('cube', n, loc=(x, y, 0.08), scale=(0.1, 0.13, 0.08), rot=(0, 0, 0.3 if x > 0 else -0.3), color=VERDE2)
tail = empty('tail', loc=(0, 0.78, 0.24))
prim('cone', 'cauda_1', loc=(0, 0.35, 0), rot=(-math.pi / 2, 0, 0), scale=(1, 0.75, 1), radius1=0.26, radius2=0.14, depth=0.7, vertices=6, color=VERDE, parent=tail)
prim('cone', 'cauda_2', loc=(0, 1.0, -0.04), rot=(-math.pi / 2, 0, 0), scale=(1, 0.7, 1), radius1=0.14, radius2=0.01, depth=0.65, vertices=5, color=VERDE, parent=tail)
for i in range(3):
    prim('cone', f'escama_cauda_{i}', loc=(0, 0.2 + i * 0.3, 0.17 - i * 0.04), radius1=0.06, radius2=0, depth=0.1, vertices=4, color=VERDE2, parent=tail)
