import { AppShell } from "@/components/layout/AppShell";
import { InventoryClient } from "@/components/inventory/InventoryClient";
import { getBusinessSettings, listCategories, listProducts } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function InventoryPage() {
  const user = await requirePagePermission("inventory:read");
  const [products, categories, settings] = await Promise.all([
    listProducts(undefined, true, user.business_id),
    listCategories(undefined, true, user.business_id),
    getBusinessSettings(user.business_id)
  ]);
  return (
    <AppShell active="Inventory" title="Inventory">
      <InventoryClient products={products} categories={categories} currency={settings.currency} businessId={user.business_id || "unassigned"} />
    </AppShell>
  );
}
