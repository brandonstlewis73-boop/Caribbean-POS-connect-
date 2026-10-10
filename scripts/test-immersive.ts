import assert from "node:assert/strict";
import { addStoreItem, reconcileStoreCart } from "../lib/immersive/cart";
import {
  stepBody,
  canOccupy,
  worldConfig,
  productPlacements,
  nearestInteraction,
  type Body,
} from "../lib/immersive/world";
import { immersiveMerchantEnabled } from "../lib/immersive/flag";
import { publicCheckoutError } from "../lib/immersive/checkout-policy";
import { localizeOnlineSettings } from "../lib/online-market";
import type { Product, Settings } from "../lib/types";
const settings = {
  business_name: "Baker Buds",
  currency: "TTD",
  pickup_enabled: true,
  delivery_enabled: true,
  payment_cash_enabled: true,
  payment_pay_on_delivery_enabled: true,
  storefront_status: "live",
} as unknown as Settings;
const p = {
  id: "p1",
  name: "Brownie",
  selling_price: 60,
  discount_price: 50,
  stock_quantity: 3,
  active: true,
} as Product;
let cart = addStoreItem([], [p], p.id, 2);
assert.equal(cart[0].selling_price, 50);
assert.equal(cart[0].quantity, 2);
cart = addStoreItem(cart, [p], p.id, 5);
assert.equal(cart[0].quantity, 3);
assert.equal(cart.length, 1);
assert.deepEqual(addStoreItem(cart, [p], p.id, NaN), cart);
assert.deepEqual(addStoreItem(cart, [p], p.id, -1), cart);
assert.equal(
  reconcileStoreCart(cart, [
    { ...p, stock_quantity: 1, discount_price: null, selling_price: 65 },
  ])[0].quantity,
  1,
);
assert.equal(
  reconcileStoreCart(cart, [
    { ...p, discount_price: null, selling_price: 65 },
  ])[0].selling_price,
  65,
);
assert.equal(reconcileStoreCart(cart, [{ ...p, active: false }]).length, 0);
assert.equal(reconcileStoreCart(cart, [{ ...p, stock_quantity: 0 }]).length, 0);
assert.equal(immersiveMerchantEnabled("baker-buds", true, ""), false);
assert.equal(
  immersiveMerchantEnabled("baker-buds", false, "baker-buds"),
  false,
);
assert.equal(
  immersiveMerchantEnabled("baker-buds", true, " other, Baker-Buds "),
  true,
);
assert.equal(immersiveMerchantEnabled("baker-buds", true, "*"), false);
const start: Body = { x: 2, z: 3, vx: 0, vz: 0, yaw: 0, speed: 0 };
const simulate = (fps: number, input = { x: 0, z: -1 }, running = false) => {
  let b = { ...start };
  for (let i = 0; i < fps; i++) b = stepBody(b, input, running, 0, 1 / fps, []);
  return b;
};
const walk = simulate(60);
assert.ok(walk.z < start.z - 1.8);
assert.ok(Math.abs(walk.z - simulate(30).z) < 0.05);
assert.ok(simulate(60, { x: 0, z: -1 }, true).speed > walk.speed);
assert.ok(Math.abs(simulate(60, { x: 1, z: -1 }).speed - walk.speed) < 0.001);
let stopped = walk;
for (let i = 0; i < 60; i++)
  stopped = stepBody(stopped, { x: 0, z: 0 }, false, 0, 1 / 60, []);
assert.ok(stopped.speed < 0.001);
const config = worldConfig(settings);
let b = { ...start, x: 0, z: 3 };
for (let i = 0; i < 100; i++)
  b = stepBody(b, { x: 0, z: -1 }, true, 0, 0.08, config.fixtures);
assert.ok(canOccupy(b, config.fixtures));
assert.ok(b.z >= 1.19);
const placements = productPlacements(
  Array.from({ length: 15 }, (_, i) => ({ ...p, id: `p${i}` })),
  0,
);
assert.equal(placements.length, 12);
assert.equal(
  productPlacements(
    Array.from({ length: 15 }, (_, i) => ({ ...p, id: `p${i}` })),
    1,
  ).length,
  3,
);
assert.equal(
  nearestInteraction({ x: -3.6, z: -4.25 }, placements, config.checkout),
  "p0",
);
assert.equal(publicCheckoutError(settings, "pickup", "Cash"), null);
assert.ok(
  publicCheckoutError(
    { ...settings, storefront_status: "paused" },
    "pickup",
    "Cash",
  ),
);
assert.ok(
  publicCheckoutError({ ...settings, pickup_enabled: false }, "pickup", "Cash"),
);
assert.ok(publicCheckoutError(settings, "pickup", "Pay on delivery"));
assert.ok(publicCheckoutError(settings, "online", "Cash"));
assert.ok(publicCheckoutError(settings, "pickup", "fabricated"));
assert.equal(localizeOnlineSettings(settings, "US").settings.currency, "TTD");
console.log(
  "PASS immersive cart, stock reconciliation, feature flag, movement/collision, product layout, checkout policy and merchant currency tests",
);
