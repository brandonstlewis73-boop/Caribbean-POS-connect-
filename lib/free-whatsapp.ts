import { money } from "./constants";
import { isValidWhatsAppE164, normalizeWhatsAppNumber } from "./whatsapp";
import type { Order } from "./types";

export function freeWhatsAppLink(phone: string | null | undefined, message: string) {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!isValidWhatsAppE164(normalized) || !message.trim()) return null;
  return `https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(message)}`;
}

export function freeOrderUpdate(order: Order, currency: string) {
  const status = order.status.replaceAll("_", " ");
  return [
    `Hi ${order.customer_snapshot.name || "there"},`,
    `Your order #${order.order_number} is ${status}.`,
    ...order.items.map(item => `${item.quantity} × ${item.product_name}`),
    `Total: ${money(order.total, order.currency || currency)}`,
    `Payment: ${order.payment_status.replaceAll("_", " ")}`,
    order.status === "out_for_delivery" && order.assigned_driver_name ? `Driver: ${order.assigned_driver_name}` : null,
    order.status === "out_for_delivery" && order.assigned_driver_phone ? `Driver phone: ${order.assigned_driver_phone}` : null
  ].filter(Boolean).join("\n");
}
