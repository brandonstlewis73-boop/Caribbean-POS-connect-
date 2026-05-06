import { AppShell } from "@/components/layout/AppShell";
import { POSClient } from "@/components/pos/POSClient";
import { getSettings, listCustomers, listProducts, listUsers } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function POSPage() {
  await requirePagePermission("pos:sell");
  const [products, customers, settings, drivers] = await Promise.all([
    listProducts(),
    listCustomers(),
    getSettings(),
    listUsers("driver")
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
