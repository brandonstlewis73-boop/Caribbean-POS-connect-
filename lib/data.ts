import { subDays, startOfDay } from "date-fns";
import bcrypt from "bcryptjs";
import { query, transaction, createId, type PoolClient } from "./db";
import {
  CURRENCY_CODE,
  DEFAULT_DELIVERY_RATES,
  getDefaultDeliveryRatesForCurrency,
  getDeliveryRegionsForCurrency,
  money
} from "./constants";
import {
  PLAN_ORDER,
  PLAN_CONFIG,
  buildUsageMeters,
  canUseFeature,
  getPlanConfig,
  isWithinLimit,
  normalizePlanId,
  type FeatureKey,
  type PlanUsageSummary,
  type UsageLimitKey,
  type UsageSnapshot
} from "./plan-gating";
import type {
  CheckoutPayload,
  Customer,
  CustomerInput,
  DashboardData,
  Order,
  OrderItem,
  Product,
  Receipt,
  Settings,
  StaffInput,
  Subscription,
  SubscriptionPlan,
  SubscriptionPlanId,
  User,
  Business,
  BusinessInput,
  Category,
  CategoryInput,
  CustomerNotification,
  OrderStatusHistory,
  ProductOption
} from "./types";
import { buildAddress, buildGoogleMapsLink, buildWazeLink } from "./waze";
import {
  buildCustomerConfirmationMessage,
  buildCustomerDriverAssignedWhatsAppMessage,
  buildCustomerOutForDeliveryWhatsAppMessage,
  buildCustomerReceiptWhatsAppMessage,
  buildDriverAssignmentWhatsAppMessage,
  buildOrderWhatsAppMessage,
  buildWhatsAppLink,
  cleanWhatsAppNumber
} from "./whatsapp";
import { sendWhatsAppMessage } from "./whatsapp-server";

type DbClient = PoolClient;
const DEFAULT_BUSINESS_ID = "biz_savannah_sea";

export const SETUP_CHECKLIST_ITEMS = [
  { key: "logo", label: "Add business logo" },
  { key: "whatsapp", label: "Add business WhatsApp number" },
  { key: "products", label: "Add products" },
  { key: "product_images", label: "Add product images" },
  { key: "barcodes", label: "Add barcode/SKU if needed" },
  { key: "delivery", label: "Set delivery/pickup options" },
  { key: "receipt", label: "Set receipt message" },
  { key: "test_order", label: "Test storefront order" },
  { key: "test_whatsapp", label: "Test WhatsApp notification" }
];

export const defaultSettings: Settings = {
  business_name: "Your Business",
  business_phone: "",
  business_email: "owner@yourbusiness.com",
  business_address: "",
  business_street_address: "",
  business_city: "",
  business_region: "",
  business_country: "Trinidad and Tobago",
  business_postal_code: "",
  business_latitude: null,
  business_longitude: null,
  logo_url: "/logo.svg",
  business_type: "retail",
  business_color: "#14b8a6",
  storefront_banner_url: "",
  storefront_status: "live",
  store_hours: "Open during business hours",
  delivery_enabled: true,
  pickup_enabled: true,
  free_delivery_minimum: 0,
  waze_enabled: true,
  driver_waze_enabled: true,
  show_empty_categories: false,
  active_business_id: "biz_savannah_sea",
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
  whatsapp_provider: "twilio",
  whatsapp_business_number: "",
  whatsapp_country_code: "+1868",
  whatsapp_owner_alerts_enabled: true,
  whatsapp_customer_confirmations_enabled: true,
  whatsapp_customer_receipts_enabled: false,
  whatsapp_driver_assignment_enabled: true,
  whatsapp_driver_alerts_enabled: true,
  whatsapp_out_for_delivery_enabled: true,
  whatsapp_order_template:
    "New order received for {{business_name}}.\n\nOrder: #{{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nType: {{order_type}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment status: {{payment_status}}\nStatus: {{order_status}}\nTime: {{date_time}}\n\nView order: {{dashboard_link}}",
  whatsapp_customer_confirmation_template:
    "Thank you for ordering from {{business_name}}.\n\nOrder: #{{order_number}}\nItems:\n{{items}}\n\nTotal: {{total}}\nStatus: Received\n\nWe will update you when your order is ready.\nContact: {{business_phone}}",
  whatsapp_customer_receipt_template:
    "Hi {{customer_name}}, your receipt for order #{{order_number}} from {{business_name}} is ready.\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}}\nCompleted: {{completed_at}}\n\n{{receipt_message}}\nContact: {{business_phone}}",
  whatsapp_driver_assigned_template:
    "Hi {{customer_name}}, your {{business_name}} order #{{order_number}} has been assigned to {{driver_name}}.\nDriver phone: {{driver_phone}}\nStatus: {{delivery_status}}\nTotal: {{total}}\nContact: {{business_phone}}",
  whatsapp_driver_alert_template:
    "Delivery assigned - {{business_name}}\n\nOrder #: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}} ({{payment_status}})\nWaze: {{waze_link}}\nDashboard: {{dashboard_link}}",
  whatsapp_out_for_delivery_template:
    "Hi {{customer_name}}, your {{business_name}} order #{{order_number}} is out for delivery.\nDriver: {{driver_name}}\nDriver phone: {{driver_phone}}\nTotal: {{total}}\n{{receipt_message}}\nContact: {{business_phone}}",
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
  receipt_whatsapp_enabled: false,
  notification_whatsapp_enabled: true,
  notification_sms_enabled: false,
  notification_email_enabled: false,
  default_prep_time_minutes: 25
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
    category_id: row.category_id || null,
    description: row.description || null,
    cost_price: Number(row.cost_price),
    selling_price: Number(row.selling_price),
    discount_price: row.discount_price === null || row.discount_price === undefined ? null : Number(row.discount_price),
    stock_quantity: Number(row.stock_quantity),
    low_stock_alert: Number(row.low_stock_alert),
    variations: parseJson<ProductOption[]>(row.variations, []),
    add_ons: parseJson<ProductOption[]>(row.add_ons, []),
    active: bool(row.active)
  };
}

function rowToCategory(row: any): Category {
  const isActive = row.is_active === undefined || row.is_active === null ? row.active : row.is_active;
  return {
    id: row.id,
    business_id: row.business_id || null,
    name: row.name,
    slug: row.slug,
    description: row.description || null,
    icon: row.icon || null,
    color: row.color || null,
    sort_order: Number(row.sort_order || 0),
    is_active: bool(isActive),
    active: bool(isActive),
    created_at: toDateString(row.created_at) || undefined,
    updated_at: toDateString(row.updated_at) || undefined
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

async function getGlobalActiveBusinessId(client?: DbClient) {
  try {
    const row = await query<{ value: unknown }>("SELECT value FROM settings WHERE key = 'active_business_id'", [], client);
    return parseJson<string | null>(row.rows[0]?.value, null) || DEFAULT_BUSINESS_ID;
  } catch {
    return DEFAULT_BUSINESS_ID;
  }
}

export async function getBusinessIdForUser(userId?: string | null, client?: DbClient) {
  if (!userId) return getGlobalActiveBusinessId(client);
  try {
    const row = await query<{ business_id: string | null }>(
      "SELECT business_id FROM users WHERE id = $1 LIMIT 1",
      [userId],
      client
    );
    return row.rows[0]?.business_id || getGlobalActiveBusinessId(client);
  } catch {
    return getGlobalActiveBusinessId(client);
  }
}

async function resolveBusinessId(input?: { businessId?: string | null; userId?: string | null; client?: DbClient }) {
  return input?.businessId || getBusinessIdForUser(input?.userId, input?.client);
}

function businessScopedClause(params: unknown[], businessId?: string | null, tableAlias = "") {
  if (!businessId) return "TRUE";
  const column = tableAlias ? `${tableAlias}.business_id` : "business_id";
  return `(${column} = ${addParam(params, businessId)} OR ${column} IS NULL)`;
}

function setupChecklistForBusiness(business: Business | null | undefined, settings: Settings, products: Product[]) {
  const stored = business?.setup_checklist || {};
  return SETUP_CHECKLIST_ITEMS.map((item) => {
    let complete = Boolean(stored[item.key]);
    if (item.key === "logo") complete = Boolean(settings.logo_url && settings.logo_url !== "/logo.svg");
    if (item.key === "whatsapp") complete = Boolean(settings.whatsapp_business_number || business?.business_whatsapp_number);
    if (item.key === "products") complete = products.length > 0;
    if (item.key === "product_images") complete = products.some((product) => product.image_url);
    if (item.key === "barcodes") complete = products.some((product) => product.barcode || product.sku);
    if (item.key === "delivery") complete = Boolean(settings.delivery_rates && Object.keys(settings.delivery_rates).length);
    if (item.key === "receipt") complete = Boolean(settings.receipt_message);
    return { ...item, complete };
  });
}

function rowToBusiness(row: any): Business {
  return {
    ...row,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    active: bool(row.active),
    setup_checklist: parseJson<Record<string, boolean>>(row.setup_checklist, {}),
    trial_ends_at: toDateString(row.trial_ends_at),
    created_at: toDateString(row.created_at) || undefined,
    updated_at: toDateString(row.updated_at) || undefined
  };
}

type StaffAvatarMap = Record<string, Pick<User, "avatar_key" | "avatar_url">>;

async function getStaffAvatarMap(client?: DbClient): Promise<StaffAvatarMap> {
  const row = await query<{ value: unknown }>("SELECT value FROM settings WHERE key = 'staff_avatar_profiles'", [], client);
  return parseJson<StaffAvatarMap>(row.rows[0]?.value, {});
}

async function saveSettingValue(key: string, value: unknown, client?: DbClient) {
  await query(
    "UPDATE settings SET value = $2::jsonb, updated_at = NOW() WHERE key = $1",
    [key, JSON.stringify(value)],
    client
  );
  await query(
    `INSERT INTO settings (key, value, updated_at)
     SELECT $1, $2::jsonb, NOW()
     WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = $1)`,
    [key, JSON.stringify(value)],
    client
  );
}

async function saveBusinessSettingValue(businessId: string, key: string, value: unknown, client?: DbClient) {
  await query(
    "UPDATE business_settings SET value = $3::jsonb, updated_at = NOW() WHERE business_id = $1 AND key = $2",
    [businessId, key, JSON.stringify(value)],
    client
  ).catch(() => undefined);
  await query(
    `INSERT INTO business_settings (business_id, key, value, updated_at)
     SELECT $1, $2, $3::jsonb, NOW()
     WHERE NOT EXISTS (
       SELECT 1 FROM business_settings WHERE business_id = $1 AND key = $2
     )`,
    [businessId, key, JSON.stringify(value)],
    client
  ).catch(() => undefined);
}

async function saveStaffAvatar(userId: string, input: StaffInput, client?: DbClient) {
  const avatars = await getStaffAvatarMap(client);
  avatars[userId] = {
    avatar_key: input.avatar_key || avatars[userId]?.avatar_key || "teal-register",
    avatar_url: input.avatar_url ?? avatars[userId]?.avatar_url ?? null
  };
  await saveSettingValue("staff_avatar_profiles", avatars, client);
}

async function deleteStaffAvatar(userId: string, client?: DbClient) {
  const avatars = await getStaffAvatarMap(client);
  delete avatars[userId];
  await saveSettingValue("staff_avatar_profiles", avatars, client);
}

function rowToUser(row: any, avatar?: Pick<User, "avatar_key" | "avatar_url">): User {
  return {
    id: row.id,
    business_id: row.business_id || null,
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
    notification_whatsapp: row.notification_whatsapp === undefined ? true : bool(row.notification_whatsapp),
    notification_sms: bool(row.notification_sms),
    notification_email: bool(row.notification_email),
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
    inventory_applied: bool(row.inventory_applied),
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
    estimated_delivery_at: toDateString(row.estimated_delivery_at),
    completed_at: toDateString(row.completed_at),
    updated_at: toDateString(row.updated_at) || "",
    items,
    status_history: [],
    customer_notifications: []
  };
}

function rowToOrderStatusHistory(row: any): OrderStatusHistory {
  return {
    id: row.id,
    order_id: row.order_id,
    status: row.status,
    note: row.note || null,
    changed_by: row.changed_by || null,
    changed_by_name: row.changed_by_name || null,
    created_at: toDateString(row.created_at) || ""
  };
}

function rowToCustomerNotification(row: any): CustomerNotification {
  return {
    id: row.id,
    business_id: row.business_id || null,
    order_id: row.order_id,
    customer_id: row.customer_id || null,
    channel: row.channel,
    status: row.status,
    message: row.message,
    destination: row.destination || null,
    provider: row.provider || null,
    delivery_status: row.delivery_status || "queued",
    error_message: row.error_message || null,
    sent_at: toDateString(row.sent_at),
    created_at: toDateString(row.created_at) || ""
  };
}

function rowToReceipt(row: any): Receipt {
  return {
    id: row.id,
    business_id: row.business_id || null,
    order_id: row.order_id,
    order_number: row.order_number || "",
    receipt_number: row.receipt_number,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    items: parseJson<OrderItem[]>(row.items, []).map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      cost_price: Number(item.cost_price),
      discount: Number(item.discount),
      line_total: Number(item.line_total)
    })),
    subtotal: Number(row.subtotal || 0),
    discount_total: Number(row.discount_total || 0),
    tax_total: Number(row.tax_total || 0),
    delivery_fee: Number(row.delivery_fee || 0),
    total: Number(row.total || 0),
    payment_method: row.payment_method || "",
    payment_status: row.payment_status || "paid",
    completed_by: row.completed_by,
    completed_by_name: row.completed_by_name,
    completed_at: toDateString(row.completed_at),
    channel: row.channel || "print",
    whatsapp_sent_at: toDateString(row.whatsapp_sent_at),
    created_at: toDateString(row.created_at) || "",
    updated_at: toDateString(row.updated_at)
  };
}

async function hydrateOrders(rows: any[], client?: DbClient) {
  if (!rows.length) return [];
  const orderIds = rows.map((row) => row.id);
  const [itemRows, historyRows, notificationRows] = await Promise.all([
    query<any>(
      "SELECT * FROM order_items WHERE order_id = ANY($1::text[]) ORDER BY created_at ASC",
      [orderIds],
      client
    ),
    query<any>(
      `SELECT h.*, u.name AS changed_by_name
       FROM order_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.order_id = ANY($1::text[])
       ORDER BY h.created_at ASC`,
      [orderIds],
      client
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      "SELECT * FROM customer_notifications WHERE order_id = ANY($1::text[]) ORDER BY created_at ASC",
      [orderIds],
      client
    ).catch(() => ({ rows: [] as any[] }))
  ]);
  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const row of itemRows.rows) {
    const items = itemsByOrder.get(row.order_id) || [];
    items.push(rowToOrderItem(row));
    itemsByOrder.set(row.order_id, items);
  }
  const historyByOrder = new Map<string, OrderStatusHistory[]>();
  for (const row of historyRows.rows) {
    const history = historyByOrder.get(row.order_id) || [];
    history.push(rowToOrderStatusHistory(row));
    historyByOrder.set(row.order_id, history);
  }
  const notificationsByOrder = new Map<string, CustomerNotification[]>();
  for (const row of notificationRows.rows) {
    const notifications = notificationsByOrder.get(row.order_id) || [];
    notifications.push(rowToCustomerNotification(row));
    notificationsByOrder.set(row.order_id, notifications);
  }
  return rows.map((row) => ({
    ...rowToOrder(row, itemsByOrder.get(row.id) || []),
    status_history: historyByOrder.get(row.id) || [],
    customer_notifications: notificationsByOrder.get(row.id) || []
  }));
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
  await saveSettingValue(key, next, client);
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
  const rows = await query<{ key: keyof Settings; value: unknown }>("SELECT key, value FROM settings");
  const settings: Record<string, unknown> = { ...defaultSettings };
  for (const row of rows.rows) {
    settings[row.key] = parseJson(row.value, row.value);
  }
  settings.delivery_rates = normalizeDeliveryRates(settings.delivery_rates as Record<string, number>, settings.currency as string);
  return settings as Settings;
}

export async function getBusinessById(id?: string | null) {
  if (!id) return null;
  const rows = await query<any>("SELECT * FROM businesses WHERE id = $1 AND active = TRUE", [id]);
  return rows.rows[0] ? rowToBusiness(rows.rows[0]) : null;
}

export async function getBusinessBySlug(slug?: string | null) {
  if (!slug) return null;
  const rows = await query<any>(
    "SELECT * FROM businesses WHERE active = TRUE AND (slug = $1 OR storefront_slug = $1) LIMIT 1",
    [slug]
  );
  return rows.rows[0] ? rowToBusiness(rows.rows[0]) : null;
}

export async function getBusinessSettings(businessId?: string | null): Promise<Settings> {
  const base = await getSettings();
  const id = businessId || base.active_business_id || DEFAULT_BUSINESS_ID;

  const [business, settingRows] = await Promise.all([
    getBusinessById(id),
    query<{ key: keyof Settings; value: unknown }>(
      "SELECT key, value FROM business_settings WHERE business_id = $1",
      [id]
    ).catch(() => ({ rows: [] as Array<{ key: keyof Settings; value: unknown }> }))
  ]);

  const settings: Record<string, unknown> = { ...base, active_business_id: id };
  for (const row of settingRows.rows) {
    settings[row.key] = parseJson(row.value, row.value);
  }
  if (business) {
    settings.business_name = business.name;
    settings.business_phone = business.phone || business.owner_phone || base.business_phone;
    settings.business_email = business.email || business.owner_email || base.business_email;
    settings.business_address = buildAddress([
      business.street_address,
      business.city,
      business.region,
      business.postal_code,
      business.country
    ]) || base.business_address;
    settings.business_street_address = business.street_address || "";
    settings.business_city = business.city || "";
    settings.business_region = business.region || "";
    settings.business_country = business.country || "";
    settings.business_postal_code = business.postal_code || "";
    settings.business_latitude = business.latitude ?? null;
    settings.business_longitude = business.longitude ?? null;
    settings.logo_url = business.logo_url || base.logo_url || "/logo.svg";
    settings.currency = business.currency || base.currency;
    settings.whatsapp_business_number =
      business.business_whatsapp_number || (settings.whatsapp_business_number as string) || business.phone || "";
  }
  settings.delivery_rates = normalizeDeliveryRates(settings.delivery_rates as Record<string, number>, settings.currency as string);
  return settings as Settings;
}

export async function updateSettings(input: Partial<Settings>, userId?: string) {
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
    const businessId = await getBusinessIdForUser(userId, client);
    for (const [key, value] of Object.entries(nextInput)) {
      await saveSettingValue(key, value, client);
      if (businessId) {
        await saveBusinessSettingValue(businessId, key, value, client);
      }
    }
    if (businessId) {
      await query(
        `UPDATE businesses SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          logo_url = COALESCE($4, logo_url),
          business_whatsapp_number = COALESCE($5, business_whatsapp_number),
          currency = COALESCE($6, currency),
          street_address = COALESCE($7, street_address),
          city = COALESCE($8, city),
          region = COALESCE($9, region),
          country = COALESCE($10, country),
          postal_code = COALESCE($11, postal_code),
          latitude = COALESCE($12::numeric, latitude),
          longitude = COALESCE($13::numeric, longitude),
          updated_at = NOW()
         WHERE id = $14`,
        [
          nextInput.business_name ?? null,
          nextInput.business_phone ?? null,
          nextInput.business_email ?? null,
          nextInput.logo_url ?? null,
          nextInput.whatsapp_business_number ?? null,
          nextInput.currency ?? null,
          nextInput.business_street_address ?? null,
          nextInput.business_city ?? null,
          nextInput.business_region ?? null,
          nextInput.business_country ?? null,
          nextInput.business_postal_code ?? null,
          nextInput.business_latitude ?? null,
          nextInput.business_longitude ?? null,
          businessId
        ],
        client
      );
    }
    await auditLog("settings:update", "settings", "global", nextInput, userId, client);
  });
  return getBusinessSettings(await getBusinessIdForUser(userId));
}

export async function auditLog(
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: unknown,
  userId?: string | null,
  client?: DbClient
) {
  await query(
    "INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
    [createId("aud"), userId ?? null, action, entityType, entityId ?? null, JSON.stringify(metadata ?? {})],
    client
  );
}

export async function listAuditLogs(limit = 100) {
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

export async function listUsers(role?: string, includeInactive = false, businessId?: string | null): Promise<User[]> {
  const params: unknown[] = [];
  const clauses = includeInactive ? ["TRUE"] : ["active = TRUE"];
  if (businessId) clauses.push(businessScopedClause(params, businessId));
  if (role) {
    clauses.push(`role = ${addParam(params, role)}`);
  }
  const [rows, avatars] = await Promise.all([
    query<User>(
    `SELECT id, business_id, name, email, role, phone, active
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
  const id = createId("usr");
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  return transaction(async (client) => {
    const businessId = await getBusinessIdForUser(userId, client);
    await query(
      `INSERT INTO users (id, business_id, name, email, password_hash, role, phone, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        businessId,
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
    const rows = await query<any>("SELECT id, business_id, name, email, role, phone, active FROM users WHERE id = $1", [id], client);
    return rows.rows[0] ? rowToUser(rows.rows[0], avatars[id]) : null;
  });
}

export async function updateStaffUser(id: string, input: StaffInput, userId?: string) {
  return transaction(async (client) => {
    const businessId = await getBusinessIdForUser(userId, client);
    const existing = await query<any>(
      `SELECT id, business_id, name, email, role, phone, active
       FROM users
       WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)`,
      [id, businessId],
      client
    );
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
    const rows = await query<any>("SELECT id, business_id, name, email, role, phone, active FROM users WHERE id = $1", [id], client);
    return rows.rows[0] ? rowToUser(rows.rows[0], avatars[id]) : null;
  });
}

export async function deleteStaffUser(id: string, userId?: string) {
  return transaction(async (client) => {
    const businessId = await getBusinessIdForUser(userId, client);
    const existing = await query<any>(
      "SELECT id, business_id, name, email, role, phone, active FROM users WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)",
      [id, businessId],
      client
    );
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

export async function listBusinesses(userId?: string | null): Promise<Business[]> {
  const businessId = userId ? await getBusinessIdForUser(userId) : null;
  const params: unknown[] = [];
  const where = businessId ? `WHERE id = ${addParam(params, businessId)}` : "";
  const rows = await query<any>(
    `SELECT id, name, legal_name, slug, phone, email, street_address, city, region,
            postal_code, latitude, longitude, country, currency, logo_url, tax_id, active, owner_name, owner_email,
            owner_phone, business_whatsapp_number, storefront_slug, subscription_plan,
            subscription_status, trial_ends_at, setup_checklist, created_at, updated_at
     FROM businesses
     ${where}
     ORDER BY created_at DESC, name ASC`
    ,
    params
  );
  return rows.rows.map(rowToBusiness);
}

export async function createBusiness(input: BusinessInput, userId?: string) {
  const id = createId("biz");
  const name = input.name?.trim();
  if (!name) return null;
  const baseSlug = slugify(input.slug || name);
  const slug = baseSlug ? `${baseSlug}-${id.slice(-8)}` : id;
  await query(
    `INSERT INTO businesses (
      id, name, legal_name, slug, storefront_slug, owner_name, owner_email, owner_phone,
      business_whatsapp_number, phone, email, street_address, city, region,
      postal_code, latitude, longitude, country, currency, logo_url, tax_id, active
    ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, TRUE)`,
    [
      id,
      name,
      input.legal_name || name,
      slug,
      input.owner_name ?? null,
      input.owner_email || input.email || null,
      input.owner_phone || input.phone || null,
      input.business_whatsapp_number || input.phone || null,
      input.email || null,
      input.street_address ?? null,
      input.city ?? null,
      input.region ?? null,
      input.postal_code ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
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

export async function createBusinessOwnerAccount(input: {
  business_name: string;
  owner_name?: string;
  email: string;
  whatsapp_number: string;
  password: string;
  country?: string;
  currency?: string;
}) {
  const businessId = createId("biz");
  const baseSlug = slugify(input.business_name) || businessId;
  const slug = `${baseSlug}-${businessId.slice(-6)}`;
  const userId = createId("usr");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const ownerName = input.owner_name?.trim() || "Business Owner";
  const email = input.email.trim().toLowerCase();
  const country = input.country || "Trinidad and Tobago";
  const currency = input.currency || CURRENCY_CODE;

  return transaction(async (client) => {
    const existing = await query<{ id: string }>("SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email], client);
    if (existing.rows[0]) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }
    await query(
      `INSERT INTO businesses (
        id, name, legal_name, slug, storefront_slug, owner_name, owner_email, owner_phone,
        business_whatsapp_number, phone, email, country, currency, logo_url,
        subscription_plan, subscription_status, trial_ends_at, setup_checklist, active
      ) VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $6, $6, $5, $7, $8, '/logo.svg',
        'starter', 'trial', NOW() + INTERVAL '14 days', '{}'::jsonb, TRUE)`,
      [businessId, input.business_name.trim(), slug, ownerName, email, input.whatsapp_number, country, currency],
      client
    );
    await query(
      `INSERT INTO users (id, business_id, name, email, password_hash, role, phone, active)
       VALUES ($1, $2, $3, $4, $5, 'owner', $6, TRUE)`,
      [userId, businessId, ownerName, email, passwordHash, input.whatsapp_number],
      client
    );
    const businessSettings: Partial<Settings> = {
      active_business_id: businessId,
      business_name: input.business_name.trim(),
      business_phone: input.whatsapp_number,
      business_email: email,
      business_address: country,
      logo_url: "/logo.svg",
      currency,
      whatsapp_enabled: true,
      whatsapp_provider: "twilio",
      whatsapp_business_number: input.whatsapp_number,
      whatsapp_country_code: process.env.DEFAULT_COUNTRY_CODE || "+1868",
      whatsapp_owner_alerts_enabled: true,
      whatsapp_customer_confirmations_enabled: true,
      whatsapp_customer_receipts_enabled: true
    };
    for (const [key, value] of Object.entries(businessSettings)) {
      await saveBusinessSettingValue(businessId, key, value, client);
    }
    const plan = PLAN_CONFIG.trial;
    await query(
      `INSERT INTO subscriptions (
        id, business_id, plan_id, plan_name, status, seats, monthly_price, currency,
        provider, current_period_start, current_period_end, trial_ends_at, metadata
      ) VALUES ($1, $2, $3, $4, 'trialing', $5, $6, $7, 'manual', NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '14 days', $8::jsonb)`,
      [
        createId("sub"),
        businessId,
        plan.id,
        plan.name,
        plan.limits.staff,
        plan.monthlyPrice,
        currency,
        JSON.stringify({
          max_products: plan.limits.products,
          max_staff: plan.limits.staff,
          max_ai_generations: plan.limits.aiGenerations,
          max_whatsapp_messages: plan.limits.whatsappMessages,
          whatsapp_enabled: plan.features.includes("whatsappMessaging")
        })
      ],
      client
    );
    await auditLog("business:owner_signup", "business", businessId, { email, slug }, userId, client);
    const businessRows = await query<any>("SELECT * FROM businesses WHERE id = $1", [businessId], client);
    const userRows = await query<any>("SELECT id, business_id, name, email, role, phone, active FROM users WHERE id = $1", [userId], client);
    return {
      business: businessRows.rows[0] ? rowToBusiness(businessRows.rows[0]) : null,
      user: userRows.rows[0] ? rowToUser(userRows.rows[0]) : null
    };
  });
}

export async function deleteBusiness(id: string, userId?: string) {
  return transaction(async (client) => {
    const rows = await query<any>("SELECT * FROM businesses WHERE id = $1", [id], client);
    const existing = rows.rows[0];
    if (!existing) return null;
    const activeRows = await query<{ value: unknown }>("SELECT value FROM settings WHERE key = 'active_business_id'", [], client);
    const activeBusinessId = parseJson<string | null>(activeRows.rows[0]?.value, null);
    if (activeBusinessId === id) {
      throw new Error("Switch to another business before deleting the live business profile.");
    }
    const countRows = await query<{ count: number }>("SELECT COUNT(*)::int AS count FROM businesses", [], client);
    if (Number(countRows.rows[0]?.count || 0) <= 1) {
      throw new Error("Keep at least one business profile in the store.");
    }
    await auditLog("business:delete", "business", id, { name: existing.name, currency: existing.currency }, userId, client);
    await query("DELETE FROM businesses WHERE id = $1", [id], client);
    return rowToBusiness(existing);
  });
}

export function listSubscriptionPlans(): SubscriptionPlan[] {
  return PLAN_ORDER.map((planId) => {
    const plan = PLAN_CONFIG[planId];
    return {
      id: plan.id,
      name: plan.name,
      audience: plan.audience,
      monthly_price: plan.monthlyPrice,
      currency: plan.currency,
      max_products: plan.limits.products,
      max_staff: plan.limits.staff,
      max_locations: plan.limits.locations,
      max_ai_generations: plan.limits.aiGenerations,
      max_whatsapp_messages: plan.limits.whatsappMessages,
      whatsapp_enabled: plan.features.includes("whatsappMessaging"),
      ai_support_enabled: plan.features.includes("aiSupport"),
      features: [...plan.featureList]
    };
  }) as SubscriptionPlan[];
}

export async function getCurrentSubscription(businessId?: string | null): Promise<Subscription | null> {
  const params: unknown[] = [];
  const where = businessId ? `WHERE business_id = ${addParam(params, businessId)}` : "";
  const rows = await query<any>(
    `SELECT *
     FROM subscriptions
     ${where}
     ORDER BY created_at DESC
     LIMIT 1`,
    params
  );
  return rows.rows[0] ? rowToSubscription(rows.rows[0]) : null;
}

export async function updateSubscriptionPlan(planId: SubscriptionPlanId, userId?: string) {
  const normalizedPlanId = normalizePlanId(planId);
  const plan = getPlanConfig(normalizedPlanId);
  const businessId = await getBusinessIdForUser(userId);
  const existing = await getCurrentSubscription(businessId);
  const subscriptionId = existing?.id || createId("sub");
  const resolvedBusinessId = existing?.business_id || businessId || DEFAULT_BUSINESS_ID;
  if (existing) {
    await query(
      `UPDATE subscriptions SET
        plan_id = $2,
        plan_name = $3,
        seats = $4,
        monthly_price = $5,
        currency = $6,
        updated_at = NOW()
       WHERE id = $1`,
      [subscriptionId, plan.id, plan.name, plan.limits.staff, plan.monthlyPrice, plan.currency]
    );
  } else {
    await query(
      `INSERT INTO subscriptions (
        id, business_id, plan_id, plan_name, status, seats, monthly_price, currency,
        provider, current_period_start, current_period_end, trial_ends_at, metadata
      ) VALUES ($1, $2, $3, $4, 'trialing', $5, $6, $7, 'manual', NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '14 days', '{}'::jsonb)`,
      [
        subscriptionId,
        resolvedBusinessId,
        plan.id,
        plan.name,
        plan.limits.staff,
        plan.monthlyPrice,
        plan.currency
      ]
    );
  }
  await auditLog("subscription:update_plan", "subscription", subscriptionId, { plan_id: plan.id }, userId);
  return getCurrentSubscription(resolvedBusinessId);
}

export class PlanGateError extends Error {
  status = 402;
  details: {
    planId: string;
    requiredPlan?: string;
    feature?: FeatureKey;
    limitKey?: UsageLimitKey;
    limit?: number | null;
    usage?: number;
  };

  constructor(message: string, details: PlanGateError["details"]) {
    super(message);
    this.name = "PlanGateError";
    this.details = details;
  }
}

async function countRows(sql: string, params: unknown[]) {
  const rows = await query<{ count: number }>(sql, params);
  return Number(rows.rows[0]?.count || 0);
}

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getSubscriptionPlanId(businessId?: string | null) {
  const subscription = await getCurrentSubscription(businessId);
  return normalizePlanId(subscription?.plan_id || subscription?.plan_name);
}

export async function getPlanUsage(businessId?: string | null): Promise<UsageSnapshot> {
  const resolvedBusinessId = businessId || DEFAULT_BUSINESS_ID;
  const start = monthStartIso();
  const [products, staff, locations, aiGenerations, whatsappMessages] = await Promise.all([
    countRows("SELECT COUNT(*)::int AS count FROM products WHERE business_id = $1 AND active = TRUE", [resolvedBusinessId]),
    countRows("SELECT COUNT(*)::int AS count FROM users WHERE business_id = $1 AND active = TRUE", [resolvedBusinessId]),
    countRows("SELECT COUNT(*)::int AS count FROM businesses WHERE id = $1 AND active = TRUE", [resolvedBusinessId]),
    countRows("SELECT COUNT(*)::int AS count FROM ai_support_logs WHERE business_id = $1 AND created_at >= $2", [resolvedBusinessId, start]).catch(() => 0),
    countRows(
      "SELECT COUNT(*)::int AS count FROM customer_notifications WHERE business_id = $1 AND channel = 'whatsapp' AND created_at >= $2",
      [resolvedBusinessId, start]
    ).catch(() => 0)
  ]);

  return { aiGenerations, whatsappMessages, staff, products, locations: Math.max(locations, 1) };
}

export async function getPlanUsageSummary(businessId?: string | null): Promise<PlanUsageSummary> {
  const planId = await getSubscriptionPlanId(businessId);
  const plan = getPlanConfig(planId);
  const usage = await getPlanUsage(businessId);
  return {
    planId,
    planName: plan.name,
    usage,
    meters: buildUsageMeters(planId, usage)
  };
}

export async function assertFeatureAccess(businessId: string | null | undefined, feature: FeatureKey) {
  const planId = await getSubscriptionPlanId(businessId);
  const gate = canUseFeature(planId, feature);
  if (!gate.allowed) {
    throw new PlanGateError(gate.message, {
      planId,
      requiredPlan: gate.requiredPlan,
      feature
    });
  }
  return gate;
}

export async function assertUsageLimit(businessId: string | null | undefined, key: UsageLimitKey, adding = 1) {
  const planId = await getSubscriptionPlanId(businessId);
  const usage = await getPlanUsage(businessId);
  const gate = isWithinLimit(planId, key, usage[key], adding);
  if (!gate.allowed) {
    throw new PlanGateError(gate.message, {
      planId,
      limitKey: key,
      limit: gate.limit,
      usage: gate.usage
    });
  }
  return gate;
}

const DEFAULT_CATEGORY_COLORS = [
  "#14b8a6",
  "#22d3ee",
  "#facc15",
  "#22c55e",
  "#f9735b",
  "#38bdf8",
  "#a78bfa",
  "#f472b6"
];

function categoryColor(index: number) {
  return DEFAULT_CATEGORY_COLORS[index % DEFAULT_CATEGORY_COLORS.length];
}

async function getCategoryByName(client: DbClient | undefined, businessId: string | null | undefined, name: string) {
  const rows = await query<any>(
    "SELECT * FROM categories WHERE LOWER(name) = LOWER($1) AND (business_id = $2 OR business_id IS NULL) LIMIT 1",
    [name, businessId || DEFAULT_BUSINESS_ID],
    client
  ).catch(() => ({ rows: [] as any[] }));
  return rows.rows[0] ? rowToCategory(rows.rows[0]) : null;
}

async function ensureCategory(
  client: DbClient | undefined,
  businessId: string | null | undefined,
  input: { name: string; categoryId?: string | null }
) {
  const resolvedBusinessId = businessId || DEFAULT_BUSINESS_ID;
  if (input.categoryId) {
    const byId = await query<any>(
      "SELECT * FROM categories WHERE id = $1 AND (business_id = $2 OR business_id IS NULL) LIMIT 1",
      [input.categoryId, resolvedBusinessId],
      client
    ).catch(() => ({ rows: [] as any[] }));
    if (byId.rows[0]) return rowToCategory(byId.rows[0]);
  }
  const existing = await getCategoryByName(client, resolvedBusinessId, input.name);
  if (existing) return existing;
  const count = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM categories WHERE business_id = $1",
    [resolvedBusinessId],
    client
  ).catch(() => ({ rows: [{ count: 0 }] }));
  const name = input.name.trim() || "Uncategorized";
  const id = createId("cat");
  await query(
    `INSERT INTO categories (id, business_id, name, slug, icon, color, sort_order, active, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE)`,
    [id, resolvedBusinessId, name, slugify(name), name.slice(0, 2).toUpperCase(), categoryColor(Number(count.rows[0]?.count || 0)), (Number(count.rows[0]?.count || 0) + 1) * 10],
    client
  );
  return (await getCategoryByName(client, resolvedBusinessId, name))!;
}

export async function listCategories(search?: string, includeInactive = false, businessId?: string | null): Promise<Category[]> {
  const params: unknown[] = [];
  const clauses = includeInactive ? ["TRUE"] : ["COALESCE(is_active, active, TRUE) = TRUE"];
  if (businessId) clauses.push(businessScopedClause(params, businessId));
  if (search?.trim()) {
    const like = addParam(params, `%${search.trim()}%`);
    clauses.push(`(name ILIKE ${like} OR slug ILIKE ${like} OR description ILIKE ${like})`);
  }
  const rows = await query<any>(
    `SELECT *
     FROM categories
     WHERE ${clauses.join(" AND ")}
     ORDER BY sort_order ASC, name ASC`,
    params
  );
  return rows.rows.map(rowToCategory);
}

export async function createCategory(input: CategoryInput, userId?: string) {
  const businessId = await getBusinessIdForUser(userId);
  const existingRows = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM categories WHERE business_id = $1",
    [businessId]
  );
  const name = input.name?.trim();
  if (!name) throw new Error("Category name is required.");
  const id = createId("cat");
  const slug = slugify(input.slug || name);
  await query(
    `INSERT INTO categories (
      id, business_id, name, slug, description, icon, color, sort_order, active, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
    [
      id,
      businessId,
      name,
      slug,
      input.description ?? null,
      input.icon || name.slice(0, 2).toUpperCase(),
      input.color || categoryColor(Number(existingRows.rows[0]?.count || 0)),
      input.sort_order ?? (Number(existingRows.rows[0]?.count || 0) + 1) * 10,
      input.is_active ?? input.active ?? true
    ]
  );
  await auditLog("category:create", "category", id, input, userId);
  return (await listCategories(undefined, true, businessId)).find((category) => category.id === id) || null;
}

export async function updateCategory(id: string, input: CategoryInput, userId?: string) {
  const businessId = await getBusinessIdForUser(userId);
  const existingRows = await query<any>(
    "SELECT * FROM categories WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)",
    [id, businessId]
  );
  const existing = existingRows.rows[0] ? rowToCategory(existingRows.rows[0]) : null;
  if (!existing) return null;
  const nextName = input.name?.trim() || existing.name;
  const nextSlug = slugify(input.slug || nextName);
  const nextActive = input.is_active ?? input.active ?? existing.is_active;
  await query(
    `UPDATE categories SET
      name = $1, slug = $2, description = $3, icon = $4, color = $5,
      sort_order = $6, active = $7, is_active = $7, updated_at = NOW()
     WHERE id = $8 AND (business_id = $9 OR business_id IS NULL)`,
    [
      nextName,
      nextSlug,
      input.description ?? existing.description ?? null,
      input.icon ?? existing.icon ?? nextName.slice(0, 2).toUpperCase(),
      input.color ?? existing.color ?? categoryColor(0),
      input.sort_order ?? existing.sort_order,
      nextActive,
      id,
      businessId
    ]
  );
  await query(
    "UPDATE products SET category = $1, updated_at = NOW() WHERE category_id = $2 AND (business_id = $3 OR business_id IS NULL)",
    [nextName, id, businessId]
  );
  await auditLog("category:update", "category", id, input, userId);
  return (await listCategories(undefined, true, businessId)).find((category) => category.id === id) || null;
}

export async function deleteCategory(
  id: string,
  userId?: string,
  mode: "move_to_uncategorized" | "delete_category_only" = "move_to_uncategorized"
) {
  return transaction(async (client) => {
    const businessId = await getBusinessIdForUser(userId, client);
    const existingRows = await query<any>(
      "SELECT * FROM categories WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)",
      [id, businessId],
      client
    );
    const existing = existingRows.rows[0] ? rowToCategory(existingRows.rows[0]) : null;
    if (!existing) return null;
    if (mode === "delete_category_only") {
      await query(
        "UPDATE products SET category_id = NULL, updated_at = NOW() WHERE category_id = $1 AND (business_id = $2 OR business_id IS NULL)",
        [id, businessId],
        client
      );
    } else {
      const fallback = await ensureCategory(client, businessId, { name: "Uncategorized" });
      await query(
        "UPDATE products SET category = $1, category_id = $2, updated_at = NOW() WHERE category_id = $3 AND (business_id = $4 OR business_id IS NULL)",
        [fallback.name, fallback.id, id, businessId],
        client
      );
    }
    await query("DELETE FROM categories WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)", [id, businessId], client);
    await auditLog("category:delete", "category", id, { name: existing.name, mode }, userId, client);
    return existing;
  });
}

export async function reorderCategories(input: Array<{ id: string; sort_order: number }>, userId?: string) {
  const businessId = await getBusinessIdForUser(userId);
  await transaction(async (client) => {
    for (const item of input) {
      await query(
        "UPDATE categories SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND (business_id = $3 OR business_id IS NULL)",
        [item.sort_order, item.id, businessId],
        client
      );
    }
    await auditLog("category:reorder", "category", null, { count: input.length }, userId, client);
  });
  return listCategories(undefined, true, businessId);
}

export async function listProducts(search?: string, includeInactive = false, businessId?: string | null): Promise<Product[]> {
  const params: unknown[] = [];
  const clauses = includeInactive ? ["TRUE"] : ["p.active = TRUE"];
  if (businessId) clauses.push(businessScopedClause(params, businessId, "p"));
  if (search?.trim()) {
    const like = addParam(params, `%${search.trim()}%`);
    clauses.push(`(p.name ILIKE ${like} OR p.sku ILIKE ${like} OR p.barcode ILIKE ${like} OR p.category ILIKE ${like})`);
  }

  const rows = await query<any>(
    `SELECT p.*
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id OR (c.business_id = p.business_id AND LOWER(c.name) = LOWER(p.category))
     WHERE ${clauses.join(" AND ")}
     ORDER BY COALESCE(c.sort_order, 9999) ASC, p.category ASC, p.name ASC`,
    params
  );
  return rows.rows.map(rowToProduct);
}

export async function getProduct(id: string, businessId?: string | null) {
  const params: unknown[] = [id];
  const scope = businessId ? ` AND ${businessScopedClause(params, businessId)}` : "";
  const row = await query<any>(`SELECT * FROM products WHERE id = $1${scope}`, params);
  return row.rows[0] ? rowToProduct(row.rows[0]) : null;
}

export async function createProduct(input: Omit<Product, "id" | "active"> & { active?: boolean }, userId?: string) {
  const id = createId("prd");
  const businessId = await getBusinessIdForUser(userId);
  const category = await ensureCategory(undefined, businessId, { name: input.category, categoryId: input.category_id });
  await query(
    `INSERT INTO products (
      id, business_id, name, sku, barcode, category, category_id, description, cost_price, selling_price,
      discount_price, stock_quantity, low_stock_alert, image_url, supplier_name, supplier_phone, variations, add_ons, active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb, $19)`,
    [
      id,
      businessId,
      input.name,
      input.sku,
      input.barcode ?? null,
      category.name,
      category.id,
      input.description ?? null,
      input.cost_price,
      input.selling_price,
      input.discount_price ?? null,
      input.stock_quantity,
      input.low_stock_alert,
      input.image_url ?? null,
      input.supplier_name ?? null,
      input.supplier_phone ?? null,
      JSON.stringify(input.variations || []),
      JSON.stringify(input.add_ons || []),
      input.active ?? true
    ]
  );
  await auditLog("product:create", "product", id, input, userId);
  return getProduct(id, businessId);
}

export async function deleteProduct(id: string, userId?: string) {
  return transaction(async (client) => {
    const businessId = await getBusinessIdForUser(userId, client);
    const existing = await query<any>(
      "SELECT * FROM products WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)",
      [id, businessId],
      client
    );
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
  const businessId = await getBusinessIdForUser(userId);
  const existing = await getProduct(id, businessId);
  if (!existing) return null;
  const next = { ...existing, ...input };
  const category = await ensureCategory(undefined, businessId, { name: next.category, categoryId: next.category_id });
  await query(
    `UPDATE products SET
      name = $1, sku = $2, barcode = $3, category = $4, category_id = $5, description = $6,
      cost_price = $7, selling_price = $8, discount_price = $9, stock_quantity = $10,
      low_stock_alert = $11, image_url = $12, supplier_name = $13, supplier_phone = $14,
      variations = $15::jsonb, add_ons = $16::jsonb, active = $17, updated_at = NOW()
     WHERE id = $18`,
    [
      next.name,
      next.sku,
      next.barcode ?? null,
      category.name,
      category.id,
      next.description ?? null,
      next.cost_price,
      next.selling_price,
      next.discount_price ?? null,
      next.stock_quantity,
      next.low_stock_alert,
      next.image_url ?? null,
      next.supplier_name ?? null,
      next.supplier_phone ?? null,
      JSON.stringify(next.variations || []),
      JSON.stringify(next.add_ons || []),
      next.active,
      id
    ]
  );
  await auditLog("product:update", "product", id, input, userId);
  return getProduct(id, businessId);
}

export async function adjustStock(productId: string, delta: number, reason: string, userId?: string) {
  return transaction(async (client) => {
    const businessId = await getBusinessIdForUser(userId, client);
    const updated = await query(
      "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2 AND (business_id = $3 OR business_id IS NULL)",
      [delta, productId, businessId],
      client
    );
    if (!updated.rowCount) return null;
    await query(
      "INSERT INTO stock_movements (id, business_id, product_id, type, quantity_delta, reason, user_id) VALUES ($1, $2, $3, 'manual_adjustment', $4, $5, $6)",
      [createId("mov"), businessId, productId, delta, reason, userId ?? null],
      client
    );
    await auditLog("stock:adjust", "product", productId, { delta, reason }, userId, client);
    const row = await query<any>("SELECT * FROM products WHERE id = $1", [productId], client);
    return row.rows[0] ? rowToProduct(row.rows[0]) : null;
  });
}

export async function listCustomers(search?: string, businessId?: string | null): Promise<Customer[]> {
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (businessId) clauses.push(businessScopedClause(params, businessId));
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

export async function getCustomer(id: string, businessId?: string | null) {
  const params: unknown[] = [id];
  const scope = businessId ? ` AND ${businessScopedClause(params, businessId)}` : "";
  const row = await query<any>(`SELECT * FROM customers WHERE id = $1${scope}`, params);
  return row.rows[0] ? rowToCustomer(row.rows[0]) : null;
}

export async function getCustomerProfile(id: string, businessId?: string | null) {
  const customer = await getCustomer(id, businessId);
  if (!customer) return null;
  const [orders, favoriteRows] = await Promise.all([
    listOrders({ customerId: id, businessId, limit: 20 }),
    query<{ name: string; quantity: string }>(
      `SELECT product_name AS name, SUM(quantity) AS quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.customer_id = $1
       ${businessId ? "AND (o.business_id = $2 OR o.business_id IS NULL)" : ""}
       GROUP BY product_name
       ORDER BY quantity DESC
       LIMIT 5`,
      businessId ? [id, businessId] : [id]
    )
  ]);
  const favoriteProducts = favoriteRows.rows.map((row) => ({
    name: row.name,
    quantity: Number(row.quantity)
  }));
  return { customer, orders, favoriteProducts };
}

async function upsertCustomer(client: DbClient, input?: CustomerInput | null, businessId?: string | null) {
  if (!input || (!input.name && !input.phone && !input.email)) return null;

  const normalized = cleanWhatsAppNumber(input.phone);
  const lookup = normalized
    ? await query<any>(
        "SELECT * FROM customers WHERE phone_normalized = $1 AND (business_id = $2 OR business_id IS NULL) LIMIT 1",
        [normalized, businessId],
        client
      )
    : input.email
      ? await query<any>(
          "SELECT * FROM customers WHERE LOWER(email) = LOWER($1) AND (business_id = $2 OR business_id IS NULL) LIMIT 1",
          [input.email, businessId],
          client
        )
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
        postal_code = COALESCE(NULLIF($9, ''), postal_code),
        delivery_notes = COALESCE(NULLIF($10, ''), delivery_notes),
        waze_link = COALESCE(NULLIF($11, ''), waze_link),
        gps_latitude = COALESCE($12::numeric, gps_latitude),
        gps_longitude = COALESCE($13::numeric, gps_longitude),
        preferred_payment_method = COALESCE(NULLIF($14, ''), preferred_payment_method),
        notes = COALESCE(NULLIF($15, ''), notes),
        birthday = COALESCE(NULLIF($16, ''), birthday),
        notification_whatsapp = COALESCE($17::boolean, notification_whatsapp),
        notification_sms = COALESCE($18::boolean, notification_sms),
        notification_email = COALESCE($19::boolean, notification_email),
        marketing_consent = COALESCE($20::boolean, marketing_consent),
        updated_at = NOW()
       WHERE id = $21`,
      [
        input.name ?? null,
        input.phone ?? null,
        normalized || null,
        input.email ?? null,
        input.street_address ?? null,
        input.city ?? null,
        input.region ?? null,
        country,
        input.postal_code ?? null,
        input.delivery_notes ?? null,
        input.waze_link ?? null,
        input.gps_latitude ?? null,
        input.gps_longitude ?? null,
        input.preferred_payment_method ?? null,
        input.notes ?? null,
        input.birthday ?? null,
        input.notification_whatsapp === undefined ? null : Boolean(input.notification_whatsapp),
        input.notification_sms === undefined ? null : Boolean(input.notification_sms),
        input.notification_email === undefined ? null : Boolean(input.notification_email),
        input.marketing_consent === undefined ? null : Boolean(input.marketing_consent),
        customerId
      ],
      client
    );
  } else {
    await query(
      `INSERT INTO customers (
        id, business_id, name, phone, phone_normalized, email, street_address, city, region,
        country, postal_code, delivery_notes, waze_link, gps_latitude, gps_longitude,
        preferred_payment_method, notes, birthday, notification_whatsapp, notification_sms,
        notification_email, marketing_consent, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb)`,
      [
        customerId,
        businessId,
        input.name || "Customer",
        input.phone ?? null,
        normalized || null,
        input.email ?? null,
        input.street_address ?? null,
        input.city ?? null,
        input.region ?? null,
        country,
        input.postal_code ?? null,
        input.delivery_notes ?? null,
        input.waze_link ?? null,
        input.gps_latitude ?? null,
        input.gps_longitude ?? null,
        input.preferred_payment_method ?? null,
        input.notes ?? null,
        input.birthday ?? null,
        input.notification_whatsapp ?? true,
        input.notification_sms ?? false,
        input.notification_email ?? Boolean(input.email),
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
  return transaction(async (client) => {
    const businessId = await getBusinessIdForUser(userId, client);
    const customer = await upsertCustomer(client, input, businessId);
    if (customer) await auditLog("customer:create_or_update", "customer", customer.id, input, userId, client);
    return customer;
  });
}

export async function updateCustomer(id: string, input: CustomerInput, userId?: string) {
  const businessId = await getBusinessIdForUser(userId);
  const existing = await getCustomer(id, businessId);
  if (!existing) return null;
  const normalized = cleanWhatsAppNumber(input.phone || existing.phone);
  await query(
    `UPDATE customers SET
      name = $1, phone = $2, phone_normalized = $3, email = $4, street_address = $5,
      city = $6, region = $7, country = $8, postal_code = $9, delivery_notes = $10,
      waze_link = $11, gps_latitude = $12, gps_longitude = $13,
      preferred_payment_method = $14, notes = $15, birthday = $16,
      notification_whatsapp = $17, notification_sms = $18, notification_email = $19,
      marketing_consent = $20,
      updated_at = NOW()
     WHERE id = $21 AND (business_id = $22 OR business_id IS NULL)`,
    [
      input.name ?? existing.name,
      input.phone ?? existing.phone,
      normalized || existing.phone_normalized,
      input.email ?? existing.email,
      input.street_address ?? existing.street_address,
      input.city ?? existing.city,
      input.region ?? existing.region,
      input.country ?? existing.country,
      input.postal_code ?? existing.postal_code ?? null,
      input.delivery_notes ?? existing.delivery_notes,
      input.waze_link ?? existing.waze_link ?? null,
      input.gps_latitude ?? existing.gps_latitude ?? null,
      input.gps_longitude ?? existing.gps_longitude ?? null,
      input.preferred_payment_method ?? existing.preferred_payment_method,
      input.notes ?? existing.notes,
      input.birthday ?? existing.birthday,
      input.notification_whatsapp === undefined ? existing.notification_whatsapp : Boolean(input.notification_whatsapp),
      input.notification_sms === undefined ? existing.notification_sms : Boolean(input.notification_sms),
      input.notification_email === undefined ? existing.notification_email : Boolean(input.notification_email),
      input.marketing_consent === undefined ? existing.marketing_consent : Boolean(input.marketing_consent),
      id,
      businessId
    ]
  );
  await auditLog("customer:update", "customer", id, input, userId);
  return getCustomer(id, businessId);
}

export async function deleteCustomer(id: string, userId?: string) {
  return transaction(async (client) => {
    const businessId = await getBusinessIdForUser(userId, client);
    const existing = await query<any>(
      "SELECT * FROM customers WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)",
      [id, businessId],
      client
    );
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

function initialOrderStatus(payload: CheckoutPayload): Order["status"] {
  if (payload.status) return payload.status;
  return payload.order_type === "in_store" ? "completed" : "new";
}

async function applyCompletedOrderEffects(client: DbClient, order: Order, userId?: string | null) {
  for (const item of order.items) {
    if (!item.product_id) continue;
    await query(
      "UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2 AND (business_id = $3 OR business_id IS NULL)",
      [item.quantity, item.product_id, order.business_id ?? null],
      client
    );
    await query(
      "INSERT INTO stock_movements (id, business_id, product_id, type, quantity_delta, reason, reference_id, user_id) VALUES ($1, $2, $3, 'sale', $4, $5, $6, $7)",
      [createId("mov"), order.business_id ?? null, item.product_id, -item.quantity, `Completed order #${order.order_number}`, order.id, userId ?? null],
      client
    );
  }

  if (order.customer_id) {
    const row = await query<any>("SELECT tags, orders_count FROM customers WHERE id = $1", [order.customer_id], client);
    const existingTags = parseJson<string[]>(row.rows[0]?.tags, []);
    const existingOrderCount = Number(row.rows[0]?.orders_count || 0);
    const nextTags = new Set(existingTags);
    if (existingOrderCount + 1 >= 3) nextTags.add("Frequent Buyer");
    if (order.total >= 500) nextTags.add("VIP");
    if (order.payment_status !== "paid") nextTags.add("Owes Balance");
    await query(
      `UPDATE customers SET
        total_spent = total_spent + $1,
        orders_count = orders_count + 1,
        last_order_at = NOW(),
        loyalty_points = loyalty_points + $2,
        tags = $3::jsonb,
        updated_at = NOW()
       WHERE id = $4`,
      [order.total, order.loyalty_points_earned, JSON.stringify(Array.from(nextTags)), order.customer_id],
      client
    );

    if (order.loyalty_points_earned > 0) {
      await query(
        "INSERT INTO loyalty_transactions (id, customer_id, order_id, points_delta, type, notes) VALUES ($1, $2, $3, $4, 'earned', $5)",
        [createId("loy"), order.customer_id, order.id, order.loyalty_points_earned, `Earned on order #${order.order_number}`],
        client
      );
    }
  }

  await query(
    "UPDATE orders SET inventory_applied = TRUE, completed_by = COALESCE($1, completed_by), completed_at = COALESCE(completed_at, NOW()), updated_at = NOW() WHERE id = $2",
    [userId ?? null, order.id],
    client
  );
}

async function reverseCompletedOrderEffects(client: DbClient, order: Order, userId?: string | null) {
  for (const item of order.items) {
    if (!item.product_id) continue;
    await query(
      "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2 AND (business_id = $3 OR business_id IS NULL)",
      [item.quantity, item.product_id, order.business_id ?? null],
      client
    );
    await query(
      "INSERT INTO stock_movements (id, business_id, product_id, type, quantity_delta, reason, reference_id, user_id) VALUES ($1, $2, $3, 'return', $4, $5, $6, $7)",
      [createId("mov"), order.business_id ?? null, item.product_id, item.quantity, `Cancelled order #${order.order_number}`, order.id, userId ?? null],
      client
    );
  }

  if (order.customer_id) {
    await query(
      `UPDATE customers SET
        total_spent = GREATEST(0, total_spent - $1),
        orders_count = GREATEST(0, orders_count - 1),
        loyalty_points = GREATEST(0, loyalty_points - $2),
        updated_at = NOW()
       WHERE id = $3`,
      [order.total, order.loyalty_points_earned, order.customer_id],
      client
    );
    if (order.loyalty_points_earned > 0) {
      await query(
        "INSERT INTO loyalty_transactions (id, customer_id, order_id, points_delta, type, notes) VALUES ($1, $2, $3, $4, 'manual_adjustment', $5)",
        [
          createId("loy"),
          order.customer_id,
          order.id,
          -order.loyalty_points_earned,
          `Reversed cancelled order #${order.order_number}`
        ],
        client
      );
    }
  }

  await query(
    "UPDATE orders SET inventory_applied = FALSE, updated_at = NOW() WHERE id = $1",
    [order.id],
    client
  );
}

async function createOrUpdateReceiptRecord(
  client: DbClient,
  order: Order,
  receiptNumber: string,
  completedBy?: string | null
) {
  const values = [
    order.business_id ?? null,
    order.id,
    receiptNumber,
    order.order_number,
    order.customer_id ?? null,
    order.customer_snapshot.name || "Walk-in customer",
    order.customer_snapshot.phone || null,
    JSON.stringify(order.items),
    order.subtotal,
    order.discount_total,
    order.tax_total,
    order.delivery_fee,
    order.total,
    order.payment_method,
    order.payment_status,
    completedBy ?? order.completed_by ?? null,
    order.completed_at ?? null
  ];
  const updated = await query(
    `UPDATE receipts SET
      business_id = $1,
      receipt_number = $3,
      order_number = $4,
      customer_id = $5,
      customer_name = $6,
      customer_phone = $7,
      items = $8::jsonb,
      subtotal = $9,
      discount_total = $10,
      tax_total = $11,
      delivery_fee = $12,
      total = $13,
      payment_method = $14,
      payment_status = $15,
      completed_by = $16,
      completed_at = COALESCE($17::timestamptz, completed_at, NOW()),
      updated_at = NOW()
     WHERE order_id = $2
     RETURNING id`,
    values,
    client
  );
  if (updated.rowCount) return;
  await query(
    `INSERT INTO receipts (
      id, business_id, order_id, receipt_number, order_number, customer_id, customer_name, customer_phone,
      items, subtotal, discount_total, tax_total, delivery_fee, total, payment_method,
      payment_status, completed_by, completed_at, channel, updated_at
    )
    SELECT $18, $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16, COALESCE($17::timestamptz, NOW()), 'print', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM receipts WHERE order_id = $2)`,
    [
      ...values,
      createId("rcp")
    ],
    client
  );
}

async function nextReceiptNumber(client: DbClient) {
  const receiptFloor = await getMaxNumericValue(client, "receipts", "receipt_number", 4024);
  return `R-${await getCounter(client, "receipt_counter", 4024, receiptFloor)}`;
}

const CUSTOMER_STATUS_TEMPLATES: Record<Order["status"], string> = {
  draft: "Hi {{customer_name}}, your order #{{order_number}} is saved as a draft.",
  new: "Hi {{customer_name}}, we received your order #{{order_number}}. We'll update you shortly.",
  accepted: "Good news {{customer_name}}, your order #{{order_number}} has been accepted.",
  preparing: "Your order #{{order_number}} is now being prepared.",
  ready: "Your order #{{order_number}} is ready.",
  out_for_delivery: "Your order #{{order_number}} is out for delivery. Track or contact us here: {{tracking_link}}",
  completed: "Thank you {{customer_name}}! Your order #{{order_number}} is completed. We appreciate your business.",
  cancelled: "Your order #{{order_number}} was cancelled. Please contact us for more details."
};

function orderStatusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function orderTrackingLink(order: Order) {
  const base = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const query = new URLSearchParams({
    order: order.order_number,
    phone: order.customer_snapshot.phone || ""
  });
  return `${base}/track?${query.toString()}`;
}

function renderCustomerStatusMessage(order: Order, status: Order["status"], settings: Settings) {
  const template = CUSTOMER_STATUS_TEMPLATES[status] || CUSTOMER_STATUS_TEMPLATES.new;
  return template
    .replaceAll("{{customer_name}}", order.customer_snapshot.name || "Customer")
    .replaceAll("{{order_number}}", order.order_number)
    .replaceAll("{{business_name}}", settings.business_name)
    .replaceAll("{{tracking_link}}", orderTrackingLink(order));
}

async function canUseWhatsAppForBusiness(businessId?: string | null) {
  const planId = await getSubscriptionPlanId(businessId);
  if (!canUseFeature(planId, "whatsappMessaging").allowed) return false;
  const usage = await getPlanUsage(businessId);
  return isWithinLimit(planId, "whatsappMessages", usage.whatsappMessages, 1).allowed;
}

async function recordOrderStatusHistory(
  client: DbClient,
  orderId: string,
  status: string,
  note?: string | null,
  userId?: string | null
) {
  await query(
    "INSERT INTO order_status_history (id, order_id, status, note, changed_by) VALUES ($1, $2, $3, $4, $5)",
    [createId("osh"), orderId, status, note ?? null, userId ?? null],
    client
  ).catch(() => undefined);
}

async function createCustomerStatusNotifications(
  client: DbClient,
  order: Order,
  status: Order["status"],
  settings: Settings
) {
  const message = renderCustomerStatusMessage(order, status, settings);
  const whatsappAllowed = await canUseWhatsAppForBusiness(order.business_id || settings.active_business_id);
  const wantsWhatsApp = order.customer_snapshot.notification_whatsapp !== false;
  const wantsSms = Boolean(order.customer_snapshot.notification_sms);
  const wantsEmail = Boolean(order.customer_snapshot.notification_email);
  const channels: Array<Pick<CustomerNotification, "channel" | "destination" | "provider" | "delivery_status" | "error_message">> = [
    {
      channel: "in_app",
      destination: orderTrackingLink(order),
      provider: "tracking-page",
      delivery_status: "sent",
      error_message: null
    }
  ];
  if (settings.notification_whatsapp_enabled && wantsWhatsApp) {
    channels.push({
      channel: "whatsapp",
      destination: order.customer_snapshot.phone || null,
      provider: settings.whatsapp_provider || "placeholder",
      delivery_status: settings.whatsapp_enabled && whatsappAllowed ? "queued" : "skipped",
      error_message: settings.whatsapp_enabled
        ? whatsappAllowed ? null : "Upgrade plan to enable WhatsApp messaging."
        : "WhatsApp provider is not configured."
    });
  }
  if (settings.notification_sms_enabled && wantsSms) {
    channels.push({
      channel: "sms",
      destination: order.customer_snapshot.phone || null,
      provider: "placeholder",
      delivery_status: "skipped",
      error_message: "SMS provider is not configured."
    });
  }
  if (settings.notification_email_enabled && wantsEmail) {
    channels.push({
      channel: "email",
      destination: order.customer_snapshot.email || null,
      provider: "placeholder",
      delivery_status: "skipped",
      error_message: "Email provider is not configured."
    });
  }

  for (const channel of channels) {
    await query(
      `INSERT INTO customer_notifications (
        id, business_id, order_id, customer_id, channel, status, message,
        destination, provider, delivery_status, error_message, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CASE WHEN $10 = 'sent' THEN NOW() ELSE NULL END)`,
      [
        createId("ntf"),
        order.business_id ?? null,
        order.id,
        order.customer_id ?? null,
        channel.channel,
        status,
        message,
        channel.destination ?? null,
        channel.provider ?? null,
        channel.delivery_status,
        channel.error_message ?? null
      ],
      client
    ).catch(() => undefined);
  }
}

async function notifyOwnerOfNewOrder(order: Order, settings: Settings) {
  if (!settings.whatsapp_enabled || !settings.whatsapp_owner_alerts_enabled) return;
  if (!(await canUseWhatsAppForBusiness(order.business_id || settings.active_business_id))) return;
  const to = settings.whatsapp_business_number;
  const result = await sendWhatsAppMessage(to, buildOrderWhatsAppMessage(order, settings), {
    defaultCountryCode: settings.whatsapp_country_code,
    businessId: order.business_id || settings.active_business_id,
    orderId: order.id,
    customerId: order.customer_id,
    status: "owner_new_order"
  });
  if (!result.ok && !result.skipped) {
    console.warn("Owner WhatsApp alert was not sent", { orderId: order.id, reason: result.message });
  }
}

async function notifyCustomerReceipt(order: Order, settings: Settings) {
  if (!settings.whatsapp_enabled || !(settings.whatsapp_customer_receipts_enabled || settings.receipt_whatsapp_enabled)) return;
  if (!(await canUseWhatsAppForBusiness(order.business_id || settings.active_business_id))) return;
  const result = await sendWhatsAppMessage(order.customer_snapshot.phone, buildCustomerReceiptWhatsAppMessage(order, settings), {
    defaultCountryCode: settings.whatsapp_country_code,
    businessId: order.business_id || settings.active_business_id,
    orderId: order.id,
    customerId: order.customer_id,
    status: "customer_receipt"
  });
  if (result.ok) {
    await query("UPDATE receipts SET whatsapp_sent_at = NOW(), updated_at = NOW() WHERE order_id = $1", [order.id]);
  } else if (!result.skipped) {
    console.warn("Customer receipt WhatsApp was not sent", { orderId: order.id, reason: result.message });
  }
}

async function notifyCustomerOrderConfirmation(order: Order, settings: Settings) {
  if (!settings.whatsapp_enabled || !settings.whatsapp_customer_confirmations_enabled) return;
  if (!(await canUseWhatsAppForBusiness(order.business_id || settings.active_business_id))) return;
  const result = await sendWhatsAppMessage(order.customer_snapshot.phone, buildCustomerConfirmationMessage(order, settings), {
    defaultCountryCode: settings.whatsapp_country_code,
    businessId: order.business_id || settings.active_business_id,
    orderId: order.id,
    customerId: order.customer_id,
    status: "customer_confirmation"
  });
  if (!result.ok && !result.skipped) {
    console.warn("Customer order confirmation WhatsApp was not sent", { orderId: order.id, reason: result.message });
  }
}

async function notifyCustomerDriverAssigned(order: Order, settings: Settings) {
  if (!settings.whatsapp_enabled || !settings.whatsapp_driver_assignment_enabled) return;
  if (!(await canUseWhatsAppForBusiness(order.business_id || settings.active_business_id))) return;
  const result = await sendWhatsAppMessage(order.customer_snapshot.phone, buildCustomerDriverAssignedWhatsAppMessage(order, settings), {
    defaultCountryCode: settings.whatsapp_country_code,
    businessId: order.business_id || settings.active_business_id,
    orderId: order.id,
    customerId: order.customer_id,
    status: "driver_assigned_customer"
  });
  if (!result.ok && !result.skipped) {
    console.warn("Customer driver-assigned WhatsApp was not sent", { orderId: order.id, reason: result.message });
  }
}

async function notifyDriverOfAssignment(order: Order, settings: Settings) {
  if (!settings.whatsapp_enabled || !settings.whatsapp_driver_alerts_enabled || !order.assigned_driver_phone) return;
  if (!(await canUseWhatsAppForBusiness(order.business_id || settings.active_business_id))) return;
  const result = await sendWhatsAppMessage(order.assigned_driver_phone, buildDriverAssignmentWhatsAppMessage(order, settings), {
    defaultCountryCode: settings.whatsapp_country_code,
    businessId: order.business_id || settings.active_business_id,
    orderId: order.id,
    customerId: order.customer_id,
    status: "driver_assigned_driver"
  });
  if (!result.ok && !result.skipped) {
    console.warn("Driver assignment WhatsApp was not sent", { orderId: order.id, reason: result.message });
  }
}

async function notifyCustomerOutForDelivery(order: Order, settings: Settings) {
  if (!settings.whatsapp_enabled || !settings.whatsapp_out_for_delivery_enabled) return;
  if (!(await canUseWhatsAppForBusiness(order.business_id || settings.active_business_id))) return;
  const result = await sendWhatsAppMessage(order.customer_snapshot.phone, buildCustomerOutForDeliveryWhatsAppMessage(order, settings), {
    defaultCountryCode: settings.whatsapp_country_code,
    businessId: order.business_id || settings.active_business_id,
    orderId: order.id,
    customerId: order.customer_id,
    status: "out_for_delivery"
  });
  if (!result.ok && !result.skipped) {
    console.warn("Customer out-for-delivery WhatsApp was not sent", { orderId: order.id, reason: result.message });
  }
}

async function updateCustomerWhatsAppLink(order: Order, message: string, settings: Settings) {
  if (!settings.whatsapp_enabled) return order;
  if (!(await canUseWhatsAppForBusiness(order.business_id || settings.active_business_id))) return order;
  await query(
    "UPDATE orders SET whatsapp_customer_link = $1, updated_at = NOW() WHERE id = $2",
    [buildWhatsAppLink(order.customer_snapshot.phone, message, settings.whatsapp_country_code), order.id]
  );
  return (await readOrderById(undefined, order.id, order.business_id)) || order;
}

export async function createOrder(payload: CheckoutPayload, userId?: string) {
  const businessId = await resolveBusinessId({ businessId: payload.business_id, userId });
  const settings = await getBusinessSettings(businessId);

  const order = await transaction(async (client) => {
    const orderId = createId("ord");
    const orderFloor = await getMaxNumericValue(client, "orders", "order_number", 1024);
    const orderNumber = String(await getCounter(client, "order_counter", 1024, orderFloor));
    const receiptNumber = await nextReceiptNumber(client);
    const orderStatus = initialOrderStatus(payload);
    const shouldCompleteNow = orderStatus === "completed";
    const deliveryInput = payload.delivery || {};
    const customerInput: CustomerInput = {
      ...payload.customer,
      street_address: deliveryInput.street_address || payload.customer?.street_address,
      city: deliveryInput.city || payload.customer?.city,
      region: deliveryInput.region || payload.customer?.region,
      country: deliveryInput.country || payload.customer?.country || "Trinidad and Tobago",
      delivery_notes: deliveryInput.notes || payload.customer?.delivery_notes,
      postal_code: deliveryInput.postal_code || payload.customer?.postal_code,
      gps_latitude: deliveryInput.latitude ?? payload.customer?.gps_latitude,
      gps_longitude: deliveryInput.longitude ?? payload.customer?.gps_longitude,
      preferred_payment_method: payload.payment_method
    };

    const customer = await upsertCustomer(client, customerInput, businessId);
    const customerSnapshot: CustomerInput = customer
      ? {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          street_address: customer.street_address,
          city: customer.city,
          region: customer.region,
          country: customer.country,
          postal_code: customer.postal_code,
          delivery_notes: customer.delivery_notes,
          waze_link: customer.waze_link,
          gps_latitude: customer.gps_latitude,
          gps_longitude: customer.gps_longitude,
          preferred_payment_method: customer.preferred_payment_method,
          notes: customer.notes,
          birthday: customer.birthday,
          notification_whatsapp: customer.notification_whatsapp,
          notification_sms: customer.notification_sms,
          notification_email: customer.notification_email,
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
          postal_code: customerInput.postal_code,
          delivery_notes: customerInput.delivery_notes,
          waze_link: customerInput.waze_link,
          gps_latitude: customerInput.gps_latitude,
          gps_longitude: customerInput.gps_longitude,
          preferred_payment_method: payload.payment_method,
          notification_whatsapp: customerInput.notification_whatsapp ?? true,
          notification_sms: customerInput.notification_sms ?? false,
          notification_email: customerInput.notification_email ?? Boolean(customerInput.email),
          marketing_consent: Boolean(customerInput.marketing_consent)
        };

    const lineItems = [];
    for (const item of payload.items) {
      const productRow = await query<any>(
        "SELECT * FROM products WHERE id = $1 AND active = TRUE AND (business_id = $2 OR business_id IS NULL)",
        [item.product_id, businessId],
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
      shouldCompleteNow && settings.loyalty_enabled && customer
        ? Math.floor(total * Number(settings.loyalty_points_per_ttd || 0))
        : 0;
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
      customerSnapshot.postal_code,
      customerSnapshot.country
    ]);
    const wazeLink = buildWazeLink({
      latitude: deliveryInput.latitude,
      longitude: deliveryInput.longitude,
      locationLink: deliveryInput.location_link,
      address: fullAddress
    });
    const googleMapsLink = buildGoogleMapsLink({
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
        id, business_id, order_number, customer_id, customer_snapshot, order_type, status, payment_method,
        payment_status, delivery_status, assigned_driver_id, subtotal, discount_total,
        tax_total, service_fee, delivery_fee, total, loyalty_points_earned,
        notes, delivery_latitude, delivery_longitude, delivery_postal_code, delivery_location_link, waze_link,
        google_maps_link, payment_link, created_by, completed_by, completed_at, inventory_applied
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
      [
        orderId,
        businessId,
        orderNumber,
        customer?.id ?? null,
        JSON.stringify(customerSnapshot),
        payload.order_type,
        orderStatus,
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
        deliveryInput.postal_code ?? customerSnapshot.postal_code ?? null,
        deliveryInput.location_link ?? null,
        wazeLink,
        googleMapsLink,
        paymentLink,
        payload.created_by || userId || null,
        shouldCompleteNow ? payload.created_by || userId || null : null,
        shouldCompleteNow ? new Date().toISOString() : null,
        shouldCompleteNow
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

      if (shouldCompleteNow) {
        await query(
          "UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2 AND (business_id = $3 OR business_id IS NULL)",
          [item.quantity, item.product.id, businessId],
          client
        );
        await query(
          "INSERT INTO stock_movements (id, business_id, product_id, type, quantity_delta, reason, reference_id, user_id) VALUES ($1, $2, $3, 'sale', $4, $5, $6, $7)",
          [createId("mov"), businessId, item.product.id, -item.quantity, `Sale order #${orderNumber}`, orderId, userId ?? null],
          client
        );
      }
    }

    if (customer && shouldCompleteNow) {
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

    let order = await readOrderById(client, orderId, businessId);
    if (!order) throw new Error("Order not found");
    if (shouldCompleteNow) {
      await createOrUpdateReceiptRecord(client, order, receiptNumber, payload.created_by || userId || null);
      order = await readOrderById(client, orderId, businessId);
      if (!order) throw new Error("Order not found");
    }
    if (settings.whatsapp_enabled) {
      const businessMessage = buildOrderWhatsAppMessage(order, settings);
      const customerMessage = buildCustomerConfirmationMessage(order, settings);
      const businessLink = buildWhatsAppLink(settings.whatsapp_business_number, businessMessage, settings.whatsapp_country_code);
      const customerLink = buildWhatsAppLink(order.customer_snapshot.phone, customerMessage, settings.whatsapp_country_code);
      await query(
        "UPDATE orders SET whatsapp_business_link = $1, whatsapp_customer_link = $2, updated_at = NOW() WHERE id = $3",
        [businessLink, customerLink, orderId],
        client
      );
      order = await readOrderById(client, orderId, businessId);
      if (!order) throw new Error("Order not found");
    }

    await recordOrderStatusHistory(client, orderId, orderStatus, "Order created", payload.created_by || userId || null);
    await createCustomerStatusNotifications(client, order, orderStatus, settings);
    await auditLog("order:create", "order", orderId, { order_number: orderNumber, total }, userId, client);
    return order;
  });
  await notifyOwnerOfNewOrder(order, settings);
  await notifyCustomerOrderConfirmation(order, settings);
  if (order.assigned_driver_id && order.delivery_status !== "not_required") {
    await notifyCustomerDriverAssigned(order, settings);
    await notifyDriverOfAssignment(order, settings);
  }
  if (order.delivery_status === "out_for_delivery") {
    await notifyCustomerOutForDelivery(order, settings);
  }
  if (order.status === "completed") await notifyCustomerReceipt(order, settings);
  return order;
}

async function readOrderById(client: DbClient | undefined, id: string, businessId?: string | null) {
  const params: unknown[] = [id];
  const scope = businessId ? ` AND ${businessScopedClause(params, businessId, "o")}` : "";
  const row = await query<any>(
    `SELECT o.*, u.name AS assigned_driver_name, u.phone AS assigned_driver_phone, completed_user.name AS completed_by_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.assigned_driver_id
     LEFT JOIN users completed_user ON completed_user.id = o.completed_by
     WHERE o.id = $1${scope}`,
    params,
    client
  );
  if (!row.rows[0]) return null;
  const orders = await hydrateOrders([row.rows[0]], client);
  return orders[0] || null;
}

export async function getOrder(id: string, businessId?: string | null) {
  return readOrderById(undefined, id, businessId);
}

export async function getPublicOrderTracking(orderNumber: string, phone: string) {
  const normalizedPhone = cleanWhatsAppNumber(phone);
  if (!orderNumber?.trim() || !normalizedPhone) return null;
  const row = await query<any>(
    `SELECT o.*, u.name AS assigned_driver_name, u.phone AS assigned_driver_phone, completed_user.name AS completed_by_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.assigned_driver_id
     LEFT JOIN users completed_user ON completed_user.id = o.completed_by
     WHERE o.order_number = $1
       AND (
         regexp_replace(COALESCE(o.customer_snapshot->>'phone', ''), '\\D', '', 'g') = $2
         OR RIGHT(regexp_replace(COALESCE(o.customer_snapshot->>'phone', ''), '\\D', '', 'g'), 7) = RIGHT($2, 7)
       )
     LIMIT 1`,
    [orderNumber.trim(), normalizedPhone]
  );
  if (!row.rows[0]) return null;
  const order = (await hydrateOrders([row.rows[0]]))[0] || null;
  if (!order) return null;
  const settings = await getBusinessSettings(order.business_id);
  return {
    order,
    business: {
      name: settings.business_name,
      phone: settings.business_phone,
      email: settings.business_email,
      whatsapp: settings.whatsapp_business_number,
      logo_url: settings.logo_url,
      default_prep_time_minutes: settings.default_prep_time_minutes
    }
  };
}

export async function listOrders(options: {
  query?: string;
  type?: string;
  status?: string;
  customerId?: string;
  driverId?: string;
  assignedOnly?: boolean;
  businessId?: string | null;
  limit?: number;
} = {}) {
  const params: unknown[] = [];
  const clauses: string[] = ["TRUE"];
  if (options.businessId) clauses.push(businessScopedClause(params, options.businessId, "o"));

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
    `SELECT o.*, c.name AS customer_name, u.name AS assigned_driver_name, u.phone AS assigned_driver_phone, completed_user.name AS completed_by_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN users u ON u.id = o.assigned_driver_id
     LEFT JOIN users completed_user ON completed_user.id = o.completed_by
     WHERE ${clauses.join(" AND ")}
     ORDER BY o.created_at DESC
     LIMIT ${limitPlaceholder}`,
    params
  );
  return hydrateOrders(rows.rows);
}

export async function updateDeliveryStatus(orderId: string, status: Order["delivery_status"], userId?: string) {
  const businessId = await getBusinessIdForUser(userId);
  const settings = await getBusinessSettings(businessId);
  let shouldNotifyOutForDelivery = false;
  let updatedOrder: Order | null = await transaction(async (client) => {
    const order = await readOrderById(client, orderId, businessId);
    if (!order) return null;
    shouldNotifyOutForDelivery = order.delivery_status !== "out_for_delivery" && status === "out_for_delivery";
    const nextOrderStatus = status === "out_for_delivery" ? "out_for_delivery" : order.status;
    await query(
      "UPDATE orders SET delivery_status = $1, status = $2, updated_at = NOW() WHERE id = $3",
      [status, nextOrderStatus, orderId],
      client
    );
    await query(
      "INSERT INTO delivery_events (id, order_id, driver_id, status, notes) VALUES ($1, $2, $3, $4, $5)",
      [createId("del"), orderId, userId ?? order.assigned_driver_id ?? null, status, `Marked ${status}`],
      client
    );
    await auditLog("delivery:update_status", "order", orderId, { status }, userId, client);
    const updated = await readOrderById(client, orderId, businessId);
    if (updated && (order.delivery_status !== status || order.status !== updated.status)) {
      await recordOrderStatusHistory(client, orderId, updated.status, `Delivery marked ${status.replaceAll("_", " ")}`, userId ?? null);
      await createCustomerStatusNotifications(client, updated, updated.status, settings);
    }
    return updated;
  });
  if (updatedOrder && shouldNotifyOutForDelivery) {
    updatedOrder = await updateCustomerWhatsAppLink(
      updatedOrder,
      buildCustomerOutForDeliveryWhatsAppMessage(updatedOrder, settings),
      settings
    );
    await notifyCustomerOutForDelivery(updatedOrder, settings);
  }
  return updatedOrder;
}

export async function updateOrder(id: string, input: Partial<Order>, userId?: string) {
  const businessId = await getBusinessIdForUser(userId);
  const settings = await getBusinessSettings(businessId);
  let shouldNotifyCustomerReceipt = false;
  let shouldNotifyDriverAssigned = false;
  let shouldNotifyOutForDelivery = false;
  const updatedOrder: Order | null = await transaction(async (client) => {
    const existing = await readOrderById(client, id, businessId);
    if (!existing) return null;
    const nextStatus = input.status ?? existing.status;
    const isCancelling = existing.status !== "cancelled" && nextStatus === "cancelled";
    const isCompleting = existing.status !== "completed" && nextStatus === "completed";
    const nextPointsEarned =
      isCompleting && existing.customer_id && settings.loyalty_enabled
        ? Math.floor(existing.total * Number(settings.loyalty_points_per_ttd || 0))
        : existing.loyalty_points_earned;
    const nextPaymentStatus =
      input.payment_status ?? (isCancelling && existing.payment_status === "paid" ? "refunded" : existing.payment_status);
    const nextDeliveryStatus =
      input.delivery_status ??
      (isCompleting && existing.delivery_status === "out_for_delivery"
        ? "delivered"
        : isCompleting && existing.delivery_status !== "not_required" && existing.delivery_status !== "failed"
          ? existing.delivery_status
          : undefined) ??
      (isCancelling && existing.delivery_status !== "not_required" && existing.delivery_status !== "delivered"
        ? "failed"
        : existing.delivery_status);
    const nextAssignedDriverId = input.assigned_driver_id ?? existing.assigned_driver_id ?? null;
    shouldNotifyDriverAssigned = Boolean(nextAssignedDriverId) && nextAssignedDriverId !== (existing.assigned_driver_id ?? null);
    shouldNotifyOutForDelivery = existing.delivery_status !== "out_for_delivery" && nextDeliveryStatus === "out_for_delivery";
    await query(
      `UPDATE orders SET
        status = $1, payment_status = $2, delivery_status = $3, assigned_driver_id = $4,
        notes = $5, loyalty_points_earned = $6,
        completed_by = CASE WHEN $7 THEN $8 ELSE completed_by END,
        completed_at = CASE WHEN $7 THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
        updated_at = NOW()
       WHERE id = $9`,
      [
        nextStatus,
        nextPaymentStatus,
        nextDeliveryStatus,
        nextAssignedDriverId,
        input.notes ?? existing.notes ?? null,
        nextPointsEarned,
        isCompleting,
        userId ?? null,
        id
      ],
      client
    );

    if ("driver_notes" in input || "estimated_delivery_at" in input) {
      try {
        await query(
          `UPDATE orders SET
            driver_notes = $1,
            estimated_delivery_at = $2::timestamptz,
            updated_at = NOW()
           WHERE id = $3`,
          [
            input.driver_notes ?? existing.driver_notes ?? null,
            input.estimated_delivery_at ?? existing.estimated_delivery_at ?? null,
            id
          ],
          client
        );
      } catch (error) {
        const code = typeof error === "object" && error ? (error as { code?: string }).code : undefined;
        if (code === "42703") {
          throw new Error("Delivery driver notes need the latest database schema. Apply db/schema.sql, then try again.");
        }
        throw error;
      }
    }

    if (isCompleting && !existing.inventory_applied) {
      let completed = await readOrderById(client, id, businessId);
      if (completed) {
        await applyCompletedOrderEffects(client, completed, userId ?? null);
        completed = await readOrderById(client, id, businessId);
      }
      if (completed) {
        const existingReceipt = await query<{ receipt_number: string }>(
          "SELECT receipt_number FROM receipts WHERE order_id = $1",
          [id],
          client
        );
        const receiptNumber = existingReceipt.rows[0]?.receipt_number || await nextReceiptNumber(client);
        await createOrUpdateReceiptRecord(client, completed, receiptNumber, userId ?? null);
        const receiptMessage = buildCustomerReceiptWhatsAppMessage(completed, settings);
        await query(
          "UPDATE orders SET whatsapp_customer_link = $1, updated_at = NOW() WHERE id = $2",
          [buildWhatsAppLink(completed.customer_snapshot.phone, receiptMessage, settings.whatsapp_country_code), id],
          client
        );
        shouldNotifyCustomerReceipt = true;
      }
    }

    if (isCancelling && existing.inventory_applied) {
      await reverseCompletedOrderEffects(client, existing, userId ?? null);
    }

    const orderAfterUpdate = await readOrderById(client, id, businessId);
    if (orderAfterUpdate && existing.status !== nextStatus) {
      await recordOrderStatusHistory(
        client,
        id,
        nextStatus,
        `Status changed from ${orderStatusLabel(existing.status)} to ${orderStatusLabel(nextStatus)}`,
        userId ?? null
      );
      await createCustomerStatusNotifications(client, orderAfterUpdate, nextStatus, settings);
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
    return orderAfterUpdate;
  });
  if (updatedOrder && shouldNotifyCustomerReceipt) {
    await notifyCustomerReceipt(updatedOrder, settings);
  }
  let orderForNotifications: Order | null = updatedOrder;
  if (orderForNotifications && shouldNotifyDriverAssigned) {
    orderForNotifications = await updateCustomerWhatsAppLink(
      orderForNotifications,
      buildCustomerDriverAssignedWhatsAppMessage(orderForNotifications, settings),
      settings
    );
  }
  if (orderForNotifications && shouldNotifyOutForDelivery) {
    orderForNotifications = await updateCustomerWhatsAppLink(
      orderForNotifications,
      buildCustomerOutForDeliveryWhatsAppMessage(orderForNotifications, settings),
      settings
    );
  }
  if (orderForNotifications && shouldNotifyDriverAssigned) {
    await notifyCustomerDriverAssigned(orderForNotifications, settings);
    await notifyDriverOfAssignment(orderForNotifications, settings);
  }
  if (orderForNotifications && shouldNotifyOutForDelivery) {
    await notifyCustomerOutForDelivery(orderForNotifications, settings);
  }
  return orderForNotifications;
}

export async function deleteOrder(id: string, userId?: string) {
  return transaction(async (client) => {
    const businessId = await getBusinessIdForUser(userId, client);
    const existing = await readOrderById(client, id, businessId);
    if (!existing) return null;
    const shouldRestoreStock = Boolean(existing.inventory_applied);
    const shouldReverseCustomer = Boolean(existing.customer_id) && Boolean(existing.inventory_applied);

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
    businessId: user?.business_id,
    limit: 150
  });
}

export async function getDashboardData(businessId?: string | null): Promise<DashboardData> {
  const today = startOfDay(new Date());
  const week = subDays(new Date(), 7);
  const month = subDays(new Date(), 30);
  const orderScope = businessId ? "AND (business_id = $2 OR business_id IS NULL)" : "";
  const orderScopeAlias = businessId ? "AND (o.business_id = $2 OR o.business_id IS NULL)" : "";
  const oneParamScope = businessId ? "AND (business_id = $1 OR business_id IS NULL)" : "";
  const businessParam = businessId ? [businessId] : [];

  const totalSince = async (date: Date) => {
    const result = await query<{ total: string }>(
      `SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE status != 'cancelled' AND created_at >= $1 ${orderScope}`,
      businessId ? [date, businessId] : [date]
    );
    return Number(result.rows[0]?.total || 0);
  };

  const [
    settings,
    business,
    subscription,
    dailySales,
    weeklySales,
    monthlySales,
    newOrderRows,
    pendingOrderRows,
    completedOrderRows,
    recentCustomerRows,
    checklistProductRows,
    deliveryOrderCountRows,
    profitEstimateRows,
    lowStockRows,
    bestSellerRows,
    topCustomerRows,
    paymentRows,
    cashierRows,
    seriesRows,
    recentOrders
  ] = await Promise.all([
    getBusinessSettings(businessId),
    getBusinessById(businessId),
    getCurrentSubscription(businessId),
    totalSince(today),
    totalSince(week),
    totalSince(month),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM orders WHERE status = 'new' ${oneParamScope}`,
      businessParam
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM orders WHERE status IN ('new', 'accepted', 'preparing', 'ready', 'out_for_delivery') ${oneParamScope}`,
      businessParam
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM orders WHERE status = 'completed' AND created_at >= $1 ${orderScope}`,
      businessId ? [today, businessId] : [today]
    ),
    query<any>(
      `SELECT * FROM customers WHERE TRUE ${oneParamScope} ORDER BY updated_at DESC LIMIT 6`,
      businessParam
    ),
    query<any>(
      `SELECT id, name, sku, barcode, category, cost_price, selling_price, stock_quantity, low_stock_alert, image_url, supplier_name, supplier_phone, active
       FROM products
       WHERE active = TRUE ${oneParamScope}
       LIMIT 25`,
      businessParam
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM orders WHERE order_type = 'delivery' AND created_at >= $1 ${orderScope}`,
      businessId ? [month, businessId] : [month]
    ),
    query<{ profit: string }>(
      `SELECT COALESCE(SUM(oi.line_total - (oi.cost_price * oi.quantity)), 0) AS profit
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'cancelled' AND o.created_at >= $1 ${orderScopeAlias}`,
      businessId ? [month, businessId] : [month]
    ),
    query<any>(
      `SELECT * FROM products WHERE active = TRUE AND stock_quantity <= low_stock_alert ${oneParamScope} ORDER BY stock_quantity ASC LIMIT 8`,
      businessParam
    ),
    query<{ name: string; quantity: string; total: string }>(
      `SELECT product_name AS name, SUM(quantity) AS quantity, SUM(line_total) AS total
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'cancelled'
       ${businessId ? "AND (o.business_id = $1 OR o.business_id IS NULL)" : ""}
       GROUP BY product_name
       ORDER BY quantity DESC
       LIMIT 8`,
      businessParam
    ),
    query<{ name: string; total_spent: string; orders_count: string }>(
      `SELECT name, total_spent, orders_count FROM customers WHERE TRUE ${oneParamScope} ORDER BY total_spent DESC LIMIT 8`,
      businessParam
    ),
    query<{ method: string; total: string; count: string }>(
      `SELECT payment_method AS method, SUM(total) AS total, COUNT(*) AS count
       FROM orders
       WHERE status != 'cancelled' ${oneParamScope}
       GROUP BY payment_method
       ORDER BY total DESC`,
      businessParam
    ),
    query<{ name: string; total: string; count: string }>(
      `SELECT COALESCE(u.name, 'Online / unassigned') AS name, SUM(o.total) AS total, COUNT(*) AS count
       FROM orders o
       LEFT JOIN users u ON u.id = o.created_by
       WHERE o.status != 'cancelled' ${businessId ? "AND (o.business_id = $1 OR o.business_id IS NULL)" : ""}
       GROUP BY COALESCE(u.name, 'Online / unassigned')
       ORDER BY total DESC`,
      businessParam
    ),
    query<{ date: string; total: string }>(
      `SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date, SUM(total) AS total
       FROM orders
       WHERE status != 'cancelled' AND created_at >= $1 ${orderScope}
       GROUP BY created_at::date
       ORDER BY date ASC`,
      businessId ? [month, businessId] : [month]
    ),
    listOrders({ businessId, limit: 6 })
  ]);

  return {
    currency: settings.currency,
    business,
    storefrontUrl: business?.storefront_slug || business?.slug ? `/store/${business.storefront_slug || business.slug}` : "/online",
    whatsappConfigured: Boolean(settings.whatsapp_enabled && settings.whatsapp_business_number),
    subscription,
    setupChecklist: setupChecklistForBusiness(business, settings, checklistProductRows.rows.map(rowToProduct)),
    newOrders: Number(newOrderRows.rows[0]?.count || 0),
    pendingOrders: Number(pendingOrderRows.rows[0]?.count || 0),
    completedOrders: Number(completedOrderRows.rows[0]?.count || 0),
    recentCustomers: recentCustomerRows.rows.map(rowToCustomer),
    dailySales,
    weeklySales,
    monthlySales,
    deliveryOrderCount: Number(deliveryOrderCountRows.rows[0]?.count || 0),
    profitEstimate: Number(profitEstimateRows.rows[0]?.profit || 0),
    recentOrders,
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

export async function exportSalesCsv(businessId?: string | null) {
  const orders = await listOrders({ limit: 300, businessId });
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

export async function listReceipts(options: { query?: string; limit?: number; businessId?: string | null } = {}): Promise<Receipt[]> {
  const params: unknown[] = [];
  const clauses = ["TRUE"];
  if (options.businessId) clauses.push(businessScopedClause(params, options.businessId, "r"));
  if (options.query?.trim()) {
    const like = addParam(params, `%${options.query.trim()}%`);
    clauses.push(`(
      r.receipt_number ILIKE ${like}
      OR r.order_number ILIKE ${like}
      OR r.customer_name ILIKE ${like}
      OR r.customer_phone ILIKE ${like}
      OR TO_CHAR(r.created_at, 'YYYY-MM-DD') ILIKE ${like}
    )`);
  }
  const limit = addParam(params, Math.min(options.limit || 100, 300));
  const rows = await query<any>(
    `SELECT r.*, u.name AS completed_by_name
     FROM receipts r
     LEFT JOIN users u ON u.id = r.completed_by
     WHERE ${clauses.join(" AND ")}
     ORDER BY COALESCE(r.completed_at, r.created_at) DESC
     LIMIT ${limit}`,
    params
  );
  return rows.rows.map(rowToReceipt);
}

export async function getReceipt(id: string, businessId?: string | null) {
  const params: unknown[] = [id];
  const scope = businessId ? ` AND ${businessScopedClause(params, businessId, "r")}` : "";
  const row = await query<any>(
    `SELECT r.*, u.name AS completed_by_name
     FROM receipts r
     LEFT JOIN users u ON u.id = r.completed_by
     WHERE (r.id = $1 OR r.order_id = $1)${scope}
     LIMIT 1`,
    params
  );
  return row.rows[0] ? rowToReceipt(row.rows[0]) : null;
}

export async function resendReceiptWhatsApp(receiptId: string, userId?: string) {
  const businessId = await getBusinessIdForUser(userId);
  const receipt = await getReceipt(receiptId, businessId);
  if (!receipt) return null;
  const order = await getOrder(receipt.order_id, businessId);
  if (!order) return null;
  const settings = await getBusinessSettings(businessId);
  const result = await sendWhatsAppMessage(order.customer_snapshot.phone, buildCustomerReceiptWhatsAppMessage(order, settings), {
    defaultCountryCode: settings.whatsapp_country_code,
    businessId: order.business_id || settings.active_business_id,
    orderId: order.id,
    customerId: order.customer_id,
    status: "receipt_resend"
  });
  if (result.ok) {
    await query("UPDATE receipts SET whatsapp_sent_at = NOW(), updated_at = NOW() WHERE id = $1", [receipt.id]);
    await auditLog("receipt:whatsapp_resend", "receipt", receipt.id, { order_id: receipt.order_id }, userId);
  }
  return {
    receipt: await getReceipt(receipt.id),
    message: result.message
  };
}

export async function getReceiptNumber(orderId: string) {
  const row = await query<{ receipt_number: string }>(
    "SELECT receipt_number FROM receipts WHERE order_id = $1",
    [orderId]
  );
  return row.rows[0]?.receipt_number ?? "";
}

export async function getAuditLogs(limit = 100) {
  return listAuditLogs(limit);
}
