import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createCategory, listCategories, reorderCategories } from "@/lib/data";
import { categoryReorderSchema, categorySchema } from "@/lib/validators";

export const runtime = "nodejs";

function categoryError(error: unknown) {
  const code = typeof error === "object" && error ? (error as { code?: string }).code : undefined;
  const message = error instanceof Error ? error.message : "";
  if (code === "23505") return "A category with that name or slug already exists for this business.";
  return message || "Category could not be saved.";
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "inventory:read");
  if (!auth.user) return fail(auth.error, auth.status);
  try {
    return ok({
      categories: await listCategories(
        request.nextUrl.searchParams.get("q") || undefined,
        request.nextUrl.searchParams.get("includeInactive") === "true",
        auth.user.business_id
      )
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Categories could not be loaded.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const body = await request.json().catch(() => null);

  if (body?.action === "reorder") {
    const parsed = categoryReorderSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid category order", 422, parsed.error.flatten());
    try {
      return ok({ categories: await reorderCategories(parsed.data.categories, auth.user.id) });
    } catch (error) {
      return fail(categoryError(error), 500);
    }
  }

  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid category data", 422, parsed.error.flatten());
  try {
    const category = await createCategory(parsed.data, auth.user.id);
    return ok({ category }, { status: 201 });
  } catch (error) {
    return fail(categoryError(error), 500);
  }
}
