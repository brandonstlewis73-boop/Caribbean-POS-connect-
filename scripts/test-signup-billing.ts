import assert from "node:assert/strict";
import { safeLoginDestination } from "../lib/login-destination";
import { canChangeSubscriptionManually } from "../lib/billing-policy";

for (const destination of [undefined, null, "", "https://example.com", "//example.com", "/\\example.com", "javascript:alert(1)", "/\n/example.com", " /orders"]) {
  assert.equal(safeLoginDestination(destination), "/dashboard");
}
assert.equal(safeLoginDestination("/orders?status=new#details"), "/orders?status=new#details");
assert.equal(safeLoginDestination("/subscription?plan=business"), "/subscription?plan=business");
for (const provider of [undefined, "manual", "stripe", "paypal"]) {
  for (const plan of ["starter", "business", "premium", "pro", "enterprise", "unknown"]) {
    assert.equal(canChangeSubscriptionManually(plan, provider), false, `${plan} must require billing or provisioning`);
  }
}
assert.equal(canChangeSubscriptionManually("trial", "manual"), true);
assert.equal(canChangeSubscriptionManually("free", "manual"), true);
assert.equal(canChangeSubscriptionManually("trial", "stripe"), false);
assert.equal(canChangeSubscriptionManually("free", "stripe"), false);
console.log("Signup and billing guard tests passed.");

assert.equal(canChangeSubscriptionManually("trial", "paypal"), false);
assert.equal(canChangeSubscriptionManually("free", "paypal"), false);
