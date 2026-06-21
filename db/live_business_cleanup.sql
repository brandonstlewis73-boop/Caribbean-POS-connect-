-- Caribbean Connect POS live-business cleanup
-- Run this once in Supabase SQL Editor after backing up if your database still contains launch seed data.

BEGIN;

-- Fix Supabase "Function Search Path Mutable" lint for updated_at triggers.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Remove seeded customer-facing records.
DELETE FROM public.delivery_events WHERE order_id IN ('ord_1025', 'ord_1026', 'ord_1027');
DELETE FROM public.loyalty_transactions WHERE order_id IN ('ord_1025', 'ord_1026', 'ord_1027');
DELETE FROM public.receipts WHERE order_id IN ('ord_1025', 'ord_1026', 'ord_1027');
DELETE FROM public.payments WHERE order_id IN ('ord_1025', 'ord_1026', 'ord_1027');
DELETE FROM public.inventory_logs WHERE reference_id IN ('ord_1025', 'ord_1026', 'ord_1027');
DELETE FROM public.order_items WHERE order_id IN ('ord_1025', 'ord_1026', 'ord_1027');
DELETE FROM public.orders WHERE id IN ('ord_1025', 'ord_1026', 'ord_1027');
DELETE FROM public.customers WHERE id IN ('cus_john', 'cus_priya', 'cus_maria')
   OR lower(name) IN ('john doe', 'joe doe', 'priya singh', 'maria joseph')
   OR email IN ('john@example.com', 'priya@example.com', 'maria@example.com');

-- Remove area/community from live schema and old JSON snapshots.
ALTER TABLE public.customers DROP COLUMN IF EXISTS community;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS waze_link TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gps_latitude NUMERIC;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gps_longitude NUMERIC;
UPDATE public.orders
SET customer_snapshot = customer_snapshot - 'community'
WHERE customer_snapshot ? 'community';

-- Staff role options used by the staff management screen.
ALTER TABLE public.staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;
ALTER TABLE public.staff_users
  ADD CONSTRAINT staff_users_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'cashier', 'dispatcher', 'driver', 'kitchen', 'staff'));

-- Keep login compatible with both local Postgres and the Supabase staff_users table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff_users'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.users
      WITH (security_invoker = true) AS
      SELECT id, name, email, password_hash, role, phone, active, created_at, updated_at
      FROM public.staff_users';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind = 'v'
  ) THEN
    EXECUTE 'ALTER VIEW public.users SET (security_invoker = true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'stock_movements' AND c.relkind = 'v'
  ) THEN
    EXECUTE 'ALTER VIEW public.stock_movements SET (security_invoker = true)';
  END IF;
END $$;

INSERT INTO public.staff_users (
  id,
  business_id,
  name,
  email,
  password_hash,
  role,
  phone,
  active
)
SELECT
  'usr_setup_admin',
  'biz_initial_setup',
  'Asha Maharaj',
  'admin@caribbeanpos.test',
  '$2a$12$TBtPQakrJnSP8Y8yJj0lOOiS2auAZ1hrNKyioYJRvkNQvIy4FFeAG',
  'admin',
  '868-555-1001',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_users WHERE email = 'admin@caribbeanpos.test'
);

-- Subscription columns used by the app.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'starter';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Ensure product categories exist, without inserting fake products/customers/orders.
INSERT INTO public.categories (id, business_id, name, slug, sort_order, active) VALUES
  ('cat_meals', 'biz_initial_setup', 'Meals', 'meals', 10, TRUE),
  ('cat_drinks', 'biz_initial_setup', 'Drinks', 'drinks', 20, TRUE),
  ('cat_snacks', 'biz_initial_setup', 'Snacks', 'snacks', 30, TRUE),
  ('cat_retail', 'biz_initial_setup', 'Retail', 'retail', 40, TRUE),
  ('cat_services', 'biz_initial_setup', 'Services', 'services', 50, TRUE),
  ('cat_digital', 'biz_initial_setup', 'Digital services', 'digital-services', 60, TRUE),
  ('cat_custom', 'biz_initial_setup', 'Custom items', 'custom-items', 70, TRUE)
ON CONFLICT DO NOTHING;

-- Replace launch subscription text with a real plan record if needed.
UPDATE public.subscriptions
SET plan_id = CASE
    WHEN lower(plan_name) LIKE '%pro%' THEN 'pro'
    WHEN lower(plan_name) LIKE '%business%' THEN 'business'
    ELSE 'starter'
  END,
  plan_name = CASE
    WHEN lower(plan_name) LIKE '%pro%' THEN 'Pro Plan'
    WHEN lower(plan_name) LIKE '%business%' THEN 'Business Plan'
    ELSE 'Starter Plan'
  END,
  metadata = COALESCE(metadata, '{}'::jsonb) - 'notes'
WHERE lower(plan_name) LIKE '%launch%';

COMMIT;
