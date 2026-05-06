import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDeliveries } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "deliveries:read_assigned");
  if (!auth.user) return fail(auth.error, auth.status);
  return ok({ deliveries: await getDeliveries(auth.user) });
}
