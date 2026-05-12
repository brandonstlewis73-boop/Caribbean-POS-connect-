import { AppShell } from "@/components/layout/AppShell";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getBusinessSettings, listBusinesses, listUsers } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function SettingsPage() {
  const user = await requirePagePermission("settings:write");
  const [settings, staff, businesses] = await Promise.all([
    getBusinessSettings(user.business_id),
    listUsers(undefined, true, user.business_id),
    listBusinesses(user.id)
  ]);
  return (
    <AppShell active="Settings" title="Settings">
      <SettingsClient settings={settings} staff={staff} businesses={businesses} />
    </AppShell>
  );
}
