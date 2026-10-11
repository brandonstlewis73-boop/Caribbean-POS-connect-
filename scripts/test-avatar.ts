import assert from "node:assert/strict";
import fs from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { Mesh, SkinnedMesh } from "three";
import {
  DEFAULT_AVATAR,
  normalizeAvatar,
  readAvatar,
  saveAvatar,
} from "../lib/immersive/avatar";
import { dressGeometry } from "../lib/immersive/wardrobe";
assert.deepEqual(
  normalizeAvatar({ outfit: "evil", top: "javascript:", skin: null }),
  DEFAULT_AVATAR,
);
assert.deepEqual(readAvatar({ getItem: () => "{broken" }), DEFAULT_AVATAR);
assert.equal(
  saveAvatar(
    {
      setItem: () => {
        throw Error("denied");
      },
    },
    DEFAULT_AVATAR,
  ),
  false,
);
let saved = "";
assert.ok(
  saveAvatar(
    {
      setItem: (_key, value) => {
        saved = value;
      },
    },
    { ...DEFAULT_AVATAR, outfit: "jacket", skin: "deep" },
  ),
);
assert.equal(readAvatar({ getItem: () => saved }).outfit, "jacket");
Object.assign(globalThis, {
  ProgressEvent: class {
    constructor(_type: string, props: object) {
      Object.assign(this, props);
    }
  },
});
const b = fs.readFileSync("public/storefront/immersive/shopper.glb"),
  len = b.readUInt32LE(12),
  j = JSON.parse(b.subarray(20, 20 + len).toString()),
  offset = 20 + len;
j.buffers[0].uri =
  "data:application/octet-stream;base64," +
  b
    .subarray(offset + 8, offset + 8 + b.readUInt32LE(offset))
    .toString("base64");
for (const m of j.meshes) for (const p of m.primitives) delete p.material;
j.materials = [];
j.textures = [];
j.images = [];
async function main() {
  const model = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(JSON.stringify(j), "");
  let garments = 0;
  model.scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const original = Array.from(object.geometry.getAttribute("color").array);
    const shirt = dressGeometry(object.geometry, DEFAULT_AVATAR),
      jacket = dressGeometry(object.geometry, {
        ...DEFAULT_AVATAR,
        outfit: "jacket",
        top: "clay",
      });
    assert.deepEqual(
      Array.from(object.geometry.getAttribute("color").array),
      original,
      "cached rig is immutable",
    );
    if (shirt.garment) {
      garments++;
      assert.ok(
        shirt.geometry.index!.count > 0,
        "body remains visible under the outfit",
      );
      assert.equal(
        shirt.geometry.index!.count + shirt.garment.index!.count,
        object.geometry.index!.count,
        "garment replaces only covered body faces",
      );
      assert.ok(object instanceof SkinnedMesh);
      assert.ok(
        jacket.garment!.index!.count > shirt.garment.index!.count,
        "jacket has longer sleeves",
      );
      assert.deepEqual(
        Array.from(shirt.garment.getAttribute("skinWeight").array),
        Array.from(object.geometry.getAttribute("skinWeight").array),
      );
      assert.deepEqual(
        Array.from(shirt.garment.getAttribute("skinIndex").array),
        Array.from(object.geometry.getAttribute("skinIndex").array),
      );
      assert.notDeepEqual(
        Array.from(shirt.geometry.getAttribute("color").array),
        Array.from(jacket.geometry.getAttribute("color").array),
      );
    }
    shirt.geometry.dispose();
    shirt.garment?.dispose();
    jacket.geometry.dispose();
    jacket.garment?.dispose();
  });
  assert.equal(garments, 1);
  console.log(
    "PASS wardrobe validation, persistence/denied storage, source immutability and skinned shirt/jacket coverage",
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
