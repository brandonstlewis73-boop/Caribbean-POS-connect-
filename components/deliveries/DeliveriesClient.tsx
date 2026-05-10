"use client";

import { useState } from "react";
import { Bike, CheckCircle2, MapPinned, PackageCheck, Phone, Route } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import type { Order } from "@/lib/types";

export function DeliveriesClient({ deliveries, currency }: { deliveries: Order[]; currency: string }) {
  const [items, setItems] = useState(deliveries);
  const formatMoney = (value: number | string | null | undefined) => money(value, currency);

  async function setStatus(orderId: string, status: string) {
    const response = await fetch(`/api/deliveries/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const payload = await readApiPayload<{ order: Order }>(response);
    if (response.ok) {
      const updated = payload.data?.order;
      if (!updated) return;
      setItems((current) =>
        current.map((order) => (order.id === orderId ? updated : order))
      );
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      {items.map((order) => (
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
              <p className="font-semibold">
                {[order.customer_snapshot.street_address, order.customer_snapshot.city, order.customer_snapshot.region, order.customer_snapshot.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {order.customer_snapshot.delivery_notes ? (
                <p className="text-slate-600 dark:text-slate-300">{order.customer_snapshot.delivery_notes}</p>
              ) : null}
            </div>
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
              {order.waze_link ? (
                <a href={order.waze_link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-caribbean-teal px-3 py-2 text-center text-sm font-black leading-tight text-white">
                  <Route className="h-4 w-4" />
                  Open in Waze
                </a>
              ) : (
                <Button disabled>
                  <MapPinned className="h-4 w-4" />
                  No location
                </Button>
              )}
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
            </div>
          </div>
        </Panel>
      ))}
      {!items.length ? (
        <Panel className="grid min-h-80 place-items-center xl:col-span-2">
          <p className="font-bold text-slate-500">No assigned deliveries right now.</p>
        </Panel>
      ) : null}
    </div>
  );
}
