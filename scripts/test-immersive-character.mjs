import fs from "node:fs";
import assert from "node:assert/strict";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { AnimationMixer, Box3 } from "three";
globalThis.ProgressEvent = class {
  constructor(type, props) {
    Object.assign(this, props);
  }
};
let b = fs.readFileSync("public/storefront/immersive/shopper.glb"),
  len = b.readUInt32LE(12),
  j = JSON.parse(b.subarray(20, 20 + len)),
  offset = 20 + len;
let bin = b.subarray(offset + 8, offset + 8 + b.readUInt32LE(offset));
j.buffers[0].uri =
  "data:application/octet-stream;base64," + bin.toString("base64");
for (const m of j.meshes) for (const p of m.primitives) delete p.material;
j.materials = [];
j.textures = [];
j.images = [];
const gltf = await new GLTFLoader()
  .setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(JSON.stringify(j), "");
const poses = [];
assert.equal(gltf.animations.length, 6);
for (const clip of gltf.animations) {
  const mix = new AnimationMixer(gltf.scene);
  mix.clipAction(clip).play();
  mix.update(0.2);
  gltf.scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(gltf.scene, true);
  assert.ok(box.max.y > 1.5 && box.max.y < 2);
  assert.ok(box.min.y > -0.15);
  poses.push(box.max.toArray().join(","));
  mix.stopAllAction();
}

assert.ok(new Set(poses).size > 4);
assert.ok(b.length < 700000);
console.log(
  "PASS six decoded skinned animation clips, distinct posed geometry, normalized bounds and asset size budget",
);
