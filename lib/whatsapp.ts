import { money } from "./constants";
import { buildAddress } from "./waze";
import type { Order, Settings } from "./types";

export function cleanWhatsAppNumber(input?: string | null, defaultCountryCode = "1868") {
  const normalizedDefault = String(defaultCountryCode || "1868").replace(/[^\d]/g, "");
  const countryPrefix = normalizedDefault === "1" ? "1868" : normalizedDefault || "1868";
  let digits = String(input ?? "").replace(/[^\d]/g, "");

  if (digits.length === 7) {
    digits = `${countryPrefix}${digits}`;
  }

  if (digits.length === 10 && digits.startsWith("868")) {
    digits = `1${digits}`;
  }

  if (digits.length === 10 && !digits.startsWith("868")) {
    digits = `1${digits}`;
  }

  if (digits.length === 8 && digits.startsWith("1")) {
    digits = `${countryPrefix}${digits.slice(1)}`;
  }

  return digits;
}

export function normalizeWhatsAppNumber(input?: string | null, defaultCountryCode = "+1868") {
  const normalizedDefault = String(defaultCountryCode || "+1868").replace(/[^\d]/g, "") || "1868";
  const countryPrefix = normalizedDefault === "1" ? "1868" : normalizedDefault;
  let digits = String(input ?? "").trim();
  if (!digits) return "";

  if (digits.startsWith("+")) {
    return `+${digits.slice(1).replace(/[^\d]/g, "")}`;
  }

  digits = digits.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.length === 7) return `+${countryPrefix}${digits}`;
  if (digits.length === 10 && digits.startsWith("868")) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1868")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

export function formatTwilioWhatsAppNumber(input?: string | null, defaultCountryCode = "+1868") {
  const normalized = normalizeWhatsAppNumber(input, defaultCountryCode);
  return normalized ? `whatsapp:${normalized}` : "";
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string, defaultCountryCode = "1868") {
  const clean = cleanWhatsAppNumber(phone, defaultCountryCode);
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function appBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

function orderDashboardLink(order: Order) {
  const base = appBaseUrl();
  return base ? `${base}/orders?order=${encodeURIComponent(order.id)}` : "/orders";
}

function typeLabel(order: Order) {
  if (order.order_type === "delivery") return "Delivery";
  if (order.order_type === "pickup") return "Pickup";
  if (order.order_type === "online") return "Online";
  if (order.order_type === "draft") return "Draft";
  return "In-store";
}

function statusLabel(value?: string | null) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toLocaleString() : date.toLocaleString();
}

function orderItemsText(order: Order, settings: Settings) {
  return order.items
    .map((item) => `${item.quantity} x ${item.product_name} - ${money(item.line_total, settings.currency)}`)
    .join("\n");
}

function applyOrderTokens(template: string, order: Order, settings: Settings) {
  const customer = order.customer_snapshot;
  const address = buildAddress([
    customer.street_address,
    customer.city,
    customer.region,
    customer.country || "Trinidad and Tobago"
  ]);
  return template
    .replaceAll("{{business_name}}", settings.business_name)
    .replaceAll("{{business_phone}}", settings.business_phone || "")
    .replaceAll("{{order_number}}", order.order_number)
    .replaceAll("{{receipt_number}}", order.order_number)
    .replaceAll("{{customer_name}}", customer.name || "Walk-in customer")
    .replaceAll("{{customer_phone}}", customer.phone || "")
    .replaceAll("{{order_type}}", typeLabel(order))
    .replaceAll("{{address}}", address)
    .replaceAll("{{items}}", orderItemsText(order, settings))
    .replaceAll("{{total}}", money(order.total, settings.currency))
    .replaceAll("{{payment_method}}", order.payment_method)
    .replaceAll("{{payment_status}}", order.payment_status)
    .replaceAll("{{order_status}}", statusLabel(order.status))
    .replaceAll("{{delivery_status}}", statusLabel(order.delivery_status))
    .replaceAll("{{driver_name}}", order.assigned_driver_name || "Your driver")
    .replaceAll("{{driver_phone}}", order.assigned_driver_phone || "Not provided")
    .replaceAll("{{date_time}}", formatDateTime(order.created_at))
    .replaceAll("{{completed_at}}", formatDateTime(order.completed_at))
    .replaceAll("{{payment_link}}", order.payment_link || "")
    .replaceAll("{{location_link}}", order.delivery_location_link || "")
    .replaceAll("{{waze_link}}", order.waze_link || "")
    .replaceAll("{{dashboard_link}}", orderDashboardLink(order))
    .replaceAll("{{receipt_message}}", settings.receipt_message || "Thank you for shopping with us.");
}

export function buildOrderWhatsAppMessage(order: Order, settings: Settings) {
  const customer = order.customer_snapshot;
  const address = buildAddress([
    customer.street_address,
    customer.city,
    customer.region,
    customer.country || "Trinidad and Tobago"
  ]);
  const items = orderItemsText(order, settings);

  const template = settings.whatsapp_order_template?.trim();
  if (template) {
    return applyOrderTokens(template, order, settings);
  }

  return [
    `New Order - ${settings.business_name}`,
    "",
    `Order #: ${order.order_number}`,
    `Customer: ${customer.name || "Walk-in customer"}`,
    `Phone: ${customer.phone || "Not provided"}`,
    customer.email ? `Email: ${customer.email}` : null,
    `Type: ${typeLabel(order)}`,
    address ? `Address: ${address}` : null,
    customer.delivery_notes ? `Instructions: ${customer.delivery_notes}` : null,
    "",
    "Items:",
    items,
    "",
    `Total: ${money(order.total, settings.currency)}`,
    `Payment: ${order.payment_method}`,
    `Payment status: ${order.payment_status}`,
    `Order status: ${statusLabel(order.status)}`,
    `Date/time: ${formatDateTime(order.created_at)}`,
    `Dashboard: ${orderDashboardLink(order)}`,
    order.notes ? `Notes: ${order.notes}` : null,
    order.payment_link ? "" : null,
    order.payment_link ? "Payment link:" : null,
    order.payment_link,
    order.waze_link ? "" : null,
    order.waze_link ? "Waze:" : null,
    order.waze_link
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCustomerConfirmationMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_customer_confirmation_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  const items = order.items.map((item) => `${item.quantity} x ${item.product_name}`).join("\n");
  const name = order.customer_snapshot.name || "there";
  return [
    `Thank you for ordering from ${settings.business_name}.`,
    "",
    `Order: #${order.order_number}`,
    "Items:",
    items,
    "",
    `Total: ${money(order.total, settings.currency)}`,
    `Status: ${statusLabel(order.status || "new") || "Received"}`,
    "",
    `Hi ${name}, we will update you when your order is ready.`,
    settings.business_phone ? `Contact: ${settings.business_phone}` : null
  ].filter(Boolean).join("\n");
}

export function buildCustomerReceiptWhatsAppMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_customer_receipt_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  return [
    `Receipt - ${settings.business_name}`,
    "",
    `Order #: ${order.order_number}`,
    `Customer: ${order.customer_snapshot.name || "Customer"}`,
    "",
    "Items:",
    orderItemsText(order, settings),
    "",
    `Total: ${money(order.total, settings.currency)}`,
    `Payment: ${order.payment_method}`,
    `Completed: ${formatDateTime(order.completed_at)}`,
    "",
    settings.receipt_message,
    settings.business_phone ? `Contact: ${settings.business_phone}` : null
  ].filter(Boolean).join("\n");
}

export function buildCustomerDriverAssignedWhatsAppMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_driver_assigned_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  return [
    `Hi ${order.customer_snapshot.name || "there"}, your ${settings.business_name} order #${order.order_number} has been assigned to ${order.assigned_driver_name || "a delivery driver"}.`,
    order.assigned_driver_phone ? `Driver phone: ${order.assigned_driver_phone}` : null,
    order.waze_link ? `Navigation: ${order.waze_link}` : null,
    `Status: ${statusLabel(order.delivery_status)}`,
    `Total: ${money(order.total, settings.currency)}`,
    settings.business_phone ? `Contact: ${settings.business_phone}` : null
  ].filter(Boolean).join("\n");
}

export function buildDriverAssignmentWhatsAppMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_driver_alert_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  const customer = order.customer_snapshot;
  const address = buildAddress([
    customer.street_address,
    customer.city,
    customer.region,
    customer.country || "Trinidad and Tobago"
  ]);
  return [
    `Delivery assigned - ${settings.business_name}`,
    "",
    `Order #: ${order.order_number}`,
    `Customer: ${customer.name || "Customer"}`,
    customer.phone ? `Customer phone: ${customer.phone}` : null,
    address ? `Address: ${address}` : null,
    customer.delivery_notes ? `Instructions: ${customer.delivery_notes}` : null,
    "",
    "Items:",
    orderItemsText(order, settings),
    "",
    `Total: ${money(order.total, settings.currency)}`,
    `Payment: ${order.payment_method} (${order.payment_status})`,
    order.waze_link ? `Waze: ${order.waze_link}` : null,
    `Dashboard: ${orderDashboardLink(order)}`
  ].filter(Boolean).join("\n");
}

export function buildCustomerOutForDeliveryWhatsAppMessage(order: Order, settings: Settings) {
  const template = settings.whatsapp_out_for_delivery_template?.trim();
  if (template) return applyOrderTokens(template, order, settings);
  return [
    `Hi ${order.customer_snapshot.name || "there"}, your ${settings.business_name} order #${order.order_number} is out for delivery.`,
    order.assigned_driver_name ? `Driver: ${order.assigned_driver_name}` : null,
    order.assigned_driver_phone ? `Driver phone: ${order.assigned_driver_phone}` : null,
    `Total: ${money(order.total, settings.currency)}`,
    settings.receipt_message,
    settings.business_phone ? `Contact: ${settings.business_phone}` : null
  ].filter(Boolean).join("\n");
}

function whatsappProvider() {
  return (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();
}

function toE164Digits(to: string, defaultCountryCode = "1868") {
  return normalizeWhatsAppNumber(to, defaultCountryCode);
}

export async function sendWhatsAppMessage(
  to: string | null | undefined,
  message: string,
  options: { defaultCountryCode?: string; provider?: string | null } = {}
) {
  const formattedTo = toE164Digits(to || "", options.defaultCountryCode);
  const provider = (options.provider || whatsappProvider()).trim().toLowerCase();
  const enabled = process.env.WHATSAPP_ENABLED !== "false";
  if (!formattedTo || !message.trim()) {
    return { ok: false, skipped: true, message: "WhatsApp recipient or message is missing." };
  }
  if (!enabled) {
    console.info("WhatsApp is not configured", { provider: provider || "none", reason: "WHATSAPP_ENABLED is false" });
    return { ok: false, skipped: true, message: "WhatsApp is not configured" };
  }

  if (provider === "twilio") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!accountSid || !authToken || !from) {
      console.info("WhatsApp is not configured", { provider: "twilio", reason: "missing Twilio credentials" });
      return { ok: false, skipped: true, message: "WhatsApp is not configured" };
    }
    try {
      const body = new URLSearchParams({
        From: from.startsWith("whatsapp:") ? from : formatTwilioWhatsAppNumber(from, options.defaultCountryCode),
        To: `whatsapp:${formattedTo}`,
        Body: message
      });
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
      if (!response.ok) {
        console.warn("WhatsApp send failed", { provider: "twilio", status: response.status });
        return { ok: false, skipped: false, message: "WhatsApp send failed" };
      }
      return { ok: true, skipped: false, message: "WhatsApp sent" };
    } catch (error) {
      console.warn("WhatsApp send failed", { provider: "twilio", error: error instanceof Error ? error.message : "Unknown error" });
      return { ok: false, skipped: false, message: "WhatsApp send failed" };
    }
  }

  if (provider === "meta") {
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      console.info("WhatsApp is not configured", { provider: "meta", reason: "missing Meta credentials" });
      return { ok: false, skipped: true, message: "WhatsApp is not configured" };
    }
    try {
      const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedTo.replace(/^\+/, ""),
          type: "text",
          text: { body: message, preview_url: true }
        })
      });
      if (!response.ok) {
        console.warn("WhatsApp send failed", { provider: "meta", status: response.status });
        return { ok: false, skipped: false, message: "WhatsApp send failed" };
      }
      return { ok: true, skipped: false, message: "WhatsApp sent" };
    } catch (error) {
      console.warn("WhatsApp send failed", { provider: "meta", error: error instanceof Error ? error.message : "Unknown error" });
      return { ok: false, skipped: false, message: "WhatsApp send failed" };
    }
  }

  console.info("WhatsApp is not configured", { provider: provider || "none" });
  return { ok: false, skipped: true, message: "WhatsApp is not configured" };
}
