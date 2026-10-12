import assert from "node:assert/strict";
import { BufferGeometry, Int16BufferAttribute, Matrix4, Vector3 } from "three";
import { bakeGeometry } from "../lib/immersive/model-geometry";
const source = new BufferGeometry();
source.setAttribute(
  "position",
  new Int16BufferAttribute([-32767, 0, 32767, 32767, 32767, 0], 3, true),
);
source.setAttribute(
  "normal",
  new Int16BufferAttribute([0, 32767, 0, 0, 32767, 0], 3, true),
);
const matrix = new Matrix4().makeScale(2, 3, 4).setPosition(4, 5, 6);
const result = bakeGeometry(source, matrix);
assert.ok(result.getAttribute("position").array instanceof Float32Array);
for (let i = 0; i < 2; i++) {
  const expected = new Vector3()
    .fromBufferAttribute(source.getAttribute("position"), i)
    .applyMatrix4(matrix);
  const actual = new Vector3().fromBufferAttribute(
    result.getAttribute("position"),
    i,
  );
  assert.ok(
    actual.distanceTo(expected) < 0.0001,
    "quantized geometry retains transformed shape",
  );
}
assert.equal(
  source.getAttribute("position").getX(0),
  -1,
  "cached source remains unchanged",
);
assert.equal(result.boundingBox!.max.y, 8);
assert.ok(Number.isFinite(result.boundingSphere!.radius));
result.dispose();
source.dispose();
console.log("PASS quantized geometry transforms, bounds and source ownership");
