import { limitRequest } from "@/lib/rate-limit";
import { readBoundedJson } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geocoding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = await limitRequest(request, "geocoding", 60, 60);
  if (limited) return limited;
  const body = await readBoundedJson(request) as { lat?: unknown; lng?: unknown } | null;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ ok: false, error: "Valid latitude and longitude are required." }, { status: 422 });
  }

  const result = await reverseGeocode(lat, lng);
  return NextResponse.json({
    ok: true,
    address: result.address,
    provider: result.provider
  });
}
