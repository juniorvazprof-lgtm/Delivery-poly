# Escrito à mão (o script do DeepSeek gerou cena vazia): morro rochoso com entrada escura voltada para +X.
ROCHA, ROCHA2, ESCURO = '#6e6a73', '#7d7883', '#0b0a10'
prim('ico', 'caverna_domo', loc=(0, 0, 1.2), scale=(3.1, 2.9, 1.25), radius=1, subdivisions=1, color=ROCHA)
prim('ico', 'caverna_topo', loc=(-0.6, 0.4, 2.4), scale=(1.8, 1.6, 0.9), radius=1, subdivisions=1, color=ROCHA2)
prim('ico', 'caverna_lado', loc=(0.8, -1.9, 0.7), scale=(1.4, 1.1, 0.75), radius=1, subdivisions=1, color=ROCHA2)
# entrada em arco: bloco escuro + meio-arco (cilindro achatado) por cima, na face +X
prim('cube', 'caverna_entrada', loc=(2.95, 0, 0.65), scale=(0.3, 1.15, 0.65), color=ESCURO)
prim('cylinder', 'caverna_arco', loc=(2.95, 0, 1.3), rot=(0, math.pi / 2, 0), scale=(0.55, 1.15, 1),
     radius=1, depth=0.6, vertices=10, color=ESCURO)
prim('cube', 'caverna_chao', loc=(2.9, 0, -0.04), scale=(0.5, 1.15, 0.05), color='#2a2630')
for i, (x, y, r) in enumerate([(3.4, 1.6, 0.35), (3.6, -1.5, 0.28), (3.9, 1.1, 0.18), (2.6, -2.3, 0.4)]):
    prim('ico', f'pedrinha_{i}', loc=(x, y, r * 0.6), scale=(1, 0.8, 0.7), radius=r, subdivisions=1, color=ROCHA2)
