"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bike,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  TrendingUp
} from "lucide-react";
import type { DashboardData, Order } from "@/lib/types";
import { money } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

function SalesBars({ series, currency }: { series: DashboardData["salesSeries"]; currency: string }) {
  const max = Math.max(...series.map((item) => item.total), 1);

  return (
    <div className="flex h-full min-w-0 items-end gap-2 overflow-x-auto rounded-card border border-white/10 bg-black/20 px-3 pb-7 pt-4">
      {series.length ? (
        series.map((item) => (
          <div key={item.date} className="flex h-full min-w-8 flex-1 flex-col justify-end gap-2">
            <div
              className="min-h-2 rounded-t-card bg-gradient-to-t from-teal-400 to-cyan-300"
              title={`${item.date}: ${money(item.total, currency)}`}
              style={{ height: `${Math.max(8, (item.total / max) * 100)}%` }}
            />
            <span className="rotate-45 text-[10px] font-bold text-teal-50/45">{item.date.slice(5)}</span>
          </div>
        ))
      ) : (
        <div className="grid h-full w-full place-items-center text-sm font-semibold text-teal-50/45">
          No sales yet.
        </div>
      )}
    </div>
  );
}

function orderStatusTone(status: Order["status"]): "green" | "red" | "amber" | "teal" {
  if (status === "completed") return "green";
  if (status === "cancelled") return "red";
  if (status === "new") return "amber";
  return "teal";
}

function orderStatusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function checklistAction(key: string, storefrontUrl: string) {
  const actions: Record<string, { href: string; label: string }> = {
    logo: { href: "/settings", label: "Add logo" },
    whatsapp: { href: "/settings#whatsapp", label: "Set WhatsApp" },
    products: { href: "/inventory", label: "Add products" },
    product_images: { href: "/inventory", label: "Add images" },
    barcodes: { href: "/inventory", label: "Add SKU" },
    delivery: { href: "/settings", label: "Set delivery" },
    receipt: { href: "/settings", label: "Edit receipt" },
    test_order: { href: storefrontUrl, label: "Open store" },
    test_whatsapp: { href: "/settings#whatsapp", label: "Test" }
  };
  return actions[key] || { href: "/settings", label: "Open" };
}

export function DashboardHome({ data }: { data: DashboardData }) {
  const [copyMessage, setCopyMessage] = useState("");
  const formatMoney = (value: number | string | null | undefined) => money(value, data.currency);
  const storefrontUrl = data.storefrontUrl || "/online";
  const storefrontSlug = data.business?.storefront_slug || data.business?.slug || "online";
  const completedChecklist = (data.setupChecklist || []).filter((item) => item.complete).length;
  const totalChecklist = Math.max((data.setupChecklist || []).length, 1);
  const setupProgress = Math.round((completedChecklist / totalChecklist) * 100);

  const topStats = [
    { label: "Today sales", value: formatMoney(data.dailySales), icon: DollarSign },
    { label: "New orders", value: String(data.newOrders), icon: ReceiptText },
    { label: "Pending", value: String(data.pendingOrders), icon: AlertTriangle },
    { label: "WhatsApp", value: data.whatsappConfigured ? "Ready" : "Setup", icon: MessageCircle }
  ];

  const quickStats = [
    { label: "Completed today", value: String(data.completedOrders), icon: TrendingUp },
    { label: "Weekly sales", value: formatMoney(data.weeklySales), icon: TrendingUp },
    { label: "Average sale", value: formatMoney(data.paymentBreakdown.reduce((sum, item) => sum + item.total, 0) / Math.max(1, data.paymentBreakdown.reduce((sum, item) => sum + item.count, 0))), icon: CreditCard },
    { label: "Deliveries", value: String(data.deliveryOrderCount), icon: Bike }
  ];

  const absoluteStoreUrl = useMemo(() => {
    if (typeof window === "undefined") return storefrontUrl;
    return new URL(storefrontUrl, window.location.origin).toString();
  }, [storefrontUrl]);

  async function copyStoreLink() {
    setCopyMessage("");
    try {
      await navigator.clipboard.writeText(absoluteStoreUrl);
      setCopyMessage("Store link copied.");
    } catch {
      setCopyMessage("Copy failed. Open the store and copy the browser link.");
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-5">
      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-card border border-white/10 bg-white/[0.055] p-5 shadow-soft lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-teal-50/62">Business storefront</p>
              <h2 className="mt-1 truncate text-2xl font-black text-white">{data.business?.name || "Your business"}</h2>
              <p className="mt-2 break-all text-sm font-semibold text-cyan-100/80">/{storefrontSlug}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={data.business?.active === false ? "red" : "green"}>
                {data.business?.active === false ? "Offline" : "Live"}
              </Badge>
              <Badge tone={data.whatsappConfigured ? "green" : "amber"}>
                {data.whatsappConfigured ? "WhatsApp ready" : "WhatsApp setup"}
              </Badge>
              {data.subscription ? <Badge tone="teal">{data.subscription.plan_name} / {data.subscription.status}</Badge> : null}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Link href={storefrontUrl} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-cyan-300 px-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200">
              <ExternalLink className="h-4 w-4" />
              Open Store
            </Link>
            <button type="button" onClick={copyStoreLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 text-sm font-black text-white transition hover:bg-white/[0.12]">
              <Copy className="h-4 w-4" />
              Copy Link
            </button>
            <Link href="/settings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 text-sm font-black text-white transition hover:bg-white/[0.12]">
              <Settings className="h-4 w-4" />
              Edit Storefront
            </Link>
          </div>
          {copyMessage ? <p className="mt-3 text-sm font-bold text-cyan-100/70">{copyMessage}</p> : null}
        </div>

        {topStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-card border border-white/10 bg-white/[0.055] p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-teal-50/62">{stat.label}</p>
                <Icon className="h-4 w-4 text-cyan-200" />
              </div>
              <p className="mt-4 text-2xl font-black text-white">{stat.value}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-card border border-white/10 bg-white/[0.045] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-teal-50/58">{stat.label}</p>
                    <Icon className="h-4 w-4 text-cyan-200" />
                  </div>
                  <p className="mt-3 text-xl font-black text-white">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Recent orders" description="Latest storefront and POS orders" action={<Link href="/orders" className="text-sm font-black text-cyan-100 hover:text-white">View all</Link>} />
              <div className="divide-y divide-white/10">
                {data.recentOrders.length ? (
                  data.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">#{order.order_number} - {order.customer_snapshot.name || "Walk-in customer"}</p>
                        <p className="mt-1 text-xs font-semibold text-teal-50/50">{order.order_type.replaceAll("_", " ")} / {formatMoney(order.total)}</p>
                      </div>
                      <Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 px-4 py-6 text-sm font-semibold text-teal-50/50">
                    <ShoppingCart className="h-4 w-4" />
                    No orders yet.
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Low stock products" description="Items at or below reorder level" action={<Link href="/inventory" className="text-sm font-black text-cyan-100 hover:text-white">Inventory</Link>} />
              <div className="divide-y divide-white/10">
                {data.lowStock.length ? (
                  data.lowStock.slice(0, 6).map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{product.name}</p>
                        <p className="mt-1 text-xs font-semibold text-teal-50/50">{product.sku || product.barcode || "No SKU"}</p>
                      </div>
                      <Badge tone={product.stock_quantity <= 5 ? "red" : "amber"}>{product.stock_quantity} left</Badge>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 px-4 py-6 text-sm font-semibold text-teal-50/50">
                    <PackageCheck className="h-4 w-4" />
                    Inventory is comfortably stocked.
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelHeader title="Sales trend" description={`Last 30 days in ${data.currency}`} />
            <div className="h-56 p-4 sm:h-64">
              <SalesBars series={data.salesSeries} currency={data.currency} />
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-3">
            <CompactList title="Best sellers" items={data.bestSellers.map((item) => ({ label: item.name, value: `${item.quantity} sold` }))} />
            <CompactList title="Payment methods" items={data.paymentBreakdown.map((item) => ({ label: item.method, value: formatMoney(item.total) }))} />
            <CompactList title="Cashier performance" items={data.cashierPerformance.map((item) => ({ label: item.name, value: formatMoney(item.total) }))} />
          </div>
        </div>

        <aside className="grid min-w-0 gap-5 self-start">
          <Panel>
            <PanelHeader title="Setup checklist" description={`${completedChecklist} of ${totalChecklist} completed`} />
            <div className="p-4">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-300 to-cyan-300" style={{ width: `${setupProgress}%` }} />
              </div>
              <div className="mt-4 grid gap-2">
                {(data.setupChecklist || []).map((item) => {
                  const action = checklistAction(item.key, storefrontUrl);
                  return (
                    <div key={item.key} className={cn("rounded-card border p-3", item.complete ? "border-emerald-300/20 bg-emerald-300/[0.08]" : "border-amber-200/20 bg-amber-200/[0.08]")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white">{item.label}</p>
                          <p className="mt-1 text-xs font-semibold text-teal-50/50">{item.complete ? "Completed" : "Needs setup"}</p>
                        </div>
                        <Badge tone={item.complete ? "green" : "amber"}>{item.complete ? "Done" : "Todo"}</Badge>
                      </div>
                      {!item.complete ? (
                        <Link href={action.href} className="mt-3 inline-flex min-h-9 items-center justify-center rounded-card border border-white/10 bg-white/[0.07] px-3 text-xs font-black text-white transition hover:bg-white/[0.12]">
                          {action.label}
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Quick actions" />
            <div className="grid gap-2 p-4">
              <Link href="/pos" className="inline-flex min-h-11 items-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 text-sm font-black text-white hover:bg-white/[0.12]">
                <ShoppingCart className="h-4 w-4" />
                Open POS checkout
              </Link>
              <Link href="/inventory" className="inline-flex min-h-11 items-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 text-sm font-black text-white hover:bg-white/[0.12]">
                <PackageCheck className="h-4 w-4" />
                Add inventory
              </Link>
              <Link href="/settings#whatsapp" className="inline-flex min-h-11 items-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 text-sm font-black text-white hover:bg-white/[0.12]">
                <MessageCircle className="h-4 w-4" />
                Configure WhatsApp
              </Link>
              <Link href={storefrontUrl} target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 text-sm font-black text-white hover:bg-white/[0.12]">
                <Store className="h-4 w-4" />
                Preview storefront
              </Link>
            </div>
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function CompactList({ title, items }: { title: string; items: Array<{ label: string; value: string }> }) {
  return (
    <Panel>
      <PanelHeader title={title} />
      <div className="divide-y divide-white/10">
        {items.length ? (
          items.slice(0, 6).map((item) => (
            <div key={`${item.label}-${item.value}`} className="flex min-w-0 justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 truncate font-black text-white">{item.label}</span>
              <span className="shrink-0 font-semibold text-teal-50/55">{item.value}</span>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-sm font-semibold text-teal-50/50">No data yet.</div>
        )}
      </div>
    </Panel>
  );
}
