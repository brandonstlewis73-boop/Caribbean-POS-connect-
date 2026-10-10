export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { OnlineOrderClient } from "@/components/orders/OnlineOrderClient";
import { getBusinessBySlug, getBusinessSettings, getSubscriptionPlanId, listCategories, listProducts } from "@/lib/data";
import { canUseFeature } from "@/lib/plan-gating";
import { localizeOnlineSettings } from "@/lib/online-market";
import { withPublicStoreIdentity } from "@/lib/storefront-identity";
import { immersiveMerchantEnabled } from "@/lib/immersive/flag";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StorefrontPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, paramsValue, requestHeaders] = await Promise.all([
    params,
    searchParams || Promise.resolve({} as Record<string, string | string[] | undefined>),
    headers()
  ]);
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();
  const country =
    firstParam(paramsValue.country) ||
    firstParam(paramsValue.market) ||
    requestHeaders.get("x-vercel-ip-country") ||
    requestHeaders.get("cf-ipcountry") ||
    requestHeaders.get("x-country-code");
  const [products, settings, categories, planId] = await Promise.all([
    listProducts(undefined, false, business.id),
    getBusinessSettings(business.id),
    listCategories(undefined, false, business.id),
    getSubscriptionPlanId(business.id)
  ]);
  const threeDGate = canUseFeature(planId, "threeDStorefront");
  const localized = localizeOnlineSettings({ ...settings, storefront_3d_enabled: Boolean(settings.storefront_3d_enabled && threeDGate.allowed) }, country);
  const publicSettings = withPublicStoreIdentity({ ...localized.settings, business_name: business.name || localized.settings.business_name }, slug);

  return (
    <OnlineOrderClient
      products={products}
      categories={categories}
      settings={publicSettings}
      market={localized.market}
      menuEndpoint={`/api/store/${encodeURIComponent(slug)}`}
      orderEndpoint={`/api/store/${encodeURIComponent(slug)}/orders`}
      businessId={business.id}
      storefrontSlug={slug}
      refreshOnMount={false}
      immersiveEnabled={immersiveMerchantEnabled(slug, Boolean(settings.storefront_3d_enabled && threeDGate.allowed))}
    />
  );
}
