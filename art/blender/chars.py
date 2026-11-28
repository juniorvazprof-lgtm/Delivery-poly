import bpy
import math

_MAT_CACHE = {}

def mat(name, color, emission=0.0, alpha=1.0):
    key = (name, tuple(color), emission, alpha)
    if key in _MAT_CACHE:
        return _MAT_CACHE[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    r, g, b = color
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.7
    bsdf.inputs["Metallic"].default_value = 0.0
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (r, g, b, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    elif "Emission" in bsdf.inputs:
        bsdf.inputs["Emission"].default_value = (r, g, b, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        try:
            m.blend_method = 'BLEND'
        except Exception:
            pass
    _MAT_CACHE[key] = m
    return m


def _shade_flat(obj):
    if obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = False


def _apply(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)
    _shade_flat(obj)
    return obj


def _cube(name, size, loc, material):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _apply(o, material)


def _cyl(name, radius, depth, loc, material, verts=8, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return _apply(o, material)


def _cone(name, r1, r2, depth, loc, material, verts=8, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, vertices=verts, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return _apply(o, material)


def _ico(name, radius, loc, material, subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=radius, subdivisions=subdiv, location=loc)
    o = bpy.context.active_object
    o.name = name
    return _apply(o, material)


def _torus(name, major, minor, loc, material, maj_seg=12, min_seg=6, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                      major_segments=maj_seg, minor_segments=min_seg,
                                      location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return _apply(o, material)


def _empty_root(name, location):
    e = bpy.data.objects.new(name, None)
    e.location = location
    e.empty_display_type = 'PLAIN_AXES'
    bpy.context.collection.objects.link(e)
    return e


def _parent(child, parent):
    if child.parent is None:
        child.parent = parent  # coords das peças são locais ao personagem


def _build_body(root, palette):
    skin = mat("skin", palette['skin'])
    cloth = mat("cloth_generic", palette['cloth_tank'])
    parts = []
    parts.append(_ico("head", 0.18, (0, 0, 1.62), skin))
    parts.append(_cyl("torso", 0.22, 0.55, (0, 0, 1.15), cloth, verts=8))
    parts.append(_cyl("hips", 0.20, 0.20, (0, 0, 0.82), cloth, verts=8))
    parts.append(_cyl("leg_l", 0.08, 0.75, (-0.11, 0, 0.38), cloth, verts=6))
    parts.append(_cyl("leg_r", 0.08, 0.75, (0.11, 0, 0.38), cloth, verts=6))
    parts.append(_cyl("arm_l", 0.06, 0.6, (-0.30, 0, 1.20), cloth, verts=6, rot=(0, math.radians(10), 0)))
    parts.append(_cyl("arm_r", 0.06, 0.6, (0.30, 0, 1.20), cloth, verts=6, rot=(0, math.radians(-10), 0)))
    return parts


def make_warrior(location, palette):
    root = _empty_root("Warrior", location)
    metal = mat("metal", palette['metal'])
    cloth = mat("cloth_warrior", palette['cloth_warrior'])
    accent = mat("accent_w", palette['accent'])
    skin = mat("skin", palette['skin'])

    _parent(_ico("head", 0.18, (0, 0, 1.62), skin), root)
    _parent(_cyl("torso", 0.22, 0.55, (0, 0, 1.15), cloth, verts=8), root)
    _parent(_cyl("hips", 0.20, 0.20, (0, 0, 0.82), cloth, verts=8), root)
    _parent(_cyl("leg_l", 0.08, 0.75, (-0.11, 0, 0.38), cloth, verts=6), root)
    _parent(_cyl("leg_r", 0.08, 0.75, (0.11, 0, 0.38), cloth, verts=6), root)
    _parent(_cyl("arm_l", 0.06, 0.6, (-0.30, 0, 1.20), cloth, verts=6, rot=(0, math.radians(10), 0)), root)
    _parent(_cyl("arm_r", 0.06, 0.6, (0.30, 0, 1.20), cloth, verts=6, rot=(0, math.radians(-10), 0)), root)

    _parent(_ico("shoulder_l", 0.10, (-0.30, 0, 1.50), metal), root)
    _parent(_ico("shoulder_r", 0.10, (0.30, 0, 1.50), metal), root)

    _parent(_cube("sword_blade", (0.05, 0.02, 0.9), (0.32, -0.05, 1.10), metal), root)
    _parent(_cube("sword_guard", (0.20, 0.03, 0.03), (0.32, -0.05, 1.55), accent), root)
    _parent(_cube("sword_hilt", (0.04, 0.04, 0.15), (0.32, -0.05, 1.65), cloth), root)

    _parent(_cyl("shield", 0.22, 0.05, (-0.30, -0.10, 1.15), metal, verts=8, rot=(math.radians(90), 0, 0)), root)
    _parent(_ico("shield_boss", 0.06, (-0.30, -0.13, 1.15), accent), root)
    return root


def make_archer(location, palette):
    root = _empty_root("Archer", location)
    skin = mat("skin", palette['skin'])
    cloth = mat("cloth_archer", palette['cloth_archer'])
    metal = mat("metal", palette['metal'])
    accent = mat("accent_a", palette['accent'])

    _parent(_ico("head", 0.17, (0, 0, 1.60), skin), root)
    _parent(_cone("hood", 0.22, 0.03, 0.35, (0, 0.02, 1.75), cloth, verts=8), root)
    _parent(_cyl("torso", 0.20, 0.55, (0, 0, 1.15), cloth, verts=8), root)
    _parent(_cyl("hips", 0.18, 0.18, (0, 0, 0.82), cloth, verts=8), root)
    _parent(_cyl("leg_l", 0.07, 0.75, (-0.10, 0, 0.38), cloth, verts=6), root)
    _parent(_cyl("leg_r", 0.07, 0.75, (0.10, 0, 0.38), cloth, verts=6), root)
    _parent(_cyl("arm_l", 0.05, 0.6, (-0.28, 0, 1.20), cloth, verts=6, rot=(0, math.radians(15), 0)), root)
    _parent(_cyl("arm_r", 0.05, 0.6, (0.28, 0, 1.20), cloth, verts=6, rot=(0, math.radians(-15), 0)), root)

    _parent(_torus("bow", 0.35, 0.025, (-0.35, -0.05, 1.15), accent, maj_seg=12, min_seg=5, rot=(0, math.radians(90), 0)), root)
    _parent(_cyl("bow_string", 0.005, 0.70, (-0.35, -0.05, 1.15), metal, verts=4), root)

    _parent(_cyl("quiver", 0.08, 0.45, (0.28, 0.10, 1.15), cloth, verts=6, rot=(math.radians(20), 0, 0)), root)
    for i in range(3):
        _parent(_cyl("arrow_%d" % i, 0.012, 0.35, (0.24 + i*0.04, 0.12, 1.42), metal, verts=4), root)
    return root


def make_tank(location, palette):
    root = _empty_root("Tank", location)
    skin = mat("skin", palette['skin'])
    cloth = mat("cloth_tank", palette['cloth_tank'])
    metal = mat("metal", palette['metal'])
    accent = mat("accent_t", palette['accent'])

    _parent(_ico("head", 0.17, (0, 0, 1.62), skin), root)
    _parent(_cyl("helm", 0.22, 0.22, (0, 0, 1.75), metal, verts=8), root)
    _parent(_cube("visor", (0.22, 0.05, 0.06), (0, -0.18, 1.60), accent), root)

    _parent(_cube("torso", (0.55, 0.35, 0.60), (0, 0, 1.15), cloth), root)
    _parent(_cube("chest_plate", (0.50, 0.10, 0.45), (0, -0.18, 1.20), metal), root)
    _parent(_cube("hips", (0.45, 0.30, 0.22), (0, 0, 0.78), cloth), root)
    _parent(_cyl("leg_l", 0.11, 0.70, (-0.15, 0, 0.36), cloth, verts=6), root)
    _parent(_cyl("leg_r", 0.11, 0.70, (0.15, 0, 0.36), cloth, verts=6), root)
    _parent(_cube("foot_l", (0.14, 0.22, 0.10), (-0.15, -0.03, 0.05), metal), root)
    _parent(_cube("foot_r", (0.14, 0.22, 0.10), (0.15, -0.03, 0.05), metal), root)
    _parent(_cyl("arm_l", 0.09, 0.55, (-0.36, 0, 1.20), cloth, verts=6), root)
    _parent(_cyl("arm_r", 0.09, 0.55, (0.36, 0, 1.20), cloth, verts=6), root)

    _parent(_ico("shoulder_l", 0.15, (-0.36, 0, 1.48), metal), root)
    _parent(_ico("shoulder_r", 0.15, (0.36, 0, 1.48), metal), root)

    _parent(_cube("tower_shield", (0.55, 0.06, 0.90), (0.36, -0.20, 1.10), metal), root)
    _parent(_cube("tower_emblem", (0.25, 0.04, 0.35), (0.36, -0.24, 1.10), accent), root)
    return root


def make_mage(location, palette):
    root = _empty_root("Mage", location)
    skin = mat("skin", palette['skin'])
    cloth = mat("cloth_mage", palette['cloth_mage'])
    accent = mat("accent_m", palette['accent'])
    metal = mat("metal", palette['metal'])
    crystal = mat("crystal", (0.4, 0.6, 1.0), emission=6.0)

    _parent(_ico("head", 0.17, (0, 0, 1.60), skin), root)
    _parent(_cone("robe", 0.42, 0.10, 1.75, (0, 0, 0.85), cloth, verts=10), root)
    _parent(_cyl("robe_upper", 0.22, 0.55, (0, 0, 1.15), cloth, verts=8), root)
    _parent(_cyl("arm_l", 0.06, 0.55, (-0.28, 0, 1.20), cloth, verts=6, rot=(0, math.radians(12), 0)), root)
    _parent(_cyl("arm_r", 0.06, 0.55, (0.28, 0, 1.20), cloth, verts=6, rot=(0, math.radians(-12), 0)), root)

    _parent(_cone("hat_brim", 0.30, 0.05, 0.10, (0, 0, 1.78), cloth, verts=10), root)
    _parent(_cone("hat_top", 0.20, 0.01, 0.55, (0, 0, 2.05), cloth, verts=10), root)
    _parent(_ico("hat_star", 0.04, (0, -0.03, 1.95), accent), root)

    _parent(_cyl("staff", 0.025, 1.70, (0.34, -0.05, 0.95), metal, verts=6), root)
    _parent(_ico("crystal", 0.09, (0.34, -0.05, 1.90), crystal), root)
    _parent(_cyl("staff_ring", 0.07, 0.03, (0.34, -0.05, 1.80), accent, verts=8), root)
    return root


def make_ghost(location, palette):
    root = _empty_root("Ghost", location)
    ghost_mat = mat("ghost_body", (0.55, 0.75, 0.95), emission=1.5, alpha=0.45)
    eye_mat = mat("ghost_eyes", (0.3, 0.9, 1.0), emission=8.0)
    accent = mat("accent_g", palette['accent'])

    _parent(_cone("body", 0.35, 0.05, 1.30, (0, 0, 1.10), ghost_mat, verts=10), root)
    _parent(_ico("head", 0.22, (0, 0, 1.75), ghost_mat), root)
    _parent(_cone("wisp", 0.18, 0.02, 0.35, (0, 0, 0.40), ghost_mat, verts=8), root)

    _parent(_ico("eye_l", 0.035, (-0.07, -0.19, 1.80), eye_mat), root)
    _parent(_ico("eye_r", 0.035, (0.07, -0.19, 1.80), eye_mat), root)

    _parent(_cyl("arm_l", 0.05, 0.45, (-0.32, 0, 1.35), ghost_mat, verts=6, rot=(0, math.radians(25), 0)), root)
    _parent(_cyl("arm_r", 0.05, 0.45, (0.32, 0, 1.35), ghost_mat, verts=6, rot=(0, math.radians(-25), 0)), root)
    _parent(_ico("chain_link", 0.05, (0, -0.28, 1.45), accent), root)
    return root


def make_demon(location, palette):
    root = _empty_root("Demon", location)
    skin = mat("demon_skin", (0.35, 0.08, 0.08))
    dark = mat("demon_dark", (0.15, 0.03, 0.03))
    horn = mat("demon_horn", (0.20, 0.15, 0.10))
    eye_mat = mat("demon_eyes", (1.0, 0.45, 0.05), emission=8.0)
    claw = mat("demon_claw", (0.85, 0.82, 0.75))

    _parent(_ico("torso", 0.34, (0, 0, 1.15), skin), root)
    _parent(_ico("belly", 0.28, (0, -0.08, 1.02), skin), root)
    _parent(_cyl("hips", 0.26, 0.22, (0, 0, 0.78), dark, verts=8), root)

    _parent(_ico("head", 0.20, (0, 0, 1.65), skin), root)
    _parent(_ico("jaw", 0.14, (0, -0.10, 1.55), dark), root)

    _parent(_cone("horn_l", 0.08, 0.005, 0.35, (-0.14, 0.05, 1.88), horn, verts=6, rot=(math.radians(-20), 0, math.radians(-15))), root)
    _parent(_cone("horn_r", 0.08, 0.005, 0.35, (0.14, 0.05, 1.88), horn, verts=6, rot=(math.radians(-20), 0, math.radians(15))), root)

    _parent(_ico("eye_l", 0.04, (-0.07, -0.17, 1.70), eye_mat), root)
    _parent(_ico("eye_r", 0.04, (0.07, -0.17, 1.70), eye_mat), root)

    _parent(_cyl("thigh_l", 0.10, 0.55, (-0.15, 0, 0.45), skin, verts=6), root)
    _parent(_cyl("thigh_r", 0.10, 0.55, (0.15, 0, 0.45), skin, verts=6), root)
    _parent(_cyl("shin_l", 0.08, 0.30, (-0.15, 0.05, 0.15), skin, verts=6, rot=(math.radians(15), 0, 0)), root)
    _parent(_cyl("shin_r", 0.08, 0.30, (0.15, 0.05, 0.15), skin, verts=6, rot=(math.radians(15), 0, 0)), root)
    _parent(_cube("foot_l", (0.12, 0.22, 0.08), (-0.15, -0.05, 0.04), dark), root)
    _parent(_cube("foot_r", (0.12, 0.22, 0.08), (0.15, -0.05, 0.04), dark), root)

    _parent(_cyl("arm_l", 0.09, 0.70, (-0.38, 0, 1.20), skin, verts=6, rot=(0, math.radians(20), 0)), root)
    _parent(_cyl("arm_r", 0.09, 0.70, (0.38, 0, 1.20), skin, verts=6, rot=(0, math.radians(-20), 0)), root)
    _parent(_ico("hand_l", 0.10, (-0.50, -0.05, 0.88), skin), root)
    _parent(_ico("hand_r", 0.10, (0.50, -0.05, 0.88), skin), root)

    for i, dx in enumerate((-0.05, 0.0, 0.05)):
        _parent(_cone("claw_l_%d" % i, 0.02, 0.001, 0.12, (-0.50 + dx, -0.15, 0.82), claw, verts=4), root)
        _parent(_cone("claw_r_%d" % i, 0.02, 0.001, 0.12, (0.50 + dx, -0.15, 0.82), claw, verts=4), root)
    return root
