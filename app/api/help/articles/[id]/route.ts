import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteHelpArticle, updateHelpArticle } from "@/lib/support";
import { helpArticleUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "support:manage");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = helpArticleUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid help article", 422, parsed.error.flatten());
  const { id } = await params;
  const article = await updateHelpArticle(id, parsed.data, auth.user.id);
  return article ? ok({ article }) : fail("Help article not found", 404);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "support:manage");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const article = await deleteHelpArticle(id);
  return article ? ok({ article }) : fail("Help article not found", 404);
}
