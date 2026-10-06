import type { Order } from "./types";
import { extractCoordinates } from "./waze";

/** Only an order-specific pin belongs to this delivery; customer profile pins may be stale. */
export function deliveryLocation(order: Order) {
  const latitude = order.delivery_latitude;
  const longitude = order.delivery_longitude;
  if (typeof latitude === "number" && typeof longitude === "number" &&
      Number.isFinite(latitude) && Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) return { latitude, longitude };
  return extractCoordinates(order.delivery_location_link);
}
