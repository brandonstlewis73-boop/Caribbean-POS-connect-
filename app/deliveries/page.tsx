import { AppShell } from "@/components/layout/AppShell";
import { DeliveriesClient } from "@/components/deliveries/DeliveriesClient";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";
import { getBusinessSettings, getDeliveries, getSubscriptionPlanId } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";
import { hasPermission } from "@/lib/permissions";
import { canUseFeature } from "@/lib/plan-gating";

export default async function DeliveriesPage() {
  const user = await requirePagePermission("deliveries:read_assigned");
  const planId = await getSubscriptionPlanId(user.business_id);
  const deliveryGate = canUseFeature(planId, "delivery");
  if (!deliveryGate.allowed) {
    return (
      <AppShell active="Deliveries" title="Deliveries" user={user}>
        <UpgradeRequired
          title="Delivery management is locked"
          description="Delivery boards, driver route assistance, Waze links, and delivery assignment tools are available on paid plans."
          currentPlan={deliveryGate.currentPlan}
          requiredPlan={deliveryGate.requiredPlan}
        />
      </AppShell>
    );
  }
  const [deliveries, settings] = await Promise.all([getDeliveries(user), getBusinessSettings(user.business_id)]);
  return (
    <AppShell active="Deliveries" title="Deliveries" user={user} settings={settings}>
      <DeliveriesClient deliveries={deliveries} currency={settings.currency} autoEstimate={user.role === "driver"} canEditDetails={hasPermission(user.role, "orders:update")} origin={settings.business_latitude != null && settings.business_longitude != null ? { latitude: settings.business_latitude, longitude: settings.business_longitude } : null} />
    </AppShell>
  );
}
