import { AppShell } from "@/components/layout/AppShell";
import { SubscriptionClient } from "@/components/subscription/SubscriptionClient";
import { getCurrentSubscription, getPlanUsageSummary, listSubscriptionPlans } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function SubscriptionPage() {
  const user = await requirePagePermission("settings:write");
  const [subscription, plans, usageSummary] = await Promise.all([
    getCurrentSubscription(user.business_id),
    listSubscriptionPlans(),
    getPlanUsageSummary(user.business_id)
  ]);
  return (
    <AppShell active="Subscription" title="Subscription & Billing">
      <SubscriptionClient
        plans={plans}
        subscription={subscription}
        usageSummary={usageSummary}
        paymentProvidersReady={{
          stripe: Boolean(process.env.STRIPE_SECRET_KEY),
          paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
          wipay: Boolean(process.env.WIPAY_ACCOUNT_NUMBER || process.env.WIPAY_API_KEY)
        }}
      />
    </AppShell>
  );
}
