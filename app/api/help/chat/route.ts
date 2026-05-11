import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { generateSupportAnswer, redactSensitiveText } from "@/lib/ai-support";
import { getSettings } from "@/lib/data";
import { createAiSupportLog, listHelpArticles } from "@/lib/support";
import { aiSupportChatSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "support:read");
  if (!auth.user) return fail(auth.error, auth.status);

  const parsed = aiSupportChatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid support question", 422, parsed.error.flatten());

  const [articles, settings] = await Promise.all([
    listHelpArticles({ role: auth.user.role }),
    getSettings().catch(() => null)
  ]);
  const answer = await generateSupportAnswer({
    question: parsed.data.question,
    messages: parsed.data.messages,
    currentPage: parsed.data.currentPage,
    role: auth.user.role,
    articles
  });

  await createAiSupportLog({
    userId: auth.user.id,
    businessId: settings?.active_business_id || null,
    question: redactSensitiveText(parsed.data.question).slice(0, 1200),
    responseSummary: redactSensitiveText(answer.answer).slice(0, 500)
  });

  return ok(answer);
}
