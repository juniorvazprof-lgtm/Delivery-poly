


# Melancia low poly — corpo oval + listras meridionais escuras
COR = CORPO = '#2e9a3c'
COR_LISTRA = '#1b6b2a'

# Corpo oval (eixo longo em X), base apoiada em z=0
melancia_corpo = prim('ico', 'Melancia_Corpo',
                      loc=(0.0, 0.0, 0.35),
                      scale=(0.45, 0.35, 0.35),
                      radius=1.0, subdivisions=2,
                      color=COR)

# Listras: anéis finos que passam pelos polos (±X) e abraçam a superfície
NUM_LISTRAS = 4
for i in range(NUM_LISTRAS):
    angulo = math.pi * i / NUM_LISTRAS  # 0°, 45°, 90°, 135°
    prim('torus', 'Melancia_Listra_%d' % (i + 1),
         loc=(0.0, 0.0, 0.35),
         scale=(0.45, 0.35, 0.35),
         rot=(angulo, 0.0, 0.0),
         major_radius=1.0, minor_radius=0.09,
         major_segments=10, minor_segments=4,
         color=COR_LISTRA)



