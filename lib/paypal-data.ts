import "server-only";
import { randomUUID } from "node:crypto";
import { query, transaction } from "./db";
import { getPlanConfig } from "./plan-gating";
import { paypalPlanId, verifiedPayPalAttempt, type PayPalPlan, type PayPalSubscription } from "./paypal";
import type { Subscription } from "./types";

export async function reservePayPalCheckout(businessId: string, planId: PayPalPlan) {
  return transaction(async client => {
    await client.query("SELECT id FROM businesses WHERE id = $1 FOR UPDATE", [businessId]);
    const result = await client.query<Subscription>("SELECT * FROM subscriptions WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE", [businessId]);
    const current = result.rows[0];
    if (!current) throw new Error("Your billing account is unavailable. Please contact support.");
    if (current.provider_subscription_id && current.status !== "cancelled") throw new Error("Cancel your existing subscription before starting a new one to avoid duplicate charges.");
    const pending = (current.provider === "paypal" && current.status === "cancelled" ? undefined : current.metadata?.paypal_checkout) as { attempt: string; planId: PayPalPlan; reservedAt?: string } | undefined;
    if (pending && pending.planId !== planId) throw new Error("Finish or cancel your pending PayPal checkout before choosing another plan. Contact support for help.");
    if (pending && Date.now() - new Date(pending.reservedAt || 0).getTime() > 48 * 60 * 60 * 1000) throw new Error("Your pending checkout has expired. Contact support to reset it safely.");
    const attempt = pending?.attempt || randomUUID();
    await client.query("UPDATE subscriptions SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb, updated_at = NOW() WHERE id = $1", [current.id, JSON.stringify({ paypal_checkout: { attempt, planId, reservedAt: pending?.reservedAt || new Date().toISOString() } })]);
    return attempt;
  });
}
export async function syncPayPalSubscription(remote: PayPalSubscription, expectedBusinessId?: string) {
  const attempt = verifiedPayPalAttempt(remote.custom_id);
  const matches = await query<Subscription>("SELECT * FROM subscriptions WHERE metadata->'paypal_checkout'->>'attempt' = $1", [attempt]);
  if (matches.rows.length !== 1) throw new Error("Unrecognized PayPal subscription.");
  const businessId = matches.rows[0].business_id;
  if (!businessId || (expectedBusinessId && businessId !== expectedBusinessId)) throw new Error("This subscription belongs to another account.");
  return transaction(async client => {
    await client.query("SELECT id FROM businesses WHERE id = $1 FOR UPDATE", [businessId]);
    const result = await client.query<Subscription>("SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE", [matches.rows[0].id]);
    const current = result.rows[0];
    const pending = current.metadata?.paypal_checkout as { attempt: string; planId: PayPalPlan; reservedAt?: string } | undefined;
    if (!pending || pending.attempt !== attempt || paypalPlanId(pending.planId) !== remote.plan_id || (current.provider_subscription_id && current.status !== "cancelled" && current.provider_subscription_id !== remote.id)) throw new Error("PayPal subscription does not match this checkout.");
    if (["APPROVAL_PENDING", "APPROVED"].includes(remote.status)) return "pending";
    if (remote.status === "ACTIVE" && !remote.billing_info?.last_payment?.time) return "pending";
    const status = remote.status === "ACTIVE" ? (remote.billing_info?.failed_payments_count ? "past_due" : "active") : remote.status === "SUSPENDED" ? "paused" : ["CANCELLED", "EXPIRED"].includes(remote.status) ? "cancelled" : null;
    if (!status) throw new Error("Unsupported PayPal subscription status.");
    const plan = getPlanConfig(pending.planId);
    await client.query(`UPDATE subscriptions SET plan_id=$2, plan_name=$3, status=$4, seats=$5, monthly_price=$6, currency=$7, provider='paypal', provider_customer_id=$8, provider_subscription_id=$9, current_period_start=$10, current_period_end=$11, trial_ends_at=NULL, updated_at=NOW() WHERE id=$1`, [current.id, plan.id, plan.name, status, plan.limits.staff, plan.monthlyPrice, plan.currency, remote.subscriber?.payer_id || null, remote.id, remote.billing_info?.last_payment?.time || null, remote.billing_info?.next_billing_time || null]);
    await client.query("UPDATE businesses SET subscription_plan=$2, subscription_status=$3, updated_at=NOW() WHERE id=$1", [businessId, plan.id, status === "paused" ? "past_due" : status]);
    return status;
  });
}
