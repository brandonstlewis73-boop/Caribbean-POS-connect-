import fs from "node:fs";
import assert from "node:assert/strict";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { AnimationMixer, Box3, Vector3 } from "three";
globalThis.ProgressEvent = class {
  constructor(_type, props) {
    Object.assign(this, props);
  }
};
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { fitCharacter } from "../lib/immersive/model-geometry.ts";
const silhouettes = [];
for (const name of ["denim", "linen", "knit", "chef"]) {
  const b = fs.readFileSync(`public/storefront/immersive/people/${name}.glb`),
    len = b.readUInt32LE(12),
    j = JSON.parse(b.subarray(20, 20 + len)),
    offset = 20 + len;
  assert.ok(b.length < 1200000, `${name}: per-character download budget`);
  const materials = j.materials.map((m) => m.name);
  for (const region of ["human_top", "human_trousers", "human_skin"])
    assert.ok(
      materials.some((n) => n.startsWith(region)),
      `${name}: ${region} remains separate`,
    );
  assert.ok(
    j.materials.some((m) => m.pbrMetallicRoughness?.baseColorTexture),
    "authored texture retained",
  );
  j.buffers[0].uri =
    "data:application/octet-stream;base64," +
    b
      .subarray(offset + 8, offset + 8 + b.readUInt32LE(offset))
      .toString("base64");
  for (const m of j.meshes) for (const p of m.primitives) delete p.material;
  j.materials = [];
  j.textures = [];
  j.images = [];
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(JSON.stringify(j), "");
  assert.deepEqual(
    new Set(gltf.animations.map((a) => a.name)),
    new Set([
      "Idle_Loop",
      "Walk_Loop",
      "Jog_Fwd_Loop",
      "PickUp_Table",
      "Idle_Talking_Loop",
    ]),
  );
  const fitted = clone(gltf.scene);
  fitCharacter(fitted, 1.8);
  assert.ok(
    Math.abs(
      new Box3().setFromObject(fitted, true).getSize(new Vector3()).y - 1.8,
    ) < 0.001,
    `${name}: cloned skeleton must fit human scale`,
  );
  const mixer = new AnimationMixer(gltf.scene),
    poses = [];
  for (const clip of gltf.animations) {
    mixer.stopAllAction();
    mixer.clipAction(clip).play();
    for (const fraction of [0.1, 0.5, 0.9]) {
      mixer.setTime(clip.duration * fraction);
      gltf.scene.updateMatrixWorld(true);
      const box = new Box3().setFromObject(gltf.scene, true),
        size = box.getSize(new Vector3());
      assert.ok(
        size.y > 1.45 && size.y < 2.15,
        `${name}/${clip.name}: stable body proportions`,
      );
      assert.ok(
        box.min.y > -0.15,
        `${name}/${clip.name}: feet above floor tolerance`,
      );
      assert.ok(
        size.x < 1.2,
        `${name}/${clip.name}: arms must not remain stuck in bind pose`,
      );
      poses.push(box.max.toArray().join(","));
      if (clip.name === "Idle_Loop" && fraction === 0.5)
        silhouettes.push(size.toArray().join(","));
    }
  }
  assert.ok(
    new Set(poses).size > 10,
    "actual posed vertices change during animations",
  );
}
assert.equal(new Set(silhouettes).size, 4, "four distinct model silhouettes");
console.log(
  "PASS four textured rigs, garment material boundaries, five animations each, relaxed poses, floor bounds and asset budgets",
);
// Keep scanned decoration bounded independently of the texture compression ratio.
for (const [name, triangles, bytes] of [
  ["croissant", 1000, 180000],
  ["carrot_cake", 3500, 320000],
  ["potted_plant_01", 13000, 450000],
  ["potted_plant_low", 4500, 300000],
]) {
  const data = fs.readFileSync(`public/storefront/immersive/decor/${name}.glb`);
  const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)));
  const count = json.meshes.reduce(
    (total, mesh) =>
      total +
      mesh.primitives.reduce(
        (n, primitive) => n + json.accessors[primitive.indices].count / 3,
        0,
      ),
    0,
  );
  assert.ok(count <= triangles, `${name}: geometry budget`);
  assert.ok(data.length <= bytes, `${name}: download budget`);
}
console.log("PASS scanned decoration geometry and download budgets");
