import {
  Box3,
  Float32BufferAttribute,
  Vector3,
  type BufferGeometry,
  type Matrix4,
  type Object3D,
} from "three";

/** Initialize cloned skeletons before fitting them: stale bone matrices produce tiny bounds. */
export function fitCharacter(scene: Object3D, height: number) {
  scene.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(scene, true);
  const sourceHeight = bounds.getSize(new Vector3()).y;
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0)
    throw new Error("Invalid character bounds");
  const scale = height / sourceHeight;
  scene.scale.multiplyScalar(scale);
  scene.position.y -= bounds.min.y * scale;
  scene.updateMatrixWorld(true);
}

/** Expand quantized attributes before baking transforms; integer writes would clip vertices. */
export function bakeGeometry(source: BufferGeometry, matrix: Matrix4) {
  const geometry = source.clone();
  for (const name of ["position", "normal"]) {
    const attribute = geometry.getAttribute(name);
    if (!attribute) continue;
    const values = new Float32Array(attribute.count * 3);
    for (let i = 0; i < attribute.count; i++)
      values.set(
        [attribute.getX(i), attribute.getY(i), attribute.getZ(i)],
        i * 3,
      );
    geometry.setAttribute(name, new Float32BufferAttribute(values, 3));
  }
  geometry.applyMatrix4(matrix);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
