"use client";
import { PdfDocumentButton } from "@/components/documents/PdfDocumentButton";
import {Pagination,usePagination} from "@/components/workspace/Pagination";

import { useDeferredValue, useMemo, useState } from "react";
import { MessageCircle, Printer, ReceiptText, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { FreeReceiptWhatsApp } from "./FreeReceiptWhatsApp";
import type { Order, Receipt } from "@/lib/types";

export function ReceiptsClient({
  receipts,
  currency,
  canResend
}: {
  receipts: Receipt[];
  currency: string;
  canResend: boolean;
}) {
  const items = receipts;
  const [sharing,setSharing] = useState<{receipt:Receipt;order:Order}|null>(null);
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
    setSharing(null);
    setBusyId(receipt.id);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(receipt.order_id)}`, {cache:"no-store"});
      const payload = await readApiPayload<{order:Order}>(response);
      if (!response.ok || !payload.data?.order) {
        setMessage(payload.error || "Receipt could not be opened. Please try again.");
        return;
      }
      if (payload.data.order.customer_snapshot.notification_whatsapp === false) {
        setMessage("This customer has opted out of WhatsApp updates."); return;
      }
      setSharing({receipt,order:payload.data.order});

    } catch {
      setMessage("Receipt could not be opened. Check your connection and try again.");
    } finally {
      setBusyId("");
    }
  }

  const recordPage=usePagination(filtered,query);
  return (
    <div className="grid min-w-0 gap-4">
      <Panel>
        <PanelHeader title="Receipts" description="Print receipts or share them in WhatsApp for free" action={<a href="/printer#receipt-templates" className="inline-flex min-h-11 items-center rounded-card border border-white/15 px-3 text-sm font-bold">Receipt templates</a>} />
        <Pagination {...recordPage}/>
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
          <p role="status" className="mx-4 mt-4 rounded-card border border-caribbean-line bg-white p-3 text-sm font-semibold text-slate-700">
            {message}
          </p>
        ) : null}

        {sharing ? <FreeReceiptWhatsApp key={sharing.receipt.id} receipt={sharing.receipt} phone={sharing.order.customer_snapshot.phone} currency={currency} onClose={()=>setSharing(null)}/> : null}

        <div className="grid gap-3 p-4 md:hidden">
          {recordPage.items.map((receipt) => (
            <div key={receipt.id} className="rounded-card border border-caribbean-line bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black">#{receipt.receipt_number}</p>
                  <p className="text-sm font-bold text-slate-500">Order #{receipt.order_number}</p>
                </div>
                <Badge tone="neutral">
                  Ready to share
                </Badge>
              </div>
              <p className="mt-3 font-bold">{receipt.customer_name || "Walk-in customer"}</p>
              <p className="text-sm font-semibold text-slate-500">{receipt.customer_phone || "No phone"}</p>
              <div className="mt-3 flex justify-between text-sm">
                <span>{receipt.payment_method}</span>
                <strong>{formatMoney(receipt.total)}</strong>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PdfDocumentButton href={`/api/orders/${receipt.order_id}/receipt`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line px-3 py-2 text-center text-sm font-black dark:border-slate-700">
                  <Printer className="h-4 w-4" />
                  Print
                </PdfDocumentButton>
                <Button onClick={() => resendWhatsApp(receipt)} disabled={busyId === receipt.id || !canResend}>
                  <MessageCircle className="h-4 w-4" />
                  {busyId === receipt.id ? "Opening…" : "WhatsApp · free"}
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
              {recordPage.items.map((receipt) => (
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
                    <Badge tone="neutral">
                      Ready to share
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <PdfDocumentButton href={`/api/orders/${receipt.order_id}/receipt`} className="inline-flex h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line px-3 text-sm font-black dark:border-slate-700">
                        <ReceiptText className="h-4 w-4" />
                        PDF
                      </PdfDocumentButton>
                      <Button onClick={() => resendWhatsApp(receipt)} disabled={busyId === receipt.id || !canResend}>
                        <MessageCircle className="h-4 w-4" />
                        {busyId === receipt.id ? "Opening…" : "WhatsApp · free"}
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
