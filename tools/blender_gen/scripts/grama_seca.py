# Claude: tufo de grama seca amarelada, lâminas abertas para fora
for i in range(12):
    a = i * 0.524; tilt = 0.45 + (i % 3) * 0.15; h = 0.5 + (i % 4) * 0.05
    d = Vector((math.cos(a) * math.sin(tilt), math.sin(a) * math.sin(tilt), math.cos(tilt)))
    base = Vector((math.cos(a) * 0.08, math.sin(a) * 0.08, 0))
    prim('cone', f'lamina_{i}', loc=base + d * (h / 2), rot=d.to_track_quat('Z', 'Y').to_euler(), scale=(1, 0.35, 1),
         radius1=0.035, radius2=0, depth=h, vertices=4, color='#d6b85a' if i % 2 else '#c4a24a')
