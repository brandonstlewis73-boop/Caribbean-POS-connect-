import { subDays, startOfDay } from "date-fns";
import bcrypt from "bcryptjs";
import { isDemoMode, query, transaction, createId, type PoolClient } from "./db";
import {
  CURRENCY_CODE,
  DEFAULT_DELIVERY_RATES,
  SUBSCRIPTION_PLANS,
  getDefaultDeliveryRatesForCurrency,
  getDeliveryRegionsForCurrency,
  money
} from "./constants";
import {
  demoAdjustStock,
  demoCreateCustomer,
  demoCreateOrder,
  demoCreateProduct,
  demoDashboardData,
  demoCreateBusiness,
  demoGetCustomer,
  demoGetCustomerProfile,
  demoGetOrder,
  demoGetProduct,
  demoGetReceiptNumber,
  demoGetSettings,
  demoListAuditLogs,
  demoListBusinesses,
  demoListCustomers,
  demoListOrders,
  demoListProducts,
  demoListUsers,
  demoCreateStaffUser,
  demoDeleteCustomer,
  demoDeleteOrder,
  demoDeleteProduct,
  demoDeleteStaffUser,
  demoUpdateStaffUser,
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
  StaffInput,
  Subscription,
  SubscriptionPlan,
  SubscriptionPlanId,
  User,
  Business,
  BusinessInput
} from "./types";
import { buildAddress, buildWazeLink } from "./waze";
import {
  buildCustomerConfirmationMessage,
  buildOrderWhatsAppMessage,
  buildWhatsAppLink,
  cleanWhatsAppNumber
} from "./whatsapp";

type DbClient = PoolClient;

export const defaultSettings: Settings = {
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
  payment_pod_enabled: true,
  receipt_print_customer_enabled: true,
  receipt_print_kitchen_enabled: false,
  receipt_email_enabled: true,
  receipt_whatsapp_enabled: false
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

function normalizeDeliveryRates(value?: Record<string, number> | null, currency?: string | null) {
  return {
    ...getDefaultDeliveryRatesForCurrency(currency),
    ...(value || {})
  };
}

function getDeliveryFeeForRegion(settings: Settings, region?: string | null) {
  const rates: Record<string, number> = normalizeDeliveryRates(settings.delivery_rates, settings.currency);
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
    "{{total_label}}": money(total, settings.currency),
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function rowToBusiness(row: any): Business {
  return {
    ...row,
    active: bool(row.active),
    created_at: toDateString(row.created_at) || undefined,
    updated_at: toDateString(row.updated_at) || undefined
  };
}

type StaffAvatarMap = Record<string, Pick<User, "avatar_key" | "avatar_url">>;

async function getStaffAvatarMap(client?: DbClient): Promise<StaffAvatarMap> {
  const row = await query<{ value: unknown }>("SELECT value FROM settings WHERE key = 'staff_avatar_profiles'", [], client);
  return parseJson<StaffAvatarMap>(row.rows[0]?.value, {});
}

async function saveStaffAvatar(userId: string, input: StaffInput, client?: DbClient) {
  const avatars = await getStaffAvatarMap(client);
  avatars[userId] = {
    avatar_key: input.avatar_key || avatars[userId]?.avatar_key || "teal-register",
    avatar_url: input.avatar_url ?? avatars[userId]?.avatar_url ?? null
  };
  await query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('staff_avatar_profiles', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(avatars)],
    client
  );
}

async function deleteStaffAvatar(userId: string, client?: DbClient) {
  const avatars = await getStaffAvatarMap(client);
  delete avatars[userId];
  await query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('staff_avatar_profiles', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(avatars)],
    client
  );
}

function rowToUser(row: any, avatar?: Pick<User, "avatar_key" | "avatar_url">): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    active: bool(row.active),
    avatar_key: avatar?.avatar_key || null,
    avatar_url: avatar?.avatar_url || null
  };
}

function rowToSubscription(row: any): Subscription {
  return {
    ...row,
    monthly_price: Number(row.monthly_price),
    seats: Number(row.seats),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    current_period_start: toDateString(row.current_period_start),
    current_period_end: toDateString(row.current_period_end),
    trial_ends_at: toDateString(row.trial_ends_at),
    created_at: toDateString(row.created_at) || undefined,
    updated_at: toDateString(row.updated_at) || undefined
  };
}

function rowToCustomer(row: any): Customer {
  return {
    ...row,
    marketing_consent: bool(row.marketing_consent),
    gps_latitude: row.gps_latitude === null || row.gps_latitude === undefined ? null : Number(row.gps_latitude),
    gps_longitude: row.gps_longitude === null || row.gps_longitude === undefined ? null : Number(row.gps_longitude),
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
  settings.delivery_rates = normalizeDeliveryRates(settings.delivery_rates as Record<string, number>, settings.currency as string);
  return settings as Settings;
}

export async function updateSettings(input: Partial<Settings>, userId?: string) {
  if (isDemoMode) return demoUpdateSettings(input, userId);
  const current = await getSettings();
  const nextCurrency = input.currency || current.currency;
  const nextInput = { ...input };
  if (input.currency || input.delivery_rates) {
    const defaults = getDefaultDeliveryRatesForCurrency(nextCurrency);
    nextInput.delivery_rates = Object.fromEntries(
      getDeliveryRegionsForCurrency(nextCurrency).map((region) => [
        region,
        Number(input.delivery_rates?.[region] ?? current.delivery_rates?.[region] ?? defaults[region] ?? current.delivery_fee ?? 0)
      ])
    );
  }
  await transaction(async (client) => {
    for (const [key, value] of Object.entries(nextInput)) {
      await query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(value)],
        client
      );
    }
    await auditLog("settings:update", "settings", "global", nextInput, userId, client);
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

export async function listUsers(role?: string, includeInactive = false): Promise<User[]> {
  if (isDemoMode) return demoListUsers(role, includeInactive);
  const params: unknown[] = [];
  const clauses = includeInactive ? ["TRUE"] : ["active = TRUE"];
  if (role) {
    clauses.push(`role = ${addParam(params, role)}`);
  }
  const [rows, avatars] = await Promise.all([
    query<User>(
    `SELECT id, name, email, role, phone, active
     FROM users
     WHERE ${clauses.join(" AND ")}
     ORDER BY name ASC`,
    params
    ),
    getStaffAvatarMap()
  ]);
  return rows.rows.map((row) => rowToUser(row, avatars[row.id]));
}

export async function createStaffUser(input: StaffInput, userId?: string) {
  if (isDemoMode) return demoCreateStaffUser(input, userId);
  const id = createId("usr");
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  return transaction(async (client) => {
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        input.name?.trim(),
        input.email?.trim().toLowerCase(),
        passwordHash,
        input.role || "cashier",
        input.phone || null,
        input.active ?? true
      ],
      client
    );
    await saveStaffAvatar(id, input, client);
    await auditLog("staff:create", "user", id, { ...input, avatar_url: input.avatar_url ? "[stored image]" : null }, userId, client);
    const avatars = await getStaffAvatarMap(client);
    const rows = await query<any>("SELECT id, name, email, role, phone, active FROM users WHERE id = $1", [id], client);
    return rows.rows[0] ? rowToUser(rows.rows[0], avatars[id]) : null;
  });
}

export async function updateStaffUser(id: string, input: StaffInput, userId?: string) {
  if (isDemoMode) return demoUpdateStaffUser(id, input, userId);
  return transaction(async (client) => {
    const existing = await query<any>("SELECT id, name, email, role, phone, active FROM users WHERE id = $1", [id], client);
    if (!existing.rows[0]) return null;
    await query(
      `UPDATE users SET
        name = $1,
        email = $2,
        role = $3,
        phone = $4,
        active = $5,
        updated_at = NOW()
       WHERE id = $6`,
      [
        input.name?.trim() || existing.rows[0].name,
        input.email?.trim().toLowerCase() || existing.rows[0].email,
        input.role || existing.rows[0].role,
        input.phone ?? existing.rows[0].phone,
        input.active ?? bool(existing.rows[0].active),
        id
      ],
      client
    );
    await saveStaffAvatar(id, input, client);
    await auditLog("staff:update", "user", id, { ...input, avatar_url: input.avatar_url ? "[stored image]" : null }, userId, client);
    const avatars = await getStaffAvatarMap(client);
    const rows = await query<any>("SELECT id, name, email, role, phone, active FROM users WHERE id = $1", [id], client);
    return rows.rows[0] ? rowToUser(rows.rows[0], avatars[id]) : null;
  });
}

export async function deleteStaffUser(id: string, userId?: string) {
  if (isDemoMode) return demoDeleteStaffUser(id, userId);
  return transaction(async (client) => {
    const existing = await query<any>("SELECT id, name, email, role, phone, active FROM users WHERE id = $1", [id], client);
    if (!existing.rows[0]) return null;
    const avatars = await getStaffAvatarMap(client);
    await deleteStaffAvatar(id, client);
    await auditLog(
      "staff:delete",
      "user",
      id,
      { name: existing.rows[0].name, email: existing.rows[0].email },
      userId,
      client
    );
    await query("DELETE FROM users WHERE id = $1", [id], client);
    return rowToUser(existing.rows[0], avatars[id]);
  });
}

export async function listBusinesses(): Promise<Business[]> {
  if (isDemoMode) return demoListBusinesses();
  const rows = await query<any>(
    `SELECT id, name, legal_name, slug, phone, email, street_address, city, region,
            country, currency, logo_url, tax_id, active, created_at, updated_at
     FROM businesses
     ORDER BY created_at DESC, name ASC`
  );
  return rows.rows.map(rowToBusiness);
}

export async function createBusiness(input: BusinessInput, userId?: string) {
  if (isDemoMode) return demoCreateBusiness(input, userId);
  const id = createId("biz");
  const name = input.name?.trim();
  if (!name) return null;
  const baseSlug = slugify(input.slug || name);
  const slug = baseSlug ? `${baseSlug}-${id.slice(-8)}` : id;
  await query(
    `INSERT INTO businesses (
      id, name, legal_name, slug, phone, email, street_address, city, region,
      country, currency, logo_url, tax_id, active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)`,
    [
      id,
      name,
      input.legal_name || name,
      slug,
      input.phone ?? null,
      input.email || null,
      input.street_address ?? null,
      input.city ?? null,
      input.region ?? null,
      input.country || "Trinidad and Tobago",
      input.currency || CURRENCY_CODE,
      input.logo_url ?? null,
      input.tax_id ?? null
    ]
  );
  await auditLog("business:create", "business", id, input, userId);
  const rows = await query<any>("SELECT * FROM businesses WHERE id = $1", [id]);
  return rows.rows[0] ? rowToBusiness(rows.rows[0]) : null;
}

export function listSubscriptionPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.map((plan) => ({
    id: plan.id,
    name: plan.name,
    audience: plan.audience,
    monthly_price: plan.monthly_price,
    currency: plan.currency,
    features: [...plan.features]
  })) as SubscriptionPlan[];
}

export async function getCurrentSubscription(): Promise<Subscription | null> {
  if (isDemoMode) {
    const plan = SUBSCRIPTION_PLANS[0];
    return {
      id: "sub_local_workspace",
      business_id: "biz_savannah_sea",
      plan_id: plan.id,
      plan_name: plan.name,
      status: "trialing",
      seats: 1,
      monthly_price: plan.monthly_price,
      currency: plan.currency,
      provider: "manual",
      current_period_start: new Date().toISOString(),
      current_period_end: subDays(new Date(), -30).toISOString(),
      trial_ends_at: subDays(new Date(), -14).toISOString(),
      metadata: {}
    };
  }
  const rows = await query<any>(
    `SELECT *
     FROM subscriptions
     ORDER BY created_at DESC
     LIMIT 1`
  );
  return rows.rows[0] ? rowToSubscription(rows.rows[0]) : null;
}

export async function updateSubscriptionPlan(planId: SubscriptionPlanId, userId?: string) {
  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId);
  if (!plan) return null;
  if (isDemoMode) {
    return {
      id: "sub_local_workspace",
      business_id: "biz_savannah_sea",
      plan_id: plan.id,
      plan_name: plan.name,
      status: "trialing",
      seats: plan.id === "starter" ? 1 : plan.id === "business" ? 5 : 15,
      monthly_price: plan.monthly_price,
      currency: plan.currency,
      provider: "manual",
      current_period_start: new Date().toISOString(),
      current_period_end: subDays(new Date(), -30).toISOString(),
      trial_ends_at: subDays(new Date(), -14).toISOString(),
      metadata: {}
    } satisfies Subscription;
  }
  const existing = await getCurrentSubscription();
  const subscriptionId = existing?.id || createId("sub");
  const businessId = existing?.business_id || (await listBusinesses())[0]?.id || "biz_savannah_sea";
  await query(
    `INSERT INTO subscriptions (
      id, business_id, plan_id, plan_name, status, seats, monthly_price, currency,
      provider, current_period_start, current_period_end, trial_ends_at, metadata
    ) VALUES ($1, $2, $3, $4, 'trialing', $5, $6, $7, 'manual', NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '14 days', '{}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      plan_name = EXCLUDED.plan_name,
      seats = EXCLUDED.seats,
      monthly_price = EXCLUDED.monthly_price,
      currency = EXCLUDED.currency,
      updated_at = NOW()`,
    [
      subscriptionId,
      businessId,
      plan.id,
      plan.name,
      plan.id === "starter" ? 1 : plan.id === "business" ? 5 : 15,
      plan.monthly_price,
      plan.currency
    ]
  );
  await auditLog("subscription:update_plan", "subscription", subscriptionId, { plan_id: plan.id }, userId);
  return getCurrentSubscription();
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

export async function deleteProduct(id: string, userId?: string) {
  if (isDemoMode) return demoDeleteProduct(id, userId);
  return transaction(async (client) => {
    const existing = await query<any>("SELECT * FROM products WHERE id = $1", [id], client);
    if (!existing.rows[0]) return null;
    await auditLog(
      "product:delete",
      "product",
      id,
      { name: existing.rows[0].name, sku: existing.rows[0].sku },
      userId,
      client
    );
    await query("DELETE FROM products WHERE id = $1", [id], client);
    return rowToProduct(existing.rows[0]);
  });
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
        city = COALESCE(NULLIF($6, ''), city),
        region = COALESCE(NULLIF($7, ''), region),
        country = COALESCE(NULLIF($8, ''), country),
        delivery_notes = COALESCE(NULLIF($9, ''), delivery_notes),
        waze_link = COALESCE(NULLIF($10, ''), waze_link),
        gps_latitude = COALESCE($11::numeric, gps_latitude),
        gps_longitude = COALESCE($12::numeric, gps_longitude),
        preferred_payment_method = COALESCE(NULLIF($13, ''), preferred_payment_method),
        notes = COALESCE(NULLIF($14, ''), notes),
        birthday = COALESCE(NULLIF($15, ''), birthday),
        marketing_consent = COALESCE($16::boolean, marketing_consent),
        updated_at = NOW()
       WHERE id = $17`,
      [
        input.name ?? null,
        input.phone ?? null,
        normalized || null,
        input.email ?? null,
        input.street_address ?? null,
        input.city ?? null,
        input.region ?? null,
        country,
        input.delivery_notes ?? null,
        input.waze_link ?? null,
        input.gps_latitude ?? null,
        input.gps_longitude ?? null,
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
        id, name, phone, phone_normalized, email, street_address, city, region,
        country, delivery_notes, waze_link, gps_latitude, gps_longitude,
        preferred_payment_method, notes, birthday, marketing_consent, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb)`,
      [
        customerId,
        input.name || "Customer",
        input.phone ?? null,
        normalized || null,
        input.email ?? null,
        input.street_address ?? null,
        input.city ?? null,
        input.region ?? null,
        country,
        input.delivery_notes ?? null,
        input.waze_link ?? null,
        input.gps_latitude ?? null,
        input.gps_longitude ?? null,
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
      city = $6, region = $7, country = $8, delivery_notes = $9,
      waze_link = $10, gps_latitude = $11, gps_longitude = $12,
      preferred_payment_method = $13, notes = $14, birthday = $15, marketing_consent = $16,
      updated_at = NOW()
     WHERE id = $17`,
    [
      input.name ?? existing.name,
      input.phone ?? existing.phone,
      normalized || existing.phone_normalized,
      input.email ?? existing.email,
      input.street_address ?? existing.street_address,
      input.city ?? existing.city,
      input.region ?? existing.region,
      input.country ?? existing.country,
      input.delivery_notes ?? existing.delivery_notes,
      input.waze_link ?? existing.waze_link ?? null,
      input.gps_latitude ?? existing.gps_latitude ?? null,
      input.gps_longitude ?? existing.gps_longitude ?? null,
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

export async function deleteCustomer(id: string, userId?: string) {
  if (isDemoMode) return demoDeleteCustomer(id, userId);
  return transaction(async (client) => {
    const existing = await query<any>("SELECT * FROM customers WHERE id = $1", [id], client);
    if (!existing.rows[0]) return null;
    await auditLog(
      "customer:delete",
      "customer",
      id,
      { name: existing.rows[0].name, phone: existing.rows[0].phone, email: existing.rows[0].email },
      userId,
      client
    );
    await query("DELETE FROM customers WHERE id = $1", [id], client);
    return rowToCustomer(existing.rows[0]);
  });
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

export async function deleteOrder(id: string, userId?: string) {
  if (isDemoMode) return demoDeleteOrder(id, userId);
  return transaction(async (client) => {
    const existing = await readOrderById(client, id);
    if (!existing) return null;
    const shouldRestoreStock = existing.status !== "cancelled" && existing.status !== "draft";
    const shouldReverseCustomer = Boolean(existing.customer_id) && existing.status !== "cancelled";

    if (shouldRestoreStock) {
      for (const item of existing.items) {
        if (!item.product_id) continue;
        await query(
          "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2",
          [item.quantity, item.product_id],
          client
        );
      }
    }

    if (shouldReverseCustomer && existing.customer_id) {
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
    }

    await query("DELETE FROM loyalty_transactions WHERE order_id = $1", [id], client);
    await query("DELETE FROM stock_movements WHERE reference_id = $1", [id], client);
    await auditLog(
      "order:delete",
      "order",
      id,
      {
        order_number: existing.order_number,
        restored_items: shouldRestoreStock ? existing.items.length : 0,
        customer_id: existing.customer_id
      },
      userId,
      client
    );
    await query("DELETE FROM orders WHERE id = $1", [id], client);
    return existing;
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
    settings,
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
    getSettings(),
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
    currency: settings.currency,
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
