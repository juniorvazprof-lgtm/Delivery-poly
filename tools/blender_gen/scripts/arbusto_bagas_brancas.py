
# Arbusto delicado verde-azulado com bagas brancas peroladas
palette = ['#7cb8a2', '#69a892', '#8fc9b1', '#5f9c88']

# ---------- folhagem: montinho de icos ----------
blobs = [
    # (x, y, z, raio, escala_z, índice_cor)
    (0.00,  0.00, 0.30, 0.34, 0.92, 0),
    (0.32,  0.03, 0.26, 0.28, 0.86, 1),
    (-0.31, 0.05, 0.26, 0.27, 0.86, 2),
    (0.02,  0.32, 0.25, 0.28, 0.86, 1),
    (-0.05, -0.30, 0.26, 0.27, 0.86, 2),
    (0.26, -0.25, 0.29, 0.24, 0.90, 3),
    (-0.25, 0.23, 0.29, 0.24, 0.90, 3),
    (0.14,  0.11, 0.46, 0.26, 0.92, 2),
    (-0.16, -0.09, 0.45, 0.25, 0.92, 0),
    (0.03, -0.17, 0.50, 0.22, 0.90, 1),
    (-0.07, 0.17, 0.48, 0.21, 0.90, 2),
]

for i, (x, y, z, r, sz, ci) in enumerate(blobs):
    prim('ico', 'foliage_%02d' % i, loc=(x, y, z), scale=(1.0, 1.0, sz),
         radius=r, subdivisions=1, color=palette[ci])


# ---------- raminhos finos ----------
def make_branch(name, base, tip, radius=0.014, color='#7fa48f'):
    b = Vector(base)
    t = Vector(tip)
    d = t - b
    e = d.to_track_quat('Z', 'Y').to_euler()
    prim('cylinder', name,
         loc=((b.x + t.x) * 0.5, (b.y + t.y) * 0.5, (b.z + t.z) * 0.5),
         rot=(e.x, e.y, e.z), radius=radius, depth=d.length + 0.03,
         vertices=5, color=color)


branches = [
    ((0.10,  0.05, 0.50), (0.24,  0.12, 0.78)),
    ((-0.12, 0.02, 0.48), (-0.26, 0.06, 0.74)),
    ((0.02, -0.14, 0.46), (0.06, -0.30, 0.72)),
    ((-0.06, 0.10, 0.52), (-0.12, 0.26, 0.78)),
    ((0.16, -0.08, 0.42), (0.34, -0.20, 0.64)),
]

for i, (b, t) in enumerate(branches):
    make_branch('ramo_%02d' % i, b, t)


# ---------- bagas brancas peroladas (grupinhos nas pontas) ----------
berry_offsets = [
    (0.000, 0.000, 0.050, 0.048),
    (0.055, 0.020, -0.005, 0.042),
    (-0.045, 0.035, 0.015, 0.040),
    (0.005, -0.055, 0.010, 0.044),
]

for i, (b, t) in enumerate(branches):
    for j, (ox, oy, oz, rr) in enumerate(berry_offsets):
        prim('ico', 'baga_%02d_%d' % (i, j),
             loc=(t[0] + ox, t[1] + oy, t[2] + oz),
             radius=rr, subdivisions=1, color='#f4f1ff')


# ---------- grupinhos extra sobre o corpo do arbusto ----------
body_clusters = [
    (0.22, -0.18, 0.44),
    (-0.20, 0.14, 0.42),
]
body_offsets = [
    (0.000, 0.000, 0.000, 0.044),
    (0.050, 0.020, 0.030, 0.038),
    (-0.030, 0.040, -0.020, 0.040),
]

for i, c in enumerate(body_clusters):
    for j, (ox, oy, oz, rr) in enumerate(body_offsets):
        prim('ico', 'baga_corpo_%d_%d' % (i, j),
             loc=(c[0] + ox, c[1] + oy, c[2] + oz),
             radius=rr, subdivisions=1, color='#f4f1ff')

