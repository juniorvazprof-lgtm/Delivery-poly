"""Gera 3 cenários-conceito (estilos visuais) com os 4 heróis e 2 inimigos.

Uso: blender -b --python art/blender/concepts.py -- <saida_dir> [estilo]
"""
import bpy, math, random, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chars

STYLES = {
    # 1) Gótico estilo ARPG clássico: noite, tochas, vila em ruínas
    "vila_amaldicoada": dict(
        ground=(0.10, 0.08, 0.06), ground2=(0.16, 0.12, 0.08), stone=(0.22, 0.20, 0.19),
        wood=(0.18, 0.10, 0.05), roof=(0.12, 0.05, 0.05), foliage=(0.08, 0.10, 0.05),
        world=(0.01, 0.01, 0.015), sun=(0.5, 0.55, 0.8), sun_e=0.4,
        fog=(0.06, 0.05, 0.05), fog_d=0.035, torch=(1.0, 0.45, 0.12), torch_e=180,
        pal=dict(skin=(0.6, 0.42, 0.32), metal=(0.35, 0.35, 0.38), cloth_warrior=(0.45, 0.06, 0.05),
                 cloth_archer=(0.12, 0.22, 0.10), cloth_tank=(0.25, 0.20, 0.15),
                 cloth_mage=(0.18, 0.10, 0.35), accent=(0.75, 0.55, 0.15))),
    # 2) Crepúsculo pintado: mais artístico, laranja/violeta saturados
    "crepusculo_pintado": dict(
        ground=(0.30, 0.16, 0.10), ground2=(0.42, 0.22, 0.12), stone=(0.45, 0.32, 0.30),
        wood=(0.30, 0.14, 0.08), roof=(0.35, 0.10, 0.18), foliage=(0.35, 0.12, 0.25),
        world=(0.9, 0.35, 0.45), sun=(1.0, 0.5, 0.2), sun_e=9.0,
        fog=(0.9, 0.4, 0.5), fog_d=0.0, torch=(1.0, 0.6, 0.3), torch_e=60,
        pal=dict(skin=(0.75, 0.5, 0.38), metal=(0.55, 0.5, 0.55), cloth_warrior=(0.7, 0.15, 0.1),
                 cloth_archer=(0.15, 0.4, 0.35), cloth_tank=(0.45, 0.35, 0.2),
                 cloth_mage=(0.2, 0.15, 0.55), accent=(0.95, 0.75, 0.3))),
    # 3) Cripta espectral: lua fria, cemitério, brilho necromântico verde
    "cripta_espectral": dict(
        ground=(0.05, 0.08, 0.09), ground2=(0.07, 0.11, 0.10), stone=(0.18, 0.22, 0.25),
        wood=(0.10, 0.09, 0.08), roof=(0.08, 0.10, 0.14), foliage=(0.04, 0.10, 0.09),
        world=(0.01, 0.02, 0.04), sun=(0.45, 0.6, 1.0), sun_e=1.2,
        fog=(0.05, 0.12, 0.12), fog_d=0.04, torch=(0.3, 1.0, 0.45), torch_e=150,
        pal=dict(skin=(0.55, 0.45, 0.4), metal=(0.4, 0.45, 0.5), cloth_warrior=(0.35, 0.08, 0.08),
                 cloth_archer=(0.1, 0.2, 0.15), cloth_tank=(0.2, 0.22, 0.25),
                 cloth_mage=(0.12, 0.12, 0.35), accent=(0.6, 0.65, 0.7))),
}


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    chars._MAT_CACHE.clear()


def flat(o, m):
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def ground(s, rnd):
    m1, m2 = chars.mat("g1", s["ground"]), chars.mat("g2", s["ground2"])
    for x in range(-9, 10):
        for y in range(-9, 10):
            h = rnd.uniform(0, 0.05)
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, -0.5 + h / 2))
            o = bpy.context.active_object
            o.scale = (1, 1, 1 + h)
            flat(o, m1 if rnd.random() < 0.6 else m2)
    # caminho de pedras
    ms = chars.mat("path", s["stone"])
    for i in range(-9, 10):
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=rnd.uniform(0.25, 0.4), depth=0.08,
                                            location=(i * 0.9 + rnd.uniform(-.2, .2), rnd.uniform(-.4, .4), 0.08))
        flat(bpy.context.active_object, ms)


def house(loc, rot, s, rnd, ruined=False):
    w, d, h = rnd.uniform(2, 2.8), rnd.uniform(1.8, 2.4), rnd.uniform(1.6, 2.2)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1], h / 2), rotation=(0, 0, rot))
    o = bpy.context.active_object; o.scale = (w, d, h); flat(o, chars.mat("stone", s["stone"]))
    if ruined:
        return
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=max(w, d) * 0.8, depth=1.4,
                                    location=(loc[0], loc[1], h + 0.7), rotation=(0, 0, rot + math.pi / 4))
    o = bpy.context.active_object; o.scale = (w / max(w, d), d / max(w, d), 1); flat(o, chars.mat("roof", s["roof"]))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1], 0.6), rotation=(0, 0, rot))
    o = bpy.context.active_object; o.scale = (0.5, d + 0.02, 1.1); flat(o, chars.mat("wood", s["wood"]))


def tree(loc, s, rnd, dead=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=0.12, depth=1.6, location=(loc[0], loc[1], 0.8))
    flat(bpy.context.active_object, chars.mat("wood", s["wood"]))
    if dead:
        for k in range(3):
            a = rnd.uniform(0, 6.28)
            bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.06, depth=0.9,
                                            location=(loc[0] + math.cos(a) * .25, loc[1] + math.sin(a) * .25, 1.6),
                                            rotation=(math.cos(a) * .8, math.sin(a) * .8, 0))
            flat(bpy.context.active_object, chars.mat("wood", s["wood"]))
        return
    for k, z in enumerate((1.5, 2.1, 2.6)):
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.9 - k * 0.22, depth=0.9, location=(loc[0], loc[1], z))
        flat(bpy.context.active_object, chars.mat("leaf", s["foliage"]))


def gravestone(loc, s, rnd):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1], 0.35),
                                    rotation=(rnd.uniform(-.15, .15), rnd.uniform(-.15, .15), rnd.uniform(-.3, .3)))
    o = bpy.context.active_object; o.scale = (0.45, 0.12, 0.7); flat(o, chars.mat("stone", s["stone"]))


def torch(loc, s):
    bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=0.05, depth=1.4, location=(loc[0], loc[1], 0.7))
    flat(bpy.context.active_object, chars.mat("wood", s["wood"]))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.12, location=(loc[0], loc[1], 1.5))
    flat(bpy.context.active_object, chars.mat("flame", s["torch"], emission=6))
    bpy.ops.object.light_add(type='POINT', location=(loc[0], loc[1], 1.7))
    l = bpy.context.active_object.data; l.color = s["torch"]; l.energy = s["torch_e"]; l.shadow_soft_size = 0.3


def world_fog(s):
    w = bpy.data.worlds.new("w"); bpy.context.scene.world = w; w.use_nodes = True
    nt = w.node_tree
    nt.nodes["Background"].inputs[0].default_value = (*s["world"], 1)
    if not s["fog_d"]:
        return
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.inputs["Color"].default_value = (*s["fog"], 1)
    vol.inputs["Density"].default_value = s["fog_d"]
    nt.links.new(vol.outputs[0], nt.nodes["World Output"].inputs["Volume"])


def build(name, out):
    s = STYLES[name]; rnd = random.Random(7)
    clear()
    sc = bpy.context.scene
    ground(s, rnd)
    world_fog(s)
    # cenário de fundo
    for loc, rot in [((-4.5, 4.5), .3), ((1.5, 6.0), -.2), ((-7.0, -0.5), 1.2), ((5.5, 3.5), .8), ((-2.5, 7.5), .5)]:
        house(loc, rot, s, rnd, ruined=(name == "cripta_espectral" and rnd.random() < .5))
    for _ in range(12):
        x, y = rnd.uniform(-8.5, 8.5), rnd.uniform(-8.5, 8.5)
        if (abs(y) > 2.8 or abs(x) > 6) and not (x > 2 and y < -2):
            tree((x, y), s, rnd, dead=name != "crepusculo_pintado")
    if name == "cripta_espectral":
        for i in range(8):
            gravestone((rnd.uniform(-3, 3), rnd.uniform(2.2, 4)), s, rnd)
    for t in [(-1.8, 1.6), (2.2, -1.6), (0.4, 2.4)]:
        torch(t, s)
    # personagens: heróis à esquerda, inimigos à direita (formação de batalha)
    p = s["pal"]
    heroes = [chars.make_tank((-1.6, 0.4, 0), p), chars.make_warrior((-1.8, -0.9, 0), p),
              chars.make_archer((-3.0, 0.9, 0), p), chars.make_mage((-3.1, -0.5, 0), p)]
    for h in heroes:
        h.rotation_euler.z = math.radians(90)   # olhando +X (para os inimigos)
    demon = chars.make_demon((1.8, -0.3, 0), p); demon.scale = (1.35,) * 3
    ghost = chars.make_ghost((2.0, 1.4, 0.35), p); ghost.scale = (1.1,) * 3
    for e in (demon, ghost):
        e.rotation_euler.z = math.radians(-90)
    # luz principal (lua/sol)
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(50), 0, math.radians(-40)))
    sun = bpy.context.active_object.data; sun.color = s["sun"]; sun.energy = s["sun_e"]; sun.angle = 0.1
    # câmera isométrica
    bpy.ops.object.camera_add(location=(11, -11, 11), rotation=(math.radians(54.7), 0, math.radians(45)))
    cam = bpy.context.active_object; cam.data.type = 'ORTHO'; cam.data.ortho_scale = 11
    cam.location = (9.4, -9.8, 10.9); cam.data.ortho_scale = 9.5
    tgt = bpy.data.objects.new("cam_target", None); sc.collection.objects.link(tgt); tgt.location = (-0.6, 0.2, 0.9)
    c = cam.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    sc.camera = cam
    # render
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48
    sc.cycles.use_denoising = False; sc.cycles.samples = 96
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    try:
        sc.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    sc.render.filepath = os.path.join(out, name + ".png")
    bpy.ops.render.render(write_still=True)


argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out = argv[0] if argv else "/tmp"
for n in (argv[1:] or STYLES):
    build(n, out)
