import { BufferAttribute, Color, type BufferGeometry } from "three";
import {
  CLOTH_COLORS,
  TROUSER_COLORS,
  SHOE_COLORS,
  SKIN_COLORS,
  HAIR_COLORS,
  type Avatar,
} from "./avatar";
export type BodyPart = "top" | "trousers" | "shoes" | "skin" | "hair" | "other";
// The licensed rig has five baked palette regions. Classify the immutable source,
// never the previously customized colors, so successive outfits cannot drift.
export function bodyPart(r: number, g: number, b: number): BodyPart {
  if (r > 0.9 && g > 0.9 && b > 0.9) return "other";
  if (g > r * 2 && g > b * 1.2) return "top";
  if (r > g * 1.4 && r > 0.1) return "skin";
  if (b > g * 1.2) return "trousers";
  if (g > r && g > b) return "shoes";
  return "hair";
}
export function dressGeometry(source: BufferGeometry, avatar: Avatar) {
  const geometry = source.clone(),
    color = geometry.getAttribute("color"),
    position = geometry.getAttribute("position"),
    normal = geometry.getAttribute("normal");
  if (!color) return { geometry, garment: null };
  const palettes = {
    top: CLOTH_COLORS,
    trousers: TROUSER_COLORS,
    shoes: SHOE_COLORS,
    skin: SKIN_COLORS,
    hair: HAIR_COLORS,
  };
  const colors = Object.fromEntries(
    Object.entries(palettes).map(([part, choices]) => [
      part,
      new Color(
        choices.find((c) => c.id === avatar[part as keyof Avatar])!.hex,
      ),
    ]),
  ) as Record<Exclude<BodyPart, "other">, Color>;
  const clothed: boolean[] = [];
  for (let i = 0; i < color.count; i++) {
    let part = bodyPart(color.getX(i), color.getY(i), color.getZ(i));
    const x = position.getX(i),
      y = position.getY(i);
    // Extend jacket sleeves across forearms but leave the hands and head exposed.
    if (
      avatar.outfit === "jacket" &&
      part === "skin" &&
      Math.abs(x) > 0.38 &&
      Math.abs(x) < 0.86 &&
      y < 0.74
    )
      part = "top";
    clothed[i] = part === "top";
    if (part === "other") continue;
    const c = colors[part];
    let shade = 1;
    if (part === "top" && position.getZ(i) > 0 && Math.abs(x) < 0.012)
      shade = 0.72;
    if (
      part === "top" &&
      avatar.outfit === "jacket" &&
      Math.abs(x) < 0.1 &&
      y > 0.47 &&
      position.getZ(i) > 0
    ) {
      const inner = new Color("#e4d9bf");
      color.setXYZ(i, inner.r, inner.g, inner.b);
      continue;
    }
    color.setXYZ(i, c.r * shade, c.g * shade, c.b * shade);
  }
  color.needsUpdate = true;
  // Separate skinned cloth shell: keeps original joints/weights and moves with
  // every animation. A small ease allowance lifts it clear of the body surface.
  const triangles: number[] = [],
    bodyTriangles: number[] = [];
  const index = source.index;
  for (let i = 0; i < (index?.count || position.count); i += 3) {
    const a = index ? index.getX(i) : i,
      b = index ? index.getX(i + 1) : i + 1,
      c = index ? index.getX(i + 2) : i + 2;
    if (clothed[a] && clothed[b] && clothed[c]) triangles.push(a, b, c);
    else bodyTriangles.push(a, b, c);
  }
  if (!triangles.length) return { geometry, garment: null };
  const garment = geometry.clone();
  geometry.setIndex(bodyTriangles);
  garment.setIndex(new BufferAttribute(new Uint32Array(triangles), 1));
  const gp = garment.getAttribute("position");
  for (let i = 0; i < gp.count; i++)
    if (clothed[i]) {
      const allowance = avatar.outfit === "jacket" ? 0.026 : 0.014;
      const x = gp.getX(i),
        y = gp.getY(i),
        z = gp.getZ(i);
      // A straight, eased torso silhouette replaces the body's abdominal detail.
      // Keep neck/shoulder and sleeve seams aligned with the original rig.
      if (Math.abs(x) < 0.245 && y > 0.13 && y < 0.51) {
        const envelope = Math.min(1, (y - 0.13) / 0.07, (0.51 - y) / 0.07);
        const depth =
          Math.sqrt(Math.max(0, 1 - (x / 0.27) ** 2)) *
          (avatar.outfit === "jacket" ? 0.185 : 0.165);
        gp.setZ(i, z + (Math.sign(z) * depth - z) * envelope);
      }
      gp.setXYZ(
        i,
        gp.getX(i) + normal.getX(i) * allowance,
        gp.getY(i) + normal.getY(i) * allowance,
        gp.getZ(i) + normal.getZ(i) * allowance,
      );
      // Sewn placket, pocket and cuff/hem edges keep the silhouette readable as fabric.
      const gc = garment.getAttribute("color");
      const edge =
        (Math.abs(x) < 0.014 && z > 0.02) ||
        y < 0.125 ||
        (Math.abs(x) > 0.56 && Math.abs(x) < 0.59);
      const pocket = z > 0.045 && x > 0.095 && x < 0.21 && y > 0.37 && y < 0.46;
      if (edge || pocket) {
        const shade = edge ? 0.58 : 0.83;
        gc.setXYZ(
          i,
          gc.getX(i) * shade,
          gc.getY(i) * shade,
          gc.getZ(i) * shade,
        );
      }
    }
  garment.computeVertexNormals();
  gp.needsUpdate = true;
  garment.computeBoundingSphere();
  return { geometry, garment };
}
