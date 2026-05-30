-- Run this if Supabase reports:
-- cannot drop constraint categories_name_key on table categories because other objects depend on it

DO $$
DECLARE
  dependency RECORD;
BEGIN
  IF to_regclass('public.categories') IS NOT NULL THEN
    FOR dependency IN
      SELECT conrelid::regclass AS table_name, conname
      FROM pg_constraint
      WHERE contype = 'f'
        AND confrelid = 'public.categories'::regclass
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', dependency.table_name, dependency.conname);
    END LOOP;
  END IF;
END $$;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS add_ons JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_business_slug ON public.categories((COALESCE(business_id, '')), slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_business_sku ON public.products((COALESCE(business_id, '')), sku);
CREATE INDEX IF NOT EXISTS idx_categories_business_order ON public.categories(business_id, is_active, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(business_id, category_id, active);
