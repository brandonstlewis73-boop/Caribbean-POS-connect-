import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bike,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  Printer,
  ShoppingCart,
  Store,
  Tags,
  Utensils
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const features = [
  { title: "POS Checkout", text: "Fast counter sales with cash, card, transfer, and receipt workflows.", icon: ShoppingCart },
  { title: "Online Storefront", text: "Take pickup and delivery orders from a public business storefront.", icon: Store },
  { title: "WhatsApp Order Alerts", text: "Notify owners and customers when orders move through the workflow.", icon: ClipboardList },
  { title: "Receipts & Printer", text: "Create printable customer receipts, kitchen tickets, and order labels.", icon: Printer },
  { title: "Inventory & Categories", text: "Manage products, stock, barcodes, categories, images, and availability.", icon: Tags },
  { title: "Delivery/Waze Navigation", text: "Save customer locations and open delivery routes in Waze or Google Maps.", icon: Bike },
  { title: "AI Help & Support", text: "Give staff clear help for checkout, orders, WhatsApp, receipts, and setup.", icon: BrainCircuit },
  { title: "Reports", text: "Track sales, low stock, payment methods, staff performance, and best sellers.", icon: BarChart3 }
];

const businessTypes = [
  "Restaurants",
  "Retail shops",
  "Food vendors",
  "Delivery businesses",
  "Caribbean small businesses"
];

const plans = [
  { name: "Free Demo", price: "$0", detail: "Try the core POS and storefront flow." },
  { name: "Starter", price: "$149", detail: "For small shops ready to take real orders." },
  { name: "Pro", price: "$299", detail: "For growing teams with delivery and WhatsApp workflows." },
  { name: "Premium", price: "$499", detail: "For operators that need more staff, products, and support." }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-caribbean-night text-white">
      <header className="border-b border-white/10 bg-black/[0.36] backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image src="/logo.svg" alt={APP_NAME} width={48} height={48} className="h-12 w-12 shrink-0 rounded-card bg-white object-contain p-1" />
            <span className="min-w-0">
              <span className="block text-sm font-black leading-tight text-white sm:text-base">{APP_NAME}</span>
              <span className="block text-xs font-bold text-teal-100/65">POS for Caribbean businesses</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-bold text-teal-50/70 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#businesses" className="hover:text-white">Businesses</a>
            <a href="#plans" className="hover:text-white">Plans</a>
          </nav>
          <Link
            href="/signup"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-card bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
          >
            Get Started
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.68fr)] lg:items-center lg:py-20">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-4">
            <Image src="/logo.svg" alt={APP_NAME} width={72} height={72} className="h-16 w-16 rounded-card bg-white object-contain p-2 shadow-soft sm:h-20 sm:w-20" />
            <div className="min-w-0">
              <h1 className="text-3xl font-black leading-tight tracking-normal text-white sm:text-5xl">
                Caribbean Connect POS
              </h1>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-cyan-100/65">
                Professional SaaS POS
              </p>
            </div>
          </div>

          <p className="mt-7 max-w-2xl text-xl font-black leading-8 text-teal-50 sm:text-2xl">
            Run your store, orders, inventory, deliveries, and receipts from one simple POS.
          </p>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-teal-50/68">
            Built for Caribbean businesses that need a clean dashboard, mobile storefront, WhatsApp-ready workflows, inventory control, and staff tools without a complicated setup.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-card bg-gradient-to-r from-teal-300 to-cyan-300 px-5 text-sm font-black text-slate-950 shadow-soft transition hover:brightness-110">
              Get Started
            </Link>
            <Link href="#plans" className="inline-flex min-h-12 items-center justify-center rounded-card border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-white transition hover:bg-white/[0.1]">
              View Plans
            </Link>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-card border border-white/10 px-5 text-sm font-black text-teal-50/80 transition hover:bg-white/[0.08] hover:text-white">
              Open Demo
            </Link>
          </div>
        </div>

        <div className="rounded-card border border-white/10 bg-white/[0.055] p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-black text-white">Business control panel</p>
              <p className="mt-1 text-sm font-semibold text-teal-50/60">Storefront, POS, delivery, and receipts in one place.</p>
            </div>
            <PackageCheck className="h-8 w-8 text-cyan-200" />
          </div>
          <div className="mt-5 grid gap-3">
            {["Accept orders", "Track inventory", "Print receipts", "Send WhatsApp updates"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-card border border-white/10 bg-black/25 px-3 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                <span className="text-sm font-black text-teal-50">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-white/10 bg-black/[0.18]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black text-white sm:text-3xl">Everything a small business needs to sell and fulfill orders.</h2>
            <p className="mt-3 text-base font-semibold leading-7 text-teal-50/65">
              The platform is organized around the daily work: checkout, orders, products, receipts, delivery, support, and reporting.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-card border border-white/10 bg-white/[0.045] p-4">
                  <Icon className="h-5 w-5 text-cyan-200" />
                  <h3 className="mt-4 text-base font-black text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-teal-50/62">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="businesses" className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.75fr_1fr] lg:items-start">
        <div>
          <h2 className="text-2xl font-black text-white sm:text-3xl">Built for real Caribbean operators.</h2>
          <p className="mt-3 text-base font-semibold leading-7 text-teal-50/65">
            Use one system for counter sales, online orders, pickup, delivery, inventory, receipts, and staff activity.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {businessTypes.map((type) => (
            <div key={type} className="flex items-center gap-3 rounded-card border border-white/10 bg-white/[0.05] px-4 py-4 text-sm font-black text-teal-50">
              <Utensils className="h-4 w-4 shrink-0 text-amber-200" />
              {type}
            </div>
          ))}
        </div>
      </section>

      <section id="plans" className="border-y border-white/10 bg-black/[0.18]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">Pricing preview</h2>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-teal-50/65">
                Start small, then upgrade when you need more products, staff, automation, and support.
              </p>
            </div>
            <Link href="/subscription" className="inline-flex min-h-11 items-center justify-center rounded-card border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:bg-white/[0.1]">
              View Plans
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <article key={plan.name} className="rounded-card border border-white/10 bg-white/[0.05] p-5">
                <h3 className="text-lg font-black text-white">{plan.name}</h3>
                <p className="mt-3 text-3xl font-black text-cyan-100">{plan.price}</p>
                <p className="mt-3 min-h-12 text-sm font-semibold leading-6 text-teal-50/62">{plan.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="rounded-card border border-white/10 bg-gradient-to-r from-teal-400 to-cyan-300 p-6 text-slate-950 sm:p-8">
          <h2 className="text-2xl font-black sm:text-3xl">Start your business storefront today</h2>
          <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-slate-800">
            Create your account, add products, set delivery or pickup, and start accepting orders from any phone.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-card bg-slate-950 px-5 text-sm font-black text-white">
              Get Started
            </Link>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-card border border-slate-950/20 px-5 text-sm font-black text-slate-950">
              Open Demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm font-semibold text-teal-50/55">
        {APP_NAME} - POS, storefront, inventory, receipts, delivery, and support for Caribbean businesses.
      </footer>
    </main>
  );
}
