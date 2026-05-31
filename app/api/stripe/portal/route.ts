import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getCurrentSubscription } from "@/lib/data";
import { createStripePortalSession } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);

  const current = await getCurrentSubscription(auth.user.business_id);
  if (!current?.provider_customer_id || current.provider !== "stripe") {
    return fail("No Stripe customer is linked to this business yet. Start checkout first.", 422);
  }

  try {
    const session = await createStripePortalSession(current.provider_customer_id);
    if (!session.url) return fail("Stripe billing portal did not return a redirect URL.", 502);
    return ok({ url: session.url });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Stripe billing portal could not be opened.", 502);
  }
}
