import assert from "node:assert/strict";
import type { Pool } from "pg";
import { approvalUrl, paypalConfigStatus, paypalReference, verifiedPayPalAttempt, validatePayPalPlan, getPayPalSubscription, type PayPalSubscription } from "../lib/paypal";
import { reservePayPalCheckout, syncPayPalSubscription } from "../lib/paypal-data";
import { NextRequest } from "next/server";
import { POST as paypalWebhook } from "../app/api/paypal/webhook/route";
import type { Subscription } from "../lib/types";

async function main() {
Object.assign(process.env, { CPC_AUTO_MIGRATE: "false", SESSION_SECRET: "test-paypal-secret", PAYPAL_ENVIRONMENT: "sandbox", PAYPAL_CLIENT_ID: "test", PAYPAL_CLIENT_SECRET: "test", PAYPAL_WEBHOOK_ID: "WH-TEST", PAYPAL_STARTER_PLAN_ID: "P-STARTER", PAYPAL_PREMIUM_PLAN_ID: "P-BUSINESS", PAYPAL_PRO_PLAN_ID: "P-PRO", NEXT_PUBLIC_APP_URL: "http://localhost:3000" });
assert.equal(paypalConfigStatus().configured, true);
delete process.env.PAYPAL_WEBHOOK_ID;
assert.equal(paypalConfigStatus().configured, false);
process.env.PAYPAL_WEBHOOK_ID = "WH-TEST";
const attempt = "00000000-0000-4000-8000-000000000001";
assert.equal(verifiedPayPalAttempt(paypalReference(attempt)), attempt);
assert.throws(() => verifiedPayPalAttempt(paypalReference(attempt) + "x"));
assert.throws(() => verifiedPayPalAttempt("cpc:other:forged"));
assert.throws(() => approvalUrl([{ rel: "approve", href: "https://evil.example/paypal" }]));
assert.throws(() => approvalUrl([{ rel: "approve", href: "http://www.sandbox.paypal.com/checkout" }]));
assert.equal(approvalUrl([{ rel: "approve", href: "https://www.sandbox.paypal.com/checkout" }]), "https://www.sandbox.paypal.com/checkout");
const originalFetch = globalThis.fetch;
let price = "29";
let currency = "USD";
globalThis.fetch = async (input) => {
  if (String(input).endsWith("oauth2/token")) return Response.json({ access_token: "test-token" });
  return Response.json({ status: "ACTIVE", billing_cycles: [{ tenure_type: "REGULAR", total_cycles: 0, frequency: { interval_unit: "MONTH", interval_count: 1 }, pricing_scheme: { fixed_price: { value: price, currency_code: currency } } }] });
};
await validatePayPalPlan("starter");
price = "1";
await assert.rejects(validatePayPalPlan("starter"), /unavailable/);
price = "29"; currency = "TTD";
await assert.rejects(validatePayPalPlan("starter"), /unavailable/);
assert.throws(() => getPayPalSubscription("../../other"), /Invalid/);
globalThis.fetch = originalFetch;
let current: Subscription = { id: "sub-test", business_id: "business-one", plan_id: "trial", plan_name: "Trial", status: "trialing", seats: 1, monthly_price: 0, currency: "USD", metadata: {} };
let writes = 0;
const client = {
  async query(sql: string, params: unknown[] = []) {
    if (sql.includes("SELECT * FROM subscriptions WHERE metadata")) return { rows: (current.metadata?.paypal_checkout as { attempt?: string })?.attempt === params[0] ? [current] : [] };
    if (sql.includes("SELECT * FROM subscriptions")) return { rows: [current] };
    if (sql.includes("UPDATE subscriptions SET metadata")) { current.metadata = { ...current.metadata, ...JSON.parse(String(params[1])) }; return { rows: [] }; }
    if (sql.includes("UPDATE subscriptions SET plan_id")) { writes++; current = { ...current, provider: "paypal", provider_subscription_id: String(params[8]), status: params[3] as Subscription["status"] }; }
    return { rows: [] };
  }, release() {}
};
globalThis.__cpcPool = { query: client.query.bind(client), connect: async () => client } as unknown as Pool;
const reserved = await reservePayPalCheckout("business-one", "starter");
assert.equal(await reservePayPalCheckout("business-one", "starter"), reserved, "repeat clicks reuse the same checkout");
await assert.rejects(reservePayPalCheckout("business-one", "pro"), /pending/);
const remote: PayPalSubscription = { id: "I-TEST", plan_id: "P-STARTER", custom_id: paypalReference(reserved), status: "APPROVED" };
assert.equal(await syncPayPalSubscription(remote, "business-one"), "pending");
assert.equal(writes, 0, "approval alone does not grant a paid plan");
await assert.rejects(syncPayPalSubscription(remote, "business-two"), /another account/);
await assert.rejects(syncPayPalSubscription({ ...remote, plan_id: "P-PRO" }), /does not match/);
remote.status = "ACTIVE";
assert.equal(await syncPayPalSubscription(remote), "pending");
assert.equal(writes, 0, "first payment must be confirmed");
remote.billing_info = { last_payment: { time: "2026-10-02T10:00:00Z" }, next_billing_time: "2026-11-02T10:00:00Z" };
assert.equal(await syncPayPalSubscription(remote), "active");
assert.equal(await syncPayPalSubscription(remote), "active", "repeat webhooks are safe");
await assert.rejects(reservePayPalCheckout("business-one", "starter"), /existing subscription/);
await assert.rejects(syncPayPalSubscription({ ...remote, id: "I-OTHER" }), /does not match/);
let verification = "FAILURE";
globalThis.fetch = async input => {
  const url = String(input);
  if (url.endsWith("oauth2/token")) return Response.json({ access_token: "test-token" });
  if (url.endsWith("verify-webhook-signature")) return Response.json({ verification_status: verification });
  return Response.json(remote);
};
const webhookRequest = () => new NextRequest("http://localhost/api/paypal/webhook", { method: "POST", headers: { "Content-Type": "application/json", "paypal-transmission-id": "test-delivery" }, body: JSON.stringify({ event_type: "BILLING.SUBSCRIPTION.ACTIVATED", resource: { id: remote.id } }) });
const beforeInvalid = writes;
assert.equal((await paypalWebhook(webhookRequest())).status, 400);
assert.equal(writes, beforeInvalid, "unverified webhook cannot change entitlement");
verification = "SUCCESS";
assert.equal((await paypalWebhook(webhookRequest())).status, 200);
globalThis.fetch = originalFetch;
remote.status = "SUSPENDED";
assert.equal(await syncPayPalSubscription(remote), "paused");
remote.status = "ACTIVE"; remote.billing_info.failed_payments_count = 1;
assert.equal(await syncPayPalSubscription(remote), "past_due");
remote.status = "CANCELLED";
assert.equal(await syncPayPalSubscription(remote), "cancelled");
const next = await reservePayPalCheckout("business-one", "pro");
assert.notEqual(next, reserved, "cancelled agreements can start a fresh checkout");
await assert.rejects(syncPayPalSubscription(remote), /Unrecognized/);
current.provider = "stripe"; current.status = "active"; current.provider_subscription_id = "sub-stripe";
await assert.rejects(reservePayPalCheckout("business-one", "starter"), /existing subscription/);
globalThis.__cpcPool = undefined;
console.log("PayPal checkout, tenant isolation, recurring status, and replay tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
