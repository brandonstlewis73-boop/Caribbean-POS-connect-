import { CURRENCY_CODE, getDefaultCountryForCurrency } from "@/lib/constants";
import { getSettings } from "@/lib/data";
import { AppShellClient } from "./AppShellClient";

export async function AppShell({
  active,
  title,
  children,
  actions
}: {
  active: string;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const settings = await getSettings().catch(() => null);
  const currency = settings?.currency || CURRENCY_CODE;
  const market = getDefaultCountryForCurrency(currency);

  return (
    <AppShellClient
      active={active}
      title={title}
      actions={actions}
      currency={currency}
      market={market}
      orderAlertsEnabled={settings?.new_order_alerts_enabled !== false}
      orderAlertSoundEnabled={settings?.new_order_sound_enabled !== false}
      orderBrowserNotificationsEnabled={Boolean(settings?.new_order_browser_notifications_enabled)}
      orderAlertPreviewEnabled={settings?.new_order_alert_preview_enabled !== false}
    >
      {children}
    </AppShellClient>
  );
}
