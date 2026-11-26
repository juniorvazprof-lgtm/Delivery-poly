# Claude: cocozinho de capivara (bolinhas ovais)
for i, (x, y, z) in enumerate([(0, 0, 0.04), (0.08, 0.03, 0.04), (-0.07, 0.05, 0.04), (0.02, -0.08, 0.04), (0.01, 0.01, 0.11)]):
    prim('ico', f'bolinha_{i}', loc=(x, y, z), rot=(0, 0, i), scale=(1, 1.5, 0.85), radius=0.045, subdivisions=1, color='#5a3a20')
