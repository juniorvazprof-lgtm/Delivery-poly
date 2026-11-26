# Claude: moita baixa de trevos (3 folhinhas redondas cada)
import random
random.seed(4)
for i in range(14):
    x, y = random.uniform(-0.5, 0.5), random.uniform(-0.5, 0.5)
    h = random.uniform(0.1, 0.2)
    prim('cylinder', f'haste_{i}', loc=(x, y, h / 2), radius=0.008, depth=h, vertices=3, color='#3f8a3a')
    for k in range(3):
        a = k * 2.094 + i
        prim('cylinder', f'folha_{i}_{k}', loc=(x + math.cos(a) * 0.04, y + math.sin(a) * 0.04, h), radius=0.04, depth=0.01, vertices=6, color='#4fae4a' if k else '#5cc057')
    if i % 5 == 0:
        prim('ico', f'flor_{i}', loc=(x + 0.05, y, h + 0.06), radius=0.03, subdivisions=1, color='#f4e6f6')
