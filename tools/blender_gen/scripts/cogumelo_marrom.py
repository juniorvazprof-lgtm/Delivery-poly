
# =========================================================
# Cogumelo marrom low poly
# Chapéu achatado marrom (#9a6a3e) + haste creme
# Base em z = 0, centrado em x = y = 0, frente para -Y
# =========================================================

COR_CHAPEU = '#9a6a3e'
COR_HASte  = '#f4e6cb'
COR_PINTA  = '#f9f0dc'

# ---------- Haste (creme) ----------
# Tronco principal, levemente afunilado para cima
prim('cone', 'Cogumelo_Haste',
     loc=(0, 0, 0.21),
     radius1=0.105, radius2=0.072, depth=0.42,
     vertices=8, color=COR_HASte)

# Pequena base alargada, dá um ar mais fofo e estável
prim('cone', 'Cogumelo_Haste_Base',
     loc=(0, 0, 0.035),
     radius1=0.145, radius2=0.100, depth=0.07,
     vertices=8, color=COR_HASte)

# ---------- Chapéu (marrom, achatado) ----------
# Esfera achatada em Z = domo baixinho e arredondado
prim('sphere', 'Cogumelo_Chapeu',
     loc=(0, 0, 0.47),
     radius=1.0, scale=(0.275, 0.275, 0.18),
     segments=10, ring_count=5,
     color=COR_CHAPEU)

# revisão: cogumelo marrom liso, sem pintas (as pintas são do cogumelo vermelho)
