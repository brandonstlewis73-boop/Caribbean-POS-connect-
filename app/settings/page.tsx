import { AppShell } from "@/components/layout/AppShell";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { getBusinessSettings, getCurrentSubscription, getPlanUsageSummary, listBusinesses, listCategories, listUsers } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function SettingsPage() {
  const user = await requirePagePermission("settings:write");
  const [settings, staff, businesses, categories, subscription, planUsage] = await Promise.all([
    getBusinessSettings(user.business_id),
    listUsers(undefined, true, user.business_id),
    listBusinesses(user.id),
    listCategories(undefined, true, user.business_id),
    getCurrentSubscription(user.business_id),
    getPlanUsageSummary(user.business_id)
  ]);
  return (
    <AppShell active="Settings" title="Settings" user={user} settings={settings}>
      <SettingsClient
        settings={settings}
        staff={staff}
        businesses={businesses}
        categories={categories}
        subscription={subscription}
        planUsage={planUsage}
      />
    </AppShell>
  );
}
