"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    <div className="flex h-full min-w-0 items-end gap-3 overflow-x-auto rounded-3xl border border-[var(--dashboard-border)] bg-[var(--dashboard-subtle)] px-4 pb-7 pt-5">
      {series.length ? (
        series.map((item) => (
          <div key={item.date} className="flex h-full min-w-8 flex-1 flex-col justify-end gap-2">
            <div
              className="min-h-2 rounded-t-card bg-gradient-to-t from-teal-400 to-cyan-300"
              title={`${item.date}: ${money(item.total, currency)}`}
              style={{ height: `${Math.max(8, (item.total / max) * 100)}%` }}
            />
            <span className="rotate-45 text-[10px] font-bold text-[color:var(--dashboard-muted)]">{item.date.slice(5)}</span>
          </div>
        ))
      ) : (
        <div className="grid h-full w-full place-items-center text-sm font-semibold text-[color:var(--dashboard-muted)]">
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

function checklistAction(key: string, storefrontUrl: string | null) {
  const actions: Record<string, { href: string; label: string }> = {
    logo: { href: "/settings", label: "Add logo" },
    whatsapp: { href: "/settings#whatsapp", label: "Set WhatsApp" },
    products: { href: "/inventory", label: "Add products" },
    product_images: { href: "/inventory", label: "Add images" },
    barcodes: { href: "/inventory", label: "Add SKU" },
    delivery: { href: "/settings", label: "Set delivery" },
    receipt: { href: "/settings", label: "Edit receipt" },
    test_order: { href: storefrontUrl || "/settings", label: storefrontUrl ? "Open store" : "Set up store" },
    test_whatsapp: { href: "/settings#whatsapp", label: "Test" }
  };
  return actions[key] || { href: "/settings", label: "Open" };
}

export function DashboardHome({ data }: { data: DashboardData }) {
  const [copyMessage, setCopyMessage] = useState("");
  const [liveNewOrders, setLiveNewOrders] = useState(data.newOrders);
  const [recentOrders, setRecentOrders] = useState(data.recentOrders);
  const formatMoney = (value: number | string | null | undefined) => money(value, data.currency);
  useEffect(() => {
    function handleNewOrder(event: Event) {
      const order = (event as CustomEvent<Order>).detail;
      if (!order?.id) return;
      setLiveNewOrders((current) => current + 1);
      setRecentOrders((current) => {
        if (current.some((item) => item.id === order.id)) return current;
        return [order, ...current].slice(0, 8);
      });
    }
    window.addEventListener("caribbean:new-order", handleNewOrder as EventListener);
    return () => window.removeEventListener("caribbean:new-order", handleNewOrder as EventListener);
  }, []);
  const storefrontUrl = data.storefrontUrl || null;
  const storefrontSlug = data.business?.storefront_slug || data.business?.slug || "";
  const hasStorefront = Boolean(data.business && storefrontUrl && storefrontSlug);
  const setupActions = [
    { href: "/settings", label: "Complete Business Profile" },
    { href: "/settings#branding", label: "Upload Logo" },
    { href: "/settings#categories", label: "Add Categories" },
    { href: "/inventory", label: "Add Products" },
    { href: "/settings", label: "Publish Storefront" }
  ];
  const setupChecklist = data.setupChecklist || [];
  const incompleteSetup = setupChecklist.filter((item) => !item.complete);
  const completedChecklist = setupChecklist.length - incompleteSetup.length;
  const totalChecklist = Math.max(setupChecklist.length, 1);
  const setupProgress = Math.round((completedChecklist / totalChecklist) * 100);

  const topStats = [
    { label: "Today sales", value: formatMoney(data.dailySales), icon: DollarSign },
    { label: "New orders", value: String(liveNewOrders), icon: ReceiptText },
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
    if (!storefrontUrl) return "";
    if (typeof window === "undefined") return storefrontUrl;
    return new URL(storefrontUrl, window.location.origin).toString();
  }, [storefrontUrl]);

  async function copyStoreLink() {
    setCopyMessage("");
    try {
      if (!absoluteStoreUrl) {
        setCopyMessage("Complete your business profile to publish your storefront.");
        return;
      }
      await navigator.clipboard.writeText(absoluteStoreUrl);
      setCopyMessage("Store link copied.");
    } catch {
      setCopyMessage("Copy failed. Open the store and copy the browser link.");
    }
  }

  return (
    <div className="dashboard-home mx-auto grid w-full max-w-[1200px] gap-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-3xl border border-[var(--dashboard-border)] dashboard-surface p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[color:var(--dashboard-muted)]">Business storefront</p>
              <h2 className="mt-1 truncate text-2xl font-black text-[color:var(--dashboard-ink)]">{hasStorefront ? data.business?.name : "Storefront not set up yet"}</h2>
              <p className="mt-2 break-all text-sm font-semibold text-[color:var(--dashboard-accent)]">{hasStorefront ? `/${storefrontSlug}` : "Complete your business profile to publish your storefront."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={!hasStorefront || data.business?.active === false ? "amber" : "green"}>
                {!hasStorefront ? "Setup needed" : data.business?.active === false ? "Offline" : "Live"}
              </Badge>
              <Badge tone={data.whatsappConfigured ? "green" : "amber"}>
                {data.whatsappConfigured ? "WhatsApp ready" : "WhatsApp setup"}
              </Badge>
              {data.subscription ? <Badge tone="teal">{data.subscription.plan_name} / {data.subscription.status}</Badge> : null}
            </div>
          </div>

          {hasStorefront ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Link href={storefrontUrl || "/settings"} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-cyan-300 px-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200">
                <ExternalLink className="h-4 w-4" />
                Open Store
              </Link>
              <button type="button" onClick={copyStoreLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-[var(--dashboard-border)] bg-[var(--dashboard-subtle)] px-3 text-sm font-black text-[color:var(--dashboard-ink)] transition hover:bg-white/[0.12]">
                <Copy className="h-4 w-4" />
                Copy Link
              </button>
              <Link href="/settings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-[var(--dashboard-border)] bg-[var(--dashboard-subtle)] px-3 text-sm font-black text-[color:var(--dashboard-ink)] transition hover:bg-white/[0.12]">
                <Settings className="h-4 w-4" />
                Edit Storefront
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {setupActions.map((action) => (
                <Link key={action.label} href={action.href} className="inline-flex min-h-11 items-center justify-center rounded-card border border-[var(--dashboard-border)] bg-[var(--dashboard-subtle)] px-3 text-center text-sm font-black text-[color:var(--dashboard-ink)] transition hover:bg-white/[0.12]">
                  {action.label}
                </Link>
              ))}
            </div>
          )}
          {copyMessage ? <p className="mt-3 text-sm font-bold text-[color:var(--dashboard-accent)]">{copyMessage}</p> : null}
        </div>

        <div className="dashboard-stats grid grid-cols-2 gap-3 sm:gap-5">
          {topStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-3xl border border-[var(--dashboard-border)] dashboard-surface p-5 shadow-[0_16px_45px_rgba(0,0,0,0.22)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[color:var(--dashboard-muted)]">{stat.label}</p>
                  <span className="grid h-9 w-9 place-items-center rounded-card bg-cyan-300/10 text-[color:var(--dashboard-accent)]">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black text-[color:var(--dashboard-ink)]">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-3xl border border-[var(--dashboard-border)] dashboard-surface p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[color:var(--dashboard-muted)]">{stat.label}</p>
                    <Icon className="h-4 w-4 text-[color:var(--dashboard-accent)]" />
                  </div>
                  <p className="mt-3 text-xl font-black text-[color:var(--dashboard-ink)]">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Recent orders" description="Latest storefront and POS orders" action={<Link href="/orders" className="hidden text-sm font-black text-[color:var(--dashboard-accent)] hover:text-[color:var(--dashboard-ink)] lg:inline">View all</Link>} />
              <div className="divide-y divide-white/10">
                {recentOrders.length ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[color:var(--dashboard-ink)]">#{order.order_number} - {order.customer_snapshot.name || "Walk-in customer"}</p>
                        <p className="mt-1 text-xs font-semibold text-[color:var(--dashboard-muted)]">{order.order_type.replaceAll("_", " ")} / {formatMoney(order.total)}</p>
                      </div>
                      <Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 px-4 py-6 text-sm font-semibold text-[color:var(--dashboard-muted)]">
                    <ShoppingCart className="h-4 w-4" />
                    No orders yet.
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Low stock products" description="Items at or below reorder level" action={<Link href="/inventory" className="text-sm font-black text-[color:var(--dashboard-accent)] hover:text-[color:var(--dashboard-ink)]">Inventory</Link>} />
              <div className="divide-y divide-white/10">
                {data.lowStock.length ? (
                  data.lowStock.slice(0, 6).map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[color:var(--dashboard-ink)]">{product.name}</p>
                        <p className="mt-1 text-xs font-semibold text-[color:var(--dashboard-muted)]">{product.sku || product.barcode || "No SKU"}</p>
                      </div>
                      <Badge tone={product.stock_quantity <= 5 ? "red" : "amber"}>{product.stock_quantity} left</Badge>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 px-4 py-6 text-sm font-semibold text-[color:var(--dashboard-muted)]">
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
          {incompleteSetup.length ? (
          <Panel>
            <PanelHeader title="Setup checklist" description={`${completedChecklist} of ${totalChecklist} completed`} />
            <div className="p-4">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-300 to-cyan-300" style={{ width: `${setupProgress}%` }} />
              </div>
              <div className="mt-4 grid gap-2">
                {incompleteSetup.map((item) => {
                  const action = checklistAction(item.key, storefrontUrl);
                  return (
                    <div key={item.key} className={cn("rounded-3xl border p-4", item.complete ? "border-emerald-300/20 bg-emerald-300/[0.08]" : "border-amber-200/20 bg-amber-200/[0.08]")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[color:var(--dashboard-ink)]">{item.label}</p>
                          <p className="mt-1 text-xs font-semibold text-[color:var(--dashboard-muted)]">{item.complete ? "Completed" : "Needs setup"}</p>
                        </div>
                        <Badge tone={item.complete ? "green" : "amber"}>{item.complete ? "Done" : "Todo"}</Badge>
                      </div>
                      {!item.complete ? (
                        <Link href={action.href} className="mt-3 inline-flex min-h-9 items-center justify-center rounded-card border border-[var(--dashboard-border)] bg-[var(--dashboard-subtle)] px-3 text-xs font-black text-[color:var(--dashboard-ink)] transition hover:bg-white/[0.12]">
                          {action.label}
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
          ) : null}

          <Panel>
            <PanelHeader title="Quick actions" />
            <div className="grid gap-2 p-4">
              <Link href="/inventory" className="inline-flex min-h-11 items-center gap-2 rounded-card border border-[var(--dashboard-border)] bg-[var(--dashboard-subtle)] px-3 text-sm font-black text-[color:var(--dashboard-ink)] hover:bg-white/[0.12]">
                <PackageCheck className="h-4 w-4" />
                Add inventory
              </Link>
              <Link href="/settings#whatsapp" className="inline-flex min-h-11 items-center gap-2 rounded-card border border-[var(--dashboard-border)] bg-[var(--dashboard-subtle)] px-3 text-sm font-black text-[color:var(--dashboard-ink)] hover:bg-white/[0.12]">
                <MessageCircle className="h-4 w-4" />
                Configure WhatsApp
              </Link>
              {hasStorefront ? (
                <Link href={storefrontUrl || "/settings"} target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-card border border-[var(--dashboard-border)] bg-[var(--dashboard-subtle)] px-3 text-sm font-black text-[color:var(--dashboard-ink)] hover:bg-white/[0.12]">
                  <Store className="h-4 w-4" />
                  Preview storefront
                </Link>
              ) : null}
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
              <span className="min-w-0 truncate font-black text-[color:var(--dashboard-ink)]">{item.label}</span>
              <span className="shrink-0 font-semibold text-[color:var(--dashboard-muted)]">{item.value}</span>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-sm font-semibold text-[color:var(--dashboard-muted)]">No data yet.</div>
        )}
      </div>
    </Panel>
  );
}
