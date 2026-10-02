import { normalizePlanId } from "./plan-gating";

/** Paid entitlements must come from billing, including zero-price Enterprise. */
export function canChangeSubscriptionManually(planId: string, provider?: string | null): boolean {
  return (planId === "trial" || planId === "free") &&
    normalizePlanId(planId) === "trial" && provider !== "stripe" && provider !== "paypal";
}
