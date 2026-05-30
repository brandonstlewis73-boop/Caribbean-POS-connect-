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

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS business_id TEXT;

DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    DELETE FROM public.settings older
    USING public.settings newer
    WHERE older.key = newer.key
      AND older.ctid < newer.ctid;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key_unique ON public.settings(key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_business_slug ON public.categories((COALESCE(business_id, '')), slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_business_sku ON public.products((COALESCE(business_id, '')), sku);
CREATE INDEX IF NOT EXISTS idx_categories_business_order ON public.categories(business_id, is_active, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(business_id, category_id, active);

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT *
    FROM (VALUES
      ('public.businesses', 'id', 'idx_businesses_id_conflict_unique'),
      ('public.staff_users', 'email', 'idx_staff_users_email_conflict_unique'),
      ('public.categories', 'id', 'idx_categories_id_conflict_unique'),
      ('public.products', 'id', 'idx_products_id_conflict_unique'),
      ('public.customers', 'id', 'idx_customers_id_conflict_unique'),
      ('public.orders', 'id', 'idx_orders_id_conflict_unique'),
      ('public.order_items', 'id', 'idx_order_items_id_conflict_unique'),
      ('public.payments', 'id', 'idx_payments_id_conflict_unique'),
      ('public.inventory_logs', 'id', 'idx_inventory_logs_id_conflict_unique'),
      ('public.receipts', 'receipt_number', 'idx_receipts_receipt_number_conflict_unique'),
      ('public.loyalty_transactions', 'id', 'idx_loyalty_transactions_id_conflict_unique'),
      ('public.delivery_events', 'id', 'idx_delivery_events_id_conflict_unique'),
      ('public.subscriptions', 'id', 'idx_subscriptions_id_conflict_unique'),
      ('public.settings', 'key', 'idx_settings_key_conflict_unique'),
      ('public.audit_logs', 'id', 'idx_audit_logs_id_conflict_unique')
    ) AS targets(table_name, column_name, index_name)
  LOOP
    IF to_regclass(target.table_name) IS NOT NULL THEN
      EXECUTE format(
        'DELETE FROM %s older USING %s newer WHERE older.%I IS NOT NULL AND older.%I = newer.%I AND older.ctid < newer.ctid',
        target.table_name,
        target.table_name,
        target.column_name,
        target.column_name,
        target.column_name
      );
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %s (%I)',
        target.index_name,
        target.table_name,
        target.column_name
      );
    END IF;
  END LOOP;

  IF to_regclass('public.business_settings') IS NOT NULL THEN
    DELETE FROM public.business_settings older
    USING public.business_settings newer
    WHERE older.business_id = newer.business_id
      AND older.key = newer.key
      AND older.ctid < newer.ctid;

    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_business_settings_business_key_conflict_unique ON public.business_settings(business_id, key)';
  END IF;
END $$;
