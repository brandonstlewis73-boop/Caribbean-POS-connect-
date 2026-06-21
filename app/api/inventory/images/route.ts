import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getProduct, updateProduct } from "@/lib/data";
import { deleteProductImageFromStorage, uploadProductImageToStorage, validateProductImageUpload } from "@/lib/supabase-storage";

export const runtime = "nodejs";

function safeUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : "Product photo could not be uploaded.";
  const normalized = message.toLowerCase();
  if (normalized.includes("not configured") || normalized.includes("supabase_service_role_key") || normalized.includes("supabase_storage_bucket")) {
    return "Product photo storage is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET=product-images in Vercel, run db/product_images_storage.sql in Supabase, then redeploy.";
  }
  if (normalized.includes("bucket") && normalized.includes("not found")) {
    return "Product photo storage bucket was not found. Run db/product_images_storage.sql in Supabase SQL Editor, then try again.";
  }
  if (normalized.includes("rejected") || normalized.includes("401") || normalized.includes("403")) {
    return "Product photo storage rejected the server credentials. Check SUPABASE_SERVICE_ROLE_KEY and storage bucket policies.";
  }
  if (normalized.includes("jpg") || normalized.includes("png") || normalized.includes("webp") || normalized.includes("5 mb")) return message;
  return "Product photo could not be uploaded. Check storage setup and try again.";
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const productId = String(form?.get("productId") || "").trim();
  const oldImageUrl = String(form?.get("oldImageUrl") || "").trim();

  if (!productId) return fail("Save the product before uploading a photo.", 422);
  if (!(file instanceof File)) return fail("Choose a product photo to upload.", 422);

  const product = await getProduct(productId, auth.user.business_id);
  if (!product) return fail("Product not found for this business.", 404);

  const validation = validateProductImageUpload(file.name, file.type, file.size);
  if (validation) return fail(validation, 422);

  try {
    const uploaded = await uploadProductImageToStorage({
      businessId: auth.user.business_id || "business",
      productId,
      fileName: file.name,
      contentType: file.type,
      bytes: await file.arrayBuffer()
    });

    await updateProduct(productId, { image_url: uploaded.publicUrl }, auth.user.id);

    if (oldImageUrl && oldImageUrl !== uploaded.publicUrl) {
      await deleteProductImageFromStorage(oldImageUrl).catch(() => null);
    }

    return ok({ imageUrl: uploaded.publicUrl, path: uploaded.path });
  } catch (error) {
    return fail(safeUploadError(error), 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const body = await request.json().catch(() => null) as { productId?: string; imageUrl?: string } | null;
  const productId = String(body?.productId || "").trim();
  const imageUrl = String(body?.imageUrl || "").trim();

  if (!productId) return fail("Product ID is required to remove a photo.", 422);
  const product = await getProduct(productId, auth.user.business_id);
  if (!product) return fail("Product not found for this business.", 404);

  try {
    const targetUrl = imageUrl || product.image_url || "";
    await deleteProductImageFromStorage(targetUrl).catch((error) => {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("not configured")) throw error;
    });
    const updated = await updateProduct(productId, { image_url: null }, auth.user.id);
    return ok({ product: updated, deleted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Product photo could not be removed.", 500);
  }
}
