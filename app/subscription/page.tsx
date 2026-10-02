import { AppShell } from "@/components/layout/AppShell";
import { SubscriptionClient } from "@/components/subscription/SubscriptionClient";
import { getCurrentSubscription, getPlanUsageSummary, listSubscriptionPlans } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";
import { paypalConfigStatus } from "@/lib/paypal";
import { publicPlanId } from "@/lib/marketing-content";

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ plan?: string; paypal?: string }> }) {
  const selectedPlan = publicPlanId((await searchParams).plan);
  const user = await requirePagePermission("settings:write");
  const [subscription, plans, usageSummary] = await Promise.all([
    getCurrentSubscription(user.business_id),
    listSubscriptionPlans(),
    getPlanUsageSummary(user.business_id)
  ]);
  const paypal = paypalConfigStatus();
  return (
    <AppShell active="Subscription" title="Subscription & Billing" user={user}>
      <SubscriptionClient
        selectedPlan={selectedPlan}
        plans={plans}
        subscription={subscription}
        usageSummary={usageSummary}
        paymentProvidersReady={{ paypal: paypal.configured }}
        paypalResult={(await searchParams).paypal}
        paypalEnvironment={paypal.environment}
      />
    </AppShell>
  );
}
