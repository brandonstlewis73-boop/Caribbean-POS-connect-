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
    .replaceAll("{{order_status}}", order.status.replaceAll("_", " "))
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
    `Order status: ${order.status.replaceAll("_", " ")}`,
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
  const name = order.customer_snapshot.name || "there";
  return `Hi ${name}, your order #${order.order_number} was received. Total: ${money(order.total, settings.currency)}. We will contact you shortly. - ${settings.business_name}`;
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

function whatsappProvider() {
  return (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();
}

function toE164Digits(to: string, defaultCountryCode = "1868") {
  const digits = cleanWhatsAppNumber(to, defaultCountryCode);
  return digits ? `+${digits}` : "";
}

export async function sendWhatsAppMessage(
  to: string | null | undefined,
  message: string,
  options: { defaultCountryCode?: string } = {}
) {
  const formattedTo = toE164Digits(to || "", options.defaultCountryCode);
  const provider = whatsappProvider();
  if (!formattedTo || !message.trim()) {
    return { ok: false, skipped: true, message: "WhatsApp recipient or message is missing." };
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
        From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
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
