"use client";
import { PdfDocumentButton } from "@/components/documents/PdfDocumentButton";
import { userMessage } from "@/lib/user-messages";
import {Pagination,usePagination} from "@/components/workspace/Pagination";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Bike, CheckCircle2, Clock, MapPinned, PackageCheck, Phone, Route, Save, Search, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { suggestDeliveryRoute } from "@/lib/delivery-route";
import type { Order } from "@/lib/types";

const subscribeToClientTime = () => () => {};

function localDateTimeValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function DeliveriesClient({ deliveries, currency, canEditDetails = true, autoEstimate = true, origin = null }: { deliveries: Order[]; currency: string; canEditDetails?: boolean; autoEstimate?: boolean; origin?: { latitude: number; longitude: number } | null }) {
  const clientTime = useSyncExternalStore(subscribeToClientTime, () => true, () => false);
  const formatDateTime = (value: string) => clientTime ? new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)) : "Loading local time…";
  const [items, setItems] = useState(deliveries);
  const [drafts, setDrafts] = useState<Record<string, { driver_notes: string; estimated_delivery_at: string }>>({});
  const [message, setMessage] = useState("");
  const [view, setView] = useState("active");
  const [driver, setDriver] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<Record<string,number>>({});
  const [confirm, setConfirm] = useState<string | null>(null);
  const active = items.filter(order => ["pending", "assigned", "out_for_delivery"].includes(order.delivery_status) && order.status !== "cancelled");
  const drivers = Array.from(new Map(items.filter(order => order.assigned_driver_id).map(order => [order.assigned_driver_id!, order.assigned_driver_name || "Assigned driver"])).entries());
  const filtered = items.filter(order => (driver === "all" || (order.assigned_driver_id || "unassigned") === driver) && (view === "all" || (view === "active" ? active.some(entry => entry.id === order.id) : order.delivery_status === "delivered")) && `${order.order_number} ${order.customer_snapshot.name} ${order.customer_snapshot.street_address || ""} ${order.customer_snapshot.city || ""}`.toLowerCase().includes(query.toLowerCase()));
  const mixedDrivers = new Set(filtered.filter(order => active.some(entry => entry.id === order.id)).map(order => order.assigned_driver_id || "unassigned")).size > 1;
  const routeStops = useMemo(() => suggestDeliveryRoute(filtered, origin), [filtered, origin]);
  const displayed = view === "active" && !mixedDrivers ? routeStops.map(stop => stop.order) : filtered;

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
    if (busy) return;
    setBusy(order.id);
    setMessage("");
    const draft = draftFor(order);
    try {
      await patchOrder(order.id, {
        driver_notes: draft.driver_notes,
        estimated_delivery_at: draft.estimated_delivery_at ? new Date(draft.estimated_delivery_at).toISOString() : null
      } as Partial<Order>);
      setMessage(`Delivery #${order.order_number} details saved.`);
    } catch (error) {
      setMessage(userMessage(error, "Delivery details could not be saved."));
    } finally { setBusy(null); }
  }

  async function calculateArrival(orderId: string) {
    if (!navigator.geolocation) throw new Error("Location is unavailable. Enter an arrival time in order details.");
    const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, error => reject(new Error(error.code === 1 ? "Location access is blocked. Allow location in your browser settings, then try again." : error.code === 3 ? "Finding your location took too long. Move outdoors and try again." : "Your phone could not find its location. Check location services and try again.")), {enableHighAccuracy:true,timeout:15000,maximumAge:0}));
    const response = await fetch(`/api/deliveries/${orderId}/eta`, {method:"POST",headers:{"Content-Type":"application/json"},signal:AbortSignal.timeout(30000),body:JSON.stringify({latitude:position.coords.latitude,longitude:position.coords.longitude})});
    const payload = await readApiPayload<{order:Order;estimate:{minutes:number}}>(response);
    if (!response.ok || !payload.data?.order) throw new Error(payload.error || "Arrival estimate is unavailable. Check the delivery location.");
    const updated = payload.data.order;
    setItems(current => current.map(order => order.id === orderId ? updated : order));
    setDrafts(current => ({...current,[orderId]:{driver_notes:current[orderId]?.driver_notes ?? updated.driver_notes ?? "",estimated_delivery_at:localDateTimeValue(updated.estimated_delivery_at)}}));
    setEtaMinutes(current => ({...current,[orderId]:payload.data!.estimate.minutes}));
    return updated;
  }

  async function estimateArrival(orderId: string) {
    if (busy) return;
    setBusy(orderId);setMessage("");
    try {
      const updated = await calculateArrival(orderId);
      setMessage(`Delivery #${updated.order_number} arrival estimate saved. Road travel only; live traffic is not included.`);
    } catch (error) {
      setMessage(userMessage(error, "Arrival estimate unavailable. Please try again."));
    } finally {setBusy(null);}
  }

  async function setStatus(orderId: string, status: Order["delivery_status"]) {
    if (busy) return;
    setBusy(orderId);
    setMessage("");
    try {
      const response = await fetch(`/api/deliveries/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = await readApiPayload<{ order: Order }>(response);
      if (!response.ok || !payload.data?.order) throw new Error(payload.error || "Delivery status could not be updated.");
      const updated = payload.data.order;
      setItems(current => current.map(order => order.id === orderId ? updated : order));
      setConfirm(null);
      setMessage(`Delivery #${updated.order_number} marked ${status.replaceAll("_", " ")}.`);
      if (status === "out_for_delivery" && autoEstimate) {
        try { await calculateArrival(orderId); setMessage(`Delivery #${updated.order_number} is out for delivery. Arrival estimate saved without live traffic.`); }
        catch { setMessage(`Delivery #${updated.order_number} is out for delivery. Arrival estimate unavailable; check location access and the delivery address.`); }
      }
    } catch (error) {
      setMessage(userMessage(error, "Connection failed. Your delivery status has not been confirmed. Try again."));
    } finally { setBusy(null); }
  }

  const recordPage=usePagination(displayed,view+"|"+driver+"|"+query,3);
  return (
    <div className="delivery-workspace grid min-w-0 gap-4">
      {message ? <p role="status" className="rounded-card bg-teal-50 p-3 text-sm font-black text-teal-800 dark:bg-teal-400/10 dark:text-teal-100">{message}</p> : null}

      <section className="dispatch-hero">
        <div className="dispatch-eyebrow"><Route size={16}/> DELIVERY OPERATIONS</div>
        <h2>Your next stop, clearly.</h2>
        <p>Manage the handoff, stay in touch, and keep every delivery moving.</p>
        <p>Arrival estimates start from this phone’s current location. Estimate on the driver’s phone when they leave.</p>
        <div className="dispatch-metrics">
          <div><strong>{active.length}</strong><span>Active deliveries</span></div>
          <div><strong>{active.filter(order => order.delivery_status === "out_for_delivery").length}</strong><span>On the road</span></div>
          <div><strong>{active.filter(order => !order.assigned_driver_id).length}</strong><span>Unassigned</span></div>
          <div><strong>{items.filter(order => order.delivery_status === "delivered").length}</strong><span>Delivered</span></div>
        </div>
      </section>
      <section className="dispatch-toolbar" aria-label="Delivery filters">
        <div className="dispatch-tabs" role="group" aria-label="Delivery status">{["active", "delivered", "all"].map(value => <button key={value} aria-pressed={view === value} onClick={() => { setView(value); setConfirm(null); }}>{value === "all" ? "All deliveries" : value[0].toUpperCase() + value.slice(1)}</button>)}</div>
        <div className="dispatch-filters"><label><Search size={18}/><input aria-label="Search deliveries" placeholder="Search order, customer or area" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="Filter by driver" value={driver} onChange={event => setDriver(event.target.value)}><option value="all">All drivers</option><option value="unassigned">Unassigned</option>{drivers.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></div>
      </section>
      {view === "active" && displayed.length ? <div className="dispatch-route-note"><MapPinned size={20}/><div><strong>{mixedDrivers ? "Choose a driver to plan a single delivery run" : origin ? "Route starts from your saved business location" : "Route starts with the oldest GPS stop"}</strong><p>GPS stops use straight-line distance; address-only stops follow by area. Confirm the sequence in your navigation app for roads and traffic.</p></div></div> : null}
      <Pagination {...recordPage}/>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {recordPage.items.map((order, index) => {
          const stop = suggestDeliveryRoute([{...order, status: "new", delivery_status: "assigned"}])[0];
          const draft = draftFor(order);
          const addressText = stop?.address || "Address needs review.";
          return (
            <Panel key={order.id}>
              <PanelHeader
                title={`${view === "active" && !mixedDrivers ? `Stop ${(recordPage.page-1)*recordPage.pageSize+index + 1} · ` : ""}#${order.order_number}`}
                description={`${order.assigned_driver_name || "Unassigned"} - ${formatDateTime(order.created_at)}`}
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
                    <p className="delivery-customer-notes text-slate-600 dark:text-slate-300">{order.customer_snapshot.delivery_notes}</p>
                  ) : null}
                </div>
                <button className="dispatch-expand" aria-expanded={expanded === order.id} onClick={() => setExpanded(expanded === order.id ? null : order.id)}>Order details & driver notes <ChevronDown size={18}/></button>
                {expanded === order.id ? <div className="grid gap-4">                {canEditDetails ? <><div className="grid gap-3 sm:grid-cols-2">
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
                <Button disabled={Boolean(busy)} variant="secondary" onClick={() => saveDriverDetails(order)}>
                  <Save className="h-4 w-4" />
                  {busy === order.id ? "Saving…" : "Save driver details"}
                </Button></> : order.driver_notes ? <p className="text-sm">Driver notes: {order.driver_notes}</p> : null}
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
</div> : null}
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
                    <a href={`tel:${order.customer_snapshot.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                      <Phone className="h-4 w-4" />
                      Call customer
                    </a>
                  ) : null}
                  <PdfDocumentButton href={`/api/orders/${order.id}/label`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                    <PackageCheck className="h-4 w-4" />
                    Label
                  </PdfDocumentButton>
                  {active.some(entry => entry.id === order.id) ? <><Button disabled={Boolean(busy) || order.delivery_status === "out_for_delivery"} variant="secondary" onClick={() => setStatus(order.id, "out_for_delivery")}>
                    <Bike className="h-4 w-4" />
                    Out for delivery
                  </Button>
                  <Button disabled={Boolean(busy)} variant="success" onClick={() => setConfirm(order.id)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Mark delivered
                  </Button></> : null}
                  {confirm === order.id ? <div className="dispatch-confirm sm:col-span-2"><strong>Confirm delivery to {order.customer_snapshot.name}?</strong><p>This updates delivery status only. Payment remains {order.payment_status}.</p><div><Button disabled={Boolean(busy)} variant="success" onClick={() => setStatus(order.id, "delivered")}>{busy === order.id ? "Updating…" : "Confirm delivered"}</Button><Button disabled={Boolean(busy)} onClick={() => setConfirm(null)}>Cancel</Button></div></div> : null}
                  {active.some(entry => entry.id === order.id) ? <Button disabled={Boolean(busy)} onClick={() => estimateArrival(order.id)}><Clock className="h-4 w-4" />{busy === order.id ? "Working…" : "Estimate from this phone"}</Button> : null}
                  {order.estimated_delivery_at ? (
                    <p className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-caribbean-line px-3 py-2 text-sm font-black dark:border-slate-800">
                      <Clock className="h-4 w-4" />
                      <span>Arrival estimate: {formatDateTime(order.estimated_delivery_at)}<span className="mt-1 block text-xs font-semibold">{etaMinutes[order.id] ? `${etaMinutes[order.id]} min road travel · ` : ""}Your device timezone · confirm live traffic in Waze</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs font-semibold underline">Route data © OpenStreetMap contributors</a></span>
                    </p>
                  ) : null}
                </div>
              </div>
            </Panel>
          );
        })}
        {!displayed.length ? (
          <Panel className="grid min-h-80 place-items-center xl:col-span-2">
            <p className="font-bold text-slate-500">{query ? "No deliveries match your search." : view === "delivered" ? "No delivered orders in this view yet." : "No deliveries in this view. Choose another status or driver."}</p>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
