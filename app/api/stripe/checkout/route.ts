import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getCurrentSubscription } from "@/lib/data";
import { normalizePlanId } from "@/lib/plan-gating";
import { createStripeCheckoutSession, stripeConfigStatus } from "@/lib/stripe";
import type { SubscriptionPlanId } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);

  const body = await request.json().catch(() => null);
  const rawPlanId = typeof body?.plan_id === "string" ? body.plan_id : "";
  const planId = normalizePlanId(rawPlanId) as SubscriptionPlanId;
  if (!rawPlanId || planId === "trial") {
    return fail("Select a paid plan for Stripe checkout.", 422);
  }

  const stripeStatus = stripeConfigStatus();
  if (!stripeStatus.configured) {
    return fail("Stripe is not configured. Add STRIPE_SECRET_KEY and Stripe price IDs in Vercel, then redeploy.", 503, {
      missing: stripeStatus.missing
    });
  }

  try {
    const current = await getCurrentSubscription(auth.user.business_id);
    const session = await createStripeCheckoutSession({
      user: auth.user,
      planId,
      customerId: current?.provider === "stripe" ? current.provider_customer_id : null
    });
    if (!session.url) return fail("Stripe checkout did not return a redirect URL.", 502);
    return ok({ url: session.url, sessionId: session.id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Stripe checkout could not be started.", 502);
  }
}
