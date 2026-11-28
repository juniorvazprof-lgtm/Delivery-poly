"""Exporta heróis e inimigos (paleta do estilo 1) para .glb.
Uso: blender -b --python art/blender/export_models.py -- <saida_dir>"""
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chars
from concepts import STYLES  # noqa: importa só os dados (o script de render roda só no __main__)

PAL = STYLES["vila_amaldicoada"]["pal"]
MAKERS = {"warrior": chars.make_warrior, "archer": chars.make_archer, "tank": chars.make_tank,
          "mage": chars.make_mage, "ghost": chars.make_ghost, "demon": chars.make_demon}
out = sys.argv[sys.argv.index("--") + 1]
os.makedirs(out, exist_ok=True)
for name, fn in MAKERS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    chars._MAT_CACHE.clear()
    root = fn((0, 0, 0), PAL)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, name + ".glb"), use_selection=True,
                              export_apply=True, export_yup=True)
