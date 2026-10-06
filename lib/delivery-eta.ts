import { deliveryLocation } from "./delivery-location";
import { enforceRateLimit } from "./rate-limit";
import type { Order } from "./types";
import { buildAddress } from "./waze";

export type RoutePoint = { latitude: number; longitude: number };
export function validRoutePoint(point: RoutePoint) {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}
export function arrivalFromDuration(seconds: number, now = Date.now()) {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 7 * 86400) throw new Error("No usable driving route was found.");
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return { minutes, arrival: new Date(now + minutes * 60000).toISOString() };
}
export async function calculateDeliveryEta(order: Order, origin: RoutePoint) {
  if (!validRoutePoint(origin)) throw new Error("Allow location access to estimate arrival.");
  let destination: RoutePoint | null = deliveryLocation(order);
  if (!destination) {
    const limited = await enforceRateLimit({scope:"delivery-address-provider",key:"nominatim",limit:1,windowSeconds:1});
    if (limited) throw new Error("Address lookup is busy. Try again shortly.");
    const customer = order.customer_snapshot;
    if (!customer.street_address || !customer.city || !customer.country) throw new Error("Add a complete delivery address or GPS location first.");
    const address = buildAddress([customer.street_address.replace(/^TEST ONLY\s*-\s*/i, ""), customer.city, customer.region, order.delivery_postal_code || customer.postal_code, customer.country]);
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q",address);url.searchParams.set("format","jsonv2");url.searchParams.set("limit","2");url.searchParams.set("addressdetails","1");
    const response = await fetch(url, {headers:{"User-Agent":"CaribbeanPOSConnect/1.0 (delivery arrival estimates)","Accept":"application/json"},signal:AbortSignal.timeout(10000),redirect:"error"});
    if (!response.ok) throw new Error("Address lookup is temporarily unavailable. Try again later or add the delivery GPS location.");
    const results = await response.json() as Array<{lat:string;lon:string}>;
    if (!Array.isArray(results) || results.length !== 1) throw new Error("Confirm the delivery GPS location first. The address did not identify one clear destination.");
    destination = {latitude:Number(results[0].lat),longitude:Number(results[0].lon)};
    if (!validRoutePoint(destination)) throw new Error("Confirm the delivery GPS location first.");
  }
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false&alternatives=false&steps=false`;
  const response = await fetch(url,{signal:AbortSignal.timeout(12000),redirect:"error",cache:"no-store"});
  if (!response.ok) throw new Error("Route estimates are temporarily unavailable. Please try again.");
  const data = await response.json() as {code?:string;routes?:Array<{duration:number;distance:number}>;waypoints?:Array<{distance:number}>};
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route || typeof route.duration !== "number") throw new Error("No usable driving route was found. Check the delivery location.");
  if (data.waypoints?.some(point => !Number.isFinite(point.distance) || point.distance > 500)) throw new Error("The route is too far from the supplied location. Confirm the delivery pin and try again.");
  return {...arrivalFromDuration(route.duration),destination,provider:"OSRM",trafficAware:false};
}
