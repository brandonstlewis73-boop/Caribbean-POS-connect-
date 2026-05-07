import { AppShell } from "@/components/layout/AppShell";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { getDashboardData } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function DashboardPage() {
  await requirePagePermission("dashboard:read");
  const data = await getDashboardData();
  return (
    <AppShell active="Dashboard" title="Back Office Dashboard">
      <DashboardHome data={data} />
    </AppShell>
  );
}
