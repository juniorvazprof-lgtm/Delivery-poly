# ---- Rodapé injetado pelo orquestrador: exporta GLB, mede e renderiza prévia ----
bpy.context.view_layer.update()
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
tris, lo, hi = 0, Vector((1e9,) * 3), Vector((-1e9,) * 3)
for o in meshes:
    o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    for v in o.data.vertices:
        w = o.matrix_world @ v.co
        lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
names = sorted(o.name for o in bpy.context.scene.objects)
print('STATS ' + json.dumps({'tris': tris, 'min': list(lo), 'max': list(hi), 'names': names}))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True)
