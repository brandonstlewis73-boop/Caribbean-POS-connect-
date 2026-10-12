import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  prune,
  dedup,
  textureCompress,
  meshopt,
  simplify,
  center,
  getBounds,
} from "@gltf-transform/functions";
import sharp from "sharp";
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import fs from "node:fs";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const sourceRoot = process.argv[2],
  out = process.argv[3];
if (!sourceRoot || !out)
  throw Error(
    "Usage: node optimize-store-decor.mjs SOURCE_DIRECTORY OUTPUT_DIRECTORY",
  );
fs.mkdirSync(out, { recursive: true });
for (const [folder, name] of [
  ["pastry", "croissant"],
  ["carrot_cake", "carrot_cake"],
  ["potted_plant_01", "potted_plant_01"],
]) {
  const doc = await io.read(sourceRoot + "/" + folder + "/" + name + ".gltf");
  await doc.transform(
    simplify({
      simplifier: MeshoptSimplifier,
      ratio:
        name === "potted_plant_01" ? 0.025 : name === "carrot_cake" ? 0.2 : 0.4,
      error: 0.01,
    }),
  );
  await doc.transform(
    prune(),
    dedup(),
    center({ pivot: "below" }),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [512, 512],
      quality: 83,
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(out + "/" + name + ".glb", doc);
  console.log(
    name,
    fs.statSync(out + "/" + name + ".glb").size,
    getBounds(doc.getRoot().listScenes()[0]),
  );
}
