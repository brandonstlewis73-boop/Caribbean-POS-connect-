import { NextRequest, NextResponse } from "next/server";
import { defaultSettings, getSettings, listCategories, listProducts } from "@/lib/data";
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

function onlineJson(body: unknown) {
  const response = NextResponse.json(body);
  response.headers.set("Vary", "x-vercel-ip-country, cf-ipcountry, x-country-code");
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const [products, settings, categories] = await Promise.all([listProducts(), getSettings(), listCategories()]);
    const localized = localizeOnlineSettings(settings, countryFromRequest(request));
    return onlineJson({
      data: {
        products,
        categories,
        settings: localized.settings,
        market: localized.market,
        statusMessage: null
      }
    });
  } catch {
    const localized = localizeOnlineSettings(defaultSettings, countryFromRequest(request));
    return onlineJson({
      data: {
        products: [],
        categories: [],
        settings: localized.settings,
        market: localized.market,
        statusMessage: "Database status unavailable during build"
      }
    });
  }
}
