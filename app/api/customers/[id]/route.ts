import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteCustomer, getCustomerProfile, updateCustomer } from "@/lib/data";
import { customerInputSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "customers:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  try {
    const profile = await getCustomerProfile(id);
    return profile ? ok(profile) : fail("Customer not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Customer could not be loaded.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "customers:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = customerInputSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid customer update", 422, parsed.error.flatten());
  const { id } = await params;
  try {
    const customer = await updateCustomer(id, parsed.data, auth.user.id);
    return customer ? ok({ customer }) : fail("Customer not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Customer could not be saved.", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "customers:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  try {
    const customer = await deleteCustomer(id, auth.user.id);
    return customer ? ok({ customer }) : fail("Customer not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Customer could not be deleted.", 500);
  }
}
