import assert from "node:assert/strict";
import {
  stepBody,
  canOccupy,
  worldConfig,
  rotateBody,
  joystickAxis,
  type Body,
} from "../lib/immersive/world";
import {
  createNpc,
  stepNpc,
  CUSTOMER_ROUTE,
  STAFF_ROUTE,
  bodyCollider,
} from "../lib/immersive/npc";
import {
  gait,
  advancePhase,
  pickupWeight,
  PICKUP_SECONDS,
} from "../lib/immersive/motion";
import {
  FrameWindow,
  adaptResolution,
  estimateSceneBytes,
} from "../lib/immersive/performance";
import { cameraObstacles, constrainCamera } from "../lib/immersive/camera";
import { BoxGeometry, Mesh, MeshBasicMaterial, Group, Vector3 } from "three";
import type { Settings } from "../lib/types";
const config = worldConfig({ business_name: "Baker Buds" } as Settings);
for (const speed of [0, 0.01, 0.1, 0.3, 1, 1.75, 2.2, 3.25]) {
  const g = gait(speed);
  assert.ok(Math.abs(g.idle + g.walk + g.run - 1) < 1e-9);
  assert.ok(g.cyclesPerSecond >= 0);
}
assert.equal(advancePhase(0.4, 0, 1), 0.4, "feet stop advancing at a wall");
assert.ok(advancePhase(0.1, 1.75, 0.1) > advancePhase(0.1, 0.5, 0.1));
assert.equal(pickupWeight(0), 0);
assert.equal(pickupWeight(PICKUP_SECONDS), 0);
assert.ok(pickupWeight(0.3) > 0.99);
for (let t = 0; t < PICKUP_SECONDS; t += 0.01)
  assert.ok(
    Math.abs(pickupWeight(t + 0.01) - pickupWeight(t)) < 0.11,
    "pickup blend has no end snap",
  );
assert.deepEqual(joystickAxis(0.02, -0.03), { x: 0, z: 0 });
assert.ok(
  Math.abs(Math.hypot(...Object.values(joystickAxis(2, 2))) - 1) < 1e-9,
);
assert.ok(Math.abs(rotateBody(0, Math.PI, 1 / 60)) <= 6.5 / 60);
let blocked: Body = { x: 0, z: 1.21, vx: 0, vz: 0, yaw: Math.PI, speed: 0 };
for (let i = 0; i < 300; i++)
  blocked = stepBody(
    blocked,
    { x: 0, z: -1 },
    true,
    0,
    1 / 60,
    config.fixtures,
  );
assert.ok(blocked.speed < 0.001 && canOccupy(blocked, config.fixtures));
// Whole route cycles, including the counter approach, must remain in walkable space.
for (const route of [CUSTOMER_ROUTE, STAFF_ROUTE]) {
  let npc = createNpc(route),
    moving = 0,
    waiting = 0;
  const activities = new Set<string>();
  for (let i = 0; i < 60 * 160; i++) {
    npc = stepNpc(npc, route, 1 / 60, config.fixtures);
    assert.ok(
      canOccupy(npc.body, config.fixtures),
      `NPC collided at ${JSON.stringify(npc.body)}`,
    );
    if (npc.body.speed > 0.1) moving++;
    else waiting++;
    activities.add(npc.activity);
  }
  assert.ok(
    npc.visits >= route.length,
    "NPC completes a route without teleporting",
  );
  assert.ok(moving > 100 && waiting > 100 && activities.size >= 2);
}
let npc = createNpc(CUSTOMER_ROUTE);
const blocker = bodyCollider({ x: 3.5, z: 0 });
for (let i = 0; i < 1200; i++) {
  npc = stepNpc(npc, CUSTOMER_ROUTE, 1 / 60, [...config.fixtures, blocker]);
  assert.ok(canOccupy(npc.body, [...config.fixtures, blocker]));
}
assert.ok(npc.blocked > 1, "NPC yields to a shopper blocking the aisle");
const samples = new FrameWindow();
[16, 17, 18, 50].forEach((v) => samples.add(v));
assert.equal(samples.report().p95Ms, 50);
samples.reset();
samples.add(16);
assert.equal(samples.report().p95Ms, 16, "paused interval can be excluded");
let resolution = { scale: 1, slow: 0, fast: 0 };
for (let i = 0; i < 3; i++) resolution = adaptResolution(resolution, 40);
assert.equal(resolution.scale, 0.85);
for (let i = 0; i < 30; i++) resolution = adaptResolution(resolution, 40);
assert.equal(resolution.scale, 0.7);
for (let i = 0; i < 24; i++) resolution = adaptResolution(resolution, 16);
assert.equal(resolution.scale, 1);
const scene = new Group(),
  geometry = new BoxGeometry(),
  material = new MeshBasicMaterial();
scene.add(new Mesh(geometry, material));
const before = estimateSceneBytes(scene, 1000000);
scene.add(new Mesh(geometry, material));
assert.equal(
  estimateSceneBytes(scene, 1000000),
  before,
  "shared GPU allocations counted once",
);
geometry.dispose();
material.dispose();
console.log(
  "PASS gait phase, pickup envelope, deadzone, bounded pivots, wall stops, complete NPC routes/yielding, adaptive resolution and profiler accounting",
);

const cameraBoxes = cameraObstacles([
  { x: 0, z: 2, width: 2, depth: 1, height: 3 },
]);
const cameraPosition = constrainCamera(
  new Vector3(0, 1, 0),
  new Vector3(0, 1, 4),
  cameraBoxes,
  new Vector3(),
);
assert.ok(
  cameraPosition.z < 1.32 && cameraPosition.z > 1,
  "camera pulls in before fixture",
);
assert.equal(
  constrainCamera(
    new Vector3(3, 1, 0),
    new Vector3(3, 1, 4),
    cameraBoxes,
    new Vector3(),
  ).z,
  4,
  "clear orbit is not pulled inward",
);
assert.equal(
  constrainCamera(
    new Vector3(3, 1, 0),
    new Vector3(9, 1, 10),
    [],
    new Vector3(),
  ).x,
  5.65,
  "camera stays inside room",
);
