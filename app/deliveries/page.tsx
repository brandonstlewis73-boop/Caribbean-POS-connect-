import { AppShell } from "@/components/layout/AppShell";
import { DeliveriesClient } from "@/components/deliveries/DeliveriesClient";
import { getDeliveries, getSettings } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function DeliveriesPage() {
  const user = await requirePagePermission("deliveries:read_assigned");
  const [deliveries, settings] = await Promise.all([getDeliveries(user), getSettings()]);
  return (
    <AppShell active="Deliveries" title="Deliveries">
      <DeliveriesClient deliveries={deliveries} currency={settings.currency} />
    </AppShell>
  );
}
