# Claude: notebook aberto em cima de um toco de árvore
prim('cylinder', 'toco', loc=(0, 0, 0.35), radius=0.45, depth=0.7, vertices=9, color='#7a5236')
prim('cylinder', 'toco_topo', loc=(0, 0, 0.705), radius=0.42, depth=0.02, vertices=9, color='#c79a6a')
for i in range(3):
    a = i * 2.1
    prim('cone', f'raiz_{i}', loc=(math.cos(a) * 0.42, math.sin(a) * 0.42, 0.08), rot=(math.sin(a) * 1.2, -math.cos(a) * 1.2, 0), radius1=0.12, radius2=0.02, depth=0.3, vertices=5, color='#6b4730')
prim('cube', 'base', loc=(0, 0.02, 0.73), scale=(0.3, 0.21, 0.015), color='#9aa0ad')
prim('cube', 'teclado', loc=(0, -0.03, 0.748), scale=(0.25, 0.11, 0.004), color='#3a3f4b')
prim('cube', 'touchpad', loc=(0, -0.17, 0.747), scale=(0.07, 0.03, 0.003), color='#7d8391')
tela = empty('tela_pivo', loc=(0, 0.22, 0.745))
prim('cube', 'tampa', loc=(0, 0.04, 0.2), rot=(-0.25, 0, 0), scale=(0.3, 0.012, 0.2), color='#9aa0ad', parent=tela)
prim('cube', 'tela', loc=(0, 0.025, 0.205), rot=(-0.25, 0, 0), scale=(0.27, 0.004, 0.17), color='#5fd3ff', parent=tela)
prim('ico', 'led', loc=(0.24, -0.18, 0.75), radius=0.01, subdivisions=1, color='#7dff8a')
