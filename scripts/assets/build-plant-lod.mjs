import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { simplify, meshopt, prune } from "@gltf-transform/functions";
import {
  MeshoptDecoder,
  MeshoptEncoder,
  MeshoptSimplifier,
} from "meshoptimizer";
await Promise.all([
  MeshoptDecoder.ready,
  MeshoptEncoder.ready,
  MeshoptSimplifier.ready,
]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
const [source, target] = process.argv.slice(2);
if (!source || !target)
  throw Error("Usage: node build-plant-lod.mjs INPUT_GLB OUTPUT_GLB");
const doc = await io.read(source);
await doc.transform(
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.2, error: 0.05 }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(target, doc);
