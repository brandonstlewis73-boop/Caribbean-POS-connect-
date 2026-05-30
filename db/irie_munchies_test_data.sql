-- Optional test data for a separate Caribbean food business.
-- Run manually after db/supabase_schema_seed.sql when you want sample storefront/POS data.

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
      ('public.order_status_history', 'id', 'idx_order_status_history_id_conflict_unique'),
      ('public.customer_notifications', 'id', 'idx_customer_notifications_id_conflict_unique')
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

INSERT INTO public.businesses (
  id, name, legal_name, slug, storefront_slug, owner_name, owner_email, owner_phone,
  business_whatsapp_number, phone, email, street_address, city, region, country, currency,
  logo_url, subscription_plan, subscription_status, trial_ends_at
) VALUES (
  'biz_irie_munchies',
  'Irie Munchies',
  'Irie Munchies',
  'irie-munchies',
  'irie-munchies',
  'Irie Owner',
  'owner@iriemunchies.test',
  '+18683353697',
  '+18683353697',
  '+18683353697',
  'owner@iriemunchies.test',
  'High Street',
  'San Fernando',
  'San Fernando',
  'Trinidad and Tobago',
  'TTD',
  '/logo.svg',
  'starter',
  'trial',
  NOW() + INTERVAL '14 days'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  storefront_slug = EXCLUDED.storefront_slug,
  owner_name = EXCLUDED.owner_name,
  owner_email = EXCLUDED.owner_email,
  owner_phone = EXCLUDED.owner_phone,
  business_whatsapp_number = EXCLUDED.business_whatsapp_number,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  street_address = EXCLUDED.street_address,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  country = EXCLUDED.country,
  currency = EXCLUDED.currency,
  updated_at = NOW();

INSERT INTO public.staff_users (
  id, business_id, name, email, password_hash, role, phone, active
) VALUES (
  'usr_irie_owner',
  'biz_irie_munchies',
  'Irie Owner',
  'owner@iriemunchies.test',
  '$2a$12$TBtPQakrJnSP8Y8yJj0lOOiS2auAZ1hrNKyioYJRvkNQvIy4FFeAG',
  'admin',
  '+18683353697',
  TRUE
) ON CONFLICT (email) DO UPDATE SET
  business_id = EXCLUDED.business_id,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  active = EXCLUDED.active,
  updated_at = NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_settings_business_key ON public.business_settings(business_id, key);

INSERT INTO public.business_settings (business_id, key, value) VALUES
  ('biz_irie_munchies', 'business_name', to_jsonb('Irie Munchies'::text)),
  ('biz_irie_munchies', 'business_phone', to_jsonb('+18683353697'::text)),
  ('biz_irie_munchies', 'business_email', to_jsonb('owner@iriemunchies.test'::text)),
  ('biz_irie_munchies', 'business_address', to_jsonb('High Street, San Fernando, Trinidad and Tobago'::text)),
  ('biz_irie_munchies', 'business_street_address', to_jsonb('High Street'::text)),
  ('biz_irie_munchies', 'business_city', to_jsonb('San Fernando'::text)),
  ('biz_irie_munchies', 'business_region', to_jsonb('San Fernando'::text)),
  ('biz_irie_munchies', 'business_country', to_jsonb('Trinidad and Tobago'::text)),
  ('biz_irie_munchies', 'logo_url', to_jsonb('/logo.svg'::text)),
  ('biz_irie_munchies', 'currency', to_jsonb('TTD'::text)),
  ('biz_irie_munchies', 'whatsapp_enabled', 'true'::jsonb),
  ('biz_irie_munchies', 'whatsapp_business_number', to_jsonb('+18683353697'::text)),
  ('biz_irie_munchies', 'whatsapp_country_code', to_jsonb('+1868'::text)),
  ('biz_irie_munchies', 'whatsapp_owner_alerts_enabled', 'true'::jsonb),
  ('biz_irie_munchies', 'whatsapp_customer_confirmations_enabled', 'true'::jsonb),
  ('biz_irie_munchies', 'whatsapp_customer_receipts_enabled', 'true'::jsonb),
  ('biz_irie_munchies', 'notification_whatsapp_enabled', 'true'::jsonb),
  ('biz_irie_munchies', 'notification_sms_enabled', 'false'::jsonb),
  ('biz_irie_munchies', 'notification_email_enabled', 'false'::jsonb),
  ('biz_irie_munchies', 'default_prep_time_minutes', '25'::jsonb)
ON CONFLICT (business_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

INSERT INTO public.categories (id, business_id, name, slug, icon, color, sort_order, active, is_active) VALUES
  ('cat_irie_jerk', 'biz_irie_munchies', 'Jerk Chicken', 'jerk-chicken', 'JC', '#0f766e', 10, TRUE, TRUE),
  ('cat_irie_curry', 'biz_irie_munchies', 'Curry', 'curry', 'CU', '#d97706', 20, TRUE, TRUE),
  ('cat_irie_drinks', 'biz_irie_munchies', 'Drinks', 'drinks', 'DR', '#2563eb', 30, TRUE, TRUE),
  ('cat_irie_desserts', 'biz_irie_munchies', 'Desserts', 'desserts', 'DE', '#be123c', 40, TRUE, TRUE),
  ('cat_irie_specials', 'biz_irie_munchies', 'Specials', 'specials', 'SP', '#9333ea', 50, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO public.products (
  id, business_id, name, sku, barcode, category, category_id, description, cost_price, selling_price,
  stock_quantity, low_stock_alert, image_url, variations, add_ons, active
) VALUES
  ('prd_irie_jerk_bowl', 'biz_irie_munchies', 'Jerk Chicken Bowl', 'IRIE-JERK-BOWL', '868210000001', 'Jerk Chicken', 'cat_irie_jerk', 'Jerk chicken, rice, plantain, and salad.', 28.00, 50.00, 45, 8, '', '[{"name":"Regular","price_delta":0},{"name":"Large","price_delta":12}]'::jsonb, '[{"name":"Extra sauce","price_delta":3},{"name":"Extra plantain","price_delta":8}]'::jsonb, TRUE),
  ('prd_irie_curry_plate', 'biz_irie_munchies', 'Curry Chicken Plate', 'IRIE-CURRY-PLATE', '868210000002', 'Curry', 'cat_irie_curry', 'Curry chicken with rice, channa, and salad.', 24.00, 45.00, 38, 8, '', '[{"name":"Regular","price_delta":0},{"name":"Large","price_delta":10}]'::jsonb, '[{"name":"Pepper sauce","price_delta":2}]'::jsonb, TRUE),
  ('prd_irie_doubles', 'biz_irie_munchies', 'Doubles', 'IRIE-DOUBLES', '868210000003', 'Specials', 'cat_irie_specials', 'Two bara with curried channa and sauces.', 5.00, 12.00, 90, 20, '', '[]'::jsonb, '[{"name":"Extra channa","price_delta":4}]'::jsonb, TRUE),
  ('prd_irie_sorrel', 'biz_irie_munchies', 'Sorrel', 'IRIE-SORREL', '868210000004', 'Drinks', 'cat_irie_drinks', 'House sorrel drink.', 5.00, 15.00, 50, 10, '', '[{"name":"Bottle","price_delta":0},{"name":"Large bottle","price_delta":8}]'::jsonb, '[]'::jsonb, TRUE),
  ('prd_irie_mauby', 'biz_irie_munchies', 'Mauby', 'IRIE-MAUBY', '868210000005', 'Drinks', 'cat_irie_drinks', 'Local mauby drink.', 5.00, 14.00, 46, 10, '', '[]'::jsonb, '[]'::jsonb, TRUE),
  ('prd_irie_black_cake', 'biz_irie_munchies', 'Black Cake', 'IRIE-BLACK-CAKE', '868210000006', 'Desserts', 'cat_irie_desserts', 'Rich Caribbean black cake slice.', 10.00, 25.00, 24, 6, '', '[]'::jsonb, '[]'::jsonb, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sku = EXCLUDED.sku,
  barcode = EXCLUDED.barcode,
  category = EXCLUDED.category,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  cost_price = EXCLUDED.cost_price,
  selling_price = EXCLUDED.selling_price,
  stock_quantity = EXCLUDED.stock_quantity,
  low_stock_alert = EXCLUDED.low_stock_alert,
  variations = EXCLUDED.variations,
  add_ons = EXCLUDED.add_ons,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO public.customers (
  id, business_id, name, phone, phone_normalized, email, street_address, city, region, country,
  delivery_notes, preferred_payment_method, notification_whatsapp, notification_sms, notification_email,
  marketing_consent, tags
) VALUES
  ('cus_irie_brandon', 'biz_irie_munchies', 'Brandon', '868-335-3697', '18683353697', 'brandon@example.com', 'Coffee Street', 'San Fernando', 'San Fernando', 'Trinidad and Tobago', 'Call on arrival', 'Pay on delivery', TRUE, FALSE, FALSE, TRUE, '["Storefront"]'::jsonb),
  ('cus_irie_alicia', 'biz_irie_munchies', 'Alicia James', '868-555-8800', '18685558800', 'alicia@example.com', 'Main Road', 'Chaguanas', 'Chaguanas', 'Trinidad and Tobago', 'Gate code 22', 'Cash', TRUE, FALSE, TRUE, TRUE, '["Pickup"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  phone_normalized = EXCLUDED.phone_normalized,
  email = EXCLUDED.email,
  street_address = EXCLUDED.street_address,
  city = EXCLUDED.city,
  region = EXCLUDED.region,
  delivery_notes = EXCLUDED.delivery_notes,
  notification_whatsapp = EXCLUDED.notification_whatsapp,
  notification_sms = EXCLUDED.notification_sms,
  notification_email = EXCLUDED.notification_email,
  updated_at = NOW();

INSERT INTO public.orders (
  id, business_id, order_number, customer_id, customer_snapshot, order_type, status,
  payment_method, payment_status, delivery_status, subtotal, discount_total, tax_total,
  service_fee, delivery_fee, total, notes, waze_link, google_maps_link, created_by, created_at
) VALUES
  ('ord_irie_2101', 'biz_irie_munchies', '2101', 'cus_irie_brandon', '{"name":"Brandon","phone":"868-335-3697","email":"brandon@example.com","street_address":"Coffee Street","city":"San Fernando","region":"San Fernando","country":"Trinidad and Tobago","notification_whatsapp":true,"notification_sms":false,"notification_email":false}'::jsonb, 'delivery', 'new', 'Pay on delivery', 'unpaid', 'pending', 85.00, 0.00, 0.00, 0.00, 25.00, 110.00, 'New storefront order', 'https://waze.com/ul?q=Coffee%20Street%20San%20Fernando%20Trinidad%20and%20Tobago&navigate=yes', 'https://maps.google.com/?q=Coffee%20Street%20San%20Fernando%20Trinidad%20and%20Tobago', 'usr_irie_owner', NOW() - INTERVAL '50 minutes'),
  ('ord_irie_2102', 'biz_irie_munchies', '2102', 'cus_irie_alicia', '{"name":"Alicia James","phone":"868-555-8800","email":"alicia@example.com","street_address":"Main Road","city":"Chaguanas","region":"Chaguanas","country":"Trinidad and Tobago","notification_whatsapp":true,"notification_sms":false,"notification_email":true}'::jsonb, 'pickup', 'accepted', 'Cash', 'unpaid', 'not_required', 62.00, 0.00, 0.00, 0.00, 0.00, 62.00, 'Pickup for lunch', NULL, NULL, 'usr_irie_owner', NOW() - INTERVAL '35 minutes'),
  ('ord_irie_2103', 'biz_irie_munchies', '2103', 'cus_irie_brandon', '{"name":"Brandon","phone":"868-335-3697","email":"brandon@example.com","street_address":"Coffee Street","city":"San Fernando","region":"San Fernando","country":"Trinidad and Tobago","notification_whatsapp":true,"notification_sms":false,"notification_email":false}'::jsonb, 'delivery', 'preparing', 'Pay on delivery', 'unpaid', 'pending', 95.00, 0.00, 0.00, 0.00, 25.00, 120.00, 'Preparing order', 'https://waze.com/ul?q=Coffee%20Street%20San%20Fernando%20Trinidad%20and%20Tobago&navigate=yes', 'https://maps.google.com/?q=Coffee%20Street%20San%20Fernando%20Trinidad%20and%20Tobago', 'usr_irie_owner', NOW() - INTERVAL '20 minutes'),
  ('ord_irie_2104', 'biz_irie_munchies', '2104', 'cus_irie_alicia', '{"name":"Alicia James","phone":"868-555-8800","email":"alicia@example.com","street_address":"Main Road","city":"Chaguanas","region":"Chaguanas","country":"Trinidad and Tobago","notification_whatsapp":true,"notification_sms":false,"notification_email":true}'::jsonb, 'pickup', 'ready', 'Cash', 'paid', 'not_required', 40.00, 0.00, 0.00, 0.00, 0.00, 40.00, 'Ready for pickup', NULL, NULL, 'usr_irie_owner', NOW() - INTERVAL '12 minutes'),
  ('ord_irie_2105', 'biz_irie_munchies', '2105', 'cus_irie_brandon', '{"name":"Brandon","phone":"868-335-3697","email":"brandon@example.com","street_address":"Coffee Street","city":"San Fernando","region":"San Fernando","country":"Trinidad and Tobago","notification_whatsapp":true,"notification_sms":false,"notification_email":false}'::jsonb, 'delivery', 'completed', 'Card', 'paid', 'delivered', 75.00, 0.00, 0.00, 0.00, 25.00, 100.00, 'Completed sample order', 'https://waze.com/ul?q=Coffee%20Street%20San%20Fernando%20Trinidad%20and%20Tobago&navigate=yes', 'https://maps.google.com/?q=Coffee%20Street%20San%20Fernando%20Trinidad%20and%20Tobago', 'usr_irie_owner', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status,
  delivery_status = EXCLUDED.delivery_status,
  total = EXCLUDED.total,
  updated_at = NOW();

INSERT INTO public.order_items (
  id, order_id, product_id, product_name, sku, quantity, unit_price, cost_price, discount, line_total
) VALUES
  ('itm_irie_2101_jerk', 'ord_irie_2101', 'prd_irie_jerk_bowl', 'Jerk Chicken Bowl', 'IRIE-JERK-BOWL', 1, 50.00, 28.00, 0.00, 50.00),
  ('itm_irie_2101_sorrel', 'ord_irie_2101', 'prd_irie_sorrel', 'Sorrel', 'IRIE-SORREL', 1, 15.00, 5.00, 0.00, 15.00),
  ('itm_irie_2101_doubles', 'ord_irie_2101', 'prd_irie_doubles', 'Doubles', 'IRIE-DOUBLES', 1, 12.00, 5.00, 0.00, 12.00),
  ('itm_irie_2102_curry', 'ord_irie_2102', 'prd_irie_curry_plate', 'Curry Chicken Plate', 'IRIE-CURRY-PLATE', 1, 45.00, 24.00, 0.00, 45.00),
  ('itm_irie_2102_mauby', 'ord_irie_2102', 'prd_irie_mauby', 'Mauby', 'IRIE-MAUBY', 1, 14.00, 5.00, 0.00, 14.00),
  ('itm_irie_2103_jerk', 'ord_irie_2103', 'prd_irie_jerk_bowl', 'Jerk Chicken Bowl', 'IRIE-JERK-BOWL', 1, 50.00, 28.00, 0.00, 50.00),
  ('itm_irie_2103_curry', 'ord_irie_2103', 'prd_irie_curry_plate', 'Curry Chicken Plate', 'IRIE-CURRY-PLATE', 1, 45.00, 24.00, 0.00, 45.00),
  ('itm_irie_2104_black_cake', 'ord_irie_2104', 'prd_irie_black_cake', 'Black Cake', 'IRIE-BLACK-CAKE', 1, 25.00, 10.00, 0.00, 25.00),
  ('itm_irie_2105_sorrel', 'ord_irie_2105', 'prd_irie_sorrel', 'Sorrel', 'IRIE-SORREL', 5, 15.00, 5.00, 0.00, 75.00)
ON CONFLICT (id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_price = EXCLUDED.unit_price,
  cost_price = EXCLUDED.cost_price,
  discount = EXCLUDED.discount,
  line_total = EXCLUDED.line_total;

INSERT INTO public.order_status_history (id, order_id, status, note, changed_by, created_at) VALUES
  ('osh_irie_2101_new', 'ord_irie_2101', 'new', 'Order received from storefront', 'usr_irie_owner', NOW() - INTERVAL '50 minutes'),
  ('osh_irie_2102_new', 'ord_irie_2102', 'new', 'Order received from storefront', 'usr_irie_owner', NOW() - INTERVAL '35 minutes'),
  ('osh_irie_2102_accepted', 'ord_irie_2102', 'accepted', 'Accepted by owner', 'usr_irie_owner', NOW() - INTERVAL '30 minutes'),
  ('osh_irie_2103_new', 'ord_irie_2103', 'new', 'Order received from storefront', 'usr_irie_owner', NOW() - INTERVAL '20 minutes'),
  ('osh_irie_2103_accepted', 'ord_irie_2103', 'accepted', 'Accepted by owner', 'usr_irie_owner', NOW() - INTERVAL '18 minutes'),
  ('osh_irie_2103_preparing', 'ord_irie_2103', 'preparing', 'Kitchen started preparing', 'usr_irie_owner', NOW() - INTERVAL '15 minutes'),
  ('osh_irie_2104_new', 'ord_irie_2104', 'new', 'Order received from storefront', 'usr_irie_owner', NOW() - INTERVAL '12 minutes'),
  ('osh_irie_2104_ready', 'ord_irie_2104', 'ready', 'Pickup order ready', 'usr_irie_owner', NOW() - INTERVAL '5 minutes'),
  ('osh_irie_2105_new', 'ord_irie_2105', 'new', 'Order received from storefront', 'usr_irie_owner', NOW() - INTERVAL '1 day'),
  ('osh_irie_2105_completed', 'ord_irie_2105', 'completed', 'Order completed', 'usr_irie_owner', NOW() - INTERVAL '23 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customer_notifications (
  id, business_id, order_id, customer_id, channel, status, message, destination, provider, delivery_status, created_at
) VALUES
  ('ntf_irie_2101_whatsapp', 'biz_irie_munchies', 'ord_irie_2101', 'cus_irie_brandon', 'whatsapp', 'new', 'Hi Brandon, we received your order #2101. We will update you shortly.', '18683353697', 'placeholder', 'skipped', NOW() - INTERVAL '50 minutes'),
  ('ntf_irie_2102_whatsapp', 'biz_irie_munchies', 'ord_irie_2102', 'cus_irie_alicia', 'whatsapp', 'accepted', 'Good news Alicia James, your order #2102 has been accepted.', '18685558800', 'placeholder', 'skipped', NOW() - INTERVAL '30 minutes'),
  ('ntf_irie_2103_whatsapp', 'biz_irie_munchies', 'ord_irie_2103', 'cus_irie_brandon', 'whatsapp', 'preparing', 'Your order #2103 is now being prepared.', '18683353697', 'placeholder', 'skipped', NOW() - INTERVAL '15 minutes'),
  ('ntf_irie_2104_whatsapp', 'biz_irie_munchies', 'ord_irie_2104', 'cus_irie_alicia', 'whatsapp', 'ready', 'Your order #2104 is ready.', '18685558800', 'placeholder', 'skipped', NOW() - INTERVAL '5 minutes'),
  ('ntf_irie_2105_whatsapp', 'biz_irie_munchies', 'ord_irie_2105', 'cus_irie_brandon', 'whatsapp', 'completed', 'Thank you Brandon! Your order #2105 is completed. We appreciate your business.', '18683353697', 'placeholder', 'skipped', NOW() - INTERVAL '23 hours')
ON CONFLICT (id) DO NOTHING;
