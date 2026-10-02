import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getCurrentSubscription, listSubscriptionPlans, updateSubscriptionPlan } from "@/lib/data";
import { canChangeSubscriptionManually } from "@/lib/billing-policy";
import { normalizePlanId } from "@/lib/plan-gating";
import { paypalConfigStatus } from "@/lib/paypal";
import type { SubscriptionPlanId } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const paypal = paypalConfigStatus();
  return ok({
    plans: await listSubscriptionPlans(),
    subscription: await getCurrentSubscription(auth.user.business_id),
    paymentProvidersReady: { paypal: paypal.configured }
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const body = await request.json().catch(() => null);
  const rawPlanId = typeof body?.plan_id === "string" ? body.plan_id : "";
  if (!rawPlanId || (normalizePlanId(rawPlanId) !== rawPlanId && rawPlanId !== "free" && rawPlanId !== "business")) {
    return fail("Select a valid subscription plan.", 422);
  }
  const current = await getCurrentSubscription(auth.user.business_id);
  if (!canChangeSubscriptionManually(rawPlanId, current?.provider)) {
    return fail("Use billing checkout or Manage billing to change a paid subscription. Contact support for Enterprise access.", 403);
  }
  const planId = normalizePlanId(rawPlanId) as SubscriptionPlanId;
  const subscription = await updateSubscriptionPlan(planId, auth.user.id);
  return subscription ? ok({ subscription }) : fail("Subscription could not be updated.", 400);
}
