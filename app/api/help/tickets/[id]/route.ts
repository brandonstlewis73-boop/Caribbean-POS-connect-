import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateSupportTicket } from "@/lib/support";
import { supportTicketUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "support:manage");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = supportTicketUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid support ticket update", 422, parsed.error.flatten());
  const { id } = await params;
  const ticket = await updateSupportTicket(id, parsed.data, auth.user.business_id);
  return ticket ? ok({ ticket }) : fail("Support ticket not found", 404);
}
