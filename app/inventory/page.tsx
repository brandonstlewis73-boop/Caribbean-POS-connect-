import { AppShell } from "@/components/layout/AppShell";
import { InventoryClient } from "@/components/inventory/InventoryClient";
import { getBusinessSettings, listProducts } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function InventoryPage() {
  const user = await requirePagePermission("inventory:read");
  const [products, settings] = await Promise.all([
    listProducts(undefined, true, user.business_id),
    getBusinessSettings(user.business_id)
  ]);
  return (
    <AppShell active="Inventory" title="Inventory">
      <InventoryClient products={products} currency={settings.currency} />
    </AppShell>
  );
}
