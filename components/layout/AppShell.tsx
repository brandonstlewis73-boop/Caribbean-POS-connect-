import { getDefaultCountryForCurrency } from "@/lib/constants";
import { getBusinessSettings } from "@/lib/data";
import { getSessionUserFromRequest } from "@/lib/auth";
import type { Settings, User } from "@/lib/types";
import { AppShellClient } from "./AppShellClient";

export async function AppShell({
  active,
  title,
  children,
  actions,
  user: providedUser,
  settings: providedSettings
}: {
  active: string;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  user?: User | null;
  settings?: Settings | null;
}) {
  const user =
    providedUser === undefined ? await getSessionUserFromRequest() : providedUser;
  const settings =
    providedSettings === undefined
      ? await getBusinessSettings(user?.business_id).catch(() => null)
      : providedSettings;
  const currency = settings?.currency || "";
  const market = settings?.business_country || (currency ? getDefaultCountryForCurrency(currency) : "Set country/currency");

  return (
    <AppShellClient
      active={active}
      title={title}
      actions={actions}
      businessId={user?.business_id || null}
      businessName={settings?.business_name || null}
      businessLogoUrl={settings?.logo_url || null}
      currency={currency || "Set currency"}
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
