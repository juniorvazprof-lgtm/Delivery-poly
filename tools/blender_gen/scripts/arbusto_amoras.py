
VERDE_ESCURO = '#2e6b38'
VERDE_MEDIO  = '#3d7f43'
VERDE_CLARO  = '#4f9a4f'
AMORA        = '#4b1f5c'

raiz = empty('arbusto_amoras_raiz')

# ---------- folhagem: moitas arredondadas ----------
lobulos = [
    ('corpo',      0.00,  0.00, 0.45, 0.45, 1.00, VERDE_MEDIO),
    ('dir',        0.34,  0.10, 0.33, 0.33, 1.00, VERDE_ESCURO),
    ('esq',       -0.35,  0.06, 0.32, 0.32, 1.00, VERDE_ESCURO),
    ('frente',     0.04, -0.34, 0.32, 0.32, 1.00, VERDE_ESCURO),
    ('tras',       0.02,  0.34, 0.32, 0.32, 1.00, VERDE_ESCURO),
    ('diag_fr_d',  0.24, -0.24, 0.52, 0.27, 0.95, VERDE_CLARO),
    ('diag_fr_e', -0.25, -0.22, 0.51, 0.26, 0.95, VERDE_CLARO),
    ('diag_tr_e', -0.22,  0.24, 0.52, 0.25, 0.95, VERDE_CLARO),
    ('diag_tr_d',  0.25,  0.22, 0.53, 0.24, 0.95, VERDE_MEDIO),
    ('topo',       0.00,  0.00, 0.70, 0.30, 0.95, VERDE_CLARO),
]

for nome, x, y, z, r, sz, cor in lobulos:
    prim('ico', 'folha_' + nome,
         loc=(x, y, z), scale=(r, r, r * sz),
         color=cor, parent=raiz, subdivisions=1, radius=1.0)


# ---------- amoras: cachinhos sobre a superficie ----------
def _ponto_na_casca(centro, direcao, raio):
    d = Vector(direcao).normalized()
    return Vector((centro[0] + d.x * raio,
                   centro[1] + d.y * raio,
                   centro[2] + d.z * raio))


cachos = [
    ((0.34,  0.10, 0.33), ( 1.00, -0.80, 0.40), 0.33),
    ((0.04, -0.34, 0.32), ( 0.30, -1.00, 0.25), 0.32),
    ((-0.35, 0.06, 0.32), (-1.00, -0.80, 0.40), 0.32),
    ((0.02,  0.34, 0.32), (-0.30,  1.00, 0.30), 0.32),
    ((0.00,  0.00, 0.70), ( 0.55, -0.55, 0.75), 0.30),
    ((0.24, -0.24, 0.52), ( 0.70, -0.70, 0.45), 0.27),
    ((-0.25, -0.22, 0.51), (-0.65, -0.65, 0.35), 0.26),
    ((0.25,  0.22, 0.53), ( 0.70,  0.70, 0.20), 0.24),
]

contador = 0
for centro, direcao, raio_lobo in cachos:
    d = Vector(direcao).normalized()
    base = _ponto_na_casca(centro, direcao, raio_lobo * 0.95)

    t = d.cross(Vector((0.0, 0.0, 1.0)))
    if t.length < 0.2:
        t = d.cross(Vector((0.0, 1.0, 0.0)))
    t.normalize()
    u = d.cross(t).normalized()

    bolinhas = [
        (base + d * 0.030, 0.078),
        (base + t * 0.080 - u * 0.050 + d * 0.012, 0.056),
        (base - t * 0.070 - u * 0.060 + d * 0.012, 0.056),
    ]

    for pos, r in bolinhas:
        contador += 1
        prim('ico', 'amora_%02d' % contador,
             loc=(pos.x, pos.y, pos.z), scale=(r, r, r),
             color=AMORA, parent=raiz, subdivisions=1, radius=1.0)

