import bpy, bmesh, math, sys, mathutils
bpy.ops.wm.read_factory_settings(use_empty=True)

def make_mat(name, hexcol):
    r=((hexcol>>16)&255)/255.0; g=((hexcol>>8)&255)/255.0; b=(hexcol&255)/255.0
    m=bpy.data.materials.new(name); m.use_nodes=True
    bsdf=m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value=(r,g,b,1.0)
    bsdf.inputs["Roughness"].default_value=0.8
    return m

MATS={
 'Body':make_mat('Body',0xF5F5F0),
 'Chest':make_mat('Chest',0xFFFFFF),
 'Beak':make_mat('Beak',0xFFA51F),
 'Comb':make_mat('Comb',0xE5383B),
 'Eye':make_mat('Eye',0x151515),
 'EyeShine':make_mat('EyeShine',0xFFFFFF),
 'Leg':make_mat('Leg',0xF29A1F),
}

def new_mesh_obj(name, parent=None):
    me=bpy.data.meshes.new(name); ob=bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    if parent: ob.parent=parent
    return ob

def bm_to_obj(bm, ob):
    bm.to_mesh(ob.data); bm.free(); ob.data.update()

def shade_flat(ob):
    for p in ob.data.polygons: p.use_smooth=False

def set_mats(ob, mats):
    ob.data.materials.clear()
    for m in mats: ob.data.materials.append(m)

def set_origin(ob, point):
    bpy.context.view_layer.update()
    mw=ob.matrix_world.copy()
    inv=mw.inverted()
    lp=inv @ mathutils.Vector(point)
    for v in ob.data.vertices: v.co -= lp
    ob.location = mw @ lp

def join_into(target, others):
    bpy.ops.object.select_all(action='DESELECT')
    for o in others: o.select_set(True)
    target.select_set(True)
    bpy.context.view_layer.objects.active=target
    bpy.ops.object.join()

# Root
root=bpy.data.objects.new("Chicken", None); bpy.context.collection.objects.link(root)

# ---- BODY ----
# scale ~0.50 x 0.60 x 0.46, tilt ~12 deg up toward back
body=new_mesh_obj("body", root)
bm=bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.5)
tilt=math.radians(12)
m_tilt=mathutils.Euler((tilt,0,0)).to_matrix()
for v in bm.verts:
    x,y,z=v.co
    # base ellipsoid
    x*=0.50/0.5
    y*=0.60/0.5
    z*=0.46/0.5
    # slight taper toward tail (rear narrower top)
    t=(y/0.60)
    if t>0:
        x*= (1.0 - 0.10*t)
    v.co.x=x; v.co.y=y; v.co.z=z
    # tilt
    v.co = m_tilt @ v.co
# position so body sits with bottom ~ z=0.30
for v in bm.verts: v.co.z += 0.30 + 0.46
bm_to_obj(bm, body)
set_mats(body,[MATS['Body']])
shade_flat(body)

# Chest pad (front, lighter) - protruding forward out of body surface
chest=new_mesh_obj("chest", body)
bm=bmesh.new()
bmesh.ops.create_uvsphere(bm,u_segments=12,v_segments=8,radius=0.30)
for v in bm.verts:
    v.co.x*=0.90
    v.co.y*=0.55  # flattened in y
    v.co.z*=0.95
    v.co.y += -0.42
    v.co.z += 0.55
bm_to_obj(bm,chest)
set_mats(chest,[MATS['Chest']])
shade_flat(chest)

# ---- HEAD (neck + head + beak + comb + wattle + eyes) ----
head_center_z=1.15
head_y=-0.30
head_radius=0.30
neck_base_z=0.72

head_objs=[]

# Neck: cone from body into head
neck=new_mesh_obj("neck_tmp", None)
bm=bmesh.new()
ret=bmesh.ops.create_cone(bm,cap_ends=True,segments=8,radius1=0.20,radius2=0.16,depth=0.36)
for v in ret['verts']:
    v.co.z += neck_base_z + 0.18
    v.co.y += -0.10
bm_to_obj(bm,neck)
set_mats(neck,[MATS['Body']]); shade_flat(neck)
head_objs.append(neck)

# Head main sphere (big - mascot)
head_main=new_mesh_obj("head_main_tmp", None)
bm=bmesh.new()
bmesh.ops.create_uvsphere(bm,u_segments=12,v_segments=8,radius=head_radius)
for v in bm.verts:
    v.co.x*=0.92; v.co.y*=1.0; v.co.z*=0.95
    v.co.y += head_y
    v.co.z += head_center_z
bm_to_obj(bm,head_main)
set_mats(head_main,[MATS['Body']]); shade_flat(head_main)
head_objs.append(head_main)

# Beak cone
def add_beak_cone(r1,r2,depth,loc):
    ob=new_mesh_obj("beak_tmp", None)
    bm=bmesh.new()
    ret=bmesh.ops.create_cone(bm,cap_ends=True,segments=4,radius1=r1,radius2=r2,depth=depth)
    m=mathutils.Euler((math.radians(-90),0,0)).to_matrix()
    for v in ret['verts']:
        v.co=m@v.co
        v.co.x += loc[0]; v.co.y += loc[1]; v.co.z += loc[2]
    bm_to_obj(bm,ob)
    set_mats(ob,[MATS['Beak']]); shade_flat(ob)
    return ob

beak_u=add_beak_cone(0.05,0.010,0.20,(0, head_y-0.28, head_center_z-0.02))
head_objs.append(beak_u)
beak_l=add_beak_cone(0.034,0.007,0.11,(0, head_y-0.24, head_center_z-0.10))
head_objs.append(beak_l)

# Comb: 3 lobes on top
for i,(dy,dz,r) in enumerate([(-0.04,0.24,0.08),(0.04,0.28,0.11),(-0.12,0.24,0.08)]):
    ob=new_mesh_obj("comb_tmp", None)
    bm=bmesh.new()
    ret=bmesh.ops.create_uvsphere(bm,u_segments=8,v_segments=5,radius=r)
    for v in ret['verts']:
        v.co.x*=0.55
        v.co.z*=1.2
        v.co.y += head_y+dy
        v.co.z += head_center_z+dz
    bm_to_obj(bm,ob)
    set_mats(ob,[MATS['Comb']]); shade_flat(ob)
    head_objs.append(ob)

# Wattle
for dx in (-0.055,0.055):
    ob=new_mesh_obj("wattle_tmp", None)
    bm=bmesh.new()
    ret=bmesh.ops.create_uvsphere(bm,u_segments=6,v_segments=4,radius=0.055)
    for v in ret['verts']:
        v.co.x*=0.8; v.co.y*=0.8; v.co.z*=1.5
        v.co.x+=dx; v.co.y+=head_y-0.18; v.co.z+=head_center_z-0.24
    bm_to_obj(bm,ob)
    set_mats(ob,[MATS['Comb']]); shade_flat(ob)
    head_objs.append(ob)

# Eyes
for sx in (-1,1):
    ang=math.radians(35)
    ex = sx*0.22
    ey = head_y - math.cos(ang)*0.24
    ez = head_center_z + 0.05
    eo=new_mesh_obj("eye_tmp", None)
    bm=bmesh.new()
    bmesh.ops.create_uvsphere(bm,u_segments=8,v_segments=6,radius=0.09)
    for v in bm.verts:
        v.co.x+=ex; v.co.y+=ey; v.co.z+=ez
    bm_to_obj(bm,eo)
    set_mats(eo,[MATS['Eye']]); shade_flat(eo)
    head_objs.append(eo)
    so=new_mesh_obj("shine_tmp", None)
    bm=bmesh.new()
    bmesh.ops.create_uvsphere(bm,u_segments=6,v_segments=4,radius=0.026)
    for v in bm.verts:
        v.co.x += ex + (-0.025 if sx>0 else 0.025)
        v.co.y += ey - 0.055
        v.co.z += ez + 0.04
    bm_to_obj(bm,so)
    set_mats(so,[MATS['EyeShine']]); shade_flat(so)
    head_objs.append(so)

# Join head parts into 'head'
head=head_objs[0]; head.name="head"
join_into(head, head_objs[1:])
head.name="head"
set_origin(head,(0, -0.02, neck_base_z))
head.parent=body

# ---- WINGS: on side surface of body, x=±0.50 ----
def make_wing(name, side, parent):
    ob=new_mesh_obj(name, None)
    bm=bmesh.new()
    bmesh.ops.create_uvsphere(bm,u_segments=10,v_segments=6,radius=0.22)
    for v in bm.verts:
        v.co.x*=0.10   # thin
        v.co.y*=1.2
        v.co.z*=0.85
    # feather tips
    for i,dy in enumerate([0.10,0.20,0.30]):
        ret=bmesh.ops.create_cone(bm,cap_ends=True,segments=4,radius1=0.05,radius2=0.008,depth=0.16)
        m=mathutils.Euler((math.radians(-75),0,0)).to_matrix()
        for v in ret['verts']:
            v.co=m@v.co
            v.co.x*=0.4
            v.co.y+=dy+0.04
            v.co.z+=0.03*i-0.03
    bm_to_obj(bm,ob)
    set_mats(ob,[MATS['Body']]); shade_flat(ob)
    if side<0:
        for v in ob.data.vertices: v.co.x*=-1
    # place on side surface, slightly tilted outward
    shoulder=(side*0.50, 0.0, 0.78)
    tilt_out=math.radians(side*12)
    m_rot=mathutils.Euler((0, tilt_out, 0)).to_matrix()
    for v in ob.data.vertices:
        v.co = m_rot @ v.co
        v.co.x+=shoulder[0]; v.co.y+=shoulder[1]; v.co.z+=shoulder[2]
    set_origin(ob, shoulder)
    ob.parent=parent
    return ob

wingL=make_wing("wingL", 1, body)
wingR=make_wing("wingR", -1, body)

# ---- TAIL: 5 large flat teardrop feathers in vertical fan ----
tail=new_mesh_obj("tail", None)
bm=bmesh.new()
base=(0, 0.45, 0.75)
# (angle_deg_elev, side_x, length_scale)
feathers=[
    (35, 0.12, 0.50),
    (48, 0.06, 0.55),
    (60, 0.00, 0.58),
    (48, -0.06, 0.55),
    (35, -0.12, 0.50),
]
for ang_deg, sx, length in feathers:
    ret=bmesh.ops.create_uvsphere(bm,u_segments=8,v_segments=5,radius=0.5)
    m_rot=mathutils.Euler((math.radians(90-ang_deg), 0, 0)).to_matrix()
    for v in ret['verts']:
        x,y,z=v.co
        # teardrop: taper top, pointy tip along +z
        # map unit sphere -> teardrop shape: width 0.16, thickness 0.04, length 0.55
        # first scale so long axis = length, wide = 0.16, thin = 0.04
        x *= 0.16
        y *= 0.04
        z *= length
        # teardrop taper: shrink x,y toward tip (z>0)
        t = (z/length)  # -1..1 roughly (z ranges from -length*0.5 to +length*0.5 after scale? sphere r=0.5 so z in -0.5..0.5, scaled -> -length/2..+length/2)
        # recompute normalized
        zn = z / (length*0.5)  # -1..1
        if zn > 0:
            taper = 1.0 - 0.75*(zn**1.5)
            x *= taper
            y *= taper
            # push tip forward (elongate point) 
            z += (zn**2)*0.12*length
        else:
            # rounded bottom slightly wider
            x *= 1.0 + 0.15*(-zn)
        v.co.x=x; v.co.y=y; v.co.z=z
        v.co = m_rot @ v.co
        v.co.x += base[0] + sx
        v.co.y += base[1]
        v.co.z += base[2]
bm_to_obj(bm,tail)
set_mats(tail,[MATS['Body']]); shade_flat(tail)
set_origin(tail, base)
tail.parent=body

# ---- LEGS: shin 0.28 visible below body (body bottom ~0.30), bigger feet ----
def make_leg(name, side):
    ob=new_mesh_obj(name, None)
    bm=bmesh.new()
    shin_len=0.28
    # shin
    ret=bmesh.ops.create_cone(bm,cap_ends=True,segments=6,radius1=0.05,radius2=0.042,depth=shin_len)
    for v in ret['verts']:
        v.co.z += shin_len/2
    # toes (bigger)
    ankle_z=0.02
    toes=[(-0.10,-0.20),(0.0,-0.23),(0.10,-0.20),(0.0,0.14)]
    for tx,ty in toes:
        ret=bmesh.ops.create_cone(bm,cap_ends=True,segments=4,radius1=0.038,radius2=0.02,depth=0.20)
        m=mathutils.Euler((math.radians(90),0,0)).to_matrix()
        for v in ret['verts']:
            v.co.z*=0.5
            v.co=m@v.co
            v.co.x+=tx*0.6
            v.co.y+=ty*0.6
            v.co.z+=ankle_z
    bm_to_obj(bm,ob)
    set_mats(ob,[MATS['Leg']]); shade_flat(ob)
    if side<0:
        for v in ob.data.vertices: v.co.x*=-1
    hip=(side*0.18, 0.05, shin_len)  # top of shin at z=shin_len; will be moved under body
    for v in ob.data.vertices:
        v.co.x+=hip[0]; v.co.y+=hip[1]
    set_origin(ob,hip)
    ob.parent=root
    return ob

legL=make_leg("legL", 1)
legR=make_leg("legR", -1)

# ---- APPLY TRANSFORMS on meshes ----
bpy.ops.object.select_all(action='DESELECT')
for ob in bpy.data.objects:
    if ob.type=='MESH':
        ob.select_set(True)
        bpy.context.view_layer.objects.active=ob
if bpy.context.selected_objects:
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True, properties=False)

# ---- EXPORT ----
glb_path=sys.argv[-1]
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_apply=True, export_yup=True)
