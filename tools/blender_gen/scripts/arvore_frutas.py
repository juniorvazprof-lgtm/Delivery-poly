
# Árvore de frutas — low poly, base em z=0, frente para -Y
TRONCO_H = 1.35
COPA_CZ = 2.15
COPA_R = 1.45
COPA_SZ = 0.85

# ---------- Tronco (cônico, levemente afunilado) ----------
prim(
    'cone', 'arvore_frutas_tronco',
    loc=(0, 0, TRONCO_H * 0.5),
    radius1=0.30, radius2=0.19, depth=TRONCO_H, vertices=7,
    color='#7a4a2b'
)

# ---------- Copa arredondada ----------
prim(
    'ico', 'arvore_frutas_copa',
    loc=(0, 0, COPA_CZ),
    scale=(1.0, 1.0, COPA_SZ),
    radius=COPA_R, subdivisions=2,
    color='#9bd96a'
)

# ---------- Frutinhas na superfície da copa ----------
# (theta em graus, phi em graus a partir do topo)
FRUTAS = [
    (  0,  45), ( 72,  60), (144,  50), (216,  65),
    (288,  55), ( 30, 100), (100, 110), (170,  95),
    (240, 105), (310, 100), ( 60,  20), (180,  25),
    (300,  15), (  0, 140), (140, 145), (250, 150),
]

SUPERFICIE = 0.98  # afunda um pouco a fruta na copa

for i, (th, ph) in enumerate(FRUTAS, 1):
    t = math.radians(th)
    p = math.radians(ph)
    fx = COPA_R * math.sin(p) * math.cos(t) * SUPERFICIE
    fy = COPA_R * math.sin(p) * math.sin(t) * SUPERFICIE
    fz = COPA_CZ + COPA_R * COPA_SZ * math.cos(p) * SUPERFICIE
    prim(
        'ico', 'arvore_frutas_fruta_%02d' % i,
        loc=(fx, fy, fz),
        radius=0.145, subdivisions=1,
        color='#ff2d4b'
    )

