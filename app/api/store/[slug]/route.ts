import { NextRequest, NextResponse } from "next/server";
import { getBusinessBySlug, getBusinessSettings, getSubscriptionPlanId, listCategories, listProducts } from "@/lib/data";
import { canUseFeature } from "@/lib/plan-gating";
import { localizeOnlineSettings } from "@/lib/online-market";
import { publicStoreName, withPublicStoreIdentity } from "@/lib/storefront-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function countryFromRequest(request: NextRequest) {
  return (
    request.nextUrl.searchParams.get("country") ||
    request.nextUrl.searchParams.get("market") ||
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code")
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) {
    return NextResponse.json({ error: "Storefront not found" }, { status: 404 });
  }
  const [products, settings, categories, planId] = await Promise.all([
    listProducts(undefined, false, business.id),
    getBusinessSettings(business.id),
    listCategories(undefined, false, business.id),
    getSubscriptionPlanId(business.id)
  ]);
  const threeDGate = canUseFeature(planId, "threeDStorefront");
  const localized = localizeOnlineSettings({ ...settings, storefront_3d_enabled: Boolean(settings.storefront_3d_enabled && threeDGate.allowed) }, countryFromRequest(request));
  const publicSettings = withPublicStoreIdentity({ ...localized.settings, business_name: business.name || localized.settings.business_name }, slug);
  const publicBusinessName = publicSettings.business_name || publicStoreName(business.name, slug);
  const response = NextResponse.json({
    data: {
      business: { ...business, name: publicBusinessName, legal_name: publicBusinessName },
      products,
      categories,
      settings: publicSettings,
      market: localized.market,
      statusMessage: null
    }
  });
  response.headers.set("Vary", "x-vercel-ip-country, cf-ipcountry, x-country-code");
  return response;
}
