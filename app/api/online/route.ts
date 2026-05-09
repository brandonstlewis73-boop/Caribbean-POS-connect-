import { NextResponse } from "next/server";
import { defaultSettings, getSettings, listProducts } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [products, settings] = await Promise.all([listProducts(), getSettings()]);
    return NextResponse.json({
      data: {
        products,
        settings,
        statusMessage: null
      }
    });
  } catch {
    return NextResponse.json({
      data: {
        products: [],
        settings: defaultSettings,
        statusMessage: "Database status unavailable during build"
      }
    });
  }
}
