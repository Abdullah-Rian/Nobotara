# Custom 3D Blender Models

You can replace any of the procedural 3D models in **NoboTara-71: Mission 01 — Apollo 11** by placing your exported Blender `.glb` files into this directory:

| Game Asset | Target File Path | Description |
| :--- | :--- | :--- |
| **Lunar Rover** | `public/models/rover.glb` | Player vehicle. Name wheel objects containing `wheel` or `tire` for automatic rolling animation. |
| **Eagle Descent Stage** | `public/models/descent_stage.glb` | Apollo 11 lunar module base. Positioned at `(0, 0, 0)` on the lunar surface. |
| **Laser Retroreflector** | `public/models/retroreflector.glb` | 100-prism fused silica array placed at `(14, 0, -8)` aimed toward Earth. |
| **Voyager 1** | `public/models/voyager.glb` | Interstellar probe for the Phase 4 cinematic outro. |

## Blender Export Settings

1. In Blender, select your model.
2. Go to **File > Export > glTF 2.0 (.glb/.gltf)**.
3. Select **Format: glTF Binary (.glb)**.
4. Under **Transform**, ensure **+Y Up** is checked.
5. Under **Geometry**, check **Apply Modifiers**, **UVs**, **Normals**, and **Materials**.
6. Set the object origin (pivot point) to the bottom-center of the model so it sits flush on the lunar regolith ground.
7. Save the file with the matching name above into this `public/models/` folder.

The game will automatically detect and load your models on launch with automatic shadow casting and physical environment reflections!
