import Link from "next/link";
import { BarChart3, PackageCheck, Printer, ReceiptText, ShoppingCart, Smartphone, Store, Utensils } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const featureChips = [
  { label: "System", icon: Smartphone },
  { label: "Retail", icon: Store },
  { label: "Printer", icon: Printer },
  { label: "Restaurant", icon: Utensils },
  { label: "Register", icon: ShoppingCart }
];

const previews = [
  {
    title: "Dashboard",
    icon: BarChart3,
    lines: ["Today $0.00", "Orders 0", "Low stock clear"],
    accent: "from-teal-300 to-cyan-300"
  },
  {
    title: "Checkout/Register",
    icon: ShoppingCart,
    lines: ["Cart", "Cash / Card / Transfer", "Store currency receipt"],
    accent: "from-emerald-300 to-lime-300"
  },
  {
    title: "Print & Delivery",
    icon: PackageCheck,
    lines: ["Receipt ready", "Waze navigation", "Shipping label"],
    accent: "from-amber-200 to-yellow-400"
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden text-white">
      <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-4 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-4">
            <img src="/logo.svg" alt={APP_NAME} className="h-20 w-20 rounded-[28px] object-contain shadow-[0_20px_80px_rgba(20,184,166,0.22)]" />
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200/70">Live SaaS POS</p>
              <h1 className="mt-2 text-4xl font-black leading-[0.95] tracking-normal sm:text-6xl">
                Caribbean Connect POS
              </h1>
            </div>
          </div>
          <p className="mt-5 max-w-xl text-lg font-bold leading-8 text-teal-50/72">
            POS System / Orders / Inventory / Delivery
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-card bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_48px_rgba(20,184,166,0.3)]">
              Get Started
            </Link>
            <Link href="/subscription" className="inline-flex min-h-12 items-center justify-center rounded-card border border-white/10 bg-white/[0.07] px-5 text-sm font-black text-white backdrop-blur">
              View Plans
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {featureChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <span key={chip.label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-black text-teal-50/80">
                  <Icon className="h-4 w-4 text-cyan-200" />
                  {chip.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-3 lg:items-end">
          {previews.map((preview, index) => {
            const Icon = preview.icon;
            return (
              <div
                key={preview.title}
                className={`min-h-[420px] rounded-[34px] border border-white/10 bg-white/[0.07] p-4 shadow-soft backdrop-blur-2xl ${index === 1 ? "sm:-translate-y-8" : ""}`}
              >
                <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${preview.accent} text-slate-950`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-6 text-xl font-black">{preview.title}</p>
                <div className="mt-6 grid gap-3">
                  {preview.lines.map((line) => (
                    <div key={line} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm font-bold text-teal-50/75">
                      {line}
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-[24px] bg-black/35 p-4">
                  <div className="h-2 rounded-full bg-white/10" />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <span className="h-16 rounded-2xl bg-teal-300/20" />
                    <span className="h-16 rounded-2xl bg-cyan-300/20" />
                    <span className="h-16 rounded-2xl bg-amber-300/20" />
                  </div>
                </div>
                <ReceiptText className="mt-8 h-6 w-6 text-teal-100/50" />
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
