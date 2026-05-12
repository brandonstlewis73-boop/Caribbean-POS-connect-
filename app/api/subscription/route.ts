import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getCurrentSubscription, listSubscriptionPlans, updateSubscriptionPlan } from "@/lib/data";
import type { SubscriptionPlanId } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);
  return ok({
    plans: listSubscriptionPlans(),
    subscription: await getCurrentSubscription(auth.user.business_id),
    paymentProvidersReady: {
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
      wipay: Boolean(process.env.WIPAY_ACCOUNT_NUMBER || process.env.WIPAY_API_KEY)
    }
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const body = await request.json().catch(() => null);
  const planId = body?.plan_id as SubscriptionPlanId | undefined;
  if (!planId || !["free_demo", "starter", "pro", "premium", "business"].includes(planId)) {
    return fail("Select a valid subscription plan.", 422);
  }
  const subscription = await updateSubscriptionPlan(planId, auth.user.id);
  return subscription ? ok({ subscription }) : fail("Subscription could not be updated.", 400);
}
