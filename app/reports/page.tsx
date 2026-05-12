import { AppShell } from "@/components/layout/AppShell";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { getDashboardData } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function ReportsPage() {
  const user = await requirePagePermission("reports:read");
  const data = await getDashboardData(user.business_id);
  return (
    <AppShell active="Reports" title="Reports">
      <ReportsClient data={data} />
    </AppShell>
  );
}
