# Claude: câmera de ação (tipo GoPro) com lente e alça
prim('cube', 'corpo', loc=(0, 0, 0.08), scale=(0.08, 0.05, 0.06), color='#1d1f24')
prim('cylinder', 'lente_aro', loc=(0.03, -0.055, 0.09), rot=(math.pi / 2, 0, 0), radius=0.03, depth=0.02, vertices=10, color='#4a4e57')
prim('cylinder', 'lente', loc=(0.03, -0.066, 0.09), rot=(math.pi / 2, 0, 0), radius=0.02, depth=0.005, vertices=10, color='#2a6bd6')
prim('cube', 'botao', loc=(-0.04, 0, 0.145), scale=(0.015, 0.015, 0.006), color='#d23a3a')
prim('cube', 'tela', loc=(-0.035, -0.051, 0.09), scale=(0.025, 0.002, 0.03), color='#7d8a99')
prim('torus', 'alca', loc=(0, 0.02, 0.08), rot=(0, math.pi / 2, 0), major_radius=0.07, minor_radius=0.008, major_segments=10, minor_segments=3, color='#2d3a4a')
