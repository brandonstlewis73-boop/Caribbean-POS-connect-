import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";
if (!["sandbox", "live"].includes(environment)) throw new Error("PAYPAL_ENVIRONMENT must be sandbox or live.");
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl || new URL(appUrl).protocol !== "https:") throw new Error("Set NEXT_PUBLIC_APP_URL to the HTTPS application URL.");
const apply = process.argv.includes("--apply");
if (apply && environment === "live" && !process.argv.includes("--live")) throw new Error("Use --apply --live to create live billing resources.");
const webhookUrl = new URL("/api/paypal/webhook", appUrl).toString();
const productId = "CARIBBEAN-POS-SUBSCRIPTIONS-V1";
const plans = [
  { key: "STARTER", name: "Caribbean POS Connect Starter", price: "29.00" },
  { key: "PREMIUM", name: "Caribbean POS Connect Business", price: "79.00" },
  { key: "PRO", name: "Caribbean POS Connect Pro", price: "149.00" }
];
const eventTypes = ["BILLING.SUBSCRIPTION.CREATED", "BILLING.SUBSCRIPTION.ACTIVATED", "BILLING.SUBSCRIPTION.UPDATED", "BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.SUSPENDED", "BILLING.SUBSCRIPTION.EXPIRED", "BILLING.SUBSCRIPTION.PAYMENT.FAILED", "PAYMENT.SALE.COMPLETED", "PAYMENT.SALE.DENIED"].map(name => ({ name }));
function planBody(plan) {
  return { product_id: productId, name: plan.name, status: "ACTIVE", billing_cycles: [{ tenure_type: "REGULAR", sequence: 1, total_cycles: 0, frequency: { interval_unit: "MONTH", interval_count: 1 }, pricing_scheme: { fixed_price: { value: plan.price, currency_code: "USD" } } }], payment_preferences: { auto_bill_outstanding: true, setup_fee: { value: "0", currency_code: "USD" }, payment_failure_threshold: 1 } };
}
if (!apply) {
  console.log(JSON.stringify({ mode: "dry-run", environment, product: { id: productId, name: "Caribbean POS Connect subscriptions", type: "SERVICE", category: "SOFTWARE" }, plans: plans.map(planBody), webhook: { url: webhookUrl, event_types: eventTypes } }, null, 2));
  process.exit(0);
}
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) throw new Error("Set PayPal app credentials in your local environment; do not paste them into chat.");
const base = environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const tokenResponse = await fetch(`${base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", signal: AbortSignal.timeout(15000) });
if (!tokenResponse.ok) throw new Error(`PayPal authentication failed (${tokenResponse.status}).`);
const { access_token: token } = await tokenResponse.json();
async function api(path, body, method = body ? "POST" : "GET") {
  const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(method === "POST" ? { "PayPal-Request-Id": createHash("sha256").update(`${environment}:${path}:${JSON.stringify(body)}`).digest("hex").slice(0, 32) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
  if (response.status === 404 && method === "GET") return null;
  if (!response.ok) throw new Error(`PayPal request failed (${response.status}) at ${path}. Check your app permissions and configuration.`);
  return response.status === 204 ? null : response.json();
}
if (!await api(`/v1/catalogs/products/${productId}`)) await api("/v1/catalogs/products", { id: productId, name: "Caribbean POS Connect subscriptions", type: "SERVICE", category: "SOFTWARE" });
let existingPlans = [];
for (let page = 1; ; page++) {
  const result = await api(`/v1/billing/plans?product_id=${productId}&page_size=20&page=${page}&total_required=true`);
  existingPlans.push(...(result?.plans || []));
  if (page >= (result?.total_pages || 1)) break;
}
const variables = { PAYPAL_ENVIRONMENT: environment, NEXT_PUBLIC_APP_URL: new URL(appUrl).origin };
for (const plan of plans) {
  const matches = existingPlans.filter(existing => existing.name === plan.name);
  if (matches.length > 1) throw new Error(`Multiple ${plan.name} plans exist. Reconcile these before retrying.`);
  let remote = matches[0] ? await api(`/v1/billing/plans/${matches[0].id}`) : await api("/v1/billing/plans", planBody(plan));
  if (matches[0]) {
    const cycle = remote.billing_cycles?.[0];
    if (remote.status !== "ACTIVE" || remote.billing_cycles?.length !== 1 || cycle.tenure_type !== "REGULAR" || cycle.total_cycles !== 0 || cycle.frequency.interval_unit !== "MONTH" || cycle.frequency.interval_count !== 1 || cycle.pricing_scheme.fixed_price?.currency_code !== "USD" || Number(cycle.pricing_scheme.fixed_price?.value) !== Number(plan.price) || Number(remote.payment_preferences?.setup_fee?.value || 0) !== 0) throw new Error(`Existing ${plan.name} plan differs from the required monthly USD billing. Reconcile it before retrying.`);
  }
  variables[`PAYPAL_${plan.key}_PLAN_ID`] = remote.id;
}
const existingWebhooks = await api("/v1/notifications/webhooks");
const matches = (existingWebhooks?.webhooks || []).filter(webhook => webhook.url === webhookUrl);
if (matches.length > 1) throw new Error("Multiple webhooks use this URL. Reconcile them before retrying.");
let webhook = matches[0];
if (webhook) {
  const names = new Set((webhook.event_types || []).map(event => event.name));
  if (!names.has("*") && eventTypes.some(event => !names.has(event.name))) {
    const events = [...new Set([...names, ...eventTypes.map(event => event.name)])].map(name => ({ name }));
    await api(`/v1/notifications/webhooks/${webhook.id}`, [{ op: "replace", path: "/event_types", value: events }], "PATCH");
  }
} else webhook = await api("/v1/notifications/webhooks", { url: webhookUrl, event_types: eventTypes });
variables.PAYPAL_WEBHOOK_ID = webhook.id;
const output = `.env.paypal-setup.${environment}`;
await writeFile(output, Object.entries(variables).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { mode: 0o600 });
console.log(`PayPal ${environment} resources are ready. Non-secret configuration IDs were saved to ${output}. Add these plus the app credentials to Vercel, then redeploy. No buyer payments were created.`);
