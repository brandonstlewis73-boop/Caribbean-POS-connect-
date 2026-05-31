"use client";

import { useMemo, useState } from "react";
import { Bike, CheckCircle2, Clock, MapPinned, Navigation, PackageCheck, Phone, Route, Save } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { suggestDeliveryRoute } from "@/lib/delivery-route";
import type { Order } from "@/lib/types";

function localDateTimeValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function DeliveriesClient({ deliveries, currency }: { deliveries: Order[]; currency: string }) {
  const [items, setItems] = useState(deliveries);
  const [drafts, setDrafts] = useState<Record<string, { driver_notes: string; estimated_delivery_at: string }>>({});
  const [message, setMessage] = useState("");
  const routeStops = useMemo(() => suggestDeliveryRoute(items), [items]);
  const formatMoney = (value: number | string | null | undefined) => money(value, currency);

  function draftFor(order: Order) {
    return drafts[order.id] || {
      driver_notes: order.driver_notes || "",
      estimated_delivery_at: localDateTimeValue(order.estimated_delivery_at)
    };
  }

  function updateDraft(orderId: string, patch: Partial<{ driver_notes: string; estimated_delivery_at: string }>) {
    setDrafts((current) => ({
      ...current,
      [orderId]: { ...draftFor(items.find((item) => item.id === orderId)!), ...patch }
    }));
  }

  async function patchOrder(orderId: string, body: Partial<Order>) {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await readApiPayload<{ order: Order }>(response);
    if (!response.ok || !payload.data?.order) {
      throw new Error(payload.error || "Delivery could not be updated.");
    }
    setItems((current) => current.map((order) => (order.id === orderId ? payload.data!.order : order)));
    return payload.data.order;
  }

  async function saveDriverDetails(order: Order) {
    setMessage("");
    const draft = draftFor(order);
    try {
      await patchOrder(order.id, {
        driver_notes: draft.driver_notes,
        estimated_delivery_at: draft.estimated_delivery_at ? new Date(draft.estimated_delivery_at).toISOString() : null
      } as Partial<Order>);
      setMessage(`Delivery #${order.order_number} details saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delivery details could not be saved.");
    }
  }

  async function setStatus(orderId: string, status: Order["delivery_status"]) {
    setMessage("");
    const response = await fetch(`/api/deliveries/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const payload = await readApiPayload<{ order: Order }>(response);
    if (response.ok) {
      const updated = payload.data?.order;
      if (!updated) return;
      setItems((current) => current.map((order) => (order.id === orderId ? updated : order)));
      setMessage(`Delivery #${updated.order_number} marked ${status.replaceAll("_", " ")}.`);
    } else {
      setMessage(payload.error || "Delivery status could not be updated.");
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      {message ? <p className="rounded-card bg-teal-50 p-3 text-sm font-black text-teal-800 dark:bg-teal-400/10 dark:text-teal-100">{message}</p> : null}

      <Panel>
        <PanelHeader
          title="AI route assistance"
          description="Suggested delivery sequence using coordinates first, then address area. No paid map API required."
          action={<Badge tone="teal">{routeStops.length} active</Badge>}
        />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {routeStops.map((stop) => (
            <article key={stop.order.id} className="rounded-card border border-caribbean-line bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-caribbean-teal">Stop {stop.sequence}</p>
                  <p className="mt-1 font-black">#{stop.order.order_number} - {stop.order.customer_snapshot.name}</p>
                </div>
                <Badge tone={stop.addressNeedsReview ? "amber" : "green"}>{stop.hasCoordinates ? "GPS" : "Address"}</Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-500">{stop.addressNeedsReview ? "Address needs review." : stop.address}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">{stop.routeReason}</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {stop.wazeLink ? (
                  <a href={stop.wazeLink} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card bg-caribbean-teal px-3 py-2 text-center text-sm font-black text-white">
                    <Route className="h-4 w-4" />
                    Open in Waze
                  </a>
                ) : null}
                {stop.googleMapsLink ? (
                  <a href={stop.googleMapsLink} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black dark:border-slate-700 dark:bg-slate-900">
                    <Navigation className="h-4 w-4" />
                    Google Maps
                  </a>
                ) : null}
              </div>
            </article>
          ))}
          {!routeStops.length ? (
            <p className="rounded-card border border-caribbean-line bg-white p-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 md:col-span-2 xl:col-span-3">
              No active delivery route to optimize right now.
            </p>
          ) : null}
        </div>
      </Panel>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {items.map((order) => {
          const stop = routeStops.find((entry) => entry.order.id === order.id);
          const draft = draftFor(order);
          const addressText = stop?.address || "Address needs review.";
          return (
            <Panel key={order.id}>
              <PanelHeader
                title={`Delivery #${order.order_number}`}
                description={`${order.assigned_driver_name || "Unassigned"} - ${new Date(order.created_at).toLocaleString()}`}
                action={<Badge tone={order.delivery_status === "delivered" ? "green" : "amber"}>{order.delivery_status.replaceAll("_", " ")}</Badge>}
              />
              <div className="grid min-w-0 gap-4 p-4">
                <div className="grid min-w-0 gap-2 rounded-card bg-caribbean-cloud p-3 text-sm dark:bg-slate-950">
                  <p className="text-base font-black">{order.customer_snapshot.name}</p>
                  <p className="font-semibold text-slate-500">{order.customer_snapshot.phone}</p>
                  <p className={`font-semibold ${stop?.addressNeedsReview ? "text-amber-600 dark:text-amber-200" : ""}`}>
                    {stop?.addressNeedsReview ? "Address needs review." : addressText}
                  </p>
                  {order.customer_snapshot.delivery_notes ? (
                    <p className="text-slate-600 dark:text-slate-300">{order.customer_snapshot.delivery_notes}</p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextAreaField
                    label="Driver notes"
                    value={draft.driver_notes}
                    onChange={(event) => updateDraft(order.id, { driver_notes: event.target.value })}
                    placeholder="Gate code, landmark, call on arrival..."
                  />
                  <Field
                    label="Estimated delivery time"
                    type="datetime-local"
                    value={draft.estimated_delivery_at}
                    onChange={(event) => updateDraft(order.id, { estimated_delivery_at: event.target.value })}
                  />
                </div>
                <Button variant="secondary" onClick={() => saveDriverDetails(order)}>
                  <Save className="h-4 w-4" />
                  Save driver details
                </Button>
                <div className="grid min-w-0 gap-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex min-w-0 justify-between gap-3 text-sm">
                      <span className="min-w-0 font-bold">{item.quantity} x {item.product_name}</span>
                      <span className="font-black">{formatMoney(item.line_total)}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-card border border-caribbean-line p-3 dark:border-slate-800">
                    <p className="font-bold text-slate-500">Payment</p>
                    <p className="font-black">{order.payment_status} - {order.payment_method}</p>
                  </div>
                  <div className="rounded-card border border-caribbean-line p-3 dark:border-slate-800">
                    <p className="font-bold text-slate-500">Total</p>
                    <p className="font-black">{formatMoney(order.total)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {stop?.wazeLink ? (
                    <a href={stop.wazeLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-caribbean-teal px-3 py-2 text-center text-sm font-black leading-tight text-white">
                      <Route className="h-4 w-4" />
                      Open in Waze
                    </a>
                  ) : (
                    <Button disabled>
                      <MapPinned className="h-4 w-4" />
                      No location
                    </Button>
                  )}
                  {stop?.googleMapsLink ? (
                    <a href={stop.googleMapsLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                      <MapPinned className="h-4 w-4" />
                      Open in Google Maps
                    </a>
                  ) : null}
                  {order.customer_snapshot.phone ? (
                    <a href={`tel:${order.customer_snapshot.phone}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                      <Phone className="h-4 w-4" />
                      Call customer
                    </a>
                  ) : null}
                  <a href={`/api/orders/${order.id}/label`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                    <PackageCheck className="h-4 w-4" />
                    Label
                  </a>
                  <Button variant="secondary" onClick={() => setStatus(order.id, "out_for_delivery")}>
                    <Bike className="h-4 w-4" />
                    Out for delivery
                  </Button>
                  <Button variant="success" onClick={() => setStatus(order.id, "delivered")}>
                    <CheckCircle2 className="h-4 w-4" />
                    Delivered
                  </Button>
                  {order.estimated_delivery_at ? (
                    <p className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-caribbean-line px-3 py-2 text-sm font-black dark:border-slate-800">
                      <Clock className="h-4 w-4" />
                      ETA {new Date(order.estimated_delivery_at).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
            </Panel>
          );
        })}
        {!items.length ? (
          <Panel className="grid min-h-80 place-items-center xl:col-span-2">
            <p className="font-bold text-slate-500">No assigned deliveries right now.</p>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
