import { AppShell } from "@/components/layout/AppShell";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getSettings, listUsers } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function SettingsPage() {
  await requirePagePermission("settings:write");
  const [settings, staff] = await Promise.all([getSettings(), listUsers()]);
  return (
    <AppShell active="Settings" title="Settings">
      <SettingsClient settings={settings} staff={staff} />
    </AppShell>
  );
}
