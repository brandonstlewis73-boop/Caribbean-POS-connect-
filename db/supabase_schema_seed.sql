-- Caribbean POS Connect
-- Paste this whole file into the Supabase SQL Editor for a new/empty public schema.
-- It creates the requested Supabase/Postgres tables and seed data.
--
-- Demo login after setup:
--   Email: admin@demo.com
--   Password: demo123

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  slug TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT NOT NULL DEFAULT 'Trinidad and Tobago',
  currency TEXT NOT NULL DEFAULT 'TTD',
  logo_url TEXT,
  tax_id TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_users (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'biz_savannah_sea' REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'cashier', 'dispatcher', 'driver', 'kitchen', 'staff')),
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'biz_savannah_sea' REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'biz_savannah_sea' REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  category TEXT NOT NULL REFERENCES public.categories(name) ON UPDATE CASCADE,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_alert INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  supplier_name TEXT,
  supplier_phone TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'biz_savannah_sea' REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  phone_normalized TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT NOT NULL DEFAULT 'Trinidad and Tobago',
  delivery_notes TEXT,
  waze_link TEXT,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  preferred_payment_method TEXT,
  notes TEXT,
  birthday TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'biz_savannah_sea' REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_snapshot JSONB NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('in_store', 'pickup', 'delivery', 'online', 'draft')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'refunded')),
  delivery_status TEXT NOT NULL DEFAULT 'not_required' CHECK (delivery_status IN ('not_required', 'pending', 'assigned', 'out_for_delivery', 'delivered', 'failed')),
  assigned_driver_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  service_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
  loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  delivery_latitude NUMERIC(10, 7),
  delivery_longitude NUMERIC(10, 7),
  delivery_location_link TEXT,
  waze_link TEXT,
  payment_link TEXT,
  whatsapp_business_link TEXT,
  whatsapp_customer_link TEXT,
  created_by TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'biz_savannah_sea' REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'unpaid', 'partial', 'failed', 'refunded')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TTD',
  provider TEXT,
  provider_payment_id TEXT,
  payment_link TEXT,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'biz_savannah_sea' REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale', 'manual_adjustment', 'restock', 'return')),
  quantity_delta INTEGER NOT NULL,
  reason TEXT,
  reference_id TEXT,
  user_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'cancelled')),
  seats INTEGER NOT NULL DEFAULT 5,
  monthly_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TTD',
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  business_id TEXT DEFAULT 'biz_savannah_sea' REFERENCES public.businesses(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extra tables used by the current app for receipts, loyalty, delivery tracking, and audit logs.
CREATE TABLE IF NOT EXISTS public.receipts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'print',
  email_to TEXT,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  points_delta INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'manual_adjustment')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.staff_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_users_email ON public.staff_users(email);
CREATE INDEX IF NOT EXISTS idx_products_lookup ON public.products(name, sku, barcode, category);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON public.orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

DROP TRIGGER IF EXISTS set_businesses_updated_at ON public.businesses;
CREATE TRIGGER set_businesses_updated_at BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_staff_users_updated_at ON public.staff_users;
CREATE TRIGGER set_staff_users_updated_at BEFORE UPDATE ON public.staff_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Compatibility views for the current Next.js app code.
-- The app queries "users" and writes "stock_movements".
CREATE OR REPLACE VIEW public.users AS
SELECT id, name, email, password_hash, role, phone, active, created_at, updated_at
FROM public.staff_users;

CREATE OR REPLACE VIEW public.stock_movements AS
SELECT id, product_id, type, quantity_delta, reason, reference_id, user_id, created_at
FROM public.inventory_logs;

INSERT INTO public.businesses (
  id, name, legal_name, slug, phone, email, street_address, city, region, country, currency, logo_url
) VALUES (
  'biz_savannah_sea',
  'Savannah & Sea Retail Ltd.',
  'Savannah & Sea Retail Ltd.',
  'savannah-sea-retail',
  '868-443-7582',
  'hello@savannahsea.tt',
  '18 Independence Square',
  'Port of Spain',
  'Port of Spain',
  'Trinidad and Tobago',
  'TTD',
  '/logo.svg'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  street_address = EXCLUDED.street_address,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  updated_at = NOW();

INSERT INTO public.staff_users (
  id, business_id, name, email, password_hash, role, phone, active
) VALUES
  ('usr_demo_admin', 'biz_savannah_sea', 'Demo Admin', 'admin@demo.com', '$2a$12$.EhN3P5jYWD1jFGAchYcveUqU.74lCQCPc2aMca3hoAslDIxdIcTW', 'admin', '868-443-7582', TRUE),
  ('usr_manager_asha', 'biz_savannah_sea', 'Asha Maharaj', 'manager@savannahsea.tt', '$2a$12$.EhN3P5jYWD1jFGAchYcveUqU.74lCQCPc2aMca3hoAslDIxdIcTW', 'manager', '868-555-1002', TRUE),
  ('usr_cashier_renee', 'biz_savannah_sea', 'Renee Ali', 'cashier@savannahsea.tt', '$2a$12$.EhN3P5jYWD1jFGAchYcveUqU.74lCQCPc2aMca3hoAslDIxdIcTW', 'cashier', '868-555-1003', TRUE),
  ('usr_dispatcher_nia', 'biz_savannah_sea', 'Nia George', 'dispatcher@savannahsea.tt', '$2a$12$.EhN3P5jYWD1jFGAchYcveUqU.74lCQCPc2aMca3hoAslDIxdIcTW', 'dispatcher', '868-555-1006', TRUE),
  ('usr_driver_malik', 'biz_savannah_sea', 'Malik Charles', 'driver@savannahsea.tt', '$2a$12$.EhN3P5jYWD1jFGAchYcveUqU.74lCQCPc2aMca3hoAslDIxdIcTW', 'driver', '868-555-1004', TRUE),
  ('usr_kitchen_lena', 'biz_savannah_sea', 'Lena Baptiste', 'kitchen@savannahsea.tt', '$2a$12$.EhN3P5jYWD1jFGAchYcveUqU.74lCQCPc2aMca3hoAslDIxdIcTW', 'kitchen', '868-555-1007', TRUE),
  ('usr_staff_talia', 'biz_savannah_sea', 'Talia Joseph', 'staff@savannahsea.tt', '$2a$12$.EhN3P5jYWD1jFGAchYcveUqU.74lCQCPc2aMca3hoAslDIxdIcTW', 'staff', '868-555-1005', TRUE)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO public.categories (id, business_id, name, slug, sort_order) VALUES
  ('cat_food', 'biz_savannah_sea', 'Food', 'food', 10),
  ('cat_drinks', 'biz_savannah_sea', 'Drinks', 'drinks', 20),
  ('cat_snacks', 'biz_savannah_sea', 'Snacks', 'snacks', 30),
  ('cat_services', 'biz_savannah_sea', 'Services', 'services', 40),
  ('cat_apparel', 'biz_savannah_sea', 'Apparel', 'apparel', 50),
  ('cat_digital', 'biz_savannah_sea', 'Digital services', 'digital-services', 60),
  ('cat_custom', 'biz_savannah_sea', 'Custom items', 'custom-items', 70)
ON CONFLICT (name) DO UPDATE SET
  slug = EXCLUDED.slug,
  sort_order = EXCLUDED.sort_order,
  active = TRUE,
  updated_at = NOW();

INSERT INTO public.products (
  id, business_id, name, sku, barcode, category, category_id, cost_price, selling_price,
  stock_quantity, low_stock_alert, image_url, supplier_name, supplier_phone, active
) VALUES
  ('prd_jerk', 'biz_savannah_sea', 'Jerk Chicken Meal', 'FOOD-JERK-001', '740001000001', 'Food', 'cat_food', 38.00, 55.00, 40, 8, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', 'Island Fresh Foods', '868-555-2001', TRUE),
  ('prd_doubles', 'biz_savannah_sea', 'Doubles Pack', 'FOOD-DOUB-002', '740001000002', 'Food', 'cat_food', 6.00, 12.00, 76, 15, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80', 'Central Curry Supply', '868-555-2002', TRUE),
  ('prd_sorrel', 'biz_savannah_sea', 'Sorrel Drink', 'DRINK-SOR-003', '740001000003', 'Drinks', 'cat_drinks', 6.00, 15.00, 29, 10, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80', 'Tropical Bev Co', '868-555-2003', TRUE),
  ('prd_mauby', 'biz_savannah_sea', 'Mauby Bottle', 'DRINK-MAU-004', '740001000004', 'Drinks', 'cat_drinks', 5.00, 14.00, 22, 10, 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80', 'Tropical Bev Co', '868-555-2003', TRUE),
  ('prd_plantain', 'biz_savannah_sea', 'Plantain Chips', 'SNACK-PLA-005', '740001000005', 'Snacks', 'cat_snacks', 7.00, 16.00, 11, 12, 'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?auto=format&fit=crop&w=900&q=80', 'SnackWorks TT', '868-555-2004', TRUE),
  ('prd_tee', 'biz_savannah_sea', 'Screen Printed Tee', 'APP-TEE-006', '740001000006', 'Apparel', 'cat_apparel', 48.00, 120.00, 17, 5, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80', 'Queen Street Apparel', '868-555-2005', TRUE),
  ('prd_topup', 'biz_savannah_sea', 'Digital Top-Up', 'DIG-TOP-007', '740001000007', 'Digital services', 'cat_digital', 45.00, 50.00, 999, 100, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', 'Local Digital Services', '868-555-2006', TRUE),
  ('prd_repair', 'biz_savannah_sea', 'Custom Repair Service', 'SERV-REP-008', '740001000008', 'Services', 'cat_services', 80.00, 150.00, 999, 100, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80', 'In-house', '868-555-0100', TRUE)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  barcode = EXCLUDED.barcode,
  category = EXCLUDED.category,
  category_id = EXCLUDED.category_id,
  cost_price = EXCLUDED.cost_price,
  selling_price = EXCLUDED.selling_price,
  stock_quantity = EXCLUDED.stock_quantity,
  low_stock_alert = EXCLUDED.low_stock_alert,
  image_url = EXCLUDED.image_url,
  supplier_name = EXCLUDED.supplier_name,
  supplier_phone = EXCLUDED.supplier_phone,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO public.customers (
  id, business_id, name, phone, phone_normalized, email, street_address, city, region,
  country, delivery_notes, preferred_payment_method, notes, marketing_consent, loyalty_points,
  total_spent, orders_count, last_order_at, tags
) VALUES
  ('cus_john', 'biz_savannah_sea', 'John Doe', '868-123-4567', '18681234567', 'john@example.com', '25 Main Road', 'Chaguanas', 'Chaguanas', 'Trinidad and Tobago', 'Call when outside', 'Cash', 'Prefers delivery after 5 PM', TRUE, 16, 165.63, 1, NOW() - INTERVAL '2 days', '["New Customer","Owes Balance"]'::jsonb),
  ('cus_priya', 'biz_savannah_sea', 'Priya Singh', '868-222-9988', '18682229988', 'priya@example.com', '7 Coffee Street', 'Tunapuna', 'Tunapuna-Piarco', 'Trinidad and Tobago', 'Leave at reception', 'WiPay', 'Likes sorrel and mauby', TRUE, 9, 85.50, 1, NOW() - INTERVAL '1 day', '["Frequent Buyer"]'::jsonb),
  ('cus_maria', 'biz_savannah_sea', 'Maria Joseph', '868-333-4444', '18683334444', 'maria@example.com', '12 High Street', 'San Fernando', 'San Fernando', 'Trinidad and Tobago', 'Ring gate bell', 'Card', 'Pickup customer', FALSE, 14, 141.75, 1, NOW() - INTERVAL '4 hours', '["New Customer"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  phone_normalized = EXCLUDED.phone_normalized,
  email = EXCLUDED.email,
  street_address = EXCLUDED.street_address,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  delivery_notes = EXCLUDED.delivery_notes,
  preferred_payment_method = EXCLUDED.preferred_payment_method,
  notes = EXCLUDED.notes,
  marketing_consent = EXCLUDED.marketing_consent,
  loyalty_points = EXCLUDED.loyalty_points,
  total_spent = EXCLUDED.total_spent,
  orders_count = EXCLUDED.orders_count,
  last_order_at = EXCLUDED.last_order_at,
  tags = EXCLUDED.tags,
  updated_at = NOW();

INSERT INTO public.orders (
  id, business_id, order_number, customer_id, customer_snapshot, order_type, status,
  payment_method, payment_status, delivery_status, assigned_driver_id, subtotal, discount_total,
  tax_total, service_fee, delivery_fee, total, loyalty_points_earned, notes,
  delivery_latitude, delivery_longitude, delivery_location_link, waze_link, payment_link,
  whatsapp_business_link, whatsapp_customer_link, created_by, created_at
) VALUES
  (
    'ord_1025', 'biz_savannah_sea', '1025', 'cus_john',
    '{"name":"John Doe","phone":"868-123-4567","email":"john@example.com","street_address":"25 Main Road","city":"Chaguanas","region":"Chaguanas","country":"Trinidad and Tobago","delivery_notes":"Call when outside","preferred_payment_method":"Cash","marketing_consent":true}'::jsonb,
    'delivery', 'completed', 'Pay on delivery', 'unpaid', 'assigned', 'usr_driver_malik',
    125.00, 0.00, 15.63, 0.00, 25.00, 165.63, 16, 'Customer requested delivery receipt by WhatsApp',
    NULL, NULL, NULL,
    'https://waze.com/ul?q=25%20Main%20Road%20Chaguanas%20Trinidad%20and%20Tobago&navigate=yes',
    'https://pay.example.com/caribbean-pos-connect?order=1025&amount=165.63&phone=18681234567',
    'https://wa.me/18684437582?text=New%20Order%20-%20Caribbean%20POS%20Connect%0AOrder%20%23%3A%201025',
    'https://wa.me/18681234567?text=Hi%20John%20Doe%2C%20your%20order%20%231025%20was%20received.%20Total%3A%20TT%24165.63.',
    'usr_cashier_renee', NOW() - INTERVAL '2 days'
  ),
  (
    'ord_1026', 'biz_savannah_sea', '1026', 'cus_priya',
    '{"name":"Priya Singh","phone":"868-222-9988","email":"priya@example.com","street_address":"7 Coffee Street","city":"Tunapuna","region":"Tunapuna-Piarco","country":"Trinidad and Tobago","delivery_notes":"Leave at reception","preferred_payment_method":"WiPay","marketing_consent":true}'::jsonb,
    'in_store', 'completed', 'Cash', 'paid', 'not_required', NULL,
    76.00, 0.00, 9.50, 0.00, 0.00, 85.50, 9, 'In-store lunch sale',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'usr_cashier_renee', NOW() - INTERVAL '1 day'
  ),
  (
    'ord_1027', 'biz_savannah_sea', '1027', 'cus_maria',
    '{"name":"Maria Joseph","phone":"868-333-4444","email":"maria@example.com","street_address":"12 High Street","city":"San Fernando","region":"San Fernando","country":"Trinidad and Tobago","delivery_notes":"Ring gate bell","preferred_payment_method":"Card","marketing_consent":false}'::jsonb,
    'pickup', 'completed', 'Card', 'paid', 'not_required', NULL,
    136.00, 10.00, 15.75, 0.00, 0.00, 141.75, 14, 'Pickup apparel order',
    NULL, NULL, NULL, NULL,
    'https://pay.example.com/caribbean-pos-connect?order=1027&amount=141.75&phone=18683334444',
    NULL, 'https://wa.me/18683334444?text=Hi%20Maria%20Joseph%2C%20your%20order%20%231027%20was%20received.%20Total%3A%20TT%24141.75.',
    'usr_manager_asha', NOW() - INTERVAL '4 hours'
  )
ON CONFLICT (id) DO UPDATE SET
  payment_status = EXCLUDED.payment_status,
  delivery_status = EXCLUDED.delivery_status,
  total = EXCLUDED.total,
  updated_at = NOW();

INSERT INTO public.order_items (
  id, order_id, product_id, product_name, sku, quantity, unit_price, cost_price, discount, line_total
) VALUES
  ('itm_1025_jerk', 'ord_1025', 'prd_jerk', 'Jerk Chicken Meal', 'FOOD-JERK-001', 2, 55.00, 38.00, 0.00, 110.00),
  ('itm_1025_sorrel', 'ord_1025', 'prd_sorrel', 'Sorrel Drink', 'DRINK-SOR-003', 1, 15.00, 6.00, 0.00, 15.00),
  ('itm_1026_doubles', 'ord_1026', 'prd_doubles', 'Doubles Pack', 'FOOD-DOUB-002', 4, 12.00, 6.00, 0.00, 48.00),
  ('itm_1026_mauby', 'ord_1026', 'prd_mauby', 'Mauby Bottle', 'DRINK-MAU-004', 2, 14.00, 5.00, 0.00, 28.00),
  ('itm_1027_tee', 'ord_1027', 'prd_tee', 'Screen Printed Tee', 'APP-TEE-006', 1, 120.00, 48.00, 10.00, 110.00),
  ('itm_1027_plantain', 'ord_1027', 'prd_plantain', 'Plantain Chips', 'SNACK-PLA-005', 1, 16.00, 7.00, 0.00, 16.00)
ON CONFLICT (id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  discount = EXCLUDED.discount,
  line_total = EXCLUDED.line_total;

INSERT INTO public.payments (
  id, business_id, order_id, method, status, amount, currency, provider, payment_link, paid_at, metadata
) VALUES
  ('pay_1025', 'biz_savannah_sea', 'ord_1025', 'Pay on delivery', 'unpaid', 165.63, 'TTD', 'manual', 'https://pay.example.com/caribbean-pos-connect?order=1025&amount=165.63&phone=18681234567', NULL, '{"note":"Collect on delivery"}'::jsonb),
  ('pay_1026', 'biz_savannah_sea', 'ord_1026', 'Cash', 'paid', 85.50, 'TTD', 'cash', NULL, NOW() - INTERVAL '1 day', '{}'::jsonb),
  ('pay_1027', 'biz_savannah_sea', 'ord_1027', 'Card', 'paid', 141.75, 'TTD', 'card', 'https://pay.example.com/caribbean-pos-connect?order=1027&amount=141.75&phone=18683334444', NOW() - INTERVAL '4 hours', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  amount = EXCLUDED.amount,
  payment_link = EXCLUDED.payment_link,
  paid_at = EXCLUDED.paid_at,
  updated_at = NOW();

INSERT INTO public.inventory_logs (
  id, business_id, product_id, type, quantity_delta, reason, reference_id, user_id, created_at
) VALUES
  ('mov_1025_jerk', 'biz_savannah_sea', 'prd_jerk', 'sale', -2, 'Sale order #1025', 'ord_1025', 'usr_cashier_renee', NOW() - INTERVAL '2 days'),
  ('mov_1025_sorrel', 'biz_savannah_sea', 'prd_sorrel', 'sale', -1, 'Sale order #1025', 'ord_1025', 'usr_cashier_renee', NOW() - INTERVAL '2 days'),
  ('mov_1026_doubles', 'biz_savannah_sea', 'prd_doubles', 'sale', -4, 'Sale order #1026', 'ord_1026', 'usr_cashier_renee', NOW() - INTERVAL '1 day'),
  ('mov_1026_mauby', 'biz_savannah_sea', 'prd_mauby', 'sale', -2, 'Sale order #1026', 'ord_1026', 'usr_cashier_renee', NOW() - INTERVAL '1 day'),
  ('mov_1027_tee', 'biz_savannah_sea', 'prd_tee', 'sale', -1, 'Sale order #1027', 'ord_1027', 'usr_manager_asha', NOW() - INTERVAL '4 hours'),
  ('mov_1027_plantain', 'biz_savannah_sea', 'prd_plantain', 'sale', -1, 'Sale order #1027', 'ord_1027', 'usr_manager_asha', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.receipts (id, order_id, receipt_number, channel) VALUES
  ('rcp_1025', 'ord_1025', 'R-4025', 'print'),
  ('rcp_1026', 'ord_1026', 'R-4026', 'print'),
  ('rcp_1027', 'ord_1027', 'R-4027', 'print')
ON CONFLICT (receipt_number) DO NOTHING;

INSERT INTO public.loyalty_transactions (
  id, customer_id, order_id, points_delta, type, notes, created_at
) VALUES
  ('loy_1025', 'cus_john', 'ord_1025', 16, 'earned', 'Earned on order #1025', NOW() - INTERVAL '2 days'),
  ('loy_1026', 'cus_priya', 'ord_1026', 9, 'earned', 'Earned on order #1026', NOW() - INTERVAL '1 day'),
  ('loy_1027', 'cus_maria', 'ord_1027', 14, 'earned', 'Earned on order #1027', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.delivery_events (
  id, order_id, driver_id, status, notes, created_at
) VALUES
  ('del_1025_created', 'ord_1025', 'usr_driver_malik', 'assigned', 'Delivery order assigned to driver', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (
  id, business_id, plan_name, status, seats, monthly_price, currency, provider,
  current_period_start, current_period_end, metadata
) VALUES (
  'sub_demo_launch',
  'biz_savannah_sea',
  'Launch Plan',
  'trialing',
  5,
  0.00,
  'TTD',
  'manual',
  NOW(),
  NOW() + INTERVAL '30 days',
  '{"notes":"Seed subscription for launch testing"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW();

INSERT INTO public.settings (key, business_id, value) VALUES
  ('business_name', 'biz_savannah_sea', to_jsonb('Savannah & Sea Retail Ltd.'::text)),
  ('business_phone', 'biz_savannah_sea', to_jsonb('868-443-7582'::text)),
  ('business_email', 'biz_savannah_sea', to_jsonb('hello@savannahsea.tt'::text)),
  ('business_address', 'biz_savannah_sea', to_jsonb('18 Independence Square, Port of Spain, Trinidad and Tobago'::text)),
  ('currency', 'biz_savannah_sea', to_jsonb('TTD'::text)),
  ('tax_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('tax_rate', 'biz_savannah_sea', '12.5'::jsonb),
  ('service_fee_enabled', 'biz_savannah_sea', 'false'::jsonb),
  ('service_fee_rate', 'biz_savannah_sea', '0'::jsonb),
  ('delivery_fee', 'biz_savannah_sea', '25'::jsonb),
  ('delivery_rates', 'biz_savannah_sea', '{"Port of Spain":25,"San Fernando":30,"Chaguanas":25,"Arima":30,"Point Fortin":55,"Couva-Tabaquite-Talparo":35,"Diego Martin":30,"San Juan-Laventille":28,"Tunapuna-Piarco":30,"Siparia":50,"Penal-Debe":45,"Princes Town":45,"Mayaro-Rio Claro":60,"Sangre Grande":45,"Tobago":75}'::jsonb),
  ('receipt_message', 'biz_savannah_sea', to_jsonb('Thank you for shopping with Savannah & Sea Retail Ltd.'::text)),
  ('loyalty_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('loyalty_points_per_ttd', 'biz_savannah_sea', '0.1'::jsonb),
  ('loyalty_redeem_ttd_per_point', 'biz_savannah_sea', '0.1'::jsonb),
  ('payment_links_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('payment_link_template', 'biz_savannah_sea', to_jsonb('https://pay.example.com/caribbean-pos-connect?order={{order_number}}&amount={{amount}}&phone={{customer_phone}}'::text)),
  ('whatsapp_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('whatsapp_business_number', 'biz_savannah_sea', to_jsonb('4437582368'::text)),
  ('whatsapp_country_code', 'biz_savannah_sea', to_jsonb('+1'::text)),
  ('whatsapp_order_template', 'biz_savannah_sea', to_jsonb('New Order - Caribbean POS Connect\n\nOrder #: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}}\nStatus: {{payment_status}}\nPayment link: {{payment_link}}\n\nWaze:\n{{waze_link}}'::text)),
  ('facebook_url', 'biz_savannah_sea', to_jsonb('https://facebook.com/caribbeanposconnect'::text)),
  ('instagram_url', 'biz_savannah_sea', to_jsonb('https://instagram.com/caribbeanposconnect'::text)),
  ('payment_cash_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('payment_card_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('payment_bank_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('payment_paypal_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('payment_wipay_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('payment_pod_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('receipt_print_customer_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('receipt_print_kitchen_enabled', 'biz_savannah_sea', 'false'::jsonb),
  ('receipt_email_enabled', 'biz_savannah_sea', 'true'::jsonb),
  ('receipt_whatsapp_enabled', 'biz_savannah_sea', 'false'::jsonb),
  ('order_counter', 'biz_savannah_sea', '1027'::jsonb),
  ('receipt_counter', 'biz_savannah_sea', '4027'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  business_id = EXCLUDED.business_id,
  updated_at = NOW();

INSERT INTO public.audit_logs (
  id, user_id, action, entity_type, entity_id, metadata
) VALUES (
  'aud_seed_initial',
  'usr_demo_admin',
  'database:seed',
  'business',
  'biz_savannah_sea',
  '{"source":"db/supabase_schema_seed.sql"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

COMMIT;
