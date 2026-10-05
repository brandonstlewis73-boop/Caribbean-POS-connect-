"use client";

/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Bike, CheckCircle2, CreditCard, ExternalLink, MessageCircle, PackageCheck, Search, Trash2, XCircle } from "lucide-react";
import { WhatsAppDelivery } from "./WhatsAppDelivery";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { SelectField, TextAreaField } from "@/components/ui/Field";
import { money, ORDER_TYPE_LABELS } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import type { Order, User } from "@/lib/types";

function statusTone(status: string) {
  if (["paid", "completed", "delivered", "ready", "accepted"].includes(status)) return "green";
  if (["unpaid", "pending", "out_for_delivery", "preparing", "new"].includes(status)) return "amber";
  if (["cancelled", "failed", "refunded"].includes(status)) return "red";
  return "neutral";
}

type PendingAction =
  | "payment-paid"
  | "payment-unpaid"
  | "cancel"
  | "driver"
  | "delivery-out"
  | "delivery-failed"
  | "notes"
  | "delete"
  | "status";

const workflowStatuses: Array<{ value: Order["status"]; label: string }> = [
  { value: "accepted", label: "Accept Order" },
  { value: "preparing", label: "Start Preparing" },
  { value: "ready", label: "Mark Ready" },
  { value: "out_for_delivery", label: "Send for Delivery" },
  { value: "completed", label: "Complete Order" }
];

export function OrdersClient({
  orders,
  drivers,
  canUpdateOrders,
  currency
}: {
  orders: Order[];
  drivers: User[];
  canUpdateOrders: boolean;
  currency: string;
}) {
  const [items, setItems] = useState(orders);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(orders[0]?.id || "");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const selected = items.find((order) => order.id === selectedId) || items[0];
  const isBusy = pendingAction !== null;
  const deferredQuery = useDeferredValue(query);
  const formatMoney = (value: number | string | null | undefined) => money(value, currency);

  useEffect(() => {
    function handleNewOrder(event: Event) {
      const order = (event as CustomEvent<Order>).detail;
      if (!order?.id) return;
      setItems((current) => {
        if (current.some((item) => item.id === order.id)) return current;
        return [order, ...current];
      });
      setHighlightedIds((current) => new Set(current).add(order.id));
      setSelectedId((current) => current || order.id);
      setMessage(`New order received: #${order.order_number}`);
    }
    window.addEventListener("caribbean:new-order", handleNewOrder as EventListener);
    window.dispatchEvent(new CustomEvent("caribbean:orders-seen"));
    return () => window.removeEventListener("caribbean:new-order", handleNewOrder as EventListener);
  }, []);

  function viewOrder(orderId: string) {
    setSelectedId(orderId);
    setHighlightedIds((current) => {
      if (!current.has(orderId)) return current;
      const next = new Set(current);
      next.delete(orderId);
      return next;
    });
    window.dispatchEvent(new CustomEvent("caribbean:orders-seen"));
  }
  useEffect(() => {
    setNotesDraft(selected?.notes || "");}, [selected?.id, selected?.notes]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("order");
    if (requested && items.some((order) => order.id === requested)) {
      setSelectedId(requested);
    }
  }, [items]);

  const filtered = useMemo(() => {
    const q = deferredQuery.toLowerCase().trim();
    const now = new Date();
    return items.filter((order) => {
      const typeMatch = type === "all" || order.order_type === type;
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && !["completed", "cancelled"].includes(order.status)) ||
        order.status === statusFilter;
      const created = new Date(order.created_at);
      const dateMatch =
        dateFilter === "all" ||
        (dateFilter === "today" && created.toDateString() === now.toDateString()) ||
        (dateFilter === "week" && now.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000);
      const queryMatch =
        !q ||
        [order.order_number, order.customer_snapshot.name, order.customer_snapshot.phone, order.payment_method, order.status, order.order_type]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      return typeMatch && statusMatch && dateMatch && queryMatch;
    });
  }, [items, deferredQuery, type, statusFilter, dateFilter]);

  const statusGroups = useMemo(() => {
    const labels: Array<{ key: Order["status"] | "delivery_pickup"; label: string; statuses: string[] }> = [
      { key: "new", label: "New", statuses: ["new"] },
      { key: "accepted", label: "Accepted", statuses: ["accepted"] },
      { key: "preparing", label: "Preparing", statuses: ["preparing"] },
      { key: "ready", label: "Ready", statuses: ["ready"] },
      { key: "delivery_pickup", label: "Delivery / Pickup", statuses: ["out_for_delivery"] },
      { key: "completed", label: "Completed", statuses: ["completed"] },
      { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] }
    ];
    return labels.map((group) => ({
      ...group,
      orders: filtered.filter((order) => group.statuses.includes(order.status))
    }));
  }, [filtered]);

  async function patchOrder(orderId: string, body: Record<string, unknown>, action: PendingAction) {
    if (isBusy) return null;
    if (!canUpdateOrders) {
      setMessage("Only an admin or manager can update or cancel orders.");
      return null;
    }
    setMessage("");
    setPendingAction(action);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await readApiPayload<{ order: Order }>(response);
      if (!response.ok) {
        setMessage(payload.error || "Order could not be updated.");
        return null;
      }
      const updated = payload.data?.order;
      if (!updated) {
        setMessage("Order updated, but no order details were returned.");
        return null;
      }
      setItems((current) =>
        current.map((order) => (order.id === orderId ? updated : order))
      );
      setSelectedId(updated.id);
      setNotesDraft(updated.notes || "");
      setMessage(`Order #${updated.order_number} updated.`);
      return updated;
    } catch {
      setMessage("Order could not be updated.");
      return null;
    } finally {
      setPendingAction(null);
    }
  }

  async function cancelOrder(order: Order) {
    if (order.status === "cancelled") {
      setMessage(`Order #${order.order_number} is already cancelled.`);
      return;
    }
    await patchOrder(order.id, {
      status: "cancelled",
      payment_status: order.payment_status === "paid" ? "refunded" : order.payment_status,
      delivery_status:
        order.delivery_status !== "not_required" && order.delivery_status !== "delivered"
          ? "failed"
          : order.delivery_status
    }, "cancel");
  }

  async function deleteOrder(order: Order) {
    if (isBusy) return;
    if (!canUpdateOrders) {
      setMessage("Only an admin or manager can delete orders.");
      return;
    }
    if (!window.confirm(`Delete order #${order.order_number}? Product stock and customer totals will be reversed when needed.`)) return;
    setMessage("");
    setPendingAction("delete");
    try {
      const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      const payload = await readApiPayload<{ order: Order }>(response);
      if (!response.ok) {
        setMessage(payload.error || "Order could not be deleted.");
        return;
      }
      const remaining = items.filter((item) => item.id !== order.id);
      setItems(remaining);
      setSelectedId(remaining[0]?.id || "");
      setMessage(`Order #${order.order_number} deleted.`);
    } catch {
      setMessage("Order could not be deleted.");
    } finally {
      setPendingAction(null);
    }
  }

  async function updatePaymentStatus(status: Order["payment_status"]) {
    if (!selected) return;
    await patchOrder(selected.id, { payment_status: status }, status === "paid" ? "payment-paid" : "payment-unpaid");
  }

  async function assignDriver(driverId: string) {
    if (!selected) return;
    await patchOrder(
      selected.id,
      {
        assigned_driver_id: driverId || null,
        delivery_status: driverId ? "assigned" : "pending"
      },
      "driver"
    );
  }

  async function updateDeliveryStatus(status: Order["delivery_status"]) {
    if (!selected) return;
    await patchOrder(
      selected.id,
      { delivery_status: status },
      status === "failed" ? "delivery-failed" : "delivery-out"
    );
  }

  async function updateOrderStatus(status: Order["status"]) {
    if (!selected) return;
    const patch: Record<string, unknown> = { status };
    if (status === "out_for_delivery") patch.delivery_status = "out_for_delivery";
    if (status === "completed" && selected.payment_status === "unpaid") patch.payment_status = selected.payment_status;
    await patchOrder(selected.id, patch, "status");
  }

  async function saveNotes() {
    if (!selected || notesDraft === (selected.notes || "")) return;
    await patchOrder(selected.id, { notes: notesDraft }, "notes");
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <Panel>
        <PanelHeader
          title="Orders"
          description="In-store, pickup, delivery, online, draft, completed, and cancelled orders"
        />
        <div className="grid min-w-0 gap-3 border-b border-caribbean-line p-4 dark:border-slate-800 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_160px_180px_160px]">
          <label className="relative min-w-0 sm:col-span-2 2xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order, customer, phone, payment"
              className="h-10 w-full rounded-card border border-caribbean-line bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-caribbean-teal focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-10 rounded-card border border-caribbean-line bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">All order types</option>
            <option value="in_store">In-store</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
            <option value="online">Online</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-card border border-caribbean-line bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="active">Active orders</option>
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="accepted">Accepted</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="out_for_delivery">Delivery / pickup</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="h-10 rounded-card border border-caribbean-line bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">Any date</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
          </select>
        </div>
        {highlightedIds.size ? (
          <button
            type="button"
            onClick={() => {
              const first = Array.from(highlightedIds)[0];
              if (first) viewOrder(first);
            }}
            className="sticky top-0 z-10 mx-4 mt-4 rounded-card border border-amber-300/30 bg-amber-300 px-4 py-3 text-left text-sm font-black text-slate-950 shadow-glow"
          >
            {highlightedIds.size} new order{highlightedIds.size === 1 ? "" : "s"} - tap to view
          </button>
        ) : null}
        <div className="grid min-w-0 grid-cols-2 gap-3 border-b border-white/10 p-4 xl:grid-cols-4">
          {statusGroups.map((group) => (
            <button
              key={group.label}
              onClick={() => setStatusFilter(group.key === "delivery_pickup" ? "out_for_delivery" : group.key)}
              className="rounded-card border border-white/10 bg-black/20 p-3 text-left"
            >
              <p className="text-xs font-black uppercase tracking-normal text-cyan-100/55">{group.label}</p>
              <p className="mt-1 text-2xl font-black text-white">{group.orders.length}</p>
            </button>
          ))}
        </div>
        <div className="grid gap-3 p-4 md:hidden">
          {filtered.map((order) => (
            <button
              key={order.id}
              onClick={() => viewOrder(order.id)}
              className={`min-w-0 w-full rounded-card border p-3 text-left ${
                selected?.id === order.id
                  ? "border-cyan-300 bg-teal-50 text-slate-950"
                  : "border-caribbean-line bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-black">#{order.order_number}</p>
                  <p className="truncate text-sm font-bold">{order.customer_snapshot.name || "Walk-in customer"}</p>
                  <p className="text-xs font-semibold text-slate-500">{order.customer_snapshot.phone || "No phone"}</p>
                </div>
                <p className="shrink-0 whitespace-nowrap font-black">{formatMoney(order.total)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={statusTone(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
                <Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge>
                <Badge tone={statusTone(order.delivery_status)}>{order.delivery_status.replaceAll("_", " ")}</Badge>
              </div>
            </button>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-caribbean-cloud text-xs uppercase tracking-normal text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-caribbean-line dark:divide-slate-800">
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => viewOrder(order.id)}
                  className={`cursor-pointer transition hover:bg-caribbean-cloud dark:hover:bg-slate-950 ${
                    selected?.id === order.id ? "bg-teal-50 dark:bg-teal-950/30" : highlightedIds.has(order.id) ? "bg-amber-50 dark:bg-amber-950/25" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-black">#{order.order_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{order.customer_snapshot.name || "Walk-in customer"}</p>
                    <p className="text-xs font-semibold text-slate-500">{order.customer_snapshot.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{ORDER_TYPE_LABELS[order.order_type] || order.order_type}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge>
                      <span className="text-xs font-semibold text-slate-500">{order.payment_method}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(order.delivery_status)}>{order.delivery_status.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-black">{formatMoney(order.total)}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <p className="font-black text-white">No orders yet.</p>
                    <p className="mt-1 text-sm font-semibold text-teal-50/60">New POS, pickup, online, and delivery orders will appear here.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected ? (
        <Panel>
          <PanelHeader title={`Order #${selected.order_number}`} description={new Date(selected.created_at).toLocaleString()} />
          <div className="grid min-w-0 gap-4 p-4">
            {message ? (
              <p className={`rounded-card p-3 text-sm font-bold ${
                message.includes("could not") || message.includes("Only ")
                  ? "bg-red-50 text-red-700"
                  : "bg-teal-50 text-teal-800"
              }`}>
                {message}
              </p>
            ) : null}
            <div className="rounded-card bg-caribbean-cloud p-3 text-sm dark:bg-slate-950">
              <p className="font-black">{selected.customer_snapshot.name || "Walk-in customer"}</p>
              <p className="font-semibold text-slate-500">{selected.customer_snapshot.phone || "No phone"}</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                {[selected.customer_snapshot.street_address, selected.customer_snapshot.city, selected.customer_snapshot.region, selected.customer_snapshot.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(selected.status)}>Order {selected.status}</Badge>
              <Badge tone={statusTone(selected.payment_status)}>Payment {selected.payment_status}</Badge>
              <Badge tone={statusTone(selected.delivery_status)}>
                Delivery {selected.delivery_status.replaceAll("_", " ")}
              </Badge>
            </div>
            <div className="grid gap-2 rounded-card border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-black uppercase tracking-normal text-cyan-100/55">Status timeline</p>
              {(selected.status_history?.length ? selected.status_history : [{ id: selected.id, status: selected.status, note: "Current status", created_at: selected.created_at }]).map((history) => (
                <div key={history.id} className="grid grid-cols-[12px_1fr] gap-3 text-sm">
                  <span className="mt-1.5 h-3 w-3 rounded-full bg-cyan-300" />
                  <span>
                    <span className="block font-black text-white">{String(history.status).replaceAll("_", " ")}</span>
                    <span className="block text-xs font-semibold text-teal-50/55">{history.note || "Status updated"} Â· {new Date(history.created_at).toLocaleString()}</span>
                  </span>
                </div>
              ))}
            </div>
            <WhatsAppDelivery key={selected.id} orderId={selected.id} canRetry={canUpdateOrders} onRefresh={order=>setItems(current=>current.map(item=>item.id===order.id?order:item))}/>
            {selected.customer_notifications?.length ? (
              <div className="grid gap-2 rounded-card border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-black uppercase tracking-normal text-cyan-100/55">Customer notifications</p>
                {selected.customer_notifications.slice(-5).map((notification) => (
                  <div key={notification.id} className="flex min-w-0 items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 break-words">
                      <span className="block font-bold capitalize">{notification.channel}</span>
                      <span className="block text-xs font-semibold text-teal-50/55">{notification.message}</span>{notification.error_message?<span className="mt-1 block text-xs text-red-100">{notification.error_message}</span>:null}
                    </span>
                    <Badge tone={["sent","delivered","read"].includes(notification.delivery_status) ? "green" : ["failed","undelivered"].includes(notification.delivery_status) ? "red" : "neutral"}>{notification.delivery_status}</Badge>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid min-w-0 gap-2">
              {selected.items.map((item) => (
                <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} loading="lazy" className="h-10 w-10 shrink-0 rounded-card object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-white/10 text-xs font-black text-cyan-100">{item.product_name.slice(0, 2).toUpperCase()}</span>
                    )}
                    <span className="min-w-0 font-bold">{item.quantity} x {item.product_name}</span>
                  </div>
                  <span className="shrink-0 font-black">{formatMoney(item.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-1 border-t border-caribbean-line pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(selected.subtotal)}</strong></div>
              <div className="flex justify-between"><span>Tax/Fee</span><strong>{formatMoney(selected.tax_total)}</strong></div>
              <div className="flex justify-between"><span>Delivery</span><strong>{formatMoney(selected.delivery_fee)}</strong></div>
              <div className="flex justify-between text-lg font-black"><span>Total</span><span>{formatMoney(selected.total)}</span></div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">
              {workflowStatuses.map((status) => (
                <Button
                  key={status.value}
                  variant={status.value === "completed" ? "success" : "secondary"}
                  onClick={async () => updateOrderStatus(status.value)}
                  disabled={!canUpdateOrders || selected.status === "cancelled" || selected.status === status.value || isBusy}
                >
                  {status.value === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}
                  {pendingAction === "status" ? "Updating..." : status.label}
                </Button>
              ))}
              <Button
                variant="success"
                onClick={async () => updatePaymentStatus("paid")}
                disabled={!canUpdateOrders || selected.status === "cancelled" || isBusy}
              >
                <CheckCircle2 className="h-4 w-4" />
                {pendingAction === "payment-paid" ? "Updating..." : "Mark paid"}
              </Button>
              <Button
                variant="secondary"
                onClick={async () => updatePaymentStatus("unpaid")}
                disabled={!canUpdateOrders || selected.status === "cancelled" || isBusy}
              >
                <CreditCard className="h-4 w-4" />
                {pendingAction === "payment-unpaid" ? "Updating..." : "Mark payment unpaid"}
              </Button>
              <Button
                variant="danger"
                onClick={async () => cancelOrder(selected)}
                disabled={!canUpdateOrders || selected.status === "cancelled" || isBusy}
              >
                <XCircle className="h-4 w-4" />
                {pendingAction === "cancel" ? "Cancelling..." : selected.status === "cancelled" ? "Cancelled" : "Cancel order"}
              </Button>
              <Button
                variant="danger"
                onClick={async () => deleteOrder(selected)}
                disabled={!canUpdateOrders || isBusy}
              >
                <Trash2 className="h-4 w-4" />
                {pendingAction === "delete" ? "Deleting..." : "Delete order"}
              </Button>
            </div>
            {!canUpdateOrders ? (
              <p className="text-xs font-semibold text-slate-500">
                Your role can view orders, but only admins and managers can cancel or update them.
              </p>
            ) : null}
            {selected.order_type === "delivery" ? (
              <div className="grid gap-3">
                <SelectField
                  label="Assigned driver"
                  value={selected.assigned_driver_id || ""}
                  onChange={async (event) => assignDriver(event.target.value)}
                  disabled={!canUpdateOrders || selected.status === "cancelled" || isBusy}
                >
                  <option value="">Unassigned</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                </SelectField>
                <Button
                  variant="primary"
                  onClick={async () => updateDeliveryStatus("out_for_delivery")}
                  disabled={!canUpdateOrders || selected.status === "cancelled" || isBusy}
                >
                  <Bike className="h-4 w-4" />
                  {pendingAction === "delivery-out" ? "Updating..." : "Mark out for delivery"}
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => updateDeliveryStatus("failed")}
                  disabled={!canUpdateOrders || selected.status === "cancelled" || isBusy}
                >
                  <XCircle className="h-4 w-4" />
                  {pendingAction === "delivery-failed" ? "Updating..." : "Mark delivery failed"}
                </Button>
              </div>
            ) : null}
            <div className="grid gap-2">
              <TextAreaField
                label="Order notes"
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
              />
              <Button
                variant="secondary"
                onClick={async () => saveNotes()}
                disabled={!canUpdateOrders || selected.status === "cancelled" || isBusy || notesDraft === (selected.notes || "")}
              >
                {pendingAction === "notes" ? "Saving notes..." : "Save notes"}
              </Button>
            </div>
            <div className="grid gap-2">
              {selected.waze_link ? (
                <a href={selected.waze_link} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                  <ExternalLink className="h-4 w-4" />
                  Open in Waze
                </a>
              ) : null}
              {selected.google_maps_link ? (
                <a href={selected.google_maps_link} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                  <ExternalLink className="h-4 w-4" />
                  Open in Google Maps
                </a>
              ) : null}
              {selected.payment_link ? (
                <a href={selected.payment_link} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card bg-caribbean-mango px-3 py-2 text-center text-sm font-black leading-tight text-slate-950">
                  <CreditCard className="h-4 w-4" />
                  Open payment link
                </a>
              ) : null}
              {selected.whatsapp_customer_link ? (
                <a href={selected.whatsapp_customer_link} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card bg-caribbean-palm px-3 py-2 text-center text-sm font-black leading-tight text-white">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp customer
                </a>
              ) : null}
              {selected.whatsapp_business_link ? (
                <a href={selected.whatsapp_business_link} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                  <MessageCircle className="h-4 w-4" />
                  Send order to WhatsApp
                </a>
              ) : null}
              <a href={`/api/orders/${selected.id}/receipt`} className="inline-flex min-h-10 items-center justify-center rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                Download PDF receipt
              </a>
              <a href={`/api/orders/${selected.id}/label`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
                <PackageCheck className="h-4 w-4" />
                Print shipping label
              </a>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
