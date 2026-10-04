import { AiBusinessOSClient } from "@/components/ai/AiBusinessOSClient";
import { AppShell } from "@/components/layout/AppShell";
import { aiBusinessStatus } from "@/lib/ai-business";
import { getBusinessSettings, getPlanUsageSummary } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiBusinessOSPage() {
  const user = await requirePagePermission("support:read");
  const [usage, settings] = await Promise.all([getPlanUsageSummary(user.business_id), getBusinessSettings(user.business_id)]);
  const status = aiBusinessStatus(usage.planId);

  return (
    <AppShell active="AI Tools" title={settings.business_name || "Caribbean POS Connect"} user={user} settings={settings}>
      <AiBusinessOSClient usage={usage} aiStatus={status} userName={user.name} />
    </AppShell>
  );
}
