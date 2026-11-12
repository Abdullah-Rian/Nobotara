"""
Builds public/models/retroreflector.glb: the Apollo 11 Lunar Laser Ranging Retroreflector (LRRR).

Run (needs Blender):
  /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/build-retroreflector.py -- public/models/retroreflector.glb

What it models (the real array: 100 fused-silica corner cubes in a 10 x 10 aluminium panel,
about 46 cm square, tilted to face Earth on a small stand):
  - the panel frame, with 100 round cups
  - 100 corner cubes, each three square faces meeting at a rear point, seen as the familiar "Y"
  - a base plate, two side gussets that hold the tilt, a Sun compass (gnomon on a ring), a bubble level
The panel faces -X (toward Earth in the game) and tilts up 20 degrees.
Units are metres, base at z = 0. The root empty keeps the old file's place on the Moon so the game's
markers, laser aim and camera framing still line up.
"""
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'retroreflector.glb'

bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- materials ----------
def material(name, color, metallic, roughness, emission=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = 1.0
    return m

ALU = material('LRRRAluminum', (0.64, 0.64, 0.62), 0.30, 0.45)
GLASS = material('LRRRSilica', (0.34, 0.47, 0.53), 0.0, 0.06, emission=(0.012, 0.022, 0.028))
DARK = material('LRRRDark', (0.07, 0.07, 0.08), 0.5, 0.5)

TILT = math.radians(20)
PANEL = 0.46          # panel side
FRAME_T = 0.04        # panel thickness
HC = 0.22             # height of the panel centre above the base
BASE_X, BASE_Y, BASE_T = 0.54, 0.50, 0.012

def box(name, size, loc=(0, 0, 0), mat=ALU, bevel=0.0015):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, affect='EDGES')
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.data.materials.append(mat)
    return obj

def cylinder(name, radius, depth, loc, mat, segments=24):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=depth)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.data.materials.append(mat)
    return obj

parts_alu, parts_glass, parts_dark = [], [], []

# ---------- base plate ----------
parts_alu.append(box('Base', (BASE_X, BASE_Y, BASE_T), (0, 0, BASE_T / 2), ALU, 0.003))

# ---------- tilted panel frame ----------
tilt = Matrix.Rotation(-TILT, 4, 'Y')            # normal tips toward -X
panel_origin = Vector((0, 0, HC))
def to_world(local):
    return panel_origin + tilt @ Vector(local)

frame = box('Frame', (PANEL, PANEL, FRAME_T), (0, 0, 0), ALU, 0.003)

# 100 round cups, 10 x 10
PITCH = 0.0415
CUP_R = 0.0195
cutter_bm = bmesh.new()
cell_centres = []
for i in range(10):
    for j in range(10):
        cx = (i - 4.5) * PITCH
        cy = (j - 4.5) * PITCH
        cell_centres.append((cx, cy))
        res = bmesh.ops.create_cone(cutter_bm, cap_ends=True, segments=18, radius1=CUP_R, radius2=CUP_R, depth=0.034)
        bmesh.ops.translate(cutter_bm, verts=res['verts'], vec=(cx, cy, FRAME_T / 2 - 0.017 + 0.002))
cutter_mesh = bpy.data.meshes.new('Cutters')
cutter_bm.to_mesh(cutter_mesh); cutter_bm.free()
cutters = bpy.data.objects.new('Cutters', cutter_mesh)
bpy.context.collection.objects.link(cutters)

bpy.context.view_layer.objects.active = frame
mod = frame.modifiers.new('cups', 'BOOLEAN')
mod.operation = 'DIFFERENCE'
mod.object = cutters
mod.solver = 'EXACT'
bpy.ops.object.modifier_apply(modifier='cups')
bpy.data.objects.remove(cutters, do_unlink=True)

# corner cubes: three rhombi meeting at the rear apex. Front hexagon corners alternate in depth.
d = 0.0128
r = d * math.sqrt(2)
top = FRAME_T / 2 - 0.003
cube_bm = bmesh.new()
for (cx, cy) in cell_centres:
    apex = cube_bm.verts.new((cx, cy, top - 2 * d))
    P = [cube_bm.verts.new((cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)), top - d)) for a in (90, 210, 330)]
    M = [cube_bm.verts.new((cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)), top)) for a in (150, 270, 30)]
    # rhombus i: apex, P[i], M[i], P[i+1]  (M[i] lies between P[i] and P[i+1])
    for k in range(3):
        cube_bm.faces.new((apex, P[(k + 1) % 3], M[k], P[k]))
for f in cube_bm.faces:
    f.smooth = False
bmesh.ops.recalc_face_normals(cube_bm, faces=list(cube_bm.faces))
cube_mesh = bpy.data.meshes.new('Cubes')
cube_bm.to_mesh(cube_mesh); cube_bm.free()
cubes = bpy.data.objects.new('Cubes', cube_mesh)
bpy.context.collection.objects.link(cubes)
cubes.data.materials.append(GLASS)

for obj in (frame, cubes):
    obj.matrix_world = Matrix.Translation(panel_origin) @ tilt
bpy.context.view_layer.update()
parts_alu.append(frame)
parts_glass.append(cubes)

# ---------- side gussets: triangles that hold the tilt ----------
def under_z(x):
    # height of the panel underside at world x (plane through the panel centre, below by half the thickness)
    return HC + x * math.tan(TILT) - (FRAME_T / 2) / math.cos(TILT)

def gusset(y):
    x0, x1 = -0.20, 0.20
    z0 = BASE_T
    bm = bmesh.new()
    pts = [(x0, z0), (x1, z0), (x1, under_z(x1) + 0.004), (x0, under_z(x0) + 0.004)]
    t = 0.007
    ring = []
    for (x, z) in pts:
        ring.append((bm.verts.new((x, y - t / 2, z)), bm.verts.new((x, y + t / 2, z))))
    for k in range(4):
        a, b = ring[k], ring[(k + 1) % 4]
        bm.faces.new((a[0], b[0], b[1], a[1]))
    bm.faces.new([p[0] for p in ring][::-1])
    bm.faces.new([p[1] for p in ring])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    mesh = bpy.data.meshes.new('Gusset')
    bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new('Gusset', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(ALU)
    return obj

parts_alu.append(gusset(-0.19))
parts_alu.append(gusset(0.19))

# ---------- Sun compass (ring and gnomon) and bubble level on the base ----------
parts_dark.append(cylinder('CompassRing', 0.034, 0.005, (-0.205, 0.17, BASE_T + 0.0025), DARK))
parts_alu.append(cylinder('Gnomon', 0.0035, 0.07, (-0.205, 0.17, BASE_T + 0.005 + 0.035), ALU, 10))
parts_dark.append(cylinder('LevelBase', 0.016, 0.006, (-0.205, -0.17, BASE_T + 0.003), DARK))
parts_glass.append(cylinder('LevelBubble', 0.011, 0.003, (-0.205, -0.17, BASE_T + 0.0065), GLASS))

# ---------- join per material, parent to a root that keeps the old file's place ----------
def join(parts, name, mat):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = name
    return obj

mesh_alu = join(parts_alu, 'LaserRetroreflectorMesh', ALU)
mesh_glass = join(parts_glass, 'LaserRetroreflectorMesh_1', GLASS)
mesh_dark = join(parts_dark, 'LaserRetroreflectorMesh_2', DARK)

# Place the root where the old model sat. glTF (x, y, z) = Blender (x, -y, z) with Y up: (-2.1226, 0.1237, 21.5296).
root = bpy.data.objects.new('LaserRetroreflector', None)
bpy.context.collection.objects.link(root)
root.location = (-2.1226344, -21.5295792, 0.1237311)
for o in (mesh_alu, mesh_glass, mesh_dark):
    o.parent = root

bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', export_yup=True, export_apply=True,
    export_materials='EXPORT', export_cameras=False, export_lights=False,
)
print('wrote', out)
