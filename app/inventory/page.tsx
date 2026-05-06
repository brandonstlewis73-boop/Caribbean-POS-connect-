import { AppShell } from "@/components/layout/AppShell";
import { InventoryClient } from "@/components/inventory/InventoryClient";
import { listProducts } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function InventoryPage() {
  await requirePagePermission("inventory:read");
  const products = await listProducts(undefined, true);
  return (
    <AppShell active="Inventory" title="Inventory">
      <InventoryClient products={products} />
    </AppShell>
  );
}
