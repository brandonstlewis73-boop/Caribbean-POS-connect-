import { AppShell } from "@/components/layout/AppShell";
import { ReceiptsClient } from "@/components/receipts/ReceiptsClient";
import { getSettings, listReceipts } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";
import { hasPermission } from "@/lib/permissions";

export default async function ReceiptsPage() {
  const user = await requirePagePermission("orders:read");
  const [receipts, settings] = await Promise.all([listReceipts({ limit: 150 }), getSettings()]);
  return (
    <AppShell active="Receipts" title="Receipts">
      <ReceiptsClient
        receipts={receipts}
        currency={settings.currency}
        canResend={hasPermission(user.role, "orders:update")}
      />
    </AppShell>
  );
}
