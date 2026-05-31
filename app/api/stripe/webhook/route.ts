import { NextRequest, NextResponse } from "next/server";
import { syncStripeSubscription } from "@/lib/data";
import {
  mapStripeSubscriptionStatus,
  retrieveStripeSubscription,
  stripeTimestampToIso,
  verifyStripeWebhookSignature,
  type StripeSubscriptionPayload
} from "@/lib/stripe";

export const runtime = "nodejs";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, any>;
  };
};

async function syncSubscription(subscription: StripeSubscriptionPayload, fallback?: Record<string, string | undefined>) {
  const metadata = subscription.metadata || {};
  const businessId = metadata.business_id || fallback?.business_id || "";
  const planId = metadata.plan_id || fallback?.plan_id || "";
  if (!businessId || !planId) {
    console.warn("Stripe subscription sync skipped: missing business_id or plan_id metadata.");
    return;
  }

  await syncStripeSubscription({
    businessId,
    planId,
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    currentPeriodStart: stripeTimestampToIso(subscription.current_period_start),
    currentPeriodEnd: stripeTimestampToIso(subscription.current_period_end),
    trialEndsAt: stripeTimestampToIso(subscription.trial_end),
    metadata: {
      stripe_status: subscription.status,
      synced_from: "stripe_webhook"
    }
  });
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  try {
    verifyStripeWebhookSignature(payload, request.headers.get("stripe-signature"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook signature." },
      { status: 400 }
    );
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook payload." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
      if (subscriptionId) {
        const subscription = await retrieveStripeSubscription(subscriptionId);
        await syncSubscription(subscription, {
          business_id: session.metadata?.business_id || session.client_reference_id,
          plan_id: session.metadata?.plan_id
        });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncSubscription(event.data.object as StripeSubscriptionPayload);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Stripe webhook processing failed." }, { status: 500 });
  }
}
