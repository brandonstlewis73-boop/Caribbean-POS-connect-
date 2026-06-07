import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { generateTicketSummary, redactSensitiveText } from "@/lib/ai-support";
import { getBusinessSettings } from "@/lib/data";
import { createAiSupportLog, createSupportTicket, listSupportTickets } from "@/lib/support";
import { supportTicketSchema } from "@/lib/validators";

export const runtime = "nodejs";

const MAX_SCREENSHOT_LENGTH = 900_000;

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "support:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const url = new URL(request.url);
  const search = url.searchParams.get("q");
  return ok({
    tickets: await listSupportTickets({ role: auth.user.role, userId: auth.user.id, businessId: auth.user.business_id, search })
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "support:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = supportTicketSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid support ticket", 422, parsed.error.flatten());
  if (parsed.data.screenshot_url && parsed.data.screenshot_url.length > MAX_SCREENSHOT_LENGTH) {
    return fail("Screenshot is too large. Upload an image under 650 KB.", 413);
  }

  const [aiSummary, settings] = await Promise.all([
    generateTicketSummary(parsed.data),
    getBusinessSettings(auth.user.business_id).catch(() => null)
  ]);
  const ticket = await createSupportTicket(parsed.data, auth.user.id, auth.user.business_id, aiSummary);
  if (!ticket) return fail("Support ticket could not be created", 500);

  await createAiSupportLog({
    userId: auth.user.id,
    businessId: auth.user.business_id || settings?.active_business_id || null,
    question: redactSensitiveText(parsed.data.message).slice(0, 1200),
    responseSummary: redactSensitiveText(aiSummary.ai_summary).slice(0, 500),
    ticketId: ticket.id
  });

  return ok({ ticket }, { status: 201 });
}
