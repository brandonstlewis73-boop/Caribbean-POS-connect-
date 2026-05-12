import { AppShell } from "@/components/layout/AppShell";
import { OrdersClient } from "@/components/orders/OrdersClient";
import { getBusinessSettings, listOrders, listUsers } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";
import { hasPermission } from "@/lib/permissions";

export default async function OrdersPage() {
  const user = await requirePagePermission("orders:read");
  const [orders, drivers, settings] = await Promise.all([
    listOrders({ driverId: user.role === "driver" ? user.id : undefined, businessId: user.business_id }),
    listUsers("driver", false, user.business_id),
    getBusinessSettings(user.business_id)
  ]);
  return (
    <AppShell active="Orders" title="Orders">
      <OrdersClient
        orders={orders}
        drivers={drivers}
        canUpdateOrders={hasPermission(user.role, "orders:update")}
        currency={settings.currency}
      />
    </AppShell>
  );
}
