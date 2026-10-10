import { paymentMethodEnabled } from "../pos-checkout";
import type { Settings } from "../types";
export function publicCheckoutError(
  settings: Settings,
  orderType: string,
  paymentMethod: string,
): string | null {
  if (settings.storefront_status === "paused")
    return "This storefront is paused right now.";
  if (orderType !== "pickup" && orderType !== "delivery")
    return "Choose pickup or delivery.";
  if (orderType === "pickup" && settings.pickup_enabled === false)
    return "Pickup is not available right now.";
  if (orderType === "delivery" && settings.delivery_enabled === false)
    return "Delivery is not available right now.";
  if (!paymentMethodEnabled(paymentMethod, settings))
    return "This payment method is not available. Refresh the store.";
  if (paymentMethod === "Pay on delivery" && orderType !== "delivery")
    return "Pay on delivery requires a delivery order.";
  return null;
}
