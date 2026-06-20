import { AppShell } from "@/components/layout/AppShell";
import { PrinterSettingsClient } from "@/components/printer/PrinterSettingsClient";
import { getBusinessSettings } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function PrinterPage() {
  const user = await requirePagePermission("orders:read");
  const settings = await getBusinessSettings(user.business_id);
  return (
    <AppShell active="Printer" title="Printer & Receipts">
      <PrinterSettingsClient settings={settings} />
    </AppShell>
  );
}
