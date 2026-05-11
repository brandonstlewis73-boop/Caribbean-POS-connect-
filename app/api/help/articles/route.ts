import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createHelpArticle, listHelpArticles } from "@/lib/support";
import { hasPermission } from "@/lib/permissions";
import { helpArticleSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "support:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const url = new URL(request.url);
  const search = url.searchParams.get("q");
  const includeUnpublished = hasPermission(auth.user.role, "support:manage");
  return ok({
    articles: await listHelpArticles({
      search,
      role: auth.user.role,
      includeUnpublished
    })
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "support:manage");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = helpArticleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid help article", 422, parsed.error.flatten());
  const article = await createHelpArticle(parsed.data, auth.user.id);
  return ok({ article }, { status: 201 });
}
