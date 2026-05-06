"use client";

import { AlertTriangle, Bike, CreditCard, DollarSign, TrendingUp, Users } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { money } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Panel, PanelHeader } from "@/components/ui/Panel";

function SalesBars({ series }: { series: DashboardData["salesSeries"] }) {
  const max = Math.max(...series.map((item) => item.total), 1);

  return (
    <div className="flex h-full min-w-0 items-end gap-2 overflow-x-auto rounded-card bg-caribbean-cloud px-3 pb-8 pt-4 dark:bg-slate-950">
      {series.length ? (
        series.map((item) => (
          <div key={item.date} className="flex h-full min-w-8 flex-1 flex-col justify-end gap-2">
            <div
              className="min-h-2 rounded-t-card bg-caribbean-teal"
              title={`${item.date}: ${money(item.total)}`}
              style={{ height: `${Math.max(8, (item.total / max) * 100)}%` }}
            />
            <span className="rotate-45 text-[10px] font-bold text-slate-500">{item.date.slice(5)}</span>
          </div>
        ))
      ) : (
        <div className="grid h-full w-full place-items-center text-sm font-semibold text-slate-500">
          No sales yet.
        </div>
      )}
    </div>
  );
}

export function DashboardHome({ data }: { data: DashboardData }) {
  const stats = [
    { label: "Daily sales", value: money(data.dailySales), icon: DollarSign },
    { label: "Weekly sales", value: money(data.weeklySales), icon: TrendingUp },
    { label: "Monthly sales", value: money(data.monthlySales), icon: CreditCard },
    { label: "Deliveries", value: String(data.deliveryOrderCount), icon: Bike },
    { label: "Profit estimate", value: money(data.profitEstimate), icon: TrendingUp },
    { label: "Top customers", value: String(data.topCustomers.length), icon: Users }
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-card border border-caribbean-line bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="min-w-0 text-sm font-bold text-slate-500 dark:text-slate-400">{stat.label}</p>
                <Icon className="h-4 w-4 text-caribbean-teal" />
              </div>
              <p className="mt-3 text-2xl font-black">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader title="Sales trend" description="Last 30 days in TTD" />
          <div className="h-80 p-4">
            <SalesBars series={data.salesSeries} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Low stock alerts" description="Items at or below reorder level" />
          <div className="divide-y divide-caribbean-line dark:divide-slate-800">
            {data.lowStock.length ? (
              data.lowStock.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{product.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{product.sku}</p>
                  </div>
                  <Badge tone={product.stock_quantity <= 5 ? "red" : "amber"}>
                    {product.stock_quantity} left
                  </Badge>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 px-4 py-6 text-sm font-semibold text-slate-500">
                <AlertTriangle className="h-4 w-4" />
                Inventory is comfortably stocked.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel>
          <PanelHeader title="Best selling products" />
          <div className="divide-y divide-caribbean-line dark:divide-slate-800">
            {data.bestSellers.map((item) => (
              <div key={item.name} className="flex min-w-0 justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 font-bold">{item.name}</span>
                <span className="font-semibold text-slate-500">{item.quantity} sold</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Payment methods" />
          <div className="divide-y divide-caribbean-line dark:divide-slate-800">
            {data.paymentBreakdown.map((item) => (
              <div key={item.method} className="flex min-w-0 justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 font-bold">{item.method}</span>
                <span className="font-semibold text-slate-500">{money(item.total)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Cashier performance" />
          <div className="divide-y divide-caribbean-line dark:divide-slate-800">
            {data.cashierPerformance.map((item) => (
              <div key={item.name} className="flex min-w-0 justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 font-bold">{item.name}</span>
                <span className="font-semibold text-slate-500">{money(item.total)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
