import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteStaffUser, updateStaffUser } from "@/lib/data";
import { staffUserSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "staff:manage");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = staffUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid staff profile", 422, parsed.error.flatten());
  const { id } = await params;
  try {
    const staff = await updateStaffUser(id, parsed.data, auth.user.id);
    return staff ? ok({ staff }) : fail("Staff profile not found.", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Staff profile could not be saved.", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "staff:manage");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  if (id === auth.user.id) return fail("You cannot delete your own signed-in staff profile.", 400);
  try {
    const staff = await deleteStaffUser(id, auth.user.id);
    return staff ? ok({ staff }) : fail("Staff profile not found.", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Staff profile could not be deleted.", 500);
  }
}
