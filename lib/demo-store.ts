import { randomUUID } from "node:crypto";
import { subDays, startOfDay } from "date-fns";
import { CURRENCY_CODE, DEFAULT_DELIVERY_RATES, PRODUCT_IMAGE_URLS } from "./constants";
import { buildAddress, buildWazeLink } from "./waze";
import {
  buildCustomerConfirmationMessage,
  buildOrderWhatsAppMessage,
  buildWhatsAppLink,
  cleanWhatsAppNumber
} from "./whatsapp";
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
  // eslint-disable-next-line no-var
  var __cpcDemoStore: DemoStore | undefined;
}

const demoSettings: Settings = {
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
    .replaceAll("{{total_label}}", encodeURIComponent(`${CURRENCY_CODE} ${total.toFixed(2)}`))
    .replaceAll("{{customer_name}}", encodeURIComponent(customer.name || "Customer"))
    .replaceAll("{{customer_phone}}", encodeURIComponent(cleanWhatsAppNumber(customer.phone) || ""))
    .replaceAll("{{payment_method}}", encodeURIComponent(paymentMethod));
}

function regionDeliveryFee(settings: Settings, region?: string | null) {
  const rates: Record<string, number> = { ...DEFAULT_DELIVERY_RATES, ...settings.delivery_rates };
  return region && rates[region] !== undefined ? Number(rates[region]) : Number(settings.delivery_fee || 0);
}

function seedProducts(): Product[] {
  return [
    ["prd_jerk", "Jerk Chicken Meal", "FOOD-JERK-001", "740001000001", "Food", 38, 55, 42, 8, "Island Fresh Foods", "868-555-2001"],
    ["prd_doubles", "Doubles Pack", "FOOD-DOUB-002", "740001000002", "Food", 6, 12, 80, 15, "Central Curry Supply", "868-555-2002"],
    ["prd_sorrel", "Sorrel Drink", "DRINK-SOR-003", "740001000003", "Drinks", 6, 15, 30, 10, "Tropical Bev Co", "868-555-2003"],
    ["prd_mauby", "Mauby Bottle", "DRINK-MAU-004", "740001000004", "Drinks", 5, 14, 24, 10, "Tropical Bev Co", "868-555-2003"],
    ["prd_plantain", "Plantain Chips", "SNACK-PLA-005", "740001000005", "Snacks", 7, 16, 12, 12, "SnackWorks TT", "868-555-2004"],
    ["prd_tee", "Screen Printed Tee", "APP-TEE-006", "740001000006", "Apparel", 48, 120, 18, 5, "Queen Street Apparel", "868-555-2005"],
    ["prd_topup", "Digital Top-Up", "DIG-TOP-007", "740001000007", "Digital services", 45, 50, 999, 100, "Local Digital Services", "868-555-2006"],
    ["prd_repair", "Custom Repair Service", "SERV-REP-008", "740001000008", "Services", 80, 150, 999, 100, "In-house", "868-555-0100"]
  ].map(
    ([
      productId,
      name,
      sku,
      barcode,
      category,
      cost_price,
      selling_price,
      stock_quantity,
      low_stock_alert,
      supplier_name,
      supplier_phone
    ]) =>
      ({
        id: String(productId),
        name: String(name),
        sku: String(sku),
        barcode: String(barcode),
        category: String(category),
        cost_price: Number(cost_price),
        selling_price: Number(selling_price),
        stock_quantity: Number(stock_quantity),
        low_stock_alert: Number(low_stock_alert),
        image_url: PRODUCT_IMAGE_URLS[String(sku)],
        supplier_name: String(supplier_name),
        supplier_phone: String(supplier_phone),
        active: true
      }) satisfies Product
  );
}

function seedCustomers(): Customer[] {
  return [
    {
      id: "cus_john",
      name: "John Doe",
      phone: "868-123-4567",
      phone_normalized: "18681234567",
      email: "john@example.com",
      street_address: "25 Main Road",
      community: "Montrose",
      city: "Chaguanas",
      region: "Chaguanas",
      country: "Trinidad and Tobago",
      delivery_notes: "Call when outside",
      preferred_payment_method: "Cash",
      notes: "Likes quick delivery.",
      birthday: null,
      marketing_consent: true,
      loyalty_points: 44,
      total_spent: 440,
      orders_count: 4,
      last_order_at: now(2),
      tags: ["VIP", "Frequent Buyer"]
    },
    {
      id: "cus_priya",
      name: "Priya Singh",
      phone: "868-222-9988",
      phone_normalized: "18682229988",
      email: "priya@example.com",
      street_address: "7 Coffee Street",
      community: "St. Augustine",
      city: "Tunapuna",
      region: "Tunapuna-Piarco",
      country: "Trinidad and Tobago",
      delivery_notes: "Leave at reception",
      preferred_payment_method: "WiPay",
      notes: "Prefers WhatsApp updates.",
      birthday: null,
      marketing_consent: true,
      loyalty_points: 18,
      total_spent: 180,
      orders_count: 2,
      last_order_at: now(3),
      tags: ["New Customer"]
    }
  ];
}

function orderFromSeed(
  store: Pick<DemoStore, "products" | "settings" | "receipts">,
  input: {
    id: string;
    order_number: string;
    receipt_number: string;
    customer: Customer;
    items: Array<[string, number]>;
    order_type: Order["order_type"];
    payment_method: string;
    payment_status: Order["payment_status"];
    delivery_status: Order["delivery_status"];
    assigned_driver_id?: string | null;
    created_by?: string | null;
    created_at: string;
  }
) {
  const items = input.items.map(([productId, quantity]) => {
    const product = store.products.find((item) => item.id === productId);
    if (!product) throw new Error(`Missing demo product ${productId}`);
    const lineTotal = moneyRound(product.selling_price * quantity);
    return {
      id: id("itm"),
      order_id: input.id,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity,
      unit_price: product.selling_price,
      cost_price: product.cost_price,
      discount: 0,
      line_total: lineTotal
    } satisfies OrderItem;
  });
  const subtotal = moneyRound(items.reduce((sum, item) => sum + item.line_total, 0));
  const deliveryFee = input.order_type === "delivery" ? regionDeliveryFee(store.settings, input.customer.region) : 0;
  const taxTotal = store.settings.tax_enabled ? moneyRound(subtotal * (store.settings.tax_rate / 100)) : 0;
  const total = moneyRound(subtotal + taxTotal + deliveryFee);
  const customerSnapshot: CustomerInput = {
    name: input.customer.name,
    phone: input.customer.phone,
    email: input.customer.email,
    street_address: input.customer.street_address,
    community: input.customer.community,
    city: input.customer.city,
    region: input.customer.region,
    country: input.customer.country,
    delivery_notes: input.customer.delivery_notes,
    preferred_payment_method: input.payment_method,
    marketing_consent: input.customer.marketing_consent
  };
  const address = buildAddress([
    customerSnapshot.street_address,
    customerSnapshot.community,
    customerSnapshot.city,
    customerSnapshot.region,
    customerSnapshot.country
  ]);
  const wazeLink = input.order_type === "delivery" ? buildWazeLink({ address }) : null;
  const paymentLink = buildPaymentLink(
    store.settings,
    input.order_number,
    input.receipt_number,
    total,
    input.payment_method,
    customerSnapshot
  );
  const order: Order = {
    id: input.id,
    order_number: input.order_number,
    customer_id: input.customer.id,
    customer_snapshot: customerSnapshot,
    order_type: input.order_type,
    status: "completed",
    payment_method: input.payment_method,
    payment_status: input.payment_status,
    delivery_status: input.delivery_status,
    assigned_driver_id: input.assigned_driver_id || null,
    assigned_driver_name: input.assigned_driver_id ? "Malik Charles" : null,
    subtotal,
    discount_total: 0,
    tax_total: taxTotal,
    service_fee: 0,
    delivery_fee: deliveryFee,
    total,
    loyalty_points_earned: Math.floor(total * store.settings.loyalty_points_per_ttd),
    loyalty_points_redeemed: 0,
    notes: null,
    delivery_latitude: null,
    delivery_longitude: null,
    delivery_location_link: null,
    waze_link: wazeLink,
    payment_link: paymentLink,
    created_by: input.created_by || null,
    created_at: input.created_at,
    updated_at: input.created_at,
    items
  };
  order.whatsapp_business_link = buildWhatsAppLink(store.settings.whatsapp_business_number, buildOrderWhatsAppMessage(order, store.settings));
  order.whatsapp_customer_link = buildWhatsAppLink(order.customer_snapshot.phone, buildCustomerConfirmationMessage(order, store.settings));
  store.receipts[order.id] = input.receipt_number;
  return order;
}

function createStore(): DemoStore {
  const products = seedProducts();
  const customers = seedCustomers();
  const store: DemoStore = {
    settings: { ...demoSettings, delivery_rates: { ...demoSettings.delivery_rates } },
    users: [
      { id: "usr_demo_admin", name: "Demo Admin", email: "admin@demo.com", role: "admin", phone: "868-443-7582", active: true },
      { id: "usr_demo_driver", name: "Malik Charles", email: "driver@demo.com", role: "driver", phone: "868-555-1004", active: true }
    ],
    products,
    customers,
    orders: [],
    receipts: {},
    auditLogs: [],
    orderCounter: 1027,
    receiptCounter: 4027
  };
  store.orders = [
    orderFromSeed(store, {
      id: "ord_demo_delivery",
      order_number: "1025",
      receipt_number: "R-4025",
      customer: customers[0],
      items: [["prd_jerk", 2], ["prd_sorrel", 1]],
      order_type: "delivery",
      payment_method: "Pay on delivery",
      payment_status: "unpaid",
      delivery_status: "assigned",
      assigned_driver_id: "usr_demo_driver",
      created_by: "usr_demo_admin",
      created_at: now(1)
    }),
    orderFromSeed(store, {
      id: "ord_demo_pickup",
      order_number: "1026",
      receipt_number: "R-4026",
      customer: customers[1],
      items: [["prd_doubles", 6], ["prd_mauby", 2]],
      order_type: "pickup",
      payment_method: "WiPay",
      payment_status: "paid",
      delivery_status: "not_required",
      created_by: "usr_demo_admin",
      created_at: now(3)
    })
  ];
  demoAuditLog("demo:init", "system", "demo", { mode: "memory" }, "usr_demo_admin", store);
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
      community: input.community || existing.community,
      city: input.city || existing.city,
      region: input.region || existing.region,
      country: input.country || existing.country,
      delivery_notes: input.delivery_notes || existing.delivery_notes,
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
    community: input.community || null,
    city: input.city || null,
    region: input.region || null,
    country: input.country || "Trinidad and Tobago",
    delivery_notes: input.delivery_notes || null,
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
  return { ...settings, delivery_rates: { ...settings.delivery_rates } };
}

export async function demoUpdateSettings(input: Partial<Settings>, userId?: string) {
  const state = store();
  state.settings = { ...state.settings, ...input, delivery_rates: { ...state.settings.delivery_rates, ...input.delivery_rates } };
  demoAuditLog("settings:update", "settings", "global", input, userId, state);
  return demoGetSettings();
}

export async function demoListUsers(role?: string) {
  return store().users.filter((user) => user.active && (!role || user.role === role)).map((user) => ({ ...user }));
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

export async function demoCreateOrder(payload: CheckoutPayload, userId?: string) {
  const state = store();
  const settings = state.settings;
  const orderId = id("ord");
  const orderNumber = String(++state.orderCounter);
  const receiptNumber = `R-${++state.receiptCounter}`;
  const delivery = payload.delivery || {};
  const customerInput: CustomerInput = {
    ...payload.customer,
    street_address: delivery.street_address || payload.customer?.street_address,
    community: delivery.community || payload.customer?.community,
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
        community: customer.community,
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
    if ((payload.status || "completed") !== "draft") {
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
  const address = buildAddress([snapshot.street_address, snapshot.community, snapshot.city, snapshot.region, snapshot.country]);
  const wazeLink = buildWazeLink({
    latitude: delivery.latitude,
    longitude: delivery.longitude,
    locationLink: delivery.location_link,
    address
  });
  const paymentLink = buildPaymentLink(settings, orderNumber, receiptNumber, total, payload.payment_method, snapshot);
  const createdAt = new Date().toISOString();
  const order: Order = {
    id: orderId,
    order_number: orderNumber,
    customer_id: customer?.id || null,
    customer_snapshot: snapshot,
    order_type: payload.order_type,
    status: payload.status || "completed",
    payment_method: payload.payment_method,
    payment_status: paymentStatus,
    delivery_status: deliveryStatus,
    assigned_driver_id: payload.assigned_driver_id || null,
    assigned_driver_name: payload.assigned_driver_id ? state.users.find((user) => user.id === payload.assigned_driver_id)?.name || null : null,
    subtotal,
    discount_total: discountTotal,
    tax_total: taxTotal,
    service_fee: serviceFee,
    delivery_fee: deliveryFee,
    total,
    loyalty_points_earned: customer && settings.loyalty_enabled ? Math.floor(total * settings.loyalty_points_per_ttd) : 0,
    loyalty_points_redeemed: 0,
    notes: payload.notes || null,
    delivery_latitude: delivery.latitude ?? null,
    delivery_longitude: delivery.longitude ?? null,
    delivery_location_link: delivery.location_link || null,
    waze_link: wazeLink,
    payment_link: paymentLink,
    created_by: payload.created_by || userId || null,
    created_at: createdAt,
    updated_at: createdAt,
    items
  };
  order.whatsapp_business_link = buildWhatsAppLink(settings.whatsapp_business_number, buildOrderWhatsAppMessage(order, settings));
  order.whatsapp_customer_link = buildWhatsAppLink(order.customer_snapshot.phone, buildCustomerConfirmationMessage(order, settings));
  if (customer) {
    customer.total_spent += total;
    customer.orders_count += 1;
    customer.last_order_at = createdAt;
    customer.loyalty_points += order.loyalty_points_earned;
    if (customer.orders_count >= 3 && !customer.tags.includes("Frequent Buyer")) customer.tags.push("Frequent Buyer");
    if (total >= 500 && !customer.tags.includes("VIP")) customer.tags.push("VIP");
    if (paymentStatus !== "paid" && !customer.tags.includes("Owes Balance")) customer.tags.push("Owes Balance");
  }
  state.orders.unshift(order);
  state.receipts[order.id] = receiptNumber;
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
  order.updated_at = new Date().toISOString();
  demoAuditLog("delivery:update_status", "order", orderId, { status }, userId);
  return cloneOrder(order);
}

export async function demoUpdateOrder(orderId: string, input: Partial<Order>, userId?: string) {
  const state = store();
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return null;
  const isCancelling = order.status !== "cancelled" && input.status === "cancelled";
  if (isCancelling && order.status === "completed") {
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
  }
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
        ? store().users.find((user) => user.id === input.assigned_driver_id)?.name || null
        : order.assigned_driver_name,
    notes: input.notes ?? order.notes,
    updated_at: new Date().toISOString()
  });
  demoAuditLog("order:update", "order", orderId, input, userId);
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
