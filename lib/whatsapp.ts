import { money } from "./constants";
import { buildAddress } from "./waze";
import type { Order, Settings } from "./types";

export function cleanWhatsAppNumber(input?: string | null, defaultCountryCode = "1868") {
  let digits = String(input ?? "").replace(/[^\d]/g, "");

  if (digits.length === 7) {
    digits = `${defaultCountryCode}${digits}`;
  }

  if (digits.length === 10 && digits.startsWith("868")) {
    digits = `1${digits}`;
  }

  if (digits.length === 10 && !digits.startsWith("868")) {
    digits = `1${digits}`;
  }

  if (digits.length === 8 && digits.startsWith("1")) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  }

  return digits;
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string) {
  const clean = cleanWhatsAppNumber(phone);
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function buildOrderWhatsAppMessage(order: Order, settings: Settings) {
  const customer = order.customer_snapshot;
  const typeLabel = order.order_type === "delivery" ? "Delivery" : order.order_type === "pickup" ? "Pickup" : "In-store";
  const address = buildAddress([
    customer.street_address,
    customer.city,
    customer.region,
    customer.country || "Trinidad and Tobago"
  ]);
  const items = order.items
    .map((item) => `${item.quantity} x ${item.product_name} - ${money(item.line_total, settings.currency)}`)
    .join("\n");

  const template = settings.whatsapp_order_template?.trim();
  if (template) {
    return template
      .replaceAll("{{order_number}}", order.order_number)
      .replaceAll("{{customer_name}}", customer.name || "Walk-in customer")
      .replaceAll("{{customer_phone}}", customer.phone || "")
      .replaceAll("{{total}}", money(order.total, settings.currency))
      .replaceAll("{{payment_method}}", order.payment_method)
      .replaceAll("{{payment_status}}", order.payment_status)
      .replaceAll("{{payment_link}}", order.payment_link || "")
      .replaceAll("{{location_link}}", order.delivery_location_link || "")
      .replaceAll("{{waze_link}}", order.waze_link || "")
      .replaceAll("{{items}}", items)
      .replaceAll("{{address}}", address);
  }

  return [
    `New Order - ${settings.business_name}`,
    "",
    `Order #: ${order.order_number}`,
    `Customer: ${customer.name || "Walk-in customer"}`,
    `Phone: ${customer.phone || "Not provided"}`,
    customer.email ? `Email: ${customer.email}` : null,
    `Type: ${typeLabel}`,
    address ? `Address: ${address}` : null,
    customer.delivery_notes ? `Instructions: ${customer.delivery_notes}` : null,
    "",
    "Items:",
    items,
    "",
    `Total: ${money(order.total, settings.currency)}`,
    `Payment: ${order.payment_method}`,
    `Status: ${order.payment_status}`,
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
