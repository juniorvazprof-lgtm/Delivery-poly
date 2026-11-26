
# --- helpers locais (apenas funções novas, sem redefinir prim/empty/mat) ---

def _stone(name, xy, sc, color, subs, seed, lump, top, bottom, rot=(0.0, 0.0, 0.0)):
    """Cria uma pedra low poly: ico deformado, topo achatado (assento) e base plana em z=0."""
    ob = prim('ico', name,
              loc=(xy[0], xy[1], -bottom * sc[2]),
              scale=sc, rot=rot, color=color,
              radius=1.0, subdivisions=subs)
    for v in ob.data.vertices:
        x, y, z = v.co
        # deslocamento radial determinístico -> forma irregular/orgânica
        n = (math.sin(x * 3.3 + seed) * math.cos(y * 2.7 - seed * 1.3)
             + 0.55 * math.sin(z * 4.1 + seed * 2.2) * math.cos(x * 2.4 + seed * 0.7)
             + 0.35 * math.sin((x + y) * 5.3 + seed * 3.1))
        f = 1.0 + lump * n
        # achata topo (bom para sentar) e base (assenta no chão)
        v.co = (x * f, y * f, min(top, max(bottom, z * f)))
    ob.data.update()
    return ob


# --- pedra principal: grande, lisa, achatada no topo para sentar ---
pedra_grande = _stone('Pedra_Grande', (-0.30, 0.00), (1.10, 1.05, 0.90), '#9a9aa6',
                      subs=2, seed=1.7, lump=0.10, top=0.72, bottom=-0.72)

# --- pedra menor ao lado ---
pedra_media = _stone('Pedra_Media', (1.02, -0.40), (0.42, 0.38, 0.40), '#a4a4b0',
                     subs=2, seed=4.3, lump=0.14, top=0.75, bottom=-0.70,
                     rot=(0.0, 0.0, 0.70))

# --- seixos de apoio (detalhe fofo) ---
seixo_a = _stone('Seixo_A', (0.52, 0.78), (0.24, 0.21, 0.18), '#9a9aa6',
                 subs=1, seed=2.9, lump=0.16, top=0.80, bottom=-0.70,
                 rot=(0.0, 0.0, 0.90))
seixo_b = _stone('Seixo_B', (-1.28, -0.86), (0.18, 0.17, 0.14), '#8e8e9b',
                 subs=1, seed=5.6, lump=0.16, top=0.80, bottom=-0.70,
                 rot=(0.0, 0.0, 1.60))

