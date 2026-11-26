


# ---------------------------------------------------------------
# ABRIGO "LEAN-TO"  (low poly fofo)  ~2.8 x 2.2 x 1.8 m
# frente = -Y (aberto) | fundo = +Y (telhado desce até o chão)
# ---------------------------------------------------------------

WOOD_DARK = '#6E4626'
WOOD      = '#8A5A34'
WOOD_LITE = '#A87445'

# plano do telhado: cumeeira (frente, alta) -> chão (fundo)
RIDGE_Y, RIDGE_Z = -1.00, 1.70
BACK_Y,  BACK_Z  =  1.10, 0.08
DY = BACK_Y - RIDGE_Y          # 2.10
DZ = RIDGE_Z - BACK_Z          # 1.62
ROOF_TILT = math.atan2(DZ, DY)
ROOF_LEN  = math.hypot(DY, DZ)
NORMAL    = (0.0, math.sin(ROOF_TILT), math.cos(ROOF_TILT))
BRANCH_ROT = (-(math.pi * 0.5 + ROOF_TILT), 0.0, 0.0)
PANEL_ROT  = (-ROOF_TILT, 0.0, 0.0)


def box(name, loc, dims, rot=(0.0, 0.0, 0.0), color='#ffffff'):
    """cubo com dimensões reais (o prim 'cube' padrão tem lado 2)."""
    return prim('cube', name, loc=loc,
                scale=(dims[0] * 0.5, dims[1] * 0.5, dims[2] * 0.5),
                rot=rot, color=color)


def roof_point(x, t, lift=0.09):
    """ponto sobre o plano do telhado. t=0 cumeeira, t=1 chão do fundo."""
    return (x,
            RIDGE_Y + DY * t + NORMAL[1] * lift,
            RIDGE_Z - DZ * t + NORMAL[2] * lift)


# ---------------- estrutura de madeira ----------------
# dois troncos em pé na frente
prim('cylinder', 'poste_frente_esq', loc=(-1.02, -0.95, 0.80),
     radius=0.10, depth=1.60, vertices=7, color=WOOD)
prim('cylinder', 'poste_frente_dir', loc=(1.02, -0.95, 0.80),
     radius=0.10, depth=1.60, vertices=7, color=WOOD)

# viga horizontal apoiada nos dois postes
prim('cylinder', 'viga_cumeeira', loc=(0.0, -0.95, 1.70),
     radius=0.10, depth=2.35, vertices=7,
     rot=(0.0, math.pi * 0.5, 0.0), color=WOOD_DARK)

# galhos que descem da viga até o chão atrás
for i, gx in enumerate((-1.15, -0.575, 0.0, 0.575, 1.15)):
    prim('cylinder', 'galho_telhado_%d' % i, loc=(gx, 0.05, 0.89),
         radius=0.045, depth=ROOF_LEN, vertices=6,
         rot=BRANCH_ROT, color=WOOD_DARK)

# travessa entre os postes (detalhe)
prim('cylinder', 'travessa_frente', loc=(0.0, -0.95, 0.55),
     radius=0.035, depth=1.85, vertices=6,
     rot=(0.0, math.pi * 0.5, 0.0), color=WOOD_LITE)

# ---------------- folhas largas do telhado ----------------
GREENS = ('#7FC45E', '#6DB34F', '#8FD46E', '#5FA845')
for i, px in enumerate((-1.02, -0.34, 0.34, 1.02)):
    sinal = 1.0 if i % 2 == 0 else -1.0
    box('folha_telhado_%d' % i, roof_point(px, 0.5),
        (0.74, ROOF_LEN + 0.10, 0.07),
        rot=(-ROOF_TILT, 0.02 * sinal, 0.035 * sinal),
        color=GREENS[i])

# folhinhas coloridas caídas sobre o telhado
ACENTOS = ((-0.88, 0.28, '#E8C24A'),
           ( 0.52, 0.52, '#D98B3E'),
           ( 1.02, 0.15, '#E8C24A'))
for i, (ax, at, acol) in enumerate(ACENTOS):
    sinal = 1.0 if i % 2 == 0 else -1.0
    box('folha_colorida_%d' % i, roof_point(ax, at, 0.13),
        (0.30, 0.36, 0.05),
        rot=(-ROOF_TILT + 0.10 * sinal, 0.0, 0.5 * sinal),
        color=acol)

# ---------------- forro de folhas secas no chão ----------------
prim('ico', 'monte_folhas_secas', loc=(0.0, 0.40, 0.16),
     radius=1.0, subdivisions=1,
     scale=(0.85, 0.62, 0.16), color='#C9A155')

SECAS = (((-0.30, 0.30, 0.30), 0.45),
         (( 0.35, 0.45, 0.29), -0.60),
         (( 0.05, 0.62, 0.30), 0.20),
         ((-0.50, 0.55, 0.27), -0.35))
for i, ((lx, ly, lz), ang) in enumerate(SECAS):
    cor = '#D9B85E' if i % 2 == 0 else '#B89040'
    box('folha_seca_%d' % i, (lx, ly, lz), (0.34, 0.26, 0.04),
        rot=(0.12, -0.10, ang), color=cor)



