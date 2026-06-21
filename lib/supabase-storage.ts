const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

type UploadProductImageInput = {
  businessId: string;
  productId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer;
};

export type UploadedProductImage = {
  bucket: string;
  path: string;
  publicUrl: string;
};

function storageConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase Storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, create the product-images bucket, then redeploy.");
  }
  return { supabaseUrl, serviceKey };
}

function safeSegment(value: string, fallback: string) {
  return (value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function extensionFromFile(fileName: string, contentType: string) {
  const fromName = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const extension = fromName || contentType.split("/").pop() || "jpg";
  if (extension === "jpeg" || extension === "jpg") return "jpg";
  if (extension === "png") return "png";
  if (extension === "webp") return "webp";
  return "jpg";
}

export function validateProductImageUpload(fileName: string, contentType: string, size: number) {
  if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(contentType)) {
    return "Product photo must be JPG, PNG, or WebP.";
  }
  if (size > MAX_PRODUCT_IMAGE_BYTES) {
    return "Product photo is still too large after compression. Choose a smaller image under 5 MB.";
  }
  if (!fileName.trim()) {
    return "Product photo needs a valid file name.";
  }
  return null;
}

export function productImageObjectPath({ businessId, productId, fileName, contentType }: Omit<UploadProductImageInput, "bytes">) {
  const extension = extensionFromFile(fileName, contentType);
  const original = safeSegment(fileName.replace(/\.[^.]+$/, ""), "product");
  return `${safeSegment(businessId, "business")}/${safeSegment(productId, "product")}/${Date.now()}-${original}.${extension}`;
}

export function productImagePublicUrl(path: string) {
  const { supabaseUrl } = storageConfig();
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}`;
}

export function productImagePathFromUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;
  try {
    const { supabaseUrl } = storageConfig();
    const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
    if (imageUrl.startsWith(publicPrefix)) return decodeURIComponent(imageUrl.slice(publicPrefix.length));
  } catch {
    return null;
  }
  const directPrefix = `${PRODUCT_IMAGE_BUCKET}/`;
  if (imageUrl.startsWith(directPrefix)) return imageUrl.slice(directPrefix.length);
  return null;
}

export async function uploadProductImageToStorage(input: UploadProductImageInput): Promise<UploadedProductImage> {
  const validation = validateProductImageUpload(input.fileName, input.contentType, input.bytes.byteLength);
  if (validation) throw new Error(validation);
  const { supabaseUrl, serviceKey } = storageConfig();
  const path = productImageObjectPath(input);
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}/${encodeURI(path)}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "content-type": input.contentType,
      "cache-control": "31536000",
      "x-upsert": "false"
    },
    body: Buffer.from(input.bytes)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 404) throw new Error("Supabase Storage bucket product-images was not found. Create the bucket and policies, then try again.");
    if (response.status === 401 || response.status === 403) throw new Error("Supabase Storage rejected the upload. Check SUPABASE_SERVICE_ROLE_KEY and product-images bucket permissions.");
    throw new Error(text || "Product photo could not be uploaded to Supabase Storage.");
  }

  return { bucket: PRODUCT_IMAGE_BUCKET, path, publicUrl: productImagePublicUrl(path) };
}

export async function deleteProductImageFromStorage(imageUrl?: string | null) {
  const path = productImagePathFromUrl(imageUrl);
  if (!path) return { deleted: false, reason: "Image is not in the product-images bucket." };
  const { supabaseUrl, serviceKey } = storageConfig();
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({ prefixes: [path] })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Product photo could not be removed from Supabase Storage.");
  }
  return { deleted: true, path };
}
export async function supabaseProductImageStorageStatus() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY || "";
  const missing = [
    supabaseUrl ? null : "SUPABASE_URL",
    serviceKey ? null : "SUPABASE_SERVICE_ROLE_KEY"
  ].filter(Boolean) as string[];

  const status = {
    configured: missing.length === 0,
    bucket: PRODUCT_IMAGE_BUCKET,
    bucketReachable: false,
    missing,
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasServiceRoleKey: Boolean(serviceKey),
    message: "Supabase Storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, run db/product_images_storage.sql, then redeploy."
  };

  if (missing.length) return status;

  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${PRODUCT_IMAGE_BUCKET}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey
      },
      cache: "no-store"
    });
    if (response.ok) {
      return {
        ...status,
        bucketReachable: true,
        message: "Supabase Storage product-images bucket is reachable."
      };
    }
    if (response.status === 404) {
      return {
        ...status,
        message: "Supabase Storage bucket product-images was not found. Run db/product_images_storage.sql in Supabase SQL Editor."
      };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        ...status,
        message: "Supabase Storage rejected the service role key. Check SUPABASE_SERVICE_ROLE_KEY in Vercel."
      };
    }
    return {
      ...status,
      message: `Supabase Storage bucket check failed with HTTP ${response.status}.`
    };
  } catch {
    return {
      ...status,
      message: "Supabase Storage bucket check failed. Verify SUPABASE_URL and network access from Vercel."
    };
  }
}
