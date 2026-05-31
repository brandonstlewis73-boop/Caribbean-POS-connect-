import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { aiBusinessStatus, runAiBusinessTool } from "@/lib/ai-business";
import { AI_BUSINESS_TOOLS, type AiBusinessToolId } from "@/lib/ai-business-config";
import { PlanGateError, getPlanUsageSummary } from "@/lib/data";
import { aiBusinessToolSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "support:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const usage = await getPlanUsageSummary(auth.user.business_id);
  return ok({
    status: aiBusinessStatus(usage.planId),
    usage,
    tools: AI_BUSINESS_TOOLS
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "support:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = aiBusinessToolSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid AI request", 422, parsed.error.flatten());

  try {
    const result = await runAiBusinessTool(auth.user, {
      toolId: parsed.data.toolId as AiBusinessToolId,
      prompt: parsed.data.prompt,
      extraContext: parsed.data.extraContext
    });
    return ok(result);
  } catch (error) {
    if (error instanceof PlanGateError) return fail(error.message, error.status, error.details);
    return fail(error instanceof Error ? error.message : "AI tool could not run.", 500);
  }
}
