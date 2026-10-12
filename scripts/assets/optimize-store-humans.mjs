import { NodeIO, PropertyType } from "@gltf-transform/core";
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
import fs from "node:fs";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const sourceRoot = process.argv[2],
  target = process.argv[3];
if (!sourceRoot || !target)
  throw Error(
    "Usage: node optimize-store-humans.mjs SOURCE_EXPORT_DIRECTORY OUTPUT_DIRECTORY",
  );
fs.mkdirSync(target, { recursive: true });
for (const [source, name] of [
  ["Male_Adult_12", "denim"],
  ["Male_Adult_08", "linen"],
  ["Female_Adult_14", "knit"],
  ["Chef_Female_01", "chef"],
]) {
  const doc = await io.read(sourceRoot + "/" + source + ".glb");
  // A masked hair material avoids sorting artifacts without hiding fine strands.
  for (const mat of doc.getRoot().listMaterials())
    if (mat.getAlphaMode() === "BLEND")
      mat.setAlphaMode("MASK").setAlphaCutoff(0.35).setDoubleSided(true);
  await doc.transform(
    prune(),
    dedup({
      propertyTypes: [
        PropertyType.ACCESSOR,
        PropertyType.TEXTURE,
        PropertyType.SKIN,
      ],
    }),
    resample(),
    textureCompress({ encoder: sharp, targetFormat: "webp", quality: 85 }),
    prune(),
    dedup({
      propertyTypes: [
        PropertyType.ACCESSOR,
        PropertyType.TEXTURE,
        PropertyType.SKIN,
      ],
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(target + "/" + name + ".glb", doc);
  console.log(
    name,
    fs.statSync(target + "/" + name + ".glb").size,
    doc
      .getRoot()
      .listAnimations()
      .map((a) => a.getName()),
  );
}
