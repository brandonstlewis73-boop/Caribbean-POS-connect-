"use client";

import { Download, HardDriveDownload } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money } from "@/lib/constants";
import type { DashboardData } from "@/lib/types";

const colors = ["#087e7a", "#f9735b", "#1f9d66", "#f6b53f", "#14b8a6", "#334155"];

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

function PaymentBreakdown({ items }: { items: DashboardData["paymentBreakdown"] }) {
  const total = items.reduce((sum, item) => sum + item.total, 0);
  let start = 0;
  const gradient = total
    ? items
        .map((item, index) => {
          const end = start + (item.total / total) * 100;
          const segment = `${colors[index % colors.length]} ${start}% ${end}%`;
          start = end;
          return segment;
        })
        .join(", ")
    : "#d8e7e5 0% 100%";

  return (
    <div className="grid min-w-0 gap-5 p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
      <div
        className="mx-auto grid h-44 w-44 place-items-center rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
        aria-label="Payment method breakdown chart"
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center text-sm font-black shadow-soft dark:bg-slate-900">
          {money(total)}
        </div>
      </div>
      <div className="grid min-w-0 gap-2">
        {items.map((item, index) => (
          <div key={item.method} className="flex min-w-0 items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-bold">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="min-w-0">{item.method}</span>
            </span>
            <strong>{money(item.total)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsClient({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <a href="/api/exports/sales" className="inline-flex min-h-10 items-center gap-2 rounded-card bg-caribbean-teal px-3 py-2 text-sm font-black leading-tight text-white">
          <Download className="h-4 w-4" />
          Export sales CSV
        </a>
        <a href="/api/backup" className="inline-flex min-h-10 items-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900">
          <HardDriveDownload className="h-4 w-4" />
          Backup database
        </a>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ["Daily sales", data.dailySales],
          ["Weekly sales", data.weeklySales],
          ["Monthly sales", data.monthlySales],
          ["Profit estimate", data.profitEstimate]
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-card border border-caribbean-line bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black">{money(Number(value))}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Sales by day" />
          <div className="h-80 p-4">
            <SalesBars series={data.salesSeries} />
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Payment method breakdown" />
          <PaymentBreakdown items={data.paymentBreakdown} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel>
          <PanelHeader title="Best sellers" />
          <div className="divide-y divide-caribbean-line dark:divide-slate-800">
            {data.bestSellers.map((item) => (
              <div key={item.name} className="flex min-w-0 justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 font-bold">{item.name}</span>
                <span className="font-black">{money(item.total)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Top customers" />
          <div className="divide-y divide-caribbean-line dark:divide-slate-800">
            {data.topCustomers.map((item) => (
              <div key={item.name} className="flex min-w-0 justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 font-bold">{item.name}</span>
                <span className="font-black">{money(item.total_spent)}</span>
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
                <span className="font-black">{item.count} orders</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
