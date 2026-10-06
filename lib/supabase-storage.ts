const DEFAULT_PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export function productImageBucket() {
  return (process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_PRODUCT_IMAGE_BUCKET).trim() || DEFAULT_PRODUCT_IMAGE_BUCKET;
}

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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || "").trim();
  const missing = [
    supabaseUrl ? null : "NEXT_PUBLIC_SUPABASE_URL",
    serviceKey ? null : "SUPABASE_SERVICE_ROLE_KEY",
    bucket ? null : "SUPABASE_STORAGE_BUCKET"
  ].filter(Boolean) as string[];

  if (missing.length) {
    throw new Error(`Product photo storage is not configured. Missing: ${missing.join(", ")}. Add the missing Vercel environment variables, run db/product_images_storage.sql, then redeploy.`);
  }

  return { supabaseUrl, serviceKey, bucket };
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
  if (size <= 0 || size > MAX_PRODUCT_IMAGE_BYTES) {
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
  return `businesses/${safeSegment(businessId, "business")}/products/${safeSegment(productId, "product")}/${Date.now()}-${original}.${extension}`;
}

export function productImagePublicUrl(path: string) {
  const { supabaseUrl, bucket } = storageConfig();
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function productImagePathFromUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;
  try {
    const { supabaseUrl, bucket } = storageConfig();
    const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
    if (imageUrl.startsWith(publicPrefix)) return decodeURIComponent(imageUrl.slice(publicPrefix.length));
    const directPrefix = `${bucket}/`;
    if (imageUrl.startsWith(directPrefix)) return imageUrl.slice(directPrefix.length);
  } catch {
    return null;
  }
  return null;
}

export async function uploadProductImageToStorage(input: UploadProductImageInput): Promise<UploadedProductImage> {
  const validation = validateProductImageUpload(input.fileName, input.contentType, input.bytes.byteLength);
  if (validation) throw new Error(validation);
  if (!validProductImageBytes(input.bytes, input.contentType)) throw new Error("Product photo must contain a valid JPG, PNG, or WebP image.");
  const { supabaseUrl, serviceKey, bucket } = storageConfig();
  const path = productImageObjectPath(input);
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
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
    if (response.status === 404) throw new Error(`Supabase Storage bucket ${bucket} was not found. Run db/product_images_storage.sql in Supabase SQL Editor, then try again.`);
    if (response.status === 401 || response.status === 403) throw new Error("Supabase Storage rejected the upload. Check SUPABASE_SERVICE_ROLE_KEY and product image bucket permissions.");
    throw new Error(text || "Product photo could not be uploaded to Supabase Storage.");
  }

  return { bucket, path, publicUrl: productImagePublicUrl(path) };
}

export async function deleteProductImageFromStorage(imageUrl: string | null | undefined, owner: { businessId: string; productId: string }) {
  const path = productImagePathFromUrl(imageUrl);
  if (!path) return { deleted: false, reason: "Image is not in the product-images bucket." };
  const prefix = `businesses/${safeSegment(owner.businessId, "business")}/products/${safeSegment(owner.productId, "product")}/`;
  if (!path.startsWith(prefix) || path.includes("..") || path.includes("\\") || path.slice(prefix.length).includes("/")) {
    return { deleted: false, reason: "Image does not belong to this product." };
  }
  const { supabaseUrl, serviceKey, bucket } = storageConfig();
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}`, {
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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || "").trim();
  const missing = [
    supabaseUrl ? null : "NEXT_PUBLIC_SUPABASE_URL",
    serviceKey ? null : "SUPABASE_SERVICE_ROLE_KEY",
    bucket ? null : "SUPABASE_STORAGE_BUCKET"
  ].filter(Boolean) as string[];

  const status = {
    configured: missing.length === 0,
    bucket: bucket || productImageBucket(),
    bucketReachable: false,
    missing,
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasServiceRoleKey: Boolean(serviceKey),
    hasStorageBucket: Boolean(bucket),
    message: "Product photo storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET=product-images in Vercel, run db/product_images_storage.sql, then redeploy."
  };

  if (missing.length) return status;

  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucket}`, {
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
        message: `Supabase Storage ${bucket} bucket is reachable.`
      };
    }
    if (response.status === 404) {
      return {
        ...status,
        message: `Supabase Storage bucket ${bucket} was not found. Run db/product_images_storage.sql in Supabase SQL Editor.`
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
      message: "Supabase Storage bucket check failed. Verify NEXT_PUBLIC_SUPABASE_URL and network access from Vercel."
    };
  }
}
export function validProductImageBytes(bytes: ArrayBuffer, type: string) {
  const data = new Uint8Array(bytes);
  if (type === "image/jpeg" || type === "image/jpg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (type === "image/png") return data.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => data[i] === byte);
  if (type === "image/webp") return data.length >= 12 && String.fromCharCode(...data.slice(0, 4)) === "RIFF" && String.fromCharCode(...data.slice(8, 12)) === "WEBP";
  return false;
}
