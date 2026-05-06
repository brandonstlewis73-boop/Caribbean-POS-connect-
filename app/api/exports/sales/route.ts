import { NextRequest } from "next/server";
import { fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { exportSalesCsv } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "reports:read");
  if (!auth.user) return fail(auth.error, auth.status);
  return new Response(await exportSalesCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=caribbean-pos-sales.csv"
    }
  });
}
