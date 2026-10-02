import assert from "node:assert/strict";
import {
  FEATURE_PLANS,
  PLAN_CONFIG,
  buildUsageMeters,
  canUseFeature,
  getPlanConfig,
  isWithinLimit,
  normalizePlanId
} from "../lib/plan-gating";

assert.equal(normalizePlanId(undefined), "trial");
assert.equal(normalizePlanId("free"), "trial");
assert.equal(normalizePlanId("business"), "premium");
assert.equal(normalizePlanId("enterprise"), "enterprise");

assert.equal(PLAN_CONFIG.trial.limits.products, 25);
assert.equal(PLAN_CONFIG.enterprise.limits.products, null);
assert.equal(FEATURE_PLANS.aiSupport, "pro");
assert.equal(FEATURE_PLANS.multiLocation, "premium");
assert.equal(FEATURE_PLANS.threeDStorefront, "premium");

assert.equal(canUseFeature("starter", "whatsappMessaging").allowed, true);
assert.equal(canUseFeature("starter", "aiSupport").allowed, false);
assert.equal(canUseFeature("pro", "aiSupport").allowed, true);
assert.equal(canUseFeature("pro", "multiLocation").allowed, true);
assert.equal(canUseFeature("pro", "customBranding").allowed, false);
assert.equal(canUseFeature("premium", "multiLocation").allowed, true);
assert.equal(canUseFeature("pro", "threeDStorefront").allowed, false);
assert.equal(canUseFeature("premium", "threeDStorefront").allowed, true);
assert.equal(canUseFeature("trial", "advancedReports").allowed, false);

assert.equal(isWithinLimit("starter", "products", 100).allowed, true);
assert.equal(isWithinLimit("starter", "products", 101).allowed, false);
assert.equal(isWithinLimit("enterprise", "products", 5000).allowed, true);
assert.equal(isWithinLimit("pro", "aiGenerations", 500).allowed, true);
assert.equal(isWithinLimit("pro", "aiGenerations", 501).allowed, false);

const meters = buildUsageMeters("starter", {
  products: 35,
  staff: 2,
  locations: 1,
  aiGenerations: 0,
  whatsappMessages: 52
});
assert.equal(meters.find((meter) => meter.key === "products")?.limit, 100);
assert.equal(meters.find((meter) => meter.key === "products")?.percent, 35);
assert.equal(meters.find((meter) => meter.key === "aiGenerations")?.locked, true);
assert.equal(meters.find((meter) => meter.key === "whatsappMessages")?.remaining, 148);

assert.deepEqual(getPlanConfig("unknown").id, "trial");

console.log("Plan gating tests passed.");
