# ---- Cabeçalho injetado pelo orquestrador (helpers estáveis para o DeepSeek usar) ----
import bpy, math, sys, json
from mathutils import Vector
ARGS = sys.argv[sys.argv.index('--') + 1:]
OUT, PREVIEW = ARGS[0], ARGS[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
_mats = {}
def _lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def mat(hexcol):
    h = hexcol.lstrip('#').lower()
    if h in _mats: return _mats[h]
    r, g, b = [_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)]
    m = bpy.data.materials.new('c_' + h); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (r, g, b, 1); bsdf.inputs['Roughness'].default_value = 1.0
    m.diffuse_color = (r, g, b, 1)
    _mats[h] = m; return m
def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(e)
    e.parent = parent; e.location = loc; return e
_OPS = {'cube': 'primitive_cube_add', 'sphere': 'primitive_uv_sphere_add', 'ico': 'primitive_ico_sphere_add',
        'cylinder': 'primitive_cylinder_add', 'cone': 'primitive_cone_add', 'torus': 'primitive_torus_add'}
def prim(kind, name, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), color='#888888', parent=None, **kw):
    getattr(bpy.ops.mesh, _OPS[kind])(**kw)
    o = bpy.context.active_object; o.name = name
    o.parent = parent
    o.location = loc; o.rotation_euler = rot; o.scale = scale
    o.data.materials.append(mat(color))
    for p in o.data.polygons: p.use_smooth = False
    return o
# ---- fim do cabeçalho; abaixo, o código gerado pelo DeepSeek ----
