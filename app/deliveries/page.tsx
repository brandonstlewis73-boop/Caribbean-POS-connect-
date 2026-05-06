import { AppShell } from "@/components/layout/AppShell";
import { DeliveriesClient } from "@/components/deliveries/DeliveriesClient";
import { getDeliveries } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function DeliveriesPage() {
  const user = await requirePagePermission("deliveries:read_assigned");
  const deliveries = await getDeliveries(user);
  return (
    <AppShell active="Deliveries" title="Deliveries">
      <DeliveriesClient deliveries={deliveries} />
    </AppShell>
  );
}
