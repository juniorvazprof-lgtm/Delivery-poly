


# ---------------------------------------------------------------
# FONTE NATURAL DE BEBER  (low poly / estilizada)
# base em z=0, frente para -Y, ~1.8 x 1.8 x 1.3 m
# ---------------------------------------------------------------

COR_AGUA    = '#6fd6ff'
COR_BAMBU   = '#7cb342'
CORES_PEDRA = ['#c9c5bb', '#aeaaa2', '#d4d0c6', '#a8a49c']

# ---------- base maciça da bacia (piso de pedra) ----------
prim('cylinder', 'Bacia_Base',
     loc=(0, 0, 0.20), radius=0.55, depth=0.40, vertices=10,
     color='#b8b4ab')

# ---------- anel de pedras empilhadas (2 fiadas) ----------
for i in range(8):
    a = math.radians(i * 45 + 22.5)
    prim('ico', 'Bacia_Pedra_Baixa_%d' % (i + 1),
         loc=(0.58 * math.cos(a), 0.58 * math.sin(a), 0.20),
         radius=1.0, subdivisions=1,
         scale=(0.22, 0.21, 0.22),
         rot=(0, 0, a),
         color=CORES_PEDRA[i % 4])

for i in range(8):
    a = math.radians(i * 45)
    prim('ico', 'Bacia_Pedra_Alta_%d' % (i + 1),
         loc=(0.57 * math.cos(a), 0.57 * math.sin(a), 0.40),
         radius=1.0, subdivisions=1,
         scale=(0.20, 0.19, 0.15),
         rot=(0, 0, a),
         color=CORES_PEDRA[(i + 2) % 4])

# ---------- água dentro da bacia ----------
prim('cylinder', 'Bacia_Agua',
     loc=(0, 0, 0.45), radius=0.42, depth=0.10, vertices=10,
     color=COR_AGUA)

# ---------- pedra alta atrás (+Y) ----------
prim('ico', 'Pedra_Traseira_Principal',
     loc=(0, 0.80, 0.62), radius=1.0, subdivisions=1,
     scale=(0.34, 0.32, 0.62),
     color='#b0aca3')

prim('ico', 'Pedra_Traseira_Direita',
     loc=(0.44, 0.66, 0.24), radius=1.0, subdivisions=1,
     scale=(0.22, 0.20, 0.24),
     color='#c2beb5')

prim('ico', 'Pedra_Traseira_Esquerda',
     loc=(-0.40, 0.70, 0.28), radius=1.0, subdivisions=1,
     scale=(0.20, 0.19, 0.28),
     color='#b6b2a9')

# ---------- bica de bambu inclinada sobre a bacia ----------
prim('cylinder', 'Bica_Bambu',
     loc=(0, 0.50, 0.95), radius=0.07, depth=0.85, vertices=8,
     rot=(math.radians(102), 0, 0),
     color=COR_BAMBU)

# pequeno nó de bambu junto à pedra
prim('cylinder', 'Bica_Bambu_No',
     loc=(0, 0.70, 0.99), radius=0.085, depth=0.09, vertices=8,
     rot=(math.radians(102), 0, 0),
     color='#8fc75a')

# ---------- filete de água caindo ----------
prim('cylinder', 'Filete_Agua',
     loc=(0.0, 0.084, 0.68), radius=0.022, depth=0.38, vertices=6,
     color=COR_AGUA)

# ---------- pedrinhas soltas no chão ----------
pedrinhas = [
    ('Pedrinha_Frente_Dir',  (0.78, -0.42, 0.07), (0.12, 0.11, 0.09)),
    ('Pedrinha_Frente_Esq',  (-0.72, -0.50, 0.06), (0.10, 0.09, 0.08)),
    ('Pedrinha_Lateral_Esq', (-0.80, 0.28, 0.07), (0.11, 0.10, 0.09)),
]
for nome, pos, tam in pedrinhas:
    prim('ico', nome, loc=pos, radius=1.0, subdivisions=1,
         scale=tam, color='#cdc9bf')



