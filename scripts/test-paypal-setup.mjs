import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const temp = await mkdtemp(join(tmpdir(), "paypal-setup-test-"));
const script = resolve("scripts/setup-paypal.mjs");
const mock = join(temp, "mock.mjs");
await writeFile(mock, `
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const statePath = process.env.TEST_PAYPAL_STATE;
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath)) : { plans: [], webhooks: [], creations: 0 };
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input); const path = url.pathname; const method = init.method || "GET"; const body = init.body && String(init.body).startsWith("{") ? JSON.parse(init.body) : null;
  let result = {};
  if (path.endsWith("oauth2/token")) result = { access_token: "test-token" };
  else if (path === "/v1/catalogs/products" && method === "POST") { state.product = body; state.creations++; result = body; }
  else if (path.startsWith("/v1/catalogs/products/")) { if (!state.product) return new Response("", { status: 404 }); result = state.product; }
  else if (path === "/v1/billing/plans" && method === "GET") result = { plans: state.plans, total_pages: 1 };
  else if (path === "/v1/billing/plans" && method === "POST") { result = { ...body, id: "P-" + (state.plans.length + 1) }; state.plans.push(result); state.creations++; }
  else if (path.startsWith("/v1/billing/plans/")) result = state.plans.find(plan => path.endsWith(plan.id));
  else if (path === "/v1/notifications/webhooks" && method === "GET") result = { webhooks: state.webhooks };
  else if (path === "/v1/notifications/webhooks" && method === "POST") { result = { ...body, id: "WH-TEST" }; state.webhooks.push(result); state.creations++; }
  else throw new Error("Unexpected mock request " + method + " " + path);
  writeFileSync(statePath, JSON.stringify(state));
  return Response.json(result);
};
`);
const env = { ...process.env, PAYPAL_ENVIRONMENT: "sandbox", PAYPAL_CLIENT_ID: "test-client", PAYPAL_CLIENT_SECRET: "test-secret", NEXT_PUBLIC_APP_URL: "https://checkout.example", TEST_PAYPAL_STATE: join(temp, "state.json") };
function run(args, overrides = {}, mocked = true) {
  return spawnSync(process.execPath, [...(mocked ? ["--import", mock] : []), script, ...args], { cwd: temp, env: { ...env, ...overrides }, encoding: "utf8" });
}
try {
  const dry = run([], {}, false); assert.equal(dry.status, 0, dry.stderr);
  const preview = JSON.parse(dry.stdout);
  assert.deepEqual(preview.plans.map(plan => plan.billing_cycles[0].pricing_scheme.fixed_price.value), ["29.00", "79.00", "149.00"]);
  assert(preview.plans.every(plan => plan.billing_cycles.length === 1 && plan.billing_cycles[0].total_cycles === 0));
  assert.equal(preview.webhook.url, "https://checkout.example/api/paypal/webhook");
  assert.equal(run(["--apply"], { PAYPAL_ENVIRONMENT: "live" }).status, 1, "live resources need explicit live flag");
  assert.equal(run(["--apply"], { PAYPAL_CLIENT_SECRET: "" }).status, 1);
  const first = run(["--apply"]); assert.equal(first.status, 0, first.stderr);
  let state = JSON.parse(await readFile(env.TEST_PAYPAL_STATE, "utf8"));
  assert.equal(state.creations, 5, "one product, three plans, one webhook");
  const second = run(["--apply"]); assert.equal(second.status, 0, second.stderr);
  state = JSON.parse(await readFile(env.TEST_PAYPAL_STATE, "utf8"));
  assert.equal(state.creations, 5, "rerun reuses existing resources");
  const output = await readFile(join(temp, ".env.paypal-setup.sandbox"), "utf8");
  assert(output.includes("PAYPAL_PREMIUM_PLAN_ID=P-2"));
  assert(output.includes("PAYPAL_WEBHOOK_ID=WH-TEST"));
  assert(!output.includes("test-secret"));
  state.plans[0].billing_cycles[0].pricing_scheme.fixed_price.value = "1.00";
  await writeFile(env.TEST_PAYPAL_STATE, JSON.stringify(state));
  assert.equal(run(["--apply"]).status, 1, "mispriced existing plans cannot be reused");
  console.log("PayPal setup dry-run, repeat-run, secret handling, and plan validation tests passed.");
} finally { await rm(temp, { recursive: true, force: true }); }
