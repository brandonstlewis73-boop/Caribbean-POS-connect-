import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createCustomer, listCustomers } from "@/lib/data";
import { customerInputSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "customers:read");
  if (!auth.user) return fail(auth.error, auth.status);
  try {
    return ok({ customers: await listCustomers(request.nextUrl.searchParams.get("q") || undefined) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Customers could not be loaded.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "customers:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = customerInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid customer data", 422, parsed.error.flatten());
  try {
    const customer = await createCustomer(parsed.data, auth.user.id);
    return customer ? ok({ customer }, { status: 201 }) : fail("Customer name, phone, or email is required.", 422);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Customer could not be saved.", 500);
  }
}
