import "server-only";

import crypto from "node:crypto";
import { getPlanConfig, normalizePlanId, type PlanId } from "./plan-gating";
import type { SubscriptionPlanId, User } from "./types";

const STRIPE_API_VERSION = "2026-02-25.clover";
const STRIPE_BASE_URL = "https://api.stripe.com/v1";

type StripeRequestOptions = {
  method?: "GET" | "POST";
  body?: URLSearchParams;
};

export type StripeSubscriptionPayload = {
  id: string;
  customer: string;
  status: string;
  current_period_start?: number;
  current_period_end?: number;
  trial_end?: number | null;
  metadata?: Record<string, string>;
};

function envValue(name: string) {
  return process.env[name]?.trim() || "";
}

function appBaseUrl() {
  const configured = envValue("NEXT_PUBLIC_APP_URL");
  if (configured) return configured.replace(/\/+$/, "");
  const vercelUrl = envValue("VERCEL_URL");
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export function stripePriceEnvName(planId: string) {
  const normalized = normalizePlanId(planId);
  if (normalized === "trial") return null;
  return `STRIPE_${normalized.toUpperCase()}_PRICE_ID`;
}

export function stripePriceIdForPlan(planId: string) {
  const envName = stripePriceEnvName(planId);
  return envName ? envValue(envName) : "";
}

export function stripeConfigStatus() {
  const plans: PlanId[] = ["starter", "pro", "premium", "enterprise"];
  const priceIds = plans.reduce<Record<string, boolean>>((acc, planId) => {
    acc[planId] = Boolean(stripePriceIdForPlan(planId));
    return acc;
  }, {});
  const paidPlansMissingPrices = plans
    .filter((planId) => getPlanConfig(planId).monthlyPrice > 0)
    .filter((planId) => !stripePriceIdForPlan(planId))
    .map((planId) => stripePriceEnvName(planId))
    .filter(Boolean);

  const missing = [
    !envValue("STRIPE_SECRET_KEY") ? "STRIPE_SECRET_KEY" : null,
    !envValue("STRIPE_WEBHOOK_SECRET") ? "STRIPE_WEBHOOK_SECRET" : null,
    ...paidPlansMissingPrices
  ].filter(Boolean) as string[];

  return {
    configured: Boolean(envValue("STRIPE_SECRET_KEY")),
    webhookConfigured: Boolean(envValue("STRIPE_WEBHOOK_SECRET")),
    priceIds,
    readyForPaidCheckout: Boolean(envValue("STRIPE_SECRET_KEY")) && paidPlansMissingPrices.length === 0,
    missing
  };
}

async function stripeRequest<T>(path: string, options: StripeRequestOptions = {}): Promise<T> {
  const secretKey = envValue("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("Stripe is not configured. Missing STRIPE_SECRET_KEY.");
  }

  const response = await fetch(`${STRIPE_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(options.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: options.body
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error?.message === "string"
      ? payload.error.message
      : "Stripe request failed.";
    throw new Error(message);
  }
  return payload as T;
}

export async function createStripeCheckoutSession({
  user,
  planId,
  customerId
}: {
  user: User;
  planId: SubscriptionPlanId;
  customerId?: string | null;
}) {
  const normalizedPlanId = normalizePlanId(planId);
  const plan = getPlanConfig(normalizedPlanId);
  const priceId = stripePriceIdForPlan(normalizedPlanId);
  if (plan.monthlyPrice <= 0) {
    throw new Error("This plan does not require Stripe checkout.");
  }
  if (!priceId) {
    const envName = stripePriceEnvName(normalizedPlanId);
    throw new Error(`Stripe price is not configured. Missing ${envName}.`);
  }
  if (!user.business_id) {
    throw new Error("Business account is required before checkout.");
  }

  const body = new URLSearchParams({
    mode: "subscription",
    success_url: `${appBaseUrl()}/subscription?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appBaseUrl()}/subscription?stripe=cancelled`,
    client_reference_id: user.business_id,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "metadata[business_id]": user.business_id,
    "metadata[user_id]": user.id,
    "metadata[plan_id]": normalizedPlanId,
    "subscription_data[metadata][business_id]": user.business_id,
    "subscription_data[metadata][user_id]": user.id,
    "subscription_data[metadata][plan_id]": normalizedPlanId,
    allow_promotion_codes: "true"
  });

  if (customerId) {
    body.set("customer", customerId);
  } else {
    body.set("customer_email", user.email);
  }

  return stripeRequest<{ id: string; url?: string | null }>("/checkout/sessions", {
    method: "POST",
    body
  });
}

export async function createStripePortalSession(customerId: string) {
  if (!customerId) throw new Error("Stripe customer is missing.");
  return stripeRequest<{ id: string; url?: string | null }>("/billing_portal/sessions", {
    method: "POST",
    body: new URLSearchParams({
      customer: customerId,
      return_url: `${appBaseUrl()}/subscription`
    })
  });
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscriptionPayload>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null) {
  const webhookSecret = envValue("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) throw new Error("Stripe webhook is not configured. Missing STRIPE_WEBHOOK_SECRET.");
  if (!signatureHeader) throw new Error("Missing Stripe signature.");

  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split("=");
    if (!key || !value) return acc;
    acc[key] = [...(acc[key] || []), value];
    return acc;
  }, {});
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || signatures.length === 0) throw new Error("Invalid Stripe signature.");

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const valid = signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature);
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  });

  if (!valid) throw new Error("Invalid Stripe signature.");
}

export function mapStripeSubscriptionStatus(status: string): "trialing" | "active" | "past_due" | "paused" | "cancelled" {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "paused") return "paused";
  if (status === "canceled") return "cancelled";
  return "past_due";
}

export function stripeTimestampToIso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}
