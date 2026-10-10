import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  prune,
  dedup,
  resample,
  textureCompress,
  meshopt,
} from "@gltf-transform/functions";
import sharp from "sharp";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
if (!process.argv[2] || !process.argv[3])
  throw Error(
    "Usage: node optimize-immersive-character.mjs SOURCE.glb OUTPUT.glb",
  );
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const doc = await io.read(process.argv[2]);
const keep = new Set([
  "Idle_Loop",
  "Walk_Loop",
  "Jog_Fwd_Loop",
  "PickUp_Table",
  "Idle_Talking_Loop",
  "Interact",
]);
for (const a of doc.getRoot().listAnimations())
  if (!keep.has(a.getName())) {
    for (const c of a.listChannels()) c.dispose();
    for (const s of a.listSamplers()) s.dispose();
    a.dispose();
  }
// Casual jade shirt, navy trousers and dark shoes, baked vertex colors.
for (const mesh of doc.getRoot().listMeshes())
  if (mesh.getName() === "Sphere.005_Retopology.004")
    for (const primitive of mesh.listPrimitives()) {
      const position = primitive.getAttribute("POSITION"),
        colors = new Float32Array(position.getCount() * 3);
      for (let i = 0; i < position.getCount(); i++) {
        const [x, y] = position.getElement(i, []);
        const c =
          y < 0.12
            ? [0.045, 0.055, 0.048]
            : y < 0.98
              ? [0.045, 0.075, 0.11]
              : y < 1.57 && Math.abs(x) < 0.6
                ? [0.035, 0.22, 0.15]
                : y > 1.75
                  ? [0.035, 0.022, 0.015]
                  : [0.57, 0.32, 0.17];
        colors.set(c, i * 3);
      }
      primitive.setAttribute(
        "COLOR_0",
        doc
          .createAccessor()
          .setType("VEC3")
          .setArray(colors)
          .setBuffer(position.getBuffer()),
      );
      const mat = primitive.getMaterial();
      mat
        .setBaseColorTexture(null)
        .setNormalTexture(null)
        .setMetallicRoughnessTexture(null)
        .setBaseColorFactor([1, 1, 1, 1])
        .setRoughnessFactor(0.9);
    }
await doc.transform(
  prune(),
  dedup(),
  resample(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512] }),
  prune(),
  dedup(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(process.argv[3], doc);
console.log(
  "Retained animations",
  doc
    .getRoot()
    .listAnimations()
    .map((a) => a.getName()),
);
console.log(
  "Materials",
  doc
    .getRoot()
    .listMaterials()
    .map((m) => m.getName()),
);
