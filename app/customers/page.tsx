import { AppShell } from "@/components/layout/AppShell";
import { CustomersClient } from "@/components/customers/CustomersClient";
import { getBusinessSettings, listCustomers } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function CustomersPage() {
  const user = await requirePagePermission("customers:read");
  const [customers, settings] = await Promise.all([
    listCustomers(undefined, user.business_id),
    getBusinessSettings(user.business_id)
  ]);
  return (
    <AppShell active="Customers" title="Customers" user={user} settings={settings}>
      <CustomersClient customers={customers} currency={settings.currency} />
    </AppShell>
  );
}
