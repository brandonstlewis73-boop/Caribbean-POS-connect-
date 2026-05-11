import { randomUUID } from "node:crypto";
import { subDays, startOfDay } from "date-fns";
import {
  CURRENCY_CODE,
  DEFAULT_DELIVERY_RATES,
  getDefaultDeliveryRatesForCurrency,
  getDeliveryRegionsForCurrency,
  money
} from "./constants";
import { buildAddress, buildWazeLink } from "./waze";
import {
  buildCustomerConfirmationMessage,
  buildCustomerDriverAssignedWhatsAppMessage,
  buildCustomerOutForDeliveryWhatsAppMessage,
  buildOrderWhatsAppMessage,
  buildWhatsAppLink,
  cleanWhatsAppNumber
} from "./whatsapp";
import type {
  CheckoutPayload,
  Business,
  BusinessInput,
  Customer,
  CustomerInput,
  DashboardData,
  Order,
  OrderItem,
  Product,
  Settings,
  StaffInput,
  User
} from "./types";

type DemoAuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: unknown;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  created_at: string;
};

type DemoStore = {
  settings: Settings;
  businesses: Business[];
  users: User[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  receipts: Record<string, string>;
  auditLogs: DemoAuditLog[];
  orderCounter: number;
  receiptCounter: number;
};

declare global {
  var __cpcDemoStore: DemoStore | undefined;
}

const demoSettings: Settings = {
  business_name: "Savannah & Sea Retail Ltd.",
  business_phone: "868-555-2190",
  business_email: "hello@savannahsea.tt",
  business_address: "18 Independence Square, Port of Spain, Trinidad and Tobago",
  logo_url: "/logo.svg",
  active_business_id: "biz_savannah_sea",
  currency: CURRENCY_CODE,
  tax_enabled: true,
  tax_rate: 12.5,
  service_fee_enabled: false,
  service_fee_rate: 0,
  delivery_fee: 25,
  delivery_rates: DEFAULT_DELIVERY_RATES,
  receipt_message: "Thank you for shopping with us.",
  loyalty_enabled: true,
  loyalty_points_per_ttd: 0.1,
  loyalty_redeem_ttd_per_point: 0.1,
  payment_links_enabled: true,
  payment_link_template:
    "https://pay.example.com/caribbean-pos-connect?order={{order_number}}&amount={{amount}}&phone={{customer_phone}}",
  whatsapp_enabled: true,
  whatsapp_business_number: "4437582368",
  whatsapp_country_code: "+1",
  whatsapp_owner_alerts_enabled: true,
  whatsapp_customer_receipts_enabled: false,
  whatsapp_driver_assignment_enabled: true,
  whatsapp_driver_alerts_enabled: true,
  whatsapp_out_for_delivery_enabled: true,
  whatsapp_order_template:
    "New Order - {{business_name}}\n\nOrder #: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nType: {{order_type}}\nAddress: {{address}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}}\nPayment status: {{payment_status}}\nOrder status: {{order_status}}\nDate/time: {{date_time}}\nDashboard: {{dashboard_link}}\nPayment link: {{payment_link}}\n\nWaze:\n{{waze_link}}",
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
  receipt_whatsapp_enabled: false
};

const demoBusiness: Business = {
  id: "biz_savannah_sea",
  name: "Savannah & Sea Retail Ltd.",
  legal_name: "Savannah & Sea Retail Ltd.",
  slug: "savannah-sea-retail",
  phone: "868-443-7582",
  email: "hello@savannahsea.tt",
  street_address: "18 Independence Square",
  city: "Port of Spain",
  region: "Port of Spain",
  country: "Trinidad and Tobago",
  currency: CURRENCY_CODE,
  logo_url: "/logo.svg",
  active: true,
  created_at: now(14),
  updated_at: now(1)
};

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function now(offsetDays = 0) {
  return subDays(new Date(), offsetDays).toISOString();
}

function moneyRound(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function cloneProduct(product: Product): Product {
  return { ...product };
}

function cloneBusiness(business: Business): Business {
  return { ...business };
}

function cloneCustomer(customer: Customer): Customer {
  return { ...customer, tags: [...customer.tags] };
}

function cloneOrder(order: Order): Order {
  return {
    ...order,
    customer_snapshot: { ...order.customer_snapshot },
    items: order.items.map((item) => ({ ...item }))
  };
}

function buildPaymentLink(
  settings: Settings,
  orderNumber: string,
  receiptNumber: string,
  total: number,
  paymentMethod: string,
  customer: CustomerInput
) {
  if (!settings.payment_links_enabled || !settings.payment_link_template?.trim()) return null;
  return settings.payment_link_template
    .replaceAll("{{order_number}}", encodeURIComponent(orderNumber))
    .replaceAll("{{receipt_number}}", encodeURIComponent(receiptNumber))
    .replaceAll("{{amount}}", encodeURIComponent(total.toFixed(2)))
    .replaceAll("{{total}}", encodeURIComponent(total.toFixed(2)))
    .replaceAll("{{total_label}}", encodeURIComponent(money(total, settings.currency)))
    .replaceAll("{{customer_name}}", encodeURIComponent(customer.name || "Customer"))
    .replaceAll("{{customer_phone}}", encodeURIComponent(cleanWhatsAppNumber(customer.phone) || ""))
    .replaceAll("{{payment_method}}", encodeURIComponent(paymentMethod));
}

function regionDeliveryFee(settings: Settings, region?: string | null) {
  const rates: Record<string, number> = { ...getDefaultDeliveryRatesForCurrency(settings.currency), ...settings.delivery_rates };
  return region && rates[region] !== undefined ? Number(rates[region]) : Number(settings.delivery_fee || 0);
}

function seedProducts(): Product[] {
  return [];
}

function seedCustomers(): Customer[] {
  return [];
}

function createStore(): DemoStore {
  const products = seedProducts();
  const customers = seedCustomers();
  const store: DemoStore = {
    settings: { ...demoSettings, delivery_rates: { ...demoSettings.delivery_rates } },
    businesses: [cloneBusiness(demoBusiness)],
    users: [
      { id: "usr_demo_admin", name: "Demo Admin", email: "admin@demo.com", role: "admin", phone: "868-443-7582", active: true, avatar_key: "slate-owner" },
      { id: "usr_demo_driver", name: "Malik Charles", email: "driver@demo.com", role: "driver", phone: "868-555-1004", active: true, avatar_key: "amber-delivery" }
    ],
    products,
    customers,
    orders: [],
    receipts: {},
    auditLogs: [],
    orderCounter: 1027,
    receiptCounter: 4027
  };
  store.orders = [];
  demoAuditLog("workspace:init", "system", "local", { mode: "memory" }, "usr_demo_admin", store);
  return store;
}

function store() {
  if (!globalThis.__cpcDemoStore) {
    globalThis.__cpcDemoStore = createStore();
  }
  return globalThis.__cpcDemoStore;
}

function demoAuditLog(
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: unknown,
  userId?: string | null,
  target = store()
) {
  const user = target.users.find((item) => item.id === userId);
  target.auditLogs.unshift({
    id: id("aud"),
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: metadata ?? {},
    user_id: userId ?? null,
    user_name: user?.name || null,
    user_email: user?.email || null,
    created_at: new Date().toISOString()
  });
}

function upsertDemoCustomer(input?: CustomerInput | null) {
  if (!input || (!input.name && !input.phone && !input.email)) return null;
  const state = store();
  const normalized = cleanWhatsAppNumber(input.phone);
  const existing = state.customers.find(
    (customer) =>
      (normalized && customer.phone_normalized === normalized) ||
      (input.email && customer.email?.toLowerCase() === input.email.toLowerCase())
  );
  if (existing) {
    Object.assign(existing, {
      name: input.name || existing.name,
      phone: input.phone || existing.phone,
      phone_normalized: normalized || existing.phone_normalized,
      email: input.email || existing.email,
      street_address: input.street_address || existing.street_address,
      city: input.city || existing.city,
      region: input.region || existing.region,
      country: input.country || existing.country,
      delivery_notes: input.delivery_notes || existing.delivery_notes,
      waze_link: input.waze_link || existing.waze_link,
      gps_latitude: input.gps_latitude ?? existing.gps_latitude,
      gps_longitude: input.gps_longitude ?? existing.gps_longitude,
      preferred_payment_method: input.preferred_payment_method || existing.preferred_payment_method,
      notes: input.notes || existing.notes,
      birthday: input.birthday || existing.birthday,
      marketing_consent: input.marketing_consent ?? existing.marketing_consent
    });
    return existing;
  }
  const customer: Customer = {
    id: id("cus"),
    name: input.name || "Customer",
    phone: input.phone || null,
    phone_normalized: normalized || null,
    email: input.email || null,
    street_address: input.street_address || null,
    city: input.city || null,
    region: input.region || null,
    country: input.country || "Trinidad and Tobago",
    delivery_notes: input.delivery_notes || null,
    waze_link: input.waze_link || null,
    gps_latitude: input.gps_latitude ?? null,
    gps_longitude: input.gps_longitude ?? null,
    preferred_payment_method: input.preferred_payment_method || null,
    notes: input.notes || null,
    birthday: input.birthday || null,
    marketing_consent: Boolean(input.marketing_consent),
    loyalty_points: 0,
    total_spent: 0,
    orders_count: 0,
    last_order_at: null,
    tags: ["New Customer"]
  };
  state.customers.unshift(customer);
  return customer;
}

export async function demoGetSettings() {
  const settings = store().settings;
  return {
    ...settings,
    delivery_rates: {
      ...getDefaultDeliveryRatesForCurrency(settings.currency),
      ...settings.delivery_rates
    }
  };
}

export async function demoUpdateSettings(input: Partial<Settings>, userId?: string) {
  const state = store();
  const nextCurrency = input.currency || state.settings.currency;
  const defaults = getDefaultDeliveryRatesForCurrency(nextCurrency);
  const delivery_rates =
    input.currency || input.delivery_rates
      ? Object.fromEntries(
          getDeliveryRegionsForCurrency(nextCurrency).map((region) => [
            region,
            Number(input.delivery_rates?.[region] ?? state.settings.delivery_rates?.[region] ?? defaults[region] ?? state.settings.delivery_fee ?? 0)
          ])
        )
      : { ...state.settings.delivery_rates };
  state.settings = { ...state.settings, ...input, delivery_rates };
  demoAuditLog("settings:update", "settings", "global", { ...input, delivery_rates }, userId, state);
  return demoGetSettings();
}

export async function demoListUsers(role?: string, includeInactive = false) {
  return store().users.filter((user) => (includeInactive || user.active) && (!role || user.role === role)).map((user) => ({ ...user }));
}

export async function demoCreateStaffUser(input: StaffInput, userId?: string) {
  const staff: User = {
    id: id("usr"),
    name: input.name || "New Staff",
    email: input.email || `staff.${Date.now()}@example.com`,
    role: input.role || "cashier",
    phone: input.phone || null,
    active: input.active ?? true,
    avatar_key: input.avatar_key || "teal-register",
    avatar_url: input.avatar_url || null
  };
  store().users.unshift(staff);
  demoAuditLog("staff:create", "user", staff.id, { ...input, avatar_url: input.avatar_url ? "[stored image]" : null }, userId);
  return { ...staff };
}

export async function demoUpdateStaffUser(staffId: string, input: StaffInput, userId?: string) {
  const staff = store().users.find((item) => item.id === staffId);
  if (!staff) return null;
  Object.assign(staff, {
    name: input.name ?? staff.name,
    email: input.email ?? staff.email,
    phone: input.phone ?? staff.phone,
    role: input.role ?? staff.role,
    active: input.active ?? staff.active,
    avatar_key: input.avatar_key ?? staff.avatar_key,
    avatar_url: input.avatar_url ?? staff.avatar_url
  });
  demoAuditLog("staff:update", "user", staff.id, { ...input, avatar_url: input.avatar_url ? "[stored image]" : null }, userId);
  return { ...staff };
}

export async function demoDeleteStaffUser(staffId: string, userId?: string) {
  const state = store();
  const index = state.users.findIndex((item) => item.id === staffId);
  if (index < 0) return null;
  const [staff] = state.users.splice(index, 1);
  for (const order of state.orders) {
    if (order.assigned_driver_id === staffId) {
      order.assigned_driver_id = null;
      order.assigned_driver_name = null;
      order.assigned_driver_phone = null;
    }
    if (order.created_by === staffId) order.created_by = null;
  }
  demoAuditLog("staff:delete", "user", staff.id, { name: staff.name, email: staff.email }, userId, state);
  return { ...staff };
}

export async function demoListBusinesses() {
  return store().businesses.map(cloneBusiness);
}

export async function demoCreateBusiness(input: BusinessInput, userId?: string) {
  const name = input.name?.trim();
  if (!name) return null;
  const business: Business = {
    id: id("biz"),
    name,
    legal_name: input.legal_name || name,
    slug: (input.slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    phone: input.phone || null,
    email: input.email || null,
    street_address: input.street_address || null,
    city: input.city || null,
    region: input.region || null,
    country: input.country || "Trinidad and Tobago",
    currency: input.currency || CURRENCY_CODE,
    logo_url: input.logo_url || null,
    tax_id: input.tax_id || null,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  store().businesses.unshift(business);
  demoAuditLog("business:create", "business", business.id, input, userId);
  return cloneBusiness(business);
}

export async function demoDeleteBusiness(businessId: string, userId?: string) {
  const state = store();
  const index = state.businesses.findIndex((item) => item.id === businessId);
  if (index < 0) return null;
  if (businessId === "biz_savannah_sea") {
    throw new Error("The default business profile is tied to store data and cannot be deleted.");
  }
  if (state.settings.active_business_id === businessId) {
    throw new Error("Switch to another business before deleting the live business profile.");
  }
  if (state.businesses.length <= 1) {
    throw new Error("Keep at least one business profile in the store.");
  }
  const [business] = state.businesses.splice(index, 1);
  demoAuditLog("business:delete", "business", businessId, { name: business.name, currency: business.currency }, userId, state);
  return cloneBusiness(business);
}

export async function demoListProducts(search?: string, includeInactive = false) {
  const needle = search?.trim().toLowerCase();
  return store()
    .products.filter((product) => includeInactive || product.active)
    .filter((product) => {
      if (!needle) return true;
      return [product.name, product.sku, product.barcode, product.category].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => `${a.category}-${a.name}`.localeCompare(`${b.category}-${b.name}`))
    .map(cloneProduct);
}

export async function demoGetProduct(productId: string) {
  const product = store().products.find((item) => item.id === productId);
  return product ? cloneProduct(product) : null;
}

export async function demoCreateProduct(input: Omit<Product, "id" | "active">, userId?: string) {
  const product: Product = { ...input, id: id("prd"), active: true };
  store().products.push(product);
  demoAuditLog("product:create", "product", product.id, input, userId);
  return cloneProduct(product);
}

export async function demoUpdateProduct(productId: string, input: Partial<Product>, userId?: string) {
  const product = store().products.find((item) => item.id === productId);
  if (!product) return null;
  Object.assign(product, input);
  demoAuditLog("product:update", "product", productId, input, userId);
  return cloneProduct(product);
}

export async function demoDeleteProduct(productId: string, userId?: string) {
  const state = store();
  const index = state.products.findIndex((item) => item.id === productId);
  if (index < 0) return null;
  const [product] = state.products.splice(index, 1);
  for (const order of state.orders) {
    for (const item of order.items) {
      if (item.product_id === productId) item.product_id = null;
    }
  }
  demoAuditLog("product:delete", "product", productId, { name: product.name, sku: product.sku }, userId, state);
  return cloneProduct(product);
}

export async function demoAdjustStock(productId: string, delta: number, reason: string, userId?: string) {
  const product = store().products.find((item) => item.id === productId);
  if (!product) return null;
  product.stock_quantity += delta;
  demoAuditLog("stock:adjust", "product", productId, { delta, reason }, userId);
  return cloneProduct(product);
}

export async function demoListCustomers(search?: string) {
  const needle = search?.trim().toLowerCase();
  return store()
    .customers.filter((customer) => {
      if (!needle) return true;
      return [customer.name, customer.phone, customer.email, customer.phone_normalized].some((value) =>
        String(value || "").toLowerCase().includes(needle)
      );
    })
    .map(cloneCustomer);
}

export async function demoGetCustomer(customerId: string) {
  const customer = store().customers.find((item) => item.id === customerId);
  return customer ? cloneCustomer(customer) : null;
}

export async function demoGetCustomerProfile(customerId: string) {
  const customer = await demoGetCustomer(customerId);
  if (!customer) return null;
  const orders = await demoListOrders({ customerId, limit: 20 });
  const totals = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      totals.set(item.product_name, (totals.get(item.product_name) || 0) + item.quantity);
    }
  }
  const favoriteProducts = Array.from(totals, ([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  return { customer, orders, favoriteProducts };
}

export async function demoCreateCustomer(input: CustomerInput, userId?: string) {
  const customer = upsertDemoCustomer(input);
  if (customer) demoAuditLog("customer:create_or_update", "customer", customer.id, input, userId);
  return customer ? cloneCustomer(customer) : null;
}

export async function demoUpdateCustomer(customerId: string, input: CustomerInput, userId?: string) {
  const customer = store().customers.find((item) => item.id === customerId);
  if (!customer) return null;
  Object.assign(customer, {
    ...input,
    phone_normalized: cleanWhatsAppNumber(input.phone || customer.phone) || customer.phone_normalized,
    country: input.country || customer.country,
    marketing_consent: input.marketing_consent ?? customer.marketing_consent
  });
  demoAuditLog("customer:update", "customer", customerId, input, userId);
  return cloneCustomer(customer);
}

export async function demoDeleteCustomer(customerId: string, userId?: string) {
  const state = store();
  const index = state.customers.findIndex((item) => item.id === customerId);
  if (index < 0) return null;
  const [customer] = state.customers.splice(index, 1);
  for (const order of state.orders) {
    if (order.customer_id === customerId) order.customer_id = null;
  }
  demoAuditLog("customer:delete", "customer", customerId, { name: customer.name, phone: customer.phone }, userId, state);
  return cloneCustomer(customer);
}

export async function demoCreateOrder(payload: CheckoutPayload, userId?: string) {
  const state = store();
  const settings = state.settings;
  const orderId = id("ord");
  const orderNumber = String(++state.orderCounter);
  const receiptNumber = `R-${++state.receiptCounter}`;
  const orderStatus = payload.status || (payload.order_type === "in_store" ? "completed" : "new");
  const shouldCompleteNow = orderStatus === "completed";
  const delivery = payload.delivery || {};
  const customerInput: CustomerInput = {
    ...payload.customer,
    street_address: delivery.street_address || payload.customer?.street_address,
    city: delivery.city || payload.customer?.city,
    region: delivery.region || payload.customer?.region,
    country: delivery.country || payload.customer?.country || "Trinidad and Tobago",
    delivery_notes: delivery.notes || payload.customer?.delivery_notes,
    preferred_payment_method: payload.payment_method
  };
  const customer = upsertDemoCustomer(customerInput);
  const snapshot: CustomerInput = customer
    ? {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        street_address: customer.street_address,
        city: customer.city,
        region: customer.region,
        country: customer.country,
        delivery_notes: customer.delivery_notes,
        preferred_payment_method: payload.payment_method,
        marketing_consent: customer.marketing_consent
      }
    : { ...customerInput, name: customerInput.name || "Walk-in customer" };

  const items: OrderItem[] = payload.items.map((item) => {
    const product = state.products.find((candidate) => candidate.id === item.product_id && candidate.active);
    if (!product) throw new Error("Product not found");
    const quantity = Number(item.quantity);
    const discount = Number(item.discount || 0);
    const lineTotal = moneyRound(quantity * product.selling_price - discount);
    if (shouldCompleteNow) {
      product.stock_quantity -= quantity;
    }
    return {
      id: id("itm"),
      order_id: orderId,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity,
      unit_price: product.selling_price,
      cost_price: product.cost_price,
      discount,
      line_total: lineTotal
    };
  });
  const subtotal = moneyRound(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));
  const discountTotal = moneyRound(items.reduce((sum, item) => sum + item.discount, 0) + Number(payload.discount_amount || 0));
  const taxableBase = Math.max(0, subtotal - discountTotal);
  const taxTotal = settings.tax_enabled ? moneyRound(taxableBase * (settings.tax_rate / 100)) : 0;
  const serviceFee =
    payload.service_fee ?? (settings.service_fee_enabled ? moneyRound(taxableBase * (settings.service_fee_rate / 100)) : 0);
  const deliveryFee =
    payload.order_type === "delivery" || payload.order_type === "online"
      ? payload.delivery_fee ?? regionDeliveryFee(settings, snapshot.region)
      : Number(payload.delivery_fee || 0);
  const total = moneyRound(taxableBase + taxTotal + serviceFee + deliveryFee);
  const paymentStatus = payload.payment_status || (payload.payment_method === "Pay on delivery" ? "unpaid" : "paid");
  const deliveryStatus =
    payload.order_type === "delivery" || payload.order_type === "online"
      ? payload.assigned_driver_id
        ? "assigned"
        : "pending"
      : "not_required";
  const address = buildAddress([snapshot.street_address, snapshot.city, snapshot.region, snapshot.country]);
  const wazeLink = buildWazeLink({
    latitude: delivery.latitude,
    longitude: delivery.longitude,
    locationLink: delivery.location_link,
    address
  });
  const paymentLink = buildPaymentLink(settings, orderNumber, receiptNumber, total, payload.payment_method, snapshot);
  const createdAt = new Date().toISOString();
  const assignedDriver = payload.assigned_driver_id
    ? state.users.find((user) => user.id === payload.assigned_driver_id)
    : null;
  const order: Order = {
    id: orderId,
    order_number: orderNumber,
    customer_id: customer?.id || null,
    customer_snapshot: snapshot,
    order_type: payload.order_type,
    status: orderStatus,
    payment_method: payload.payment_method,
    payment_status: paymentStatus,
    delivery_status: deliveryStatus,
    assigned_driver_id: payload.assigned_driver_id || null,
    assigned_driver_name: assignedDriver?.name || null,
    assigned_driver_phone: assignedDriver?.phone || null,
    subtotal,
    discount_total: discountTotal,
    tax_total: taxTotal,
    service_fee: serviceFee,
    delivery_fee: deliveryFee,
    total,
    loyalty_points_earned: shouldCompleteNow && customer && settings.loyalty_enabled ? Math.floor(total * settings.loyalty_points_per_ttd) : 0,
    loyalty_points_redeemed: 0,
    notes: payload.notes || null,
    delivery_latitude: delivery.latitude ?? null,
    delivery_longitude: delivery.longitude ?? null,
    delivery_location_link: delivery.location_link || null,
    waze_link: wazeLink,
    payment_link: paymentLink,
    created_by: payload.created_by || userId || null,
    completed_by: shouldCompleteNow ? payload.created_by || userId || null : null,
    completed_at: shouldCompleteNow ? createdAt : null,
    inventory_applied: shouldCompleteNow,
    created_at: createdAt,
    updated_at: createdAt,
    items
  };
  order.whatsapp_business_link = buildWhatsAppLink(settings.whatsapp_business_number, buildOrderWhatsAppMessage(order, settings));
  order.whatsapp_customer_link = buildWhatsAppLink(order.customer_snapshot.phone, buildCustomerConfirmationMessage(order, settings));
  if (customer && shouldCompleteNow) {
    customer.total_spent += total;
    customer.orders_count += 1;
    customer.last_order_at = createdAt;
    customer.loyalty_points += order.loyalty_points_earned;
    if (customer.orders_count >= 3 && !customer.tags.includes("Frequent Buyer")) customer.tags.push("Frequent Buyer");
    if (total >= 500 && !customer.tags.includes("VIP")) customer.tags.push("VIP");
    if (paymentStatus !== "paid" && !customer.tags.includes("Owes Balance")) customer.tags.push("Owes Balance");
  }
  state.orders.unshift(order);
  if (shouldCompleteNow) state.receipts[order.id] = receiptNumber;
  demoAuditLog("order:create", "order", order.id, { order_number: order.order_number, total }, userId, state);
  return cloneOrder(order);
}

export async function demoGetOrder(orderId: string) {
  const order = store().orders.find((item) => item.id === orderId);
  return order ? cloneOrder(order) : null;
}

export async function demoListOrders(options: {
  query?: string;
  type?: string;
  status?: string;
  customerId?: string;
  driverId?: string;
  assignedOnly?: boolean;
  limit?: number;
} = {}) {
  const needle = options.query?.trim().toLowerCase();
  return store()
    .orders.filter((order) => {
      if (needle) {
        const haystack = [order.order_number, order.customer_snapshot.name, order.customer_snapshot.phone].join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (options.type && order.order_type !== options.type) return false;
      if (options.status && order.status !== options.status) return false;
      if (options.customerId && order.customer_id !== options.customerId) return false;
      if (options.driverId && order.assigned_driver_id !== options.driverId) return false;
      if (options.assignedOnly && !order.assigned_driver_id) return false;
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, Math.min(options.limit ?? 100, 300))
    .map(cloneOrder);
}

export async function demoUpdateDeliveryStatus(orderId: string, status: Order["delivery_status"], userId?: string) {
  const order = store().orders.find((item) => item.id === orderId);
  if (!order) return null;
  order.delivery_status = status;
  if (status === "out_for_delivery") {
    order.whatsapp_customer_link = buildWhatsAppLink(
      order.customer_snapshot.phone,
      buildCustomerOutForDeliveryWhatsAppMessage(order, store().settings),
      store().settings.whatsapp_country_code
    );
  }
  order.updated_at = new Date().toISOString();
  demoAuditLog("delivery:update_status", "order", orderId, { status }, userId);
  return cloneOrder(order);
}

export async function demoUpdateOrder(orderId: string, input: Partial<Order>, userId?: string) {
  const state = store();
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return null;
  const isCancelling = order.status !== "cancelled" && input.status === "cancelled";
  const isCompleting = order.status !== "completed" && input.status === "completed";
  if (isCompleting && !order.inventory_applied) {
    for (const item of order.items) {
      const product = item.product_id
        ? state.products.find((entry) => entry.id === item.product_id)
        : null;
      if (product) product.stock_quantity -= item.quantity;
    }
    const customer = order.customer_id
      ? state.customers.find((entry) => entry.id === order.customer_id)
      : null;
    if (!order.loyalty_points_earned && customer && state.settings.loyalty_enabled) {
      order.loyalty_points_earned = Math.floor(order.total * state.settings.loyalty_points_per_ttd);
    }
    if (customer) {
      customer.total_spent += order.total;
      customer.orders_count += 1;
      customer.last_order_at = new Date().toISOString();
      customer.loyalty_points += order.loyalty_points_earned;
    }
    order.inventory_applied = true;
    order.completed_by = userId || order.completed_by || null;
    order.completed_at = new Date().toISOString();
    state.receipts[order.id] = state.receipts[order.id] || `R-${++state.receiptCounter}`;
  }
  if (isCancelling && order.inventory_applied) {
    for (const item of order.items) {
      const product = item.product_id
        ? state.products.find((entry) => entry.id === item.product_id)
        : null;
        if (product) product.stock_quantity += item.quantity;
    }
    const customer = order.customer_id
      ? state.customers.find((entry) => entry.id === order.customer_id)
      : null;
    if (customer) {
      customer.total_spent = Math.max(0, moneyRound(customer.total_spent - order.total));
      customer.orders_count = Math.max(0, customer.orders_count - 1);
      customer.loyalty_points = Math.max(0, customer.loyalty_points - order.loyalty_points_earned);
    }
    order.inventory_applied = false;
  }
  const assignedDriver =
    input.assigned_driver_id !== undefined
      ? state.users.find((user) => user.id === input.assigned_driver_id)
      : null;
  Object.assign(order, {
    status: input.status ?? order.status,
    payment_status:
      input.payment_status ?? (isCancelling && order.payment_status === "paid" ? "refunded" : order.payment_status),
    delivery_status:
      input.delivery_status ??
      (isCancelling && order.delivery_status !== "not_required" && order.delivery_status !== "delivered"
        ? "failed"
        : order.delivery_status),
    assigned_driver_id: input.assigned_driver_id ?? order.assigned_driver_id,
    assigned_driver_name:
      input.assigned_driver_id !== undefined
        ? assignedDriver?.name || null
        : order.assigned_driver_name,
    assigned_driver_phone:
      input.assigned_driver_id !== undefined
        ? assignedDriver?.phone || null
        : order.assigned_driver_phone,
    notes: input.notes ?? order.notes,
    updated_at: new Date().toISOString()
  });
  if (input.assigned_driver_id) {
    order.whatsapp_customer_link = buildWhatsAppLink(
      order.customer_snapshot.phone,
      buildCustomerDriverAssignedWhatsAppMessage(order, state.settings),
      state.settings.whatsapp_country_code
    );
  }
  if (order.delivery_status === "out_for_delivery") {
    order.whatsapp_customer_link = buildWhatsAppLink(
      order.customer_snapshot.phone,
      buildCustomerOutForDeliveryWhatsAppMessage(order, state.settings),
      state.settings.whatsapp_country_code
    );
  }
  demoAuditLog("order:update", "order", orderId, input, userId);
  return cloneOrder(order);
}

export async function demoDeleteOrder(orderId: string, userId?: string) {
  const state = store();
  const index = state.orders.findIndex((item) => item.id === orderId);
  if (index < 0) return null;
  const [order] = state.orders.splice(index, 1);
  const shouldRestoreStock = order.status !== "cancelled" && order.status !== "draft";
  const shouldReverseCustomer = Boolean(order.customer_id) && order.status !== "cancelled";

  if (shouldRestoreStock) {
    for (const item of order.items) {
      const product = item.product_id
        ? state.products.find((entry) => entry.id === item.product_id)
        : null;
      if (product) product.stock_quantity += item.quantity;
    }
  }

  if (shouldReverseCustomer && order.customer_id) {
    const customer = state.customers.find((entry) => entry.id === order.customer_id);
    if (customer) {
      customer.total_spent = Math.max(0, moneyRound(customer.total_spent - order.total));
      customer.orders_count = Math.max(0, customer.orders_count - 1);
      customer.loyalty_points = Math.max(0, customer.loyalty_points - order.loyalty_points_earned);
    }
  }

  delete state.receipts[order.id];
  demoAuditLog(
    "order:delete",
    "order",
    orderId,
    { order_number: order.order_number, restored_items: shouldRestoreStock ? order.items.length : 0 },
    userId,
    state
  );
  return cloneOrder(order);
}

export async function demoDashboardData(): Promise<DashboardData> {
  const state = store();
  const activeOrders = state.orders.filter((order) => order.status !== "cancelled");
  const since = (date: Date) =>
    moneyRound(activeOrders.filter((order) => new Date(order.created_at) >= date).reduce((sum, order) => sum + order.total, 0));
  const month = subDays(new Date(), 30);
  const bestSellers = new Map<string, { name: string; quantity: number; total: number }>();
  const paymentBreakdown = new Map<string, { method: string; count: number; total: number }>();
  const cashierPerformance = new Map<string, { name: string; count: number; total: number }>();
  const salesSeries = new Map<string, number>();
  for (const order of activeOrders) {
    const dateKey = order.created_at.slice(0, 10);
    salesSeries.set(dateKey, moneyRound((salesSeries.get(dateKey) || 0) + order.total));
    paymentBreakdown.set(order.payment_method, {
      method: order.payment_method,
      count: (paymentBreakdown.get(order.payment_method)?.count || 0) + 1,
      total: moneyRound((paymentBreakdown.get(order.payment_method)?.total || 0) + order.total)
    });
    const cashier = state.users.find((user) => user.id === order.created_by)?.name || "Online / unassigned";
    cashierPerformance.set(cashier, {
      name: cashier,
      count: (cashierPerformance.get(cashier)?.count || 0) + 1,
      total: moneyRound((cashierPerformance.get(cashier)?.total || 0) + order.total)
    });
    for (const item of order.items) {
      const existing = bestSellers.get(item.product_name) || { name: item.product_name, quantity: 0, total: 0 };
      existing.quantity += item.quantity;
      existing.total = moneyRound(existing.total + item.line_total);
      bestSellers.set(item.product_name, existing);
    }
  }
  return {
    currency: state.settings.currency,
    dailySales: since(startOfDay(new Date())),
    weeklySales: since(subDays(new Date(), 7)),
    monthlySales: since(month),
    deliveryOrderCount: activeOrders.filter((order) => order.order_type === "delivery").length,
    profitEstimate: moneyRound(
      activeOrders.flatMap((order) => order.items).reduce((sum, item) => sum + item.line_total - item.cost_price * item.quantity, 0)
    ),
    lowStock: state.products.filter((product) => product.active && product.stock_quantity <= product.low_stock_alert).map(cloneProduct),
    bestSellers: Array.from(bestSellers.values()).sort((a, b) => b.quantity - a.quantity),
    topCustomers: state.customers
      .map((customer) => ({ name: customer.name, total_spent: customer.total_spent, orders_count: customer.orders_count }))
      .sort((a, b) => b.total_spent - a.total_spent),
    paymentBreakdown: Array.from(paymentBreakdown.values()).sort((a, b) => b.total - a.total),
    cashierPerformance: Array.from(cashierPerformance.values()).sort((a, b) => b.total - a.total),
    salesSeries: Array.from(salesSeries, ([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date))
  };
}

export async function demoListAuditLogs(limit = 100) {
  return store().auditLogs.slice(0, Math.min(Math.max(Number(limit) || 100, 1), 300));
}

export async function demoGetReceiptNumber(orderId: string) {
  return store().receipts[orderId] || "";
}

export async function demoExportTables() {
  const state = store();
  return {
    businesses: state.businesses,
    users: state.users,
    settings: state.settings,
    customers: state.customers,
    products: state.products,
    orders: state.orders,
    order_items: state.orders.flatMap((order) => order.items),
    receipts: state.receipts,
    audit_logs: state.auditLogs
  };
}
