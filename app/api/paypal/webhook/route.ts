import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getPayPalSubscription, paypalConfigStatus, paypalRequest } from "@/lib/paypal";
import { syncPayPalSubscription } from "@/lib/paypal-data";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!paypalConfigStatus().configured) return fail("Billing unavailable.", 503);
  const event = await request.json().catch(() => null);
  if (!event || !request.headers.get("paypal-transmission-id")) return fail("Invalid webhook.", 400);
  try {
    const verification = await paypalRequest<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", { method: "POST", body: JSON.stringify({ auth_algo: request.headers.get("paypal-auth-algo"), cert_url: request.headers.get("paypal-cert-url"), transmission_id: request.headers.get("paypal-transmission-id"), transmission_sig: request.headers.get("paypal-transmission-sig"), transmission_time: request.headers.get("paypal-transmission-time"), webhook_id: process.env.PAYPAL_WEBHOOK_ID, webhook_event: event }) });
    if (verification.verification_status !== "SUCCESS") return fail("Invalid webhook signature.", 400);
    const subscriptionEvent = typeof event.event_type === "string" && event.event_type.startsWith("BILLING.SUBSCRIPTION.");
    const paymentEvent = ["PAYMENT.SALE.COMPLETED", "PAYMENT.SALE.DENIED"].includes(event.event_type);
    if (!subscriptionEvent && !paymentEvent) return ok({ received: true });
    const id = subscriptionEvent ? event.resource?.id : event.resource?.billing_agreement_id;
    if (!id) return ok({ received: true });
    const remote = await getPayPalSubscription(id);
    // Ignore subscriptions created outside this application's checkout.
    if (!remote.custom_id?.startsWith("cpc:")) return ok({ received: true });
    await syncPayPalSubscription(remote);
    return ok({ received: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unrecognized PayPal subscription.") return ok({ received: true });
    return fail("Webhook could not be processed. Retry delivery.", 500);
  }
}
