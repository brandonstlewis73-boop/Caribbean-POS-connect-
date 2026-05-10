import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteBusiness } from "@/lib/data";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  try {
    const business = await deleteBusiness(id, auth.user.id);
    return business ? ok({ business }) : fail("Business profile not found.", 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Business profile could not be deleted.";
    const status = message.includes("cannot be deleted") || message.includes("Keep at least") || message.includes("Switch to another") ? 400 : 500;
    return fail(message, status);
  }
}
