
# ---------------- CAPIVARA JOVEM ----------------
BODY_C  = '#b07a4f'   # marrom-caramelo
DARK_C  = '#7a4f33'   # focinho / orelha interna
NOSE_C  = '#3b2416'
LEG_C   = '#a06f45'
EYE_C   = '#101010'
GLINT_C = '#ffffff'

# ---------------- CORPO ----------------
body = prim('sphere', 'body',
            loc=(0, 0, 0.68), scale=(0.42, 0.62, 0.42),
            radius=1.0, segments=10, ring_count=8, color=BODY_C)

# ---------------- CABEÇA (pivô) ----------------
head_pivot = empty('head_pivot', loc=(0, -0.72, 0.98))

head = prim('sphere', 'head',
            loc=(0, 0, 0), scale=(0.32, 0.30, 0.27),
            radius=1.0, segments=10, ring_count=8,
            color=BODY_C, parent=head_pivot)

# focinho grande e quadrado
snout = prim('cube', 'snout',
             loc=(0, -0.24, -0.08), scale=(0.14, 0.11, 0.10),
             color=DARK_C, parent=head_pivot)

# nariz
nose = prim('sphere', 'nose',
            loc=(0, -0.35, -0.04), scale=(0.055, 0.040, 0.035),
            radius=1.0, segments=8, ring_count=6,
            color=NOSE_C, parent=head_pivot)

# olhinhos + brilho
eye_l = prim('sphere', 'eye_l',
             loc=(0.22, -0.24, 0.10), scale=(0.055, 0.055, 0.055),
             radius=1.0, segments=8, ring_count=6,
             color=EYE_C, parent=head_pivot)

eye_r = prim('sphere', 'eye_r',
             loc=(-0.22, -0.24, 0.10), scale=(0.055, 0.055, 0.055),
             radius=1.0, segments=8, ring_count=6,
             color=EYE_C, parent=head_pivot)

glint_l = prim('sphere', 'eye_glint_l',
               loc=(0.235, -0.285, 0.125), scale=(0.020, 0.020, 0.020),
               radius=1.0, segments=6, ring_count=5,
               color=GLINT_C, parent=head_pivot)

glint_r = prim('sphere', 'eye_glint_r',
               loc=(-0.205, -0.285, 0.125), scale=(0.020, 0.020, 0.020),
               radius=1.0, segments=6, ring_count=5,
               color=GLINT_C, parent=head_pivot)

# orelhinhas pequenas e arredondadas
ear_l = prim('sphere', 'ear_l',
             loc=(0.19, 0.02, 0.20), scale=(0.085, 0.060, 0.090),
             radius=1.0, segments=8, ring_count=6,
             color=BODY_C, parent=head_pivot)

ear_r = prim('sphere', 'ear_r',
             loc=(-0.19, 0.02, 0.20), scale=(0.085, 0.060, 0.090),
             radius=1.0, segments=8, ring_count=6,
             color=BODY_C, parent=head_pivot)

ear_in_l = prim('sphere', 'ear_inner_l',
                loc=(0.19, -0.015, 0.20), scale=(0.050, 0.040, 0.055),
                radius=1.0, segments=7, ring_count=5,
                color=DARK_C, parent=head_pivot)

ear_in_r = prim('sphere', 'ear_inner_r',
                loc=(-0.19, -0.015, 0.20), scale=(0.050, 0.040, 0.055),
                radius=1.0, segments=7, ring_count=5,
                color=DARK_C, parent=head_pivot)

# ---------------- PATAS (4 pivôs de quadril) ----------------
hips = [
    ('leg_fl',  0.20, -0.32),   # revisão: quadris dentro do corpo
    ('leg_fr', -0.20, -0.32),
    ('leg_bl',  0.20,  0.34),
    ('leg_br', -0.20,  0.34),
]

for hip_name, hx, hy in hips:
    hip = empty(hip_name, loc=(hx, hy, 0.45))

    prim('cylinder', hip_name + '_mesh',
         loc=(0, 0, -0.2), radius=0.10, depth=0.4, vertices=8,
         color=LEG_C, parent=hip)

    prim('sphere', hip_name + '_foot',
         loc=(0, -0.02, -0.395), scale=(0.10, 0.12, 0.055),
         radius=1.0, segments=8, ring_count=6,
         color=LEG_C, parent=hip)

