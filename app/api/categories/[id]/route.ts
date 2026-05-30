import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteCategory, updateCategory } from "@/lib/data";
import { categorySchema } from "@/lib/validators";

export const runtime = "nodejs";

function categoryError(error: unknown) {
  const code = typeof error === "object" && error ? (error as { code?: string }).code : undefined;
  const message = error instanceof Error ? error.message : "";
  if (code === "23505") return "A category with that name or slug already exists for this business.";
  return message || "Category could not be updated.";
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const parsed = categorySchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid category update", 422, parsed.error.flatten());
  try {
    const category = await updateCategory(id, parsed.data, auth.user.id);
    return category ? ok({ category }) : fail("Category not found", 404);
  } catch (error) {
    return fail(categoryError(error), 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const mode = body?.mode === "delete_category_only" ? "delete_category_only" : "move_to_uncategorized";
  try {
    const category = await deleteCategory(id, auth.user.id, mode);
    return category ? ok({ category, mode }) : fail("Category not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Category could not be deleted.", 500);
  }
}
