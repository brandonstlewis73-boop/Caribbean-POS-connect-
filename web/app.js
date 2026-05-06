const STORAGE_KEY = "caribbean_pos_connect_static_v1";

const officialBrand = {
  businessName: "Savannah & Sea Retail Ltd.",
  productName: "Caribbean POS Connect",
  tagline: "Point of sale, delivery, loyalty, and customer care for Trinidad and Tobago businesses.",
  phone: "868-555-2190",
  whatsapp: "4437582368",
  email: "hello@savannahsea.tt",
  address: "18 Independence Square, Port of Spain, Trinidad and Tobago",
  hours: "Monday to Saturday, 8:00 AM - 6:00 PM",
  updated: "May 4, 2026"
};

const regions = [
  "Port of Spain",
  "San Fernando",
  "Chaguanas",
  "Arima",
  "Point Fortin",
  "Couva-Tabaquite-Talparo",
  "Diego Martin",
  "San Juan-Laventille",
  "Tunapuna-Piarco",
  "Siparia",
  "Penal-Debe",
  "Princes Town",
  "Mayaro-Rio Claro",
  "Sangre Grande",
  "Tobago"
];

const defaultDeliveryRates = {
  "Port of Spain": 25,
  "San Fernando": 30,
  Chaguanas: 25,
  Arima: 30,
  "Point Fortin": 55,
  "Couva-Tabaquite-Talparo": 35,
  "Diego Martin": 30,
  "San Juan-Laventille": 28,
  "Tunapuna-Piarco": 30,
  Siparia: 50,
  "Penal-Debe": 45,
  "Princes Town": 45,
  "Mayaro-Rio Claro": 60,
  "Sangre Grande": 45,
  Tobago: 75
};

const categories = [
  "Food",
  "Drinks",
  "Snacks",
  "Services",
  "Apparel",
  "Digital services",
  "Custom items"
];

const paymentMethods = [
  "Cash",
  "Card",
  "Bank transfer",
  "PayPal",
  "WiPay",
  "Pay on delivery"
];

const rolePermissions = {
  admin: ["all"],
  manager: ["dashboard", "pos", "orders", "customers", "inventory", "deliveries", "reports"],
  cashier: ["dashboard", "pos", "orders", "customers", "inventory"],
  driver: ["deliveries", "orders"],
  staff: ["dashboard", "pos", "orders", "customers", "inventory"]
};

const navItems = [
  ["dashboard", "DB", "Dashboard"],
  ["pos", "PS", "POS"],
  ["orders", "OR", "Orders"],
  ["customers", "CU", "Customers"],
  ["inventory", "IN", "Inventory"],
  ["deliveries", "DV", "Deliveries"],
  ["reports", "RP", "Reports"],
  ["settings", "ST", "Settings"],
  ["online", "ST", "Store"],
  ["privacy", "PV", "Privacy"],
  ["contact", "CT", "Contact"]
];

let runtime = {
  cart: [],
  onlineCart: [],
  posCategory: "All",
  onlineCategory: "All",
  selectedOrderId: "",
  selectedCustomerId: "",
  lastReceiptOrderId: "",
  lastDocumentMode: "receipt",
  lastOrderId: "",
  search: "",
  values: {}
};

let state = loadState();

function seedState() {
  const now = new Date().toISOString();
  return {
    role: "admin",
    counters: { order: 1024, receipt: 4024 },
    settings: {
      businessName: "Island Bites Cafe",
      phone: "868-555-0100",
      email: "sales@islandbites.test",
      address: "Chaguanas, Trinidad and Tobago",
      currency: "TTD",
      taxEnabled: true,
      taxRate: 12.5,
      serviceFeeEnabled: false,
      serviceFeeRate: 0,
      deliveryFee: 25,
      deliveryRates: { ...defaultDeliveryRates },
      receiptMessage: "Thank you for shopping with us.",
      loyaltyEnabled: true,
      pointsPerTtd: 0.1,
      redeemValuePerPoint: 0.1,
      paymentLinksEnabled: true,
      paymentLinkTemplate:
        "https://pay.example.com/caribbean-pos-connect?order={{order_number}}&amount={{amount}}&phone={{customer_phone}}",
      whatsappEnabled: true,
      whatsappBusinessNumber: "4437582368",
      whatsappCountryCode: "+1",
      whatsappTemplate:
        "New Order - Caribbean POS Connect\n\nOrder #: {{order_number}}\nCustomer: {{customer_name}}\nPhone: {{customer_phone}}\nType: {{type}}\nAddress: {{address}}\nInstructions: {{instructions}}\n\nItems:\n{{items}}\n\nTotal: {{total}}\nPayment: {{payment_method}}\nStatus: {{payment_status}}\nPayment link: {{payment_link}}\n\nWaze:\n{{waze_link}}",
      paymentEnabled: {
        Cash: true,
        Card: true,
        "Bank transfer": true,
        PayPal: true,
        WiPay: true,
        "Pay on delivery": true
      },
      facebookUrl: "https://facebook.com/caribbeanposconnect",
      instagramUrl: "https://instagram.com/caribbeanposconnect"
    },
    staff: [
      { id: "usr_admin", name: "Asha Maharaj", email: "admin@caribbeanpos.test", role: "admin", phone: "868-555-1001" },
      { id: "usr_manager", name: "Devon Baptiste", email: "manager@caribbeanpos.test", role: "manager", phone: "868-555-1002" },
      { id: "usr_cashier", name: "Renee Ali", email: "cashier@caribbeanpos.test", role: "cashier", phone: "868-555-1003" },
      { id: "usr_driver", name: "Malik Charles", email: "driver@caribbeanpos.test", role: "driver", phone: "868-555-1004" },
      { id: "usr_staff", name: "Talia Joseph", email: "staff@caribbeanpos.test", role: "staff", phone: "868-555-1005" }
    ],
    products: [
      product("Jerk Chicken Meal", "FOOD-JERK-001", "740001000001", "Food", 38, 55, 42, 8, "Island Fresh Foods"),
      product("Doubles Pack", "FOOD-DOUB-002", "740001000002", "Food", 6, 12, 80, 15, "Central Curry Supply"),
      product("Sorrel Drink", "DRINK-SOR-003", "740001000003", "Drinks", 6, 15, 30, 10, "Tropical Bev Co"),
      product("Mauby Bottle", "DRINK-MAU-004", "740001000004", "Drinks", 5, 14, 24, 10, "Tropical Bev Co"),
      product("Plantain Chips", "SNACK-PLA-005", "740001000005", "Snacks", 7, 16, 12, 12, "SnackWorks TT"),
      product("Screen Printed Tee", "APP-TEE-006", "740001000006", "Apparel", 48, 120, 18, 5, "Queen Street Apparel"),
      product("Digital Top-Up", "DIG-TOP-007", "740001000007", "Digital services", 45, 50, 999, 100, "Local Digital Services"),
      product("Custom Repair Service", "SERV-REP-008", "740001000008", "Services", 80, 150, 999, 100, "In-house")
    ],
    customers: [
      {
        id: uid("cus"),
        name: "John Doe",
        phone: "868-123-4567",
        email: "john@example.com",
        street: "25 Main Road",
        community: "Montrose",
        city: "Chaguanas",
        region: "Chaguanas",
        country: "Trinidad and Tobago",
        deliveryNotes: "Call when outside",
        preferredPayment: "Cash",
        notes: "Usually orders lunch on Fridays.",
        birthday: "",
        marketingConsent: true,
        loyaltyPoints: 44,
        totalSpent: 440,
        ordersCount: 4,
        lastOrderAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        tags: ["VIP", "Frequent Buyer"]
      },
      {
        id: uid("cus"),
        name: "Priya Singh",
        phone: "868-222-9988",
        email: "priya@example.com",
        street: "7 Coffee Street",
        community: "St. Augustine",
        city: "Tunapuna",
        region: "Tunapuna-Piarco",
        country: "Trinidad and Tobago",
        deliveryNotes: "Leave at reception",
        preferredPayment: "WiPay",
        notes: "",
        birthday: "",
        marketingConsent: true,
        loyaltyPoints: 18,
        totalSpent: 180,
        ordersCount: 2,
        lastOrderAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        tags: ["New Customer"]
      }
    ],
    orders: [],
    notifications: [],
    contactMessages: [],
    stockMovements: [],
    auditLogs: [{ id: uid("aud"), action: "demo:init", entity: "system", at: now }]
  };
}

function product(name, sku, barcode, category, cost, price, stock, low, supplier) {
  return {
    id: uid("prd"),
    name,
    sku,
    barcode,
    category,
    cost,
    price,
    stock,
    low,
    supplier,
    supplierPhone: "868-555-2000",
    image: "",
    active: true
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.settings && saved.products) return applyOfficialBrand(saved);
  } catch (_) {}
  return applyOfficialBrand(seedState());
}

function applyOfficialBrand(data) {
  data.settings = data.settings || {};
  if (!data.settings.businessName || ["Island Bites Cafe", "Caribbean POS Connect Demo"].includes(data.settings.businessName)) {
    data.settings.businessName = officialBrand.businessName;
  }
  if (!data.settings.phone || data.settings.phone === "868-555-0100") data.settings.phone = officialBrand.phone;
  if (!data.settings.email || data.settings.email === "sales@islandbites.test") data.settings.email = officialBrand.email;
  if (!data.settings.address || data.settings.address === "Chaguanas, Trinidad and Tobago") data.settings.address = officialBrand.address;
  if (
    !data.settings.whatsappBusinessNumber ||
    ["18681234567", "18685552190"].includes(cleanPhone(data.settings.whatsappBusinessNumber))
  ) {
    data.settings.whatsappBusinessNumber = officialBrand.whatsapp;
  }
  data.settings.deliveryRates = { ...defaultDeliveryRates, ...(data.settings.deliveryRates || {}) };
  if (typeof data.settings.paymentLinksEnabled !== "boolean") data.settings.paymentLinksEnabled = true;
  if (!data.settings.paymentLinkTemplate) {
    data.settings.paymentLinkTemplate =
      "https://pay.example.com/caribbean-pos-connect?order={{order_number}}&amount={{amount}}&phone={{customer_phone}}";
  }
  if (data.settings.whatsappTemplate && !data.settings.whatsappTemplate.includes("{{payment_link}}")) {
    data.settings.whatsappTemplate = data.settings.whatsappTemplate.replace("Status: {{payment_status}}", "Status: {{payment_status}}\nPayment link: {{payment_link}}");
  }
  if (!data.settings.facebookUrl) data.settings.facebookUrl = "https://facebook.com/caribbeanposconnect";
  if (!data.settings.instagramUrl) data.settings.instagramUrl = "https://instagram.com/caribbeanposconnect";
  data.contactMessages = data.contactMessages || [];
  data.notifications = data.notifications || [];
  return data;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function money(value) {
  return `TT$${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanPhone(input) {
  let digits = String(input || "").replace(/[^\d]/g, "");
  if (digits.length === 7) digits = `1868${digits}`;
  if (digits.length === 10 && digits.startsWith("868")) digits = `1${digits}`;
  if (digits.length === 10 && !digits.startsWith("868")) digits = `1${digits}`;
  if (digits.length === 8 && digits.startsWith("1")) digits = `1868${digits.slice(1)}`;
  return digits;
}

function addressText(customer) {
  return [customer.street, customer.community, customer.city, customer.region, customer.country || "Trinidad and Tobago"]
    .filter(Boolean)
    .join(", ");
}

function coordinatesFromLocationLink(link) {
  const value = String(link || "").trim();
  if (!value) return null;
  const patterns = [
    /[?&](?:ll|q|query|destination|daddr)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:[/?#]|$)/
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return { lat: match[1], lng: match[2] };
  }
  return null;
}

function buildWazeLink(customer, lat, lng, locationLink = "") {
  const sharedCoordinates = coordinatesFromLocationLink(locationLink || customer.locationLink);
  const finalLat = lat || sharedCoordinates?.lat;
  const finalLng = lng || sharedCoordinates?.lng;
  if (Number.isFinite(Number(finalLat)) && Number.isFinite(Number(finalLng)) && finalLat !== "" && finalLng !== "") {
    return `https://waze.com/ul?ll=${finalLat},${finalLng}&navigate=yes`;
  }
  if (String(locationLink || customer.locationLink || "").includes("waze.com/ul")) {
    return String(locationLink || customer.locationLink).trim();
  }
  const address = addressText(customer);
  return address ? `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes` : "";
}

function safeExternalUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function storefrontUrl() {
  return `${location.href.split("#")[0]}#online`;
}

function facebookShareLink() {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storefrontUrl())}`;
}

function whatsappLink(phone, message) {
  const cleaned = cleanPhone(phone);
  return cleaned ? `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}` : "";
}

function buildPaymentLink(order) {
  if (!state.settings.paymentLinksEnabled) return "";
  let template = String(state.settings.paymentLinkTemplate || "").trim();
  if (!template) return "";
  const data = {
    order_number: order.number,
    receipt_number: order.receipt,
    amount: Number(order.total || 0).toFixed(2),
    total: Number(order.total || 0).toFixed(2),
    total_label: money(order.total),
    customer_name: order.customer.name || "",
    customer_phone: cleanPhone(order.customer.phone),
    payment_method: order.paymentMethod
  };
  Object.entries(data).forEach(([key, value]) => {
    template = template.replaceAll(`{{${key}}}`, encodeURIComponent(value));
  });
  return safeExternalUrl(template);
}

function paymentLinkForOrder(order) {
  return order.paymentLink || buildPaymentLink(order);
}

function orderWhatsappMessage(order) {
  const items = order.items.map((item) => `${item.qty} x ${item.name} - ${money(item.total)}`).join("\n");
  const customer = order.customer;
  const data = {
    "{{order_number}}": order.number,
    "{{customer_name}}": customer.name || "Walk-in customer",
    "{{customer_phone}}": customer.phone || "",
    "{{type}}": order.type === "delivery" ? "Delivery" : order.type === "pickup" ? "Pickup" : "In-store",
    "{{address}}": addressText(customer),
    "{{instructions}}": customer.deliveryNotes || "",
    "{{items}}": items,
    "{{total}}": money(order.total),
    "{{payment_method}}": order.paymentMethod,
    "{{payment_status}}": order.paymentStatus,
    "{{payment_link}}": order.paymentLink || "",
    "{{location_link}}": order.locationLink || "",
    "{{waze_link}}": order.wazeLink || ""
  };
  let template = state.settings.whatsappTemplate || "";
  Object.entries(data).forEach(([key, value]) => {
    template = template.replaceAll(key, value);
  });
  return template;
}

function customerConfirmationMessage(order) {
  return `Hi ${order.customer.name || "there"}, your order #${order.number} was received. Total: ${money(order.total)}. We will contact you shortly. - ${state.settings.businessName}`;
}

function customerReceiptMessage(order) {
  const lines = order.items.map((item) => `${item.qty} x ${item.name} - ${money(item.total)}`).join("\n");
  return [
    `Receipt ${order.receipt} - ${state.settings.businessName}`,
    "",
    `Order #${order.number}`,
    `Type: ${orderTypeLabel(order.type)}`,
    `Customer: ${order.customer.name || "Customer"}`,
    "",
    "Items:",
    lines,
    "",
    `Total: ${money(order.total)}`,
    `Payment: ${order.paymentMethod}`,
    `Status: ${order.paymentStatus}`,
    paymentLinkForOrder(order) ? `Payment link: ${paymentLinkForOrder(order)}` : null,
    order.type === "delivery" ? `Delivery: ${order.deliveryStatus.replaceAll("_", " ")}` : null,
    order.wazeLink ? `Waze: ${order.wazeLink}` : null,
    "",
    state.settings.receiptMessage
  ]
    .filter(Boolean)
    .join("\n");
}

function canAccess(section) {
  if (["online", "privacy", "contact"].includes(section)) return true;
  const permissions = rolePermissions[state.role] || [];
  return permissions.includes("all") || permissions.includes(section);
}

function sectionFromHash() {
  return (location.hash || "#dashboard").replace("#", "");
}

function setTitle(section) {
  const item = navItems.find((entry) => entry[0] === section);
  document.getElementById("page-title").textContent = item ? item[2] : "Dashboard";
}

function orderTypeLabel(type) {
  return type === "delivery" ? "Delivery" : type === "pickup" ? "Pickup" : "In-store";
}

function renderNav() {
  const current = sectionFromHash();
  document.getElementById("nav").innerHTML = navItems
    .filter(([section]) => canAccess(section))
    .map(([section, icon, label]) => `<a class="${current === section ? "active" : ""}" href="#${section}"><span>${icon}</span>${label}</a>`)
    .join("");
}

function updateNotificationBadge() {
  const badge = document.getElementById("notification-count");
  if (!badge) return;
  const unread = (state.notifications || []).filter((entry) => !entry.read).length;
  badge.textContent = unread ? String(Math.min(unread, 99)) : "0";
  badge.classList.toggle("empty", unread === 0);
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

function pushNotification(title, message, orderId = "") {
  state.notifications = state.notifications || [];
  state.notifications.unshift({
    id: uid("ntf"),
    title,
    message,
    orderId,
    read: false,
    createdAt: new Date().toISOString()
  });
  state.notifications = state.notifications.slice(0, 40);
  updateNotificationBadge();
}

function currentStaff() {
  return state.staff.find((user) => user.role === state.role) || state.staff[0];
}

function deliveryRateForRegion(region) {
  const rates = state.settings.deliveryRates || {};
  const value = rates[region];
  return Number.isFinite(Number(value)) ? Number(value) : Number(state.settings.deliveryFee || 0);
}

function deliveryLineLabel(orderType, region) {
  return orderType === "delivery" && region ? `Delivery (${region})` : "Delivery";
}

function calcTotals(cart, orderType, discount = 0, region = "") {
  const subtotal = cart.reduce((sum, item) => {
    const product = state.products.find((entry) => entry.id === item.productId);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
  const taxable = Math.max(0, subtotal - Number(discount || 0));
  const tax = state.settings.taxEnabled ? taxable * (Number(state.settings.taxRate) / 100) : 0;
  const serviceFee = state.settings.serviceFeeEnabled ? taxable * (Number(state.settings.serviceFeeRate) / 100) : 0;
  const deliveryFee = orderType === "delivery" ? deliveryRateForRegion(region) : 0;
  return {
    subtotal: round(subtotal),
    discount: round(discount),
    tax: round(tax),
    serviceFee: round(serviceFee),
    deliveryFee: round(deliveryFee),
    total: round(taxable + tax + serviceFee + deliveryFee)
  };
}

function round(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function upsertCustomer(input, orderTotal) {
  if (!input.name && !input.phone && !input.email) return null;
  const normalized = cleanPhone(input.phone);
  let customer = state.customers.find((entry) => cleanPhone(entry.phone) === normalized && normalized);
  if (!customer) {
    customer = {
      id: uid("cus"),
      name: input.name || "Customer",
      phone: input.phone || "",
      email: input.email || "",
      street: input.street || "",
      community: input.community || "",
      city: input.city || "",
      region: input.region || "Chaguanas",
      country: input.country || "Trinidad and Tobago",
      deliveryNotes: input.deliveryNotes || "",
      preferredPayment: input.preferredPayment || "",
      notes: input.notes || "",
      birthday: input.birthday || "",
      marketingConsent: Boolean(input.marketingConsent),
      loyaltyPoints: 0,
      totalSpent: 0,
      ordersCount: 0,
      lastOrderAt: "",
      tags: ["New Customer"]
    };
    state.customers.unshift(customer);
  }

  Object.assign(customer, {
    name: input.name || customer.name,
    phone: input.phone || customer.phone,
    email: input.email || customer.email,
    street: input.street || customer.street,
    community: input.community || customer.community,
    city: input.city || customer.city,
    region: input.region || customer.region,
    country: input.country || customer.country || "Trinidad and Tobago",
    deliveryNotes: input.deliveryNotes || customer.deliveryNotes,
    locationLink: input.locationLink || customer.locationLink,
    preferredPayment: input.preferredPayment || customer.preferredPayment,
    notes: input.notes || customer.notes,
    birthday: input.birthday || customer.birthday,
    marketingConsent: input.marketingConsent ?? customer.marketingConsent
  });

  const earned = state.settings.loyaltyEnabled ? Math.floor(orderTotal * Number(state.settings.pointsPerTtd || 0)) : 0;
  customer.totalSpent = round(Number(customer.totalSpent || 0) + orderTotal);
  customer.ordersCount = Number(customer.ordersCount || 0) + 1;
  customer.lastOrderAt = new Date().toISOString();
  customer.loyaltyPoints = Number(customer.loyaltyPoints || 0) + earned;
  const tags = new Set(customer.tags || []);
  if (customer.ordersCount >= 3) tags.add("Frequent Buyer");
  if (customer.totalSpent >= 500) tags.add("VIP");
  customer.tags = Array.from(tags);
  return { customer, earned };
}

function createOrder({ cart, customer, type, paymentMethod, paymentStatus, discount, driverId, notes, lat, lng, locationLink, source }) {
  if (!cart.length) {
    toast("Add at least one item.");
    return null;
  }

  const totals = calcTotals(cart, type, discount, customer.region);
  const customerResult = upsertCustomer({ ...customer, preferredPayment: paymentMethod, locationLink }, totals.total);
  const customerSnapshot = customerResult ? { ...customerResult.customer } : { ...customer, locationLink, country: "Trinidad and Tobago" };
  const items = cart.map((cartItem) => {
    const product = state.products.find((entry) => entry.id === cartItem.productId);
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      qty: cartItem.qty,
      unitPrice: product.price,
      cost: product.cost,
      total: round(product.price * cartItem.qty)
    };
  });

  items.forEach((item) => {
    const product = state.products.find((entry) => entry.id === item.productId);
    product.stock = Math.max(0, Number(product.stock || 0) - item.qty);
    state.stockMovements.unshift({
      id: uid("mov"),
      productId: item.productId,
      type: "sale",
      delta: -item.qty,
      reason: `Sale order ${state.counters.order + 1}`,
      at: new Date().toISOString()
    });
  });

  state.counters.order += 1;
  state.counters.receipt += 1;
  const wazeLink = type === "delivery" ? buildWazeLink(customerSnapshot, lat, lng, locationLink) : "";
  const order = {
    id: uid("ord"),
    number: String(state.counters.order),
    receipt: `R-${state.counters.receipt}`,
    customerId: customerResult ? customerResult.customer.id : "",
    customer: customerSnapshot,
    items,
    type,
    source: source || "POS",
    status: "completed",
    paymentMethod,
    paymentStatus: paymentStatus || (paymentMethod === "Pay on delivery" ? "unpaid" : "paid"),
    deliveryStatus: type === "delivery" ? (driverId ? "assigned" : "pending") : "not_required",
    driverId: driverId || "",
    notes: notes || "",
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    serviceFee: totals.serviceFee,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    loyaltyEarned: customerResult ? customerResult.earned : 0,
    wazeLink,
    lat: lat || "",
    lng: lng || "",
    locationLink: locationLink || customerSnapshot.locationLink || "",
    createdBy: currentStaff().name,
    createdAt: new Date().toISOString()
  };
  order.paymentLink = buildPaymentLink(order);

  if (state.settings.whatsappEnabled) {
    order.whatsappBusinessLink = whatsappLink(state.settings.whatsappBusinessNumber, orderWhatsappMessage(order));
    order.whatsappCustomerLink = whatsappLink(customerSnapshot.phone, customerConfirmationMessage(order));
  }

  state.orders.unshift(order);
  runtime.lastOrderId = order.id;
  pushNotification(
    `${orderTypeLabel(order.type)} order #${order.number}`,
    `${order.customer.name || "Customer"} - ${money(order.total)} - ${order.paymentStatus}${order.wazeLink ? " - Waze ready" : ""}`,
    order.id
  );
  state.auditLogs.unshift({ id: uid("aud"), action: "order:create", entity: "order", entityId: order.id, at: order.createdAt });
  saveState();
  toast(`Order #${order.number} completed.`);
  return order;
}

function badge(text, tone = "teal") {
  return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
}

function render() {
  const section = sectionFromHash();
  if (!canAccess(section)) {
    location.hash = state.role === "driver" ? "#deliveries" : "#dashboard";
    return;
  }
  renderNav();
  updateNotificationBadge();
  setTitle(section);
  document.getElementById("role-select").value = state.role;
  document.getElementById("sidebar-business").textContent = state.settings.businessName;
  document.getElementById("top-business").textContent = `${state.settings.businessName} - Port of Spain`;
  updateClock();

  const renderers = {
    dashboard: renderDashboard,
    pos: renderPos,
    orders: renderOrders,
    customers: renderCustomers,
    inventory: renderInventory,
    deliveries: renderDeliveries,
    reports: renderReports,
    settings: renderSettings,
    online: renderOnline,
    privacy: renderPrivacy,
    contact: renderContact
  };
  (renderers[section] || renderDashboard)();
}

function updateClock() {
  const timeEl = document.getElementById("clock-time");
  const dateEl = document.getElementById("clock-date");
  if (!timeEl || !dateEl) return;
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  dateEl.textContent = now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function renderDashboard() {
  const stats = reportData();
  main.innerHTML = `
    <section class="grid cols-4">
      ${stat("Daily sales", money(stats.dailySales))}
      ${stat("Weekly sales", money(stats.weeklySales))}
      ${stat("Monthly sales", money(stats.monthlySales))}
      ${stat("Profit estimate", money(stats.profit))}
    </section>
    <section class="split-layout" style="margin-top:14px">
      <div class="panel">
        ${panelHead("Sales trend", "Last 30 days, stored in this browser")}
        <div class="panel-body">${bars(stats.salesSeries, "date", "total")}</div>
      </div>
      <div class="panel">
        ${panelHead("Low stock alerts", "Items at or below reorder level")}
        <div class="list">
          ${state.products
            .filter((p) => p.active && p.stock <= p.low)
            .slice(0, 8)
            .map((p) => `<div class="list-row between"><strong>${escapeHtml(p.name)}</strong>${badge(`${p.stock} left`, p.stock <= 5 ? "red" : "amber")}</div>`)
            .join("") || `<div class="panel-body muted">Inventory is comfortably stocked.</div>`}
        </div>
      </div>
    </section>
    <section class="grid cols-3" style="margin-top:14px">
      <div class="panel">${panelHead("Best selling products")}<div class="panel-body">${bars(stats.bestSellers, "name", "qty")}</div></div>
      <div class="panel">${panelHead("Payment methods")}<div class="panel-body">${bars(stats.paymentBreakdown, "method", "total", true)}</div></div>
      <div class="panel">${panelHead("Top customers")}<div class="panel-body">${bars(stats.topCustomers, "name", "totalSpent", true)}</div></div>
    </section>
  `;
}

function stat(label, value) {
  return `<div class="stat"><label>${label}</label><strong>${value}</strong></div>`;
}

function compactStat(label, value, icon, tone = "") {
  return `<div class="stat compact ${tone}"><span class="stat-icon">${icon}</span><span><label>${label}</label><strong>${value}</strong></span></div>`;
}

function panelHead(title, description = "", action = "") {
  return `<div class="panel-head"><div><h2>${escapeHtml(title)}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div>${action}</div>`;
}

function bars(rows, labelKey, valueKey, asMoney = false) {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  return `<div class="mini-bars">${
    rows.length
      ? rows
          .map((row) => {
            const value = Number(row[valueKey] || 0);
            return `<div class="bar-row"><span>${escapeHtml(row[labelKey])}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (value / max) * 100)}%"></div></div><strong>${asMoney ? money(value) : value}</strong></div>`;
          })
          .join("")
      : `<p class="muted">No data yet.</p>`
  }</div>`;
}

function renderPos() {
  const query = document.getElementById("pos-search")?.value || "";
  const filtered = filterProducts(query, runtime.posCategory);
  const type = getValue("pos-type", "in_store");
  const region = getValue("pos-region", "Chaguanas");
  const totals = calcTotals(runtime.cart, type, Number(getValue("pos-discount", "0")), region);
  const stats = reportData();
  const lowStockCount = state.products.filter((product) => product.active && product.stock <= product.low).length;
  const deliveryQueue = state.orders.filter((order) => order.type === "delivery" && order.deliveryStatus !== "delivered").length;
  main.innerHTML = `
    <section class="pos-layout">
      <div class="grid">
        <div class="official-strip">
          ${compactStat("Today's sales", money(stats.dailySales), "$")}
          ${compactStat("Low stock items", lowStockCount, "BOX", "orange")}
          ${compactStat("Delivery queue", deliveryQueue, "GO", "green")}
        </div>
        <div class="panel">
          <div class="panel-body">
            <div class="search-row">
              <input id="pos-search" class="search-input" placeholder="Search by product, SKU, barcode, or category" value="${escapeHtml(query)}" oninput="renderPos()" />
              <button class="button primary" type="button">Scan barcode</button>
            </div>
            <div class="category-tabs" style="margin-top:12px">${categoryButtons("pos")}</div>
          </div>
        </div>
        <div class="product-grid">
          ${filtered.map(productCard).join("")}
        </div>
      </div>
      <aside class="grid">
        ${renderCartPanel(totals, type, region)}
        ${renderCustomerPanel()}
        ${renderPaymentPanel()}
      </aside>
    </section>
  `;
}

function filterProducts(query, category) {
  const q = String(query || "").toLowerCase().trim();
  return state.products.filter((product) => {
    if (!product.active) return false;
    const cat = category === "All" || product.category === category;
    const match = !q || [product.name, product.sku, product.barcode, product.category].join(" ").toLowerCase().includes(q);
    return cat && match;
  });
}

function categoryButtons(scope) {
  const current = scope === "online" ? runtime.onlineCategory : runtime.posCategory;
  return ["All", ...categories]
    .map((category) => `<button class="button secondary ${current === category ? "active" : ""}" type="button" onclick="setCategory('${scope}','${escapeAttr(category)}')">${escapeHtml(category)}</button>`)
    .join("");
}

function escapeAttr(value) {
  return String(value).replaceAll("'", "\\'");
}

function productCard(product, scope = "pos") {
  const art = productArt(product);
  return `
    <button class="product-card" type="button" onclick="${scope === "online" ? "addOnlineCart" : "addCart"}('${product.id}')">
      <div class="product-art ${art.className}"><strong>${art.icon}</strong><span class="product-stock">${badge(product.stock <= product.low ? `${product.stock}` : `${product.stock}`, product.stock <= product.low ? "red" : "green")}</span></div>
      <h3>${escapeHtml(product.name)}</h3>
      <p class="small">${escapeHtml(product.sku)}</p>
      <p class="price">${money(product.price)}</p>
    </button>
  `;
}

function productArt(product) {
  const name = product.name.toLowerCase();
  const category = product.category.toLowerCase();
  if (category.includes("drink")) return { className: "drinks", icon: name.includes("sorrel") ? "SOR" : name.includes("mauby") ? "MAU" : "DR" };
  if (category.includes("snack")) return { className: "snacks", icon: "SN" };
  if (category.includes("apparel")) return { className: "apparel", icon: "TEE" };
  if (category.includes("digital")) return { className: "digital", icon: "DIG" };
  if (category.includes("service")) return { className: "services", icon: "SV" };
  if (name.includes("doubles")) return { className: "food", icon: "DBL" };
  if (name.includes("jerk")) return { className: "food", icon: "JRK" };
  if (name.includes("chicken")) return { className: "food", icon: "CHK" };
  return { className: "food", icon: "FD" };
}

function renderCartPanel(totals, type, region) {
  return `
    <div class="panel">
      ${panelHead("Cart", `${runtime.cart.length} lines selected`)}
      <div class="cart-list">
        ${
          runtime.cart.length
            ? runtime.cart
                .map((item) => {
                  const product = state.products.find((entry) => entry.id === item.productId);
                  return `<div class="cart-item"><div class="cart-title"><strong>${escapeHtml(product.name)}</strong><button class="icon-button" type="button" onclick="removeCart('${item.productId}')">x</button></div><div class="between"><div class="qty"><button type="button" onclick="qtyCart('${item.productId}',-1)">-</button><span>${item.qty}</span><button type="button" onclick="qtyCart('${item.productId}',1)">+</button></div><strong>${money(product.price * item.qty)}</strong></div></div>`;
                })
                .join("")
            : `<div class="panel-body muted">Tap products to build the sale.</div>`
        }
      </div>
      <div class="panel-body grid">
        <label class="field">Discount<input id="pos-discount" type="number" min="0" step="0.01" value="${getValue("pos-discount", "0")}" oninput="renderPos()" /></label>
      </div>
      <div class="totals">
        ${totalLine("Subtotal", totals.subtotal)}
        ${totalLine("Discount", -totals.discount)}
        ${totalLine("Tax/Fee", totals.tax + totals.serviceFee)}
        ${totalLine(deliveryLineLabel(type, region), totals.deliveryFee)}
        <div class="total-line grand"><span>Total</span><span>${money(totals.total)}</span></div>
      </div>
    </div>
  `;
}

function renderCustomerPanel() {
  const type = getValue("pos-type", "in_store");
  return `
    <div class="panel">
      ${panelHead("Customer and fulfillment")}
      <div class="panel-body grid">
        <div class="segmented">
          ${segment("pos-type", "in_store", "In-store", type)}
          ${segment("pos-type", "pickup", "Pickup", type)}
          ${segment("pos-type", "delivery", "Delivery", type)}
        </div>
        <label class="field">Phone lookup<input id="pos-phone" value="${escapeHtml(getValue("pos-phone"))}" oninput="loadCustomerByPhone(this.value)" /></label>
        <label class="field">Customer name<input id="pos-name" value="${escapeHtml(getValue("pos-name"))}" /></label>
        <label class="field">Email<input id="pos-email" type="email" value="${escapeHtml(getValue("pos-email"))}" /></label>
        ${
          type === "delivery"
            ? `
          <div class="delivery-focus">
            <div class="delivery-focus-head">
              <strong>Delivery route</strong>
              <span>Waze link generated on receipt</span>
            </div>
            <label class="field">Street address<input id="pos-street" value="${escapeHtml(getValue("pos-street"))}" /></label>
            <div class="grid cols-2">
              <label class="field">Area/community<input id="pos-community" value="${escapeHtml(getValue("pos-community"))}" /></label>
              <label class="field">City/town<input id="pos-city" value="${escapeHtml(getValue("pos-city"))}" /></label>
            </div>
            <label class="field">Region/corporation<select id="pos-region" onchange="renderPos()">${regionOptions(getValue("pos-region", "Chaguanas"))}</select></label>
            <label class="field">Customer location link<input id="pos-location-link" placeholder="Paste shared Waze or map link" value="${escapeHtml(getValue("pos-location-link"))}" /></label>
            <div class="grid cols-2">
              <label class="field">Latitude<input id="pos-lat" value="${escapeHtml(getValue("pos-lat"))}" /></label>
              <label class="field">Longitude<input id="pos-lng" value="${escapeHtml(getValue("pos-lng"))}" /></label>
            </div>
            <label class="field">Delivery instructions<textarea id="pos-delivery-notes">${escapeHtml(getValue("pos-delivery-notes"))}</textarea></label>
            <div class="action-row">
              <button class="button secondary" type="button" onclick="capturePosLocation()">Use device GPS</button>
              <button class="button secondary" type="button" onclick="previewPosWaze()">Preview Waze</button>
            </div>
          </div>
          <label class="field">Assign driver<select id="pos-driver"><option value="">Unassigned</option>${driverOptions(getValue("pos-driver"))}</select></label>`
            : ""
        }
        <label class="field">Notes<textarea id="pos-notes">${escapeHtml(getValue("pos-notes"))}</textarea></label>
        <label class="checkbox-field"><input id="pos-consent" type="checkbox" ${getChecked("pos-consent")} />Customer agrees to receive optional marketing messages. Data is stored for receipts, delivery, loyalty, order history, and service.</label>
      </div>
    </div>
  `;
}

function renderPaymentPanel() {
  const payment = getValue("pos-payment", "Cash");
  return `
    <div class="panel">
      ${panelHead("Payment")}
      <div class="panel-body grid">
        <div class="grid cols-2">
          ${paymentMethods
            .filter((method) => state.settings.paymentEnabled[method])
            .map((method) => `<button class="button pay ${payment === method ? "active" : ""}" type="button" onclick="setPayment('${escapeAttr(method)}')">${escapeHtml(method)}</button>`)
            .join("")}
        </div>
        <label class="field">Payment status<select id="pos-payment-status"><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option></select></label>
        <button class="button primary" type="button" onclick="completeSale()">Complete sale</button>
      </div>
    </div>
  `;
}

function segment(id, value, label, selected) {
  const renderer = id.startsWith("online-") ? "renderOnline" : "renderPos";
  return `<button type="button" class="${selected === value ? "active" : ""}" onclick="setInputValue('${id}','${value}'); ${renderer}()">${label}</button>`;
}

function totalLine(label, value) {
  return `<div class="total-line"><span>${label}</span><strong>${money(value)}</strong></div>`;
}

function getValue(id, fallback = "") {
  const el = document.getElementById(id);
  return el ? el.value : runtime.values[id] ?? fallback;
}

function setInputValue(id, value) {
  runtime.values[id] = value;
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function getChecked(id) {
  const el = document.getElementById(id);
  return el && el.checked ? "checked" : "";
}

function regionOptions(selected) {
  return regions.map((region) => `<option ${selected === region ? "selected" : ""}>${escapeHtml(region)}</option>`).join("");
}

function driverOptions(selected) {
  return state.staff
    .filter((user) => user.role === "driver")
    .map((user) => `<option value="${user.id}" ${selected === user.id ? "selected" : ""}>${escapeHtml(user.name)}</option>`)
    .join("");
}

function driverName(driverId) {
  return state.staff.find((user) => user.id === driverId)?.name || "";
}

function setCategory(scope, category) {
  if (scope === "online") runtime.onlineCategory = category;
  else runtime.posCategory = category;
  render();
}

function addCart(productId) {
  addToCart(runtime.cart, productId);
  renderPos();
}

function addOnlineCart(productId) {
  addToCart(runtime.onlineCart, productId);
  renderOnline();
}

function addToCart(cart, productId) {
  const existing = cart.find((item) => item.productId === productId);
  if (existing) existing.qty += 1;
  else cart.push({ productId, qty: 1 });
}

function qtyCart(productId, delta) {
  updateCartQty(runtime.cart, productId, delta);
  renderPos();
}

function qtyOnlineCart(productId, delta) {
  updateCartQty(runtime.onlineCart, productId, delta);
  renderOnline();
}

function updateCartQty(cart, productId, delta) {
  const item = cart.find((entry) => entry.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart.splice(cart.indexOf(item), 1);
}

function removeCart(productId) {
  runtime.cart = runtime.cart.filter((item) => item.productId !== productId);
  renderPos();
}

function removeOnlineCart(productId) {
  runtime.onlineCart = runtime.onlineCart.filter((item) => item.productId !== productId);
  renderOnline();
}

function setPayment(method) {
  setInputValue("pos-payment", method);
  setInputValue("pos-payment-status", method === "Pay on delivery" ? "unpaid" : "paid");
  renderPos();
}

function loadCustomerByPhone(value) {
  const found = state.customers.find((customer) => cleanPhone(customer.phone).endsWith(cleanPhone(value).slice(-7)));
  if (found) {
    setTimeout(() => {
      setInputValue("pos-name", found.name);
      setInputValue("pos-phone", found.phone);
      setInputValue("pos-email", found.email);
      setInputValue("pos-street", found.street);
      setInputValue("pos-community", found.community);
      setInputValue("pos-city", found.city);
      setInputValue("pos-region", found.region);
      setInputValue("pos-delivery-notes", found.deliveryNotes);
      setInputValue("pos-location-link", found.locationLink);
      toast(`Loaded ${found.name}.`);
    }, 0);
  }
}

function posDeliveryCustomerFromFields() {
  return {
    street: getValue("pos-street"),
    community: getValue("pos-community"),
    city: getValue("pos-city"),
    region: getValue("pos-region", "Chaguanas"),
    country: "Trinidad and Tobago",
    locationLink: getValue("pos-location-link")
  };
}

function capturePosLocation() {
  if (!navigator.geolocation) return toast("GPS is not available in this browser.");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setInputValue("pos-lat", position.coords.latitude);
      setInputValue("pos-lng", position.coords.longitude);
      toast("GPS location added to delivery.");
    },
    () => toast("Could not capture GPS. Manual address still works.")
  );
}

function previewPosWaze() {
  const link = buildWazeLink(posDeliveryCustomerFromFields(), getValue("pos-lat"), getValue("pos-lng"), getValue("pos-location-link"));
  if (!link) return toast("Add an address, GPS coordinates, or customer location link.");
  window.open(link, "_blank", "noopener,noreferrer");
}

function completeSale() {
  const type = getValue("pos-type", "in_store");
  const customer = {
    name: getValue("pos-name"),
    phone: getValue("pos-phone"),
    email: getValue("pos-email"),
    street: getValue("pos-street"),
    community: getValue("pos-community"),
    city: getValue("pos-city"),
    region: getValue("pos-region", "Chaguanas"),
    country: "Trinidad and Tobago",
    deliveryNotes: getValue("pos-delivery-notes"),
    locationLink: getValue("pos-location-link"),
    notes: getValue("pos-notes"),
    marketingConsent: Boolean(document.getElementById("pos-consent")?.checked)
  };
  const order = createOrder({
    cart: runtime.cart,
    customer,
    type,
    paymentMethod: getValue("pos-payment", "Cash"),
    paymentStatus: getValue("pos-payment-status", getValue("pos-payment") === "Pay on delivery" ? "unpaid" : "paid"),
    discount: Number(getValue("pos-discount", "0")),
    driverId: getValue("pos-driver"),
    notes: getValue("pos-notes"),
    lat: getValue("pos-lat"),
    lng: getValue("pos-lng"),
    locationLink: getValue("pos-location-link"),
    source: "POS"
  });
  if (!order) return;
  runtime.cart = [];
  showReceipt(order.id);
  renderPos();
}

function reportData() {
  const now = Date.now();
  const since = (days) => now - days * 86400000;
  const validOrders = state.orders.filter((order) => order.status !== "cancelled");
  const sumSince = (days) => validOrders.filter((order) => new Date(order.createdAt).getTime() >= since(days)).reduce((sum, order) => sum + order.total, 0);
  const profit = validOrders.reduce((sum, order) => sum + order.items.reduce((inner, item) => inner + item.total - item.cost * item.qty, 0), 0);
  const best = {};
  const payments = {};
  const salesByDate = {};
  validOrders.forEach((order) => {
    payments[order.paymentMethod] = (payments[order.paymentMethod] || 0) + order.total;
    const date = order.createdAt.slice(0, 10);
    salesByDate[date] = (salesByDate[date] || 0) + order.total;
    order.items.forEach((item) => {
      best[item.name] = (best[item.name] || 0) + item.qty;
    });
  });
  return {
    dailySales: sumSince(1),
    weeklySales: sumSince(7),
    monthlySales: sumSince(30),
    profit,
    salesSeries: Object.entries(salesByDate).map(([date, total]) => ({ date, total })),
    bestSellers: Object.entries(best).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 8),
    paymentBreakdown: Object.entries(payments).map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total),
    topCustomers: [...state.customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 8)
  };
}

function renderOrders() {
  const q = document.getElementById("order-search")?.value?.toLowerCase() || "";
  const orders = state.orders.filter((order) => {
    if (state.role === "driver" && order.driverId !== currentStaff().id) return false;
    return !q || [order.number, order.customer.name, order.customer.phone, order.paymentMethod, order.type].join(" ").toLowerCase().includes(q);
  });
  runtime.selectedOrderId = runtime.selectedOrderId || orders[0]?.id || "";
  const selected = state.orders.find((order) => order.id === runtime.selectedOrderId) || orders[0];
  main.innerHTML = `
    <section class="split-layout">
      <div class="panel">
        ${panelHead("Orders", "In-store, pickup, delivery, online, completed, cancelled, and draft-style saved orders")}
        <div class="panel-body"><input id="order-search" class="search-input" placeholder="Search order, customer, phone, payment" value="${escapeHtml(q)}" oninput="renderOrders()" /></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>Payment</th><th>Delivery</th><th>Total</th></tr></thead>
            <tbody>${orders.map(orderRow).join("") || `<tr><td colspan="6">No orders yet.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      ${selected ? renderOrderDetail(selected) : ""}
    </section>
  `;
}

function orderRow(order) {
  return `<tr class="clickable" onclick="selectOrder('${order.id}')"><td><strong>#${order.number}</strong><br><span class="small">${new Date(order.createdAt).toLocaleString()}</span></td><td><strong>${escapeHtml(order.customer.name || "Walk-in")}</strong><br><span class="small">${escapeHtml(order.customer.phone || "")}</span></td><td>${escapeHtml(order.type)}</td><td>${badge(order.paymentStatus, order.paymentStatus === "paid" ? "green" : "amber")}<br><span class="small">${escapeHtml(order.paymentMethod)}</span></td><td>${badge(order.deliveryStatus.replaceAll("_", " "), order.deliveryStatus === "delivered" ? "green" : order.deliveryStatus === "not_required" ? "teal" : "amber")}</td><td><strong>${money(order.total)}</strong></td></tr>`;
}

function renderOrderDetail(order) {
  const paymentLink = paymentLinkForOrder(order);
  return `
    <aside class="panel order-detail">
      ${panelHead(`Order #${order.number}`, new Date(order.createdAt).toLocaleString())}
      <div class="panel-body grid">
        <div class="panel-body" style="background:var(--surface-2);border-radius:var(--radius);padding:12px">
          <strong>${escapeHtml(order.customer.name || "Walk-in customer")}</strong>
          <p class="small">${escapeHtml(order.customer.phone || "No phone")}</p>
          <p class="muted">${escapeHtml(addressText(order.customer))}</p>
        </div>
        <div class="grid">${order.items.map((item) => `<div class="between"><span>${item.qty} x ${escapeHtml(item.name)}</span><strong>${money(item.total)}</strong></div>`).join("")}</div>
        <div class="totals" style="padding:0;border-top:0">
          ${totalLine("Subtotal", order.subtotal)}
          ${totalLine("Tax/Fee", order.tax + order.serviceFee)}
          ${totalLine(deliveryLineLabel(order.type, order.customer.region), order.deliveryFee)}
          <div class="total-line grand"><span>Total</span><span>${money(order.total)}</span></div>
        </div>
        <div class="grid cols-2">
          <button class="button success" onclick="updateOrder('${order.id}','paymentStatus','paid')">Mark paid</button>
          <button class="button danger" onclick="updateOrder('${order.id}','status','cancelled')">Cancel</button>
        </div>
        ${
          order.type === "delivery"
            ? `<label class="field">Assigned driver<select onchange="assignDriver('${order.id}',this.value)"><option value="">Unassigned</option>${driverOptions(order.driverId)}</select></label><button class="button primary" onclick="updateOrder('${order.id}','deliveryStatus','out_for_delivery')">Mark out for delivery</button>`
            : ""
        }
        <button class="button secondary" onclick="showReceipt('${order.id}')">View receipt</button>
        ${order.type === "delivery" ? `<button class="button secondary" onclick="showShippingLabel('${order.id}')">Print shipping label</button>` : ""}
        ${paymentLink ? `<a class="button success" target="_blank" rel="noreferrer" href="${paymentLink}">Open payment link</a>` : ""}
        ${order.wazeLink ? `<a class="button primary" target="_blank" rel="noreferrer" href="${order.wazeLink}">Open in Waze</a>` : ""}
        ${order.whatsappCustomerLink ? `<a class="button success" target="_blank" rel="noreferrer" href="${order.whatsappCustomerLink}">WhatsApp customer</a>` : ""}
        ${order.whatsappBusinessLink ? `<a class="button secondary" target="_blank" rel="noreferrer" href="${order.whatsappBusinessLink}">Send order to WhatsApp</a>` : ""}
      </div>
    </aside>
  `;
}

function selectOrder(id) {
  runtime.selectedOrderId = id;
  renderOrders();
}

function updateOrder(id, key, value) {
  const order = state.orders.find((entry) => entry.id === id);
  if (!order) return;
  order[key] = value;
  order.updatedAt = new Date().toISOString();
  state.auditLogs.unshift({ id: uid("aud"), action: `order:${key}`, entity: "order", entityId: id, at: order.updatedAt });
  saveState();
  renderOrders();
}

function assignDriver(id, driverId) {
  const order = state.orders.find((entry) => entry.id === id);
  if (!order) return;
  order.driverId = driverId;
  order.deliveryStatus = driverId ? "assigned" : "pending";
  saveState();
  renderOrders();
}

function showNotifications() {
  const dialog = document.getElementById("notification-dialog");
  const content = document.getElementById("notification-content");
  if (!dialog || !content) return;
  const notifications = state.notifications || [];
  content.innerHTML = notifications.length
    ? notifications
        .map((entry) => {
          const order = state.orders.find((item) => item.id === entry.orderId);
          return `
            <article class="notification-row ${entry.read ? "" : "unread"}">
              <div>
                <strong>${escapeHtml(entry.title)}</strong>
                <p>${escapeHtml(entry.message)}</p>
                <small>${new Date(entry.createdAt).toLocaleString()}</small>
              </div>
              ${order ? `<button class="button secondary" type="button" onclick="openNotificationOrder('${entry.id}','${order.id}')">View receipt</button>` : ""}
            </article>
          `;
        })
        .join("")
    : `<div class="panel-body muted">No notifications yet.</div>`;
  notifications.forEach((entry) => {
    entry.read = true;
  });
  saveState();
  updateNotificationBadge();
  dialog.showModal();
}

function openNotificationOrder(notificationId, orderId) {
  const note = state.notifications.find((entry) => entry.id === notificationId);
  if (note) note.read = true;
  saveState();
  updateNotificationBadge();
  document.getElementById("notification-dialog")?.close();
  showReceipt(orderId);
}

function renderCustomers() {
  const q = document.getElementById("customer-search")?.value?.toLowerCase() || "";
  const customers = state.customers.filter((customer) => !q || [customer.name, customer.phone, customer.email, customer.community, customer.city, customer.region].join(" ").toLowerCase().includes(q));
  runtime.selectedCustomerId = runtime.selectedCustomerId || customers[0]?.id || "";
  const selected = state.customers.find((customer) => customer.id === runtime.selectedCustomerId) || customers[0];
  main.innerHTML = `
    <section class="split-layout" style="grid-template-columns:380px minmax(0,1fr)">
      <div class="panel">
        ${panelHead("Customers", "Profiles connect to receipts, loyalty, delivery, history, and marketing consent")}
        <div class="panel-body"><input id="customer-search" class="search-input" placeholder="Search customers" value="${escapeHtml(q)}" oninput="renderCustomers()" /></div>
        <div class="list">${customers.map((customer) => `<button class="list-row" style="text-align:left;border-left:0;border-right:0;border-top:0;background:transparent;color:var(--ink)" onclick="selectCustomer('${customer.id}')"><strong>${escapeHtml(customer.name)}</strong><span class="small">${escapeHtml(customer.phone || customer.email || "")}</span><span class="small">${escapeHtml(customer.community || customer.city || customer.region || "")}</span></button>`).join("")}</div>
      </div>
      ${selected ? renderCustomerProfile(selected) : ""}
    </section>
  `;
}

function selectCustomer(id) {
  runtime.selectedCustomerId = id;
  renderCustomers();
}

function renderCustomerProfile(customer) {
  const orders = state.orders.filter((order) => order.customerId === customer.id);
  const fav = {};
  orders.forEach((order) => order.items.forEach((item) => (fav[item.name] = (fav[item.name] || 0) + item.qty)));
  const message = `Hi ${customer.name}, thank you for shopping with ${state.settings.businessName}.`;
  return `
    <div class="grid">
      <section class="grid cols-4">
        ${stat("Total spent", money(customer.totalSpent))}
        ${stat("Orders", customer.ordersCount)}
        ${stat("Loyalty points", customer.loyaltyPoints)}
        ${stat("Last order", customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : "None")}
      </section>
      <section class="panel profile-detail">
        ${panelHead("Customer profile", "", `<a class="button success" target="_blank" rel="noreferrer" href="${whatsappLink(customer.phone, message)}">WhatsApp customer</a>`)}
        <div class="panel-body grid cols-2">
          <label class="field">Name<input id="cust-name" value="${escapeHtml(customer.name)}" /></label>
          <label class="field">Phone<input id="cust-phone" value="${escapeHtml(customer.phone)}" /></label>
          <label class="field">Email<input id="cust-email" value="${escapeHtml(customer.email)}" /></label>
          <label class="field">Birthday optional<input id="cust-birthday" type="date" value="${escapeHtml(customer.birthday)}" /></label>
          <label class="field">Street address<input id="cust-street" value="${escapeHtml(customer.street)}" /></label>
          <label class="field">Area/community<input id="cust-community" value="${escapeHtml(customer.community)}" /></label>
          <label class="field">City/town<input id="cust-city" value="${escapeHtml(customer.city)}" /></label>
          <label class="field">Region/corporation<select id="cust-region">${regionOptions(customer.region)}</select></label>
          <label class="field">Delivery notes<textarea id="cust-delivery-notes">${escapeHtml(customer.deliveryNotes)}</textarea></label>
          <label class="field">Notes<textarea id="cust-notes">${escapeHtml(customer.notes)}</textarea></label>
          <label class="checkbox-field"><input id="cust-consent" type="checkbox" ${customer.marketingConsent ? "checked" : ""} />Marketing consent granted</label>
          <button class="button primary" onclick="saveCustomerProfile('${customer.id}')">Save profile</button>
        </div>
      </section>
      <section class="grid cols-2">
        <div class="panel">${panelHead("Tags")}<div class="panel-body action-row">${(customer.tags || []).map((tag) => badge(tag, tag === "Owes Balance" ? "red" : tag === "VIP" ? "teal" : "green")).join("") || `<span class="muted">No tags yet.</span>`}</div></div>
        <div class="panel">${panelHead("Favorite products")}<div class="panel-body">${bars(Object.entries(fav).map(([name, qty]) => ({ name, qty })), "name", "qty")}</div></div>
      </section>
      <section class="panel">${panelHead("Order history")}<div class="list">${orders.map((order) => `<div class="list-row between"><strong>#${order.number}</strong><span class="small">${new Date(order.createdAt).toLocaleString()}</span><strong>${money(order.total)}</strong></div>`).join("") || `<div class="panel-body muted">No order history yet.</div>`}</div></section>
    </div>
  `;
}

function saveCustomerProfile(id) {
  const customer = state.customers.find((entry) => entry.id === id);
  if (!customer) return;
  Object.assign(customer, {
    name: getValue("cust-name"),
    phone: getValue("cust-phone"),
    email: getValue("cust-email"),
    birthday: getValue("cust-birthday"),
    street: getValue("cust-street"),
    community: getValue("cust-community"),
    city: getValue("cust-city"),
    region: getValue("cust-region"),
    deliveryNotes: getValue("cust-delivery-notes"),
    notes: getValue("cust-notes"),
    marketingConsent: Boolean(document.getElementById("cust-consent")?.checked)
  });
  saveState();
  toast("Customer saved.");
  renderCustomers();
}

function renderInventory() {
  const q = document.getElementById("inventory-search")?.value?.toLowerCase() || "";
  const products = state.products.filter((p) => !q || [p.name, p.sku, p.barcode, p.category, p.supplier].join(" ").toLowerCase().includes(q));
  main.innerHTML = `
    <section class="split-layout">
      <div class="panel">
        ${panelHead("Inventory", "Products, categories, SKU, barcode, supplier, stock, and low-stock alerts")}
        <div class="panel-body"><input id="inventory-search" class="search-input" value="${escapeHtml(q)}" placeholder="Search product, SKU, barcode, category" oninput="renderInventory()" /></div>
        <div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Cost</th><th>Price</th><th>Stock</th><th>Supplier</th><th>Adjust</th></tr></thead><tbody>${products.map(productRow).join("")}</tbody></table></div>
      </div>
      <aside class="panel">
        ${panelHead("Add product")}
        <div class="panel-body grid">
          <label class="field">Product name<input id="new-name" /></label>
          <div class="grid cols-2"><label class="field">SKU<input id="new-sku" /></label><label class="field">Barcode<input id="new-barcode" /></label></div>
          <label class="field">Category<select id="new-category">${categories.map((cat) => `<option>${cat}</option>`).join("")}</select></label>
          <div class="grid cols-2"><label class="field">Cost<input id="new-cost" type="number" value="0" /></label><label class="field">Selling price<input id="new-price" type="number" value="0" /></label></div>
          <div class="grid cols-2"><label class="field">Stock<input id="new-stock" type="number" value="0" /></label><label class="field">Low alert<input id="new-low" type="number" value="5" /></label></div>
          <label class="field">Supplier<input id="new-supplier" /></label>
          <button class="button primary" onclick="addProduct()">Save product</button>
        </div>
      </aside>
    </section>
  `;
}

function productRow(product) {
  return `<tr><td><strong>${escapeHtml(product.name)}</strong><br><span class="small">${escapeHtml(product.sku)} - ${escapeHtml(product.barcode)}</span></td><td>${escapeHtml(product.category)}</td><td>${money(product.cost)}</td><td><strong>${money(product.price)}</strong></td><td>${badge(`${product.stock} / alert ${product.low}`, product.stock <= product.low ? "red" : "green")}</td><td>${escapeHtml(product.supplier || "")}</td><td><div class="action-row"><input class="search-input" style="width:90px;min-height:36px" type="number" id="adj-${product.id}" value="0" /><button class="button secondary" onclick="adjustStock('${product.id}')">Apply</button><button class="button danger" onclick="archiveProduct('${product.id}')">Archive</button></div></td></tr>`;
}

function addProduct() {
  const name = getValue("new-name");
  const sku = getValue("new-sku");
  if (!name || !sku) return toast("Product name and SKU are required.");
  state.products.unshift({
    id: uid("prd"),
    name,
    sku,
    barcode: getValue("new-barcode"),
    category: getValue("new-category", "Food"),
    cost: Number(getValue("new-cost", "0")),
    price: Number(getValue("new-price", "0")),
    stock: Number(getValue("new-stock", "0")),
    low: Number(getValue("new-low", "5")),
    supplier: getValue("new-supplier"),
    supplierPhone: "",
    image: "",
    active: true
  });
  saveState();
  toast("Product saved.");
  renderInventory();
}

function adjustStock(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  const delta = Number(getValue(`adj-${productId}`, "0"));
  if (!product || !delta) return;
  product.stock = Math.max(0, Number(product.stock || 0) + delta);
  state.stockMovements.unshift({ id: uid("mov"), productId, type: "manual_adjustment", delta, reason: "Static web adjustment", at: new Date().toISOString() });
  saveState();
  renderInventory();
}

function archiveProduct(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product) return;
  product.active = false;
  saveState();
  renderInventory();
}

function renderDeliveries() {
  const deliveries = state.orders.filter((order) => order.type === "delivery" && (state.role !== "driver" || order.driverId === currentStaff().id));
  main.innerHTML = `<section class="delivery-grid">${deliveries.map(deliveryCard).join("") || `<div class="panel"><div class="panel-body muted">No assigned deliveries right now.</div></div>`}</section>`;
}

function deliveryCard(order) {
  return `
    <article class="delivery-card grid">
      <div class="between"><h2>Delivery #${order.number}</h2>${badge(order.deliveryStatus.replaceAll("_", " "), order.deliveryStatus === "delivered" ? "green" : "amber")}</div>
      <div style="background:var(--surface-2);border-radius:var(--radius);padding:12px">
        <strong>${escapeHtml(order.customer.name)}</strong>
        <p class="small">${escapeHtml(order.customer.phone)}</p>
        <p class="muted">${escapeHtml(addressText(order.customer))}</p>
        <p class="muted">${escapeHtml(order.customer.deliveryNotes || "")}</p>
      </div>
      <div>${order.items.map((item) => `<div class="between"><span>${item.qty} x ${escapeHtml(item.name)}</span><strong>${money(item.total)}</strong></div>`).join("")}</div>
      <div class="grid cols-2">${stat("Payment", `${order.paymentStatus} - ${order.paymentMethod}`)}${stat("Total", money(order.total))}</div>
      <div class="grid cols-2">
        ${order.wazeLink ? `<a class="button primary" target="_blank" rel="noreferrer" href="${order.wazeLink}">Open in Waze</a>` : `<button class="button secondary">No Waze link</button>`}
        ${paymentLinkForOrder(order) ? `<a class="button success" target="_blank" rel="noreferrer" href="${paymentLinkForOrder(order)}">Payment link</a>` : ""}
        ${order.customer.phone ? `<a class="button secondary" href="tel:${order.customer.phone}">Call customer</a>` : ""}
        <button class="button secondary" onclick="showShippingLabel('${order.id}')">Print label</button>
        <button class="button secondary" onclick="updateOrder('${order.id}','deliveryStatus','out_for_delivery'); renderDeliveries()">Out for delivery</button>
        <button class="button success" onclick="updateOrder('${order.id}','deliveryStatus','delivered'); renderDeliveries()">Delivered</button>
      </div>
    </article>
  `;
}

function renderReports() {
  const stats = reportData();
  main.innerHTML = `
    <section class="action-row">
      <button class="button primary" onclick="downloadSalesCsv()">Export sales CSV</button>
      <button class="button secondary" onclick="downloadBackup()">Backup browser database</button>
      <button class="button danger" onclick="resetDemo()">Reset demo data</button>
    </section>
    <section class="grid cols-4" style="margin-top:14px">
      ${stat("Daily sales", money(stats.dailySales))}
      ${stat("Weekly sales", money(stats.weeklySales))}
      ${stat("Monthly sales", money(stats.monthlySales))}
      ${stat("Profit estimate", money(stats.profit))}
    </section>
    <section class="grid cols-3" style="margin-top:14px">
      <div class="panel">${panelHead("Sales by day")}<div class="panel-body">${bars(stats.salesSeries, "date", "total", true)}</div></div>
      <div class="panel">${panelHead("Payment method breakdown")}<div class="panel-body">${bars(stats.paymentBreakdown, "method", "total", true)}</div></div>
      <div class="panel">${panelHead("Cashier performance")}<div class="panel-body">${bars(cashierPerformance(), "name", "total", true)}</div></div>
    </section>
  `;
}

function cashierPerformance() {
  const map = {};
  state.orders.forEach((order) => {
    map[order.createdBy] = (map[order.createdBy] || 0) + order.total;
  });
  return Object.entries(map).map(([name, total]) => ({ name, total }));
}

function renderSettings() {
  const s = state.settings;
  main.innerHTML = `
    <section class="split-layout">
      <div class="grid">
        <div class="panel">${panelHead("Business profile")}<div class="panel-body grid cols-2">
          ${settingsInput("Business name", "set-business", s.businessName)}
          ${settingsInput("Phone", "set-phone", s.phone)}
          ${settingsInput("Email", "set-email", s.email)}
          ${settingsInput("Address", "set-address", s.address)}
          ${settingsInput("Currency", "set-currency", s.currency, "readonly")}
        </div></div>
        <div class="panel">${panelHead("Tax, fees, receipt, and loyalty")}<div class="panel-body grid cols-2">
          ${settingsCheck("Enable tax/service fee line", "set-tax-enabled", s.taxEnabled)}
          ${settingsInput("Tax/Fee rate %", "set-tax-rate", s.taxRate, "number")}
          ${settingsCheck("Enable service fee", "set-service-enabled", s.serviceFeeEnabled)}
          ${settingsInput("Service fee rate %", "set-service-rate", s.serviceFeeRate, "number")}
          ${settingsInput("Default delivery fee", "set-delivery-fee", s.deliveryFee, "number")}
          ${settingsCheck("Enable loyalty", "set-loyalty-enabled", s.loyaltyEnabled)}
          ${settingsInput("Points per TTD", "set-points", s.pointsPerTtd, "number")}
          ${settingsInput("TTD value per point", "set-redeem", s.redeemValuePerPoint, "number")}
          <label class="field">Receipt message<textarea id="set-receipt">${escapeHtml(s.receiptMessage)}</textarea></label>
        </div></div>
        <div class="panel">${panelHead("Delivery rates by location", "Set the delivery fee for each Trinidad and Tobago region.")}
          <div class="panel-body rate-grid">
            ${deliveryRateInputs()}
          </div>
        </div>
        <div class="panel">${panelHead("Payment links", "Generated links are shown on orders and receipts. Connect this template to WiPay, PayPal, or your provider.")}
          <div class="panel-body grid">
            ${settingsCheck("Generate payment links", "set-payment-links-enabled", s.paymentLinksEnabled)}
            <label class="field">Payment link template<textarea id="set-payment-template">${escapeHtml(s.paymentLinkTemplate)}</textarea></label>
            <p class="small">Variables: {{order_number}}, {{receipt_number}}, {{amount}}, {{total}}, {{total_label}}, {{customer_name}}, {{customer_phone}}, {{payment_method}}</p>
          </div>
        </div>
        <div class="panel">${panelHead("WhatsApp orders", "Click-to-chat links only; messages are not sent automatically.")}
          <div class="panel-body grid">
            ${settingsCheck("Receive orders on WhatsApp", "set-wa-enabled", s.whatsappEnabled)}
            <div class="grid cols-2">${settingsInput("Business WhatsApp number", "set-wa-number", s.whatsappBusinessNumber)}${settingsInput("Default country code", "set-wa-code", s.whatsappCountryCode)}</div>
            <label class="field">Custom WhatsApp message template<textarea id="set-wa-template">${escapeHtml(s.whatsappTemplate)}</textarea></label>
            <p class="small">Variables: {{order_number}}, {{customer_name}}, {{customer_phone}}, {{address}}, {{items}}, {{total}}, {{payment_method}}, {{payment_status}}, {{payment_link}}, {{location_link}}, {{waze_link}}</p>
          </div>
        </div>
      </div>
      <aside class="grid">
        <div class="panel">${panelHead("Social storefront", "Profile and sharing links for Facebook and Instagram.")}
          <div class="panel-body grid">
            ${settingsInput("Facebook page URL", "set-facebook-url", s.facebookUrl)}
            ${settingsInput("Instagram profile URL", "set-instagram-url", s.instagramUrl)}
            <div class="action-row">
              ${s.facebookUrl ? `<a class="button secondary" target="_blank" rel="noreferrer" href="${safeExternalUrl(s.facebookUrl)}">Open Facebook</a>` : ""}
              ${s.instagramUrl ? `<a class="button secondary" target="_blank" rel="noreferrer" href="${safeExternalUrl(s.instagramUrl)}">Open Instagram</a>` : ""}
              <a class="button primary" target="_blank" rel="noreferrer" href="${facebookShareLink()}">Share storefront</a>
            </div>
            <p class="small">This version opens social links for review. It does not auto-post to Facebook or Instagram.</p>
          </div>
        </div>
        <div class="panel">${panelHead("Staff and roles")}<div class="list">${state.staff.map((user) => `<div class="list-row between"><div><strong>${escapeHtml(user.name)}</strong><br><span class="small">${escapeHtml(user.email)}</span></div>${badge(user.role, user.role === "admin" ? "teal" : "green")}</div>`).join("")}</div></div>
        <div class="panel">${panelHead("Privacy and safety")}<div class="panel-body grid"><p class="muted">This static web version stores customer and order data in this browser only using localStorage.</p><p class="muted">The full-stack version in the main project includes hashed passwords, API permissions, sessions, and audit logs.</p></div></div>
        <button class="button primary" onclick="saveSettings()">Save settings</button>
      </aside>
    </section>
  `;
}

function brandLogoMarkup(extraClass = "") {
  return `
    <img class="brand-logo-img ${extraClass}" src="./assets/caribbean-pos-connect-logo.svg" alt="Caribbean POS Connect logo" />
  `;
}

function renderPrivacy() {
  main.innerHTML = `
    <section class="official-page">
      <div class="official-hero panel">
        <div class="official-identity">
          ${brandLogoMarkup("brand-mark-large")}
          <div>
            <p class="country-label">Privacy Policy</p>
            <h2>${officialBrand.businessName}</h2>
            <p>${officialBrand.tagline}</p>
            <span class="badge teal">Last updated ${officialBrand.updated}</span>
          </div>
        </div>
      </div>

      <div class="policy-layout">
        <article class="panel policy-content">
          ${panelHead("Privacy Policy", "How customer and business information is handled in this web version.")}
          <div class="panel-body">
            <h3>1. Information we collect</h3>
            <p>Savannah & Sea Retail Ltd. uses Caribbean POS Connect to collect the information needed to process sales, pickup orders, delivery orders, receipts, loyalty, customer service, and business reporting.</p>
            <ul>
              <li>Customer name, phone number, email, address, area/community, city, region, and delivery instructions.</li>
              <li>Order details, purchased items, payment method, payment status, receipt history, loyalty points, and notes.</li>
              <li>Optional birthday and marketing consent where the customer chooses to provide it.</li>
              <li>Optional GPS coordinates or location links for delivery navigation.</li>
            </ul>

            <h3>2. How information is used</h3>
            <p>Information is used to complete transactions, prepare receipts, track inventory, manage delivery, open Waze navigation links, build customer profiles, calculate loyalty rewards, support repeat purchases, and prepare marketing lists only when consent is granted.</p>

            <h3>3. WhatsApp and Waze links</h3>
            <p>This web version creates click-to-chat WhatsApp links and Waze navigation links. Messages are not sent automatically. When a staff member or customer clicks one of those links, the selected information is opened in WhatsApp or Waze for review before sending or navigating.</p>

            <h3>4. Browser-local storage</h3>
            <p>This standalone HTML version stores data in the current browser using localStorage. It is intended for testing, demos, and small offline-style workflows. Anyone with access to this browser profile may be able to view the stored data.</p>

            <h3>5. Security</h3>
            <p>The full-stack version of Caribbean POS Connect includes role-based access, API route protection, password hashing, and audit logs. For official production use, the browser-local version should be replaced by the database-backed version with secure hosting and backups.</p>

            <h3>6. Customer choices</h3>
            <p>Customers may ask to review, correct, or remove their contact information and marketing consent records. Requests should be sent to ${officialBrand.email} or handled in person by authorized staff.</p>

            <h3>7. Contact</h3>
            <p>Questions about this policy can be sent to ${officialBrand.email} or by phone at ${officialBrand.phone}.</p>
          </div>
        </article>

        <aside class="panel policy-summary">
          ${panelHead("Quick Summary")}
          <div class="panel-body grid">
            ${stat("Stored locally", "Browser only")}
            ${stat("Currency", "TTD")}
            ${stat("Marketing", "Consent based")}
            ${stat("Delivery", "Waze supported")}
            <a class="button primary" href="#contact">Contact us</a>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderContact() {
  const savedCount = state.contactMessages.length;
  const whatsappMessage = `Hello ${officialBrand.businessName}, I would like more information about ${officialBrand.productName}.`;
  main.innerHTML = `
    <section class="official-page">
      <div class="contact-hero panel">
        <div class="official-identity">
          ${brandLogoMarkup("brand-mark-large")}
          <div>
            <p class="country-label">Contact</p>
            <h2>${officialBrand.businessName}</h2>
            <p>${officialBrand.tagline}</p>
          </div>
        </div>
        <div class="contact-actions">
          <a class="button primary" href="tel:${officialBrand.phone}">Call ${officialBrand.phone}</a>
          <a class="button success" target="_blank" rel="noreferrer" href="${whatsappLink(officialBrand.whatsapp, whatsappMessage)}">WhatsApp us</a>
        </div>
      </div>

      <div class="contact-layout">
        <section class="panel">
          ${panelHead("Send an enquiry", "Saved locally in this browser. Use the email button to open a draft.")}
          <div class="panel-body grid">
            <div class="grid cols-2">
              <label class="field">Name<input id="contact-name" placeholder="Your name" /></label>
              <label class="field">Business name<input id="contact-business" placeholder="Your business" /></label>
            </div>
            <div class="grid cols-2">
              <label class="field">Email<input id="contact-email" type="email" placeholder="you@example.com" /></label>
              <label class="field">Phone<input id="contact-phone" placeholder="868-555-0000" /></label>
            </div>
            <label class="field">Reason<select id="contact-reason"><option>POS setup</option><option>Inventory and customer management</option><option>Delivery and Waze support</option><option>WhatsApp order workflow</option><option>General question</option></select></label>
            <label class="field">Message<textarea id="contact-message" placeholder="Tell us what you need help with."></textarea></label>
            <label class="checkbox-field"><input id="contact-consent" type="checkbox" />I agree to be contacted about this enquiry.</label>
            <div class="action-row">
              <button class="button primary" type="button" onclick="saveContactMessage()">Save enquiry locally</button>
              <button class="button secondary" type="button" onclick="openEmailDraft()">Open email draft</button>
            </div>
            <p class="small">${savedCount} enquiries saved in this browser.</p>
          </div>
        </section>

        <aside class="grid">
          <section class="panel">
            ${panelHead("Business details")}
            <div class="panel-body grid contact-facts">
              <div><span>Business</span><strong>${officialBrand.businessName}</strong></div>
              <div><span>Product</span><strong>${officialBrand.productName}</strong></div>
              <div><span>Email</span><strong>${officialBrand.email}</strong></div>
              <div><span>Phone</span><strong>${officialBrand.phone}</strong></div>
              <div><span>WhatsApp</span><strong>${officialBrand.whatsapp}</strong></div>
              <div><span>Address</span><strong>${officialBrand.address}</strong></div>
              <div><span>Hours</span><strong>${officialBrand.hours}</strong></div>
            </div>
          </section>

          <section class="panel">
            ${panelHead("Official Logo")}
            <div class="panel-body logo-card">
              ${brandLogoMarkup("brand-mark-xl")}
              <h3>Caribbean POS Connect</h3>
              <p class="muted">Smart POS for Caribbean Business, with a payment terminal, connected ordering network, palm, sun, and coastal wave treatment.</p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  `;
}

function collectContactMessage() {
  return {
    id: uid("msg"),
    name: getValue("contact-name"),
    business: getValue("contact-business"),
    email: getValue("contact-email"),
    phone: getValue("contact-phone"),
    reason: getValue("contact-reason", "General question"),
    message: getValue("contact-message"),
    consent: Boolean(document.getElementById("contact-consent")?.checked),
    createdAt: new Date().toISOString()
  };
}

function saveContactMessage() {
  const message = collectContactMessage();
  if (!message.name || !message.message) {
    toast("Name and message are required.");
    return;
  }
  if (!message.consent) {
    toast("Please confirm contact consent before saving.");
    return;
  }
  state.contactMessages.unshift(message);
  saveState();
  toast("Enquiry saved locally.");
  renderContact();
}

function openEmailDraft() {
  const message = collectContactMessage();
  const subject = `${officialBrand.productName} enquiry - ${message.reason}`;
  const body = [
    `Name: ${message.name}`,
    `Business: ${message.business}`,
    `Email: ${message.email}`,
    `Phone: ${message.phone}`,
    `Reason: ${message.reason}`,
    "",
    message.message
  ].join("\n");
  window.location.href = `mailto:${officialBrand.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function settingsInput(label, id, value, type = "text") {
  const readOnly = type === "readonly" ? "readonly" : "";
  const inputType = type === "number" ? "number" : "text";
  return `<label class="field">${label}<input id="${id}" type="${inputType}" value="${escapeHtml(value)}" ${readOnly} /></label>`;
}

function settingsCheck(label, id, checked) {
  return `<label class="checkbox-field"><input id="${id}" type="checkbox" ${checked ? "checked" : ""} />${label}</label>`;
}

function deliveryRateInputs() {
  const rates = state.settings.deliveryRates || {};
  return regions
    .map((region, index) => {
      const value = Number.isFinite(Number(rates[region])) ? rates[region] : state.settings.deliveryFee;
      return `<label class="field">${escapeHtml(region)}<input id="set-delivery-rate-${index}" type="number" min="0" step="1" value="${escapeHtml(value)}" /></label>`;
    })
    .join("");
}

function collectDeliveryRates() {
  return Object.fromEntries(regions.map((region, index) => [region, Number(getValue(`set-delivery-rate-${index}`, state.settings.deliveryFee))]));
}

function saveSettings() {
  Object.assign(state.settings, {
    businessName: getValue("set-business"),
    phone: getValue("set-phone"),
    email: getValue("set-email"),
    address: getValue("set-address"),
    taxEnabled: Boolean(document.getElementById("set-tax-enabled")?.checked),
    taxRate: Number(getValue("set-tax-rate", "0")),
    serviceFeeEnabled: Boolean(document.getElementById("set-service-enabled")?.checked),
    serviceFeeRate: Number(getValue("set-service-rate", "0")),
    deliveryFee: Number(getValue("set-delivery-fee", "0")),
    deliveryRates: collectDeliveryRates(),
    receiptMessage: getValue("set-receipt"),
    loyaltyEnabled: Boolean(document.getElementById("set-loyalty-enabled")?.checked),
    pointsPerTtd: Number(getValue("set-points", "0")),
    redeemValuePerPoint: Number(getValue("set-redeem", "0")),
    paymentLinksEnabled: Boolean(document.getElementById("set-payment-links-enabled")?.checked),
    paymentLinkTemplate: getValue("set-payment-template"),
    whatsappEnabled: Boolean(document.getElementById("set-wa-enabled")?.checked),
    whatsappBusinessNumber: getValue("set-wa-number"),
    whatsappCountryCode: getValue("set-wa-code"),
    whatsappTemplate: getValue("set-wa-template"),
    facebookUrl: getValue("set-facebook-url"),
    instagramUrl: getValue("set-instagram-url")
  });
  saveState();
  toast("Settings saved.");
  renderSettings();
}

function renderOnline() {
  const filtered = filterProducts("", runtime.onlineCategory);
  const type = getValue("online-type", "delivery");
  const onlineRegion = getValue("online-region", "Chaguanas");
  const totals = calcTotals(runtime.onlineCart, type, 0, onlineRegion);
  const lastOrder = state.orders.find((order) => order.id === runtime.lastOrderId);
  const lastPaymentLink = lastOrder ? paymentLinkForOrder(lastOrder) : "";
  main.innerHTML = `
    <section class="storefront-shell">
      <div class="store-hero panel">
        <div class="store-hero-copy">
          ${brandLogoMarkup("brand-mark-large")}
          <div>
            <p class="country-label">Delivery Storefront</p>
            <h2>${escapeHtml(state.settings.businessName)}</h2>
            <p>Order favorites for delivery or pickup. Receipts and order updates are created as soon as checkout is submitted.</p>
          </div>
        </div>
        <div class="store-hero-actions">
          <a class="button success" target="_blank" rel="noreferrer" href="${whatsappLink(state.settings.whatsappBusinessNumber, `Hello ${state.settings.businessName}, I want to place an order.`)}">WhatsApp store</a>
          ${state.settings.facebookUrl ? `<a class="button secondary" target="_blank" rel="noreferrer" href="${safeExternalUrl(state.settings.facebookUrl)}">Facebook</a>` : ""}
          ${state.settings.instagramUrl ? `<a class="button secondary" target="_blank" rel="noreferrer" href="${safeExternalUrl(state.settings.instagramUrl)}">Instagram</a>` : ""}
          <a class="button secondary" target="_blank" rel="noreferrer" href="${facebookShareLink()}">Share store</a>
          <a class="button secondary" href="tel:${state.settings.phone}">Call store</a>
        </div>
      </div>

      ${lastOrder ? `
        <div class="order-success panel">
          <div>
            <strong>Order #${escapeHtml(lastOrder.number)} received</strong>
            <span>${orderTypeLabel(lastOrder.type)} - ${money(lastOrder.total)} - ${escapeHtml(lastOrder.paymentStatus)}</span>
          </div>
          <div class="action-row">
            <button class="button primary" type="button" onclick="showReceipt('${lastOrder.id}')">View receipt</button>
            ${lastOrder.type === "delivery" ? `<button class="button secondary" type="button" onclick="showShippingLabel('${lastOrder.id}')">Shipping label</button>` : ""}
            ${lastPaymentLink ? `<a class="button success" target="_blank" rel="noreferrer" href="${lastPaymentLink}">Pay now</a>` : ""}
            ${lastOrder.whatsappCustomerLink ? `<a class="button success" target="_blank" rel="noreferrer" href="${lastOrder.whatsappCustomerLink}">WhatsApp confirmation</a>` : ""}
            ${lastOrder.wazeLink ? `<a class="button secondary" target="_blank" rel="noreferrer" href="${lastOrder.wazeLink}">Waze route</a>` : ""}
          </div>
        </div>
      ` : ""}

      <div class="storefront-layout">
        <div class="grid">
          <div class="store-toolbar panel">
            <div>
              <h2>Shop products</h2>
              <p class="muted">${filtered.length} items available</p>
            </div>
            <div class="category-tabs">${categoryButtons("online")}</div>
          </div>
          <div class="store-product-grid">${filtered.map((product) => storeProductCard(product)).join("")}</div>
        </div>

        <aside class="checkout-card">
          <div class="checkout-head">
            <div>
              <p class="country-label">Secure checkout</p>
              <h2>Your order</h2>
            </div>
            <span>${runtime.onlineCart.length} lines</span>
          </div>

          <div class="checkout-steps">
            ${checkoutStep("1", "Cart", runtime.onlineCart.length ? `${runtime.onlineCart.length} selected` : "Empty")}
            ${checkoutStep("2", "Delivery", type === "delivery" ? "Waze ready" : "Pickup")}
            ${checkoutStep("3", "Payment", getValue("online-payment", "Pay on delivery"))}
          </div>

          <div class="checkout-section">
            <div class="cart-list">${runtime.onlineCart.map(onlineCartRow).join("") || `<div class="empty-cart">Your cart is empty.</div>`}</div>
            <div class="totals">${totalLine("Subtotal", totals.subtotal)}${totalLine("Tax/Fee", totals.tax + totals.serviceFee)}${totalLine(deliveryLineLabel(type, onlineRegion), totals.deliveryFee)}<div class="total-line grand"><span>Total</span><span>${money(totals.total)}</span></div></div>
          </div>

          <div class="checkout-section">
            <div class="segmented two">${segment("online-type", "delivery", "Delivery", type)}${segment("online-type", "pickup", "Pickup", type)}</div>
            <div class="grid cols-2">
              <label class="field">Name<input id="online-name" value="${escapeHtml(getValue("online-name"))}" /></label>
              <label class="field">Phone<input id="online-phone" value="${escapeHtml(getValue("online-phone"))}" /></label>
            </div>
            <label class="field">Email optional<input id="online-email" value="${escapeHtml(getValue("online-email"))}" /></label>
            ${
              type === "delivery"
                ? `<div class="delivery-focus"><strong>Delivery details</strong><label class="field">Street address<input id="online-street" value="${escapeHtml(getValue("online-street"))}" /></label><div class="grid cols-2"><label class="field">Area/community<input id="online-community" value="${escapeHtml(getValue("online-community"))}" /></label><label class="field">City/town<input id="online-city" value="${escapeHtml(getValue("online-city"))}" /></label></div><label class="field">Region/corporation<select id="online-region" onchange="renderOnline()">${regionOptions(getValue("online-region", "Chaguanas"))}</select></label><label class="field">Customer location link<input id="online-location-link" placeholder="Paste shared Waze or map link" value="${escapeHtml(getValue("online-location-link"))}" /></label><div class="grid cols-2"><label class="field">Latitude<input id="online-lat" value="${escapeHtml(getValue("online-lat"))}" /></label><label class="field">Longitude<input id="online-lng" value="${escapeHtml(getValue("online-lng"))}" /></label></div><label class="field">Delivery instructions<textarea id="online-delivery-notes">${escapeHtml(getValue("online-delivery-notes"))}</textarea></label><button class="button secondary" type="button" onclick="captureOnlineLocation()">Use my GPS location</button></div>`
                : `<div class="pickup-note"><strong>Pickup at ${escapeHtml(state.settings.businessName)}</strong><span>${escapeHtml(state.settings.address)}</span></div>`
            }
          </div>

          <div class="checkout-section">
            <label class="field">Payment method<select id="online-payment" onchange="renderOnline()">${paymentMethods.filter((method) => state.settings.paymentEnabled[method]).map((method) => `<option ${method === getValue("online-payment", "Pay on delivery") ? "selected" : ""}>${method}</option>`).join("")}</select></label>
            <label class="checkbox-field"><input id="online-consent" type="checkbox" ${getChecked("online-consent")} />I agree to receive optional marketing messages. My data is stored for this order, receipts, delivery, loyalty, and customer service.</label>
            <button class="button primary checkout-submit" onclick="submitOnlineOrder()">Place order</button>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function checkoutStep(number, label, detail) {
  return `<div class="checkout-step"><span>${number}</span><div><strong>${label}</strong><small>${escapeHtml(detail)}</small></div></div>`;
}

function storeProductCard(product) {
  const art = productArt(product);
  return `
    <article class="store-product-card">
      <button class="store-product-art ${art.className}" type="button" onclick="addOnlineCart('${product.id}')">
        <strong>${art.icon}</strong>
        <span>${badge(product.stock <= product.low ? "Low" : "In stock", product.stock <= product.low ? "red" : "green")}</span>
      </button>
      <div>
        <h3>${escapeHtml(product.name)}</h3>
        <p class="small">${escapeHtml(product.category)}</p>
      </div>
      <div class="between">
        <strong class="price">${money(product.price)}</strong>
        <button class="button primary" type="button" onclick="addOnlineCart('${product.id}')">Add</button>
      </div>
    </article>
  `;
}

function onlineCartRow(item) {
  const product = state.products.find((entry) => entry.id === item.productId);
  return `<div class="cart-item"><div class="cart-title"><strong>${escapeHtml(product.name)}</strong><button class="icon-button" onclick="removeOnlineCart('${item.productId}')">x</button></div><div class="between"><div class="qty"><button onclick="qtyOnlineCart('${item.productId}',-1)">-</button><span>${item.qty}</span><button onclick="qtyOnlineCart('${item.productId}',1)">+</button></div><strong>${money(product.price * item.qty)}</strong></div></div>`;
}

function captureOnlineLocation() {
  if (!navigator.geolocation) return toast("GPS is not available in this browser.");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setInputValue("online-lat", position.coords.latitude);
      setInputValue("online-lng", position.coords.longitude);
      toast("GPS location added.");
    },
    () => toast("Could not capture GPS. Manual address still works.")
  );
}

function submitOnlineOrder() {
  if (!getValue("online-name") || !getValue("online-phone")) return toast("Name and phone are required.");
  const type = getValue("online-type", "delivery");
  const customer = {
    name: getValue("online-name"),
    phone: getValue("online-phone"),
    email: getValue("online-email"),
    street: getValue("online-street"),
    community: getValue("online-community"),
    city: getValue("online-city"),
    region: getValue("online-region", "Chaguanas"),
    country: "Trinidad and Tobago",
    deliveryNotes: getValue("online-delivery-notes"),
    locationLink: getValue("online-location-link"),
    marketingConsent: Boolean(document.getElementById("online-consent")?.checked)
  };
  const payment = getValue("online-payment", "Pay on delivery");
  const order = createOrder({
    cart: runtime.onlineCart,
    customer,
    type,
    paymentMethod: payment,
    paymentStatus: payment === "Pay on delivery" ? "unpaid" : "paid",
    lat: getValue("online-lat"),
    lng: getValue("online-lng"),
    locationLink: getValue("online-location-link"),
    source: "Online"
  });
  if (!order) return;
  runtime.onlineCart = [];
  renderOnline();
  showReceipt(order.id);
}

async function qrDataUrl(value) {
  if (!value || !window.QRCode?.toDataURL) return "";
  try {
    return await window.QRCode.toDataURL(value, {
      margin: 1,
      width: 150,
      errorCorrectionLevel: "M"
    });
  } catch {
    return "";
  }
}

async function showReceipt(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  runtime.lastReceiptOrderId = orderId;
  runtime.lastDocumentMode = "receipt";
  document.getElementById("receipt-dialog-title").textContent = "Receipt";
  document.getElementById("receipt-content").innerHTML = await receiptHtml(order);
  document.querySelector("[data-download-receipt]").textContent = "Download receipt";
  document.getElementById("receipt-dialog").showModal();
}

async function showShippingLabel(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  runtime.lastReceiptOrderId = orderId;
  runtime.lastDocumentMode = "label";
  document.getElementById("receipt-dialog-title").textContent = "Shipping label";
  document.getElementById("receipt-content").innerHTML = await shippingLabelHtml(order);
  document.querySelector("[data-download-receipt]").textContent = "Download label";
  document.getElementById("receipt-dialog").showModal();
}

async function receiptHtml(order) {
  const receiptCustomerLink = order.customer.phone ? whatsappLink(order.customer.phone, customerReceiptMessage(order)) : "";
  const paymentLink = paymentLinkForOrder(order);
  const wazeQr = await qrDataUrl(order.wazeLink);
  return `
    <h2>${escapeHtml(state.settings.businessName)}</h2>
    <p style="text-align:center">${escapeHtml(state.settings.phone)}<br>${escapeHtml(state.settings.email)}<br>${escapeHtml(state.settings.address)}</p>
    <hr>
    <div class="receipt-line"><span>Receipt</span><strong>${escapeHtml(order.receipt)}</strong></div>
    <div class="receipt-line"><span>Order</span><strong>#${escapeHtml(order.number)}</strong></div>
    <div class="receipt-line"><span>Date</span><span>${new Date(order.createdAt).toLocaleString()}</span></div>
    <div class="receipt-line"><span>Cashier</span><span>${escapeHtml(order.createdBy)}</span></div>
    <div class="receipt-line"><span>Customer</span><span>${escapeHtml(order.customer.name || "Walk-in")}</span></div>
    <hr>
    ${order.items.map((item) => `<div><strong>${item.qty} x ${escapeHtml(item.name)}</strong><div class="receipt-line"><span>${money(item.unitPrice)} each</span><span>${money(item.total)}</span></div></div>`).join("")}
    <hr>
    ${totalLine("Subtotal", order.subtotal)}
    ${totalLine("Discount", -order.discount)}
    ${totalLine("Tax/Fee", order.tax + order.serviceFee)}
    ${totalLine(deliveryLineLabel(order.type, order.customer.region), order.deliveryFee)}
    <div class="receipt-line" style="font-size:16px"><strong>Total</strong><strong>${money(order.total)}</strong></div>
    <hr>
    <div class="receipt-line"><span>Payment</span><span>${escapeHtml(order.paymentMethod)}</span></div>
    <div class="receipt-line"><span>Status</span><span>${escapeHtml(order.paymentStatus)}</span></div>
    ${order.type === "delivery" ? `<div class="receipt-line"><span>Delivery</span><span>${escapeHtml(order.deliveryStatus.replaceAll("_", " "))}</span></div>` : ""}
    <div class="receipt-line"><span>Loyalty earned</span><span>${order.loyaltyEarned} pts</span></div>
    ${
      order.wazeLink
        ? `<div class="qr-block"><strong>Scan for Waze</strong>${wazeQr ? `<img src="${wazeQr}" alt="Waze QR code" />` : ""}<small>${escapeHtml(order.wazeLink)}</small></div>`
        : ""
    }
    <p style="text-align:center">${escapeHtml(state.settings.receiptMessage)}</p>
    <div class="receipt-actions no-print">
      ${paymentLink ? `<a class="button primary" target="_blank" rel="noreferrer" href="${paymentLink}">Open payment link</a>` : ""}
      ${order.type === "delivery" ? `<button class="button secondary" type="button" onclick="showShippingLabel('${order.id}')">Print shipping label</button>` : ""}
      ${receiptCustomerLink ? `<a class="button success" target="_blank" rel="noreferrer" href="${receiptCustomerLink}">WhatsApp receipt to customer</a>` : ""}
      ${order.whatsappBusinessLink ? `<a class="button secondary" target="_blank" rel="noreferrer" href="${order.whatsappBusinessLink}">Notify business WhatsApp</a>` : ""}
      ${order.wazeLink ? `<a class="button primary" target="_blank" rel="noreferrer" href="${order.wazeLink}">Open delivery in Waze</a>` : ""}
    </div>
    ${
      order.whatsappBusinessLink
        ? `<p class="no-print small">WhatsApp messages open for review first. Nothing is sent automatically.</p>`
        : ""
    }
  `;
}

async function shippingLabelHtml(order) {
  const wazeQr = await qrDataUrl(order.wazeLink);
  const items = order.items.map((item) => `${item.qty} x ${escapeHtml(item.name)}`).join(" | ");
  return `
    <section class="shipping-label">
      <div class="label-brand">
        <strong>${escapeHtml(state.settings.businessName)}</strong>
        <span>${escapeHtml(state.settings.phone)} - ${escapeHtml(state.settings.address)}</span>
      </div>
      <hr>
      <div class="label-row">
        <span>ORDER</span>
        <strong>#${escapeHtml(order.number)}</strong>
      </div>
      <div class="label-row">
        <span>PAYMENT</span>
        <strong>${escapeHtml(order.paymentStatus)} - ${escapeHtml(order.paymentMethod)}</strong>
      </div>
      <h3>SHIP TO</h3>
      <h2>${escapeHtml(order.customer.name || "Customer")}</h2>
      <p><strong>${escapeHtml(order.customer.phone || "No phone")}</strong></p>
      <p>${escapeHtml(addressText(order.customer) || "No delivery address")}</p>
      ${order.customer.deliveryNotes ? `<p><strong>Instructions:</strong> ${escapeHtml(order.customer.deliveryNotes)}</p>` : ""}
      ${wazeQr ? `<div class="label-qr"><img src="${wazeQr}" alt="Waze QR code" /><strong>Scan Waze route</strong></div>` : ""}
      <hr>
      <h3>ITEMS</h3>
      <p>${items || "No items"}</p>
      <p class="label-footer">Driver: ${escapeHtml(driverName(order.driverId) || "Unassigned")} - ${escapeHtml(order.deliveryStatus.replaceAll("_", " "))}</p>
      <div class="receipt-actions no-print">
        <button class="button secondary" type="button" onclick="showReceipt('${order.id}')">Back to receipt</button>
        ${order.wazeLink ? `<a class="button primary" target="_blank" rel="noreferrer" href="${order.wazeLink}">Open in Waze</a>` : ""}
      </div>
    </section>
  `;
}

async function downloadReceipt() {
  const order = state.orders.find((entry) => entry.id === runtime.lastReceiptOrderId);
  if (!order) return;
  const isLabel = runtime.lastDocumentMode === "label";
  const html = isLabel ? await shippingLabelHtml(order) : await receiptHtml(order);
  const name = isLabel ? `shipping-label-${order.number}.html` : `receipt-${order.number}.html`;
  downloadFile(name, `<!doctype html><html><head><link rel="stylesheet" href="./styles.css"></head><body>${html}</body></html>`, "text/html");
}

function downloadSalesCsv() {
  const rows = [
    ["Order #", "Date", "Type", "Customer", "Phone", "Payment Method", "Payment Status", "Delivery Status", "Total"],
    ...state.orders.map((order) => [order.number, order.createdAt, order.type, order.customer.name, order.customer.phone, order.paymentMethod, order.paymentStatus, order.deliveryStatus, order.total])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadFile("caribbean-pos-sales.csv", csv, "text/csv");
}

function downloadBackup() {
  downloadFile(`caribbean-pos-connect-backup-${Date.now()}.json`, JSON.stringify(state, null, 2), "application/json");
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function resetDemo() {
  if (!confirm("Reset browser-local demo data?")) return;
  state = seedState();
  runtime = { cart: [], onlineCart: [], posCategory: "All", onlineCategory: "All", selectedOrderId: "", selectedCustomerId: "", lastReceiptOrderId: "", lastDocumentMode: "receipt", lastOrderId: "", search: "", values: {} };
  saveState();
  render();
}

document.getElementById("role-select").addEventListener("change", (event) => {
  state.role = event.target.value;
  saveState();
  render();
});

document.getElementById("theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("cpc_theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
});

document.querySelector("[data-close-receipt]").addEventListener("click", () => document.getElementById("receipt-dialog").close());
document.querySelector("[data-print-receipt]").addEventListener("click", () => window.print());
document.querySelector("[data-download-receipt]").addEventListener("click", downloadReceipt);
document.querySelector("[data-close-notifications]").addEventListener("click", () => document.getElementById("notification-dialog").close());

if (localStorage.getItem("cpc_theme") === "dark") document.documentElement.classList.add("dark");

window.addEventListener("hashchange", render);
setInterval(updateClock, 30000);

const main = document.getElementById("main");
render();
