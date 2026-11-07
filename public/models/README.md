# Custom 3D Blender Models

NoboTara-71 loads these glTF binary files from this folder on startup. They were exported from `TranquilityBase.blend` with +Y up.

| Game Asset | Target File Path | Description |
| :--- | :--- | :--- |
| **Lunar ground** | `public/models/terrain.glb` | Tranquility Base terrain. Replaces the procedural ground. The rover height is raycast onto this mesh. |
| **Eagle Descent Stage** | `public/models/descent_stage.glb` | Apollo 11 lunar module base, including the commemorative plaque. Sits at the origin. |
| **Laser Retroreflector** | `public/models/retroreflector.glb` | LRRR kept at its Blender location, about `(-2.12, ground, 21.53)`. |
| **Earth** | `public/models/earth.glb` | Earth and atmosphere, about 20 km from the landing site. |
| **Sun** | `public/models/sun.glb` | Visible solar disc opposite Earth. Scene lighting stays a directional light aimed from the same direction. |
| **Footprints** | `public/models/footprints.glb` | Exported astronaut footprints. Not loaded; the trail stays hidden. |
| **Lunar Rover** | `public/models/rover.glb` | Optional player vehicle. Name wheel objects containing `wheel` or `tire` for automatic rolling animation. The procedural rover is used when this file is absent. |
| **Voyager 1** | `public/models/voyager.glb` | Optional interstellar probe for the Phase 4 cinematic outro. |

## Blender Export Settings

1. In Blender, select your model.
2. Go to **File > Export > glTF 2.0 (.glb/.gltf)**.
3. Select **Format: glTF Binary (.glb)**.
4. Under **Transform**, ensure **+Y Up** is checked.
5. Under **Geometry**, check **Apply Modifiers**, **UVs**, **Normals**, and **Materials**.
6. For a prop that should sit on the ground, set the object origin to the bottom of the model. Terrain, Earth, the Sun, and footprints keep the transforms from the Blender file.
7. Save the file with the matching name above into this `public/models/` folder.

The game shows these files from the first frame. The rover, the flag, and Voyager stay built in code when their files are absent.
