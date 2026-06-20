import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getExchangeRate } from "@/lib/exchange-rates";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "dashboard:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const body = await request.json().catch(() => ({}));
  const fromCurrency = typeof body.fromCurrency === "string" ? body.fromCurrency : "TTD";
  const toCurrency = typeof body.toCurrency === "string" ? body.toCurrency : "USD";
  const amount = Number(body.amount || 100);
  const result = await getExchangeRate(fromCurrency, toCurrency);
  return ok({
    ...result,
    amount,
    convertedAmount: result.rate ? Number((amount * result.rate).toFixed(2)) : null
  });
}
