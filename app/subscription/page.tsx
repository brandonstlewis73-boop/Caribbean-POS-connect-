import { AppShell } from "@/components/layout/AppShell";
import { SubscriptionClient } from "@/components/subscription/SubscriptionClient";
import { getCurrentSubscription, listSubscriptionPlans } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function SubscriptionPage() {
  await requirePagePermission("settings:write");
  const [subscription, plans] = await Promise.all([getCurrentSubscription(), listSubscriptionPlans()]);
  return (
    <AppShell active="Subscription" title="Subscription & Billing">
      <SubscriptionClient
        plans={plans}
        subscription={subscription}
        paymentProvidersReady={{
          stripe: Boolean(process.env.STRIPE_SECRET_KEY),
          paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
          wipay: Boolean(process.env.WIPAY_ACCOUNT_NUMBER || process.env.WIPAY_API_KEY)
        }}
      />
    </AppShell>
  );
}
