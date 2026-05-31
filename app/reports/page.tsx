import { AppShell } from "@/components/layout/AppShell";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";
import { getDashboardData, getSubscriptionPlanId } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";
import { canUseFeature } from "@/lib/plan-gating";

export default async function ReportsPage() {
  const user = await requirePagePermission("reports:read");
  const planId = await getSubscriptionPlanId(user.business_id);
  const reportsGate = canUseFeature(planId, "reports");
  if (!reportsGate.allowed) {
    return (
      <AppShell active="Reports" title="Reports">
        <UpgradeRequired
          title="Reports are locked"
          description="Sales reports, customer summaries, payment breakdowns, and cashier performance unlock on Starter and higher plans."
          currentPlan={reportsGate.currentPlan}
          requiredPlan={reportsGate.requiredPlan}
        />
      </AppShell>
    );
  }
  const data = await getDashboardData(user.business_id);
  return (
    <AppShell active="Reports" title="Reports">
      <ReportsClient data={data} />
    </AppShell>
  );
}
