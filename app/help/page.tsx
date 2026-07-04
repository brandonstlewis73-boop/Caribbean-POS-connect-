import { AppShell } from "@/components/layout/AppShell";
import { HelpSupportClient } from "@/components/help/HelpSupportClient";
import { aiSupportStatus } from "@/lib/ai-support";
import { getBusinessSettings } from "@/lib/data";
import { databaseConfigStatus } from "@/lib/db";
import { requirePagePermission } from "@/lib/page-auth";
import { hasPermission } from "@/lib/permissions";
import { listHelpArticles, listSupportTickets } from "@/lib/support";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HelpSupportPage() {
  const user = await requirePagePermission("support:read");
  const canManage = hasPermission(user.role, "support:manage");
  const [settings, articles, tickets] = await Promise.all([
    getBusinessSettings(user.business_id),
    listHelpArticles({ role: user.role, includeUnpublished: canManage }),
    listSupportTickets({ role: user.role, userId: user.id, businessId: user.business_id })
  ]);
  const dbStatus = databaseConfigStatus();

  return (
    <AppShell active="Help & Support" title="Help & Support" user={user} settings={settings}>
      <HelpSupportClient
        articles={articles}
        tickets={tickets}
        user={user}
        settings={settings}
        canManage={canManage}
        aiStatus={aiSupportStatus()}
        systemStatus={{
          databaseConfigured: dbStatus.hasDatabaseUrl || dbStatus.hasSupabaseDbUrl,
          nodeEnv: dbStatus.nodeEnv,
          vercelEnv: dbStatus.vercelEnv
        }}
      />
    </AppShell>
  );
}
