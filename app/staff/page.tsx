import { AppShell } from "@/components/layout/AppShell";
import { StaffClient } from "@/components/staff/StaffClient";
import { listUsers } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function StaffPage() {
  const user = await requirePagePermission("staff:manage");
  const staff = await listUsers(undefined, true, user.business_id);
  return (
    <AppShell active="Staff" title="Staff Management">
      <StaffClient staff={staff} />
    </AppShell>
  );
}
