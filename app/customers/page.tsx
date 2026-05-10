import { AppShell } from "@/components/layout/AppShell";
import { CustomersClient } from "@/components/customers/CustomersClient";
import { getSettings, listCustomers } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function CustomersPage() {
  await requirePagePermission("customers:read");
  const [customers, settings] = await Promise.all([listCustomers(), getSettings()]);
  return (
    <AppShell active="Customers" title="Customers">
      <CustomersClient customers={customers} currency={settings.currency} />
    </AppShell>
  );
}
