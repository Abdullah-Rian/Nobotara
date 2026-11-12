import * as THREE from 'three';

/**
 * Release everything a scene put on the graphics card, then give the WebGL context back.
 * Without this, each mission switch leaves its terrain and textures behind and keeps a
 * context alive. Browsers allow only a handful, and phones fewer.
 */
export function disposeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const seen = new Set<THREE.Material>();
  const freeTextures = (owner: object) => {
    for (const value of Object.values(owner)) {
      if (value instanceof THREE.Texture) value.dispose();
    }
  };
  scene.traverse(node => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    for (const item of Array.isArray(material) ? material : [material]) {
      if (seen.has(item)) continue;
      seen.add(item);
      freeTextures(item);
      item.dispose();
    }
    (node as THREE.DirectionalLight).shadow?.map?.dispose();
  });
  if (scene.environment) scene.environment.dispose();
  if (scene.background instanceof THREE.Texture) scene.background.dispose();
  scene.clear();
  renderer.dispose();
  renderer.forceContextLoss();
}
