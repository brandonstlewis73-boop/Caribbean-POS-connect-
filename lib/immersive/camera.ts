import { Box3, Ray, Vector3 } from "three";
import type { Collider } from "./world";
const ray = new Ray(),
  direction = new Vector3(),
  hit = new Vector3();
export function cameraObstacles(fixtures: Collider[]) {
  return fixtures.map((c) =>
    new Box3(
      new Vector3(c.x - c.width / 2, 0, c.z - c.depth / 2),
      new Vector3(c.x + c.width / 2, c.height, c.z + c.depth / 2),
    ).expandByScalar(0.18),
  );
}
export function constrainCamera(
  target: Vector3,
  desired: Vector3,
  boxes: Box3[],
  result: Vector3,
) {
  result.copy(desired);
  result.x = Math.max(-5.65, Math.min(5.65, result.x));
  result.z = Math.max(-6.65, Math.min(6.65, result.z));
  direction.copy(result).sub(target);
  let distance = direction.length();
  ray.set(target, direction.normalize());
  for (const box of boxes) {
    if (box.containsPoint(target)) continue;
    if (ray.intersectBox(box, hit))
      distance = Math.min(
        distance,
        Math.max(0.02, hit.distanceTo(target) - 0.06),
      );
  }
  return result.copy(target).addScaledVector(direction, distance);
}
