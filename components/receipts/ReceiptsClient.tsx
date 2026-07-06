"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { MessageCircle, Printer, ReceiptText, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import type { Receipt } from "@/lib/types";

export function ReceiptsClient({
  receipts,
  currency,
  canResend
}: {
  receipts: Receipt[];
  currency: string;
  canResend: boolean;
}) {
  const [items, setItems] = useState(receipts);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const deferredQuery = useDeferredValue(query);
  const formatMoney = (value: number | string | null | undefined) => money(value, currency);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items.filter((receipt) =>
      !q ||
      [
        receipt.receipt_number,
        receipt.order_number,
        receipt.customer_name,
        receipt.customer_phone,
        receipt.payment_method,
        receipt.completed_at,
        receipt.created_at
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, deferredQuery]);

  async function resendWhatsApp(receipt: Receipt) {
    if (!canResend) {
      setMessage("Only an admin or manager can resend receipts.");
      return;
    }
    setMessage("");
    setBusyId(receipt.id);
    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_whatsapp", receipt_id: receipt.id })
      });
      const payload = await readApiPayload<{ receipt: Receipt | null; message: string }>(response);
      if (!response.ok) {
        setMessage(payload.error || "Receipt WhatsApp could not be sent.");
        return;
      }
      if (payload.data?.receipt) {
        setItems((current) =>
          current.map((item) => (item.id === receipt.id ? payload.data!.receipt! : item))
        );
      }
      setMessage(payload.data?.message || "Receipt WhatsApp request finished.");
    } catch {
      setMessage("Receipt WhatsApp could not be sent. Check your connection and try again.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <Panel>
        <PanelHeader title="Receipts" description="Search, print, and resend customer receipts" />
        <div className="border-b border-caribbean-line p-4 dark:border-slate-800">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customer, phone, order, receipt, payment, or date"
              className="h-11 w-full rounded-card border border-caribbean-line bg-white pl-10 pr-3 text-base font-semibold outline-none focus:border-caribbean-teal focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>

        {message ? (
          <p className="mx-4 mt-4 rounded-card bg-caribbean-cloud p-3 text-sm font-black text-slate-700 dark:bg-slate-950 dark:text-slate-200">
            {message}
          </p>
        ) : null}

        <div className="grid gap-3 p-4 md:hidden">
          {filtered.map((receipt) => (
            <div key={receipt.id} className="rounded-card border border-caribbean-line bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black">#{receipt.receipt_number}</p>
                  <p className="text-sm font-bold text-slate-500">Order #{receipt.order_number}</p>
                </div>
                <Badge tone={receipt.whatsapp_sent_at ? "green" : "neutral"}>
                  {receipt.whatsapp_sent_at ? "Sent" : "Ready"}
                </Badge>
              </div>
              <p className="mt-3 font-bold">{receipt.customer_name || "Walk-in customer"}</p>
              <p className="text-sm font-semibold text-slate-500">{receipt.customer_phone || "No phone"}</p>
              <div className="mt-3 flex justify-between text-sm">
                <span>{receipt.payment_method}</span>
                <strong>{formatMoney(receipt.total)}</strong>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={`/api/orders/${receipt.order_id}/receipt`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line px-3 py-2 text-center text-sm font-black dark:border-slate-700">
                  <Printer className="h-4 w-4" />
                  Print
                </a>
                <Button onClick={() => resendWhatsApp(receipt)} disabled={busyId === receipt.id || !canResend}>
                  <MessageCircle className="h-4 w-4" />
                  {busyId === receipt.id ? "Sending..." : "WhatsApp"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-caribbean-cloud text-xs uppercase tracking-normal text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-caribbean-line dark:divide-slate-800">
              {filtered.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="px-4 py-3">
                    <p className="font-black">#{receipt.receipt_number}</p>
                    <p className="text-xs font-semibold text-slate-500">Order #{receipt.order_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{receipt.customer_name || "Walk-in customer"}</p>
                    <p className="text-xs font-semibold text-slate-500">{receipt.customer_phone || "No phone"}</p>
                  </td>
                  <td className="px-4 py-3">{receipt.completed_at ? new Date(receipt.completed_at).toLocaleString() : "Not recorded"}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{receipt.payment_method}</p>
                    <p className="text-xs font-semibold text-slate-500">{receipt.payment_status}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-black">{formatMoney(receipt.total)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={receipt.whatsapp_sent_at ? "green" : "neutral"}>
                      {receipt.whatsapp_sent_at ? "Sent" : "Not sent"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <a href={`/api/orders/${receipt.order_id}/receipt`} className="inline-flex h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line px-3 text-sm font-black dark:border-slate-700">
                        <ReceiptText className="h-4 w-4" />
                        PDF
                      </a>
                      <Button onClick={() => resendWhatsApp(receipt)} disabled={busyId === receipt.id || !canResend}>
                        <MessageCircle className="h-4 w-4" />
                        {busyId === receipt.id ? "Sending..." : "Resend"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <p className="font-black">No receipts found.</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Placed orders will generate receipts automatically.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
