import {
  stepBody,
  rotateBody,
  type Body,
  type Point,
  type Collider,
} from "./world";
export type Activity = "walk" | "browse" | "queue" | "serve" | "prepare";
export type Waypoint = Point & {
  pause: number;
  yaw: number;
  activity: Exclude<Activity, "walk">;
};
export type NpcState = {
  body: Body;
  waypoint: number;
  wait: number;
  activity: Activity;
  visits: number;
  blocked: number;
};
export const CUSTOMER_ROUTE: Waypoint[] = [
  { x: 3.5, z: 1.8, pause: 3.2, yaw: Math.PI / 2, activity: "browse" },
  { x: 3.5, z: -2.8, pause: 4.5, yaw: Math.PI / 2, activity: "browse" },
  { x: 3.5, z: -3.9, pause: 0, yaw: -Math.PI / 2, activity: "queue" },
  { x: -2.5, z: -3.9, pause: 5.5, yaw: Math.PI, activity: "queue" },
  { x: -3.5, z: -3.9, pause: 0, yaw: 0, activity: "browse" },
  { x: -3.5, z: 1.8, pause: 3.8, yaw: -Math.PI / 2, activity: "browse" },
  { x: -3.5, z: 3.7, pause: 0, yaw: Math.PI / 2, activity: "browse" },
  { x: 3.5, z: 3.7, pause: 1.2, yaw: Math.PI, activity: "browse" },
];
export const STAFF_ROUTE: Waypoint[] = [
  { x: -2.5, z: -6.45, pause: 4, yaw: 0, activity: "serve" },
  { x: -3.9, z: -6.45, pause: 3.5, yaw: Math.PI / 2, activity: "prepare" },
  { x: -1.4, z: -6.45, pause: 2.8, yaw: -Math.PI / 2, activity: "prepare" },
];
export function createNpc(route: Waypoint[]): NpcState {
  return {
    body: { ...route[0], vx: 0, vz: 0, speed: 0 },
    waypoint: 0,
    wait: route[0].pause,
    activity: route[0].activity,
    visits: 0,
    blocked: 0,
  };
}
export function bodyCollider(body: Point): Collider {
  return { x: body.x, z: body.z, width: 0.48, depth: 0.48, height: 1.8 };
}
export function stepNpc(
  state: NpcState,
  route: Waypoint[],
  dt: number,
  obstacles: Collider[],
): NpcState {
  const target = route[state.waypoint];
  if (state.wait > 0) {
    const wait = Math.max(0, state.wait - dt);
    const stopped = stepBody(
      state.body,
      { x: 0, z: 0 },
      false,
      0,
      dt,
      obstacles,
    );
    stopped.yaw = rotateBody(stopped.yaw, target.yaw, dt);
    return {
      ...state,
      body: stopped,
      wait,
      waypoint:
        wait === 0 ? (state.waypoint + 1) % route.length : state.waypoint,
    };
  }
  const dx = target.x - state.body.x,
    dz = target.z - state.body.z,
    distance = Math.hypot(dx, dz);
  if (distance < 0.13 && state.body.speed < 0.25) {
    return {
      ...state,
      body: { ...state.body, vx: 0, vz: 0, speed: 0 },
      wait: target.pause,
      waypoint: target.pause
        ? state.waypoint
        : (state.waypoint + 1) % route.length,
      activity: target.activity,
      visits: state.visits + 1,
      blocked: 0,
    };
  }
  const strength = Math.min(0.58, distance * 1.5);
  const body = stepBody(
    state.body,
    {
      x: (dx / Math.max(distance, 0.001)) * strength,
      z: (dz / Math.max(distance, 0.001)) * strength,
    },
    false,
    0,
    dt,
    obstacles,
  );
  // Yield instead of teleporting through the shopper or abandoning a safe path.
  return {
    ...state,
    body,
    activity: body.speed > 0.07 ? "walk" : "browse",
    blocked: body.speed < 0.07 ? state.blocked + dt : 0,
  };
}
