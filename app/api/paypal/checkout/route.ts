import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { reservePayPalCheckout } from "@/lib/paypal-data";
import { appBillingUrl, approvalUrl, paidPayPalPlans, paypalConfigStatus, paypalPlanId, paypalReference, paypalRequest, validatePayPalPlan, type PayPalPlan } from "@/lib/paypal";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);
  if (!auth.user.business_id) return fail("Billing account unavailable.", 403);
  const body = await request.json().catch(() => null);
  const planId = body?.plan_id === "business" ? "premium" : body?.plan_id;
  if (!paidPayPalPlans.includes(planId)) return fail("Select a paid subscription plan.", 422);
  if (!paypalConfigStatus().configured) return fail("PayPal checkout is being set up. Please contact support.", 503);
  try {
    await validatePayPalPlan(planId as PayPalPlan);
    const attempt = await reservePayPalCheckout(auth.user.business_id, planId);
    const subscription = await paypalRequest<{ links: { rel: string; href: string }[] }>("/v1/billing/subscriptions", { method: "POST", headers: { "PayPal-Request-Id": attempt }, body: JSON.stringify({ plan_id: paypalPlanId(planId), custom_id: paypalReference(attempt), application_context: { brand_name: "Caribbean POS Connect", user_action: "SUBSCRIBE_NOW", return_url: appBillingUrl("/api/paypal/return"), cancel_url: appBillingUrl("/subscription?paypal=cancelled") } }) });
    return ok({ url: approvalUrl(subscription.links) });
  } catch (error) { return fail(error instanceof Error ? error.message : "PayPal checkout could not be started.", 502); }
}
