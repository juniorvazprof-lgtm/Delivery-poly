
# Árvore alta e frondosa — low poly
# Base em z=0, frente para -Y, ~3.2 x 3.2 x 4.2 m

# ---------- Tronco (cônico, levemente afunilado) ----------
tronco = prim('cone', 'arvore_tronco',
              loc=(0, 0, 1.0),
              radius1=0.46, radius2=0.28, depth=2.0, vertices=8,
              color='#7a4f2a')

# Base do tronco um pouco mais larga (raízes estilizadas)
base_tronco = prim('cone', 'arvore_tronco_base',
                   loc=(0, 0, 0.18),
                   radius1=0.62, radius2=0.46, depth=0.36, vertices=8,
                   color='#6b4524')

# ---------- Copa: 3 blocos de folhagem em tons diferentes ----------
copa_baixa = prim('ico', 'arvore_copa_baixa',
                  loc=(0, 0, 2.50),
                  scale=(1.0, 1.0, 0.80),
                  radius=1.50, subdivisions=1,
                  rot=(0, 0, 0.35),
                  color='#5fae46')

copa_media = prim('ico', 'arvore_copa_media',
                  loc=(0.0, 0.10, 3.15),
                  scale=(1.0, 1.0, 0.85),
                  radius=1.15, subdivisions=1,
                  rot=(0, 0, 0.90),
                  color='#77c95a')

copa_alta = prim('ico', 'arvore_copa_alta',
                 loc=(-0.05, -0.05, 3.45),
                 scale=(1.0, 1.0, 0.90),
                 radius=0.80, subdivisions=1,
                 rot=(0, 0, 1.40),
                 color='#8ed86a')

# Pequeno tufo lateral para dar volume/fofura
copa_lateral = prim('ico', 'arvore_copa_lateral',
                    loc=(0.92, 0.35, 2.85),
                    scale=(1.0, 0.95, 0.80),
                    radius=0.55, subdivisions=1,
                    rot=(0, 0, 0.60),
                    color='#6ec050')

# ---------- Pivô de animação da árvore ----------
pivo = empty('arvore_pivo', loc=(0, 0, 0))
for ob in (base_tronco, tronco, copa_baixa, copa_lateral, copa_media, copa_alta):
    ob.parent = pivo

