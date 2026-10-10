import type { Product, Settings } from "../types";

export type Point = { x: number; z: number };
export type Collider = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
};
export type WorldConfig = {
  name: string;
  accent: string;
  wood: string;
  wall: string;
  light: number;
  layout: string;
  fixtures: Collider[];
  spawn: Point;
  checkout: Point;
};
export const ROOM = { halfWidth: 6, halfDepth: 7, height: 4.3 };
export const PAGE_SIZE = 12;
export function worldConfig(settings: Settings): WorldConfig {
  const theme = settings.storefront_3d_theme;
  const gallery = settings.storefront_3d_layout === "gallery";
  return {
    name: settings.business_name || "Your store",
    accent:
      theme === "modern-retail"
        ? "#273744"
        : theme === "beauty"
          ? "#895d6a"
          : "#275e4e",
    wood: theme === "modern-retail" ? "#8f795e" : "#a9794f",
    wall: "#f0e4cf",
    light: settings.storefront_3d_lighting === "evening" ? 0.7 : 1,
    layout: settings.storefront_3d_layout || "shelves",
    fixtures: [
      { x: -5.25, z: -1, width: 1.05, depth: 8, height: 2.3 },
      { x: 5.25, z: -1, width: 1.05, depth: 8, height: 2.3 },
      { x: -2.5, z: -5.5, width: 4.8, depth: 1.15, height: 1.05 },
      ...(gallery
        ? []
        : [{ x: 0, z: -0.9, width: 2.3, depth: 3.6, height: 1.05 }]),
    ],
    spawn: { x: 2.4, z: 3.3 },
    checkout: { x: -2.5, z: -4.1 },
  };
}
export type Placement = {
  product: Product;
  x: number;
  z: number;
  y: number;
  rotation: number;
};
export function productPlacements(
  products: Product[],
  page: number,
): Placement[] {
  return products
    .filter((p) => p.active !== false)
    .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    .map((product, i) => ({
      product,
      x: i < 6 ? -4.64 : 4.64,
      z: -4.25 + (i % 6) * 1.3,
      y: 1.32,
      rotation: i < 6 ? Math.PI / 2 : -Math.PI / 2,
    }));
}
export type Body = Point & {
  vx: number;
  vz: number;
  yaw: number;
  speed: number;
};
export const PLAYER_RADIUS = 0.3;
export function canOccupy(
  point: Point,
  colliders: Collider[],
  radius = PLAYER_RADIUS,
) {
  if (
    Math.abs(point.x) > ROOM.halfWidth - radius ||
    Math.abs(point.z) > ROOM.halfDepth - radius
  )
    return false;
  return !colliders.some((c) => {
    const dx =
      point.x -
      Math.max(c.x - c.width / 2, Math.min(point.x, c.x + c.width / 2));
    const dz =
      point.z -
      Math.max(c.z - c.depth / 2, Math.min(point.z, c.z + c.depth / 2));
    return dx * dx + dz * dz < radius * radius;
  });
}
export function turnTowards(current: number, target: number, alpha: number) {
  return (
    current +
    Math.atan2(Math.sin(target - current), Math.cos(target - current)) * alpha
  );
}
// Small bounded substeps prevent tunnelling and diagonal wall sticking after frame stalls.
export function stepBody(
  body: Body,
  input: Point,
  running: boolean,
  cameraYaw: number,
  delta: number,
  colliders: Collider[],
): Body {
  const dt = Math.min(Math.max(delta, 0), 0.08),
    length = Math.hypot(input.x, input.z);
  const magnitude = Math.min(1, length),
    x = length ? input.x / length : 0,
    z = length ? input.z / length : 0;
  const speed = (running ? 3.7 : 2.15) * magnitude;
  const tx = (x * Math.cos(cameraYaw) + z * Math.sin(cameraYaw)) * speed;
  const tz = (-x * Math.sin(cameraYaw) + z * Math.cos(cameraYaw)) * speed;
  const smoothing = 1 - Math.exp(-(length > 0.03 ? 9 : 14) * dt);
  const next = {
    ...body,
    vx: body.vx + (tx - body.vx) * smoothing,
    vz: body.vz + (tz - body.vz) * smoothing,
  };
  const steps = Math.max(
    1,
    Math.ceil((Math.hypot(next.vx, next.vz) * dt) / 0.07),
  );
  for (let i = 0; i < steps; i++) {
    const px = { x: next.x + (next.vx * dt) / steps, z: next.z };
    if (canOccupy(px, colliders)) next.x = px.x;
    else next.vx = 0;
    const pz = { x: next.x, z: next.z + (next.vz * dt) / steps };
    if (canOccupy(pz, colliders)) next.z = pz.z;
    else next.vz = 0;
  }
  next.speed = Math.hypot(next.vx, next.vz);
  if (next.speed > 0.05)
    next.yaw = turnTowards(
      next.yaw,
      Math.atan2(next.vx, next.vz),
      1 - Math.exp(-12 * dt),
    );
  return next;
}
export function nearestInteraction(
  point: Point,
  placements: Placement[],
  checkout: Point,
) {
  const checkoutDistance = Math.hypot(
    point.x - checkout.x,
    point.z - checkout.z,
  );
  let best: string | null = checkoutDistance < 1.55 ? "checkout" : null,
    distance = best ? checkoutDistance : 1.65;
  for (const p of placements) {
    const d = Math.hypot(point.x - p.x, point.z - p.z);
    if (d < distance) {
      best = p.product.id;
      distance = d;
    }
  }
  return best;
}
