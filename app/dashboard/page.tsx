import { AppShell } from "@/components/layout/AppShell";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { getDashboardData } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function DashboardPage() {
  const user = await requirePagePermission("dashboard:read");
  const data = await getDashboardData(user.business_id);
  return (
    <AppShell active="Dashboard" title="Business overview" user={user}>
      <DashboardHome data={data} />
    </AppShell>
  );
}
