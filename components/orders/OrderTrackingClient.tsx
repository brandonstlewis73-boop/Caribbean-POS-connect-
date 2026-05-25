"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Phone, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import type { Order } from "@/lib/types";

type TrackingResponse = {
  order: Order;
  business: {
    name: string;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    logo_url?: string | null;
    default_prep_time_minutes?: number;
  };
};

const timeline = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed"
];

function tone(status: string) {
  if (["completed", "ready", "accepted"].includes(status)) return "green";
  if (["cancelled"].includes(status)) return "red";
  if (["new", "preparing", "out_for_delivery"].includes(status)) return "amber";
  return "neutral";
}

export function OrderTrackingClient() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (nextOrder = orderNumber, nextPhone = phone) => {
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: nextOrder, phone: nextPhone })
      });
      const payload = await readApiPayload<TrackingResponse>(response);
      if (!response.ok || !payload.data) {
        setTracking(null);
        setMessage(payload.error || "Order not found.");
        return;
      }
      setTracking(payload.data);
    } catch {
      setMessage("Tracking could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [orderNumber, phone]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get("order") || "";
    const phoneParam = params.get("phone") || "";
    if (order) setOrderNumber(order);
    if (phoneParam) setPhone(phoneParam);
    if (order && phoneParam) void lookup(order, phoneParam);
  }, [lookup]);

  const currentIndex = useMemo(() => {
    if (!tracking?.order) return -1;
    if (tracking.order.status === "cancelled") return -1;
    return timeline.indexOf(tracking.order.status);
  }, [tracking]);

  return (
    <main className="min-h-screen bg-[#030807] px-4 py-6 text-white sm:px-6">
      <section className="mx-auto grid max-w-5xl gap-5">
        <div className="rounded-card border border-white/10 bg-white/[0.06] p-5 shadow-soft backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/60">Caribbean Connect POS</p>
              <h1 className="mt-1 text-2xl font-black sm:text-4xl">Track your order</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-teal-50/65">Enter your order number and phone number to see the latest status, items, and pickup or delivery details.</p>
            </div>
            <ClipboardList className="h-12 w-12 text-cyan-200" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Order number" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="1042" />
            <Field label="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+18681234567" />
            <Button className="self-end" variant="primary" onClick={() => lookup()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Track
            </Button>
          </div>
          {message ? <p className="mt-4 rounded-card bg-red-500/10 p-3 text-sm font-bold text-red-100">{message}</p> : null}
        </div>

        {tracking ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-card border border-white/10 bg-white/[0.06] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-cyan-100/60">{tracking.business.name}</p>
                  <h2 className="text-2xl font-black">Order #{tracking.order.order_number}</h2>
                </div>
                <Badge tone={tone(tracking.order.status)}>{tracking.order.status.replaceAll("_", " ")}</Badge>
              </div>
              <div className="mt-5 grid gap-3">
                {timeline.map((status, index) => {
                  const done = currentIndex >= index || tracking.order.status === "completed";
                  const history = tracking.order.status_history?.find((item) => item.status === status);
                  return (
                    <div key={status} className="grid grid-cols-[28px_1fr] gap-3">
                      <span className={`mt-1 grid h-7 w-7 place-items-center rounded-full border text-xs font-black ${done ? "border-cyan-200 bg-cyan-300 text-slate-950" : "border-white/10 bg-black/30 text-cyan-100/50"}`}>{index + 1}</span>
                      <span className="rounded-card border border-white/10 bg-black/20 p-3">
                        <span className="block font-black capitalize">{status.replaceAll("_", " ")}</span>
                        <span className="mt-1 block text-xs font-semibold text-cyan-100/55">
                          {history?.created_at ? new Date(history.created_at).toLocaleString() : done ? "Updated" : "Waiting"}
                        </span>
                      </span>
                    </div>
                  );
                })}
                {tracking.order.status === "cancelled" ? (
                  <p className="rounded-card bg-red-500/10 p-3 text-sm font-bold text-red-100">This order was cancelled. Please contact the business for details.</p>
                ) : null}
              </div>
            </section>

            <aside className="grid gap-5">
              <section className="rounded-card border border-white/10 bg-white/[0.06] p-5">
                <h3 className="font-black">Order details</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  {tracking.order.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span className="font-semibold">{item.quantity} x {item.product_name}</span>
                      <strong>{money(item.line_total)}</strong>
                    </div>
                  ))}
                  <div className="mt-2 border-t border-white/10 pt-3 text-base font-black">
                    <div className="flex justify-between gap-3"><span>Total</span><span>{money(tracking.order.total)}</span></div>
                  </div>
                </div>
              </section>
              <section className="rounded-card border border-white/10 bg-white/[0.06] p-5">
                <h3 className="font-black">Pickup / delivery</h3>
                <p className="mt-2 text-sm font-semibold text-teal-50/65">{tracking.order.order_type.replaceAll("_", " ")}</p>
                <p className="mt-2 text-sm font-semibold text-teal-50/65">
                  {[tracking.order.customer_snapshot.street_address, tracking.order.customer_snapshot.city, tracking.order.customer_snapshot.region, tracking.order.customer_snapshot.country].filter(Boolean).join(", ")}
                </p>
                <div className="mt-3 grid gap-2">
                  {tracking.order.google_maps_link ? <a className="rounded-card bg-white/10 px-3 py-2 text-center text-sm font-black" href={tracking.order.google_maps_link} target="_blank" rel="noreferrer">Open Google Maps</a> : null}
                  {tracking.order.waze_link ? <a className="rounded-card bg-white/10 px-3 py-2 text-center text-sm font-black" href={tracking.order.waze_link} target="_blank" rel="noreferrer">Open Waze</a> : null}
                </div>
              </section>
              <section className="rounded-card border border-white/10 bg-white/[0.06] p-5">
                <h3 className="font-black">Business contact</h3>
                <div className="mt-3 grid gap-2 text-sm font-bold text-teal-50/70">
                  {tracking.business.phone ? <a className="flex items-center gap-2" href={`tel:${tracking.business.phone}`}><Phone className="h-4 w-4" />{tracking.business.phone}</a> : null}
                  {tracking.business.email ? <a href={`mailto:${tracking.business.email}`}>{tracking.business.email}</a> : null}
                  <p>Estimated prep: {tracking.business.default_prep_time_minutes || 25} minutes</p>
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}
