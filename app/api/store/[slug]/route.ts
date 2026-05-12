import { NextRequest, NextResponse } from "next/server";
import { getBusinessBySlug, getBusinessSettings, listProducts } from "@/lib/data";
import { localizeOnlineSettings } from "@/lib/online-market";

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
  const [products, settings] = await Promise.all([
    listProducts(undefined, false, business.id),
    getBusinessSettings(business.id)
  ]);
  const localized = localizeOnlineSettings(settings, countryFromRequest(request));
  const response = NextResponse.json({
    data: {
      business,
      products,
      settings: localized.settings,
      market: localized.market,
      statusMessage: null
    }
  });
  response.headers.set("Vary", "x-vercel-ip-country, cf-ipcountry, x-country-code");
  return response;
}
