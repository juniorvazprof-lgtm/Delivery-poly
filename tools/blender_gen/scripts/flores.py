


import math

# ---------------------------------------------------------------
# Canteiro de flores "flores" - low poly fofo
# Base 2.0 x 2.0 m, altura total ~0.54 m
# Orcamento de triangulos: ~1044 (limite 1200)
# ---------------------------------------------------------------

SOIL_TOP = 0.0          # topo da terra/grama
PETAL_COUNT = 5
HEAD_RING = 0.055        # distancia do centro da flor ate a petala

# revisão: sem placa de terra; as flores nascem direto do gramado

# --- flores: (x, y, altura_da_haste, cor_petala, cor_miolo) ----
flores = [
    (-0.60, -0.55, 0.30, '#F49AC2', '#FFE066'),   # rosa
    (-0.05, -0.68, 0.26, '#F7D154', '#F0A94B'),   # amarelo
    ( 0.58, -0.52, 0.34, '#B79CE8', '#FFE066'),   # lilas
    (-0.72,  0.02, 0.28, '#F79A5B', '#FFE066'),   # laranja
    ( 0.00, -0.10, 0.36, '#8FC9EE', '#FFE066'),   # azul claro
    ( 0.70,  0.05, 0.31, '#F49AC2', '#FFE066'),   # rosa
    (-0.55,  0.55, 0.27, '#F7D154', '#F0A94B'),   # amarelo
    ( 0.05,  0.62, 0.33, '#B79CE8', '#FFE066'),   # lilas
    ( 0.60,  0.55, 0.29, '#F79A5B', '#FFE066'),   # laranja
    (-0.20,  0.25, 0.25, '#8FC9EE', '#FFE066'),   # azul claro
]

for i, (fx, fy, fh, cor_petala, cor_miolo) in enumerate(flores):
    nome = 'Flor_%02d' % (i + 1)
    topo_haste = SOIL_TOP + fh
    z_cabeca = topo_haste + 0.02

    # haste fina verde (cylinder 5 vertices = 16 tris)
    prim('cylinder', nome + '_Haste',
         loc=(fx, fy, SOIL_TOP + fh * 0.5),
         radius=0.014, depth=fh, vertices=5, color='#5A9E52')

    # petalas (cones de 4 vertices = 12 tris cada)
    ang0 = i * 0.63
    for p in range(PETAL_COUNT):
        ang = ang0 + p * (2.0 * math.pi / PETAL_COUNT)
        px = fx + HEAD_RING * math.cos(ang)
        py = fy + HEAD_RING * math.sin(ang)
        prim('cone', '%s_Petala_%d' % (nome, p + 1),
             loc=(px, py, z_cabeca),
             scale=(0.45, 1.0, 1.0),
             rot=(0.0, math.pi / 2.0, ang),
             radius1=0.05, radius2=0.015, depth=0.10,
             vertices=4, color=cor_petala)

    # miolo (ico subdiv 1 = 20 tris)
    prim('ico', nome + '_Miolo',
         loc=(fx, fy, z_cabeca + 0.012),
         scale=(1.0, 1.0, 0.8),
         radius=0.032, subdivisions=1, color=cor_miolo)

    # folha em algumas flores (cone 4 vertices = 12 tris)
    if i % 2 == 0:
        ang_f = i * 1.1 + 0.6
        incl = 0.45                       # inclinacao para cima
        z_folha = SOIL_TOP + fh * 0.40
        dx = math.cos(ang_f) * math.cos(incl)
        dy = math.sin(ang_f) * math.cos(incl)
        prim('cone', nome + '_Folha',
             loc=(fx + 0.045 * dx, fy + 0.045 * dy, z_folha),
             rot=(0.0, math.pi / 2.0 - incl, ang_f),
             radius1=0.035, radius2=0.005, depth=0.09,
             vertices=4, color='#6FBF63')



