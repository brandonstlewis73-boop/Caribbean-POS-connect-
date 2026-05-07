import { AppShell } from "@/components/layout/AppShell";
import { PrinterSettingsClient } from "@/components/printer/PrinterSettingsClient";
import { getSettings } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function PrinterPage() {
  await requirePagePermission("orders:read");
  const settings = await getSettings();
  return (
    <AppShell active="Printer" title="Printer & Receipts">
      <PrinterSettingsClient settings={settings} />
    </AppShell>
  );
}
