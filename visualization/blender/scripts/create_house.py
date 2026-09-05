import bpy
from mathutils import Vector


def cube(name, location, scale, mat, collection=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if collection:
        move_to_collection(obj, collection)
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0), vertices=32, collection=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if collection:
        move_to_collection(obj, collection)
    return obj


def sphere(name, location, radius, mat, collection=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if collection:
        move_to_collection(obj, collection)
    return obj


def pipe_curve(name, points, mat, bevel=0.055, collection=None):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = bevel
    curve.bevel_resolution = 5
    polyline = curve.splines.new("POLY")
    polyline.points.add(len(points) - 1)
    for point, co in zip(polyline.points, points):
        point.co = (co[0], co[1], co[2], 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    if mat:
        curve.materials.append(mat)
    if collection:
        move_to_collection(obj, collection)
    return obj


def gabled_roof(name, center, size, ridge_height, mat, collection=None):
    x, y, z = center
    sx, sy, sz = size
    half_x = sx / 2.0
    half_z = sz / 2.0
    base_y = y
    ridge_y = y + ridge_height
    vertices = [
        (x - half_x, base_y, z - half_z),
        (x + half_x, base_y, z - half_z),
        (x + half_x, base_y, z + half_z),
        (x - half_x, base_y, z + half_z),
        (x - half_x, ridge_y, z),
        (x + half_x, ridge_y, z),
    ]
    faces = [
        (0, 1, 5, 4),
        (3, 4, 5, 2),
        (0, 4, 3),
        (1, 2, 5),
        (0, 3, 2, 1),
    ]
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    if collection:
        move_to_collection(obj, collection)
    return obj


def empty(name, location, collection=None, display_size=0.35):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=location)
    obj = bpy.context.object
    obj.name = name
    obj.empty_display_size = display_size
    if collection:
        move_to_collection(obj, collection)
    return obj


def move_to_collection(obj, collection):
    if obj.name not in collection.objects:
        collection.objects.link(obj)
    for current in list(obj.users_collection):
        if current != collection:
            current.objects.unlink(obj)


def make_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def add_window(name, x, y, z, wall_side, mats, collection):
    if wall_side in ("front", "back"):
        frame = cube(name + "_Frame", (x, y, z), (1.05, 0.08, 0.85), mats["frame"], collection)
        glass = cube(name, (x, y + (0.01 if wall_side == "front" else -0.01), z), (0.82, 0.04, 0.62), mats["glass"], collection)
    else:
        frame = cube(name + "_Frame", (x, y, z), (0.08, 1.05, 0.85), mats["frame"], collection)
        glass = cube(name, (x, y, z), (0.04, 0.82, 0.62), mats["glass"], collection)
    return frame, glass


def create_house_shell(mats):
    house = make_collection("SIGAS_House")
    ground = make_collection("SIGAS_Floor_Ground")
    upper = make_collection("SIGAS_Floor_Upper")
    shell = make_collection("SIGAS_Walls")
    roof = make_collection("SIGAS_Roof")
    garden = make_collection("SIGAS_Garden")

    cube("SIGAS_Garden", (0, -0.04, 0), (15.5, 0.08, 11.5), mats["garden"], garden)
    cube("SIGAS_Driveway", (5.2, 0.01, 2.8), (2.4, 0.04, 4.8), mats["floor"], garden)
    cube("SIGAS_Entry_Path", (0, 0.02, 5.0), (2.0, 0.04, 2.0), mats["floor"], garden)

    cube("SIGAS_Ground_Slab", (0, 0.04, 0), (10.2, 0.12, 7.2), mats["floor"], ground)
    cube("SIGAS_Upper_Slab", (0, 3.05, 0), (10.2, 0.14, 7.2), mats["wood"], upper)
    ground_helper = cube("SIGAS_Floor_Ground_Helper", (0, 1.52, 0), (10.3, 3.0, 7.3), mats["cutaway"], house)
    upper_helper = cube("SIGAS_Floor_Upper_Helper", (0, 4.55, 0), (10.3, 2.85, 7.3), mats["cutaway"], house)
    ground_helper.hide_render = True
    upper_helper.hide_render = True

    cube("SIGAS_FrontWall_Ground", (0, 1.55, 3.6), (10.2, 3.0, 0.14), mats["wall"], shell)
    cube("SIGAS_BackWall_Ground", (0, 1.55, -3.6), (10.2, 3.0, 0.14), mats["wall"], shell)
    cube("SIGAS_LeftWall_Ground", (-5.1, 1.55, 0), (0.14, 3.0, 7.2), mats["wall"], shell)
    cube("SIGAS_RightWall_Ground", (5.1, 1.55, 0), (0.14, 3.0, 7.2), mats["wall"], shell)
    cube("SIGAS_InteriorWall_Service", (1.7, 1.55, -1.25), (0.12, 3.0, 4.65), mats["upper_wall"], shell)
    cube("SIGAS_InteriorWall_Kitchen", (-1.6, 1.55, -0.4), (0.12, 3.0, 6.0), mats["upper_wall"], shell)
    cube("SIGAS_InteriorWall_Bath", (3.45, 1.55, 1.0), (3.2, 3.0, 0.12), mats["upper_wall"], shell)

    cube("SIGAS_FrontWall_Upper", (0, 4.45, 3.6), (10.2, 2.7, 0.14), mats["upper_wall"], shell)
    cube("SIGAS_BackWall_Upper", (0, 4.45, -3.6), (10.2, 2.7, 0.14), mats["upper_wall"], shell)
    cube("SIGAS_LeftWall_Upper", (-5.1, 4.45, 0), (0.14, 2.7, 7.2), mats["upper_wall"], shell)
    cube("SIGAS_RightWall_Upper", (5.1, 4.45, 0), (0.14, 2.7, 7.2), mats["upper_wall"], shell)
    cube("SIGAS_UpperHall_Wall", (0.2, 4.45, 0.2), (0.12, 2.7, 6.3), mats["upper_wall"], shell)
    cube("SIGAS_Bedroom_Divider", (-2.5, 4.45, 0.8), (5.0, 2.7, 0.12), mats["upper_wall"], shell)
    cube("SIGAS_Bathroom_Upper_Wall", (2.6, 4.45, -0.8), (0.12, 2.7, 3.9), mats["upper_wall"], shell)
    cube("SIGAS_Balcony", (0, 3.55, 4.25), (4.2, 0.18, 1.25), mats["wood"], upper)
    cube("SIGAS_Balcony_Rail", (0, 4.0, 4.85), (4.4, 0.7, 0.08), mats["frame"], upper)

    gabled_roof("SIGAS_Roof_Main", (0, 5.82, 0), (11.1, 0.3, 8.2), 1.15, mats["roof"], roof)
    cube("SIGAS_Dormer_Left", (-2.8, 6.18, 3.15), (1.35, 0.85, 1.05), mats["upper_wall"], roof)
    cube("SIGAS_Dormer_Right", (2.8, 6.18, 3.15), (1.35, 0.85, 1.05), mats["upper_wall"], roof)
    gabled_roof("SIGAS_Dormer_Left_Roof", (-2.8, 6.65, 3.15), (1.6, 0.2, 1.25), 0.35, mats["roof"], roof)
    gabled_roof("SIGAS_Dormer_Right_Roof", (2.8, 6.65, 3.15), (1.6, 0.2, 1.25), 0.35, mats["roof"], roof)

    cube("SIGAS_MainDoor", (4.95, 1.1, 2.05), (0.12, 2.2, 1.1), mats["wood"], ground)
    add_window("SIGAS_Window_Kitchen", -3.3, 3.63, 1.75, "front", mats, shell)
    add_window("SIGAS_Window_Living", -0.4, 3.63, 1.8, "front", mats, shell)
    add_window("SIGAS_Window_Technical", 3.3, -3.63, 1.75, "back", mats, shell)
    add_window("SIGAS_Window_Bedroom_1", -3.2, 3.63, 4.75, "front", mats, shell)
    add_window("SIGAS_Window_Bedroom_2", 0.0, 3.63, 4.75, "front", mats, shell)
    add_window("SIGAS_Window_Bedroom_3", 3.1, 3.63, 4.75, "front", mats, shell)

    cube("SIGAS_LivingRoom", (-3.25, 0.08, 1.6), (2.5, 0.08, 2.4), mats["wood"], ground)
    cube("SIGAS_DiningRoom", (-0.2, 0.10, 1.55), (2.0, 0.10, 1.2), mats["wood"], ground)
    cube("SIGAS_Bathroom_1", (3.4, 0.12, 1.5), (1.7, 0.12, 1.7), mats["glass"], ground)
    cube("SIGAS_Bedroom_1", (-3.25, 3.18, -1.7), (2.4, 0.10, 2.8), mats["wood"], upper)
    cube("SIGAS_Bedroom_2", (-2.2, 3.18, 2.1), (2.2, 0.10, 2.0), mats["wood"], upper)
    cube("SIGAS_Bedroom_3", (2.9, 3.18, 1.8), (2.6, 0.10, 2.2), mats["wood"], upper)
    cube("SIGAS_Bathroom_2", (3.4, 3.18, -1.9), (1.8, 0.10, 2.2), mats["glass"], upper)
    cube("SIGAS_UpperHall", (0.9, 3.20, 0.4), (1.6, 0.10, 5.6), mats["floor"], upper)

    return house
