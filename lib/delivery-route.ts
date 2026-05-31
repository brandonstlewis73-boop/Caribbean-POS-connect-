import type { Order } from "./types";
import { buildAddress, buildDeliveryMapLinks } from "./waze";

export type DeliveryRouteStop = {
  order: Order;
  sequence: number;
  address: string;
  addressNeedsReview: boolean;
  hasCoordinates: boolean;
  wazeLink: string | null;
  googleMapsLink: string | null;
  routeReason: string;
};

const ACTIVE_DELIVERY_STATUSES = new Set(["pending", "assigned", "out_for_delivery"]);

function deliveryAddress(order: Order) {
  return buildAddress([
    order.customer_snapshot.street_address,
    order.customer_snapshot.city,
    order.customer_snapshot.region,
    order.delivery_postal_code || order.customer_snapshot.postal_code,
    order.customer_snapshot.country
  ]);
}

function coordinates(order: Order) {
  const latitude = order.delivery_latitude ?? order.customer_snapshot.gps_latitude ?? null;
  const longitude = order.delivery_longitude ?? order.customer_snapshot.gps_longitude ?? null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude: Number(latitude), longitude: Number(longitude) };
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function addressSortKey(order: Order) {
  return [
    order.customer_snapshot.country || "",
    order.customer_snapshot.region || "",
    order.customer_snapshot.city || "",
    order.customer_snapshot.street_address || "",
    order.order_number
  ]
    .join(" ")
    .toLowerCase();
}

export function suggestDeliveryRoute(orders: Order[]) {
  const activeDeliveries = orders.filter(
    (order) => order.order_type === "delivery" && ACTIVE_DELIVERY_STATUSES.has(order.delivery_status)
  );
  const withCoordinates = activeDeliveries.filter((order) => coordinates(order));
  const withoutCoordinates = activeDeliveries
    .filter((order) => !coordinates(order))
    .sort((a, b) => addressSortKey(a).localeCompare(addressSortKey(b)));

  const routed: Order[] = [];
  const remaining = [...withCoordinates].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let current = remaining[0] ? coordinates(remaining[0]) : null;

  while (remaining.length) {
    let bestIndex = 0;
    if (current) {
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < remaining.length; index += 1) {
        const nextCoordinates = coordinates(remaining[index]);
        if (!nextCoordinates) continue;
        const distance = distanceKm(current, nextCoordinates);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    routed.push(next);
    current = coordinates(next);
  }

  return [...routed, ...withoutCoordinates].map((order, index): DeliveryRouteStop => {
    const address = deliveryAddress(order);
    const links = buildDeliveryMapLinks({
      latitude: order.delivery_latitude ?? order.customer_snapshot.gps_latitude ?? null,
      longitude: order.delivery_longitude ?? order.customer_snapshot.gps_longitude ?? null,
      locationLink: order.delivery_location_link,
      address
    });
    return {
      order,
      sequence: index + 1,
      address,
      addressNeedsReview: links.addressNeedsReview,
      hasCoordinates: links.hasCoordinates,
      wazeLink: links.wazeLink || order.waze_link || null,
      googleMapsLink: links.googleMapsLink || order.google_maps_link || null,
      routeReason: links.hasCoordinates
        ? "AI route assist used GPS distance."
        : links.addressNeedsReview
          ? "Address needs review."
          : "AI route assist grouped by address area."
    };
  });
}
