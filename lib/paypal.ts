import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getPlanConfig } from "./plan-gating";

export const paidPayPalPlans = ["starter", "premium", "pro"] as const;
export type PayPalPlan = typeof paidPayPalPlans[number];
export type PayPalSubscription = {
  id: string; status: string; plan_id: string; custom_id?: string;
  subscriber?: { payer_id?: string };
  billing_info?: { next_billing_time?: string; failed_payments_count?: number; last_payment?: { time?: string } };
};
function baseUrl() {
  if (process.env.PAYPAL_ENVIRONMENT === "live") return "https://api-m.paypal.com";
  if (process.env.PAYPAL_ENVIRONMENT === "sandbox") return "https://api-m.sandbox.paypal.com";
  throw new Error("PayPal environment must be configured.");
}
export function paypalPlanId(plan: PayPalPlan) {
  return process.env[`PAYPAL_${plan.toUpperCase()}_PLAN_ID`] || "";
}
export function paypalConfigStatus() {
  const configured = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET &&
    process.env.PAYPAL_WEBHOOK_ID && process.env.SESSION_SECRET &&
    ["live", "sandbox"].includes(process.env.PAYPAL_ENVIRONMENT || "") &&
    paidPayPalPlans.every(plan => paypalPlanId(plan)) && process.env.NEXT_PUBLIC_APP_URL);
  return { configured, environment: process.env.PAYPAL_ENVIRONMENT || null };
}
export function paypalReference(attempt: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Billing verification is unavailable.");
  return `cpc:${attempt}:${createHmac("sha256", secret).update(`paypal:${attempt}`).digest("base64url").slice(0,32)}`;
}
export function verifiedPayPalAttempt(reference?: string) {
  const attempt = reference?.split(":")[1];
  if (!attempt || !/^[0-9a-f-]{36}$/.test(attempt)) throw new Error("Unrecognized PayPal subscription.");
  const expected = Buffer.from(paypalReference(attempt));
  const actual = Buffer.from(reference || "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Unrecognized PayPal subscription.");
  return attempt;
}
export async function paypalRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokenResponse = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials", cache: "no-store", signal: AbortSignal.timeout(15000)
  });
  if (!tokenResponse.ok) throw new Error("PayPal could not authenticate billing. Please contact support.");
  const token = await tokenResponse.json();
  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json", ...init.headers }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("PayPal could not complete this request. Please try again or contact support.");
  return response.status === 204 ? undefined as T : await response.json() as T;
}
export function getPayPalSubscription(id: string) {
  if (!/^I-[A-Z0-9]+$/.test(id)) throw new Error("Invalid PayPal subscription.");
  return paypalRequest<PayPalSubscription>(`/v1/billing/subscriptions/${id}`);
}
export async function validatePayPalPlan(plan: PayPalPlan) {
  const remote = await paypalRequest<{ status: string; billing_cycles: { tenure_type: string; total_cycles: number; frequency: { interval_unit: string; interval_count: number }; pricing_scheme: { fixed_price?: { currency_code: string; value: string } } }[]; payment_preferences?: { setup_fee?: { value: string } } }>(`/v1/billing/plans/${encodeURIComponent(paypalPlanId(plan))}`);
  const cycles = remote.billing_cycles;
  const regular = cycles?.[0];
  const expected = getPlanConfig(plan);
  if (remote.status !== "ACTIVE" || cycles?.length !== 1 || regular?.tenure_type !== "REGULAR" || regular.total_cycles !== 0 || regular.frequency.interval_unit !== "MONTH" || regular.frequency.interval_count !== 1 || regular.pricing_scheme.fixed_price?.currency_code !== expected.currency || Number(regular.pricing_scheme.fixed_price?.value) !== expected.monthlyPrice || Number(remote.payment_preferences?.setup_fee?.value || 0) !== 0) {
    throw new Error("This PayPal plan is unavailable. Please contact support.");
  }
}
export function appBillingUrl(path: string) {
  const url = new URL(path, process.env.NEXT_PUBLIC_APP_URL);
  if (url.protocol !== "https:" && !(process.env.PAYPAL_ENVIRONMENT === "sandbox" && url.hostname === "localhost")) throw new Error("Billing URL is unavailable.");
  return url.toString();
}
export function approvalUrl(links: { rel: string; href: string }[]) {
  const link = links.find(item => item.rel === "approve")?.href;
  const url = new URL(link || "");
  const host = process.env.PAYPAL_ENVIRONMENT === "live" ? "www.paypal.com" : "www.sandbox.paypal.com";
  if (url.protocol !== "https:" || url.hostname !== host) throw new Error("PayPal checkout is unavailable.");
  return url.toString();
}
