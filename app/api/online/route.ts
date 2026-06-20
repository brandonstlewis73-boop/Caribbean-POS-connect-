import { NextRequest, NextResponse } from "next/server";
import { defaultSettings } from "@/lib/data";
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

export async function GET(request: NextRequest) {
  const localized = localizeOnlineSettings({ ...defaultSettings, logo_url: null, active_business_id: null }, countryFromRequest(request));
  const response = NextResponse.json({
    data: {
      products: [],
      categories: [],
      settings: localized.settings,
      market: localized.market,
      statusMessage: "Your storefront is not set up yet. Add your business profile, logo, categories, and products to publish your store."
    }
  });
  response.headers.set("Vary", "x-vercel-ip-country, cf-ipcountry, x-country-code");
  return response;
}