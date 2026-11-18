import bpy, bmesh, math, sys, mathutils
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, hexcol, rough=0.8):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    r = ((hexcol >> 16) & 255) / 255.0
    g = ((hexcol >> 8) & 255) / 255.0
    b = (hexcol & 255) / 255.0
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    return m

M_SKIN = mat("Skin", 0xE0A878)
M_SHIRT = mat("Shirt", 0xB8262E)
M_SHIRTD = mat("ShirtDark", 0x6E1418)
M_DENIM = mat("Denim", 0x2E5FA8)
M_METAL = mat("Metal", 0xC8C8C8)
M_BOOTS = mat("Boots", 0x5A3A22)
M_STRAW = mat("Straw", 0xE8CF6A)
M_HATBAND = mat("HatBand", 0x5A3A22)
M_GLOW = mat("Glow", 0xFFF2A0)
M_WOOD = mat("Wood", 0x7A4A22)
M_GUN = mat("Gun", 0x2A2A2A)

def cube(name, material, size=(1,1,1), loc=(0,0,0), rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material)
    return ob

def cyl(name, material, verts=12, r=1.0, depth=1.0, loc=(0,0,0), rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(material)
    return ob

def sphere(name, material, r=1.0, loc=(0,0,0), seg=8, ring=6):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=ring)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(material)
    return ob

def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    return ob

def set_origin(ob, loc):
    bpy.context.scene.cursor.location = loc
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# ============ TORSO (waist pivot z=1.45) ============
torso_parts = []
t_body = cube("t_body", M_SHIRT, size=(0.9, 0.55, 0.9), loc=(0,0,1.95))
torso_parts.append(t_body)
t_chest = cube("t_chest", M_SHIRT, size=(1.0, 0.6, 0.45), loc=(0,-0.05,2.35))
torso_parts.append(t_chest)
t_bib = cube("t_bib", M_DENIM, size=(0.55, 0.08, 0.7), loc=(0,-0.32,1.9))
torso_parts.append(t_bib)
t_ovl = cube("t_ovl", M_DENIM, size=(0.92, 0.58, 0.35), loc=(0,0,1.55))
torso_parts.append(t_ovl)
for sx in (-1, 1):
    strap = cube("strap", M_DENIM, size=(0.1, 0.06, 0.9), loc=(sx*0.25, -0.32, 2.15))
    torso_parts.append(strap)
for sx in (-1, 1):
    btn = cyl("btn", M_METAL, verts=8, r=0.05, depth=0.04, loc=(sx*0.25, -0.37, 2.4), rot=(math.pi/2,0,0))
    torso_parts.append(btn)
for sx in (-1,1):
    for i in range(3):
        zb = 1.85 + i*0.25
        chk = cube("chk", M_SHIRTD, size=(0.18, 0.05, 0.18), loc=(sx*0.42, -0.3, zb))
        torso_parts.append(chk)
t_neck = cyl("t_neck", M_SKIN, verts=8, r=0.16, depth=0.3, loc=(0,-0.05,2.75))
torso_parts.append(t_neck)
torso = join(torso_parts, "torso")
set_origin(torso, (0, 0, 1.45))

# ============ HEAD (neck pivot z=2.75) ============
head_parts = []
h_head = sphere("h_head", M_SKIN, r=0.32, loc=(0,-0.05,3.0), seg=10, ring=8)
h_head.scale = (1.0, 1.0, 1.1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
head_parts.append(h_head)
h_jaw = cube("h_jaw", M_SKIN, size=(0.4, 0.35, 0.2), loc=(0,-0.12,2.82))
head_parts.append(h_jaw)
h_nose = sphere("h_nose", M_SKIN, r=0.13, loc=(0,-0.38,2.98), seg=6, ring=5)
head_parts.append(h_nose)
for sx in (-1,1):
    ms = cube("ms", M_SHIRTD, size=(0.18, 0.08, 0.12), loc=(sx*0.12, -0.36, 2.85), rot=(0,0, sx*0.15))
    head_parts.append(ms)
for sx in (-1,1):
    br = cube("br", M_SHIRTD, size=(0.16, 0.06, 0.06), loc=(sx*0.13, -0.34, 3.12), rot=(0,0, sx*-0.35))
    head_parts.append(br)
for sx in (-1,1):
    ey = sphere("ey", M_GLOW, r=0.045, loc=(sx*0.12, -0.35, 3.05), seg=6, ring=4)
    head_parts.append(ey)
h_brim = cyl("h_brim", M_STRAW, verts=12, r=1.1, depth=0.06, loc=(0,-0.05,3.28))
head_parts.append(h_brim)
h_crown1 = cyl("h_crown1", M_STRAW, verts=12, r=0.5, depth=0.3, loc=(0,-0.05,3.45))
head_parts.append(h_crown1)
h_crown2 = sphere("h_crown2", M_STRAW, r=0.45, loc=(0,-0.05,3.55), seg=12, ring=6)
h_crown2.scale = (1.1, 1.1, 0.6)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
head_parts.append(h_crown2)
h_band = cyl("h_band", M_HATBAND, verts=12, r=0.52, depth=0.1, loc=(0,-0.05,3.35))
head_parts.append(h_band)
head = join(head_parts, "head")
set_origin(head, (0, 0, 2.75))

# ============ ARMS (shoulder pivot z=2.55) ============
def make_arm(side):
    parts = []
    sx = side
    ua = cube("ua", M_SHIRT, size=(0.24, 0.55, 0.24), loc=(sx*0.55, -0.28, 2.35), rot=(math.radians(35),0,0))
    parts.append(ua)
    chk = cube("chk_a", M_SHIRTD, size=(0.25, 0.12, 0.12), loc=(sx*0.55, -0.2, 2.42))
    parts.append(chk)
    fa = cube("fa", M_SKIN, size=(0.2, 0.45, 0.2), loc=(sx*0.42, -0.5, 2.1), rot=(math.radians(50),0, sx*math.radians(-10)))
    parts.append(fa)
    hand = cube("hand", M_SKIN, size=(0.28, 0.26, 0.24), loc=(sx*0.32, -0.62, 1.92))
    parts.append(hand)
    return parts

armL_parts = make_arm(1)
armL = join(armL_parts, "armL")
set_origin(armL, (0.55, -0.05, 2.55))

armR_parts = make_arm(-1)
armR = join(armR_parts, "armR")
set_origin(armR, (-0.55, -0.05, 2.55))

# ============ GUN (grip pivot -0.32, -0.72, 1.92) ============
gun_parts = []
g_stock = cube("g_stock", M_WOOD, size=(0.12, 0.35, 0.16), loc=(-0.32, -0.55, 1.9))
gun_parts.append(g_stock)
g_recv = cube("g_recv", M_WOOD, size=(0.14, 0.25, 0.18), loc=(-0.32, -0.82, 1.9))
gun_parts.append(g_recv)
for bx in (-0.06, 0.06):
    b = cyl("barrel", M_GUN, verts=8, r=0.045, depth=0.9, loc=(-0.32+bx, -1.35, 1.92), rot=(math.pi/2,0,0))
    gun_parts.append(b)
for bx in (-0.06, 0.06):
    mz = cyl("muzzle", M_GUN, verts=8, r=0.055, depth=0.06, loc=(-0.32+bx, -1.8, 1.92), rot=(math.pi/2,0,0))
    gun_parts.append(mz)
tg = cube("tg", M_GUN, size=(0.08, 0.06, 0.1), loc=(-0.32, -0.7, 1.79))
gun_parts.append(tg)
fl = cyl("fl", M_METAL, verts=8, r=0.05, depth=0.2, loc=(-0.24, -1.4, 2.02), rot=(math.pi/2,0,0))
gun_parts.append(fl)
flt = cyl("flt", M_GLOW, verts=8, r=0.055, depth=0.04, loc=(-0.24, -1.52, 2.02), rot=(math.pi/2,0,0))
gun_parts.append(flt)
gun = join(gun_parts, "gun")
set_origin(gun, (-0.32, -0.72, 1.9))

# ============ LEGS (hip pivot z=1.4) ============
def make_leg(side):
    parts = []
    sx = side
    th = cube("th", M_DENIM, size=(0.3, 0.3, 0.65), loc=(sx*0.22, 0, 1.05))
    parts.append(th)
    sh = cube("sh", M_DENIM, size=(0.24, 0.26, 0.6), loc=(sx*0.22, -0.02, 0.45))
    parts.append(sh)
    bt = cube("bt", M_BOOTS, size=(0.32, 0.5, 0.22), loc=(sx*0.22, -0.1, 0.11))
    parts.append(bt)
    bt2 = cube("bt2", M_BOOTS, size=(0.34, 0.24, 0.14), loc=(sx*0.22, 0.05, 0.18))
    parts.append(bt2)
    return parts

legL_parts = make_leg(1)
legL = join(legL_parts, "legL")
set_origin(legL, (0.22, 0, 1.4))

legR_parts = make_leg(-1)
legR = join(legR_parts, "legR")
set_origin(legR, (-0.22, 0, 1.4))

# ============ EMPTY ROOT + PARENTING ============
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
farmer = bpy.context.active_object
farmer.name = "Farmer"

bpy.context.view_layer.update()

def parent_keep_world(child, parent):
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()

parent_keep_world(torso, farmer)
parent_keep_world(head, torso)
parent_keep_world(armL, torso)
parent_keep_world(armR, torso)
parent_keep_world(gun, armR)
parent_keep_world(legL, farmer)
parent_keep_world(legR, farmer)

bpy.context.view_layer.update()

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=sys.argv[-1], export_format='GLB', export_apply=True, export_yup=True)
