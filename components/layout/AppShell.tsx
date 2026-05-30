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
    <AppShellClient active={active} title={title} actions={actions} currency={currency} market={market}>
      {children}
    </AppShellClient>
  );
}
