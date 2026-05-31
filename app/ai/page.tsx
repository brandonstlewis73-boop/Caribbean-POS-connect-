import { AiBusinessOSClient } from "@/components/ai/AiBusinessOSClient";
import { AppShell } from "@/components/layout/AppShell";
import { aiBusinessStatus } from "@/lib/ai-business";
import { getPlanUsageSummary } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiBusinessOSPage() {
  const user = await requirePagePermission("support:read");
  const usage = await getPlanUsageSummary(user.business_id);
  const status = aiBusinessStatus(usage.planId);

  return (
    <AppShell active="AI Tools" title="AI Business OS">
      <AiBusinessOSClient usage={usage} aiStatus={status} />
    </AppShell>
  );
}
