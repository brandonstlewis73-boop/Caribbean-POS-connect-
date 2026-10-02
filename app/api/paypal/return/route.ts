import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { appBillingUrl, getPayPalSubscription } from "@/lib/paypal";
import { syncPayPalSubscription } from "@/lib/paypal-data";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user?.business_id) {
    const next = `/api/paypal/return?subscription_id=${encodeURIComponent(request.nextUrl.searchParams.get("subscription_id") || "")}`;
    return NextResponse.redirect(appBillingUrl(`/login?next=${encodeURIComponent(next)}`));
  }
  try {
    const remote = await getPayPalSubscription(request.nextUrl.searchParams.get("subscription_id") || "");
    const status = await syncPayPalSubscription(remote, auth.user.business_id);
    return NextResponse.redirect(appBillingUrl(`/subscription?paypal=${status === "active" ? "success" : "pending"}`));
  } catch { return NextResponse.redirect(appBillingUrl("/subscription?paypal=error")); }
}
