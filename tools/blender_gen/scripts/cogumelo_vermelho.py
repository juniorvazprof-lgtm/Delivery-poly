
import math

RED   = '#e8262f'
CREAM = '#f4e6cf'
WHITE = '#f7f4ec'

CAP_R   = 0.28          # raio horizontal do chapéu
CAP_SZ  = 0.62          # achatamento vertical
CAP_HH  = CAP_R * CAP_SZ
CAP_TOP = 0.75
CAP_CZ  = CAP_TOP - CAP_HH   # centro do chapéu (0.5764)
STEM_H  = 0.44

# --- haste creme, grossa e levemente cônica ---
prim('cone', 'Stem',
     loc=(0, 0, STEM_H * 0.5),
     radius1=0.13, radius2=0.095, depth=STEM_H, vertices=8,
     color=CREAM)

# --- chapéu vermelho em meia esfera achatada ---
prim('sphere', 'Cap',
     loc=(0, 0, CAP_CZ),
     scale=(1, 1, CAP_SZ),
     radius=CAP_R, segments=10, ring_count=6,
     color=RED)

# --- pintas brancas distribuídas sobre a superfície do chapéu ---
spots = [
    (  0, 22),
    ( 65, 45),
    (140, 28),
    (205, 42),
    (285, 34),
    ( 35, 72),
    (175, 70),
    (265, 76),
]

for i, (theta_deg, phi_deg) in enumerate(spots, 1):
    th = math.radians(theta_deg)
    ph = math.radians(phi_deg)
    sx = CAP_R * math.sin(ph) * math.cos(th)
    sy = CAP_R * math.sin(ph) * math.sin(th)
    sz = CAP_CZ + CAP_HH * math.cos(ph)
    prim('ico', 'Spot_%02d' % i,
         loc=(sx, sy, sz),
         scale=(1, 1, 0.6),
         radius=0.045, subdivisions=1,
         color=WHITE)

