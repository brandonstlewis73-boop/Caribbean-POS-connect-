-- Product image storage setup for Caribbean POS Connect.
-- Run this once in the Supabase SQL Editor for production.
-- The app uploads, replaces, and deletes files only through the Next.js server
-- using SUPABASE_SERVICE_ROLE_KEY. Never expose that key in frontend code.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public buckets can serve direct object URLs for product photos.
-- Do not create a broad anon SELECT policy on storage.objects; that can expose
-- object listing metadata across businesses. Server-side uploads/deletes use the
-- service role key, which bypasses RLS without exposing write access to clients.
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Product image uploads are server controlled" ON storage.objects;

-- Object paths are scoped by tenant:
-- product-images/businesses/{businessId}/products/{productId}/{timestamp}-{safe-original-name}.{ext}