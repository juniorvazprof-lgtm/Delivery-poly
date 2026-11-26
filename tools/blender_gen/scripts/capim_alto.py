
import math  # já disponível pelo cabeçalho

GREENS = ['#9BD75C', '#86CC4E', '#AFE074', '#79C246', '#A2D965']

def _rnd(k):
    """pseudo-aleatório determinístico em [0,1)"""
    return abs(math.sin(k * 12.9898) * 43758.5453) % 1.0

# ---- base (pequeno tufo/colo de onde saem as lâminas) ----
prim('cone', 'capim_base',
     loc=(0.0, 0.0, 0.07), rot=(0.0, 0.0, 0.0), scale=(1.0, 1.0, 1.0),
     color='#5E9B3C',
     radius1=0.24, radius2=0.09, depth=0.14, vertices=7)

# ---- lâminas de capim (cones achatados, pontudos, inclinados para fora) ----
COUNT = 13
TWO_PI = 2.0 * math.pi

for i in range(COUNT):
    phi = i * (TWO_PI / COUNT) + 0.35 * _rnd(i + 1.0)          # azimute
    r = 0.09 + 0.24 * _rnd(i * 2.3 + 4.1)                       # distância do centro
    depth = 0.70 + 0.40 * _rnd(i * 3.7 + 9.2)                   # comprimento da lâmina
    tilt = math.radians(7.0 + 19.0 * _rnd(i * 5.1 + 2.7))       # inclinação p/ fora
    w = 0.042 + 0.022 * _rnd(i * 7.3 + 1.9)                     # meia-largura
    color = GREENS[i % len(GREENS)]

    # rot=(tilt, 0, phi + 90°) faz a lâmina inclinar na direção radial (cos phi, sin phi)
    theta = phi + math.pi * 0.5
    h = depth * 0.5
    lean = h * math.sin(tilt)
    loc = ((r + lean) * math.cos(phi),
           (r + lean) * math.sin(phi),
           h * math.cos(tilt))

    prim('cone', 'capim_lamina_%02d' % (i + 1),
         loc=loc, rot=(tilt, 0.0, theta), scale=(1.0, 0.34, 1.0),
         color=color,
         radius1=w, radius2=0.0, depth=depth, vertices=6)

