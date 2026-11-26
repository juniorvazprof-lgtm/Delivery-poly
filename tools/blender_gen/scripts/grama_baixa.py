# Claude: tapete de grama baixa
import random
random.seed(7)
for i in range(22):
    x, y = random.uniform(-0.6, 0.6), random.uniform(-0.6, 0.6); h = random.uniform(0.18, 0.32)
    prim('cone', f'folha_{i}', loc=(x, y, h / 2), rot=(random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(0, 3)), scale=(1, 0.4, 1),
         radius1=0.03, radius2=0, depth=h, vertices=4, color=random.choice(['#5fa648', '#6cb850', '#559a40']))
