


BODY_BLUE  = '#2f7dff'
WING_BLUE  = '#1a4fb3'
BEAK_ORANGE = '#ff9e2c'
EYE_BLACK  = '#111111'

# ---------------------------------------------------------------- corpo
# Esfera achatada: 0.60 x 0.52 x 0.35 m, base apoiada em z = 0
prim('sphere', 'body',
     loc=(0.0, 0.0, 0.175), scale=(0.30, 0.26, 0.175),
     radius=1.0, segments=8, ring_count=6,
     color=BODY_BLUE)

# ---------------------------------------------------------------- bico
# Cone fino apontando para -Y (frente)
prim('cone', 'beak',
     loc=(0.0, -0.27, 0.185), rot=(math.pi / 2.0, 0.0, 0.0),
     radius1=0.045, radius2=0.0, depth=0.07, vertices=6,
     color=BEAK_ORANGE)

# ---------------------------------------------------------------- olhos
prim('sphere', 'eye_l',
     loc=(0.11, -0.22, 0.245), scale=(0.035, 0.035, 0.035),
     radius=1.0, segments=6, ring_count=4,
     color=EYE_BLACK)

prim('sphere', 'eye_r',
     loc=(-0.11, -0.22, 0.245), scale=(0.035, 0.035, 0.035),
     radius=1.0, segments=6, ring_count=4,
     color=EYE_BLACK)

# ---------------------------------------------------------------- asas
# Placas finas presas nas laterais do corpo (asa esquerda em +X)
prim('cube', 'wing_l',
     loc=(0.28, 0.01, 0.19), rot=(0.0, -0.35, 0.25),
     scale=(0.10, 0.16, 0.025),
     color=WING_BLUE)

prim('cube', 'wing_r',
     loc=(-0.28, 0.01, 0.19), rot=(0.0, 0.35, -0.25),
     scale=(0.10, 0.16, 0.025),
     color=WING_BLUE)

# ---------------------------------------------------------------- cauda
prim('cone', 'tail',
     loc=(0.0, 0.26, 0.19), rot=(-math.pi / 2.0, 0.0, 0.0),
     radius1=0.05, radius2=0.0, depth=0.08, vertices=6,
     color=WING_BLUE)



