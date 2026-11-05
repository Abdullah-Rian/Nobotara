import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type ReplaceableModelType = 
  | 'rover' 
  | 'descent_stage' 
  | 'retroreflector' 
  | 'plaque' 
  | 'voyager';

export interface ModelLoadResult {
  scene: THREE.Group;
  wheels?: THREE.Mesh[];
  boundingBox: THREE.Box3;
  size: THREE.Vector3;
}

export class CustomModelManager {
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Load a GLTF/GLB model from a URL or public path (e.g. /models/rover.glb)
   */
  public async loadFromUrl(url: string, type: ReplaceableModelType): Promise<ModelLoadResult> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const result = this.processLoadedModel(gltf.scene, type);
          resolve(result);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }

  /**
   * Load a GLTF/GLB file uploaded via drag-and-drop or file input
   */
  public async loadFromFile(file: File, type: ReplaceableModelType): Promise<ModelLoadResult> {
    const objectUrl = URL.createObjectURL(file);
    try {
      const result = await this.loadFromUrl(objectUrl, type);
      return result;
    } finally {
      // Allow memory release after parsing
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    }
  }

  /**
   * Process loaded Blender model:
   * - Enable shadows
   * - Detect wheels if rover
   * - Set proper material properties
   */
  private processLoadedModel(model: THREE.Group, type: ReplaceableModelType): ModelLoadResult {
    const detectedWheels: THREE.Mesh[] = [];

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Ensure materials interact properly with physical environment
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              if ('envMapIntensity' in mat) mat.envMapIntensity = 1.0;
            });
          } else if ('envMapIntensity' in mesh.material) {
            mesh.material.envMapIntensity = 1.0;
          }
        }

        // Detect rover wheels by common Blender naming conventions
        if (type === 'rover') {
          const name = mesh.name.toLowerCase();
          if (
            name.includes('wheel') || 
            name.includes('tire') || 
            name.includes('tyre') ||
            name.includes('roue') ||
            name.includes('rad')
          ) {
            detectedWheels.push(mesh);
          }
        }
      }
    });

    return {
      scene: model,
      wheels: detectedWheels.length > 0 ? detectedWheels : undefined,
      boundingBox: box,
      size
    };
  }
}

export const customModelManager = new CustomModelManager();
