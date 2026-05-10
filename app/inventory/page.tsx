import { AppShell } from "@/components/layout/AppShell";
import { InventoryClient } from "@/components/inventory/InventoryClient";
import { getSettings, listProducts } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function InventoryPage() {
  await requirePagePermission("inventory:read");
  const [products, settings] = await Promise.all([listProducts(undefined, true), getSettings()]);
  return (
    <AppShell active="Inventory" title="Inventory">
      <InventoryClient products={products} currency={settings.currency} />
    </AppShell>
  );
}
