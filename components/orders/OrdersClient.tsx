"use client";

import { useEffect, useMemo, useState } from "react";
import { Bike, CheckCircle2, CreditCard, ExternalLink, MessageCircle, PackageCheck, Search, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { money, ORDER_TYPE_LABELS } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import type { Order, User } from "@/lib/types";

function statusTone(status: string) {
  if (["paid", "completed", "delivered"].includes(status)) return "green";
  if (["unpaid", "pending", "out_for_delivery"].includes(status)) return "amber";
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
  | "notes";

export function OrdersClient({
  orders,
  drivers,
  canUpdateOrders
}: {
  orders: Order[];
  drivers: User[];
  canUpdateOrders: boolean;
}) {
  const [items, setItems] = useState(orders);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [selectedId, setSelectedId] = useState(orders[0]?.id || "");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const selected = items.find((order) => order.id === selectedId) || items[0];
  const isBusy = pendingAction !== null;

  useEffect(() => {
    setNotesDraft(selected?.notes || "");
  }, [selected?.id, selected?.notes]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((order) => {
      const typeMatch = type === "all" || order.order_type === type;
      const queryMatch =
        !q ||
        [order.order_number, order.customer_snapshot.name, order.customer_snapshot.phone, order.payment_method]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      return typeMatch && queryMatch;
    });
  }, [items, query, type]);

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
        <div className="grid min-w-0 gap-3 border-b border-caribbean-line p-4 dark:border-slate-800 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative min-w-0">
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
        </div>
        <div className="overflow-x-auto">
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
                  onClick={() => setSelectedId(order.id)}
                  className={`cursor-pointer transition hover:bg-caribbean-cloud dark:hover:bg-slate-950 ${
                    selected?.id === order.id ? "bg-teal-50 dark:bg-teal-950/30" : ""
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
                  <td className="px-4 py-3 text-right font-black">{money(order.total)}</td>
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
            <div className="grid min-w-0 gap-2">
              {selected.items.map((item) => (
                <div key={item.id} className="flex min-w-0 justify-between gap-3 text-sm">
                  <span className="min-w-0 font-bold">{item.quantity} x {item.product_name}</span>
                  <span className="font-black">{money(item.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-1 border-t border-caribbean-line pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between"><span>Subtotal</span><strong>{money(selected.subtotal)}</strong></div>
              <div className="flex justify-between"><span>Tax/Fee</span><strong>{money(selected.tax_total)}</strong></div>
              <div className="flex justify-between"><span>Delivery</span><strong>{money(selected.delivery_fee)}</strong></div>
              <div className="flex justify-between text-lg font-black"><span>Total</span><span>{money(selected.total)}</span></div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">
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
