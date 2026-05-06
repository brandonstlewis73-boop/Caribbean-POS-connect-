import { subDays, startOfDay } from "date-fns";
import { isDemoMode, query, transaction, createId, type PoolClient } from "./db";
import { CURRENCY_CODE, DEFAULT_DELIVERY_RATES } from "./constants";
import {
  demoAdjustStock,
  demoCreateCustomer,
  demoCreateOrder,
  demoCreateProduct,
  demoDashboardData,
  demoGetCustomer,
  demoGetCustomerProfile,
  demoGetOrder,
  demoGetProduct,
  demoGetReceiptNumber,
  demoGetSettings,
  demoListAuditLogs,
  demoListCustomers,
  demoListOrders,
  demoListProducts,
  demoListUsers,
  demoUpdateCustomer,
  demoUpdateDeliveryStatus,
  demoUpdateOrder,
  demoUpdateProduct,
  demoUpdateSettings
} from "./demo-store";
import type {
  CheckoutPayload,
  Customer,
  CustomerInput,
  DashboardData,
  Order,
  OrderItem,
  Product,
  Settings,
  User
} from "./types";
import { buildAddress, buildWazeLink } from "./waze";
import {
  buildCustomerConfirmationMessage,
  buildOrderWhatsAppMessage,
  buildWhatsAppLink,
  cleanWhatsAppNumber
} from "./whatsapp";

type DbClient = PoolClient;

const defaultSettings: Settings = {
  business_name: "Savannah & Sea Retail Ltd.",
  business_phone: "868-555-2190",
  business_email: "hello@savannahsea.tt",
  business_address: "18 Independence Square, Port of Spain, Trinidad and Tobago",
  currency: CURRENCY_CODE,
  tax_enabled: true,
  tax_rate: 12.5,
  service_fee_enabled: false,
  service_fee_rate: 0,
  delivery_fee: 25,
  receipt_message: "Thank you for shopping with us.",
  loyalty_enabled: true,
  loyalty_points_per_ttd: 0.1,
  loyalty_redeem_ttd_per_point: 0.1,
  delivery_rates: DEFAULT_DELIVERY_RATES,
  payment_links_enabled: true,
  payment_link_template:
    "https://pay.example.com/caribbean-pos-connect?order={{order_number}}&amount={{amount}}&phone={{customer_phone}}",
  whatsapp_enabled: true,
  whatsapp_business_number: "4437582368",
  whatsapp_country_code: "+1",
  whatsapp_order_template:
    "New Order - Caribbean POS Connect\n\nOrder #: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}}\nStatus: {{payment_status}}\nPayment link: {{payment_link}}\n\nWaze:\n{{waze_link}}",
  facebook_url: "https://facebook.com/caribbeanposconnect",
  instagram_url: "https://instagram.com/caribbeanposconnect",
  payment_cash_enabled: true,
  payment_card_enabled: true,
  payment_bank_enabled: true,
  payment_paypal_enabled: true,
  payment_wipay_enabled: true,
  payment_pod_enabled: true
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function bool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return Boolean(Number(value));
}

function toDateString(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeDeliveryRates(value?: Record<string, number> | null) {
  return {
    ...DEFAULT_DELIVERY_RATES,
    ...(value || {})
  };
}

function getDeliveryFeeForRegion(settings: Settings, region?: string | null) {
  const rates: Record<string, number> = normalizeDeliveryRates(settings.delivery_rates);
  if (region && rates[region] !== undefined) {
    return Number(rates[region]);
  }
  return Number(settings.delivery_fee || 0);
}

function addParam(params: unknown[], value: unknown) {
  params.push(value);
  return `$${params.length}`;
}

function buildPaymentLink({
  orderNumber,
  receiptNumber,
  total,
  paymentMethod,
  customer,
  settings
}: {
  orderNumber: string;
  receiptNumber: string;
  total: number;
  paymentMethod: string;
  customer: CustomerInput;
  settings: Settings;
}) {
  if (!settings.payment_links_enabled) return null;
  const template = settings.payment_link_template?.trim();
  if (!template) return null;

  const replacements: Record<string, string> = {
    "{{order_number}}": orderNumber,
    "{{receipt_number}}": receiptNumber,
    "{{amount}}": total.toFixed(2),
    "{{total}}": total.toFixed(2),
    "{{total_label}}": `${CURRENCY_CODE} ${total.toFixed(2)}`,
    "{{customer_name}}": customer.name || "Customer",
    "{{customer_phone}}": cleanWhatsAppNumber(customer.phone) || "",
    "{{payment_method}}": paymentMethod
  };

  return Object.entries(replacements).reduce(
    (link, [token, value]) => link.replaceAll(token, encodeURIComponent(value)),
    template
  );
}

function rowToProduct(row: any): Product {
  return {
    ...row,
    cost_price: Number(row.cost_price),
    selling_price: Number(row.selling_price),
    stock_quantity: Number(row.stock_quantity),
    low_stock_alert: Number(row.low_stock_alert),
    active: bool(row.active)
  };
}

function rowToCustomer(row: any): Customer {
  return {
    ...row,
    marketing_consent: bool(row.marketing_consent),
    loyalty_points: Number(row.loyalty_points),
    total_spent: Number(row.total_spent),
    orders_count: Number(row.orders_count),
    last_order_at: toDateString(row.last_order_at),
    tags: parseJson<string[]>(row.tags, [])
  };
}

function rowToOrderItem(row: any): OrderItem {
  return {
    ...row,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    cost_price: Number(row.cost_price),
    discount: Number(row.discount),
    line_total: Number(row.line_total)
  };
}

function rowToOrder(row: any, items: OrderItem[]): Order {
  return {
    ...row,
    customer_snapshot: parseJson<CustomerInput>(row.customer_snapshot, {}),
    subtotal: Number(row.subtotal),
    discount_total: Number(row.discount_total),
    tax_total: Number(row.tax_total),
    service_fee: Number(row.service_fee),
    delivery_fee: Number(row.delivery_fee),
    total: Number(row.total),
    loyalty_points_earned: Number(row.loyalty_points_earned),
    loyalty_points_redeemed: Number(row.loyalty_points_redeemed),
    delivery_latitude: row.delivery_latitude === null ? null : Number(row.delivery_latitude),
    delivery_longitude: row.delivery_longitude === null ? null : Number(row.delivery_longitude),
    created_at: toDateString(row.created_at) || "",
    updated_at: toDateString(row.updated_at) || "",
    items
  };
}

async function hydrateOrders(rows: any[], client?: DbClient) {
  if (!rows.length) return [];
  const orderIds = rows.map((row) => row.id);
  const itemRows = await query<any>(
    "SELECT * FROM order_items WHERE order_id = ANY($1::text[]) ORDER BY created_at ASC",
    [orderIds],
    client
  );
  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const row of itemRows.rows) {
    const items = itemsByOrder.get(row.order_id) || [];
    items.push(rowToOrderItem(row));
    itemsByOrder.set(row.order_id, items);
  }
  return rows.map((row) => rowToOrder(row, itemsByOrder.get(row.id) || []));
}

async function getCounter(client: DbClient, key: string, fallback: number, floor = fallback) {
  await query("SELECT pg_advisory_xact_lock(hashtext($1))", [key], client);
  const existing = await query<{ value: unknown }>(
    "SELECT value FROM settings WHERE key = $1 FOR UPDATE",
    [key],
    client
  );
  const current = parseJson<number>(existing.rows[0]?.value, fallback);
  const next = Math.max(Number(current || fallback), floor) + 1;
  await query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(next)],
    client
  );
  return next;
}

async function getMaxNumericValue(client: DbClient, table: string, column: string, fallback: number) {
  const rows = await query<{ value: number }>(
    `SELECT COALESCE(MAX(NULLIF(regexp_replace(${column}, '\\D', '', 'g'), '')::int), $1)::int AS value FROM ${table}`,
    [fallback],
    client
  );
  return Number(rows.rows[0]?.value || fallback);
}

export async function getSettings(): Promise<Settings> {
  if (isDemoMode) return demoGetSettings();
  const rows = await query<{ key: keyof Settings; value: unknown }>("SELECT key, value FROM settings");
  const settings: Record<string, unknown> = { ...defaultSettings };
  for (const row of rows.rows) {
    settings[row.key] = parseJson(row.value, row.value);
  }
  settings.delivery_rates = normalizeDeliveryRates(settings.delivery_rates as Record<string, number>);
  return settings as Settings;
}

export async function updateSettings(input: Partial<Settings>, userId?: string) {
  if (isDemoMode) return demoUpdateSettings(input, userId);
  await transaction(async (client) => {
    for (const [key, value] of Object.entries(input)) {
      await query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(value)],
        client
      );
    }
    await auditLog("settings:update", "settings", "global", input, userId, client);
  });
  return getSettings();
}

export async function auditLog(
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: unknown,
  userId?: string | null,
  client?: DbClient
) {
  if (isDemoMode) return;
  await query(
    "INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
    [createId("aud"), userId ?? null, action, entityType, entityId ?? null, JSON.stringify(metadata ?? {})],
    client
  );
}

export async function listAuditLogs(limit = 100) {
  if (isDemoMode) return demoListAuditLogs(limit);
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 300);
  const rows = await query<any>(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
            u.name AS user_name, u.email AS user_email
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return rows.rows.map((row) => ({
    ...row,
    metadata: parseJson(row.metadata, {}),
    created_at: toDateString(row.created_at)
  }));
}

export async function listUsers(role?: string): Promise<User[]> {
  if (isDemoMode) return demoListUsers(role);
  const params: unknown[] = [];
  const clauses = ["active = TRUE"];
  if (role) {
    clauses.push(`role = ${addParam(params, role)}`);
  }
  const rows = await query<User>(
    `SELECT id, name, email, role, phone, active
     FROM users
     WHERE ${clauses.join(" AND ")}
     ORDER BY name ASC`,
    params
  );
  return rows.rows.map((row) => ({ ...row, active: bool(row.active) })) as User[];
}

export async function listProducts(search?: string, includeInactive = false): Promise<Product[]> {
  if (isDemoMode) return demoListProducts(search, includeInactive);
  const params: unknown[] = [];
  const clauses = includeInactive ? ["TRUE"] : ["active = TRUE"];
  if (search?.trim()) {
    const like = addParam(params, `%${search.trim()}%`);
    clauses.push(`(name ILIKE ${like} OR sku ILIKE ${like} OR barcode ILIKE ${like} OR category ILIKE ${like})`);
  }

  const rows = await query<any>(
    `SELECT *
     FROM products
     WHERE ${clauses.join(" AND ")}
     ORDER BY category ASC, name ASC`,
    params
  );
  return rows.rows.map(rowToProduct);
}

export async function getProduct(id: string) {
  if (isDemoMode) return demoGetProduct(id);
  const row = await query<any>("SELECT * FROM products WHERE id = $1", [id]);
  return row.rows[0] ? rowToProduct(row.rows[0]) : null;
}

export async function createProduct(input: Omit<Product, "id" | "active">, userId?: string) {
  if (isDemoMode) return demoCreateProduct(input, userId);
  const id = createId("prd");
  await query(
    `INSERT INTO products (
      id, name, sku, barcode, category, cost_price, selling_price, stock_quantity,
      low_stock_alert, image_url, supplier_name, supplier_phone
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      input.name,
      input.sku,
      input.barcode ?? null,
      input.category,
      input.cost_price,
      input.selling_price,
      input.stock_quantity,
      input.low_stock_alert,
      input.image_url ?? null,
      input.supplier_name ?? null,
      input.supplier_phone ?? null
    ]
  );
  await auditLog("product:create", "product", id, input, userId);
  return getProduct(id);
}

export async function updateProduct(id: string, input: Partial<Product>, userId?: string) {
  if (isDemoMode) return demoUpdateProduct(id, input, userId);
  const existing = await getProduct(id);
  if (!existing) return null;
  const next = { ...existing, ...input };
  await query(
    `UPDATE products SET
      name = $1, sku = $2, barcode = $3, category = $4, cost_price = $5, selling_price = $6,
      stock_quantity = $7, low_stock_alert = $8, image_url = $9, supplier_name = $10,
      supplier_phone = $11, active = $12, updated_at = NOW()
     WHERE id = $13`,
    [
      next.name,
      next.sku,
      next.barcode ?? null,
      next.category,
      next.cost_price,
      next.selling_price,
      next.stock_quantity,
      next.low_stock_alert,
      next.image_url ?? null,
      next.supplier_name ?? null,
      next.supplier_phone ?? null,
      next.active,
      id
    ]
  );
  await auditLog("product:update", "product", id, input, userId);
  return getProduct(id);
}

export async function adjustStock(productId: string, delta: number, reason: string, userId?: string) {
  if (isDemoMode) return demoAdjustStock(productId, delta, reason, userId);
  return transaction(async (client) => {
    const updated = await query(
      "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2",
      [delta, productId],
      client
    );
    if (!updated.rowCount) return null;
    await query(
      "INSERT INTO stock_movements (id, product_id, type, quantity_delta, reason, user_id) VALUES ($1, $2, 'manual_adjustment', $3, $4, $5)",
      [createId("mov"), productId, delta, reason, userId ?? null],
      client
    );
    await auditLog("stock:adjust", "product", productId, { delta, reason }, userId, client);
    const row = await query<any>("SELECT * FROM products WHERE id = $1", [productId], client);
    return row.rows[0] ? rowToProduct(row.rows[0]) : null;
  });
}

export async function listCustomers(search?: string): Promise<Customer[]> {
  if (isDemoMode) return demoListCustomers(search);
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (search?.trim()) {
    const like = addParam(params, `%${search.trim()}%`);
    clauses.push(
      `(name ILIKE ${like} OR phone ILIKE ${like} OR email ILIKE ${like} OR phone_normalized ILIKE ${like})`
    );
  }

  const rows = await query<any>(
    `SELECT *
     FROM customers
     ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
     ORDER BY updated_at DESC, name ASC`,
    params
  );
  return rows.rows.map(rowToCustomer);
}

export async function getCustomer(id: string) {
  if (isDemoMode) return demoGetCustomer(id);
  const row = await query<any>("SELECT * FROM customers WHERE id = $1", [id]);
  return row.rows[0] ? rowToCustomer(row.rows[0]) : null;
}

export async function getCustomerProfile(id: string) {
  if (isDemoMode) return demoGetCustomerProfile(id);
  const customer = await getCustomer(id);
  if (!customer) return null;
  const [orders, favoriteRows] = await Promise.all([
    listOrders({ customerId: id, limit: 20 }),
    query<{ name: string; quantity: string }>(
      `SELECT product_name AS name, SUM(quantity) AS quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.customer_id = $1
       GROUP BY product_name
       ORDER BY quantity DESC
       LIMIT 5`,
      [id]
    )
  ]);
  const favoriteProducts = favoriteRows.rows.map((row) => ({
    name: row.name,
    quantity: Number(row.quantity)
  }));
  return { customer, orders, favoriteProducts };
}

async function upsertCustomer(client: DbClient, input?: CustomerInput | null) {
  if (!input || (!input.name && !input.phone && !input.email)) return null;

  const normalized = cleanWhatsAppNumber(input.phone);
  const lookup = normalized
    ? await query<any>("SELECT * FROM customers WHERE phone_normalized = $1 LIMIT 1", [normalized], client)
    : input.email
      ? await query<any>("SELECT * FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1", [input.email], client)
      : { rows: [] };
  const existing = lookup.rows[0];
  const customerId = existing?.id || createId("cus");
  const tags = existing ? parseJson<string[]>(existing.tags, []) : ["New Customer"];
  const country = input.country || "Trinidad and Tobago";

  if (existing) {
    await query(
      `UPDATE customers SET
        name = COALESCE(NULLIF($1, ''), name),
        phone = COALESCE(NULLIF($2, ''), phone),
        phone_normalized = COALESCE(NULLIF($3, ''), phone_normalized),
        email = COALESCE(NULLIF($4, ''), email),
        street_address = COALESCE(NULLIF($5, ''), street_address),
        community = COALESCE(NULLIF($6, ''), community),
        city = COALESCE(NULLIF($7, ''), city),
        region = COALESCE(NULLIF($8, ''), region),
        country = COALESCE(NULLIF($9, ''), country),
        delivery_notes = COALESCE(NULLIF($10, ''), delivery_notes),
        preferred_payment_method = COALESCE(NULLIF($11, ''), preferred_payment_method),
        notes = COALESCE(NULLIF($12, ''), notes),
        birthday = COALESCE(NULLIF($13, ''), birthday),
        marketing_consent = COALESCE($14::boolean, marketing_consent),
        updated_at = NOW()
       WHERE id = $15`,
      [
        input.name ?? null,
        input.phone ?? null,
        normalized || null,
        input.email ?? null,
        input.street_address ?? null,
        input.community ?? null,
        input.city ?? null,
        input.region ?? null,
        country,
        input.delivery_notes ?? null,
        input.preferred_payment_method ?? null,
        input.notes ?? null,
        input.birthday ?? null,
        input.marketing_consent === undefined ? null : Boolean(input.marketing_consent),
        customerId
      ],
      client
    );
  } else {
    await query(
      `INSERT INTO customers (
        id, name, phone, phone_normalized, email, street_address, community, city, region,
        country, delivery_notes, preferred_payment_method, notes, birthday, marketing_consent, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)`,
      [
        customerId,
        input.name || "Customer",
        input.phone ?? null,
        normalized || null,
        input.email ?? null,
        input.street_address ?? null,
        input.community ?? null,
        input.city ?? null,
        input.region ?? null,
        country,
        input.delivery_notes ?? null,
        input.preferred_payment_method ?? null,
        input.notes ?? null,
        input.birthday ?? null,
        Boolean(input.marketing_consent),
        JSON.stringify(tags)
      ],
      client
    );
  }

  const row = await query<any>("SELECT * FROM customers WHERE id = $1", [customerId], client);
  return row.rows[0] ? rowToCustomer(row.rows[0]) : null;
}

export async function createCustomer(input: CustomerInput, userId?: string) {
  if (isDemoMode) return demoCreateCustomer(input, userId);
  return transaction(async (client) => {
    const customer = await upsertCustomer(client, input);
    if (customer) await auditLog("customer:create_or_update", "customer", customer.id, input, userId, client);
    return customer;
  });
}

export async function updateCustomer(id: string, input: CustomerInput, userId?: string) {
  if (isDemoMode) return demoUpdateCustomer(id, input, userId);
  const existing = await getCustomer(id);
  if (!existing) return null;
  const normalized = cleanWhatsAppNumber(input.phone || existing.phone);
  await query(
    `UPDATE customers SET
      name = $1, phone = $2, phone_normalized = $3, email = $4, street_address = $5,
      community = $6, city = $7, region = $8, country = $9, delivery_notes = $10,
      preferred_payment_method = $11, notes = $12, birthday = $13, marketing_consent = $14,
      updated_at = NOW()
     WHERE id = $15`,
    [
      input.name ?? existing.name,
      input.phone ?? existing.phone,
      normalized || existing.phone_normalized,
      input.email ?? existing.email,
      input.street_address ?? existing.street_address,
      input.community ?? existing.community,
      input.city ?? existing.city,
      input.region ?? existing.region,
      input.country ?? existing.country,
      input.delivery_notes ?? existing.delivery_notes,
      input.preferred_payment_method ?? existing.preferred_payment_method,
      input.notes ?? existing.notes,
      input.birthday ?? existing.birthday,
      input.marketing_consent === undefined ? existing.marketing_consent : Boolean(input.marketing_consent),
      id
    ]
  );
  await auditLog("customer:update", "customer", id, input, userId);
  return getCustomer(id);
}

export async function createOrder(payload: CheckoutPayload, userId?: string) {
  if (isDemoMode) return demoCreateOrder(payload, userId);
  const settings = await getSettings();

  return transaction(async (client) => {
    const orderId = createId("ord");
    const orderFloor = await getMaxNumericValue(client, "orders", "order_number", 1024);
    const receiptFloor = await getMaxNumericValue(client, "receipts", "receipt_number", 4024);
    const orderNumber = String(await getCounter(client, "order_counter", 1024, orderFloor));
    const receiptNumber = `R-${await getCounter(client, "receipt_counter", 4024, receiptFloor)}`;
    const deliveryInput = payload.delivery || {};
    const customerInput: CustomerInput = {
      ...payload.customer,
      street_address: deliveryInput.street_address || payload.customer?.street_address,
      community: deliveryInput.community || payload.customer?.community,
      city: deliveryInput.city || payload.customer?.city,
      region: deliveryInput.region || payload.customer?.region,
      country: deliveryInput.country || payload.customer?.country || "Trinidad and Tobago",
      delivery_notes: deliveryInput.notes || payload.customer?.delivery_notes,
      preferred_payment_method: payload.payment_method
    };

    const customer = await upsertCustomer(client, customerInput);
    const customerSnapshot: CustomerInput = customer
      ? {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          street_address: customer.street_address,
          community: customer.community,
          city: customer.city,
          region: customer.region,
          country: customer.country,
          delivery_notes: customer.delivery_notes,
          preferred_payment_method: customer.preferred_payment_method,
          notes: customer.notes,
          birthday: customer.birthday,
          marketing_consent: customer.marketing_consent
        }
      : {
          name: customerInput.name || "Walk-in customer",
          phone: customerInput.phone,
          email: customerInput.email,
          street_address: customerInput.street_address,
          community: customerInput.community,
          city: customerInput.city,
          region: customerInput.region,
          country: customerInput.country || "Trinidad and Tobago",
          delivery_notes: customerInput.delivery_notes,
          preferred_payment_method: payload.payment_method,
          marketing_consent: Boolean(customerInput.marketing_consent)
        };

    const lineItems = [];
    for (const item of payload.items) {
      const productRow = await query<any>(
        "SELECT * FROM products WHERE id = $1 AND active = TRUE",
        [item.product_id],
        client
      );
      const product = productRow.rows[0];
      if (!product) throw new Error("Product not found");
      const quantity = Number(item.quantity);
      const lineDiscount = Number(item.discount || 0);
      const lineTotal = roundMoney(quantity * Number(product.selling_price) - lineDiscount);
      lineItems.push({
        id: createId("itm"),
        product,
        quantity,
        lineDiscount,
        lineTotal
      });
    }

    const subtotal = roundMoney(
      lineItems.reduce((sum, item) => sum + item.quantity * Number(item.product.selling_price), 0)
    );
    const itemDiscount = lineItems.reduce((sum, item) => sum + item.lineDiscount, 0);
    const discountTotal = roundMoney(itemDiscount + Number(payload.discount_amount || 0));
    const taxableBase = Math.max(0, subtotal - discountTotal);
    const serviceFee =
      payload.service_fee ??
      (settings.service_fee_enabled ? taxableBase * (Number(settings.service_fee_rate) / 100) : 0);
    const deliveryFee =
      payload.order_type === "delivery" || payload.order_type === "online"
        ? payload.delivery_fee ?? getDeliveryFeeForRegion(settings, customerSnapshot.region)
        : Number(payload.delivery_fee || 0);
    const taxTotal = settings.tax_enabled
      ? roundMoney(taxableBase * (Number(settings.tax_rate) / 100))
      : 0;
    const total = roundMoney(taxableBase + taxTotal + Number(serviceFee || 0) + Number(deliveryFee || 0));
    const pointsEarned =
      settings.loyalty_enabled && customer ? Math.floor(total * Number(settings.loyalty_points_per_ttd || 0)) : 0;
    const paymentStatus =
      payload.payment_status ||
      (payload.payment_method === "Pay on delivery" ? "unpaid" : "paid");
    const deliveryStatus =
      payload.order_type === "delivery" || payload.order_type === "online"
        ? payload.assigned_driver_id
          ? "assigned"
          : "pending"
        : "not_required";
    const fullAddress = buildAddress([
      customerSnapshot.street_address,
      customerSnapshot.community,
      customerSnapshot.city,
      customerSnapshot.region,
      customerSnapshot.country
    ]);
    const wazeLink = buildWazeLink({
      latitude: deliveryInput.latitude,
      longitude: deliveryInput.longitude,
      locationLink: deliveryInput.location_link,
      address: fullAddress
    });
    const paymentLink = buildPaymentLink({
      orderNumber,
      receiptNumber,
      total,
      paymentMethod: payload.payment_method,
      customer: customerSnapshot,
      settings
    });

    await query(
      `INSERT INTO orders (
        id, order_number, customer_id, customer_snapshot, order_type, status, payment_method,
        payment_status, delivery_status, assigned_driver_id, subtotal, discount_total,
        tax_total, service_fee, delivery_fee, total, loyalty_points_earned,
        notes, delivery_latitude, delivery_longitude, delivery_location_link, waze_link,
        payment_link, created_by
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
      [
        orderId,
        orderNumber,
        customer?.id ?? null,
        JSON.stringify(customerSnapshot),
        payload.order_type,
        payload.status || "completed",
        payload.payment_method,
        paymentStatus,
        deliveryStatus,
        payload.assigned_driver_id || null,
        subtotal,
        discountTotal,
        taxTotal,
        roundMoney(Number(serviceFee || 0)),
        roundMoney(Number(deliveryFee || 0)),
        total,
        pointsEarned,
        payload.notes ?? null,
        deliveryInput.latitude ?? null,
        deliveryInput.longitude ?? null,
        deliveryInput.location_link ?? null,
        wazeLink,
        paymentLink,
        payload.created_by || userId || null
      ],
      client
    );

    for (const item of lineItems) {
      await query(
        `INSERT INTO order_items (
          id, order_id, product_id, product_name, sku, quantity, unit_price,
          cost_price, discount, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          item.id,
          orderId,
          item.product.id,
          item.product.name,
          item.product.sku,
          item.quantity,
          item.product.selling_price,
          item.product.cost_price,
          item.lineDiscount,
          item.lineTotal
        ],
        client
      );

      if ((payload.status || "completed") !== "draft") {
        await query(
          "UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2",
          [item.quantity, item.product.id],
          client
        );
        await query(
          "INSERT INTO stock_movements (id, product_id, type, quantity_delta, reason, reference_id, user_id) VALUES ($1, $2, 'sale', $3, $4, $5, $6)",
          [createId("mov"), item.product.id, -item.quantity, `Sale order #${orderNumber}`, orderId, userId ?? null],
          client
        );
      }
    }

    await query(
      "INSERT INTO receipts (id, order_id, receipt_number, channel) VALUES ($1, $2, $3, 'print')",
      [createId("rcp"), orderId, receiptNumber],
      client
    );

    if (customer) {
      const existingTags = customer.tags;
      const nextTags = new Set(existingTags);
      if (customer.orders_count + 1 >= 3) nextTags.add("Frequent Buyer");
      if (total >= 500) nextTags.add("VIP");
      if (paymentStatus !== "paid") nextTags.add("Owes Balance");
      await query(
        `UPDATE customers SET
          total_spent = total_spent + $1,
          orders_count = orders_count + 1,
          last_order_at = NOW(),
          loyalty_points = loyalty_points + $2,
          tags = $3::jsonb,
          updated_at = NOW()
         WHERE id = $4`,
        [total, pointsEarned, JSON.stringify(Array.from(nextTags)), customer.id],
        client
      );

      if (pointsEarned) {
        await query(
          "INSERT INTO loyalty_transactions (id, customer_id, order_id, points_delta, type, notes) VALUES ($1, $2, $3, $4, 'earned', $5)",
          [createId("loy"), customer.id, orderId, pointsEarned, `Earned on order #${orderNumber}`],
          client
        );
      }
    }

    if (payload.order_type === "delivery" || payload.order_type === "online") {
      await query(
        "INSERT INTO delivery_events (id, order_id, driver_id, status, notes) VALUES ($1, $2, $3, $4, $5)",
        [createId("del"), orderId, payload.assigned_driver_id || null, deliveryStatus, "Delivery order created"],
        client
      );
    }

    let order = await readOrderById(client, orderId);
    if (!order) throw new Error("Order not found");
    if (settings.whatsapp_enabled) {
      const businessMessage = buildOrderWhatsAppMessage(order, settings);
      const customerMessage = buildCustomerConfirmationMessage(order, settings);
      const businessLink = buildWhatsAppLink(settings.whatsapp_business_number, businessMessage);
      const customerLink = buildWhatsAppLink(order.customer_snapshot.phone, customerMessage);
      await query(
        "UPDATE orders SET whatsapp_business_link = $1, whatsapp_customer_link = $2, updated_at = NOW() WHERE id = $3",
        [businessLink, customerLink, orderId],
        client
      );
      order = await readOrderById(client, orderId);
      if (!order) throw new Error("Order not found");
    }

    await auditLog("order:create", "order", orderId, { order_number: orderNumber, total }, userId, client);
    return order;
  });
}

async function readOrderById(client: DbClient | undefined, id: string) {
  const row = await query<any>(
    `SELECT o.*, u.name AS assigned_driver_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.assigned_driver_id
     WHERE o.id = $1`,
    [id],
    client
  );
  if (!row.rows[0]) return null;
  const orders = await hydrateOrders([row.rows[0]], client);
  return orders[0] || null;
}

export async function getOrder(id: string) {
  if (isDemoMode) return demoGetOrder(id);
  return readOrderById(undefined, id);
}

export async function listOrders(options: {
  query?: string;
  type?: string;
  status?: string;
  customerId?: string;
  driverId?: string;
  assignedOnly?: boolean;
  limit?: number;
} = {}) {
  if (isDemoMode) return demoListOrders(options);
  const params: unknown[] = [];
  const clauses: string[] = ["TRUE"];

  if (options.query?.trim()) {
    const like = addParam(params, `%${options.query.trim()}%`);
    clauses.push(`(o.order_number ILIKE ${like} OR c.name ILIKE ${like} OR c.phone ILIKE ${like})`);
  }
  if (options.type) {
    clauses.push(`o.order_type = ${addParam(params, options.type)}`);
  }
  if (options.status) {
    clauses.push(`o.status = ${addParam(params, options.status)}`);
  }
  if (options.customerId) {
    clauses.push(`o.customer_id = ${addParam(params, options.customerId)}`);
  }
  if (options.driverId) {
    clauses.push(`o.assigned_driver_id = ${addParam(params, options.driverId)}`);
  }
  if (options.assignedOnly) {
    clauses.push("o.assigned_driver_id IS NOT NULL");
  }

  const limitPlaceholder = addParam(params, Math.min(options.limit ?? 100, 300));
  const rows = await query<any>(
    `SELECT o.*, c.name AS customer_name, u.name AS assigned_driver_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN users u ON u.id = o.assigned_driver_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY o.created_at DESC
     LIMIT ${limitPlaceholder}`,
    params
  );
  return hydrateOrders(rows.rows);
}

export async function updateDeliveryStatus(orderId: string, status: Order["delivery_status"], userId?: string) {
  if (isDemoMode) return demoUpdateDeliveryStatus(orderId, status, userId);
  return transaction(async (client) => {
    const order = await readOrderById(client, orderId);
    if (!order) return null;
    await query(
      "UPDATE orders SET delivery_status = $1, updated_at = NOW() WHERE id = $2",
      [status, orderId],
      client
    );
    await query(
      "INSERT INTO delivery_events (id, order_id, driver_id, status, notes) VALUES ($1, $2, $3, $4, $5)",
      [createId("del"), orderId, userId ?? order.assigned_driver_id ?? null, status, `Marked ${status}`],
      client
    );
    await auditLog("delivery:update_status", "order", orderId, { status }, userId, client);
    return readOrderById(client, orderId);
  });
}

export async function updateOrder(id: string, input: Partial<Order>, userId?: string) {
  if (isDemoMode) return demoUpdateOrder(id, input, userId);
  return transaction(async (client) => {
    const existing = await readOrderById(client, id);
    if (!existing) return null;
    const nextStatus = input.status ?? existing.status;
    const isCancelling = existing.status !== "cancelled" && nextStatus === "cancelled";
    const nextPaymentStatus =
      input.payment_status ?? (isCancelling && existing.payment_status === "paid" ? "refunded" : existing.payment_status);
    const nextDeliveryStatus =
      input.delivery_status ??
      (isCancelling && existing.delivery_status !== "not_required" && existing.delivery_status !== "delivered"
        ? "failed"
        : existing.delivery_status);
    await query(
      `UPDATE orders SET
        status = $1, payment_status = $2, delivery_status = $3, assigned_driver_id = $4,
        notes = $5, updated_at = NOW()
       WHERE id = $6`,
      [
        nextStatus,
        nextPaymentStatus,
        nextDeliveryStatus,
        input.assigned_driver_id ?? existing.assigned_driver_id ?? null,
        input.notes ?? existing.notes ?? null,
        id
      ],
      client
    );

    if (isCancelling && existing.status === "completed") {
      for (const item of existing.items) {
        if (!item.product_id) continue;
        await query(
          "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2",
          [item.quantity, item.product_id],
          client
        );
        await query(
          "INSERT INTO stock_movements (id, product_id, type, quantity_delta, reason, reference_id, user_id) VALUES ($1, $2, 'return', $3, $4, $5, $6)",
          [createId("mov"), item.product_id, item.quantity, `Cancelled order #${existing.order_number}`, id, userId ?? null],
          client
        );
      }

      if (existing.customer_id) {
        await query(
          `UPDATE customers SET
            total_spent = GREATEST(0, total_spent - $1),
            orders_count = GREATEST(0, orders_count - 1),
            loyalty_points = GREATEST(0, loyalty_points - $2),
            updated_at = NOW()
           WHERE id = $3`,
          [existing.total, existing.loyalty_points_earned, existing.customer_id],
          client
        );
        if (existing.loyalty_points_earned > 0) {
          await query(
            "INSERT INTO loyalty_transactions (id, customer_id, order_id, points_delta, type, notes) VALUES ($1, $2, $3, $4, 'manual_adjustment', $5)",
            [
              createId("loy"),
              existing.customer_id,
              id,
              -existing.loyalty_points_earned,
              `Reversed cancelled order #${existing.order_number}`
            ],
            client
          );
        }
      }
    }

    await auditLog("order:update", "order", id, input, userId, client);
    if (isCancelling) {
      await auditLog(
        "order:cancel",
        "order",
        id,
        {
          order_number: existing.order_number,
          restored_items: existing.items.length,
          previous_payment_status: existing.payment_status
        },
        userId,
        client
      );
    }
    return readOrderById(client, id);
  });
}

export async function getDeliveries(user?: User | null) {
  return listOrders({
    type: "delivery",
    driverId: user?.role === "driver" ? user.id : undefined,
    limit: 150
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  if (isDemoMode) return demoDashboardData();

  const today = startOfDay(new Date());
  const week = subDays(new Date(), 7);
  const month = subDays(new Date(), 30);

  const totalSince = async (date: Date) => {
    const result = await query<{ total: string }>(
      "SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE status != 'cancelled' AND created_at >= $1",
      [date]
    );
    return Number(result.rows[0]?.total || 0);
  };

  const [
    dailySales,
    weeklySales,
    monthlySales,
    deliveryOrderCountRows,
    profitEstimateRows,
    lowStockRows,
    bestSellerRows,
    topCustomerRows,
    paymentRows,
    cashierRows,
    seriesRows
  ] = await Promise.all([
    totalSince(today),
    totalSince(week),
    totalSince(month),
    query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM orders WHERE order_type = 'delivery' AND created_at >= $1",
      [month]
    ),
    query<{ profit: string }>(
      `SELECT COALESCE(SUM(oi.line_total - (oi.cost_price * oi.quantity)), 0) AS profit
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'cancelled' AND o.created_at >= $1`,
      [month]
    ),
    query<any>(
      "SELECT * FROM products WHERE active = TRUE AND stock_quantity <= low_stock_alert ORDER BY stock_quantity ASC LIMIT 8"
    ),
    query<{ name: string; quantity: string; total: string }>(
      `SELECT product_name AS name, SUM(quantity) AS quantity, SUM(line_total) AS total
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'cancelled'
       GROUP BY product_name
       ORDER BY quantity DESC
       LIMIT 8`
    ),
    query<{ name: string; total_spent: string; orders_count: string }>(
      "SELECT name, total_spent, orders_count FROM customers ORDER BY total_spent DESC LIMIT 8"
    ),
    query<{ method: string; total: string; count: string }>(
      `SELECT payment_method AS method, SUM(total) AS total, COUNT(*) AS count
       FROM orders
       WHERE status != 'cancelled'
       GROUP BY payment_method
       ORDER BY total DESC`
    ),
    query<{ name: string; total: string; count: string }>(
      `SELECT COALESCE(u.name, 'Online / unassigned') AS name, SUM(o.total) AS total, COUNT(*) AS count
       FROM orders o
       LEFT JOIN users u ON u.id = o.created_by
       WHERE o.status != 'cancelled'
       GROUP BY COALESCE(u.name, 'Online / unassigned')
       ORDER BY total DESC`
    ),
    query<{ date: string; total: string }>(
      `SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date, SUM(total) AS total
       FROM orders
       WHERE status != 'cancelled' AND created_at >= $1
       GROUP BY created_at::date
       ORDER BY date ASC`,
      [month]
    )
  ]);

  return {
    dailySales,
    weeklySales,
    monthlySales,
    deliveryOrderCount: Number(deliveryOrderCountRows.rows[0]?.count || 0),
    profitEstimate: Number(profitEstimateRows.rows[0]?.profit || 0),
    lowStock: lowStockRows.rows.map(rowToProduct),
    bestSellers: bestSellerRows.rows.map((row) => ({
      name: row.name,
      quantity: Number(row.quantity),
      total: Number(row.total)
    })),
    topCustomers: topCustomerRows.rows.map((row) => ({
      name: row.name,
      total_spent: Number(row.total_spent),
      orders_count: Number(row.orders_count)
    })),
    paymentBreakdown: paymentRows.rows.map((row) => ({
      method: row.method,
      total: Number(row.total),
      count: Number(row.count)
    })),
    cashierPerformance: cashierRows.rows.map((row) => ({
      name: row.name,
      total: Number(row.total),
      count: Number(row.count)
    })),
    salesSeries: seriesRows.rows.map((row) => ({
      date: row.date,
      total: Number(row.total)
    }))
  };
}

export async function exportSalesCsv() {
  const orders = await listOrders({ limit: 300 });
  const rows = [
    ["Order #", "Date", "Type", "Customer", "Payment Method", "Payment Status", "Delivery Status", "Total"],
    ...orders.map((order) => [
      order.order_number,
      order.created_at,
      order.order_type,
      order.customer_snapshot.name || "",
      order.payment_method,
      order.payment_status,
      order.delivery_status,
      String(order.total)
    ])
  ];

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export async function getReceiptNumber(orderId: string) {
  if (isDemoMode) return demoGetReceiptNumber(orderId);
  const row = await query<{ receipt_number: string }>(
    "SELECT receipt_number FROM receipts WHERE order_id = $1",
    [orderId]
  );
  return row.rows[0]?.receipt_number ?? "";
}

export async function getAuditLogs(limit = 100) {
  return listAuditLogs(limit);
}
