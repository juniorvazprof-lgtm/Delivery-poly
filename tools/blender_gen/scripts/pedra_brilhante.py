# Claude: grupo de cristais translúcidos saindo de uma pedra
prim('ico', 'base', loc=(0, 0, 0.1), scale=(1, 0.9, 0.5), radius=0.32, subdivisions=1, color='#8d8796')
for i, (x, y, h, tx, ty, c) in enumerate([(0, 0, 0.75, 0, 0, '#b9f0ff'), (0.16, 0.05, 0.5, 0.4, 0.1, '#d7c4ff'), (-0.14, 0.08, 0.55, -0.35, 0.2, '#b9f0ff'),
                                           (0.04, -0.16, 0.42, 0.1, -0.4, '#e6fbff'), (-0.08, -0.1, 0.35, -0.2, -0.3, '#d7c4ff')]):
    prim('cylinder', f'cristal_{i}', loc=(x, y, 0.15 + h / 2), rot=(ty, tx, 0), radius=0.07, depth=h, vertices=6, color=c)
    prim('cone', f'ponta_{i}', loc=(x + math.sin(tx) * h / 2, y - math.sin(ty) * h / 2, 0.15 + h + 0.05), rot=(ty, tx, 0), radius1=0.07, radius2=0, depth=0.12, vertices=6, color=c)
