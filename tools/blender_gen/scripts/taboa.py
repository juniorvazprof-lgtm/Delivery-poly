# Claude: touceira de taboa (planta de brejo) com espigas marrons
for i in range(9):
    a = i * 0.7; r = 0.1 + (i % 3) * 0.12; h = 1.1 + (i % 4) * 0.15
    tilt = 0.08 + (i % 3) * 0.05
    d = Vector((math.cos(a) * math.sin(tilt), math.sin(a) * math.sin(tilt), math.cos(tilt)))
    base = Vector((math.cos(a) * r, math.sin(a) * r, 0))
    prim('cone', f'folha_{i}', loc=base + d * (h / 2), rot=d.to_track_quat('Z', 'Y').to_euler(), scale=(1, 0.3, 1), radius1=0.05, radius2=0, depth=h, vertices=4, color='#6f9a4a' if i % 2 else '#7fae55')
    if i % 3 == 0:
        top = base + d * (h + 0.05)
        prim('cylinder', f'haste_{i}', loc=base + d * ((h + 0.3) / 2), rot=d.to_track_quat('Z', 'Y').to_euler(), radius=0.012, depth=h + 0.3, vertices=4, color='#8aa65a')
        prim('cylinder', f'espiga_{i}', loc=top + d * 0.08, rot=d.to_track_quat('Z', 'Y').to_euler(), radius=0.045, depth=0.25, vertices=6, color='#6b4024')
