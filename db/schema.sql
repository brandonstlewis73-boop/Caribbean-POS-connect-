CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  slug TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  country TEXT NOT NULL DEFAULT 'Trinidad and Tobago',
  currency TEXT NOT NULL DEFAULT 'TTD',
  logo_url TEXT,
  tax_id TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'cashier', 'dispatcher', 'driver', 'kitchen', 'staff')),
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'manager', 'cashier', 'dispatcher', 'driver', 'kitchen', 'staff'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
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
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_business_slug ON categories((COALESCE(business_id, '')), slug);
CREATE INDEX IF NOT EXISTS idx_categories_business_order ON categories(business_id, is_active, sort_order, name);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  phone_normalized TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT NOT NULL DEFAULT 'Trinidad and Tobago',
  postal_code TEXT,
  delivery_notes TEXT,
  waze_link TEXT,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  preferred_payment_method TEXT,
  notes TEXT,
  birthday TEXT,
  notification_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  notification_sms BOOLEAN NOT NULL DEFAULT FALSE,
  notification_email BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS waze_link TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gps_latitude NUMERIC;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gps_longitude NUMERIC;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notification_whatsapp BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notification_email BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers DROP COLUMN IF EXISTS community;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  category_id TEXT,
  category TEXT NOT NULL,
  description TEXT,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  discount_price NUMERIC,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_alert INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  supplier_name TEXT,
  supplier_phone TEXT,
  variations JSONB NOT NULL DEFAULT '[]'::jsonb,
  add_ons JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_lookup ON products(name, sku, barcode, category);
ALTER TABLE products ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS add_ons JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_fkey;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_business_sku ON products((COALESCE(business_id, '')), sku);
CREATE INDEX IF NOT EXISTS idx_products_business_category ON products(business_id, category_id, active);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  customer_snapshot JSONB NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('in_store', 'pickup', 'delivery', 'online', 'draft')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'new', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')) DEFAULT 'new',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'refunded')) DEFAULT 'paid',
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('not_required', 'pending', 'assigned', 'out_for_delivery', 'delivered', 'failed')) DEFAULT 'not_required',
  assigned_driver_id TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  tax_total NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
  loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  delivery_latitude NUMERIC,
  delivery_longitude NUMERIC,
  delivery_postal_code TEXT,
  delivery_location_link TEXT,
  waze_link TEXT,
  google_maps_link TEXT,
  payment_link TEXT,
  whatsapp_business_link TEXT,
  whatsapp_customer_link TEXT,
  created_by TEXT,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  inventory_applied BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_driver_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('draft', 'new', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS inventory_applied BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_postal_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
UPDATE orders
SET inventory_applied = TRUE,
    completed_at = COALESCE(completed_at, updated_at, created_at)
WHERE status = 'completed' AND inventory_applied = FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at);

CREATE TABLE IF NOT EXISTS customer_notifications (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'in_app')),
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  destination TEXT,
  provider TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued', 'sent', 'skipped', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_order ON customer_notifications(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_business ON customer_notifications(business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'manual_adjustment', 'restock', 'return')),
  quantity_delta INTEGER NOT NULL,
  reason TEXT,
  reference_id TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  order_number TEXT,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  tax_total NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  channel TEXT NOT NULL DEFAULT 'print',
  email_to TEXT,
  pdf_path TEXT,
  whatsapp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS discount_total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tax_total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_order_unique ON receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer_lookup ON receipts(customer_name, customer_phone);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  order_id TEXT,
  points_delta INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'manual_adjustment')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS delivery_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  driver_id TEXT,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS help_articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'staff' CHECK (visibility IN ('admin', 'staff', 'public')),
  published BOOLEAN NOT NULL DEFAULT TRUE,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_help_articles_search ON help_articles(title, category);
CREATE INDEX IF NOT EXISTS idx_help_articles_visibility ON help_articles(visibility, published);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  business_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  issue_category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'waiting_on_customer', 'resolved', 'closed')),
  message TEXT NOT NULL,
  screenshot_url TEXT,
  ai_summary TEXT,
  ai_category TEXT,
  ai_priority TEXT CHECK (ai_priority IN ('low', 'medium', 'high', 'urgent')),
  ai_possible_solution TEXT,
  ai_steps_tried JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_category TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_priority TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_possible_solution TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ai_steps_tried JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_submitter ON support_tickets(submitted_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at);

CREATE TABLE IF NOT EXISTS ai_support_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  business_id TEXT,
  question TEXT NOT NULL,
  response_summary TEXT,
  ticket_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_support_logs_user ON ai_support_logs(user_id, created_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'starter',
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'cancelled')),
  seats INTEGER NOT NULL DEFAULT 1,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TTD',
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_whatsapp_number TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS storefront_slug TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'starter';
ALTER TABLE businesses ALTER COLUMN subscription_plan SET DEFAULT 'starter';
UPDATE businesses SET subscription_plan = 'starter'
WHERE subscription_plan NOT IN ('starter', 'pro', 'premium', 'business');
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS setup_checklist JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS longitude NUMERIC;

UPDATE businesses
SET storefront_slug = COALESCE(storefront_slug, slug),
    business_whatsapp_number = COALESCE(business_whatsapp_number, phone),
    owner_email = COALESCE(owner_email, email),
    owner_phone = COALESCE(owner_phone, phone)
WHERE storefront_slug IS NULL
   OR business_whatsapp_number IS NULL
   OR owner_email IS NULL
   OR owner_phone IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_storefront_slug ON businesses(storefront_slug);

CREATE TABLE IF NOT EXISTS business_settings (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (business_id, key)
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE ai_support_logs ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind IN ('r', 'p')
  ) THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES businesses(id) ON DELETE SET NULL;
    UPDATE users SET business_id = 'biz_savannah_sea' WHERE business_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_users_business_role ON users(business_id, role, active);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind = 'v'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_users' AND column_name = 'business_id'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
      SELECT id, name, email, password_hash, role, phone, active, created_at, updated_at, business_id
      FROM public.staff_users';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'stock_movements' AND c.relkind IN ('r', 'p')
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE;
    UPDATE stock_movements SET business_id = 'biz_savannah_sea' WHERE business_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'stock_movements' AND c.relkind = 'v'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_logs' AND column_name = 'business_id'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.stock_movements WITH (security_invoker = true) AS
      SELECT id, product_id, type, quantity_delta, reason, reference_id, user_id, created_at, business_id
      FROM public.inventory_logs';
  END IF;
END $$;

UPDATE products SET business_id = 'biz_savannah_sea' WHERE business_id IS NULL;
UPDATE customers SET business_id = 'biz_savannah_sea' WHERE business_id IS NULL;
UPDATE orders SET business_id = 'biz_savannah_sea' WHERE business_id IS NULL;
UPDATE receipts SET business_id = 'biz_savannah_sea' WHERE business_id IS NULL;
UPDATE audit_logs SET business_id = 'biz_savannah_sea' WHERE business_id IS NULL;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_business_sku ON products(business_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_business_active ON products(business_id, active);
CREATE INDEX IF NOT EXISTS idx_customers_business_lookup ON customers(business_id, phone_normalized, email);
CREATE INDEX IF NOT EXISTS idx_orders_business_created ON orders(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_business_created ON receipts(business_id, created_at DESC);
