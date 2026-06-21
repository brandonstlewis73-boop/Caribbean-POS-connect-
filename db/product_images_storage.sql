-- Product image storage setup for Caribbean POS Connect.
-- Run this once in the Supabase SQL Editor for production.
-- The app uploads through a server-side API using SUPABASE_SERVICE_ROLE_KEY.

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

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

-- Uploads, replacements, and deletes are performed only by the Next.js server
-- with SUPABASE_SERVICE_ROLE_KEY. Do not expose the service role key in frontend code.
-- Object paths are scoped as:
-- product-images/{businessId}/{productId}/{timestamp}-{safe-original-name}.{ext}
