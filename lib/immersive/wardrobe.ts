import { Material, MeshStandardMaterial, MeshLambertMaterial } from "three";
import { TOP_COLORS, TROUSER_COLORS, type Avatar } from "./avatar";
// Clone only materials, preserving authored geometry, UVs, maps and skinning.
// Body/face/hand materials are separate from the garment materials at export.
export function surfaceMaterial(source: Material, low: boolean): Material {
  if (!low || !(source instanceof MeshStandardMaterial)) return source.clone();
  // Preserve authored color/alpha while avoiding normal-map PBR work on small GPUs.
  const material = new MeshLambertMaterial({
    color: source.color,
    map: source.map,
    alphaMap: source.alphaMap,
    alphaTest: source.alphaTest,
    opacity: source.opacity,
    transparent: source.transparent,
    side: source.side,
    vertexColors: source.vertexColors,
    depthWrite: source.depthWrite,
    emissive: source.emissive,
    emissiveMap: source.emissiveMap,
  });
  material.name = source.name;
  return material;
}
export function dressMaterial(
  source: Material,
  avatar: Avatar,
  low = false,
): Material {
  const material = surfaceMaterial(source, low);
  if (
    !(
      material instanceof MeshStandardMaterial ||
      material instanceof MeshLambertMaterial
    )
  )
    return material;
  if (source.name.startsWith("human_top"))
    material.color.set(TOP_COLORS.find((o) => o.id === avatar.top)!.hex);
  else if (source.name.startsWith("human_trousers"))
    material.color.set(
      TROUSER_COLORS.find((o) => o.id === avatar.trousers)!.hex,
    );
  if (material instanceof MeshStandardMaterial) material.envMapIntensity = 0.4;
  return material;
}
