


import math

GOLD = '#f4c542'
GOLD_DARK = '#e0a93a'
PURPLE = '#a45cff'

# ---- Corpo da caixa ----
prim('cube', 'Caixa_Corpo', loc=(0, 0, 0.28), scale=(0.75, 0.75, 0.56),
     color=PURPLE, size=1)

# ---- Tampa (levemente maior) ----
prim('cube', 'Caixa_Tampa', loc=(0, 0, 0.61), scale=(0.76, 0.76, 0.10),
     color=PURPLE, size=1)

# ---- Fita no sentido Y (frente, topo, trás) ----
prim('cube', 'Fita_Topo_Y', loc=(0, 0, 0.667), scale=(0.10, 0.78, 0.024),
     color=GOLD, size=1)
prim('cube', 'Fita_Frente', loc=(0, -0.374, 0.33), scale=(0.10, 0.03, 0.66),
     color=GOLD, size=1)
prim('cube', 'Fita_Tras', loc=(0, 0.374, 0.33), scale=(0.10, 0.03, 0.66),
     color=GOLD, size=1)

# ---- Fita no sentido X (laterais, topo) ----
prim('cube', 'Fita_Topo_X', loc=(0, 0, 0.675), scale=(0.78, 0.10, 0.036),
     color=GOLD, size=1)
prim('cube', 'Fita_Esq', loc=(-0.374, 0, 0.33), scale=(0.03, 0.10, 0.66),
     color=GOLD, size=1)
prim('cube', 'Fita_Dir', loc=(0.374, 0, 0.33), scale=(0.03, 0.10, 0.66),
     color=GOLD, size=1)

# ---- Laço: duas alças em toro ----
prim('torus', 'Laco_Alca_Esq', loc=(-0.085, 0, 0.76),
     rot=(math.pi / 2, 0, 0.45), scale=(1.0, 1.1, 1.0), color=GOLD,
     major_radius=0.085, minor_radius=0.028,
     major_segments=8, minor_segments=4)

prim('torus', 'Laco_Alca_Dir', loc=(0.085, 0, 0.76),
     rot=(math.pi / 2, 0, -0.45), scale=(1.0, 1.1, 1.0), color=GOLD,
     major_radius=0.085, minor_radius=0.028,
     major_segments=8, minor_segments=4)

# ---- Nó central do laço ----
prim('ico', 'Laco_No', loc=(0, 0, 0.762), scale=(1.0, 1.0, 0.9),
     color=GOLD_DARK, radius=0.058, subdivisions=1)



