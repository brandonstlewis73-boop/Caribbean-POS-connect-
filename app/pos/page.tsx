import { AppShell } from "@/components/layout/AppShell";
import { POSClient } from "@/components/pos/POSClient";
import { getBusinessSettings, listCustomers, listProducts, listUsers } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function POSPage() {
  const user = await requirePagePermission("pos:sell");
  const [products, customers, settings, drivers] = await Promise.all([
    listProducts(undefined, false, user.business_id),
    listCustomers(undefined, user.business_id),
    getBusinessSettings(user.business_id),
    listUsers("driver", false, user.business_id)
  ]);
  return (
    <AppShell active="POS" title="POS checkout">
      <POSClient
        products={products}
        customers={customers}
        settings={settings}
        drivers={drivers}
      />
    </AppShell>
  );
}
