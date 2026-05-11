export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers } from "next/headers";
import { OnlineOrderClient } from "@/components/orders/OnlineOrderClient";
import { defaultSettings } from "@/lib/data";
import { localizeOnlineSettings } from "@/lib/online-market";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OnlineOrderPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const emptyParams: Record<string, string | string[] | undefined> = {};
  const [params, requestHeaders] = await Promise.all([searchParams || Promise.resolve(emptyParams), headers()]);
  const country =
    firstParam(params.country) ||
    firstParam(params.market) ||
    requestHeaders.get("x-vercel-ip-country") ||
    requestHeaders.get("cf-ipcountry") ||
    requestHeaders.get("x-country-code");
  const localized = localizeOnlineSettings(defaultSettings, country);

  return (
    <OnlineOrderClient
      products={[]}
      settings={localized.settings}
      market={localized.market}
      initialStatusMessage="Loading online menu..."
    />
  );
}
